import { log } from '@/lib/monitoring/logger';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

function getFallbackArticles(): any[] {
  try {
    const filePath = path.join(process.cwd(), 'data', 'articles-fallback.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    log.warn('[Fallback Articles Error]:', err);
  }
  return [];
}

import { filterPublicTechnologies, cleanPublicLiveUrl } from '@/lib/tech-filter';

const FALLBACK_FLAGSHIP_PROJECTS = [
  {
    id: 'proj-kra-portal',
    slug: 'akubrecah-kra-certificate-portal',
    title: 'KRA PIN Certificate Retrieval & Statutory Portal',
    summary: 'Mission-critical automated Kenyan tax compliance platform processing National ID verification, automated Nil return filing, and sub-120ms volatile RAM PDF streaming.',
    description: 'An enterprise-grade statutory compliance portal designed for Kenyan taxpayers.\n\nKey Engineering Pillars:\n• Direct encrypted TLS integration with upstream authority endpoints\n• Zero-disk persistent RAM streaming for citizen privacy protection\n• Automated M-Pesa Daraja and Paystack micro-payment reconciliation\n• WhatsApp autonomous bot dispatcher for instant receipt and PDF certificate delivery',
    category: 'GovTech & Compliance',
    client: 'Kenya Revenue Taxpayers',
    featuredImage: '/akubrecah-logo.png',
    liveUrl: 'https://kra.akubrecah.com',
    githubUrl: null,
    technologies: ['GovTech Compliance', 'Statutory Verification', 'Instant Mobile Billing', 'Thermal ETR Receipts'],
    problemStatement: 'Taxpayers face extensive queues, slow portals, and unsecure storage when retrieving essential tax compliance certificates and filing Nil returns.',
    solutionArchitecture: 'Decoupled in-memory processing engine streaming certificates directly from volatile Node.js RAM buffers with dual-channel STK push reconciliation.',
    measurableOutcomes: [
      'Sub-120ms certificate generation latency',
      'Zero persistent PDF storage on disk',
      'Multi-gateway payment support (Paystack & M-Pesa)',
      'Autonomous WhatsApp document delivery'
    ],
    isFeatured: true,
    isPublished: true,
    displayOrder: 1,
  },
  {
    id: 'proj-swiftboda',
    slug: 'swiftboda-ride',
    title: 'SwiftBoda: Real-Time Boda Boda Fleet Dispatch & Mobility Platform',
    summary: 'Full-stack motorcycle ride-hailing ecosystem engineered for Kenyan urban transport with sub-second WebSocket telemetry, 4-digit safety PIN verification, and M-Pesa fee splitting.',
    description: 'SwiftBoda is a mission-critical mobility platform tailored for the two-wheeler transport economy in East Africa. Built with React Native / Expo, Node.js WebSocket gateway, and Serply Google Maps.',
    category: 'Mobility & Telemetry',
    client: 'Urban Mobility Operations',
    featuredImage: '/blog/tax-image-2.jpg',
    liveUrl: null,
    githubUrl: null,
    technologies: ['Urban Mobility', 'Fleet Telemetry', 'Driver Instant Payouts', 'Safety PIN Security'],
    problemStatement: 'Urban motorcycle transport suffers from passenger misidentification, driver cash handling friction, and dropped dispatch requests in congested cell corridors.',
    solutionArchitecture: 'Unified triple-persona mobile binary, binary WebSocket telemetry broadcasts, cryptographic 4-digit PIN handshakes, and automated 85%/15% M-Pesa fare splits.',
    measurableOutcomes: [
      'Sub-500ms location broadcast latency',
      'Zero dropped dispatches during cellular reconnects',
      'Automated M-Pesa B2C driver payouts'
    ],
    isFeatured: true,
    isPublished: true,
    displayOrder: 2,
  },
  {
    id: 'proj-autochop',
    slug: 'AutoChop',
    title: 'AutoChop AI: Automated Video Post-Production & Whisper Studio',
    summary: 'Automated video post-production studio executing dead-air stripping, faster-whisper speech recognition, styled social subtitles, and multi-provider LLM YouTube chapters.',
    description: 'AutoChop transforms raw speech and video recordings into publication-ready social videos using CTranslate2 INT8 speech recognition, non-destructive FFmpeg filtergraphs, and Gradio blocks.',
    category: 'AI & Media Engineering',
    client: 'Media & Production Studios',
    featuredImage: 'https://raw.githubusercontent.com/Akubrecah/AutoChop/main/assets/thumbnail.jpg',
    liveUrl: null,
    githubUrl: null,
    technologies: ['Video AI Processing', 'Sub-second Speech Engine', 'Automated Subtitling', 'Social Studio'],
    problemStatement: 'Manual video scrubbing, awkward pause removal, and word-level caption alignment consumes hours per video episode.',
    solutionArchitecture: 'Local-first INT8 quantized speech recognition paired with audio VAD thresholds and 50ms audio crossfade splices.',
    measurableOutcomes: [
      '5x faster transcription with CTranslate2',
      'Turnaround under 2 minutes for 10-minute video',
      'Frame-accurate lip sync preservation'
    ],
    isFeatured: true,
    isPublished: true,
    displayOrder: 3,
  },
  {
    id: 'proj-devcave',
    slug: 'Akubrecah-Dev-Cave',
    title: 'Akubrecah Dev Cave: KRA Tax Tools & 88+ In-Browser PDF Suite',
    summary: 'Unified compliance suite combining instant KRA PIN verification with 88+ browser-based, zero-leak WebAssembly PDF manipulation tools.',
    description: 'A comprehensive document mastery and compliance suite. Processes PDF conversions, split, merge, and Tesseract OCR locally in the browser with zero cloud exfiltration.',
    category: 'Document Intelligence & WASM',
    client: 'Taxpayers & Legal Professionals',
    featuredImage: '/akubrecah-logo.png',
    liveUrl: 'https://akubrecah.com',
    githubUrl: null,
    technologies: ['Document Intelligence', 'Client-Side In-Memory Processing', 'Zero-Cloud Privacy', 'Bank-Grade Compression'],
    problemStatement: 'Uploading sensitive contracts and tax documents to third-party PDF cloud converters introduces severe data privacy risks.',
    solutionArchitecture: 'Local-first WebAssembly document processing ensuring sensitive documents never leave client device memory.',
    measurableOutcomes: [
      '88+ client-side PDF utilities',
      'Zero server upload required for document edits',
      'Bank-grade compression & linearize'
    ],
    isFeatured: true,
    isPublished: true,
    displayOrder: 4,
  }
];

function sanitizeProjectForPublic(project: any) {
  if (!project) return project;
  return {
    ...project,
    githubUrl: null, // Never expose direct GitHub source code links to public website
    liveUrl: cleanPublicLiveUrl(project.slug, project.liveUrl),
    technologies: filterPublicTechnologies(project.technologies),
  };
}

export async function getPublishedProjects() {
  try {
    const list = await prisma.project.findMany({
      where: { isPublished: true },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
    if (Array.isArray(list) && list.length > 0) {
      return list.map(sanitizeProjectForPublic);
    }
  } catch (error) {
    log.warn('[getPublishedProjects DB Notice - Using Flagship Fallback]:', (error as any)?.message);
  }
  return FALLBACK_FLAGSHIP_PROJECTS.map(sanitizeProjectForPublic);
}

export async function getProjectBySlug(slug: string) {
  try {
    const project = await prisma.project.findUnique({
      where: { slug },
    });
    if (project) return sanitizeProjectForPublic(project);
  } catch (error) {
    log.warn(`[getProjectBySlug DB Notice for ${slug} - Checking Flagship Fallback]`);
  }
  const fallback = FALLBACK_FLAGSHIP_PROJECTS.find((p) => p.slug.toLowerCase() === slug.toLowerCase());
  return fallback ? sanitizeProjectForPublic(fallback) : null;
}

export async function getPublishedArticles() {
  const fallbackList = getFallbackArticles();
  try {
    const list = await prisma.article.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: 'desc' },
    });
    if (Array.isArray(list) && list.length > 0) {
      const dbSlugs = new Set(list.map((a) => a.slug.toLowerCase()));
      // Enrich database articles with fallback cover images if missing
      const enrichedDb = list.map((a) => {
        const matchingFallback = fallbackList.find((f) => f.slug.toLowerCase() === a.slug.toLowerCase());
        return {
          ...a,
          featuredImage: a.featuredImage || matchingFallback?.featuredImage || null,
        };
      });

      const merged = [...enrichedDb];
      for (const fb of fallbackList) {
        if (!dbSlugs.has(fb.slug.toLowerCase())) {
          merged.push(fb);
        }
      }
      return merged;
    }
  } catch (error) {
    log.warn('[getPublishedArticles DB Notice - Using Fallback]:', (error as any)?.message);
  }
  return fallbackList;
}

