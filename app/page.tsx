import {
  ArrowRight,
  Calculator,
  Code2,
  ExternalLink,
  Layers,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublishedProjects, getPublishedArticles } from '@/lib/cms';
import { filterPublicTechnologies, cleanPublicLiveUrl } from '@/lib/tech-filter';
import { SoftlyFaqAccordion } from '@/components/interactive/softly-faq-accordion';
import { SoftlyWaitlistConversion } from '@/components/interactive/softly-waitlist-conversion';
import { ReviewSection } from '@/components/reviews/review-section';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Akubrecah Technologies | Software Engineering, GovTech & Digital Products',
  description:
    'Full-cycle software engineering, mission-critical statutory compliance portals, and high-throughput fintech infrastructure in Nairobi, Kenya. Web platforms, mobile apps, Daraja M-Pesa integrations, and cloud architectures.',
  keywords: [
    'Akubrecah Technologies',
    'Akubrecah Entertainment',
    'Software Engineering Kenya',
    'GovTech Automation East Africa',
    'KRA Compliance Portal',
    'KRA PIN Certificate Retrieval',
    'Statutory Compliance Data Grid',
    'Nil Returns Filing Automation',
    'Enterprise Mobile Applications Nairobi',
    'Fintech Daraja M-Pesa API Architecture',
    'Full-Stack Web Development Nairobi',
  ],
  alternates: {
    canonical: 'https://akubrecah.com',
  },
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: 'https://akubrecah.com',
    siteName: 'Akubrecah Technologies',
    title: 'Akubrecah Technologies | Software Engineering & Digital Systems',
    description:
      'Architecting resilient software systems, cloud automation, and statutory tax compliance portals. High-impact engineering made in Nairobi, Kenya.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Akubrecah Technologies - Engineering Excellence',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Akubrecah Technologies | Software Engineering & GovTech',
    description:
      'Full-cycle software engineering company in Nairobi, Kenya. Web, mobile, cloud infrastructure, GovTech gateways, and creative brand design.',
    images: ['/og-image.jpg'],
    creator: '@akubrecah',
  },
};

