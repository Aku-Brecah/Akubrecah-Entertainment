import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getProjectBySlug } from '@/lib/cms';
import { getAllGithubRepos, getRepoReadme } from '@/lib/github';
import { 
  ExternalLink, CheckCircle2, ShieldCheck, 
  ArrowRight, BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownContent } from '@/components/markdown-content';
import { filterPublicTechnologies, cleanPublicLiveUrl } from '@/lib/tech-filter';

import { BreadcrumbSchema } from '@/components/seo/site-schema';

export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) {
    const { repos } = await getAllGithubRepos('Akubrecah');
    const gh = repos.find((r) => r.name.toLowerCase() === slug.toLowerCase());
    if (gh) {
      return {
        title: `${gh.name} | Akubrecah Deep Case Study & Engineering Spec`,
        description: gh.description,
        alternates: {
          canonical: `https://akubrecah.com/projects/${slug}`,
        },
        openGraph: {
          title: `${gh.name} | Akubrecah Deep Case Study`,
          description: gh.description,
          url: `https://akubrecah.com/projects/${slug}`,
        },
      };
    }
    return { title: 'Project Not Found | Akubrecah' };
  }

  const title = (project as any).seoTitle || `${project.title} | Akubrecah Deep Case Study`;
  const description = (project as any).seoDescription || project.summary;

  return {
    title,
    description,
    alternates: {
      canonical: `https://akubrecah.com/projects/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://akubrecah.com/projects/${slug}`,
      images: (project as any).featuredImage ? [(project as any).featuredImage] : ['https://akubrecah.com/og-image.jpg'],
    },
  };
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params;
  let project = await getProjectBySlug(slug);
  let githubRepo: any = null;

  // Retrieve GitHub metadata safely (best-effort; never crashes CMS projects if GitHub is rate-limited)
  try {
    const { repos } = await getAllGithubRepos('Akubrecah');
    githubRepo = repos.find(
      (r) => r.name.toLowerCase() === slug.toLowerCase() || (project && project.slug.toLowerCase() === r.name.toLowerCase())
    );
  } catch {
    githubRepo = null;
  }

  // If not in database CMS, dynamically construct from GitHub repo
  if (!project) {
    if (githubRepo) {
      project = {
        id: String(githubRepo.id),
        title: githubRepo.name.replace(/[-_]/g, ' '),
        slug: githubRepo.name,
        summary: githubRepo.description || `Engineering architecture and implementation for ${githubRepo.name}.`,
        description: githubRepo.description || 'Enterprise software architecture and implementation.',
        category: githubRepo.language || 'Software System',
        client: 'Akubrecah Engineering',
        featuredImage: null,
        liveUrl: cleanPublicLiveUrl(githubRepo.name, githubRepo.homepage),
        githubUrl: null,
        technologies: filterPublicTechnologies([githubRepo.language, ...(githubRepo.topics.length > 0 ? githubRepo.topics : ['Cloud Platform', 'Architecture', 'API'])]),
        problemStatement: `Designing and deploying resilient software architecture for ${githubRepo.name.replace(/[-_]/g, ' ')}.`,
        solutionArchitecture: `Engineered with high concurrency, automated workflows, and standardized engineering patterns.`,
        measurableOutcomes: [
          'Enterprise Architecture Delivered',
          'Production Deployment Verified',
          'Automated CI/CD & Observability',
        ],
        isFeatured: true,
        isPublished: true,
        displayOrder: 0,
        seoTitle: `${githubRepo.name} | Akubrecah Deep Architecture Spec`,
        seoDescription: githubRepo.description,
        createdAt: githubRepo.createdAt,
      } as any;
    }
  }

  if (!project || !project.isPublished) {
    notFound();
  }

  const publicLiveUrl = cleanPublicLiveUrl(project.slug, project.liveUrl);
  const sanitizedTechnologies = filterPublicTechnologies(project.technologies || []);

  // Fetch the real, detailed README from GitHub (with relative images rewritten to raw.githubusercontent.com)
  const repoNameToFetch = githubRepo?.name || project.slug;
  const defaultBranch = githubRepo?.defaultBranch || 'main';
  const readmeData = await getRepoReadme(repoNameToFetch, defaultBranch);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://akubrecah.com' },
          { name: 'Engineered Systems', url: 'https://akubrecah.com/projects' },
          { name: project.title, url: `https://akubrecah.com/projects/${slug}` },
        ]}
      />
      {/* Header & Hero */}
      <div className="bg-surface-container-lowest border-b border-outline-variant">
        <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-10 sm:py-12 space-y-4">
          <nav className="flex items-center gap-2 text-xs text-on-surface-variant">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span>/</span>
            <Link href="/projects" className="hover:text-primary transition-colors">Case Studies</Link>
            <span>/</span>
            <span className="text-on-surface font-medium truncate max-w-[200px] sm:max-w-none">{project.title}</span>
          </nav>

          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap text-xs">
              <span className="font-semibold text-primary uppercase tracking-wider">
                {project.category}
              </span>
              {project.client && (
                <>
                  <span className="text-outline-variant">·</span>
                  <span className="text-on-surface-variant">
                    Client: <strong className="text-on-surface font-semibold">{project.client}</strong>
                  </span>
                </>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-on-surface tracking-tight leading-tight">
              {project.title}
            </h1>

            <p className="text-base sm:text-lg text-on-surface-variant max-w-3xl leading-relaxed">
              {project.summary}
            </p>

            {publicLiveUrl && (
              <div className="flex items-center gap-3 pt-2 flex-wrap">
                <Button asChild size="sm" className="h-9 rounded-lg px-4 bg-primary text-white font-semibold text-xs hover:bg-primary/90 flex items-center gap-1.5">
                  <a href={publicLiveUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Live Deployment</span>
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-10 sm:py-12 space-y-10">
        {/* System Specification Metadata Sheet */}
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-6 p-6 rounded-xl bg-surface-container-lowest border border-outline-variant text-xs">
          <div className="space-y-1">
            <dt className="text-on-surface-variant">Architecture Domain</dt>
            <dd className="text-sm font-semibold text-on-surface">{project.category || 'GovTech'}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-on-surface-variant">Deployment State</dt>
            <dd className="text-sm font-semibold text-on-surface">Production</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-on-surface-variant">Client / Sponsor</dt>
            <dd className="text-sm font-semibold text-on-surface">{project.client || 'Akubrecah Engineering'}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-on-surface-variant">Primary Stack</dt>
            <dd className="text-sm font-mono font-semibold text-on-surface truncate">
              {sanitizedTechnologies.slice(0, 2).join(' · ') || 'TypeScript · Next.js'}
            </dd>
          </div>
        </dl>

        {/* Technologies List */}
        {sanitizedTechnologies && sanitizedTechnologies.length > 0 && (
          <div className="p-6 rounded-xl bg-surface-container-lowest border border-outline-variant space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Technology Stack &amp; Infrastructure
            </h2>
            <div className="flex flex-wrap gap-2">
              {sanitizedTechnologies.map((tech: string) => (
                <span
                  key={tech}
                  className="px-2.5 py-1 rounded text-xs font-mono font-medium bg-surface-container-low text-on-surface border border-outline-variant"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Featured Image if Present */}
        {project.featuredImage && (
          <div className="rounded-xl overflow-hidden border border-outline-variant bg-surface-container-lowest">
            <img
              src={project.featuredImage}
              alt={project.title}
              className="w-full max-h-[480px] object-cover"
            />
          </div>
        )}

        {/* In-Depth Real Engineering Documentation (README from GitHub) */}
        {readmeData.hasReadme ? (
          <div className="p-6 sm:p-10 rounded-xl bg-surface-container-lowest border border-outline-variant space-y-6">
            <div className="flex items-center justify-between border-b border-outline-variant pb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <h2 className="text-lg sm:text-xl font-bold text-on-surface tracking-tight">
                  Engineering Specification &amp; System Documentation
                </h2>
              </div>
            </div>

            <MarkdownContent content={readmeData.content} />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 sm:p-8 rounded-xl bg-surface-container-lowest border border-outline-variant space-y-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Problem Statement
                </span>
                <h3 className="text-lg font-bold text-on-surface">Operational Challenge</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {project.problemStatement || 'Enterprise operational inefficiencies and unoptimized database access required modernization.'}
                </p>
              </div>

              <div className="p-6 sm:p-8 rounded-xl bg-surface-container-lowest border border-outline-variant space-y-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Architecture Strategy
                </span>
                <h3 className="text-lg font-bold text-on-surface">Technical Solution</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {project.solutionArchitecture || 'Engineered a resilient decoupled service pattern with distributed caching and automated retries.'}
                </p>
              </div>
            </div>

            {project.measurableOutcomes && project.measurableOutcomes.length > 0 && (
              <div className="p-6 sm:p-8 rounded-xl bg-surface-container-lowest border border-outline-variant space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Production Outcomes</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {project.measurableOutcomes.map((outcome: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2.5 p-3 rounded-lg bg-surface-container-low border border-outline-variant">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm font-medium text-on-surface">{outcome}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-6 sm:p-8 rounded-xl bg-surface-container-lowest border border-outline-variant space-y-3">
              <h3 className="text-lg font-bold text-on-surface tracking-tight">System Overview</h3>
              <div className="text-sm text-on-surface-variant leading-relaxed space-y-4 whitespace-pre-line">
                {project.description}
              </div>
            </div>
          </div>
        )}

        {/* Bottom CTA Card */}
        <div className="p-8 sm:p-10 rounded-xl bg-surface-container-lowest border border-outline-variant flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-on-surface tracking-tight">Need a similar system engineered?</h3>
            <p className="text-xs sm:text-sm text-on-surface-variant">We design and deliver production software systems tailored to your operational requirements.</p>
          </div>
          <Button asChild size="lg" className="h-10 rounded-lg px-6 bg-primary text-white font-semibold text-xs hover:bg-primary/90 flex items-center gap-2">
            <Link href="/contact">
              <span>Start Your Project</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
