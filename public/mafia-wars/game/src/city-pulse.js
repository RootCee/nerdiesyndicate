// NC-PULSE-01 Roots Lounge City Pulse: the public, money-free view of what the city's simulated residents
// bought, could not buy, and how often they visited Roots Lounge. Source: the City Service's public
// GET /v1/city-pulse (registry.city_pulse, migration 0016), which answers exactly
//   { fromDay, toDay, days: [{ day, served: {category: items}, missed: {category: items}, rootsVisits }],
//     wishes: [{ item, category, missed }] }
// Nothing else is read. The parser keeps only those fields (anything new the server adds is dropped, never
// shown), so no balance, wallet, identity or transaction id can reach the board. Pure: no DOM, no network.

export const CITY_PULSE_RANGES = Object.freeze([7, 30]); // the endpoint clamps to 1..30 city days
export const CITY_PULSE_REFRESH_MS = 60_000; // the City Service caches the pulse for a minute; never ask faster
const CATEGORY = /^[a-z][a-z0-9_-]{0,31}$/, MAX_DAYS = 31, MAX_WISHES = 50;
const LABELS = Object.freeze({ food: 'Food', leisure: 'Leisure', retail: 'Retail', entertainment: 'Entertainment', services: 'Services' });
const ORDER = ['food', 'leisure'];

export const categoryLabel = (key) => LABELS[key] || String(key).split(/[-_]/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
const count = (v) => (Number.isSafeInteger(v) && v >= 0 ? v : typeof v === 'string' && /^\d{1,9}$/.test(v) ? Number(v) : null);
const tally = (obj) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const out = {};
  for (const [k, v] of Object.entries(obj)) { const n = count(v); if (CATEGORY.test(k) && n !== null && n > 0) out[k] = n; }
  return out;
};
const cleanText = (s) => (typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) : '');

// Returns a frozen, whitelisted pulse, or null when the body is not a City Pulse at all.
export function parseCityPulse(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const fromDay = count(body.fromDay), toDay = count(body.toDay);
  if (fromDay === null || toDay === null || toDay < fromDay || !Array.isArray(body.days) || !Array.isArray(body.wishes)) return null;
  const days = [];
  for (const d of body.days.slice(0, MAX_DAYS)) {
    const day = count(d?.day), served = tally(d?.served), missed = tally(d?.missed), rootsVisits = count(d?.rootsVisits);
    if (day === null || day < fromDay || day > toDay || !served || !missed || rootsVisits === null) continue;
    days.push(Object.freeze({ day, served: Object.freeze(served), missed: Object.freeze(missed), rootsVisits }));
  }
  days.sort((a, b) => a.day - b.day);
  const wishes = [];
  for (const w of body.wishes.slice(0, MAX_WISHES)) {
    const item = cleanText(w?.item), missed = count(w?.missed);
    if (item && CATEGORY.test(String(w?.category)) && missed > 0) wishes.push(Object.freeze({ item, category: w.category, missed }));
  }
  return Object.freeze({ fromDay, toDay, days: Object.freeze(days), wishes: Object.freeze(wishes) });
}

