// Phase 2.1 bank panel: teller conversations, the City Economy Board, the market terminals, and the founder
// suite notice. The model (BankReader) is plain data the tests drive; the panel draws it when there is a
// document. It shows only what the requester may see: today every visitor is a temporary player, so tellers
// give bank information and city-level figures, never anyone's personal account.
import { economicMinuteOfDay, scheduledPlace } from './resident-schedule.js';
const STYLE = `
#bankPanel{position:fixed;inset:0;z-index:60;display:none;align-items:center;justify-content:center;background:rgba(5,3,10,.66);font-family:'Barlow Condensed',system-ui,sans-serif;color:#f3eefc;padding:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left))}
#bankPanel.on{display:flex}
#bankPanel .bp-card{background:linear-gradient(180deg,#120c22,#08060f);border:2px solid #c9a227;border-radius:14px;box-shadow:0 18px 60px rgba(0,0,0,.6),0 0 40px rgba(138,61,255,.18);width:min(820px,100%);max-height:100%;display:flex;flex-direction:column;overflow:hidden}
#bankPanel .bp-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;border-bottom:1px solid #3a2d5c}
#bankPanel .bp-kicker{font-size:13px;letter-spacing:.18em;color:#c8b3ff;text-transform:uppercase}
#bankPanel h2{margin:2px 0 0;font-size:24px;letter-spacing:.04em;color:#f2d28b}
#bankPanel .bp-x{flex:none;background:none;border:1px solid #5b4a86;color:#f3eefc;border-radius:8px;width:44px;height:44px;font-size:22px;cursor:pointer}
#bankPanel .bp-main{overflow:auto;padding:16px 18px}
#bankPanel p{margin:0 0 12px;font:400 17px/1.5 'Barlow',system-ui,sans-serif;color:#e7e0f4;max-width:68ch}
#bankPanel .bp-note{font-size:14px;color:#b7a9db}
#bankPanel .bp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0}
#bankPanel .bp-stat{background:#1a1230;border:1px solid #3a2d5c;border-radius:10px;padding:10px 12px}
#bankPanel .bp-stat b{display:block;font-size:13px;letter-spacing:.12em;color:#9b8fb8;font-weight:600}
#bankPanel .bp-stat span{font-size:24px;font-variant-numeric:tabular-nums;color:#fff}
#bankPanel .bp-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
#bankPanel .bp-b{min-height:44px;padding:0 16px;border-radius:9px;border:1px solid #6a55a3;background:#2a1d4a;color:#fff;font:600 16px 'Barlow Condensed',sans-serif;letter-spacing:.05em;cursor:pointer}
#bankPanel .bp-b.on{border-color:#e8c55a;background:#3a2d16}
#bankPanel .bp-warn{background:#3a1820;border:1px solid #b8434f;border-radius:10px;padding:10px 12px;margin:10px 0}
#bankPanel .bp-b:focus-visible,#bankPanel .bp-x:focus-visible{outline:3px solid #e8c55a;outline-offset:1px}
#bankPanel [role=tablist]{margin-bottom:12px}
#bankPanel h3{margin:18px 0 8px;font-size:18px;letter-spacing:.06em;color:#f2d28b}
#bankPanel .bp-res{display:grid;grid-template-columns:3ch minmax(0,1fr) auto;gap:2px 12px;align-items:center;width:100%;margin:0 0 6px;padding:10px 12px;background:#1a1230;border:1px solid #3a2d5c;border-radius:10px;color:#fff;text-align:left;cursor:pointer;font:inherit}
#bankPanel .bp-res:hover{border-color:#6a55a3}
#bankPanel .bp-res .no{color:#9b8fb8;font-variant-numeric:tabular-nums}
#bankPanel .bp-res .who b{display:block;font-size:18px;font-weight:600}
#bankPanel .bp-res small{display:block;font:400 14px/1.35 'Barlow',sans-serif;color:#b7a9db}
#bankPanel .bp-res .money{text-align:right;font-variant-numeric:tabular-nums;font-size:17px}
#bankPanel .bp-chip{display:inline-block;margin-left:6px;padding:0 7px;border-radius:999px;border:1px solid #4caf6a;background:#173322;color:#bff0c9;font-size:12px;letter-spacing:.08em;vertical-align:2px}
#bankPanel .bp-chip.warn{border-color:#b8434f;background:#3a1820;color:#ffd0d5}
#bankPanel .bp-scroll{overflow-x:auto}
#bankPanel .bp-table{width:100%;border-collapse:collapse;font:400 15px 'Barlow',sans-serif;font-variant-numeric:tabular-nums}
#bankPanel .bp-table th,#bankPanel .bp-table td{padding:6px 8px;border-bottom:1px solid #2c2247;text-align:right;white-space:nowrap}
#bankPanel .bp-table th{color:#9b8fb8;font-weight:600;font-size:13px;letter-spacing:.08em}
#bankPanel .bp-table th:first-child,#bankPanel .bp-table td:first-child{text-align:left}
#bankPanel .bp-log p{margin:0 0 6px;font-size:15px}
#bankPanel .bp-spark{display:block;width:100%;height:64px;background:#1a1230;border:1px solid #3a2d5c;border-radius:10px}
@media (max-width:620px){#bankPanel .bp-grid{grid-template-columns:1fr}#bankPanel .bp-grid-2{grid-template-columns:repeat(2,minmax(0,1fr))}#bankPanel .bp-grid-2 .bp-stat span{font-size:20px}#bankPanel .bp-res{grid-template-columns:3ch minmax(0,1fr)}#bankPanel .bp-res .money{grid-column:2;text-align:left}}
`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const TELLER_TOPICS = Object.freeze([
  { id: 'services', label: 'Bank services', text: 'The Nerdie City Bank keeps a permanent account for every resident of the city. Wages, purchases, rent and savings are recorded in a ledger that can only grow: nothing is ever edited, and mistakes are corrected with a new, opposite entry.' },
  { id: 'balances', label: 'Balances', text: 'A balance is the sum of everything that has moved in and out of an account. The bank never stores a balance it cannot rebuild from the ledger.' },
  { id: 'history', label: 'Transaction history', text: 'Every account has a full history: each wage, purchase, rent payment and transfer, in order, with the running balance after it.' },
  { id: 'savings', label: 'Savings', text: 'Residents keep a savings account beside their checking account and aim to save a quarter of every wage.' },
  { id: 'income', label: 'Employment income', text: 'Residents earn wages for verified shifts at city jobs and businesses. A shift can only ever be paid once.' },
  { id: 'rent', label: 'Rent', text: 'Residents of North Court pay rent weekly from their checking accounts, once their first paycheck has arrived.' },
  { id: 'currency', label: 'Simulated NERDIE', text: 'The city runs on Simulated NERDIE (sNERDIE). It is not the NERDIE token, cannot be withdrawn, and has no value outside the city. Real NERDIE comes to the bank only in a later phase, backed by tokens held on-chain.' },
  { id: 'accounts', label: 'Open an account', text: 'Permanent player accounts open first for holders of an original Nerdie Syndicate character NFT, in a later phase. Visitors can explore and learn here, but no personal account is created for a visitor.' },
]);

