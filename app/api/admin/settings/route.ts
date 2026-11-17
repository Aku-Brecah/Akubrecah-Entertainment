import { log } from '@/lib/monitoring/logger';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { verifyAdminCaller } from '@/lib/admin-auth';

export const maxDuration = 30;

const ALLOWED_SETTING_KEYS = new Set([
  'siteName',
  'tagline',
  'contactEmail',
  'contactPhone',
  'officeLocation',
  'heroHeadline',
  'heroSubtitle',
  'whatsappBotNumber',
  'githubUrl',
  'linkedinUrl',
  'kraRetrievalPrice',
  'engineeringAvailability',
  'googlePlaceId',
  'googleWriteReviewUrl',
  'googleMapsUrl',
  'rbac_matrix',
]);

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdminCaller(req);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const settings = await prisma.siteSetting.findMany({
      where: { key: { in: Array.from(ALLOWED_SETTING_KEYS) } },
    });
    const settingsMap: Record<string, any> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    return NextResponse.json({ success: true, settings: settingsMap });
  } catch (error: any) {
    log.error('[API Admin Settings GET Error]:', error);
    return NextResponse.json({ success: false, error: 'Failed to load site settings.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await verifyAdminCaller(req);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: 'Invalid settings payload.' }, { status: 400 });
    }

    const rejectedKeys: string[] = [];
    for (const [key, value] of Object.entries(body)) {
      if (!ALLOWED_SETTING_KEYS.has(key)) {
        rejectedKeys.push(key);
        continue;
      }
      await prisma.siteSetting.upsert({
        where: { key },
        update: { value: value as any },
        create: { key, value: value as any },
      });
    }

    revalidatePath('/');
    revalidatePath('/contact');

    return NextResponse.json({
      success: true,
      message: 'Site settings updated successfully.',
      ...(rejectedKeys.length > 0 ? { ignoredKeys: rejectedKeys } : {}),
    });
  } catch (error: any) {
    log.error('[API Admin Settings POST Error]:', error);
    return NextResponse.json({ success: false, error: 'Failed to save site settings.' }, { status: 500 });
  }
}
