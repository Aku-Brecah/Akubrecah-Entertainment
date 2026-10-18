import { Inter, Alfa_Slab_One, Satisfy, Plus_Jakarta_Sans } from 'next/font/google'
import { headers } from 'next/headers'
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from 'next-themes'
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'

import { TooltipProviderWrapper } from '@/components/providers/tooltip-provider'
import { AdminLayoutWrapper } from "@/components/admin-layout-wrapper"
import { getDomainTheme } from '@/lib/utils'
import KRAAnnouncementBanner from '@/components/KRAAnnouncementBanner'
import { Analytics } from "@vercel/analytics/next"
import Script from 'next/script'

import "./globals.css"

import { Metadata } from 'next';
import { SiteSchema } from '@/components/seo/site-schema';

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-plus-jakarta" })
const alfa = Alfa_Slab_One({ weight: "400", subsets: ["latin"], variable: "--font-alfa" })
const satisfy = Satisfy({ weight: "400", subsets: ["latin"], variable: "--font-satisfy" })

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://akubrecah.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Akubrecah Technologies | Premier Software Engineering & GovTech Solutions',
    template: '%s | Akubrecah Technologies',
  },
  description:
    'Bespoke full-stack web platforms, iOS & Android mobile ecosystems, cloud infrastructure, and enterprise automation systems. Home of the Akubrecah KRA Compliance & Statutory Document Suite.',
  keywords: [
    'Software Engineering Kenya',
    'Next.js Development Company Nairobi',
    'KRA Compliance Portal',
    'KRA PIN Certificate Retrieval',
    'Tax Compliance Certificate Kenya',
    'Nil Returns Filing Automation',
    'Enterprise Mobile Applications Kenya',
    'Fintech Daraja M-Pesa API Architecture',
    'GovTech Automation East Africa',
  ],
  authors: [{ name: 'Akubrecah Technologies', url: siteUrl }],
  creator: 'Akubrecah Technologies',
  publisher: 'Akubrecah Technologies',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
      { url: '/logo-circle.png', sizes: '288x288', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico'],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: siteUrl,
    siteName: 'Akubrecah Technologies',
    title: 'Akubrecah Technologies | Premier Software Engineering & GovTech Solutions',
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
      'Premier software engineering company in Nairobi, Kenya. Full-stack web, mobile, cloud infrastructure, and automated statutory gateways.',
    images: ['/og-image.jpg'],
    creator: '@akubrecah',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || 'google41e64c96aba6d4b0',
    yandex: process.env.YANDEX_VERIFICATION || undefined,
    other: {
      'msvalidate.01': process.env.BING_SITE_VERIFICATION || '',
    },
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const hostname = headersList.get('x-forwarded-host') || headersList.get('host') || ''
  const theme = getDomainTheme(hostname)

  const isVercel = Boolean(
    process.env.VERCEL || 
    process.env.NEXT_PUBLIC_VERCEL_ENV || 
    hostname.includes('vercel.app')
  );

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <SiteSchema />
        {/* Preconnect to Clerk edge to accelerate auth components */}
        <link rel="preconnect" href="https://clerk.akubrecah.com" />
        <link rel="dns-prefetch" href="https://clerk.akubrecah.com" />
        {/* Lazy load third-party Google Publisher SDK to eliminate critical-path render blocking */}
        <Script 
          src="https://news.google.com/swg/js/v1/publisher.js" 
          strategy="lazyOnload" 
        />
      </head>
      <body className={`${inter.variable} ${plusJakarta.variable} ${alfa.variable} ${satisfy.variable} font-sans`} data-theme={theme} suppressHydrationWarning={true}>
        <ClerkProvider 
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          taskUrls={{
            'setup-mfa': '/session-tasks/setup-mfa',
            'reset-password': '/session-tasks/reset-password',
          }}
        >
          {/* SiteHeader is managed within AdminLayoutWrapper */}
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
          >
            <TooltipProviderWrapper>
              <div className="relative flex min-h-screen w-full min-w-0 flex-col overflow-hidden bg-background">                
                <KRAAnnouncementBanner />
                <AdminLayoutWrapper hostname={hostname}>
                  {children}
                </AdminLayoutWrapper>
              </div>
            </TooltipProviderWrapper>
            <Toaster
              toastOptions={{
                className: 'react-hot-toast',
                style: {
                  maxWidth: '500px',
                  fontFamily: 'var(--font-sans)',
                },
                success: {
                  duration: 4000,
                  iconTheme: {
                    primary: '#10B981',
                    secondary: '#FFFFFF',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#EF4444',
                    secondary: '#FFFFFF',
                  },
                },
              }}
            />
            {isVercel && <Analytics />}
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
