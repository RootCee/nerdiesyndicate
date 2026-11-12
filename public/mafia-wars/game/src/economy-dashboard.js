// NC-SIM-02: the founder's economy dashboard (Founder Executive Suite, "Economy" tab). Pure: builds a model from
// the City Service's founder reports (migration 0016) and the public activity feed, then renders HTML with the
// bank panel's styles. Every figure says where it comes from: VERIFIED (read from the bank's ledger or registry),
// ESTIMATED (derived, with the assumption stated) or UNAVAILABLE (not recorded anywhere yet). Nothing here can
// change anything: it only reads.
// The room's own economy model (economy-core.js, inside each multiplayer room) is shown beside the bank's figures
// and never merged with them: they are separate simulations.
import { CITY_SERVICE_ENDPOINT } from './city-service-client.js';

const num = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
const sumValues = (o) => Object.values(o || {}).reduce((s, v) => s + (num(v) || 0), 0);
export const SOURCE = Object.freeze({ verified: 'VERIFIED', estimated: 'ESTIMATED', unavailable: 'UNAVAILABLE' });

// Room model versus bank (no merging, no correction: a side-by-side statement of what differs).
export function compareRoomAndBank(room, reconciliation) {
  if (!room || !reconciliation) return { available: false, rows: [], note: room ? 'Bank figures are not loaded.' : 'No room economy snapshot yet (join the city first).' };
  const bankResidents = reconciliation.residents?.count ?? null, bankTreasury = num(reconciliation.treasury?.balance);
  const roomTreasury = num(room.treasury?.balance ?? room.treasury?.cash ?? room.treasury), roomMoney = num(room.totalMoney);
  const rows = [
    { item: 'Residents', room: room.residentCount ?? null, bank: bankResidents, note: 'The room simulates its own generated residents; the bank holds the 36 permanent residents.' },
    { item: 'Treasury', room: roomTreasury, bank: bankTreasury, note: 'Separate balances in separate simulations.' },
    { item: 'Money in circulation', room: roomMoney, bank: num(reconciliation.supply?.issued), note: 'The room counts its own model; the bank counts issued sNERDIE.' },
    { item: 'Currency', room: room.currency || null, bank: reconciliation.currency || 'SIM', note: 'Both are simulated and never withdrawable.' },
    { item: 'Roots residents', room: room.roots?.source === 'bank' ? 'from the bank' : 'room model', bank: 'life plans', note: room.roots?.source === 'bank' ? 'Roots attendance in rooms already comes from the bank.' : 'This room shows its own Roots crowd.' },
    { item: '"Demand"', room: Array.isArray(room.demand) ? `${room.demand.length} board items` : null, bank: 'unmet purchases', note: 'The room demand board is a suggestion board; bank demand is refused purchases. Different things.' },
  ].map((r) => ({ ...r, differs: r.room !== r.bank }));
  return { available: true, rows, note: 'Not reconciled by design: these are two simulations. Room figures are the room\'s own model, not checked against the ledger. Nothing is merged or corrected automatically.' };
}

// source: where the figures came from, { kind: 'live' | 'fixture', label } (stated on screen so test data is never
// mistaken for production); errors: reports that failed to load (their sections show as unavailable).
// Loads the founder reports independently: one failing report leaves the others on screen (its sections show as
// unavailable and the error is listed). An ended founder session is not hidden: it stops the load so the suite asks
// the founder to sign in again. The source names the City Service actually read.
export async function loadEconomyReports(client, days = 14, { productionEndpoint = CITY_SERVICE_ENDPOINT } = {}) {
  const settle = (p) => Promise.resolve().then(() => p).then((value) => ({ value }), (error) => ({ error }));
  const [rec, hist, dem, act] = await Promise.all([settle(client.founderEconomy('reconciliation')), settle(client.founderEconomy('history', days)),
    settle(client.founderEconomy('demand', days)), settle(client.activity())]);
  const failed = [rec, hist, dem].filter((r) => r.error);
  const ended = failed.find((r) => /session ended|Sign in/i.test(r.error?.message || ''));
  if (ended) throw ended.error;
  if (failed.length === 3) throw new Error(`The economy reports are unavailable: ${failed[0].error?.message || 'unknown error'}`);
  let host = null; try { host = client.endpoint ? new URL(client.endpoint).host : null; } catch { host = null; }
  // only the production City Service is "live"; any other endpoint is a preview bank and is labelled so
  const norm = (u) => String(u || '').replace(/\/+$/, '').toLowerCase(), live = !!client.endpoint && norm(client.endpoint) === norm(productionEndpoint);
  return { reconciliation: rec.value?.report || null, history: hist.value?.report || null, demand: dem.value?.report || null,
    activity: act.value?.status === 'ok' ? act.value : null, errors: failed.map((r) => r.error?.message || 'unknown error'),
    source: live ? { kind: 'live', label: `the City Service at ${host}` } : { kind: 'preview', label: host ? `the preview City Service at ${host}` : 'an unnamed City Service' } };
}

