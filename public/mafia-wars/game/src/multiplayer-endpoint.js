export const PRODUCTION_MULTIPLAYER_SERVICE = 'https://nerdie-city-multiplayer-preview.buddieroots.workers.dev';
export const LOCAL_MULTIPLAYER_SERVICE = 'http://127.0.0.1:8787';

export function resolveMultiplayerService(locationLike = globalThis.location) {
  const query = new URLSearchParams(locationLike?.search || '');
  const override = query.get('mp');
  if (override) return override.replace(/\/$/, '');
  const hostname = locationLike?.hostname || '';
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
    ? LOCAL_MULTIPLAYER_SERVICE
    : PRODUCTION_MULTIPLAYER_SERVICE;
}
