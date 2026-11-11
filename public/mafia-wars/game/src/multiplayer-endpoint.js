export const PRODUCTION_MULTIPLAYER_SERVICE = 'https://nerdie-city-multiplayer-v4.buddieroots.workers.dev';
export const HOOD_EXPANSION_PREVIEW_HOST = 'nerdie-city-hood-expansion-preview.vercel.app';
export const HOOD_EXPANSION_PREVIEW_ORIGIN = `https://${HOOD_EXPANSION_PREVIEW_HOST}`;
export const PREVIEW_MULTIPLAYER_SERVICES = Object.freeze({
  'nerdie-city-hood-expansion-preview-3tr17yz05-rootcees-projects.vercel.app':
    'https://nerdie-city-hood-expansion-preview.buddieroots.workers.dev',
  [HOOD_EXPANSION_PREVIEW_HOST]: 'https://nerdie-city-hood-expansion-preview.buddieroots.workers.dev',
});
export const LOCAL_MULTIPLAYER_SERVICE = 'http://127.0.0.1:8787';
// NC release candidate 1: the protected Vercel preview of website branch mw-rc1 (its branch alias, or one of its
// deployment URLs) talks only to its own preview Worker and a City Service stand-in, never to production.
export const RC1_PREVIEW_MULTIPLAYER_SERVICE = 'https://nerdie-city-rc1-preview.buddieroots.workers.dev';
export const RC1_PREVIEW_CITY_SERVICE = 'https://nerdie-city-service-rc1-stub.buddieroots.workers.dev';
export function isRc1PreviewHost(hostname) {
  return /^nerdiesyndicate-(git-mw-rc1(-[a-z0-9]+)*|[a-z0-9]{9})-rootcees-projects\.vercel\.app$/.test(String(hostname || '').toLowerCase());
}

export function isHoodExpansionPreviewDeploymentHost(hostname) {
  return /^nerdie-city-hood-expansion-preview-[a-z0-9]{9}-rootcees-projects\.vercel\.app$/.test(hostname);
}

export function isHoodExpansionPreviewDeploymentOrigin(origin) {
  return origin.startsWith('https://')
    && isHoodExpansionPreviewDeploymentHost(origin.slice('https://'.length));
}

export function resolveMultiplayerService(locationLike = globalThis.location) {
  const hostname = (locationLike?.hostname || '').toLowerCase();
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  const octets = hostname.split('.').map(Number);
  const isPrivateLan = octets.length === 4 && octets.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
    && (octets[0] === 10 || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || (octets[0] === 192 && octets[1] === 168));
  const override = new URLSearchParams(locationLike?.search || '').get('mp');
  if (override && (isLocal || isPrivateLan)) return override.replace(/\/$/, '');
  if (isLocal) return LOCAL_MULTIPLAYER_SERVICE;
  if (isRc1PreviewHost(hostname)) return RC1_PREVIEW_MULTIPLAYER_SERVICE;
  const previewService = PREVIEW_MULTIPLAYER_SERVICES[hostname]
    || (isHoodExpansionPreviewDeploymentHost(hostname)
      ? PREVIEW_MULTIPLAYER_SERVICES[HOOD_EXPANSION_PREVIEW_HOST]
      : null);
  if (previewService) return previewService;
  if (hostname.endsWith('.vercel.app')) throw new Error('This preview build has no isolated multiplayer Worker configured.');
  return PRODUCTION_MULTIPLAYER_SERVICE;
}