export async function getArticleBySlug(slug: string) {
  const fallbackList = getFallbackArticles();
  const matchingFallback = fallbackList.find((a: any) => a.slug.toLowerCase() === slug.toLowerCase()) || null;
  try {
    const article = await prisma.article.findUnique({
      where: { slug },
    });
    if (article) {
      return {
        ...article,
        featuredImage: article.featuredImage || matchingFallback?.featuredImage || null,
      };
    }
  } catch (error) {
    log.warn(`[getArticleBySlug DB Notice for ${slug} - Using Fallback]`);
  }
  return matchingFallback;
}



export async function getSkillsByCategory() {
  try {
    return await prisma.skillCategory.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        skills: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
  } catch (error) {
    log.error('[getSkillsByCategory Error]:', error);
    return [];
  }
}

export async function getWorkExperiences() {
  try {
    return await prisma.workExperience.findMany({
      orderBy: { displayOrder: 'asc' },
    });
  } catch (error) {
    log.error('[getWorkExperiences Error]:', error);
    return [];
  }
}

export async function getServiceOfferings() {
  try {
    return await prisma.serviceOffering.findMany({
      where: { isFeatured: true },
      orderBy: { displayOrder: 'asc' },
    });
  } catch (error) {
    log.error('[getServiceOfferings Error]:', error);
    return [];
  }
}

export async function getSiteSettings(): Promise<Record<string, any>> {
  try {
    const records = await prisma.siteSetting.findMany();
    const map: Record<string, any> = {};
    for (const r of records) {
      map[r.key] = r.value;
    }
    return map;
  } catch (error) {
    log.error('[getSiteSettings Error]:', error);
    return {};
  }
}
