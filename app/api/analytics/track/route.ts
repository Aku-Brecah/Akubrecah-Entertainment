import { NextRequest, NextResponse, after } from 'next/server';
import prisma from '@/lib/prisma';
import { extractClientIp } from '@/lib/rate-limit/ip';

export const maxDuration = 15;

export async function POST(req: NextRequest) {
  try {
    let bodyText = '';
    let payload: any = {};

    try {
      bodyText = await req.text();
      if (bodyText) {
        payload = JSON.parse(bodyText);
      }
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    const {
      sessionId,
      activityType,
      description,
      metadata = {},
      isMobile = false,
      deviceInfo = {},
    } = payload;

    if (!sessionId || !activityType) {
      return NextResponse.json({ success: false, error: 'Missing sessionId or activityType' }, { status: 400 });
    }

    if (typeof sessionId !== 'string' || sessionId.length > 64 || !/^[A-Za-z0-9_-]+$/.test(sessionId)) {
      return NextResponse.json({ success: false, error: 'Invalid sessionId format' }, { status: 400 });
    }
    if (typeof activityType !== 'string' || activityType.length > 64) {
      return NextResponse.json({ success: false, error: 'Invalid activityType' }, { status: 400 });
    }
    if (deviceInfo && (typeof deviceInfo !== 'object' || Array.isArray(deviceInfo))) {
      return NextResponse.json({ success: false, error: 'Invalid deviceInfo' }, { status: 400 });
    }
    if (JSON.stringify(deviceInfo || {}).length > 2048) {
      return NextResponse.json({ success: false, error: 'deviceInfo too large' }, { status: 400 });
    }
    if (metadata && (typeof metadata !== 'object' || Array.isArray(metadata))) {
      return NextResponse.json({ success: false, error: 'Invalid metadata' }, { status: 400 });
    }
    if (JSON.stringify(metadata || {}).length > 2048) {
      return NextResponse.json({ success: false, error: 'metadata too large' }, { status: 400 });
    }

    const ip = extractClientIp(req);
    const userAgent = (req.headers.get('user-agent') || '').slice(0, 512);

    const db = prisma as any;

    // Persist reliably after response via Next.js after() so serverless doesn't drop tasks
    if (typeof db.sessions?.upsert === 'function') {
      after(async () => {
        try {
          await db.sessions.upsert({
            where: { id: sessionId },
            update: {
              last_activity: new Date(),
              pin: null,
              user_agent: userAgent,
              is_mobile: Boolean(isMobile),
              device_info: deviceInfo,
            },
            create: {
              id: sessionId,
              pin: null,
              status: 'prospect',
              is_mobile: Boolean(isMobile),
              ip_address: ip,
              user_agent: userAgent,
              device_info: deviceInfo,
              last_activity: new Date(),
            },
          });

          if (typeof db.session_activities?.create === 'function') {
            const sanitizedMetadata = { ...(metadata || {}) };
            delete (sanitizedMetadata as any).pin;
            delete (sanitizedMetadata as any).idNumber;
            delete (sanitizedMetadata as any).id_number;
            delete (sanitizedMetadata as any).phone;
            delete (sanitizedMetadata as any).email;

            await db.session_activities.create({
              data: {
                id: 'act_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
                session_id: sessionId,
                activity_type: String(activityType).substring(0, 50),
                description: description ? String(description).substring(0, 255) : null,
                metadata: sanitizedMetadata,
              },
            });
          }
        } catch {
          // Non-blocking background telemetry
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Telemetry processing error' }, { status: 500 });
  }
}
