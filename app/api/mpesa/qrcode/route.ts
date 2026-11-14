import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { tryResolveKraPin } from '@/lib/masking';
import { getDarajaAccessToken, getDarajaConfig } from '@/lib/whatsapp/mpesa-dispatch';
import { log } from '@/lib/monitoring/logger';

export const maxDuration = 15;

function resolveEffectiveReference(rawPin?: string | null, rawReference?: string | null): string {
  const cleanPin = (rawPin || '').trim();
  if (cleanPin) {
    const unsealed = tryResolveKraPin(cleanPin);
    if (unsealed && /^[A-Z]\d{9}[A-Z]$/i.test(unsealed)) {
      return `CERT-${unsealed.toUpperCase()}`;
    }
    if (/^[A-Z]\d{9}[A-Z]$/i.test(cleanPin)) {
      return `CERT-${cleanPin.toUpperCase()}`;
    }
  }

  const cleanRef = (rawReference || '').trim();
  if (cleanRef) {
    const unsealedRef = tryResolveKraPin(cleanRef.replace(/^CERT-/i, '').trim());
    if (unsealedRef && /^[A-Z]\d{9}[A-Z]$/i.test(unsealedRef)) {
      return `CERT-${unsealedRef.toUpperCase()}`;
    }
    return cleanRef.slice(0, 40);
  }

  return 'KRA-CERT';
}

async function generateMpesaQrResponse(rawPin?: string | null, rawReference?: string | null) {
  const config = getDarajaConfig();
  const tillNumber = (config.partyB || '9348469').trim() || '9348469';
  const shortCode = (config.shortCode || '9914132').trim() || '9914132';
  const amount = Number(process.env.MPESA_DOWNLOAD_FEE_KES || 20);
  const effectiveRef = resolveEffectiveReference(rawPin, rawReference);
  const merchantName = 'Akubrecah Technologies';

  if (config.hasDaraja) {
    try {
      const token = await getDarajaAccessToken(
        config.baseUrl,
        config.consumerKey,
        config.consumerSecret
      );
      if (token) {
        const darajaRes = await fetch(`${config.baseUrl}/mpesa/qrcode/v1/generate`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            MerchantName: 'AKUBRECAH TECHNOLOGIES',
            RefNo: effectiveRef,
            Amount: amount,
            TrxCode: 'BG',
            CPI: tillNumber,
            Size: '300',
          }),
          signal: AbortSignal.timeout(5000),
        });

        if (darajaRes.ok) {
          const data = await darajaRes.json().catch(() => null);
          const rawQr = typeof data?.QRCode === 'string' ? data.QRCode.trim() : '';
          if (rawQr && rawQr.length > 32) {
            const qrImageUrl = rawQr.startsWith('data:image/')
              ? rawQr
              : `data:image/png;base64,${rawQr}`;

            return NextResponse.json({
              success: true,
              qrImageUrl,
              source: 'daraja',
              tillNumber,
              shortCode,
              amount,
              reference: effectiveRef,
              merchantName,
            });
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn('[M-Pesa QR] Daraja dynamic QR unavailable, using custom QR fallback:', msg);
    }
  }

  const qrPayload = `MPESA:BUYGOODS:${tillNumber};AMT:${amount};REF:${effectiveRef}`;
  const qrImageUrl = await QRCode.toDataURL(qrPayload, {
    width: 320,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#064e3b',
      light: '#ffffff',
    },
  });

  return NextResponse.json({
    success: true,
    qrImageUrl,
    source: 'custom',
    tillNumber,
    shortCode,
    amount,
    reference: effectiveRef,
    merchantName,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const pin = typeof body?.pin === 'string' ? body.pin : undefined;
    const reference = typeof body?.reference === 'string' ? body.reference : undefined;
    return await generateMpesaQrResponse(pin, reference);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('[M-Pesa QR Error]:', msg);
    return NextResponse.json(
      { success: false, error: 'Failed to generate M-Pesa payment QR code.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const pin = req.nextUrl.searchParams.get('pin');
    const reference = req.nextUrl.searchParams.get('reference');
    return await generateMpesaQrResponse(pin, reference);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('[M-Pesa QR GET Error]:', msg);
    return NextResponse.json(
      { success: false, error: 'Failed to generate M-Pesa payment QR code.' },
      { status: 500 }
    );
  }
}
