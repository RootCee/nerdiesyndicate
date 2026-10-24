export const PRODUCTION_MULTIPLAYER_SERVICE = 'https://nerdie-city-multiplayer-v4.buddieroots.workers.dev';
export const AVATAR_PREVIEW_MULTIPLAYER_SERVICE = 'https://nerdie-city-m6-3-preview.buddieroots.workers.dev';
export const LOCAL_MULTIPLAYER_SERVICE = 'http://127.0.0.1:8787';

export function resolveMultiplayerService(locationLike = globalThis.location) {
  const query = new URLSearchParams(locationLike?.search || '');
  const override = query.get('mp');
  if (override) return override.replace(/\/$/, '');
  const hostname = locationLike?.hostname || '';
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return LOCAL_MULTIPLAYER_SERVICE;
  if (hostname.endsWith('.vercel.app')) return AVATAR_PREVIEW_MULTIPLAYER_SERVICE;
  return PRODUCTION_MULTIPLAYER_SERVICE;
}
