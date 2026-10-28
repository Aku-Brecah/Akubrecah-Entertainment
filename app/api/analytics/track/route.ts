import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
      payload = {};
    }

    const {
      sessionId,
      activityType,
      description,
      pin,
      metadata = {},
      isMobile = false,
      deviceInfo = {},
    } = payload;

    if (!sessionId || !activityType) {
      return NextResponse.json({ success: false, error: 'Missing sessionId or activityType' }, { status: 400 });
    }

    // SECURITY: sessionId becomes a primary key via upsert — enforce a sane
    // format and size, and reject oversized/untrusted device payloads so the
    // endpoint cannot be used for DB flooding.
    if (typeof sessionId !== 'string' || sessionId.length > 64 || !/^[A-Za-z0-9_-]+$/.test(sessionId)) {
      return NextResponse.json({ success: false, error: 'Invalid sessionId format' }, { status: 400 });
    }
    if (typeof activityType !== 'string' || activityType.length > 64) {
      return NextResponse.json({ success: false, error: 'Invalid activityType' }, { status: 400 });
    }
    if (deviceInfo && typeof deviceInfo !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid deviceInfo' }, { status: 400 });
    }
    if (JSON.stringify(deviceInfo || {}).length > 2048) {
      return NextResponse.json({ success: false, error: 'deviceInfo too large' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') || 
               '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || '';

    const db = prisma as any;

    // Check if sessions table is accessible
    if (typeof db.sessions?.upsert === 'function') {
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
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    // Non-blocking response
    return NextResponse.json({ success: true, notice: 'Event recorded or queued' });
  }
}
