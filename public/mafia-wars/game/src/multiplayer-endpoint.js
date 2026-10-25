export const PRODUCTION_MULTIPLAYER_SERVICE = 'https://nerdie-city-multiplayer-v4.buddieroots.workers.dev';
export const AVATAR_PREVIEW_MULTIPLAYER_SERVICE = 'https://nerdie-city-m6-8b-preview.buddieroots.workers.dev';
export const LOCAL_MULTIPLAYER_SERVICE = 'http://127.0.0.1:8787';

export function resolveMultiplayerService(locationLike = globalThis.location) {
  const hostname = (locationLike?.hostname || '').toLowerCase();
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  const octets = hostname.split('.').map(Number);
  const isPrivateLan = octets.length === 4 && octets.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
    && (octets[0] === 10 || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || (octets[0] === 192 && octets[1] === 168));
  const override = new URLSearchParams(locationLike?.search || '').get('mp');
  if (override && (isLocal || isPrivateLan)) return override.replace(/\/$/, '');
  if (isLocal) return LOCAL_MULTIPLAYER_SERVICE;
  if (hostname.endsWith('.vercel.app')) return AVATAR_PREVIEW_MULTIPLAYER_SERVICE;
  return PRODUCTION_MULTIPLAYER_SERVICE;
}
