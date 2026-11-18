import { log } from '@/lib/monitoring/logger';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { verifyAdminCaller } from '@/lib/admin-auth';

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdminCaller(req);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const services = await prisma.serviceOffering.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json({ success: true, services });
  } catch (error: any) {
    log.error('[API Admin Services GET Error]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await verifyAdminCaller(req);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { title, slug, tagline, description, icon, deliverables, technologies, priceStarting, isFeatured } = body;

    if (!title || !slug || !tagline || !description) {
      return NextResponse.json({ success: false, error: 'Title, slug, tagline, and description are required.' }, { status: 400 });
    }

    const cleanSlug = String(slug)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const service = await prisma.serviceOffering.create({
      data: {
        title: title.trim(),
        slug: cleanSlug,
        tagline: tagline.trim(),
        description: description.trim(),
        icon: icon || 'code',
        deliverables: Array.isArray(deliverables) ? deliverables : [],
        technologies: Array.isArray(technologies) ? technologies : [],
        priceStarting: priceStarting || null,
        isFeatured: Boolean(isFeatured ?? true),
      },
    });

    revalidatePath('/services');
    revalidatePath('/solutions');

    return NextResponse.json({ success: true, service });
  } catch (error: any) {
    log.error('[API Admin Services POST Error]:', error);
    return NextResponse.json({ success: false, error: 'Failed to create service.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await verifyAdminCaller(req);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const id = typeof body.id === 'string' ? body.id.trim() : '';

    if (!id) {
      return NextResponse.json({ success: false, error: 'Service ID is required.' }, { status: 400 });
    }

    // Explicit field allowlist to prevent mass assignment
    const updateData: Record<string, unknown> = {};
    if (typeof body.title === 'string') updateData.title = body.title.trim();
    if (typeof body.slug === 'string') {
      updateData.slug = body.slug
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }
    if (typeof body.tagline === 'string') updateData.tagline = body.tagline.trim();
    if (typeof body.description === 'string') updateData.description = body.description.trim();
    if (typeof body.icon === 'string') updateData.icon = body.icon.trim();
    if (Array.isArray(body.deliverables)) updateData.deliverables = body.deliverables.map(String);
    if (Array.isArray(body.technologies)) updateData.technologies = body.technologies.map(String);
    if (body.priceStarting !== undefined) updateData.priceStarting = typeof body.priceStarting === 'string' && body.priceStarting.trim() ? body.priceStarting.trim() : null;
    if (typeof body.isFeatured === 'boolean') updateData.isFeatured = body.isFeatured;
    if (body.displayOrder !== undefined && Number.isFinite(Number(body.displayOrder))) updateData.displayOrder = Number(body.displayOrder);

    const service = await prisma.serviceOffering.update({
      where: { id },
      data: updateData,
    });

    revalidatePath('/services');
    revalidatePath('/solutions');

    return NextResponse.json({ success: true, service });
  } catch (error: any) {
    log.error('[API Admin Services PUT Error]:', error);
    return NextResponse.json({ success: false, error: 'Failed to update service.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await verifyAdminCaller(req);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Service ID is required.' }, { status: 400 });
    }

    await prisma.serviceOffering.delete({ where: { id } });

    revalidatePath('/services');
    revalidatePath('/solutions');

    return NextResponse.json({ success: true, message: 'Service deleted successfully.' });
  } catch (error: any) {
    log.error('[API Admin Services DELETE Error]:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete service.' }, { status: 500 });
  }
}
