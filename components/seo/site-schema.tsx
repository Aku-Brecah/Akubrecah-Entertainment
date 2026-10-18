import React from 'react';

/**
 * Site-wide Schema.org JSON-LD Structured Data
 * Provides authoritative identity signals for Google Knowledge Graph,
 * Google AI Overviews, Bing, and conversational AI crawlers.
 */
export function SiteSchema(): JSX.Element {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'TechCompany',
    '@id': 'https://akubrecah.com/#organization',
    name: 'Akubrecah Technologies',
    legalName: 'Akubrecah Technologies Limited',
    alternateName: ['Akubrecah', 'Akubrecah KRA', 'Akubrecah Engineering'],
    url: 'https://akubrecah.com',
    logo: {
      '@type': 'ImageObject',
      url: 'https://akubrecah.com/logo.png',
      caption: 'Akubrecah Technologies',
    },
    image: 'https://akubrecah.com/og-image.jpg',
    description:
      'Premier software engineering company and GovTech innovation hub in Nairobi, Kenya. Architecting mission-critical web applications, cloud platforms, mobile ecosystems, and statutory tax compliance systems.',
    email: 'engineering@akubrecah.com',
    telephone: '+254791497858',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Nairobi',
      addressRegion: 'Nairobi County',
      addressCountry: 'KE',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: -1.286389,
      longitude: 36.817223,
    },
    sameAs: [
      'https://github.com/Akubrecah',
      'https://linkedin.com/company/akubrecah',
      'https://twitter.com/akubrecah',
      'https://mail.akubrecah.com',
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: '+254791497858',
        contactType: 'technical support',
        email: 'engineering@akubrecah.com',
        areaServed: ['KE', 'East Africa', 'Worldwide'],
        availableLanguage: ['English', 'Swahili'],
      },
    ],
    knowsAbout: [
      'Software Engineering',
      'Next.js & React App Router Architecture',
      'Kenya Revenue Authority Statutory Systems',
      'Tax Compliance Certificate Retrieval',
      'Fintech & M-Pesa Daraja API Integration',
      'Cloud Infrastructure & DevOps',
    ],
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://akubrecah.com/#website',
    url: 'https://akubrecah.com',
    name: 'Akubrecah Technologies',
    description: 'Premier Software Engineering & Kenya Statutory Compliance Gateway',
    publisher: {
      '@id': 'https://akubrecah.com/#organization',
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://akubrecah.com/articles?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
    inLanguage: 'en-US',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </>
  );
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

/**
 * BreadcrumbList Schema.org JSON-LD Component
 * Renders hierarchical navigation signals enabling Google Rich Snippets in SERPs.
 */
export function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }): JSX.Element {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * SoftwareApplication Schema.org JSON-LD Component
 * Signals to Google Search and AI assistants that this route is a functional web application.
 */
export function SoftwareSchema({
  name,
  description,
  applicationCategory,
  operatingSystem = 'All modern web browsers (Desktop, Tablet, Mobile)',
  url,
  offers,
}: {
  name: string;
  description: string;
  applicationCategory: string;
  operatingSystem?: string;
  url: string;
  offers?: {
    price: string;
    priceCurrency: string;
  };
}): JSX.Element {
  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name,
    description,
    applicationCategory,
    operatingSystem,
    browserRequirements: 'Requires JavaScript and HTML5 support',
    url,
    provider: {
      '@type': 'Organization',
      name: 'Akubrecah Technologies',
      url: 'https://akubrecah.com',
    },
  };

  if (offers) {
    schema.offers = {
      '@type': 'Offer',
      price: offers.price,
      priceCurrency: offers.priceCurrency,
      availability: 'https://schema.org/InStock',
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * Service Schema.org JSON-LD Component
 * Signals discrete business service capabilities to search engines.
 */
export function ServiceSchema({
  name,
  description,
  serviceType,
  url,
}: {
  name: string;
  description: string;
  serviceType: string;
  url: string;
}): JSX.Element {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    serviceType,
    url,
    provider: {
      '@type': 'Organization',
      name: 'Akubrecah Technologies',
      url: 'https://akubrecah.com',
    },
    areaServed: {
      '@type': 'Country',
      name: 'Kenya',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * TechArticle Schema.org JSON-LD Component
 * Informs Google and AI search engines (Perplexity, ChatGPT) of original technical publications.
 */
export function ArticleSchema({
  title,
  description,
  url,
  publishedAt,
  updatedAt,
  authorName = 'Akubrecah Engineering',
  imageUrl,
}: {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  updatedAt?: string;
  authorName?: string;
  imageUrl?: string;
}): JSX.Element {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: title,
    description,
    url,
    datePublished: publishedAt,
    dateModified: updatedAt || publishedAt,
    author: {
      '@type': 'Organization',
      name: authorName,
      url: 'https://akubrecah.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Akubrecah Technologies',
      url: 'https://akubrecah.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://akubrecah.com/logo.png',
      },
    },
    image: imageUrl || 'https://akubrecah.com/og-image.jpg',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * FAQPage Schema.org JSON-LD Component
 * Triggers Google Rich Snippet Accordions in search results.
 */
export function FaqSchema({ items }: { items: FaqItem[] }): JSX.Element {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