const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const plural = (n, one, many = `${one}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
export function ago(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '';
  const s = Math.round(ms / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); return `${h} hr ago`;
}

export const EMPTY_DEMAND_MESSAGE = "Residents' current requests are being fulfilled.";
export const NO_OPPORTUNITY_MESSAGE = 'No unmet demand was recorded in this period, so the board is not pointing to a gap in the market right now.';
export const OPPORTUNITY_DISCLAIMER = 'Informational only. A gap in supply is not a promise of customers, earnings, profit or token rewards.';
export const SIMULATED_NOTICE = 'Simulated Nerdie City economy · not on-chain $NERDIE';
export const ROOTS_FACTS = Object.freeze(['Permanently city-owned and city-operated', 'A social landmark for residents and players', 'Featuring RootCee music']);

// Everything the panel and the in-world board draw, from a parsed pulse (or none) and the feed's state.
// status: 'loading' | 'ready' | 'stale' (showing older figures after a failed refresh) | 'unavailable' | 'not-connected'
export function cityPulseView(pulse, { status = pulse ? 'ready' : 'loading', source = 'live', range = 7, lastSuccessAt = null, now = Date.now() } = {}) {
  const base = { status, source, range, sourceLabel: source === 'live' ? 'Live city figures' : source === 'preview' ? 'Preview service · not the production city' : 'Sample figures', updated: lastSuccessAt ? ago(now - lastSuccessAt) : '', notice: SIMULATED_NOTICE };
  if (!pulse) return { ...base, hasData: false };
  const days = pulse.days, latest = days.at(-1)?.day ?? pulse.toDay;
  const keys = [...new Set(days.flatMap((d) => Object.keys(d.served)))].sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99) || a.localeCompare(b));
  const categories = keys.map((key) => ({ key, label: categoryLabel(key), total: sum(days.map((d) => d.served[key] || 0)) }));
  const dayRows = days.map((d) => ({ day: d.day, label: `Day ${d.day}`, latest: d.day === latest, total: sum(Object.values(d.served)), values: Object.fromEntries(keys.map((k) => [k, d.served[k] || 0])), rootsVisits: d.rootsVisits }));
  const totalItems = sum(categories.map((c) => c.total)), busiest = dayRows.reduce((best, d) => (d.total > (best?.total ?? -1) ? d : best), null);
  const missedByCategory = {};
  for (const d of days) for (const [k, n] of Object.entries(d.missed)) missedByCategory[k] = (missedByCategory[k] || 0) + n;
  for (const w of pulse.wishes) missedByCategory[w.category] ??= 0; // a wish's category always appears
  const demandCategories = Object.entries(missedByCategory).map(([key, missed]) => ({ key, label: categoryLabel(key), missed: Math.max(missed, sum(pulse.wishes.filter((w) => w.category === key).map((w) => w.missed))) })).filter((c) => c.missed > 0).sort((a, b) => b.missed - a.missed || a.label.localeCompare(b.label));
  const items = pulse.wishes.map((w) => ({ item: w.item, category: categoryLabel(w.category), missed: w.missed }));
  const visits = sum(days.map((d) => d.rootsVisits)), rootsBusiest = dayRows.reduce((best, d) => (d.rootsVisits > (best?.rootsVisits ?? 0) ? d : best), null);
  const spanDays = days.length;
  return {
    ...base, hasData: true, fromDay: pulse.fromDay, toDay: pulse.toDay, spanDays,
    rangeLabel: spanDays ? `City days ${pulse.fromDay}–${pulse.toDay}` : 'No recorded city days yet',
    activity: {
      categories, days: dayRows, totalItems, max: Math.max(1, ...dayRows.map((d) => d.total)), busiest: busiest && busiest.total > 0 ? busiest : null,
      averagePerDay: spanDays ? Math.round(totalItems / spanDays) : 0,
      note: 'Items bought by residents. One resident can buy several, so these are not counts of people. The latest day may still be in progress.',
    },
    demand: { empty: demandCategories.length === 0, message: demandCategories.length ? `Residents could not buy ${plural(sum(demandCategories.map((c) => c.missed)), 'item')} they wanted.` : EMPTY_DEMAND_MESSAGE, categories: demandCategories, items },
    roots: { totalVisits: visits, averagePerDay: spanDays ? Math.round((visits / spanDays) * 10) / 10 : 0, busiest: rootsBusiest, days: dayRows.map((d) => ({ day: d.day, label: d.label, visits: d.rootsVisits, latest: d.latest })), max: Math.max(1, ...dayRows.map((d) => d.rootsVisits)), facts: ROOTS_FACTS },
    opportunities: {
      signals: demandCategories.map((c) => ({ label: c.label, missed: c.missed, text: `Residents could not buy ${plural(c.missed, 'item')} in ${c.label.toLowerCase()} during this period. This category may represent an opportunity for future businesses.` })),
      message: demandCategories.length ? '' : NO_OPPORTUNITY_MESSAGE, disclaimer: OPPORTUNITY_DISCLAIMER,
    },
  };
}

// The panel's data feed: one request per range at a time, at most one per minute (the client also caches),
// lazily on open. A failed refresh keeps the last good figures and says so; it never invents numbers.
export class CityPulseFeed {
  constructor({ client = null, productionEndpoint = '', now = () => Date.now(), onChange = () => {} } = {}) {
    Object.assign(this, { client, productionEndpoint, now, onChange });
    this.range = 7; this.data = new Map(); this.status = 'idle'; this.lastSuccessAt = new Map(); this.inflight = new Map(); this.requests = 0;
  }
  get connected() { return !!(this.client?.cityPulse && this.client.endpoint); }
  get source() { return this.client?.endpoint && this.client.endpoint === this.productionEndpoint ? 'live' : 'preview'; }
  view() {
    const status = !this.connected ? 'not-connected' : this.status;
    return cityPulseView(this.data.get(this.range) || null, { status, source: this.source, range: this.range, lastSuccessAt: this.lastSuccessAt.get(this.range) || null, now: this.now() });
  }
  setRange(range) { if (CITY_PULSE_RANGES.includes(range) && range !== this.range) { this.range = range; this.load(); } else this.onChange(this.view()); }
  // Refresh if the figures for this range are older than a minute (or `force` after a failure: Retry).
  load({ force = false } = {}) {
    const range = this.range;
    if (!this.connected) { this.status = 'not-connected'; this.onChange(this.view()); return Promise.resolve(null); }
    if (this.inflight.has(range)) return this.inflight.get(range);
    const at = this.lastSuccessAt.get(range);
    if (!force && at && this.now() - at < CITY_PULSE_REFRESH_MS) { this.status = 'ready'; this.onChange(this.view()); return Promise.resolve(this.data.get(range)); }
    if (!this.data.has(range)) this.status = 'loading';
    this.onChange(this.view()); this.requests++;
    const p = Promise.resolve().then(() => this.client.cityPulse(range)).then((raw) => {
      const pulse = raw && Object.isFrozen(raw) && Array.isArray(raw.days) ? raw : parseCityPulse(raw);
      if (!pulse) throw new Error('invalid');
      this.data.set(range, pulse); this.lastSuccessAt.set(range, this.now()); if (this.range === range) this.status = 'ready';
      return pulse;
    }).catch(() => { if (this.range === range) this.status = this.data.has(range) ? 'stale' : 'unavailable'; return null; })
      .finally(() => { this.inflight.delete(range); if (this.range === range) this.onChange(this.view()); });
    this.inflight.set(range, p); return p;
  }
}
