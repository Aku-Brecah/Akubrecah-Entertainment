import type { Metadata } from 'next';
import { BreadcrumbSchema, SoftwareSchema } from '@/components/seo/site-schema';

export const metadata: Metadata = {
  title: 'Instant KRA PIN Certificate Retrieval & Returns Filing Portal',
  description:
    'Retrieve your official Kenya Revenue Authority (KRA) PIN certificate instantly or file nil income tax returns online. Fast, automated, bank-grade secure delivery across Kenya.',
  alternates: {
    canonical: '/retrieval-portal',
  },
  openGraph: {
    title: 'Instant KRA PIN Certificate Retrieval & Returns Filing Portal | Akubrecah Technologies',
    description:
      'Official Kenya Revenue Authority (KRA) certificate retrieval and automated returns filing. Instant delivery via WhatsApp & Email.',
    url: 'https://akubrecah.com/retrieval-portal',
  },
};

export default function RetrievalPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SoftwareSchema
        name="Akubrecah Statutory Certificate Retrieval & Filing Portal"
        description="Instant Kenya Revenue Authority (KRA) PIN certificate retrieval and nil income tax return filing portal."
        applicationCategory="BusinessApplication"
        url="https://akubrecah.com/retrieval-portal"
        offers={{
          price: "100",
          priceCurrency: "KES",
        }}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://akubrecah.com' },
          { name: 'Retrieval Portal', url: 'https://akubrecah.com/retrieval-portal' },
        ]}
      />
      {children}
    </>
  );
}
