import type { Metadata } from 'next';
import { BreadcrumbSchema, SoftwareSchema, FaqSchema } from '@/components/seo/site-schema';

export const metadata: Metadata = {
  title: 'Instant KRA PIN Certificate Retrieval & Returns Filing Portal',
  description:
    'Retrieve your official Kenya Revenue Authority (KRA) PIN certificate instantly using your National ID or file nil income tax returns online. Fast 2.4s lookup, bank-grade 256-bit TLS security, and authentic QR-seal delivery across Kenya.',
  keywords: [
    'KRA PIN Retrieval Kenya',
    'Retrieve KRA PIN by ID',
    'Lost KRA PIN Certificate',
    'KRA PIN Checker Kenya',
    'KRA Nil Returns Filing Online',
    'Download KRA Certificate PDF',
    'Get KRA PIN Without Password',
    'Akubrecah KRA Portal',
    'Cyber Cafe Tax Portal Kenya',
  ],
  alternates: {
    canonical: 'https://akubrecah.com/retrieval-portal',
  },
  openGraph: {
    title: 'Instant KRA PIN Certificate Retrieval & Returns Filing Portal | Akubrecah Technologies',
    description:
      'Official Kenya Revenue Authority (KRA) certificate retrieval and automated returns filing. Instant delivery via WhatsApp & Email in 2.4 seconds.',
    url: 'https://akubrecah.com/retrieval-portal',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Akubrecah KRA PIN Retrieval & Filing Portal',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Instant KRA PIN Certificate Retrieval & Returns Filing | Akubrecah',
    description: 'Instant Kenya Revenue Authority (KRA) certificate retrieval by National ID and automated nil returns filing.',
    images: ['/og-image.jpg'],
  },
};

const retrievalFaqs = [
  {
    question: 'How can I retrieve my KRA PIN certificate using only my Kenyan National ID number?',
    answer:
      'Enter your 7 or 8-digit Kenyan National ID number into the Akubrecah retrieval search bar. Our automated system queries the statutory registry to locate your taxpayer profile and immediately renders your official KRA PIN certificate PDF with a verifiable QR seal.',
  },
  {
    question: 'Can I retrieve my KRA PIN if I forgot my iTax password and registered email?',
    answer:
      'Yes. Akubrecah uses reverse National ID identity verification, which does not require access to your old iTax password, security question answer, or dormant email account.',
  },
  {
    question: 'What is the fee to retrieve and download the official KRA PIN certificate?',
    answer:
      'Taxpayer ID verification and preview lookups are free. Downloading your high-resolution official PDF certificate with instant delivery to WhatsApp and Email is only KES 20. Cyber cafes and high-volume agents can also access unlimited retrievals via our KES 500/month pass.',
  },
  {
    question: 'How long does it take to receive my KRA PIN certificate?',
    answer:
      'The automated verification and document rendering takes an average of 2.4 seconds. Your certificate is displayed on screen and sent to your phone via WhatsApp and Email immediately after M-Pesa confirmation.',
  },
  {
    question: 'What does it mean if the portal returns "No Record Found" for my National ID?',
    answer:
      'A "No Record Found" response indicates that no taxpayer profile is currently associated with that National ID number in the official registry. In this case, you will need to complete initial taxpayer registration on the official KRA iTax platform or visit your nearest Huduma Centre.',
  },
  {
    question: 'How do I file KRA Nil Returns online through the Akubrecah portal?',
    answer:
      'Switch the top toggle to "Returns Filing", enter your KRA PIN and National ID, and select the filing year. The system prepares and files your statutory nil return and delivers your official KRA electronic acknowledgment receipt within seconds.',
  },
  {
    question: 'Is Akubrecah Technologies affiliated with the Kenya Revenue Authority (KRA)?',
    answer:
      'No. Akubrecah Technologies is an independent third-party software engineering company and cyber assistance provider. We are not KRA, but provide automated citizen facilitation and document retrieval tools compliant with Kenyan law.',
  },
  {
    question: 'How does Akubrecah comply with the Kenya Data Protection Act 2019 (KDPA)?',
    answer:
      'All data transmissions are encrypted using 256-bit TLS bank-grade security. We enforce strict data minimization: we do not store, log, or resell your personal tax identification numbers or ID credentials.',
  },
];

export default function RetrievalPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SoftwareSchema
        name="Akubrecah Statutory Certificate Retrieval & Filing Portal"
        description="Instant Kenya Revenue Authority (KRA) PIN certificate retrieval and nil income tax return filing portal."
        applicationCategory="BusinessApplication"
        url="https://akubrecah.com/retrieval-portal"
        offers={{
          price: "20",
          priceCurrency: "KES",
        }}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://akubrecah.com' },
          { name: 'KRA Retrieval Portal', url: 'https://akubrecah.com/retrieval-portal' },
        ]}
      />
      <FaqSchema items={retrievalFaqs} />
      {children}
    </>
  );
}
