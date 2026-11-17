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

    const projects = await prisma.project.findMany({
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ success: true, projects });
  } catch (error: any) {
    log.error('[API Admin Projects GET Error]:', error);
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
    const {
      title,
      slug,
      summary,
      description,
      category,
      client,
      featuredImage,
      galleryImages,
      liveUrl,
      githubUrl,
      technologies,
      problemStatement,
      solutionArchitecture,
      measurableOutcomes,
      isFeatured,
      isPublished,
      displayOrder,
      seoTitle,
      seoDescription,
    } = body;

    if (!title || !slug || !summary || !description || !category) {
      return NextResponse.json(
        { success: false, error: 'Title, slug, summary, description, and category are required.' },
        { status: 400 }
      );
    }

    const cleanSlug = String(slug)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const project = await prisma.project.create({
      data: {
        title: title.trim(),
        slug: cleanSlug,
        summary: summary.trim(),
        description: description.trim(),
        category: category.trim(),
        client: client?.trim() || null,
        featuredImage: featuredImage || '/akubrecah-logo.webp',
        galleryImages: Array.isArray(galleryImages) ? galleryImages : [],
        liveUrl: liveUrl?.trim() || null,
        githubUrl: githubUrl?.trim() || null,
        technologies: Array.isArray(technologies) ? technologies : [],
        problemStatement: problemStatement?.trim() || null,
        solutionArchitecture: solutionArchitecture?.trim() || null,
        measurableOutcomes: Array.isArray(measurableOutcomes) ? measurableOutcomes : [],
        isFeatured: Boolean(isFeatured),
        isPublished: Boolean(isPublished ?? true),
        displayOrder: Number(displayOrder) || 0,
        seoTitle: seoTitle?.trim() || null,
        seoDescription: seoDescription?.trim() || null,
      },
    });

    revalidatePath('/');
    revalidatePath('/projects');
    revalidatePath(`/projects/${project.slug}`);

    return NextResponse.json({ success: true, project });
  } catch (error: any) {
    log.error('[API Admin Projects POST Error]:', error);
    return NextResponse.json({ success: false, error: 'Failed to create project.' }, { status: 500 });
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
      return NextResponse.json({ success: false, error: 'Project ID is required.' }, { status: 400 });
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
    if (typeof body.summary === 'string') updateData.summary = body.summary.trim();
    if (typeof body.description === 'string') updateData.description = body.description.trim();
    if (typeof body.category === 'string') updateData.category = body.category.trim();
    if (body.client !== undefined) updateData.client = typeof body.client === 'string' && body.client.trim() ? body.client.trim() : null;
    if (typeof body.featuredImage === 'string') updateData.featuredImage = body.featuredImage.trim();
    if (Array.isArray(body.galleryImages)) updateData.galleryImages = body.galleryImages.map(String);
    if (body.liveUrl !== undefined) updateData.liveUrl = typeof body.liveUrl === 'string' && body.liveUrl.trim() ? body.liveUrl.trim() : null;
    if (body.githubUrl !== undefined) updateData.githubUrl = typeof body.githubUrl === 'string' && body.githubUrl.trim() ? body.githubUrl.trim() : null;
    if (Array.isArray(body.technologies)) updateData.technologies = body.technologies.map(String);
    if (body.problemStatement !== undefined) updateData.problemStatement = typeof body.problemStatement === 'string' && body.problemStatement.trim() ? body.problemStatement.trim() : null;
    if (body.solutionArchitecture !== undefined) updateData.solutionArchitecture = typeof body.solutionArchitecture === 'string' && body.solutionArchitecture.trim() ? body.solutionArchitecture.trim() : null;
    if (Array.isArray(body.measurableOutcomes)) updateData.measurableOutcomes = body.measurableOutcomes.map(String);
    if (typeof body.isFeatured === 'boolean') updateData.isFeatured = body.isFeatured;
    if (typeof body.isPublished === 'boolean') updateData.isPublished = body.isPublished;
    if (body.displayOrder !== undefined && Number.isFinite(Number(body.displayOrder))) updateData.displayOrder = Number(body.displayOrder);
    if (body.seoTitle !== undefined) updateData.seoTitle = typeof body.seoTitle === 'string' && body.seoTitle.trim() ? body.seoTitle.trim() : null;
    if (body.seoDescription !== undefined) updateData.seoDescription = typeof body.seoDescription === 'string' && body.seoDescription.trim() ? body.seoDescription.trim() : null;

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
    });

    revalidatePath('/');
    revalidatePath('/projects');
    revalidatePath(`/projects/${project.slug}`);

    return NextResponse.json({ success: true, project });
  } catch (error: any) {
    log.error('[API Admin Projects PUT Error]:', error);
    return NextResponse.json({ success: false, error: 'Failed to update project.' }, { status: 500 });
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
      return NextResponse.json({ success: false, error: 'Project ID is required.' }, { status: 400 });
    }

    await prisma.project.delete({ where: { id } });

    revalidatePath('/');
    revalidatePath('/projects');

    return NextResponse.json({ success: true, message: 'Project deleted successfully.' });
  } catch (error: any) {
    log.error('[API Admin Projects DELETE Error]:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete project.' }, { status: 500 });
  }
}
