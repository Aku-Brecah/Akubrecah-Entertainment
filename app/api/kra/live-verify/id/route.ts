import { log } from '@/lib/monitoring/logger';
import { NextRequest, NextResponse } from 'next/server';
import { fetchTaxpayerById } from '@/lib/kra-api';
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
    const { idNumber, engineMode = 'auto' } = body;

    if (!idNumber || typeof idNumber !== 'string' || !idNumber.trim()) {
      return NextResponse.json({ success: false, error: 'National ID number is required.' }, { status: 400 });
    }

    const cleanId = idNumber.trim();

    if (!/^\d{5,12}$/.test(cleanId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid National ID format. Must contain 5 to 12 digits.' },
        { status: 400 }
      );
    }

    const taxpayerData = await fetchTaxpayerById(cleanId, engineMode);

    // Zero-storage policy: Do not persist taxpayer lookup details into database cache.
    const maskedData = maskTaxpayerData(taxpayerData as any, true, true);
    await createSystemLog({
      level: 'info',
      service: 'KRA-Live-ID-Checker',
      message: 'National ID lookup executed (Admin Audit)',
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
        idNumber: cleanId,
        rawPin: taxpayerData.pin,
        rawId: cleanId,
      },
      isSubscribed: true,
    });
  } catch (error: any) {
    log.error('[API /api/kra/live-verify/id Error]:', error?.message);
    return NextResponse.json(
      { success: false, error: 'Failed to verify National ID with KRA live gateway. Please try again shortly.' },
      { status: 500 }
    );
  }
}
