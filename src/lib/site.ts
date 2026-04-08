export const SITE_NAME = 'Nerdie Blaq';
export const CLUBHOUSE_NAME = 'Nerdie Blaq Clubhouse';
export const LEGAL_ENTITY_NAME = 'Nerdie Blaq LLC';
export const FARCASTER_URL = 'https://farcaster.xyz/rootcee';
export const BUSINESS_CONTACT_EMAIL_PLACEHOLDER = 'rootcee@nerdieblaq.xyz';
export const SITE_BASE_URL =
  (import.meta.env.VITE_CANONICAL_SITE_URL as string | undefined)?.replace(/\/+$/, '') ||
  'https://nerdieblaq.xyz';

export const DEFAULT_OG_IMAGE_PATH = '/nerdie-token-logo.png';

export function buildCanonicalUrl(path = '/') {
  const normalizedPath = path === '/' ? '' : path.replace(/\/+$/, '');
  return `${SITE_BASE_URL}${normalizedPath || '/'}`;
}

export function resolveSeoImageUrl(path = DEFAULT_OG_IMAGE_PATH) {
  if (/^https?:\/\//i.test(path)) return path;
  return buildCanonicalUrl(path.startsWith('/') ? path : `/${path}`);
}
