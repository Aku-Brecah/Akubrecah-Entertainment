import { log } from '@/lib/monitoring/logger';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { verifyAdminCaller } from '@/lib/admin-auth';
import { ensureFallbackArticlesSeeded, getFallbackArticles } from '@/lib/cms';

export const maxDuration = 30;

function sanitizeSlug(rawSlug: unknown): string {
  return String(rawSlug || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function revalidateArticleRoutes(slug?: string) {
  try {
    revalidatePath('/articles');
    revalidatePath('/articles/[slug]', 'page');
    if (slug) {
      revalidatePath(`/articles/${slug}`);
    }
    revalidatePath('/sitemap.xml');
    revalidatePath('/');
  } catch (err) {
    log.warn('[Revalidate Articles Notice]:', (err as Error)?.message || err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdminCaller(req);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    let dbArticles: Awaited<ReturnType<typeof prisma.article.findMany>> = [];
    let dbFailed = false;
    try {
      dbArticles = await prisma.article.findMany({
        orderBy: { publishedAt: 'desc' },
      });
    } catch (dbErr) {
      dbFailed = true;
      log.warn('[API Admin Articles GET DB Notice - Fallback Used]:', (dbErr as Error)?.message);
    }

    const result = dbFailed
      ? getFallbackArticles().sort(
          (a, b) =>
            new Date(b.publishedAt || b.createdAt).getTime() -
            new Date(a.publishedAt || a.createdAt).getTime()
        )
      : dbArticles;

    return NextResponse.json({ success: true, articles: result });
  } catch (error: unknown) {
    const err = error as Error;
    log.error('[API Admin Articles GET Error]:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
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
      excerpt,
      content,
      category,
      tags,
      featuredImage,
      readingTimeMinutes,
      isPublished,
      seoTitle,
      seoDescription,
      canonicalUrl,
    } = body;

    if (!title || !slug || !excerpt || !content || !category) {
      return NextResponse.json(
        { success: false, error: 'Title, slug, excerpt, content, and category are required.' },
        { status: 400 }
      );
    }

    const cleanSlug = sanitizeSlug(slug);

    const article = await prisma.article.create({
      data: {
        title: String(title).trim(),
        slug: cleanSlug,
        excerpt: String(excerpt).trim(),
        content: String(content).trim(),
        category: String(category).trim(),
        tags: Array.isArray(tags) ? tags.map(String) : [],
        featuredImage: featuredImage ? String(featuredImage) : null,
        authorName: 'Akubrecah',
        readingTimeMinutes: Number(readingTimeMinutes) || Math.max(1, Math.ceil(String(content).split(/\s+/).length / 200)),
        isPublished: Boolean(isPublished ?? true),
        publishedAt: (isPublished ?? true) ? new Date() : undefined,
        seoTitle: seoTitle ? String(seoTitle) : null,
        seoDescription: seoDescription ? String(seoDescription) : null,
        canonicalUrl: canonicalUrl ? String(canonicalUrl) : null,
      },
    });

    revalidateArticleRoutes(article.slug);

    return NextResponse.json({ success: true, article });
  } catch (error: unknown) {
    const err = error as Error;
    log.error('[API Admin Articles POST Error]:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await verifyAdminCaller(req);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { id, ...raw } = body as Record<string, unknown>;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Article ID is required.' }, { status: 400 });
    }

    const updateData: {
      title?: string;
      slug?: string;
      excerpt?: string;
      content?: string;
      category?: string;
      tags?: string[];
      featuredImage?: string | null;
      readingTimeMinutes?: number;
      isPublished?: boolean;
      publishedAt?: Date;
      seoTitle?: string | null;
      seoDescription?: string | null;
      canonicalUrl?: string | null;
    } = {};

    if (typeof raw.title === 'string') updateData.title = raw.title.trim();
    if (typeof raw.slug === 'string') updateData.slug = sanitizeSlug(raw.slug);
    if (typeof raw.excerpt === 'string') updateData.excerpt = raw.excerpt.trim();
    if (typeof raw.content === 'string') updateData.content = raw.content.trim();
    if (typeof raw.category === 'string') updateData.category = raw.category.trim();
    if (Array.isArray(raw.tags)) updateData.tags = raw.tags.map(String);
    if (raw.featuredImage !== undefined) {
      updateData.featuredImage = raw.featuredImage ? String(raw.featuredImage) : null;
    }
    if (raw.readingTimeMinutes !== undefined && raw.readingTimeMinutes !== null) {
      updateData.readingTimeMinutes = Number(raw.readingTimeMinutes) || 5;
    } else if (typeof raw.content === 'string') {
      updateData.readingTimeMinutes = Math.max(1, Math.ceil(raw.content.split(/\s+/).length / 200));
    }
    if (typeof raw.isPublished === 'boolean') updateData.isPublished = raw.isPublished;
    if (typeof raw.publishedAt === 'string' && raw.publishedAt) {
      const parsedDate = new Date(raw.publishedAt);
      if (!Number.isNaN(parsedDate.getTime())) updateData.publishedAt = parsedDate;
    }
    if (raw.seoTitle !== undefined) updateData.seoTitle = raw.seoTitle ? String(raw.seoTitle) : null;
    if (raw.seoDescription !== undefined) {
      updateData.seoDescription = raw.seoDescription ? String(raw.seoDescription) : null;
    }
    if (raw.canonicalUrl !== undefined) {
      updateData.canonicalUrl = raw.canonicalUrl ? String(raw.canonicalUrl) : null;
    }

    const articleId = String(id);
    const existing = await prisma.article.findUnique({ where: { id: articleId } });

    let article;
    if (existing) {
      article = await prisma.article.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      const fallbackMatch = getFallbackArticles().find(
        (fb) =>
          fb.id === articleId ||
          (updateData.slug && fb.slug.toLowerCase() === updateData.slug.toLowerCase())
      );
      const targetSlug = updateData.slug || fallbackMatch?.slug;
      if (!targetSlug) {
        return NextResponse.json({ success: false, error: 'Article not found.' }, { status: 404 });
      }

      article = await prisma.article.upsert({
        where: { slug: targetSlug },
        update: updateData,
        create: {
          ...(fallbackMatch?.id ? { id: fallbackMatch.id } : {}),
          slug: targetSlug,
          title: updateData.title ?? fallbackMatch?.title ?? 'Untitled Article',
          excerpt: updateData.excerpt ?? fallbackMatch?.excerpt ?? '',
          content: updateData.content ?? fallbackMatch?.content ?? '',
          category: updateData.category ?? fallbackMatch?.category ?? 'Engineering',
          tags: updateData.tags ?? fallbackMatch?.tags ?? [],
          featuredImage: updateData.featuredImage ?? fallbackMatch?.featuredImage ?? null,
          authorName: fallbackMatch?.authorName || 'Akubrecah',
          readingTimeMinutes: updateData.readingTimeMinutes ?? fallbackMatch?.readingTimeMinutes ?? 5,
          isPublished: updateData.isPublished ?? fallbackMatch?.isPublished ?? true,
          publishedAt: updateData.publishedAt ?? fallbackMatch?.publishedAt ?? new Date(),
          seoTitle: updateData.seoTitle ?? fallbackMatch?.seoTitle ?? null,
          seoDescription: updateData.seoDescription ?? fallbackMatch?.seoDescription ?? null,
          canonicalUrl: updateData.canonicalUrl ?? fallbackMatch?.canonicalUrl ?? null,
        },
      });
    }

    revalidateArticleRoutes(article.slug);

    return NextResponse.json({ success: true, article });
  } catch (error: unknown) {
    const err = error as Error;
    log.error('[API Admin Articles PUT Error]:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
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
      return NextResponse.json({ success: false, error: 'Article ID is required.' }, { status: 400 });
    }

    const deleted = await prisma.article.delete({ where: { id } });

    revalidateArticleRoutes(deleted.slug);

    return NextResponse.json({ success: true, message: 'Article deleted successfully.' });
  } catch (error: unknown) {
    const err = error as Error;
    log.error('[API Admin Articles DELETE Error]:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
