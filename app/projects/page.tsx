import Link from 'next/link';
import { Metadata } from 'next';
import { getPublishedProjects } from '@/lib/cms';
import { ProjectsExplorer } from '@/components/projects-explorer';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BreadcrumbSchema } from '@/components/seo/site-schema';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Engineering Projects & Case Studies',
  description: 'Explore verified GovTech compliance portals, enterprise software platforms, and fintech payment architectures engineered by Akubrecah Technologies in Nairobi, Kenya.',
  alternates: {
    canonical: 'https://akubrecah.com/projects',
  },
  openGraph: {
    title: 'Engineering Projects & Case Studies | Akubrecah Technologies',
    description: 'Explore verified GovTech compliance portals, enterprise software platforms, and fintech architectures.',
    url: 'https://akubrecah.com/projects',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Akubrecah Engineering Projects',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Engineering Projects & Case Studies | Akubrecah',
    description: 'Explore verified GovTech compliance portals and enterprise platforms.',
    images: ['/og-image.jpg'],
  },
};

export default async function ProjectsPage() {
  const curatedProjects = await getPublishedProjects();

  return (
    <div className="min-h-screen bg-background text-on-background">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://akubrecah.com' },
          { name: 'Engineered Systems', url: 'https://akubrecah.com/projects' },
        ]}
      />
      {/* Hero Header */}
      <div className="bg-surface-container-lowest border-b border-outline-variant relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full filter blur-[120px] pointer-events-none" />
        <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-8 md:py-10 space-y-5 relative z-10">
          <nav className="flex items-center gap-2 text-xs text-on-surface-variant font-medium">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span>/</span>
            <span className="text-on-surface font-semibold">Engineered Systems</span>
          </nav>
          <div className="max-w-5xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-xs font-black text-primary uppercase tracking-widest shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
              Verified Production Architectures
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-on-surface tracking-tight leading-tight">
              Selected Work:<br />
              <span className="text-primary">Resilient Engineering at Sovereign Scale.</span>
            </h1>
            <p className="text-base sm:text-lg text-on-surface-variant max-w-4xl leading-relaxed">
              Explore our mission-critical web applications, statutory compliance portals, and enterprise engineering architectures designed for resilience across East Africa.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid Explorer */}
      <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-8 md:py-10 space-y-10">
        <ProjectsExplorer
          curatedProjects={curatedProjects}
        />

        {/* Bottom CTA Banner (Obsidian Sovereign Theme) */}
        <div className="p-8 sm:p-12 rounded-3xl bg-[#111315] text-white border border-stone-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-stone-700 bg-stone-900/80 mb-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">Direct Engineering Consultation</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Have a mission-critical system to architect or scale?
            </h3>
            <p className="text-sm text-stone-300 leading-relaxed">
              We engineer custom SaaS, GovTech portals, and M-Pesa fintech pipelines with guaranteed deliverables and sub-second performance.
            </p>
          </div>
          <Link href="/contact" className="shrink-0">
            <Button size="lg" className="rounded-xl px-6 bg-primary text-white font-bold hover:bg-primary/90 shadow-sm flex items-center gap-2">
              Book Architecture Review <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
