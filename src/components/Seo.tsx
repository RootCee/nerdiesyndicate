import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { buildCanonicalUrl, resolveSeoImageUrl, SITE_NAME } from '../lib/site';

type JsonLd = Record<string, unknown> | Array<Record<string, unknown>>;

export type ResolvedSeo = {
  title: string;
  description: string;
  robots: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogType: string;
  ogUrl: string;
  ogImage: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  jsonLd: JsonLd[];
};

export type SeoCollector = {
  seo?: ResolvedSeo;
};

type SeoProps = {
  title: string;
  description: string;
  path: string;
  canonicalPath?: string;
  image?: string;
  type?: 'website' | 'article' | 'product' | 'music.song' | 'profile';
  noindex?: boolean;
  jsonLd?: JsonLd[];
};

const SeoContext = createContext<SeoCollector | null>(null);

export function SeoProvider({
  children,
  collector = null,
}: {
  children: ReactNode;
  collector?: SeoCollector | null;
}) {
  return <SeoContext.Provider value={collector}>{children}</SeoContext.Provider>;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderSeoHeadTags(seo: ResolvedSeo | undefined) {
  if (!seo) return '';

  const tags = [
    `<title>${escapeHtml(seo.title)}</title>`,
    `<meta name="description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="robots" content="${escapeHtml(seo.robots)}" />`,
    `<link rel="canonical" href="${escapeHtml(seo.canonicalUrl)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta property="og:title" content="${escapeHtml(seo.ogTitle)}" />`,
    `<meta property="og:description" content="${escapeHtml(seo.ogDescription)}" />`,
    `<meta property="og:type" content="${escapeHtml(seo.ogType)}" />`,
    `<meta property="og:url" content="${escapeHtml(seo.ogUrl)}" />`,
    `<meta property="og:image" content="${escapeHtml(seo.ogImage)}" />`,
    `<meta name="twitter:card" content="${escapeHtml(seo.twitterCard)}" />`,
    `<meta name="twitter:title" content="${escapeHtml(seo.twitterTitle)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(seo.twitterDescription)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(seo.twitterImage)}" />`,
    ...seo.jsonLd.map(
      (entry) => `<script type="application/ld+json">${JSON.stringify(entry)}</script>`
    ),
  ];

  return tags.join('\n    ');
}

function upsertMeta(attribute: 'name' | 'property', value: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${value}"]`);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, value);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
}

export default function Seo({
  title,
  description,
  path,
  canonicalPath,
  image,
  type = 'website',
  noindex = false,
  jsonLd = [],
}: SeoProps) {
  const collector = useContext(SeoContext);
  const canonicalUrl = buildCanonicalUrl(canonicalPath ?? path);
  const pageUrl = buildCanonicalUrl(path);
  const imageUrl = resolveSeoImageUrl(image);
  const resolvedSeo: ResolvedSeo = {
    title,
    description,
    robots: noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
    canonicalUrl,
    ogTitle: title,
    ogDescription: description,
    ogType: type,
    ogUrl: pageUrl,
    ogImage: imageUrl,
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: imageUrl,
    jsonLd,
  };

  if (collector) {
    collector.seo = resolvedSeo;
  }

  useEffect(() => {
    document.title = title;
    document.documentElement.lang = 'en';

    upsertMeta('name', 'description', resolvedSeo.description);
    upsertMeta('name', 'robots', resolvedSeo.robots);
    upsertLink('canonical', resolvedSeo.canonicalUrl);

    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:title', resolvedSeo.ogTitle);
    upsertMeta('property', 'og:description', resolvedSeo.ogDescription);
    upsertMeta('property', 'og:type', resolvedSeo.ogType);
    upsertMeta('property', 'og:url', resolvedSeo.ogUrl);
    upsertMeta('property', 'og:image', resolvedSeo.ogImage);

    upsertMeta('name', 'twitter:card', resolvedSeo.twitterCard);
    upsertMeta('name', 'twitter:title', resolvedSeo.twitterTitle);
    upsertMeta('name', 'twitter:description', resolvedSeo.twitterDescription);
    upsertMeta('name', 'twitter:image', resolvedSeo.twitterImage);

    document.head.querySelectorAll('script[data-seo-jsonld="true"]').forEach((node) => node.remove());

    resolvedSeo.jsonLd.forEach((entry) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.seoJsonld = 'true';
      script.text = JSON.stringify(entry);
      document.head.appendChild(script);
    });
  }, [resolvedSeo, title]);

  return null;
}
