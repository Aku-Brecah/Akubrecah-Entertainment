import { log } from '@/lib/monitoring/logger';
import { NextRequest, NextResponse } from 'next/server';
import { fetchTaxpayerByPin } from '@/lib/kra-api';
import { createSystemLog } from '@/lib/prisma';
import { verifyAdminCaller } from '@/lib/admin-auth';
import { maskTaxpayerData } from '@/lib/masking';

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const admin = await verifyAdminCaller(req);

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Taxpayer PIN verification engine is restricted to administrative audit access.' },
        { status: 403 }
      );
    }

    const userEmail = admin.email;
    const body = await req.json();
    const { pin, engineMode = 'auto' } = body;

    if (!pin || typeof pin !== 'string' || !pin.trim()) {
      return NextResponse.json({ success: false, error: 'KRA PIN is required.' }, { status: 400 });
    }

    const cleanPin = pin.trim().toUpperCase();

    // Verify PIN pattern: 11 characters (letter + 9 digits + letter, or standard alphanumeric 11-char)
    if (!/^[A-Z0-9]{11}$/.test(cleanPin)) {
      return NextResponse.json(
        { success: false, error: 'Invalid PIN format. KRA PIN must be exactly 11 characters (e.g. A012345678Z).' },
        { status: 400 }
      );
    }

    const taxpayerData = await fetchTaxpayerByPin(cleanPin, engineMode);

    // Zero-storage policy: Do not persist taxpayer lookup details into database cache.
    // Live taxpayer results are processed ephemerally in-memory for the active session.
    const maskedData = maskTaxpayerData(taxpayerData as any, true, true);

    await createSystemLog({
      level: 'info',
      service: 'KRA-Live-PIN-Checker',
      message: 'Taxpayer PIN lookup verified (Admin Audit)',
      actor: userEmail,
      ip,
      details: {
        isSubscribed: true,
        source: taxpayerData.source,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...maskedData,
        rawPin: cleanPin,
      },
      isSubscribed: true,
    });
  } catch (error: any) {
    log.error('[API /api/kra/live-verify/pin Error]:', error?.message);
    return NextResponse.json(
      { success: false, error: 'Failed to verify KRA PIN with live gateway. Please try again shortly.' },
      { status: 500 }
    );
  }
}
