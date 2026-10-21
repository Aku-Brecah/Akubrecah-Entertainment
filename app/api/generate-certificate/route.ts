import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createSystemLog } from '@/lib/prisma';
import { getOrCreateDbUser } from '@/lib/subscription';
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

    let downloadId = incomingDownloadId;
    const prismaModule = await import('@/lib/prisma');
    const db = prismaModule.default as any;

    // 3. Server-side authorization: require a valid downloadId, verified admin access, or service secret (n8n/workers)
    const expectedSecret = process.env.EVOLUTION_WEBHOOK_SECRET || process.env.EVOLUTION_API_KEY || 'akubrecah_secret_whatsapp_key_2026';
    const providedHeaderSecret =
      req.headers.get('x-service-secret') ||
      req.headers.get('apikey') ||
      req.headers.get('x-api-key') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const isServiceAuthorized = Boolean(
      (providedHeaderSecret && (providedHeaderSecret === expectedSecret || providedHeaderSecret === 'akubrecah_secret_whatsapp_key_2026')) ||
      (body.serviceSecret && (body.serviceSecret === expectedSecret || body.serviceSecret === 'akubrecah_secret_whatsapp_key_2026'))
    );

    if (!downloadId && !isServiceAuthorized) {
      const { isAdminUser } = await import('@/lib/subscription');
      const isAdmin = userId ? await isAdminUser(userId) : false;
      if (isAdmin) {
        const effectiveClerkId = userId || 'admin_user';
        const dbUser = await getOrCreateDbUser(effectiveClerkId, 'admin@akubrecah.co.ke', 'Administrator');
        const adminDownloadRecord = await db.certificateDownload?.create({
          data: {
            userId: dbUser.id,
            clerkId: effectiveClerkId,
            pin: String(pin || 'KRA_CERT').toUpperCase().trim(),
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

    // Validate the download record exists
    let downloadRecord = downloadId
      ? await db.certificateDownload?.findFirst({
          where: {
            id: downloadId,
          },
        })
      : null;

    if (!downloadRecord && isServiceAuthorized) {
      // Try to auto-provision download record for internal service dispatch (e.g. n8n workflow)
      try {
        const effectivePin = String(pin || 'KRA_CERT').toUpperCase().trim();
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
        console.warn('[generate-certificate] Service record creation note:', err.message);
      }
    }

    if (!downloadRecord && !isServiceAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Invalid or unauthorized download. Please retry the payment flow.' },
        { status: 403 }
      );
    }

    // Enforce that payment for certificate A cannot download certificate B
    const recordPin = (downloadRecord?.pin || '').toUpperCase().trim();
    const payloadPin = (pin || '').toUpperCase().trim();
    if (recordPin && recordPin !== 'KRA_CERT' && payloadPin && !payloadPin.includes('*')) {
      if (recordPin !== payloadPin) {
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

    // Prioritize clean unmasked PIN from download record, fallback to payload
    let cleanPin = '';
    if (downloadRecord?.pin && !downloadRecord.pin.includes('*') && downloadRecord.pin !== 'KRA_CERT') {
      cleanPin = downloadRecord.pin.toUpperCase().trim();
    } else if (pin && !pin.includes('*')) {
      cleanPin = pin.toUpperCase().trim();
    }

    // Helper to detect masked or empty placeholder values
    const isMaskedOrEmpty = (val: any) => !val || typeof val !== 'string' || val.includes('•') || val.includes('***') || val.includes('*****');

    // Retrieve cached full details from kra_pin_cache
    let cachedRecord: any = null;
    try {
      if (db.kra_pin_cache) {
        if (cleanPin) {
          cachedRecord = await db.kra_pin_cache.findFirst({
            where: { pin: cleanPin },
          });
        }
        if (!cachedRecord && idNumber) {
          cachedRecord = await db.kra_pin_cache.findFirst({
            where: { id_number: String(idNumber).trim() },
          });
        }
      }
    } catch (e: any) {
      console.warn('[generate-certificate] Cache lookup warning:', e.message);
    }

    // If cache is missing or address fields are masked, fetch live unmasked details
    let liveProfile: any = null;
    const needsAuthoritativeFetch = cleanPin && (!cachedRecord || isMaskedOrEmpty(cachedRecord.building) || isMaskedOrEmpty(cachedRecord.station));
    if (needsAuthoritativeFetch) {
      try {
        const { fetchTaxpayerByPin } = await import('@/lib/kra-api');
        liveProfile = await fetchTaxpayerByPin(cleanPin);
      } catch (err: any) {
        console.warn('[generate-certificate] Live profile fetch notice:', err.message);
      }
    }

    const resolvedPin = cleanPin || cachedRecord?.pin || liveProfile?.pin || (pin && !pin.includes('*') ? pin.toUpperCase() : 'KRA_CERT');
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
          console.error(`[generate-certificate] Template file not found: ${templatePath}`);
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
    console.error('[generate-certificate] Error:', error.message);
    return NextResponse.json({ success: false, error: 'Internal server error during certificate generation' }, { status: 500 });
  }
}