export function buildEconomyModel({ reconciliation = null, history = null, demand = null, activity = null, room = null, source = null, errors = [] } = {}) {
  const rec = reconciliation, days = history?.days || [], last = days.at(-1) || null;
  const checks = rec?.checks || [], failed = checks.filter((c) => c.status === 'fail');
  const businesses = (rec?.businesses || []).map((b) => {
    const inflow = sumValues(b.inflows), sweep = num(b.outflows?.surplus_sweep) || 0, costs = sumValues(b.outflows) - sweep;
    return { id: b.businessId, type: b.type, salesRecorded: b.salesRecorded, revenue: inflow, costs, operatingResult: inflow - costs, sweptToTreasury: sweep, balance: num(b.balance) };
  });
  const roots = days.map((d) => ({ day: d.day, visits: d.rootsVisits, drinks: d.rootsDrinks, sales: d.salesByBusiness?.biz_roots_lounge || 0 }));
  return {
    status: !rec ? 'unavailable' : failed.length ? 'problem' : 'reconciled',
    source: source && ['live', 'preview', 'fixture'].includes(source.kind) ? { kind: source.kind, label: String(source.label || '') } : null,
    errors: (errors || []).map(String),
    asOf: rec?.asOf || history?.asOf || null,
    treasury: rec ? { source: SOURCE.verified, balance: num(rec.treasury?.balance), issued: num(rec.supply?.issued), held: num(rec.supply?.held), differenceBaseUnits: rec.supply?.differenceBaseUnits,
      holders: Object.fromEntries(Object.entries(rec.supply?.holders || {}).map(([k, v]) => [k, num(v)])), inflows: rec.treasury?.inflows || {}, outflows: rec.treasury?.outflows || {} } : { source: SOURCE.unavailable },
    residents: rec ? { source: SOURCE.verified, count: rec.residents?.count, employed: last?.employed ?? null, wagesTotal: num(rec.residents?.income?.wage), spending: rec.residents?.spending || {},
      checking: num(rec.residents?.checking), savings: num(rec.residents?.savings), withNoMoney: rec.residents?.withNoMoney, wagesByDay: days.map((d) => ({ day: d.day, wages: num(d.wages), shifts: d.shifts, employed: d.employed })) } : { source: SOURCE.unavailable },
    businesses: rec ? { source: SOURCE.verified, rows: businesses, note: 'Operating result = revenue − costs before surplus sweeps. Labour is not a business cost: the city treasury pays every wage (ESTIMATED profitability, by that definition).' } : { source: SOURCE.unavailable, rows: [] },
    daily: history ? { source: SOURCE.verified, fromDay: history.fromDay, toDay: history.toDay, days } : { source: SOURCE.unavailable, days: [] },
    decisions: activity ? { source: SOURCE.verified, day: activity.day, participants: activity.participants, items: (activity.decisions || []).slice(0, 20), managers: (activity.managers || []).slice(0, 6) } : { source: SOURCE.unavailable, items: [], managers: [] },
    demand: demand ? { source: SOURCE.verified, fromDay: demand.fromDay, toDay: demand.toDay, top: (demand.topUnmet || []).slice(0, 10), totals: demand.totals || {} } : { source: SOURCE.unavailable, top: [], totals: {} },
    roots: history ? { source: SOURCE.verified, days: roots, totalVisits: roots.reduce((s, r) => s + (r.visits || 0), 0) } : { source: SOURCE.unavailable, days: [] },
    reconciliation: rec ? { source: SOURCE.verified, ok: !failed.length, checks, failed: failed.length, entries: rec.entries, lastSeq: rec.lastSeq } : { source: SOURCE.unavailable, checks: [] },
    room: compareRoomAndBank(room, rec),
    unavailable: [
      'Why a purchase was refused beyond "out of stock" (the bank records the refusal, not the reason chain)',
      'Player activity (sessions, reconnects, time in Roots, chess and Underground use): not recorded anywhere yet',
      'Chess and Underground results: not recorded (no results store; the ladder service is not deployed)',
      'A day-by-day history of the room economy model: rooms keep only their current state',
    ],
  };
}