export default async function Home() {
  const [allProjects, allArticles] = await Promise.all([
    getPublishedProjects().catch(() => []),
    getPublishedArticles().catch(() => []),
  ]);
  const projects = allProjects.slice(0, 3);
  const articles = allArticles.slice(0, 2);

  const practiceCards = [
    {
      timestamp: '01 · Web Platform Engineering',
      text: 'Server-rendered Next.js apps, admin consoles, and typed PostgreSQL APIs.',
      href: '/services#web',
    },
    {
      timestamp: '02 · Mobile App Ecosystems',
      text: 'Native iOS, Android, and React Native apps built with offline-first sync.',
      href: '/services#mobile',
    },
    {
      timestamp: '03 · Cloud & DevOps Systems',
      text: 'Microservices, CI/CD pipelines, container orchestration, and resilient scaling.',
      href: '/services#cloud',
    },
    {
      timestamp: '04 · Enterprise & Payment Rails',
      text: 'Bespoke internal software, Safaricom Daraja STK Push, and C2B/B2C ledgers.',
      href: '/services#enterprise',
    },
    {
      timestamp: '05 · GovTech & Statutory Tools',
      text: 'Automated tax record verification and zero-storage RAM PDF delivery.',
      href: '/solutions#govtech',
    },
    {
      timestamp: '06 · Architecture & Scoping',
      text: 'Configure your stack, timeline, and budget in our interactive estimator.',
      href: '/estimator',
    },
  ];

  const deliveryLifecycle = [
    {
      step: '01',
      label: 'System architecture',
      desc: 'Data modeling, API contract definitions, threat modeling, and payment reconciliation workflows before a single line of code is written.',
    },
    {
      step: '02',
      label: 'Vertical slice implementation',
      desc: 'End-to-end delivery across database schema, server validation, and responsive client interfaces in testable, shippable increments.',
    },
    {
      step: '03',
      label: 'Security & compliance audit',
      desc: 'Rate-limit verification, OWASP input sanitization, HMAC webhook validation, and KDPA 2019 privacy checks across every endpoint.',
    },
    {
      step: '04',
      label: 'Production deployment',
      desc: 'Zero-downtime CI/CD releases, automated health telemetry, structured incident logging, and long-term engineering support.',
    },
  ];

  const diaryTestimonials = [
    {
      date: 'Tuesday · Product Engineering Sprint',
      note: 'Working with Akubrecah on our Next.js web platform and automated payment rails felt intentional from day one. No bloated templates—just thoughtful software architecture that holds up under production load.',
      author: 'Amina K., Fintech Founder',
      rotation: '-rotate-1',
    },
    {
      date: 'Thursday · Mobile Rollout',
      note: 'They architected our React Native field application with offline-first synchronization and clean API contracts. Our operations team went from spreadsheet chaos to real-time visibility in six weeks.',
      author: 'David N., Operations Director',
      rotation: 'rotate-1',
    },
    {
      date: 'Saturday · Cloud Migration',
      note: 'Their DevOps and security audit uncovered bottlenecks we had missed for months. Zero-downtime deployments and clear documentation made handoff to our internal engineers effortless.',
      author: 'Brian O., CTO & Principal Architect',
      rotation: 'rotate-1',
    },
    {
      date: 'Monday · GovTech Workspace',
      note: 'We first discovered Akubrecah through their zero-storage KRA retrieval platform and immediately saw the engineering quality. They now maintain our enterprise customer portal and billing integrations.',
      author: 'Wanjiku M., Managing Partner',
      rotation: '-rotate-1',
    },
  ];

  const faqItems = [
    {
      question: 'What types of software systems does Akubrecah Technologies build?',
      answer:
        'We are a full-cycle software engineering studio in Nairobi building server-rendered Next.js & TypeScript web platforms, native iOS/Android & React Native mobile applications, cloud/DevOps infrastructure, enterprise internal tools, Safaricom Daraja M-Pesa payment integrations, and automated GovTech compliance portals.',
    },
    {
      question: 'How do I estimate the cost and timeline for a custom software project?',
      answer:
        'You can configure your platform type, core modules, integrations, and delivery timeline in our Interactive Scope Estimator (/estimator) for an instant baseline range, or book a direct technical consultation through our Contact desk.',
    },
    {
      question: 'What does your engineering delivery process look like?',
      answer:
        'Every engagement follows four disciplined phases: System Architecture & data modeling, Vertical Slice Implementation with weekly working builds, OWASP & KDPA 2019 Security Auditing, and Zero-Downtime Production Deployment with observability.',
    },
    {
      question: 'Do you also operate the KRA PIN Certificate Retrieval Portal?',
      answer:
        'Yes. The KRA PIN Certificate Retrieval & Statutory Facilitation Portal is one of our in-house production GovTech products demonstrating our zero-storage RAM PDF streaming and Daraja M-Pesa Express architecture. Akubrecah is an independent software company and is not affiliated with KRA.',
    },
  ];

  return (
    <div className="relative w-full bg-[#FDFCF8] dark:bg-surface text-[#292524] dark:text-on-surface font-sans overflow-hidden">
      <div className="w-full max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col space-y-24 sm:space-y-32 pb-24 pt-10 sm:pt-16">

        {/* ============================= 1. HERO SECTION ============================= */}
        <section
          id="hero"
          className="relative flex flex-col items-center text-center pt-6 sm:pt-12 pb-6 reveal-on-scroll"
        >
          {/* Two large blurred background blobs (#FFE4E1 and #E6E6FA) at 60% opacity */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-12 left-1/2 -translate-x-[85%] w-[340px] sm:w-[480px] h-[340px] sm:h-[480px] rounded-full bg-[#FFE4E1] opacity-60 blur-[90px] animate-float-blob"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-8 left-1/2 -translate-x-[15%] w-[340px] sm:w-[480px] h-[340px] sm:h-[480px] rounded-full bg-[#E6E6FA] opacity-60 blur-[95px] animate-float-blob [animation-delay:3s]"
          />

          <div className="relative z-10 flex flex-col items-center space-y-7 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/80 border border-stone-200/80 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] text-xs font-medium text-[#78716C]">
              <span className="w-2 h-2 rounded-full bg-[#FFB7B2]" />
              <span>Nairobi, Kenya · Full-cycle software engineering &amp; digital systems</span>
            </div>

            {/* 72px Outfit headline with handwritten Reenie Beanie cursive word inserted for emphasis */}
            <h1 className="text-[46px] sm:text-[62px] lg:text-[72px] font-medium text-[#292524] dark:text-on-surface tracking-[-0.025em] leading-[1.06]">
              Software systems engineered with{" "}
              <span className="font-cursive text-[62px] sm:text-[82px] lg:text-[96px] font-normal text-[#292524] dark:text-[#FFB7B2] inline-block px-1 -rotate-2">
                precision
              </span>{" "}
              for production load.
            </h1>

            {/* Sub-headline max-width 560px */}
            <p className="text-base sm:text-lg text-[#78716C] max-w-[560px] mx-auto leading-relaxed font-normal">
              Akubrecah Technologies designs and ships web platforms, native iOS &amp; Android mobile apps, cloud infrastructure, payment integrations, and enterprise software across East Africa.
            </p>

            {/* Dual CTA buttons: primary pill in Coral #FFB7B2 with soft shadow, secondary pill in white with 1px stone-200 border */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2 w-full sm:w-auto">
              <Link
                href="/services"
                className="w-full sm:w-auto h-13 px-8 rounded-full bg-[#FFB7B2] text-[#292524] text-sm font-medium shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] hover:brightness-95 transition-all flex items-center justify-center gap-2"
              >
                <span>Explore engineering services</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/estimator"
                className="w-full sm:w-auto h-13 px-8 rounded-full bg-white border border-stone-200 text-[#292524] text-sm font-medium shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] hover:bg-stone-50 transition-all flex items-center justify-center gap-2"
              >
                <Calculator className="w-4 h-4 text-[#78716C]" />
                <span>Interactive scope estimator</span>
              </Link>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-5 text-xs text-[#78716C]">
              <Link href="/projects" className="hover:text-[#292524] transition-colors underline underline-offset-4">
                Case studies ({allProjects.length || 3})
              </Link>
              <span>·</span>
              <Link href="/solutions" className="hover:text-[#292524] transition-colors underline underline-offset-4">
                Industry solutions
              </Link>
              <span>·</span>
              <Link href="/retrieval-portal" className="hover:text-[#292524] transition-colors underline underline-offset-4">
                Flagship KRA portal
              </Link>
              <span>·</span>
              <Link href="/contact" className="hover:text-[#292524] transition-colors underline underline-offset-4">
                Start a project
              </Link>
            </div>
          </div>
        </section>

        {/* ============================= 2. HORIZONTAL ENGINEERING PRACTICES SCROLL ============================= */}
        <section className="space-y-6 reveal-on-scroll" aria-label="Core engineering practices">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 px-1">
            <div>
              <p className="font-cursive text-2xl sm:text-3xl text-[#78716C]">
                what we build every day
              </p>
              <h2 className="text-2xl sm:text-3xl font-medium text-[#292524] dark:text-on-surface tracking-[-0.025em]">
                Core engineering practices
              </h2>
            </div>
            <Link
              href="/services"
              className="text-xs font-medium text-[#78716C] hover:text-[#292524] transition-colors"
            >
              Full service catalog &rarr;
            </Link>
          </div>

          {/* Horizontal Scenario Scroll: Each card 288px width, 160px height, white bg, rounded-3xl (24px), top-left 14px stone-400, bottom 20px stone-800 changing to pastel accent on hover */}
          <div className="flex items-stretch gap-5 overflow-x-auto pb-4 pt-1 px-1 scrollbar-none snap-x">
            {practiceCards.map((card) => (
              <Link
                key={card.timestamp}
                href={card.href}
                className="w-[288px] h-[160px] shrink-0 bg-white rounded-3xl p-6 flex flex-col justify-between shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-stone-100 group snap-start transition-transform duration-500 hover:-translate-y-1"
              >
                <span className="text-[14px] text-stone-400 font-normal">
                  {card.timestamp}
                </span>
                <p className="text-[19px] leading-snug text-stone-800 font-normal group-hover:text-[#FFB7B2] transition-colors duration-300">
                  {card.text}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* ============================= 3. SOFTWARE ENGINEERING SHOWCASE (3-MOCKUP STACKED LAYOUT) ============================= */}
        <section className="space-y-12 reveal-on-scroll">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <p className="font-cursive text-2xl sm:text-3xl text-[#78716C]">
              engineered across every layer
            </p>
            <h2 className="text-3xl sm:text-5xl font-medium text-[#292524] dark:text-on-surface tracking-[-0.025em]">
              Full-stack web, mobile, and cloud systems built to last
            </h2>
            <p className="text-sm sm:text-base text-[#78716C] leading-relaxed">
              From consumer mobile apps and internal enterprise dashboards to high-throughput payment gateways and statutory portals—every layer is designed for reliability.
            </p>
          </div>

          {/* Three-mockup stacked cascading layout */}
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-7 pb-12 lg:pb-28 pt-2">
            {/* Left Phone: 280x580px, 80% opacity, translated vertically +48px, Sage (#E8EFE8) screen background */}
            <div className="w-[280px] h-[580px] opacity-80 lg:translate-y-[48px] rounded-[3rem] bg-[#E8EFE8] border-[6px] border-white shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] p-6 flex flex-col justify-between transition-all duration-500 hover:opacity-100">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#78716C]">01 · Web &amp; Cloud</span>
                  <Code2 className="w-4 h-4 text-[#292524]" />
                </div>
                <div className="p-4 rounded-3xl bg-white/80 space-y-1.5">
                  <span className="text-[11px] text-[#78716C]">Modern web stack</span>
                  <p className="text-base font-medium text-[#292524]">Next.js, TypeScript &amp; Postgres</p>
                  <p className="text-xs text-[#78716C]">Server-rendered apps &amp; typed REST/RPC APIs</p>
                </div>
                <div className="p-4 rounded-3xl bg-white/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-[#292524]">
                    <Layers className="w-3.5 h-3.5 text-[#78716C]" />
                    <span>Cloud &amp; CI/CD Pipelines</span>
                  </div>
                  <p className="text-xs text-[#78716C] leading-relaxed">
                    Containerized deployments, automated telemetry, and zero-downtime releases built for enterprise traffic.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-white/70 flex items-center justify-between text-xs">
                  <span className="text-[#78716C]">Architecture</span>
                  <span className="font-medium text-[#292524]">Strict TypeScript</span>
                </div>
                <Link
                  href="/services#web"
                  className="w-full h-11 rounded-full bg-white text-[#292524] text-xs font-medium flex items-center justify-center gap-1.5 shadow-2xs hover:bg-stone-50 transition-colors"
                >
                  <span>Web &amp; cloud services</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Center Phone: 300x620px, fully opaque, with Coral (#FFB7B2) primary action button */}
            <div className="w-[300px] h-[620px] opacity-100 rounded-[3.25rem] bg-white border-[8px] border-[#FDFCF8] ring-1 ring-stone-200/80 shadow-[0_12px_36px_-4px_rgba(0,0,0,0.08)] p-7 flex flex-col justify-between relative z-10">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#FFB7B2]" />
                    <span className="text-xs font-medium text-[#292524]">Akubrecah Studio</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#E8EFE8] text-[11px] font-medium text-[#292524]">
                    Nairobi
                  </span>
                </div>

                <div className="text-center py-4 space-y-2">
                  <p className="font-cursive text-3xl text-[#78716C]">from concept to production</p>
                  <h3 className="text-2xl font-medium text-[#292524] tracking-[-0.02em]">
                    Custom Software Delivery
                  </h3>
                  <p className="text-xs text-[#78716C] leading-relaxed">
                    Dedicated engineering squads building web portals, mobile ecosystems, and automated business workflows.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3.5 rounded-2xl bg-[#FDFCF8] border border-stone-100 flex items-center justify-between text-xs">
                    <span className="text-[#78716C]">Delivery scope</span>
                    <span className="font-medium text-[#292524]">Web · Mobile · APIs</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#FDFCF8] border border-stone-100 flex items-center justify-between text-xs">
                    <span className="text-[#78716C]">Security standard</span>
                    <span className="font-medium text-[#292524]">OWASP &amp; KDPA 2019</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#FDFCF8] border border-stone-100 flex items-center justify-between text-xs">
                    <span className="text-[#78716C]">Project scoping</span>
                    <span className="font-medium text-[#292524]">Live cost estimator</span>
                  </div>
                </div>
              </div>

              {/* Coral (#FFB7B2) pulsing action button */}
              <div className="space-y-3 pt-2">
                <Link
                  href="/contact"
                  className="w-full h-14 rounded-full bg-[#FFB7B2] text-[#292524] font-medium text-sm shadow-[0_4px_20px_-2px_rgba(255,183,178,0.6)] animate-pulse hover:animate-none hover:brightness-95 transition-all flex items-center justify-center gap-2"
                >
                  <span>Start a project with us</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="text-[11px] text-center text-[#78716C]">
                  Direct engineering consultation · Transparent milestones
                </p>
              </div>
            </div>

            {/* Right Phone: 280x580px, 80% opacity, translated vertically +96px, Lavender (#EFEDF4) screen background */}
            <div className="w-[280px] h-[580px] opacity-80 lg:translate-y-[96px] rounded-[3rem] bg-[#EFEDF4] border-[6px] border-white shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] p-6 flex flex-col justify-between transition-all duration-500 hover:opacity-100">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#78716C]">03 · Mobile &amp; Fintech</span>
                  <Smartphone className="w-4 h-4 text-[#292524]" />
                </div>
                <div className="p-4 rounded-3xl bg-white/80 space-y-1.5">
                  <span className="text-[11px] text-[#78716C]">Mobile ecosystems</span>
                  <p className="text-base font-medium text-[#292524]">iOS, Android &amp; React Native</p>
                  <p className="text-xs text-[#78716C]">Offline-first apps with push notifications</p>
                </div>
                <div className="p-4 rounded-3xl bg-white/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-[#292524]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#78716C]" />
                    <span>Payment &amp; API Integrations</span>
                  </div>
                  <p className="text-xs text-[#78716C] leading-relaxed">
                    Safaricom Daraja STK Push, C2B/B2C ledger reconciliation, WhatsApp automation, and custom webhooks.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-white/70 flex items-center justify-between text-xs">
                  <span className="text-[#78716C]">Platforms</span>
                  <span className="font-medium text-[#292524]">iOS · Android · Web</span>
                </div>
                <Link
                  href="/services#mobile"
                  className="w-full h-11 rounded-full bg-white text-[#292524] text-xs font-medium flex items-center justify-center gap-1.5 shadow-2xs hover:bg-stone-50 transition-colors"
                >
                  <span>Explore mobile &amp; APIs</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ============================= 4. DELIVERY LIFECYCLE (ENGINEERING METHODOLOGY) ============================= */}
        <section className="space-y-8 reveal-on-scroll">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="font-cursive text-2xl sm:text-3xl text-[#78716C]">
                how we architect &amp; ship
              </p>
              <h2 className="text-3xl sm:text-4xl font-medium text-[#292524] dark:text-on-surface tracking-[-0.025em]">
                Disciplined delivery lifecycle
              </h2>
            </div>
            <Link
              href="/about"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white border border-stone-200 text-xs font-medium text-[#292524] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] hover:bg-stone-50 transition-colors self-start md:self-auto"
            >
              <span>About our engineering standards</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {deliveryLifecycle.map((phase, idx) => {
              const cardTones = ['bg-white', 'bg-[#E8EFE8]/70', 'bg-[#EFEDF4]/70', 'bg-white'];
              return (
                <div
                  key={phase.step}
                  className={`p-6 rounded-[2rem] ${cardTones[idx % cardTones.length]} border border-stone-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] space-y-3`}
                >
                  <span className="font-cursive text-3xl text-[#78716C] block leading-none">
                    {phase.step}
                  </span>
                  <h3 className="text-lg font-medium text-[#292524] tracking-[-0.015em]">
                    {phase.label}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#78716C] leading-relaxed">
                    {phase.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ============================= 5. CURATED CASE STUDIES & FIELD NOTES ============================= */}
        <section id="featured-projects" className="space-y-8 reveal-on-scroll">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="font-cursive text-2xl sm:text-3xl text-[#78716C]">
                crafted with intention
              </p>
              <h2 className="text-3xl sm:text-4xl font-medium text-[#292524] dark:text-on-surface tracking-[-0.025em]">
                Production systems &amp; case studies
              </h2>
            </div>
            <Link
              href="/projects"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white border border-stone-200 text-xs font-medium text-[#292524] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] hover:bg-stone-50 transition-colors self-start md:self-auto"
            >
              <span>View all case studies</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {projects.length > 0 ? (
              projects.map((proj, idx) => {
                const bgTones = ['bg-white', 'bg-[#E8EFE8]/75', 'bg-[#EFEDF4]/75'];
                const tone = bgTones[idx % bgTones.length];
                return (
                  <article
                    key={proj.id}
                    className={`p-7 rounded-[2.25rem] ${tone} border border-stone-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] flex flex-col justify-between group transition-transform duration-500 hover:-translate-y-1`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="px-3 py-1 rounded-full bg-white/90 text-[#292524] font-medium">
                          {proj.category}
                        </span>
                        {cleanPublicLiveUrl(proj.slug, proj.liveUrl) && (
                          <a
                            href={cleanPublicLiveUrl(proj.slug, proj.liveUrl)!}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#78716C] hover:text-[#292524]"
                            aria-label={`Open live system for ${proj.title}`}
                          >
                            <span>Live</span>
                            <ExternalLink className="w-3 h-3" aria-hidden="true" />
                          </a>
                        )}
                      </div>

                      <div>
                        <h3 className="text-xl font-medium text-[#292524] tracking-[-0.02em]">
                          <Link href={`/projects/${proj.slug}`}>
                            {proj.title}
                          </Link>
                        </h3>
                        <p className="text-xs sm:text-sm text-[#78716C] mt-2 line-clamp-3 leading-relaxed">
                          {proj.summary}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {filterPublicTechnologies((proj as any).technologies || []).slice(0, 4).map((tech: string) => (
                          <span
                            key={tech}
                            className="text-[11px] text-[#78716C] bg-white/80 px-2.5 py-0.5 rounded-full border border-stone-200/60"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-5 mt-6 border-t border-stone-200/50 flex items-center justify-between">
                      <Link
                        href={`/projects/${proj.slug}`}
                        className="text-xs font-medium text-[#292524] flex items-center gap-1.5 group-hover:translate-x-0.5 transition-transform"
                      >
                        <span>Read case study</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </article>
                );
              })
            ) : null}
          </div>

          {articles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              {articles.map((art) => (
                <article
                  key={art.id}
                  className="p-7 rounded-[2rem] bg-white border border-stone-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] flex flex-col justify-between group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2.5 text-xs text-[#78716C]">
                      <span className="px-3 py-0.5 rounded-full bg-[#E8EFE8] text-[#292524] font-medium">
                        {art.category}
                      </span>
                      <span>·</span>
                      <span>{art.readingTimeMinutes} min read</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-medium text-[#292524] tracking-[-0.015em]">
                      <Link href={`/articles/${art.slug}`}>
                        {art.title}
                      </Link>
                    </h3>
                    <p className="text-xs sm:text-sm text-[#78716C] line-clamp-2 leading-relaxed">
                      {art.excerpt}
                    </p>
                  </div>
                  <div className="pt-4 mt-4 border-t border-stone-100">
                    <Link
                      href={`/articles/${art.slug}`}
                      className="text-xs font-medium text-[#292524] flex items-center gap-1.5"
                    >
                      <span>Read field note</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ============================= 6. IN-HOUSE FLAGSHIP GOVTECH PRODUCT SPOTLIGHT ============================= */}
        <section className="p-7 sm:p-10 rounded-[2.5rem] bg-white border border-stone-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] reveal-on-scroll">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E8EFE8] text-xs font-medium text-[#292524]">
                <span className="w-2 h-2 rounded-full bg-[#FFB7B2]" />
                <span>In-house production platform · GovTech</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-medium text-[#292524] tracking-[-0.025em]">
                KRA PIN Certificate Retrieval &amp; Statutory Facilitation Portal
              </h2>
              <p className="text-sm sm:text-base text-[#78716C] leading-relaxed">
                Alongside client software engineering, we build and operate our own independent compliance facilitation platform—verifying taxpayer records by National ID or KRA PIN, streaming PDF certificates directly from volatile RAM, and reconciling M-Pesa Express payments with zero disk retention.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/retrieval-portal"
                  className="h-11 px-6 rounded-full bg-[#FFB7B2] text-[#292524] text-xs font-medium shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] hover:brightness-95 transition-all inline-flex items-center gap-2"
                >
                  <span>Open retrieval portal</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/pin-checker"
                  className="h-11 px-5 rounded-full bg-white border border-stone-200 text-[#292524] text-xs font-medium hover:bg-stone-50 transition-colors inline-flex items-center"
                >
                  PIN obligation checker
                </Link>
                <Link
                  href="/projects/akubrecah-kra-certificate-portal"
                  className="text-xs font-medium text-[#78716C] hover:text-[#292524] inline-flex items-center gap-1 ml-1 underline underline-offset-4"
                >
                  <span>Architecture case study</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 bg-[#FDFCF8] border border-stone-100 rounded-[2rem] p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#FFB7B2]" />
                  <span className="text-xs font-medium text-[#292524]">System specification</span>
                </div>
                <span className="text-[11px] font-mono text-[#78716C]">KDPA 2019 aligned</span>
              </div>
              <dl className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                  <dt className="text-[#78716C]">Lookup parameters</dt>
                  <dd className="font-mono font-medium text-[#292524]">National ID / KRA PIN</dd>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                  <dt className="text-[#78716C]">Challenge verification</dt>
                  <dd className="font-mono font-medium text-[#292524]">Stateless HMAC SVG</dd>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                  <dt className="text-[#78716C]">Single retrieval tariff</dt>
                  <dd className="font-mono font-medium text-[#292524]">KES 20 (M-Pesa STK)</dd>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <dt className="text-[#78716C]">Document retention</dt>
                  <dd className="font-mono font-medium text-[#292524]">0 bytes persisted</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        {/* ============================= 7. DIARY ENTRY TESTIMONIALS ============================= */}
        <section className="space-y-10 reveal-on-scroll">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <p className="font-cursive text-2xl sm:text-3xl text-[#78716C]">
              notes from our partners
            </p>
            <h2 className="text-3xl sm:text-5xl font-medium text-[#292524] dark:text-on-surface tracking-[-0.025em]">
              Diary entries from teams we ship with
            </h2>
          </div>

          {/* Two-column grid for desktop, single for mobile. Slight rotation (+1 or -1 deg), White bg, 32px horizontal line + Reenie Beanie cursive text in 24px stone-500 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-1">
            {diaryTestimonials.map((entry) => (
              <div
                key={entry.author}
                className={`bg-white rounded-[2rem] p-8 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-stone-100 flex flex-col justify-between space-y-6 transition-transform duration-500 hover:rotate-0 ${entry.rotation}`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-stone-400">
                    <span>{entry.date}</span>
                    <span className="w-2 h-2 rounded-full bg-[#FFB7B2]" />
                  </div>
                  <p className="text-base sm:text-lg text-[#292524] leading-relaxed font-normal">
                    &ldquo;{entry.note}&rdquo;
                  </p>
                </div>

                {/* Signature style: 32px horizontal line followed by 'Reenie Beanie' cursive text in 24px stone-500 */}
                <div className="flex items-center gap-3 pt-2">
                  <span className="w-[32px] h-px bg-stone-400 inline-block shrink-0" />
                  <span className="font-cursive text-[24px] text-stone-500 leading-none">
                    {entry.author}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Live Google Business Profile Reviews Integration (when configured) */}
          <ReviewSection />
        </section>

        {/* ============================= 8. INTERACTIVE FAQ ACCORDION ============================= */}
        <section className="max-w-3xl mx-auto w-full space-y-8 reveal-on-scroll">
          <div className="text-center space-y-2">
            <p className="font-cursive text-2xl sm:text-3xl text-[#78716C]">
              unhurried answers
            </p>
            <h2 className="text-3xl sm:text-4xl font-medium text-[#292524] dark:text-on-surface tracking-[-0.025em]">
              Frequently asked questions
            </h2>
          </div>

          <SoftlyFaqAccordion items={faqItems} />
        </section>

        {/* ============================= 9. PROJECT CONSULTATION & WAITLIST CONVERSION ============================= */}
        <section className="reveal-on-scroll">
          <SoftlyWaitlistConversion />
        </section>

      </div>
    </div>
  );
}
