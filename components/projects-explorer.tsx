"use client";

import Link from 'next/link';
import { 
  ArrowRight, ExternalLink, 
  CheckCircle2, ShieldCheck
} from 'lucide-react';
import { filterPublicTechnologies, cleanPublicLiveUrl } from '@/lib/tech-filter';

interface ProjectsExplorerProps {
  curatedProjects: any[];
}

export function ProjectsExplorer({
  curatedProjects,
}: ProjectsExplorerProps) {
  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-outline-variant pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
            Case Studies &amp; System Architectures
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Documented software implementations, statutory portals, and production systems
          </p>
        </div>
        <span className="text-xs font-mono text-on-surface-variant">
          {curatedProjects.length} documented systems
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {curatedProjects.map((project) => {
          const publicTechs = filterPublicTechnologies(project.technologies);
          const liveUrl = cleanPublicLiveUrl(project.slug, project.liveUrl);

          return (
            <article
              key={project.id}
              className="bg-surface-container-lowest rounded-xl border border-outline-variant hover:border-primary/40 p-6 sm:p-7 flex flex-col justify-between transition-colors group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
                  <span className="font-semibold text-primary">
                    {project.category}
                  </span>
                  {project.isFeatured && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-on-surface-variant">
                      <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                      Featured Case Study
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-on-surface group-hover:text-primary transition-colors tracking-tight">
                    <Link href={`/projects/${project.slug}`}>
                      {project.title}
                    </Link>
                  </h3>
                  <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed line-clamp-3">
                    {project.summary}
                  </p>
                </div>

                {/* Technologies */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {publicTechs.slice(0, 5).map((tech: string) => (
                    <span
                      key={tech}
                      className="px-2 py-0.5 rounded text-[11px] font-mono bg-surface-container-low text-on-surface-variant border border-outline-variant"
                    >
                      {tech}
                    </span>
                  ))}
                  {publicTechs.length > 5 && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono text-on-surface-variant">
                      +{publicTechs.length - 5}
                    </span>
                  )}
                </div>

                {/* Measurable Outcomes */}
                {project.measurableOutcomes && project.measurableOutcomes.length > 0 && (
                  <div className="pt-3 space-y-1.5 border-t border-outline-variant/60">
                    {project.measurableOutcomes.slice(0, 2).map((outcome: string, oIdx: number) => (
                      <div key={oIdx} className="flex items-center gap-2 text-xs text-on-surface">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{outcome}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="mt-6 pt-4 border-t border-outline-variant flex items-center justify-between gap-3">
                <Link
                  href={`/projects/${project.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface group-hover:text-primary transition-colors"
                >
                  <span>Read case study</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                {liveUrl && (
                  <a
                    href={liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    title="Open Live Production System"
                  >
                    <span>Live deployment</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