// ---- HTML (inside the bank panel; uses its bp-* styles)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (v) => (v == null ? '—' : typeof v === 'number' ? v.toLocaleString('en-US') : esc(v));
const badge = (source) => `<span class="ed-src ed-${String(source).toLowerCase()}">${esc(source)}</span>`;
const section = (n, title, source, body) => `<section class="ed-sec"><h3>${n}. ${esc(title)} ${badge(source)}</h3>${body}</section>`;
const bars = (rows, key, label) => {
  const max = Math.max(1, ...rows.map((r) => r[key] || 0));
  return `<div class="ed-bars" role="img" aria-label="${esc(label)}">${rows.map((r) => `<div class="ed-bar" title="Day ${r.day}: ${fmt(r[key])}"><i style="height:${Math.round(((r[key] || 0) / max) * 100)}%"></i><span>${r.day}</span></div>`).join('')}</div>`;
};
export const ECONOMY_DASHBOARD_STYLE = `#bankPanel .ed-sec{margin:0 0 18px}#bankPanel .ed-src{display:inline-block;margin-left:6px;padding:0 6px;border-radius:6px;font:600 11px 'Barlow Condensed',sans-serif;letter-spacing:.1em;vertical-align:middle}
#bankPanel .ed-verified{border:1px solid #4caf6a;color:#bff0c9;background:#173322}#bankPanel .ed-estimated{border:1px solid #c9a227;color:#f2d28b;background:#3a2d16}#bankPanel .ed-unavailable{border:1px solid #6a55a3;color:#c8b3ff;background:#1a1230}
#bankPanel .ed-bars{display:flex;align-items:flex-end;gap:3px;height:70px;margin:8px 0 2px}#bankPanel .ed-bar{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;min-width:10px}
#bankPanel .ed-bar i{display:block;width:100%;background:#8a5cff;border-radius:3px 3px 0 0;min-height:1px}#bankPanel .ed-bar span{font-size:10px;color:#9b8fb8}#bankPanel .ed-ok{color:#bff0c9}#bankPanel .ed-bad{color:#ffd0d5}
#bankPanel .ed-list{margin:0;padding-left:18px;font:400 15px/1.45 'Barlow',sans-serif;color:#e7e0f4}`;

