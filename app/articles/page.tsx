import Link from 'next/link';
import { Metadata } from 'next';
import { getPublishedArticles } from '@/lib/cms';
import { Clock, ArrowRight, Calendar } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/site-schema';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Engineering Articles, KRA Guides & Technical Tutorials',
  description: 'Step-by-step guides on KRA PIN retrieval online using National ID, KRA iTax portal login, software architecture, mobility platforms, and GovTech compliance automation by Akubrecah Technologies.',
  keywords: [
    'retrieve kra pin',
    'KRA PIN Retrieval using ID number',
    'KRA PIN Retrieval online',
    'KRA iTax portal Login',
    'KRA PIN Certificate download',
    'KRA PIN forgot password',
    'Software Architecture Kenya',
  ],
  alternates: {
    canonical: 'https://akubrecah.com/articles',
  },
  openGraph: {
    title: 'Engineering Articles, KRA Guides & Technical Tutorials | Akubrecah Technologies',
    description: 'Guides on KRA PIN retrieval using ID number, iTax portal login, distributed systems, and statutory compliance automation.',
    url: 'https://akubrecah.com/articles',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Akubrecah Engineering Articles & KRA Guides',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Engineering Articles, KRA Guides & Technical Tutorials | Akubrecah',
    description: 'Guides on KRA PIN retrieval online, KRA iTax portal login, and statutory compliance automation.',
    images: ['/og-image.jpg'],
  },
};

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const query = (resolvedParams?.q || '').trim().toLowerCase();
  const allArticles = await getPublishedArticles().catch(() => []);
  const articles = query
    ? allArticles.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.excerpt.toLowerCase().includes(query) ||
          a.category.toLowerCase().includes(query) ||
          (a.tags || []).some((t: string) => t.toLowerCase().includes(query))
      )
    : allArticles;

  return (
    <div className="min-h-screen bg-background text-on-background">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://akubrecah.com' },
          { name: 'Technical Writing', url: 'https://akubrecah.com/articles' },
        ]}
      />
      {/* Header */}
      <div className="relative overflow-hidden py-10 md:py-14">
        <div aria-hidden="true" className="pointer-events-none absolute -top-12 left-1/4 w-80 h-80 rounded-full bg-[#FFE4E1] opacity-60 blur-[90px] animate-float-blob" />
        <div aria-hidden="true" className="pointer-events-none absolute top-4 right-1/4 w-80 h-80 rounded-full bg-[#E6E6FA] opacity-60 blur-[90px] animate-float-blob [animation-delay:3s]" />
        <div className="relative z-10 w-full max-w-[1220px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <nav className="flex items-center gap-2 text-xs text-on-surface-variant">
            <Link href="/" className="hover:text-on-surface transition-colors">Home</Link>
            <span>/</span>
            <span className="text-on-surface font-medium">Technical Writing</span>
          </nav>
          <div className="max-w-4xl space-y-3">
            <span className="font-cursive text-2xl sm:text-3xl text-[#78716C] block">
              engineering field notes &amp; compliance guides
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-medium text-on-surface tracking-[-0.025em] leading-[1.08]">
              Engineering articles &amp;{" "}
              <span className="font-cursive text-5xl sm:text-7xl font-normal">field notes</span>.
            </h1>
            <p className="text-base sm:text-lg text-on-surface-variant max-w-2xl leading-relaxed">
              Practical architectural documentation, Kenya Revenue Authority (KRA) regulatory guides, Safaricom Daraja M-Pesa payment integration notes, and systems design write-ups.
            </p>
          </div>
        </div>
      </div>

      {/* Articles Feed */}
      <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-8 md:py-12 space-y-6">
        <div className="space-y-6">
          {articles.length === 0 ? (
            <div className="p-8 rounded-xl bg-surface-container-lowest border border-outline-variant text-center space-y-2">
              <p className="text-sm font-semibold text-on-surface">
                {query ? `No articles matched "${resolvedParams?.q}".` : 'No technical articles published yet.'}
              </p>
              {query && (
                <Link href="/articles" className="text-xs font-semibold text-primary hover:underline">
                  Clear search filter
                </Link>
              )}
            </div>
          ) : articles.map((article) => (
            <article
              key={article.id}
              className="p-6 sm:p-7 rounded-xl bg-surface-container-lowest border border-outline-variant hover:border-primary/40 transition-colors group"
            >
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {article.featuredImage && (
                  <div className="w-full md:w-56 h-40 shrink-0 rounded-lg overflow-hidden border border-outline-variant bg-surface-container">
                    <img
                      src={article.featuredImage}
                      alt={article.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="space-y-2.5 flex-1 min-w-0">
                  <div className="flex items-center gap-3 text-xs text-on-surface-variant flex-wrap">
                    <span className="font-semibold text-primary">
                      {article.category}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      {article.readingTimeMinutes} min read
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(article.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold text-on-surface group-hover:text-primary transition-colors tracking-tight">
                    <Link href={`/articles/${article.slug}`}>
                      {article.title}
                    </Link>
                  </h2>

                  <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed line-clamp-3">
                    {article.excerpt}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-outline-variant flex-wrap gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      {article.tags.slice(0, 5).map((tag: string) => (
                        <span key={tag} className="text-[11px] font-mono text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded border border-outline-variant">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <Link
                      href={`/articles/${article.slug}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface group-hover:text-primary transition-colors"
                    >
                      <span>Read article</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
