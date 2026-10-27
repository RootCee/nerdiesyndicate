// The game's read-only view of the City Service (city-service/ in this repo): one City Director for the
// Nerdie Blaq bank, promoted to production by the founder on 27 October 2026. Preview sites (*.vercel.app)
// read the same service. Requests are GET only, cached, and polled at most once a minute.
export const CITY_SERVICE_ENDPOINT = 'https://nerdie-city-service.buddieroots.workers.dev';
export const REVIEW_CITY_SERVICE_ENDPOINT = 'https://nerdie-city-service.buddieroots.workers.dev';
export function resolveCityServiceEndpoint(locationLike = globalThis.location) {
  const host = String(locationLike?.hostname || '').toLowerCase();
  if (host.endsWith('.vercel.app')) return REVIEW_CITY_SERVICE_ENDPOINT;
  return CITY_SERVICE_ENDPOINT;
}
const ECONOMY_TTL_MS = 60_000, MARKET_TTL_MS = 5 * 60_000;

export class CityServiceClient {
  constructor({ endpoint = resolveCityServiceEndpoint(), fetchImpl = globalThis.fetch?.bind(globalThis), now = () => Date.now() } = {}) {
    this.endpoint = endpoint; this.fetch = fetchImpl; this.now = now; this.cache = new Map(); this.pending = new Map();
  }
  get connected() { return !!this.endpoint; }
  // Synchronous snapshots for the displays; a stale entry triggers one background refresh.
  economy() { return this.#snapshot('/v1/economy', ECONOMY_TTL_MS, (body) => ({ status: 'ok', asOf: body.stats?.asOf || body.loadedAt, stats: body.stats, population: body.population, currency: body.currency })); }
  market() { return this.#snapshot('/v1/market', MARKET_TTL_MS, (body) => {
    if (body?.status !== 'ok') return { status: 'offline', mode: 'historical', stale: true };
    const recorded = body.latestAt ? new Date(body.latestAt).toUTCString() : 'unknown';
    const signalLines = (body.signals || []).slice(0, 4).map((s) => `${s.asset} · ${String(s.signal).toUpperCase()} · RSI ${s.rsi ?? '—'} · recorded ${new Date(s.created_at).toISOString().slice(0, 10)}`);
    const performance = body.performance?.[0];
    const outcome = body.outcomes?.[0];
    const lines = [performance ? `BOT PERFORMANCE · ${performance.signals} signals · ${performance.win_rate}% win rate · historical` : null,
      outcome ? `LATEST OUTCOME · ${outcome.asset} ${outcome.status} · recorded ${new Date(outcome.closed_at || outcome.created_at).toISOString().slice(0, 10)}` : null,
      ...signalLines].filter(Boolean);
    return { ...body, status: 'ok', lastRecorded: recorded, lines, ticker: `HISTORICAL MARKET ARCHIVE · LAST RECORD ${recorded} · NOT LIVE PRICES · ` };
  }); }
  // Founder Executive Suite: challenge -> the founder wallet signs (through the website) -> 30-minute pass ->
  // oversight figures. The pass lives only in memory; reloading the game signs out.
  async founderSignIn({ address, sign }) {
    if (!this.endpoint || !this.fetch) throw new Error('The City Service is not connected.');
    const post = async (path, body) => {
      const r = await this.fetch(`${this.endpoint}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body) });
      if (r.status === 403 || r.status === 401) throw new Error('This wallet is not authorized for the Founder Executive Suite.');
      if (!r.ok) throw new Error(`Founder sign-in is unavailable (HTTP ${r.status}).`);
      return r.json();
    };
    const challenge = await post('/v1/founder/challenge', { address });
    const signature = await sign(challenge.message);
    const session = await post('/v1/founder/session', { address, nonce: challenge.nonce, signature });
    this.founderSession = { token: session.token, founder: session.founder, expiresAt: this.now() + session.expiresInMinutes * 60_000 };
    return this.founderSession;
  }
  get founderSignedIn() { return !!this.founderSession && this.founderSession.expiresAt > this.now(); }
  async founderOverview() {
    if (!this.founderSignedIn) throw new Error('Sign in with the founder wallet first.');
    const r = await this.fetch(`${this.endpoint}/v1/founder/overview`, { method: 'GET', headers: { accept: 'application/json', authorization: `Bearer ${this.founderSession.token}` } });
    if (r.status === 401) { this.founderSession = null; throw new Error('Your founder session ended. Sign in again.'); }
    if (!r.ok) throw new Error(`The founder overview is unavailable (HTTP ${r.status}).`);
    return r.json();
  }
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
