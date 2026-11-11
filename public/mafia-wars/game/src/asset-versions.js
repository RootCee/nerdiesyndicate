// RC1 hotfix: versioned asset URLs, so returning players load models, textures, sounds and the sky straight from
// their browser cache instead of re-checking each file with the server on every visit.
//
// The website's packaging step writes asset-manifest.json next to index.html: { "assets/…": "<content hash>" }.
// Every asset URL then gets `?v=<hash>`. The site marks those versioned URLs immutable; a changed file has a new
// hash, and so a new URL, so nobody can ever be served a stale copy. Without a manifest (local development, an
// older package), URLs are unchanged and behave exactly as before.
let versions = null;

export function setAssetVersions(map) {
  versions = map && typeof map === 'object' && !Array.isArray(map) ? map : null;
  return versions;
}
export const assetVersionCount = () => (versions ? Object.keys(versions).length : 0);

// 'assets/models/x.glb' (or any absolute URL containing it) -> 'assets/models/x.glb?v=<hash>' when the manifest
// knows the file. URLs that already carry a query, data:/blob: URLs and unknown files are left alone.
export function assetUrl(url) {
  if (!versions || typeof url !== 'string' || url.includes('?') || /^(data|blob):/.test(url)) return url;
  const at = url.indexOf('assets/'); if (at < 0) return url;
  const v = versions[url.slice(at)];
  return typeof v === 'string' && /^[0-9a-f]{6,64}$/.test(v) ? `${url}?v=${v}` : url;
}

// Loaded once, before any module that loads assets runs (assets.js and audio.js import this module, and this
// top-level await holds them until it settles). A missing or slow manifest never blocks the game for long.
async function loadManifest() {
  if (typeof location === 'undefined' || typeof fetch !== 'function') return null;
  try {
    const r = await fetch(new URL('../asset-manifest.json', import.meta.url), { signal: AbortSignal.timeout(4000) });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}
setAssetVersions(await loadManifest());
