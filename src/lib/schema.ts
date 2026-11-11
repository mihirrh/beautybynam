import { settings, has, telHref } from './site';

/**
 * Structured data builders. Only facts that exist in the CMS are emitted:
 * no address, phone, hours, prices, ratings or review counts are invented.
 */

type Json = Record<string, unknown>;

const abs = (site: URL | string, path = '/') => new URL(path, site).toString();

export function businessSchema(site: URL | string, image?: string): Json {
  const sameAs = [settings.instagramUrl].filter(has);
  const data: Json = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'BeautySalon'],
    '@id': abs(site, '/#business'),
    name: settings.businessName,
    url: abs(site),
    description:
      'Bridal and occasion hair and makeup studio based in Leicester, serving Leicestershire, the East Midlands and destination weddings across the UK.',
    areaServed: settings.areaServed.map((name) => ({ '@type': 'Place', name })),
    address: {
      '@type': 'PostalAddress',
      addressLocality: settings.locality,
      addressRegion: settings.region,
      addressCountry: 'GB',
    },
    founder: { '@id': abs(site, '/#nam') },
    sameAs,
  };
  if (image) data.image = image;
  if (has(settings.email)) data.email = settings.email;
  if (has(settings.phone)) data.telephone = telHref(settings.phone).replace('tel:', '');
  return data;
}

export function personSchema(site: URL | string, image?: string): Json {
  const data: Json = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': abs(site, '/#nam'),
    name: 'Nam',
    jobTitle: 'Bridal hair and makeup artist',
    worksFor: { '@id': abs(site, '/#business') },
    sameAs: [settings.instagramUrl].filter(has),
  };
  if (image) data.image = image;
  return data;
}

export function websiteSchema(site: URL | string): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': abs(site, '/#website'),
    url: abs(site),
    name: settings.businessName,
    publisher: { '@id': abs(site, '/#business') },
    inLanguage: 'en-GB',
  };
}

export function serviceSchema(
  site: URL | string,
  svc: { name: string; description: string; path: string; image?: string },
): Json {
  const data: Json = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: svc.name,
    description: svc.description,
    url: abs(site, svc.path),
    provider: { '@id': abs(site, '/#business') },
    areaServed: settings.areaServed.map((name) => ({ '@type': 'Place', name })),
  };
  if (svc.image) data.image = svc.image;
  return data;
}

export function breadcrumbSchema(site: URL | string, trail: { name: string; path: string }[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: abs(site, item.path),
    })),
  };
}

export function faqSchema(items: { question: string; answer: string }[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: { '@type': 'Answer', text: q.answer },
    })),
  };
}

export function blogPostingSchema(
  site: URL | string,
  post: { title: string; description: string; date: Date; path: string; image?: string; author: string },
): Json {
  const data: Json = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date.toISOString(),
    mainEntityOfPage: abs(site, post.path),
    author: { '@type': 'Person', name: post.author },
    publisher: { '@id': abs(site, '/#business') },
    inLanguage: 'en-GB',
  };
  if (post.image) data.image = post.image;
  return data;
}
