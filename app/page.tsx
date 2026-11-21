import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  FileCheck2,
  Lock,
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

  const scenarioCards = [
    {
      timestamp: '08:30 am · Morning check-in',
      text: 'Verify your KRA PIN by National ID in one quiet tap.',
      href: '/retrieval-portal',
    },
    {
      timestamp: '10:15 am · Instant M-Pesa STK',
      text: 'Settle KES 20 on your phone with zero popup redirects.',
      href: '/retrieval-portal',
    },
    {
      timestamp: '01:00 pm · Zero-storage privacy',
      text: 'Stream your official PDF directly from volatile RAM.',
      href: '/legal/privacy',
    },
    {
      timestamp: '03:20 pm · Architecture sandbox',
      text: 'Estimate your web, mobile, or Daraja API scope calmly.',
      href: '/estimator',
    },
    {
      timestamp: '05:45 pm · Cyber cafe pass',
      text: 'Run 50 daily lookups on a single monthly workspace pass.',
      href: '/dashboard',
    },
    {
      timestamp: '08:00 pm · Evening peace of mind',
      text: 'Check PIN obligations and tax station records anytime.',
      href: '/pin-checker',
    },
  ];

  const diaryTestimonials = [
    {
      date: 'Tuesday · Nairobi Studio Desk',
      note: 'Retrieving my lost KRA PIN certificate used to mean twenty minutes of confusing forms and forgotten passwords. Here it felt like stepping into a quiet room—one ID lookup, a quick M-Pesa prompt on my phone, and my PDF downloaded immediately.',
      author: 'Wanjiku M., Creative Director',
      rotation: '-rotate-1',
    },
    {
      date: 'Thursday · Westlands Cyber Lounge',
      note: 'Our team runs dozens of statutory verifications every morning. The zero-storage RAM streaming and instant Daraja reconciliation took all the friction out of our daily workflow.',
      author: 'Brian O., Operations Lead',
      rotation: 'rotate-1',
    },
    {
      date: 'Saturday · Product Engineering Sprint',
      note: 'Working with Akubrecah on our Next.js platform and Safaricom C2B payment rails felt intentional from day one. No bloated templates—just thoughtful architecture that holds up under load.',
      author: 'Amina K., Fintech Founder',
      rotation: 'rotate-1',
    },
    {
      date: 'Monday · Tax Season Morning',
      note: 'I used the scope estimator to plan our mobile app integration and retrieved my compliance certificate in the same visit. Everything feels unhurried, clear, and genuinely well-crafted.',
      author: 'David N., Principal Architect',
      rotation: '-rotate-1',
    },
  ];

  const faqItems = [
    {
      question: 'How does the instant KRA PIN certificate retrieval work?',
      answer:
        'Enter your Kenyan National ID number or KRA PIN in our retrieval portal and complete the arithmetic verification challenge. Once verified via Safaricom Daraja M-Pesa Express (KES 20 single retrieval or Cyber Cafe monthly pass), your authentic KRA PIN Certificate PDF is compiled in volatile memory and streamed directly to your device.',
    },
    {
      question: 'Do you store my KRA certificate or personal taxpayer records on your servers?',
      answer:
        'No. In alignment with the Kenya Data Protection Act, 2019 (KDPA), we operate a strict zero-server PDF storage policy. Certificates are generated in-memory (RAM) and streamed directly to your browser or WhatsApp session without being saved to disk.',
    },
    {
      question: 'Can Akubrecah architect custom web, mobile, and M-Pesa software for our company?',
      answer:
        'Yes. Beyond our in-house GovTech compliance suite, Akubrecah is a full-cycle software engineering studio building server-rendered Next.js web platforms, native iOS and Android apps, cloud infrastructure, and automated Safaricom Daraja payment integrations.',
    },
    {
      question: 'Is Akubrecah affiliated with the Kenya Revenue Authority?',
      answer:
        'Akubrecah is an independent software engineering studio and third-party statutory convenience service. Taxpayers can also access government services directly and free of charge on the official KRA iTax portal at itax.kra.go.ke.',
    },
  ];

  return (
    <div className="relative w-full bg-[#FDFCF8] dark:bg-background text-[#292524] dark:text-on-surface font-sans overflow-hidden">
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
              <span>Nairobi digital living room · Software engineering &amp; GovTech clarity</span>
            </div>

            {/* 72px Outfit headline with handwritten Reenie Beanie cursive word inserted for emphasis */}
            <h1 className="text-[48px] sm:text-[64px] lg:text-[72px] font-medium text-[#292524] dark:text-on-surface tracking-[-0.025em] leading-[1.06]">
              Digital engineering and compliance made{" "}
              <span className="font-cursive text-[62px] sm:text-[82px] lg:text-[96px] font-normal text-[#292524] dark:text-[#FFB7B2] inline-block px-1 -rotate-2">
                effortless
              </span>{" "}
              for everyday life.
            </h1>

            {/* Sub-headline max-width 500px */}
            <p className="text-base sm:text-lg text-[#78716C] max-w-[500px] mx-auto leading-relaxed font-normal">
              A calm, tactile workspace for instant KRA PIN certificate retrieval, M-Pesa Express automation, and bespoke full-stack software built in Nairobi.
            </p>

            {/* Dual CTA buttons: primary pill in Coral #FFB7B2 with soft shadow, secondary pill in white with 1px stone-200 border */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2 w-full sm:w-auto">
              <Link
                href="/retrieval-portal"
                className="w-full sm:w-auto h-13 px-8 rounded-full bg-[#FFB7B2] text-[#292524] text-sm font-medium shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] hover:brightness-95 transition-all flex items-center justify-center gap-2"
              >
                <span>Open KRA retrieval space</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/estimator"
                className="w-full sm:w-auto h-13 px-8 rounded-full bg-white border border-stone-200 text-[#292524] text-sm font-medium shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] hover:bg-stone-50 transition-all flex items-center justify-center gap-2"
              >
                <span>Explore scope estimator</span>
              </Link>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-5 text-xs text-[#78716C]">
              <Link href="/services" className="hover:text-[#292524] transition-colors underline underline-offset-4">
                Engineering practices
              </Link>
              <span>·</span>
              <Link href="/pin-checker" className="hover:text-[#292524] transition-colors underline underline-offset-4">
                PIN obligation checker
              </Link>
              <span>·</span>
              <Link href="/projects" className="hover:text-[#292524] transition-colors underline underline-offset-4">
                Case studies ({allProjects.length || 3})
              </Link>
            </div>
          </div>
        </section>

        {/* ============================= 2. HORIZONTAL SCENARIO SCROLL ============================= */}
        <section className="space-y-6 reveal-on-scroll" aria-label="Daily digital moments">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 px-1">
            <div>
              <p className="font-cursive text-2xl sm:text-3xl text-[#78716C]">
                moments throughout your day
              </p>
              <h2 className="text-2xl sm:text-3xl font-medium text-[#292524] dark:text-on-surface tracking-[-0.025em]">
                Designed around how you actually work
              </h2>
            </div>
            <span className="text-xs text-[#78716C]">
              Scroll horizontally &rarr;
            </span>
          </div>

          {/* Horizontal Scenario Scroll: Each card 288px width, 160px height, white bg, rounded-3xl (24px), top-left 14px stone-400, bottom 20px stone-800 changing to pastel accent on hover */}
          <div className="flex items-stretch gap-5 overflow-x-auto pb-4 pt-1 px-1 scrollbar-none snap-x">
            {scenarioCards.map((card) => (
              <Link
                key={card.timestamp}
                href={card.href}
                className="w-[288px] h-[160px] shrink-0 bg-white rounded-3xl p-6 flex flex-col justify-between shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-stone-100 group snap-start transition-transform duration-500 hover:-translate-y-1"
              >
                <span className="text-[14px] text-stone-400 font-normal">
                  {card.timestamp}
                </span>
                <p className="text-[20px] leading-snug text-stone-800 font-normal group-hover:text-[#FFB7B2] transition-colors duration-300">
                  {card.text}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* ============================= 3. APP EXPERIENCE PREVIEW (3-MOCKUP STACKED LAYOUT) ============================= */}
        <section className="space-y-12 reveal-on-scroll">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <p className="font-cursive text-2xl sm:text-3xl text-[#78716C]">
              inside the workspace
            </p>
            <h2 className="text-3xl sm:text-5xl font-medium text-[#292524] dark:text-on-surface tracking-[-0.025em]">
              A calmer way to handle statutory &amp; engineering tasks
            </h2>
            <p className="text-sm sm:text-base text-[#78716C] leading-relaxed">
              Three connected layers working quietly together: live registry verification, zero-storage RAM certificate streaming, and instant Safaricom Daraja M-Pesa reconciliation.
            </p>
          </div>

          {/* Three-mockup stacked cascading layout */}
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-7 pb-12 lg:pb-28 pt-2">
            {/* Left Phone: 280x580px, 80% opacity, translated vertically +48px, Sage (#E8EFE8) screen background */}
            <div className="w-[280px] h-[580px] opacity-80 lg:translate-y-[48px] rounded-[3rem] bg-[#E8EFE8] border-[6px] border-white shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] p-6 flex flex-col justify-between transition-all duration-500 hover:opacity-100">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#78716C]">01 · Registry Sync</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#292524]" />
                </div>
                <div className="p-4 rounded-3xl bg-white/80 space-y-1.5">
                  <span className="text-[11px] text-[#78716C]">Lookup mode</span>
                  <p className="text-base font-medium text-[#292524]">National ID &amp; KRA PIN</p>
                  <p className="text-xs text-[#78716C]">Stateless HMAC arithmetic check</p>
                </div>
                <div className="p-4 rounded-3xl bg-white/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-[#292524]">
                    <Lock className="w-3.5 h-3.5 text-[#78716C]" />
                    <span>KDPA 2019 Privacy</span>
                  </div>
                  <p className="text-xs text-[#78716C] leading-relaxed">
                    Pre-payment profiles stay masked. Your PDF renders in volatile RAM with 0 bytes stored on disk.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-white/70 flex items-center justify-between text-xs">
                  <span className="text-[#78716C]">Retention</span>
                  <span className="font-medium text-[#292524]">0 bytes persisted</span>
                </div>
                <Link
                  href="/pin-checker"
                  className="w-full h-11 rounded-full bg-white text-[#292524] text-xs font-medium flex items-center justify-center gap-1.5 shadow-2xs hover:bg-stone-50 transition-colors"
                >
                  <span>Check PIN status</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Center Phone: 300x620px, fully opaque, with Coral (#FFB7B2) pulsing 'Breathe' / Retrieve button */}
            <div className="w-[300px] h-[620px] opacity-100 rounded-[3.25rem] bg-white border-[8px] border-[#FDFCF8] ring-1 ring-stone-200/80 shadow-[0_12px_36px_-4px_rgba(0,0,0,0.08)] p-7 flex flex-col justify-between relative z-10">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#FFB7B2]" />
                    <span className="text-xs font-medium text-[#292524]">Akubrecah Space</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#E8EFE8] text-[11px] font-medium text-[#292524]">
                    Live
                  </span>
                </div>

                <div className="text-center py-4 space-y-2">
                  <p className="font-cursive text-3xl text-[#78716C]">take a slow breath</p>
                  <h3 className="text-2xl font-medium text-[#292524] tracking-[-0.02em]">
                    KRA PIN Certificate Workspace
                  </h3>
                  <p className="text-xs text-[#78716C] leading-relaxed">
                    Verify your National ID, confirm on M-Pesa Express, and download your official PDF on the same screen.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3.5 rounded-2xl bg-[#FDFCF8] border border-stone-100 flex items-center justify-between text-xs">
                    <span className="text-[#78716C]">Taxpayer ID</span>
                    <span className="font-mono font-medium text-[#292524]">A01•••••••Z</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#FDFCF8] border border-stone-100 flex items-center justify-between text-xs">
                    <span className="text-[#78716C]">Single retrieval</span>
                    <span className="font-medium text-[#292524]">KES 20 · M-Pesa STK</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#FDFCF8] border border-stone-100 flex items-center justify-between text-xs">
                    <span className="text-[#78716C]">Delivery format</span>
                    <span className="font-medium text-[#292524]">Official PDF (RAM)</span>
                  </div>
                </div>
              </div>

              {/* Coral (#FFB7B2) pulsing 'Breathe' / action button */}
              <div className="space-y-3 pt-2">
                <Link
                  href="/retrieval-portal"
                  className="w-full h-14 rounded-full bg-[#FFB7B2] text-[#292524] font-medium text-sm shadow-[0_4px_20px_-2px_rgba(255,183,178,0.6)] animate-pulse hover:animate-none hover:brightness-95 transition-all flex items-center justify-center gap-2"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>Breathe · Retrieve PIN now</span>
                </Link>
                <p className="text-[11px] text-center text-[#78716C]">
                  Instant same-page download · Zero redirects
                </p>
              </div>
            </div>

            {/* Right Phone: 280x580px, 80% opacity, translated vertically +96px, Lavender (#EFEDF4) screen background */}
            <div className="w-[280px] h-[580px] opacity-80 lg:translate-y-[96px] rounded-[3rem] bg-[#EFEDF4] border-[6px] border-white shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] p-6 flex flex-col justify-between transition-all duration-500 hover:opacity-100">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#78716C]">03 · Engineering &amp; Rails</span>
                  <Smartphone className="w-4 h-4 text-[#292524]" />
                </div>
                <div className="p-4 rounded-3xl bg-white/80 space-y-1.5">
                  <span className="text-[11px] text-[#78716C]">Payment gateway</span>
                  <p className="text-base font-medium text-[#292524]">Daraja M-Pesa Express</p>
                  <p className="text-xs text-[#78716C]">Automated STK Push &amp; Till 9348469</p>
                </div>
                <div className="p-4 rounded-3xl bg-white/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-[#292524]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#78716C]" />
                    <span>Bespoke Software Studio</span>
                  </div>
                  <p className="text-xs text-[#78716C] leading-relaxed">
                    Full-stack Next.js platforms, iOS &amp; Android apps, and high-concurrency APIs.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-white/70 flex items-center justify-between text-xs">
                  <span className="text-[#78716C]">Cyber cafe pass</span>
                  <span className="font-medium text-[#292524]">KES 500 / month</span>
                </div>
                <Link
                  href="/services"
                  className="w-full h-11 rounded-full bg-white text-[#292524] text-xs font-medium flex items-center justify-center gap-1.5 shadow-2xs hover:bg-stone-50 transition-colors"
                >
                  <span>View engineering catalog</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ============================= 4. CURATED CASE STUDIES & FIELD NOTES ============================= */}
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

        {/* ============================= 5. DIARY ENTRY TESTIMONIALS ============================= */}
        <section className="space-y-10 reveal-on-scroll">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <p className="font-cursive text-2xl sm:text-3xl text-[#78716C]">
              notes left on the table
            </p>
            <h2 className="text-3xl sm:text-5xl font-medium text-[#292524] dark:text-on-surface tracking-[-0.025em]">
              Diary entries from our community
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

        {/* ============================= 6. INTERACTIVE FAQ ACCORDION ============================= */}
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

        {/* ============================= 7. WAITLIST & PROJECT CONVERSION ============================= */}
        <section className="reveal-on-scroll">
          <SoftlyWaitlistConversion />
        </section>

      </div>
    </div>
  );
}
