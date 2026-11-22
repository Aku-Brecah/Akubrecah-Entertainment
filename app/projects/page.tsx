import Link from 'next/link';
import { Metadata } from 'next';
import { getPublishedProjects } from '@/lib/cms';
import { ProjectsExplorer } from '@/components/projects-explorer';
import { ArrowRight } from 'lucide-react';
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
  const curatedProjects = await getPublishedProjects().catch(() => []);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://akubrecah.com' },
          { name: 'Engineered Systems', url: 'https://akubrecah.com/projects' },
        ]}
      />
      {/* Hero Header */}
      <div className="relative overflow-hidden py-10 md:py-14">
        <div aria-hidden="true" className="pointer-events-none absolute -top-12 left-1/4 w-80 h-80 rounded-full bg-[#FFE4E1] opacity-60 blur-[90px] animate-float-blob" />
        <div aria-hidden="true" className="pointer-events-none absolute top-4 right-1/4 w-80 h-80 rounded-full bg-[#E6E6FA] opacity-60 blur-[90px] animate-float-blob [animation-delay:3s]" />
        <div className="relative z-10 w-full max-w-[1220px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <nav className="flex items-center gap-2 text-xs text-on-surface-variant">
            <Link href="/" className="hover:text-on-surface transition-colors">Home</Link>
            <span>/</span>
            <span className="text-on-surface font-medium">Case Studies</span>
          </nav>
          <div className="max-w-4xl space-y-3">
            <span className="font-cursive text-2xl sm:text-3xl text-[#78716C] block">
              production systems &amp; architecture reviews
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-medium text-on-surface tracking-[-0.025em] leading-[1.08]">
              Selected engineering work and{" "}
              <span className="font-cursive text-5xl sm:text-7xl font-normal">deployed</span>{" "}
              platforms.
            </h1>
            <p className="text-base sm:text-lg text-on-surface-variant max-w-2xl leading-relaxed">
              Examine the technical requirements, system architecture, and production outcomes of our web applications, statutory compliance portals, and mobile platforms.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid Explorer */}
      <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-10 md:py-14 space-y-12">
        <ProjectsExplorer
          curatedProjects={curatedProjects}
        />

        {/* Bottom Consultation Bar */}
        <div className="p-8 sm:p-10 rounded-xl bg-surface-container-lowest border border-outline-variant flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Architecture Consultation
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
              Have a software system to architect or modernize?
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              We build custom web platforms, GovTech portals, and Daraja M-Pesa payment pipelines with clear milestones and documented codebases.
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0 h-10 rounded-lg px-6 bg-primary text-white font-semibold text-xs hover:bg-primary/90 flex items-center gap-2">
            <Link href="/contact">
              <span>Book Architecture Review</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
