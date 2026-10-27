// Phase 2.1 bank panel: teller conversations, the City Economy Board, the market terminals, and the founder
// suite notice. The model (BankReader) is plain data the tests drive; the panel draws it when there is a
// document. It shows only what the requester may see: today every visitor is a temporary player, so tellers
// give bank information and city-level figures, never anyone's personal account.
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
@media (max-width:620px){#bankPanel .bp-grid{grid-template-columns:1fr}}
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

export class BankPanel {
  constructor({ cityService = null, onOpen = () => {}, document: doc = globalThis.document } = {}) {
    Object.assign(this, { cityService, onOpen, doc }); this.reader = new BankReader(); this.isOpen = false;
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
    root.addEventListener('click', (e) => { const t = e.target.closest('[data-topic]'); if (t) { this.reader.topic(t.dataset.topic); this.render(); } });
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
    return `<p>The Founder Executive Suite is reserved for the founder's oversight of the treasury, residents, businesses, payroll, ledger integrity and security alerts.</p><div class="bp-warn"><p>Administration never happens inside the game. The founder's dashboard is a separate application with its own secure sign-in.</p></div>`;
  }
  render() {
    if (!this.el || !this.reader.view) return;
    const v = this.reader.view, titles = { teller: [`Teller ${v.id?.slice(-1) || ''}`, 'Bank services'], board: ['City Economy Board', 'Live ledger figures'], market: ['Market Intelligence', 'Historical archive'], restricted: ['Founder Executive Suite', 'Restricted'] };
    const [title, kicker] = titles[v.kind]; this.el.title.textContent = title; this.el.kicker.textContent = kicker; this.el.main.innerHTML = this.html();
  }
}
