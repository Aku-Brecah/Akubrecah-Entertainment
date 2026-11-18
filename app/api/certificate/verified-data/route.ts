import { log } from '@/lib/monitoring/logger';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { fetchTaxpayerByPin, fetchTaxpayerById } from '@/lib/kra-api';
import { isAdminUser, getUserSubscriptionStatus } from '@/lib/subscription';
import { tryResolveKraPin } from '@/lib/masking';

export const maxDuration = 15;

/**
 * POST /api/certificate/verified-data
 *
 * Secure server-side endpoint that delivers the authoritative unmasked taxpayer
 * profile ONLY after verifying that a valid payment or subscription exists
 * in server-side database records.
 *
 * Security guarantees:
 * - Payment status is verified directly against `certificate_downloads` or active `subscriptions` table.
 * - Client-supplied paid flags or URL query parameters are rejected.
 * - A payment for PIN A cannot unlock or reveal PIN B.
 * - Missing or masked fields are resolved authoritatively from KRA records without fabricating data.
 */
export async function POST(req: NextRequest) {
  try {
    let authUserId: string | null = null;
    try {
      const session = await auth();
      authUserId = session?.userId || null;
    } catch {
      // Guest requester
    }

    const body = await req.json().catch(() => ({}));
    const downloadId = body.downloadId ? String(body.downloadId).trim() : '';
    // Accept plaintext PINs or opaque sealed blobs from the retrieval flow
    const requestedRawPin = body.pin ? String(body.pin).trim().toUpperCase() : '';
    const requestedPin = tryResolveKraPin(requestedRawPin) || requestedRawPin;

    if (!downloadId && !authUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid payment reference or download token required.' },
        { status: 403 }
      );
    }

    const db = prisma as any;
    let isAuthorized = false;
    let verifiedPin = requestedPin;

    // 1. Verify download record / 5-minute redemption window if downloadId is provided
    let downloadRecord: any = null;
    if (downloadId) {
      downloadRecord = await db.certificateDownload?.findFirst({
        where: { id: downloadId },
      }).catch(() => null);

      const { verifyCertificateDownloadEligibility } = await import('@/lib/mpesa-redemption');
      const eligibility = await verifyCertificateDownloadEligibility({
        downloadId,
        requestedPinInput: requestedPin,
        isServiceAuthorized: false,
        isAdmin: false,
      });

      if (!eligibility.allowed) {
        return NextResponse.json(
          { success: false, error: eligibility.error || 'Payment not verified or 5-minute download window expired.' },
          { status: eligibility.httpStatus || 403 }
        );
      }

      verifiedPin = eligibility.cleanPin || requestedPin;
      isAuthorized = true;
    }

    // 2. Fallback: Check if authenticated user has active subscription or admin access
    if (!isAuthorized && authUserId) {
      const isAdmin = await isAdminUser(authUserId);
      if (isAdmin) {
        isAuthorized = true;
      } else {
        const sub = await getUserSubscriptionStatus(authUserId);
        if (sub.isSubscribed) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Payment not verified. Protected taxpayer fields remain secured.' },
        { status: 402 }
      );
    }

    if (!verifiedPin) {
      return NextResponse.json(
        { success: false, error: 'No KRA PIN associated with this verified payment.' },
        { status: 400 }
      );
    }

    // 3. Resolve authoritative unmasked details directly via live KRA API (Strict Zero-Storage)
    let profile: any = null;
    try {
      const live = await fetchTaxpayerByPin(verifiedPin);
        if (live && live.taxpayerName) {
          profile = {
            pin: live.pin || verifiedPin,
            name: live.taxpayerName,
            taxpayerName: live.taxpayerName,
            fullName: live.taxpayerName,
            idNumber: live.idNumber || profile?.idNumber || '',
            email: live.email || profile?.email || '',
            phoneNumber: live.phoneNumber || profile?.phoneNumber || '',
            building: live.building || profile?.building || '',
            street: live.street || profile?.street || '',
            town: live.town || profile?.town || '',
            city: live.town || profile?.town || '',
            county: live.county || profile?.county || '',
            district: live.district || profile?.district || '',
            taxArea: live.taxArea || profile?.taxArea || '',
            station: live.station || profile?.station || '',
            poBox: live.poBox || profile?.poBox || '',
            postalCode: live.postalCode || profile?.postalCode || '',
            registeredDate: live.registrationDate || profile?.registeredDate || '',
          };
        }
      } catch (err: any) {
        log.warn('[verified-data] Live lookup notice:', err.message);
      }

      if (!profile) {
        const idToLookup = downloadRecord?.idNumber || (/^\d{5,12}$/.test(verifiedPin) ? verifiedPin : '');
        if (idToLookup) {
          try {
            const liveId = await fetchTaxpayerById(idToLookup);
            if (liveId && liveId.taxpayerName) {
              profile = {
                pin: liveId.pin || verifiedPin,
                name: liveId.taxpayerName,
                taxpayerName: liveId.taxpayerName,
                fullName: liveId.taxpayerName,
                idNumber: liveId.idNumber || idToLookup,
                email: liveId.email || '',
                phoneNumber: liveId.phoneNumber || '',
                building: liveId.building || '',
                street: liveId.street || '',
                town: liveId.town || '',
                city: liveId.town || '',
                county: liveId.county || '',
                district: liveId.district || '',
                taxArea: liveId.taxArea || '',
                station: liveId.station || '',
                poBox: liveId.poBox || '',
                postalCode: liveId.postalCode || '',
                registeredDate: liveId.registrationDate || '',
              };
            }
          } catch (idErr: any) {
            log.warn('[verified-data] ID fallback lookup notice:', idErr.message);
          }
        }
      }

    if (!profile) {
      log.warn('[verified-data] Upstream KRA iTax unavailable; refusing to fabricate taxpayer details.');
      return NextResponse.json(
        {
          success: false,
          verified: true,
          retryable: true,
          downloadId: downloadRecord?.id || downloadId,
          error:
            'KRA iTax upstream gateway is temporarily unavailable. Your payment is verified — please retry in a few seconds.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
      downloadId: downloadRecord?.id || downloadId,
      data: {
        ...profile,
        isSubscribed: true,
      },
    });

  } catch (error: any) {
    log.error('[verified-data] Error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Internal server error while resolving verified data.' },
      { status: 500 }
    );
  }
}