export class BankReader {
  constructor() { this.view = null; }
  open(station) {
    if (station.kind === 'teller') this.view = { kind: 'teller', id: station.id, topic: 'services' };
    else if (station.kind === 'board') this.view = { kind: 'board' };
    else if (station.kind === 'market') this.view = { kind: 'market', id: station.id };
    else if (station.kind === 'restricted') this.view = { kind: 'restricted' };
    else this.view = null;
    return this.view;
  }
  topic(id) { if (this.view?.kind === 'teller' && TELLER_TOPICS.some((t) => t.id === id)) this.view.topic = id; }
  close() { this.view = null; }
}

const ECONOMY_ROWS = [['issued', 'sNERDIE issued'], ['treasury', 'Treasury'], ['population', 'Residents'], ['employed', 'Employed'], ['wagesPaid', 'Wages paid'], ['rentCollected', 'Rent collected'],
  ['activeBusinesses', 'Active businesses'], ['businessSales', 'Business sales'], ['businessOperatingExpenses', 'Business expenses'], ['cityOperatingExpenses', 'City expenses'], ['savings', 'Aggregate savings']];

const n = (v) => (v == null ? '—' : esc(Number(v).toLocaleString('en-US')));

// Resident oversight helpers: city minutes as clock times, and the resident list's sort orders.
const clockTime = (minute) => { const m = ((minute % 1440) + 1440) % 1440, h = Math.floor(m / 60); return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
const cityWhen = (minute) => (minute == null ? '—' : `Day ${Math.floor(minute / 1440)} · ${clockTime(minute)}`);
const shiftText = (job) => `${clockTime(job.shiftStartMinute)}–${clockTime(job.shiftStartMinute + job.shiftDurationMinutes)}`;
const words = (s) => esc(String(s ?? '').replaceAll('_', ' ').replaceAll('-', ' '));
// Where a resident is right now, by the same schedule the city's residents follow (real Pacific time).
const PLACES = Object.freeze({ 'nerdie-city-bank': 'Nerdie City Bank', 'city-hall': 'City Hall', 'academy-library': 'the Library', 'nerdie-arms': 'Ammo', 'central-park': 'Central Park', 'corner-market': 'Corner Market', 'north-court': 'North Court' });
const place = (id) => (PLACES[id] ? esc(PLACES[id]) : words(id));
const ACTIVITY_WORDS = Object.freeze({ home: 'At home in', commute: 'On the way to work at', work: 'Working at', shop: 'Shopping at', social: 'Hanging out at', leisure: 'Relaxing at' });
const nowText = (r, minute) => { const at = scheduledPlace(r.job, minute); return `${esc(ACTIVITY_WORDS[at.activity] || at.activity)} ${place(at.locationId)}`; };
const wealth = (r) => Number(r.checking || 0) + Number(r.savings || 0);
export const RESIDENT_SORTS = Object.freeze({
  no: { label: 'No.', compare: (a, b) => a.residentNo - b.residentNo },
  wealth: { label: 'Wealth', compare: (a, b) => wealth(b) - wealth(a) },
  checking: { label: 'Checking', compare: (a, b) => Number(b.checking) - Number(a.checking) },
  savings: { label: 'Savings', compare: (a, b) => Number(b.savings) - Number(a.savings) },
  earned: { label: 'Earned', compare: (a, b) => (b.lifetime?.wages || 0) - (a.lifetime?.wages || 0) },
  shift: { label: 'Shift', compare: (a, b) => (a.job?.shiftStartMinute ?? 1e9) - (b.job?.shiftStartMinute ?? 1e9) },
});
const FOUNDER_START = Object.freeze({ status: 'idle', data: null, error: null, tab: 'overview', residents: null, sort: 'no', selected: null, history: null });

export class BankPanel {
  // founderAccess: { signIn(), refresh(): Promise<overview body>, residents(): Promise<{ residents }>,
  // resident(id): Promise<{ history }> } or null. residents/resident are optional (older builds).
  constructor({ cityService = null, founderAccess = null, onOpen = () => {}, document: doc = globalThis.document, now = () => Date.now() } = {}) {
    Object.assign(this, { cityService, founderAccess, onOpen, doc, now }); this.reader = new BankReader(); this.isOpen = false;
    this.founder = { ...FOUNDER_START };
  }
  // Actions: signin, refresh, tab:overview|residents, sort:<RESIDENT_SORTS key>, resident:<res_0001>, back.
  async founderAction(action) {
    if (!this.founderAccess || this.founder.status === 'working') return;
    const [kind, arg] = String(action).split(':'), f = this.founder, access = this.founderAccess;
    if (kind === 'tab') {
      f.tab = arg === 'residents' && access.residents ? 'residents' : 'overview'; f.selected = null; f.history = null; f.error = null;
      if (f.tab === 'residents' && !f.residents) return this.#founderLoad(async () => { f.residents = (await access.residents()).residents; });
      return this.render();
    }
    if (kind === 'sort') { f.sort = RESIDENT_SORTS[arg] ? arg : 'no'; return this.render(); }
    if (kind === 'back') { f.selected = null; f.history = null; f.error = null; return this.render(); }
    if (kind === 'resident' && access.resident) return this.#founderLoad(async () => { f.history = (await access.resident(arg)).history; f.selected = arg; });
    // Sign in, or refresh whatever is on screen.
    const refreshing = kind === 'refresh' && !!f.data;
    return this.#founderLoad(async () => {
      f.data = refreshing ? await access.refresh() : await access.signIn();
      if (refreshing && f.tab === 'residents') {
        f.residents = (await access.residents()).residents;
        if (f.selected) f.history = (await access.resident(f.selected)).history;
      }
    }, !refreshing);
  }
  // A failed sign-in returns to the sign-in screen; a failed read keeps what is on screen and says why.
  async #founderLoad(work, signingIn = false) {
    this.founder.status = 'working'; this.founder.error = null; this.render();
    try { await work(); this.founder.status = 'ok'; }
    catch (error) {
      const message = error?.message || 'Founder sign-in did not complete.';
      if (signingIn || !this.founder.data) this.founder = { ...FOUNDER_START, status: 'error', error: message };
      else { this.founder.status = 'ok'; this.founder.error = message; }
    }
    this.render();
  }
  // Every resident: job and shift (and whether they are on it now), balances, lifetime wages, rent trouble.
  #residentsHtml() {
    const f = this.founder, list = [...(f.residents || [])].sort(RESIDENT_SORTS[f.sort]?.compare || RESIDENT_SORTS.no.compare);
    if (!list.length) return '<p>No residents loaded yet. Press Refresh.</p>';
    const minute = economicMinuteOfDay(this.now()), onShift = list.filter((r) => r.job?.onShiftNow).length, employed = list.filter((r) => r.job).length;
    const sorts = `<div class="bp-actions"><span class="bp-note" style="align-self:center">Sort</span>${Object.entries(RESIDENT_SORTS).map(([id, s]) => `<button type="button" class="bp-b${f.sort === id ? ' on' : ''}" data-founder="sort:${id}" aria-pressed="${f.sort === id}">${esc(s.label)}</button>`).join('')}</div>`;
    const rows = list.map((r) => {
      const chips = `${r.job?.onShiftNow ? '<span class="bp-chip">ON SHIFT</span>' : ''}${r.housing?.status === 'arrears' ? '<span class="bp-chip warn">RENT ARREARS</span>' : ''}`;
      const job = r.job ? `${esc(r.job.title)} · ${place(r.job.workplaceId)} · ${shiftText(r.job)}` : 'No permanent job (municipal temp work rotation)';
      return `<button type="button" class="bp-res" data-founder="resident:${esc(r.residentId)}" aria-label="${esc(r.name)}, open history">
        <span class="no">${esc(r.residentNo)}</span>
        <span class="who"><b>${esc(r.name)}${chips}</b><small>${job}</small><small>${nowText(r, minute)}</small></span>
        <span class="money">${n(r.checking)} checking<small>${n(r.savings)} savings · ${n(r.lifetime?.wages)} earned</small></span>
      </button>`;
    }).join('');
    return `<p class="bp-note">${n(list.length)} residents · ${n(employed)} with a permanent job · ${n(onShift)} on shift now · amounts in sNERDIE</p>${sorts}${rows}`;
  }
  // One resident: who they are, their totals, balance over time, daily records, activity and ledger lines.
  #residentHtml(h) {
    const r = h.resident || {}, days = h.days || [], activity = (h.activity || []).slice(0, 25), ledger = (h.ledger || []).slice(0, 25), l = r.lifetime || {};
    const job = r.job ? `${esc(r.job.title)} at ${place(r.job.workplaceId)} · ${shiftText(r.job)} · ${n(r.job.wage)} a shift${r.job.onShiftNow ? '<span class="bp-chip">ON SHIFT</span>' : ''}` : 'No permanent job · municipal temp work rotation';
    const stats = [['Checking', n(r.checking)], ['Savings', n(r.savings)], ['Lifetime wages', n(l.wages)], ['Shifts · temp shifts', `${n(l.shifts)} · ${n(l.tempShifts)}`],
      ['Spent · purchases', `${n(l.spent)} · ${n(l.purchases)}`], ['Rent paid · arrears', `${n(l.rentPaid)} · ${n(l.rentArrears)}`], ['Hunger · spending mood', `${n(r.state?.hunger)} · ${n(r.state?.discretionary)}`], ['Days on record', n(l.daysRecorded)]];
    const oldestFirst = [...days].reverse(), values = oldestFirst.map((d) => Number(d.checking) + Number(d.savings));
    let chart = '<p class="bp-note">The balance chart starts once two daily records exist. A record is taken for every resident at the end of each city day (11:59 PM Pacific).</p>';
    if (values.length >= 2) {
      const max = Math.max(...values, 1), min = Math.min(...values, 0), span = max - min || 1;
      const points = values.map((v, i) => `${((i / (values.length - 1)) * 296 + 2).toFixed(1)},${(58 - ((v - min) / span) * 54).toFixed(1)}`).join(' ');
      chart = `<svg class="bp-spark" viewBox="0 0 300 60" preserveAspectRatio="none" role="img" aria-label="Checking plus savings over ${values.length} days, from ${values[0]} to ${values.at(-1)} sNERDIE"><polyline points="${points}" fill="none" stroke="#e8c55a" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>
        <p class="bp-note">Checking + savings · day ${esc(oldestFirst[0].cityDay)} to day ${esc(oldestFirst.at(-1).cityDay)} · ${n(values[0])} → ${n(values.at(-1))}</p>`;
    }
    const dayRows = days.slice(0, 30).map((d) => `<tr><td>Day ${esc(d.cityDay)}</td><td>${n(d.checking)}</td><td>${n(d.savings)}</td><td>${n(d.earned)}</td><td>${n(d.spent)}</td><td>${n(d.shifts)}</td><td>${d.rentStatus ? words(d.rentStatus) : '—'}</td><td>${n(d.hunger)}</td></tr>`).join('');
    const detail = (details) => Object.entries(details || {}).map(([k, v]) => `${words(k)} ${esc(typeof v === 'object' ? JSON.stringify(v) : v)}`).join(' · ');
    return `<div class="bp-actions"><button type="button" class="bp-b" data-founder="back">← All residents</button></div>
      <h3>${esc(r.name)} · resident ${esc(r.residentNo)}</h3>
      <p class="bp-note">${job}<br>${nowText(r, economicMinuteOfDay(this.now()))} · home ${words(r.housing?.propertyId)} (${words(r.housing?.status)})</p>
      <div class="bp-grid bp-grid-2">${stats.map(([k, v]) => `<div class="bp-stat"><b>${esc(k)}</b><span>${v}</span></div>`).join('')}</div>
      <h3>Balance over time</h3>${chart}
      <h3>Daily record</h3>${dayRows ? `<div class="bp-scroll"><table class="bp-table"><thead><tr><th>Day</th><th>Checking</th><th>Savings</th><th>Earned</th><th>Spent</th><th>Shifts</th><th>Rent</th><th>Hunger</th></tr></thead><tbody>${dayRows}</tbody></table></div>` : '<p class="bp-note">No daily records yet: the first is taken at the end of today (11:59 PM Pacific).</p>'}
      <h3>Activity</h3><div class="bp-log">${activity.length ? activity.map((a) => `<p>${esc(cityWhen(a.cityMinute))} · <b>${words(a.kind)}</b> · ${words(a.locationId)}${a.details && Object.keys(a.details).length ? ` · ${detail(a.details)}` : ''}</p>`).join('') : '<p class="bp-note">No activity recorded yet.</p>'}</div>
      <h3>Ledger</h3><div class="bp-log">${ledger.length ? ledger.map((e) => `<p>#${esc(e.seq)} · ${words(e.kind)} · ${words(e.account)} <b>${Number(e.amount) > 0 ? '+' : ''}${n(e.amount)}</b>${e.memo ? ` · ${esc(e.memo)}` : ''} · ${esc(new Date(e.occurredAt).toLocaleString())}</p>`).join('') : '<p class="bp-note">No ledger entries yet: every account starts at zero, with no free money.</p>'}</div>`;
  }
  #founderHtml() {
    const f = this.founder;
    if (!this.founderAccess) return `<p>The Founder Executive Suite is reserved for the founder's oversight of the treasury, residents, businesses, payroll, ledger integrity and security alerts.</p><div class="bp-warn"><p>Founder sign-in is not available in this build.</p></div>`;
    if (f.status === 'working') return `<p>Waiting for your wallet…</p><p class="bp-note">Approve the sign-in message in your wallet. It does not move funds or approve any transaction.</p>`;
    if (f.status === 'ok' && f.data) {
      const o = f.data.overview || {}, e = o.economy || {}, rent = o.rent || {}, sim = o.simulation || {};
      const temp = (o.tempWork || []).reduce((sum, p) => sum + (p.daily_slots || 0), 0);
      const alerts = (o.alerts || []).filter(Boolean);
      const day = sim.last_processed_minute != null ? Math.floor(sim.last_processed_minute / 1440) : null;
      const stats = [['Treasury', n(e.treasury)], ['sNERDIE issued', n(e.issued)], ['Ledger integrity', o.integrity?.ok ? 'Verified' : 'PROBLEM'], ['Ledger entries', n(e.entries)],
        ['Residents', n(e.population)], ['Employed', n(e.employed)], ['Temp work slots a day', n(temp)], ['Wages paid', n(e.wagesPaid)],
        ['Rent paid · arrears', `${n(rent.paid)} · ${n(rent.arrears)}`], ['Business sales', n(e.businessSales)], ['Aggregate savings', n(e.savings)], ['Economic day', day == null ? '—' : n(day)]];
      const tab = f.tab === 'residents' ? 'residents' : 'overview';
      const tabs = this.founderAccess.residents ? `<div class="bp-actions" role="tablist">${[['overview', 'Overview'], ['residents', 'Residents']].map(([id, label]) => `<button type="button" role="tab" aria-selected="${tab === id}" class="bp-b${tab === id ? ' on' : ''}" data-founder="tab:${id}">${label}</button>`).join('')}</div>` : '';
      const overview = `${alerts.length ? `<div class="bp-warn"><p>Alerts: ${alerts.map((a) => esc(String(a).replaceAll('_', ' '))).join(', ')}</p></div>` : '<p class="bp-note">No alerts.</p>'}
        ${o.integrity && !o.integrity.ok ? `<div class="bp-warn"><p>Integrity problems: ${esc((o.integrity.problems || []).join('; '))}</p></div>` : ''}
        <div class="bp-grid">${stats.map(([k, v]) => `<div class="bp-stat"><b>${esc(k)}</b><span>${v}</span></div>`).join('')}</div>`;
      const body = tab === 'overview' ? overview : f.selected && f.history ? this.#residentHtml(f.history) : this.#residentsHtml();
      return `<p class="bp-note">Signed in as ${esc(f.data.founder)} · session ends ${esc(new Date(f.data.sessionExpiresAt).toLocaleTimeString())}</p>
        ${tabs}${f.error ? `<div class="bp-warn"><p>${esc(f.error)}</p></div>` : ''}${body}
        <div class="bp-actions"><button type="button" class="bp-b" data-founder="refresh">Refresh</button></div>`;
    }
    return `<p>The Founder Executive Suite is reserved for the founder's oversight of the treasury, residents, businesses, payroll, ledger integrity and security alerts.</p>
      ${f.status === 'error' ? `<div class="bp-warn"><p>${esc(f.error)}</p></div>` : ''}
      <div class="bp-actions"><button type="button" class="bp-b on" data-founder="signin">Sign in with founder wallet</button></div>
      <p class="bp-note">Connect your wallet with MY WALLET first. Your wallet will ask you to sign a one-time message; it never moves funds. Only the founder wallet is accepted.</p>`;
  }
  get open() { return this.isOpen; }
  openStation(station) { if (!this.reader.open(station)) return; this.isOpen = true; this.#ensureDom(); this.root?.classList.add('on'); this.render(); this.onOpen(true); }
  close() { if (!this.isOpen) return; this.reader.close(); this.isOpen = false; this.root?.classList.remove('on'); this.onOpen(false); }
  #ensureDom() {
    if (this.root || !this.doc) return;
    const d = this.doc, style = d.createElement('style'); style.textContent = STYLE; d.head.appendChild(style);
    const root = d.createElement('div'); root.id = 'bankPanel'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Nerdie City Bank');
    root.innerHTML = '<div class="bp-card"><div class="bp-head"><div><div class="bp-kicker"></div><h2></h2></div><button class="bp-x" type="button" aria-label="Close">×</button></div><div class="bp-main" aria-live="polite"></div></div>';
    d.body.appendChild(root); this.root = root;
    this.el = { kicker: root.querySelector('.bp-kicker'), title: root.querySelector('h2'), main: root.querySelector('.bp-main') };
    root.querySelector('.bp-x').addEventListener('click', () => this.close());
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-topic]'); if (t) { this.reader.topic(t.dataset.topic); this.render(); }
      const f = e.target.closest('[data-founder]'); if (f) this.founderAction(f.dataset.founder);
    });
    for (const type of ['keydown', 'keyup']) root.addEventListener(type, (e) => { if (e.code !== 'Escape') e.stopPropagation(); });
  }
  // The panel's HTML for the current view (also used by the tests, without a document).
  html() {
    const v = this.reader.view; if (!v) return '';
    if (v.kind === 'teller') {
      const t = TELLER_TOPICS.find((x) => x.id === v.topic);
      return `<p>${esc(t.text)}</p><div class="bp-actions">${TELLER_TOPICS.map((x) => `<button type="button" class="bp-b${x.id === v.topic ? ' on' : ''}" data-topic="${x.id}">${esc(x.label)}</button>`).join('')}</div>
        <p class="bp-note">You are visiting as a guest. Tellers never show personal account details to anyone but the account holder.</p>`;
    }
    if (v.kind === 'board') {
      const e = this.cityService?.economy?.() || { status: 'offline' };
      if (e.status !== 'ok') return `<p>The City Economy Board shows the city's real simulated economy, straight from the bank ledger: sNERDIE issued, the treasury, residents and jobs, wages, rent, business revenue, city spending and savings.</p><div class="bp-warn"><p>The City Service is not connected in this build, so no figures are shown. Nothing here is ever a placeholder number.</p></div>`;
      const events = (e.stats?.recentEvents || []).slice(0, 5);
      return `${e.demo ? `<div class="bp-warn"><p>${esc(e.demo.label)} · phase ${e.demo.phase + 1} of 4 · ${e.demo.complete ? 'complete cycle' : 'advancing automatically'} · persisted across reloads. No hosted database writes.</p></div>` : ''}<p class="bp-note">Simulated NERDIE (sNERDIE) · as of ${esc(new Date(e.asOf).toUTCString())}</p><div class="bp-grid">${ECONOMY_ROWS.map(([k, label]) => `<div class="bp-stat"><b>${esc(label)}</b><span>${esc(e.stats?.[k] ?? '—')}</span></div>`).join('')}</div>${events.length ? `<p class="bp-note">Recent city economic events</p>${events.map((event) => `<p>${esc(String(event.kind || '').replaceAll('_', ' '))} · ${esc(event.location_id || 'city')} · city minute ${esc(event.city_minute)}</p>`).join('')}` : ''}`;
    }
    if (v.kind === 'market') {
      const m = this.cityService?.market?.() || { status: 'offline' };
      if (m.status !== 'ok') return `<p>Market intelligence from the Nerdie Blaq trading bots: trends and indicators, signals and their confidence, past outcomes, and bot performance.</p><div class="bp-warn"><p>The historical archive was last audited on 5 June 2026 and is unavailable in this session. No market values are shown; it is never live and never substitutes placeholder prices.</p></div>`;
      return `${m.stale ? '<div class="bp-warn"><p>Historical archive — these are not live prices or current trading recommendations.</p></div>' : ''}<p class="bp-note">Historical · last recorded ${esc(m.lastRecorded)}</p>${(m.lines || []).map((l) => `<p>${esc(l)}</p>`).join('')}`;
    }
    return this.#founderHtml();
  }
  render() {
    if (!this.el || !this.reader.view) return;
    const v = this.reader.view, titles = { teller: [`Teller ${v.id?.slice(-1) || ''}`, 'Bank services'], board: ['City Economy Board', 'Live ledger figures'], market: ['Market Intelligence', 'Historical archive'], restricted: ['Founder Executive Suite', 'Restricted'] };
    const [title, kicker] = titles[v.kind]; this.el.title.textContent = title; this.el.kicker.textContent = kicker; this.el.main.innerHTML = this.html();
    // A new view (another station, tab or resident) starts at the top; a refresh keeps the scroll position.
    const viewKey = `${v.kind}:${v.id || ''}:${this.founder.tab}:${this.founder.selected || ''}`;
    if (viewKey !== this.viewKey) { this.el.main.scrollTop = 0; this.viewKey = viewKey; }
  }
}
