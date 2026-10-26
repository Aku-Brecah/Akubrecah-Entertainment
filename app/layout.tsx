import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/components/theme-provider'
import { ClerkProvider } from '@clerk/nextjs'

import { TooltipProviderWrapper } from '@/components/providers/tooltip-provider'
import { AdminLayoutWrapper } from "@/components/admin-layout-wrapper"
import KRAAnnouncementBanner from '@/components/KRAAnnouncementBanner'
import { Analytics } from "@vercel/analytics/next"

import "./globals.css"

import { Metadata } from 'next';
import { SiteSchema } from '@/components/seo/site-schema';

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isVercel = Boolean(
    process.env.VERCEL || 
    process.env.NEXT_PUBLIC_VERCEL_ENV
  );

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <SiteSchema />
        {/* External Resources & Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://clerk.akubrecah.com" />
        <link rel="dns-prefetch" href="https://clerk.akubrecah.com" />
      </head>
      <body className="font-sans" data-theme="default" suppressHydrationWarning={true}>
        <ClerkProvider 
          publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          taskUrls={{
            'setup-mfa': '/session-tasks/setup-mfa',
            'reset-password': '/session-tasks/reset-password',
          }}
          appearance={{
            layout: {
              unsafe_disableDevelopmentModeWarnings: true,
            },
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
                <AdminLayoutWrapper>
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