export function economyDashboardHtml(model) {
  const m = model, t = m.treasury, r = m.residents;
  const status = m.status === 'reconciled' ? '<p class="ed-ok">Ledger reconciled: every check passed.</p>' : m.status === 'problem' ? `<div class="bp-warn"><p>${m.reconciliation.failed} reconciliation check(s) failed: see section 8.</p></div>` : '<p class="bp-note">Bank figures unavailable.</p>';
  const holders = { treasury: 'City treasury', businesses: 'Businesses', residents_checking: 'Residents · checking', residents_savings: 'Residents · savings', other: 'Other' };
  const parts = [
    m.source?.kind === 'fixture' ? `<div class="bp-warn ed-fixture"><p>TEST FIXTURE, not production data: ${esc(m.source.label)}</p></div>`
      : m.source?.kind === 'preview' ? `<div class="bp-warn ed-preview"><p>PREVIEW BANK, not production: synthetic test data from ${esc(m.source.label)}</p></div>`
      : m.source?.kind === 'live' ? `<p class="bp-note ed-live">Live bank figures from ${esc(m.source.label)}.</p>` : '<p class="bp-note">Data source not stated.</p>',
    m.errors.length ? `<div class="bp-warn"><p>Some reports could not be loaded (their sections show as unavailable): ${m.errors.map(esc).join('; ')}</p></div>` : '',
    `${status}<p class="bp-note">As of ${esc(m.asOf ? new Date(m.asOf).toLocaleString() : '—')} · all figures in simulated sNERDIE (never withdrawable).</p>`,
    section(1, 'Treasury and circulating balances', t.source, t.source === SOURCE.unavailable ? '<p class="bp-note">Unavailable.</p>' : `<div class="bp-grid">
      <div class="bp-stat"><b>Treasury</b><span>${fmt(t.balance)}</span></div><div class="bp-stat"><b>Issued</b><span>${fmt(t.issued)}</span></div>
      ${Object.entries(t.holders).filter(([k]) => k !== 'treasury').map(([k, v]) => `<div class="bp-stat"><b>${esc(holders[k] || k)}</b><span>${fmt(v)}</span></div>`).join('')}
      <div class="bp-stat"><b>Issued − held</b><span>${esc(t.differenceBaseUnits)} base units</span></div></div>`),
    section(2, 'Resident employment and earnings', r.source, r.source === SOURCE.unavailable ? '<p class="bp-note">Unavailable.</p>' : `<div class="bp-grid">
      <div class="bp-stat"><b>Employed (latest day)</b><span>${fmt(r.employed)} / ${fmt(r.count)}</span></div><div class="bp-stat"><b>Wages paid, all time</b><span>${fmt(r.wagesTotal)}</span></div>
      <div class="bp-stat"><b>Spent at businesses</b><span>${fmt(num(r.spending.purchase))}</span></div><div class="bp-stat"><b>Rent paid</b><span>${fmt(num(r.spending.rent))}</span></div>
      <div class="bp-stat"><b>Checking · savings</b><span>${fmt(r.checking)} · ${fmt(r.savings)}</span></div><div class="bp-stat"><b>Residents with no money</b><span>${fmt(r.withNoMoney)}</span></div></div>
      <p class="bp-note">Wages by city day</p>${bars(r.wagesByDay, 'wages', 'Wages by city day')}`),
    section(3, 'Business sales and profitability', m.businesses.rows.length ? SOURCE.estimated : SOURCE.unavailable, `<div class="bp-scroll"><table class="bp-table"><thead><tr><th>Business</th><th>Sales</th><th>Revenue</th><th>Costs</th><th>Operating result</th><th>Swept to treasury</th><th>Balance</th></tr></thead><tbody>
      ${m.businesses.rows.map((b) => `<tr><td>${esc(b.id.replace('biz_', '').replaceAll('_', ' '))}</td><td>${fmt(b.salesRecorded)}</td><td>${fmt(b.revenue)}</td><td>${fmt(b.costs)}</td><td>${fmt(b.operatingResult)}</td><td>${fmt(b.sweptToTreasury)}</td><td>${fmt(b.balance)}</td></tr>`).join('')}</tbody></table></div>
      <p class="bp-note">${esc(m.businesses.note || '')} Revenue, costs and balances are VERIFIED ledger figures.</p>`),
    section(4, 'Daily economic activity', m.daily.source, m.daily.days.length ? `<div class="bp-scroll"><table class="bp-table"><thead><tr><th>Day</th><th>Sales</th><th>Purchases</th><th>Wages</th><th>Shifts</th><th>Rent paid</th><th>Roots visits</th><th>Deciders</th><th>Unmet</th><th>Treasury close</th></tr></thead><tbody>
      ${[...m.daily.days].reverse().map((d) => `<tr><td>${d.day}</td><td>${fmt(d.sales)}</td><td>${fmt(d.purchases)}</td><td>${fmt(num(d.wages))}</td><td>${fmt(d.shifts)}</td><td>${fmt(d.rentPaid)}</td><td>${fmt(d.rootsVisits)}</td><td>${fmt(d.deciders)}</td><td>${fmt(d.unmetDemand)}</td><td>${fmt(num(d.treasuryClose))}</td></tr>`).join('')}</tbody></table></div>` : '<p class="bp-note">Unavailable.</p>'),
    section(5, 'Resident spending decisions and reasons', m.decisions.source, m.decisions.items.length ? `<p class="bp-note">City day ${fmt(m.decisions.day)} · ${fmt(m.decisions.participants)} residents decide for themselves (the latest decisions).</p>
      <ul class="ed-list">${m.decisions.items.map((d) => `<li><b>${esc(d.resident || d.residentId)}</b>: ${esc(d.reason)}</li>`).join('')}</ul>
      ${m.decisions.managers.length ? `<p class="bp-note">Managers</p><ul class="ed-list">${m.decisions.managers.map((x) => `<li><b>${esc(String(x.business).replace('biz_', '').replaceAll('_', ' '))}</b>: ${esc(x.reason)}</li>`).join('')}</ul>` : ''}` : '<p class="bp-note">No decisions recorded today yet.</p>'),
    section(6, 'Top unmet consumer demand', m.demand.source, m.demand.source === SOURCE.unavailable ? '<p class="bp-note">Unavailable.</p>' : m.demand.top.length
      ? `<div class="bp-scroll"><table class="bp-table"><thead><tr><th>Item</th><th>Category</th><th>Business</th><th>Refused requests</th><th>Quantity</th><th>Last</th></tr></thead><tbody>${m.demand.top.map((x) => `<tr><td>${esc(x.product)}</td><td>${esc(x.category)}</td><td>${esc(String(x.businessId).replace('biz_', '').replaceAll('_', ' '))}</td><td>${fmt(x.unfulfilledRequests)}</td><td>${fmt(x.unfulfilledQuantity)}</td><td>${esc(new Date(x.lastAt).toLocaleString())}</td></tr>`).join('')}</tbody></table></div>`
      : `<p>No unmet demand recorded: residents could buy everything they tried to buy (city days ${fmt(m.demand.fromDay)}–${fmt(m.demand.toDay)}; ${fmt(m.demand.totals.fulfilledRequests)} purchases fulfilled, ${fmt(m.demand.totals.unfulfilledEver)} refused ever).</p>`),
    section(7, 'Roots Lounge attendance', m.roots.source, m.roots.days.length ? `<p class="bp-note">${fmt(m.roots.totalVisits)} resident visits in these days.</p>${bars(m.roots.days, 'visits', 'Roots visits by city day')}` : '<p class="bp-note">Unavailable.</p>'),
    section(8, 'Ledger reconciliation', m.reconciliation.source, m.reconciliation.checks.length ? `<p class="bp-note">${fmt(m.reconciliation.entries)} ledger entries (last ${fmt(m.reconciliation.lastSeq)}).</p><div class="bp-scroll"><table class="bp-table"><thead><tr><th>Check</th><th>Result</th><th>Observed</th><th>Expected</th></tr></thead><tbody>
      ${m.reconciliation.checks.map((c) => `<tr><td>${esc(c.label)}</td><td class="${c.status === 'pass' ? 'ed-ok' : 'ed-bad'}">${c.status === 'pass' ? 'Pass' : 'FAIL'}</td><td>${esc(c.observed)}</td><td>${esc(c.expected)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="bp-note">Unavailable.</p>'),
    section('·', 'Room economy model beside the bank', m.room.available ? SOURCE.estimated : SOURCE.unavailable, m.room.available ? `<p class="bp-note">${esc(m.room.note)}</p><div class="bp-scroll"><table class="bp-table"><thead><tr><th>Item</th><th>This room</th><th>Bank</th><th>Note</th></tr></thead><tbody>
      ${m.room.rows.map((x) => `<tr><td>${esc(x.item)}</td><td>${fmt(x.room)}</td><td>${fmt(x.bank)}</td><td style="text-align:left;white-space:normal">${esc(x.note)}</td></tr>`).join('')}</tbody></table></div>` : `<p class="bp-note">${esc(m.room.note)}</p>`),
    section('·', 'Not recorded yet', SOURCE.unavailable, `<ul class="ed-list">${m.unavailable.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`),
  ];
  return parts.join('');
}
