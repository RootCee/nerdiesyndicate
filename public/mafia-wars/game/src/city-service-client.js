// Phase 2.1: the game's read-only view of the City Service (city-service/ in this repo). No build points at
// a City Service yet (CITY_SERVICE_ENDPOINT is null), so everything reads as "offline" and the bank shows an
// honest not-connected state instead of figures. When the service is deployed and approved, set the endpoint
// here. Requests are GET only, cached, and polled at most once a minute (never per frame).
export const CITY_SERVICE_ENDPOINT = null;
const ECONOMY_TTL_MS = 60_000, MARKET_TTL_MS = 5 * 60_000;

export class CityServiceClient {
  constructor({ endpoint = CITY_SERVICE_ENDPOINT, fetchImpl = globalThis.fetch?.bind(globalThis), now = () => Date.now() } = {}) {
    this.endpoint = endpoint; this.fetch = fetchImpl; this.now = now; this.cache = new Map(); this.pending = new Map();
  }
  get connected() { return !!this.endpoint; }
  // Synchronous snapshots for the displays; a stale entry triggers one background refresh.
  economy() { return this.#snapshot('/v1/economy', ECONOMY_TTL_MS, (body) => ({ status: 'ok', asOf: body.stats?.asOf || body.loadedAt, stats: body.stats, population: body.population, currency: body.currency })); }
  market() { return this.#snapshot('/v1/market', MARKET_TTL_MS, (body) => ({ status: 'ok', ...body })); }
  #snapshot(path, ttl, shape) {
    if (!this.endpoint || !this.fetch) return { status: 'offline' };
    const hit = this.cache.get(path);
    if ((!hit || this.now() - hit.at > ttl) && !this.pending.has(path)) {
      this.pending.set(path, this.fetch(`${this.endpoint}${path}`, { method: 'GET', headers: { accept: 'application/json' } })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then((body) => this.cache.set(path, { at: this.now(), value: shape(body) }))
        .catch(() => this.cache.set(path, { at: this.now(), value: { status: 'offline' } }))
        .finally(() => this.pending.delete(path)));
    }
    return hit?.value || { status: 'loading' };
  }
}
