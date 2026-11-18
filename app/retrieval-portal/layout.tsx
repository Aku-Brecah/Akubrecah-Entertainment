import type { Metadata } from 'next';
import { BreadcrumbSchema, SoftwareSchema, FaqSchema } from '@/components/seo/site-schema';

export const metadata: Metadata = {
  title: 'KRA PIN Certificate Retrieval & Tax Calculator Portal',
  description:
    'Independent Kenyan cyber facilitation portal for KRA PIN verification, ephemeral PDF certificate downloads via M-Pesa (KES 20), and P9 income tax estimation. Not affiliated with KRA.',
  keywords: [
    'KRA PIN Retrieval Kenya',
    'Retrieve KRA PIN by ID',
    'Lost KRA PIN Certificate',
    'KRA PIN Checker Kenya',
    'Kenya P9 Tax Calculator',
    'Download KRA Certificate PDF',
    'Get KRA PIN Without Password',
    'Akubrecah KRA Portal',
    'Cyber Cafe Tax Portal Kenya',
  ],
  alternates: {
    canonical: 'https://akubrecah.com/retrieval-portal',
  },
  openGraph: {
    title: 'KRA PIN Certificate Retrieval Portal | Akubrecah Entertainment',
    description:
      'Independent KRA PIN verification and ephemeral PDF certificate downloads via Safaricom M-Pesa (KES 20). Zero server document storage.',
    url: 'https://akubrecah.com/retrieval-portal',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Akubrecah KRA PIN Retrieval Portal',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KRA PIN Certificate Retrieval Portal | Akubrecah Entertainment',
    description: 'Independent KRA PIN verification and ephemeral PDF certificate downloads via M-Pesa.',
    images: ['/og-image.jpg'],
  },
};

const retrievalFaqs = [
  {
    question: 'How can I retrieve my KRA PIN certificate using only my Kenyan National ID number?',
    answer:
      'Enter your Kenyan National ID number into the Akubrecah retrieval search bar. Our facilitation gateway queries the public taxpayer registry to verify your profile and renders a PDF certificate directly in your browser.',
  },
  {
    question: 'Can I retrieve my KRA PIN if I forgot my iTax password and registered email?',
    answer:
      'Yes. Akubrecah uses National ID lookup, which does not require your iTax password or access to a dormant email address.',
  },
  {
    question: 'What is the fee to retrieve and download the KRA PIN certificate?',
    answer:
      'Taxpayer ID lookup and masked preview are free. Downloading your high-resolution PDF certificate is KES 20 via Safaricom M-Pesa. Cyber cafes and high-volume operators can also use the KES 500/month Cyber Cafe pass.',
  },
  {
    question: 'How is my KRA PIN certificate delivered?',
    answer:
      'Immediately after Safaricom confirms your M-Pesa payment, the PDF certificate is streamed in memory directly to your browser for instant download. Orders started via our WhatsApp bot are delivered inside WhatsApp.',
  },
  {
    question: 'What does it mean if the portal returns "No Record Found" for my National ID?',
    answer:
      'A "No Record Found" response indicates that no taxpayer profile is currently associated with that National ID number in the public registry. Complete initial registration on the official KRA iTax platform (itax.kra.go.ke) or visit a Huduma Centre.',
  },
  {
    question: 'Can I file KRA Nil Returns directly on this portal?',
    answer:
      'No. Nil returns and annual income tax returns must be filed directly on the official KRA iTax portal (itax.kra.go.ke). Our portal provides a free Kenya P9 tax calculator and filing preparation guide.',
  },
  {
    question: 'Is Akubrecah Entertainment affiliated with the Kenya Revenue Authority (KRA)?',
    answer:
      'No. Akubrecah Entertainment is an independent private software engineering firm and cyber assistance provider. We are not affiliated with the Kenya Revenue Authority (KRA).',
  },
  {
    question: 'How does Akubrecah handle my personal tax data?',
    answer:
      'All data transmissions use HTTPS encryption and certificates are streamed from memory without saving PDF files to server storage.',
  },
];

export default function RetrievalPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SoftwareSchema
        name="Akubrecah KRA PIN Certificate Retrieval Portal"
        description="Independent Kenyan cyber facilitation portal for KRA PIN verification and ephemeral PDF certificate downloads."
        applicationCategory="BusinessApplication"
        url="https://kra.akubrecah.com/"
        offers={{
          price: "20",
          priceCurrency: "KES",
        }}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://akubrecah.com' },
          { name: 'KRA Retrieval Portal', url: 'https://kra.akubrecah.com/' },
        ]}
      />
      <FaqSchema items={retrievalFaqs} />
      {children}
    </>
  );
}
