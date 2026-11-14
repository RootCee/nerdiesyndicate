// The game's read-only view of the City Service (city-service/ in this repo): one City Director for the
// Nerdie Blaq bank, promoted to production by the founder on 27 October 2026. Only the production site
// (PRODUCTION_HOSTS) reads the production service; a preview names its own (?cityService=, or the RC1 stand-in)
// or has none (NC-SIM-02: never a silent fallback to production). Requests are GET only, cached, polled at most once a minute.
import { RC1_PREVIEW_CITY_SERVICE, isProductionHost, isRc1PreviewHost } from './multiplayer-endpoint.js';
import { CITY_PULSE_RANGES, CITY_PULSE_REFRESH_MS, parseCityPulse } from './city-pulse.js';
export const CITY_SERVICE_ENDPOINT = 'https://nerdie-city-service.buddieroots.workers.dev';
// A preview host (Vercel preview, localhost, a private LAN address) may name its own isolated City Service with
// ?cityService=<origin> (NC-LIFE-01A founder preview). The production site never honours it.
const previewHost = (host) => host.endsWith('.vercel.app') || host === 'localhost' || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)\d{1,3}\.\d{1,3}(\.\d{1,3})?$/.test(host);
export function resolveCityServiceEndpoint(locationLike = globalThis.location) {
  const host = String(locationLike?.hostname || '').toLowerCase();
  if (isProductionHost(host)) return CITY_SERVICE_ENDPOINT; // the production site never honours overrides
  const named = previewHost(host) ? new URLSearchParams(locationLike?.search || '').get('cityService') : null;
  if (named && /^https?:\/\/[a-z0-9.-]+(:\d{2,5})?\/?$/i.test(named)) return named.replace(/\/+$/, '');
  if (isRc1PreviewHost(host)) return RC1_PREVIEW_CITY_SERVICE; // RC1 preview: a stand-in, never the production bank
  return null; // any other host: not connected (the bank panel says so); never the production bank
}
const ECONOMY_TTL_MS = 60_000, MARKET_TTL_MS = 5 * 60_000;
const ACTIVITY_TTL_MS = 30_000;

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
  // NC-LIFE-01A: the City Economy board (public aggregates, no balances): wages, sales, Roots visits, stock,
  // the latest resident decisions and the managers' changes.
  activity() { return this.#snapshot('/v1/economy/activity', ACTIVITY_TTL_MS, (body) => (body && Array.isArray(body.decisions) ? { status: 'ok', ...body } : { status: 'offline' })); }
  // Today's recorded decisions (one public line per deciding resident), for the resident talk card.
  lifePlans() { return this.#snapshot('/v1/life/plans', ACTIVITY_TTL_MS, (body) => (body && Array.isArray(body.plans) ? { status: 'ok', ...body } : { status: 'offline', plans: [] })); }
  // NC-PULSE-01: the Roots Lounge City Pulse board (public, money-free; GET /v1/city-pulse?days=7|30). Resolves to
  // the parsed, whitelisted pulse; rejects (without the server's words) when offline, slow or malformed. No
  // credentials or founder pass are ever sent. Cached a minute, one request per range at a time.
  cityPulse(days = 7) {
    const range = CITY_PULSE_RANGES.includes(days) ? days : 7, path = `/v1/city-pulse?days=${range}`;
    if (!this.endpoint || !this.fetch) return Promise.reject(new Error('City Pulse is not connected.'));
    const hit = this.cache.get(path);
    if (hit && this.now() - hit.at < CITY_PULSE_REFRESH_MS) return Promise.resolve(hit.value);
    if (this.pending.has(path)) return this.pending.get(path);
    const abort = typeof AbortController === 'function' ? new AbortController() : null, timer = abort ? setTimeout(() => abort.abort(), 10_000) : 0;
    const request = this.fetch(`${this.endpoint}${path}`, { method: 'GET', headers: { accept: 'application/json' }, credentials: 'omit', ...(abort ? { signal: abort.signal } : {}) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('City Pulse is unavailable.'))))
      .then((body) => { const pulse = parseCityPulse(body); if (!pulse) throw new Error('City Pulse is unavailable.'); this.cache.set(path, { at: this.now(), value: pulse }); return pulse; })
      .catch(() => { throw new Error('City Pulse is unavailable.'); })
      .finally(() => { clearTimeout(timer); this.pending.delete(path); });
    this.pending.set(path, request); return request;
  }
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
  founderOverview() { return this.#founderGet('/v1/founder/overview', 'The founder overview'); }
  // Resident oversight: every resident with balances and totals, and one resident's history.
  founderResidents() { return this.#founderGet('/v1/founder/residents', 'The resident list'); }
  // NC-SIM-02: the economy dashboard's founder reports (migration 0016): reconciliation, daily history, demand.
  founderEconomy(report, days = 14) {
    if (!['reconciliation', 'history', 'demand'].includes(report)) return Promise.reject(new Error('Unknown economy report'));
    return this.#founderGet(`/v1/founder/economy/${report}${report === 'reconciliation' ? '' : `?days=${Math.min(90, Math.max(1, days | 0))}`}`, `The economy ${report}`);
  }
  founderResident(residentId) {
    if (!/^res_[0-9]{4}$/.test(String(residentId))) return Promise.reject(new Error('Unknown resident.'));
    return this.#founderGet(`/v1/founder/residents/${residentId}`, 'This resident\'s history');
  }
  // NC Milestone 10: the Founder Command Center's read-only views (server checks the founder session and logs every view).
  founderCommand(view, { target = null, params = {} } = {}) {
    const views = ['overview', 'economy', 'residents', 'resident', 'organizations', 'territory', 'leadership', 'businesses', 'property', 'nfts', 'ledger', 'events', 'health', 'explain'];
    if (!views.includes(view)) return Promise.reject(new Error('Unknown view.'));
    if (target !== null && !/^[a-z0-9_]{2,40}$/.test(String(target))) return Promise.reject(new Error('Unknown record.'));
    const q = new URLSearchParams(Object.entries(params || {}).filter(([k, v]) => ['q', 'kind', 'party', 'limit', 'ref'].includes(k) && v !== '' && v != null).map(([k, v]) => [k, String(v).slice(0, 60)]));
    return this.#founderGet(`/v1/founder/command/${view}${target ? `/${target}` : ''}${q.size ? `?${q}` : ''}`, 'This Command Center view');
  }
  async #founderGet(path, label) {
    if (!this.founderSignedIn) throw new Error('Sign in with the founder wallet first.');
    const r = await this.fetch(`${this.endpoint}${path}`, { method: 'GET', headers: { accept: 'application/json', authorization: `Bearer ${this.founderSession.token}` } });
    if (r.status === 401) { this.founderSession = null; throw new Error('Your founder session ended. Sign in again.'); }
    if (!r.ok) throw new Error(`${label} is unavailable (HTTP ${r.status}).`);
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
