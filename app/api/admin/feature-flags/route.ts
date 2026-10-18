import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminCaller } from '@/lib/admin-auth';
import { getAllFeatureFlags, setFeatureFlag } from '@/lib/feature-flags';
import { createSystemLog } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = await verifyAdminCaller(req);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized. Admin credentials required.' }, { status: 401 });
  }

  const flags = await getAllFeatureFlags();
  return NextResponse.json({ success: true, flags });
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdminCaller(req);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized. Admin credentials required.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { key, isActive, description } = body;

    if (!key || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: key (string), isActive (boolean)' },
        { status: 400 }
      );
    }

    const success = await setFeatureFlag(key, isActive, description);

    if (success) {
      await createSystemLog({
        level: 'info',
        service: 'feature-flags',
        message: `Admin ${admin.email} toggled feature flag ${key} to ${isActive}`,
        actor: admin.email,
        details: { key, isActive, description },
      });

      return NextResponse.json({ success: true, key, isActive });
    }

    return NextResponse.json(
      { error: 'Failed to update feature flag in database.' },
      { status: 500 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
