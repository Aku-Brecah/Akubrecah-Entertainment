import { log } from '@/lib/monitoring/logger';
import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createSystemLog } from '@/lib/prisma';
import { getOrCreateDbUser } from '@/lib/subscription';
import { tryResolveKraPin } from '@/lib/masking';
import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // 1. Check authentication (allow guest downloads if they have a confirmed downloadId)
    let userId: string | null = null;
    try {
      const session = await auth();
      userId = session?.userId || null;
    } catch {
      // Guest download
    }

    // 2. Parse request payload
    const body = await req.json();
    const {
      pin,
      name,
      idNumber,
      email,
      building,
      street,
      city,
      county,
      district,
      taxArea,
      station,
      poBox,
      postalCode,
      mobileNumber,
      registeredDate,
      downloadId: incomingDownloadId,
    } = body;

    // Resolve sealed transport blobs (kraseal1:...) to plaintext PINs server-side
    const clientResolvedPin = tryResolveKraPin(pin) || '';

    let downloadId = incomingDownloadId;
    const prismaModule = await import('@/lib/prisma');
    const db = prismaModule.default as any;

    // 3. Server-side authorization: require a valid downloadId, verified admin access, or service secret (n8n/workers)
    // No hardcoded fallbacks — if the env vars are unset, service access fails closed.
    // Secrets are compared timing-safe against each accepted credential.
    const acceptedServiceSecrets = [
      process.env.EVOLUTION_WEBHOOK_SECRET,
      process.env.EVOLUTION_API_KEY,
      // Dedicated scoped credential for n8n dispatch (rotate off the shared
      // Evolution key onto this so n8n never holds the bot's master key).
      process.env.N8N_DISPATCH_SECRET,
    ].filter(Boolean) as string[];
    const providedHeaderSecret =
      req.headers.get('x-service-secret') ||
      req.headers.get('apikey') ||
      req.headers.get('x-api-key') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const { safeCompare } = await import('@/lib/admin-auth');
    const isServiceAuthorized = acceptedServiceSecrets.length > 0 && (
      (providedHeaderSecret && acceptedServiceSecrets.some((s) => safeCompare(providedHeaderSecret, s))) ||
      (typeof body.serviceSecret === 'string' && acceptedServiceSecrets.some((s) => safeCompare(body.serviceSecret, s)))
    );

    const { verifyCertificateDownloadEligibility } = await import('@/lib/mpesa-redemption');
    const { isAdminUser } = await import('@/lib/subscription');
    const isAdmin = userId ? await isAdminUser(userId) : false;
    const requestedPin = (clientResolvedPin || (pin || '')).toUpperCase().trim();

    let eligibility: any = null;
    if (!isServiceAuthorized) {
      if (!downloadId) {
        if (isAdmin) {
          const effectiveClerkId = userId || 'admin_user';
          const dbUser = await getOrCreateDbUser(effectiveClerkId, 'admin@akubrecah.co.ke', 'Administrator');
          const adminDownloadRecord = await db.certificateDownload?.create({
            data: {
              userId: dbUser.id,
              clerkId: effectiveClerkId,
              pin: clientResolvedPin || String(pin || 'KRA_CERT').toUpperCase().trim(),
              downloadType: 'admin',
              amountCharged: 0,
              currency: 'KES',
            },
          });
          downloadId = adminDownloadRecord?.id;
        } else {
          return NextResponse.json(
            { success: false, error: 'Download authorization required. Please complete the payment flow.' },
            { status: 403 }
          );
        }
      }

      // Authoritative 5-minute redemption window check
      eligibility = await verifyCertificateDownloadEligibility({
        downloadId,
        requestedPinInput: requestedPin,
        isServiceAuthorized: false,
        isAdmin,
      });

      if (!eligibility.allowed) {
        return NextResponse.json(
          { success: false, error: eligibility.error || 'Download window expired or unauthorized.' },
          { status: eligibility.httpStatus || 403 }
        );
      }
    }

    // Validate the download record exists in DB (or fallback)
    let downloadRecord = downloadId
      ? await db.certificateDownload?.findFirst({
          where: {
            id: downloadId,
          },
        }).catch(() => null)
      : null;

    if (!downloadRecord && isServiceAuthorized) {
      // Try to auto-provision download record for internal service dispatch (e.g. n8n workflow)
      try {
        const effectivePin = clientResolvedPin || String(pin || 'KRA_CERT').toUpperCase().trim();
        const dbUser = await getOrCreateDbUser('service_n8n', 'service@akubrecah.co.ke', 'n8n Dispatcher');
        downloadRecord = await db.certificateDownload?.create({
          data: {
            id: downloadId || ('dl_svc_' + Date.now()),
            userId: dbUser.id,
            clerkId: 'service_n8n',
            pin: effectivePin,
            downloadType: 'service_dispatch',
            amountCharged: 0,
            currency: 'KES',
          },
        });
      } catch (err: any) {
        log.warn('[generate-certificate] Service record creation note:', err.message);
      }
    }

    if (!downloadRecord && !isServiceAuthorized && !eligibility?.allowed) {
      return NextResponse.json(
        { success: false, error: 'Invalid or unauthorized download. Please retry the payment flow.' },
        { status: 403 }
      );
    }

    // Enforce that payment for certificate A cannot download certificate B.
    // Fail closed: the legacy 'KRA_CERT'/empty placeholder no longer bypasses
    // the lock — only service dispatch (secret-gated, payload PIN is the
    // authority) and admin-created records may resolve through it.
    const recordPin = (downloadRecord?.pin || '').toUpperCase().trim();
    const payloadPin = (clientResolvedPin || (pin || '')).toUpperCase().trim();
    const recordPinPlaceholder = !recordPin || recordPin === 'KRA_CERT';
    if (!isServiceAuthorized) {
      if (recordPinPlaceholder && downloadRecord?.downloadType !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'This download token is not bound to a KRA PIN. Please initiate a new payment so the certificate is issued for your KRA PIN.' },
          { status: 403 }
        );
      }
      if (recordPin && !recordPinPlaceholder && payloadPin && !payloadPin.includes('*') && recordPin !== payloadPin) {
        return NextResponse.json(
          { success: false, error: 'Download token is not authorized for this KRA PIN.' },
          { status: 403 }
        );
      }
    }

    // Resolve or auto-provision DB user
    const effectiveClerkId = userId || downloadRecord?.clerkId || 'guest_user';
    let dbUser: any = null;
    try {
      dbUser = await getOrCreateDbUser(effectiveClerkId, 'guest@akubrecah.co.ke', 'Guest Taxpayer');
    } catch {}

    // Prioritize clean unmasked PIN from eligibility / download record, fallback to payload
    let cleanPin = eligibility?.cleanPin || '';
    if (!cleanPin && downloadRecord?.pin && !downloadRecord.pin.includes('*') && downloadRecord.pin !== 'KRA_CERT') {
      cleanPin = downloadRecord.pin.toUpperCase().trim();
    } else if (!cleanPin && clientResolvedPin) {
      cleanPin = clientResolvedPin;
    } else if (pin && !pin.includes('*')) {
      cleanPin = pin.toUpperCase().trim();
    }

    // Helper to detect masked or empty placeholder values
    const isMaskedOrEmpty = (val: any) => !val || typeof val !== 'string' || val.includes('•') || val.includes('***') || val.includes('*****');

    // Strict Zero-Storage: Never rely on persistent kra_pin_cache.
    const cachedRecord: any = null;

    // If passed address fields are masked, fetch live unmasked details directly from KRA
    let liveProfile: any = null;
    const needsAuthoritativeFetch = cleanPin && (isMaskedOrEmpty(building) || isMaskedOrEmpty(station));
    if (needsAuthoritativeFetch) {
      try {
        const { fetchTaxpayerByPin } = await import('@/lib/kra-api');
        liveProfile = await fetchTaxpayerByPin(cleanPin);
      } catch (err: any) {
        log.warn('[generate-certificate] Live profile fetch notice:', err.message);
      }
    }

    const resolvedPin = cleanPin || clientResolvedPin || cachedRecord?.pin || liveProfile?.pin || (pin && !pin.includes('*') ? pin.toUpperCase() : 'KRA_CERT');
    const resolvedName = !isMaskedOrEmpty(name)
      ? name
      : (cachedRecord?.name || liveProfile?.taxpayerName || [dbUser?.firstName, dbUser?.lastName].filter(Boolean).join(' ') || 'Registered Taxpayer');
    const resolvedEmail = !isMaskedOrEmpty(email)
      ? email
      : (cachedRecord?.email || liveProfile?.email || dbUser?.email || '');
    const resolvedBuilding = !isMaskedOrEmpty(building)
      ? building
      : (!isMaskedOrEmpty(cachedRecord?.building) ? cachedRecord.building : (liveProfile?.building || ''));
    const resolvedStreet = !isMaskedOrEmpty(street)
      ? street
      : (!isMaskedOrEmpty(cachedRecord?.street) ? cachedRecord.street : (liveProfile?.street || ''));
    const resolvedCity = !isMaskedOrEmpty(city)
      ? city
      : (!isMaskedOrEmpty(cachedRecord?.city) ? cachedRecord.city : (liveProfile?.town || ''));
    const resolvedCounty = !isMaskedOrEmpty(county)
      ? county
      : (!isMaskedOrEmpty(cachedRecord?.county) ? cachedRecord.county : (liveProfile?.county || ''));
    const resolvedDistrict = !isMaskedOrEmpty(district)
      ? district
      : (!isMaskedOrEmpty(cachedRecord?.district) ? cachedRecord.district : (liveProfile?.district || ''));
    const resolvedTaxArea = !isMaskedOrEmpty(taxArea)
      ? taxArea
      : (!isMaskedOrEmpty(cachedRecord?.tax_area) ? cachedRecord.tax_area : (liveProfile?.taxArea || ''));
    const resolvedStation = !isMaskedOrEmpty(station)
      ? station
      : (!isMaskedOrEmpty(cachedRecord?.station) ? cachedRecord.station : (liveProfile?.station || ''));
    const resolvedPoBox = !isMaskedOrEmpty(poBox)
      ? poBox
      : (!isMaskedOrEmpty(cachedRecord?.po_box) ? cachedRecord.po_box : (liveProfile?.poBox || ''));
    const resolvedPostalCode = !isMaskedOrEmpty(postalCode)
      ? postalCode
      : (!isMaskedOrEmpty(cachedRecord?.postal_code) ? cachedRecord.postal_code : (liveProfile?.postalCode || ''));
    const resolvedRegDate = !isMaskedOrEmpty(registeredDate)
      ? registeredDate
      : (!isMaskedOrEmpty(cachedRecord?.registered_date) ? cachedRecord.registered_date : (liveProfile?.registrationDate || ''));

    // 4. Resolve template PDF file path
    let templatePath = path.join(process.cwd(), 'public', 'receipt-template.pdf');

    if (!fs.existsSync(templatePath)) {
      const rootFallback = path.join(process.cwd(), 'receipt-template.pdf');
      if (fs.existsSync(rootFallback)) {
        templatePath = rootFallback;
      } else {
        const relativeFallback = path.join(__dirname, '..', '..', '..', '..', 'public', 'receipt-template.pdf');
        if (fs.existsSync(relativeFallback)) {
          templatePath = relativeFallback;
        } else {
          log.error(`[generate-certificate] Template file not found: ${templatePath}`);
          return NextResponse.json({ success: false, error: 'Certificate template not found on server.' }, { status: 500 });
        }
      }
    }

    // 5. Load PDF and draw
    const pdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPages()[0];
    const { height } = page.getSize();

    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const BLACK = rgb(0, 0, 0);
    const today = new Date().toLocaleDateString('en-GB');

    const drawText = (text: string | null | undefined, x: number, y: number, size = 11) => {
      const value = String(text || '').trim();
      if (!value) return;
      page.drawText(value, { x, y, size, font: regularFont, color: BLACK });
    };

    // Core identity
    drawText(resolvedPin.toUpperCase(), 495, height - 130, 10);
    drawText(today, 510, height - 103, 10);
    drawText(resolvedName.toUpperCase(), 245, height - 242, 12);
    drawText(resolvedEmail ? resolvedEmail.toUpperCase() : '', 245, height - 257, 12);

    // Address
    drawText(resolvedBuilding, 354, height - 310, 12);
    drawText(resolvedStreet, 121, height - 327, 12);
    drawText(resolvedCity, 364, height - 327, 12);
    drawText(resolvedCounty, 100, height - 346, 12);
    drawText(resolvedDistrict, 348, height - 346, 12);
    drawText(resolvedTaxArea, 108, height - 365, 12);
    drawText(resolvedStation, 348, height - 365, 12);
    drawText(resolvedPoBox, 112, height - 382, 12);
    drawText(resolvedPostalCode, 374, height - 382, 12);

    // Registration / effective date
    drawText(resolvedRegDate || today, 270, height - 455, 12);

    // 6. Serialize
    const outBytes = await pdfDoc.save();

    // Audit log
    let userEmail: string = userId || 'guest@akubrecah.co.ke';
    if (userId) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        userEmail = user.primaryEmailAddress?.emailAddress || userId;
      } catch {}
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';

    await createSystemLog({
      level: 'info',
      service: 'Certificate-Generation',
      message: `Compliance certificate generated for PIN ${resolvedPin}`,
      actor: userEmail,
      ip,
      details: { pin: resolvedPin, downloadId, downloadType: downloadRecord?.downloadType || 'service_dispatch' },
    });

    return new NextResponse(Buffer.from(outBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="KRA_Certificate_${resolvedPin}.pdf"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });

  } catch (error: any) {
    log.error('[generate-certificate] Error:', error.message);
    return NextResponse.json({ success: false, error: 'Internal server error during certificate generation' }, { status: 500 });
  }
}
