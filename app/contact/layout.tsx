import type { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/seo/site-schema';

export const metadata: Metadata = {
  title: 'Contact Engineering & Enterprise Consulting',
  description:
    'Initiate a technical consultation with senior software architects at Akubrecah Technologies in Nairobi, Kenya. Discuss custom SaaS, GovTech, FinTech, and cloud systems.',
  alternates: {
    canonical: 'https://akubrecah.com/contact',
  },
  openGraph: {
    title: 'Contact Akubrecah Technologies | Engineering Consultation',
    description:
      'Direct access to senior software architects. Non-disclosure by default. Nairobi, Kenya.',
    url: 'https://akubrecah.com/contact',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Contact Akubrecah Technologies',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Akubrecah Technologies | Engineering Consultation',
    description: 'Direct access to senior software architects. Nairobi, Kenya.',
    images: ['/og-image.jpg'],
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://akubrecah.com' },
          { name: 'Contact', url: 'https://akubrecah.com/contact' },
        ]}
      />
      {children}
    </>
  );
}
