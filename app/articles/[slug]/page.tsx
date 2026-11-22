import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getArticleBySlug } from '@/lib/cms';
import { ArrowLeft, Clock, Calendar, BookOpen, Share2, Tag, CheckCircle2, User } from 'lucide-react';
import { Metadata } from 'next';
import { MarkdownContent } from '@/components/markdown-content';
import { GooglePreferredSourceButton } from '@/components/google-preferred-source-button';

import { ArticleSchema, BreadcrumbSchema, FaqSchema, type FaqItem } from '@/components/seo/site-schema';

function toAbsoluteImageUrl(imagePath?: string | null): string {
  if (!imagePath) return 'https://akubrecah.com/og-image.jpg';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  return `https://akubrecah.com${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article || !article.isPublished) {
    return {
      title: 'Article Not Found | Akubrecah',
    };
  }

  const title = article.seoTitle || article.title;
  const description = article.seoDescription || article.excerpt;
  const publishedIso = new Date(article.publishedAt).toISOString();
  const absoluteImage = toAbsoluteImageUrl(article.featuredImage);

  return {
    title: `${title} | Akubrecah Engineering`,
    description,
    keywords: Array.isArray(article.tags) ? article.tags : undefined,
    alternates: {
      canonical: `https://akubrecah.com/articles/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://akubrecah.com/articles/${slug}`,
      type: 'article',
      publishedTime: publishedIso,
      tags: article.tags,
      images: [
        {
          url: absoluteImage,
          alt: article.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [absoluteImage],
    },
  };
}

export default async function ArticleDetailPage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article || !article.isPublished) {
    notFound();
  }

  const publishedIso = new Date(article.publishedAt).toISOString();
  const absoluteImage = toAbsoluteImageUrl(article.featuredImage);
  const articleFaqs: FaqItem[] = Array.isArray((article as { faqs?: unknown }).faqs)
    ? ((article as { faqs?: FaqItem[] }).faqs ?? [])
    : [];

  return (
    <article className="min-h-screen bg-background text-on-background">
      <ArticleSchema
        title={article.title}
        description={article.excerpt}
        url={`https://akubrecah.com/articles/${slug}`}
        publishedAt={publishedIso}
        authorName={article.authorName || 'Akubrecah Engineering'}
        imageUrl={absoluteImage}
        keywords={article.tags}
      />
      {articleFaqs.length > 0 && <FaqSchema items={articleFaqs} />}
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://akubrecah.com' },
          { name: 'Technical Writing', url: 'https://akubrecah.com/articles' },
          { name: article.title, url: `https://akubrecah.com/articles/${slug}` },
        ]}
      />
      {/* Header & Hero */}
      <div className="bg-surface-container-lowest border-b border-outline-variant">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-4">
          <nav className="flex items-center gap-2 text-xs text-on-surface-variant">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span>/</span>
            <Link href="/articles" className="hover:text-primary transition-colors">Technical Writing</Link>
            <span>/</span>
            <span className="text-on-surface font-medium truncate max-w-[200px] sm:max-w-none">{article.title}</span>
          </nav>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-on-surface-variant">
              <span className="font-semibold text-primary">
                {article.category}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5" />
                {article.readingTimeMinutes} min read
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 font-mono">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(article.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 font-medium">
                <User className="w-3.5 h-3.5" />
                {article.authorName || 'Akubrecah'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-on-surface tracking-tight leading-tight">
              {article.title}
            </h1>

            <p className="text-base text-on-surface-variant leading-relaxed">
              {article.excerpt}
            </p>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {/* Featured Cover Image if Present */}
        {article.featuredImage && (
          <div className="rounded-xl overflow-hidden border border-outline-variant bg-surface-container-lowest">
            <img
              src={article.featuredImage}
              alt={article.title}
              className="w-full max-h-[440px] object-cover"
            />
          </div>
        )}

        {/* Rich Markdown Reader Component */}
        <div className="p-6 sm:p-10 rounded-xl bg-surface-container-lowest border border-outline-variant">
          <MarkdownContent content={article.content} />
        </div>

        {/* Google Preferred Source Follow Bar */}
        <div className="p-4 sm:p-5 rounded-xl bg-surface-container-low border border-outline-variant flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-on-surface block">
              Follow Akubrecah on Google Search
            </span>
            <p className="text-[11px] text-on-surface-variant">
              Receive our engineering articles and Kenyan compliance guides in your Google Search feed.
            </p>
          </div>
          <GooglePreferredSourceButton siteDomain="akubrecah.com" />
        </div>

        {/* Tags */}
        <div className="pt-6 border-t border-outline-variant flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-on-surface-variant mr-1" />
            {article.tags.map((tag: string) => (
              <span key={tag} className="text-[11px] font-mono text-on-surface-variant bg-surface-container-low px-2.5 py-0.5 rounded border border-outline-variant">
                {tag}
              </span>
            ))}
          </div>

          <Link
            href="/articles"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Articles</span>
          </Link>
        </div>

        {/* Author & CTA Card */}
        <div className="p-6 sm:p-8 rounded-xl bg-surface-container-lowest border border-outline-variant flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1 flex-1">
            <h4 className="text-sm font-bold text-on-surface">Akubrecah Software Engineering</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed max-w-xl">
              Software engineering and systems architecture team in Nairobi building web platforms, payment gateways, and statutory facilitation tools.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <Link
              href="/retrieval-portal"
              className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              KRA Retrieval Portal
            </Link>
            <Link
              href="/services"
              className="px-4 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface text-xs font-semibold hover:border-primary/40 transition-colors"
            >
              Engineering Services
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
