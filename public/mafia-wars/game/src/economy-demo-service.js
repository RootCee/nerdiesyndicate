// An isolated, browser-local replay for the protected M2.2 preview. It never
// writes to Supabase and is only available on development/preview hosts with
// ?economyDemo=1. Every figure is asserted against the PostgreSQL-backed cycle
// in city-service/test/economy.test.js.
const STORAGE_KEY = 'nerdie-city-m2.2-ledger-replay.v1';
const STEP_MS = 12_000;

const safeHost = (hostname) => {
  const h = String(hostname || '').toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.endsWith('.vercel.app')) return true;
  const p = h.split('.').map(Number);
  return p.length === 4 && p.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)
    && (p[0] === 10 || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168));
};

export function economyDemoAllowed(locationLike = globalThis.location) {
  if (!locationLike || !safeHost(locationLike.hostname)) return false;
  return new URLSearchParams(locationLike.search || '').get('economyDemo') === '1';
}

export class EconomyDemoService {
  constructor({ storage = globalThis.localStorage, now = () => Date.now() } = {}) {
    this.storage = storage; this.now = now;
    let startedAt = now();
    try {
      const saved = JSON.parse(storage?.getItem(STORAGE_KEY) || '{}');
      if (Number.isFinite(saved.startedAt) && saved.startedAt <= startedAt) startedAt = saved.startedAt;
      else storage?.setItem(STORAGE_KEY, JSON.stringify({ startedAt }));
    } catch {}
    this.startedAt = startedAt;
  }
  get connected() { return true; }
  phase() { return Math.min(3, Math.max(0, Math.floor((this.now() - this.startedAt) / STEP_MS))); }
  economy() {
    const phase = this.phase(), shifted = phase >= 2, traded = phase >= 3;
    const events = [];
    if (traded) events.push({ city_minute: 1260, kind: 'social', location_id: 'nerdie-central-park', details: { residents: 2 } }, { city_minute: 1260, kind: 'purchase', location_id: 'corner-market', details: { sales: 17 } });
    if (shifted) events.push({ city_minute: 960, kind: 'shift_completed', location_id: 'nerdie-city-bank', details: { completed: 17 } });
    events.push({ city_minute: 0, kind: 'genesis', location_id: 'nerdie-city-bank', details: { issued: 100000 } });
    return {
      status: 'ok', mode: 'verified-local-ledger-replay', asOf: new Date(this.startedAt + phase * STEP_MS).toISOString(), currency: 'SIM', population: 36,
      stats: {
        issued: '100000', treasury: shifted ? '99745' : '100000', reserveWarning: 25000, payrollPause: 10000,
        population: 36, employed: 17, wagesPaid: shifted ? '255' : '0', rentCollected: '0', activeBusinesses: 2,
        businessSales: traded ? '75' : '0', businessOperatingExpenses: '0', cityOperatingExpenses: '0', savings: shifted ? '57' : '0',
        entries: 1 + (shifted ? 17 : 0) + (traded ? 17 : 0), recentEvents: events,
        inventory: traded ? { 'Fresh meal': 12, 'Grocery bag': 18, Snack: 25 } : { 'Fresh meal': 18, 'Grocery bag': 24, Snack: 30 },
      },
      demo: { label: 'VERIFIED LOCAL LEDGER REPLAY', phase, complete: phase === 3, persisted: true },
    };
  }
  market() {
    return {
      status: 'ok', mode: 'historical', stale: true, latestAt: '2026-06-05T17:19:39.631Z',
      lastRecorded: 'Fri, 05 Jun 2026 17:19:39 GMT',
      lines: ['BOT PERFORMANCE ARCHIVE · 586 records', 'SIGNAL ARCHIVE · 817 records', 'OUTCOME ARCHIVE · 33 records', 'MARKET UPDATE ARCHIVE · 0 records'],
      ticker: 'HISTORICAL MARKET ARCHIVE · LAST RECORD FRI, 05 JUN 2026 17:19:39 GMT · NOT LIVE PRICES · ',
      audit: { source: 'existing Supabase project', readOnly: true, rowCounts: { bot_performance: 586, bot_signals: 817, market_updates: 0, signal_outcomes: 33 } },
    };
  }
}
