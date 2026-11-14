// NC Milestone 10: the Founder Command Center. A private, read-only, full-screen view of the whole city for the signed-in founder, opened
// from the Founder Executive Suite in the bank. Every view comes from the City Service's /v1/founder/command/* (founder session checked on
// the server, every view logged there). Nothing here can change a balance, a record, a token or a wallet: there are no write controls.
// Recorded facts and inferred explanations are labelled separately.
//
// load(view, { target, params }): Promise<{ data, health? }>   (city-service-client founderCommand)
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const num = (v) => (v === null || v === undefined || v === '' ? '—' : Number(v).toLocaleString('en-US'));
const idLink = (id, label) => (/^(res_|ply_|org_)/.test(id || '') ? `<button type="button" class="fcc-link" data-open="${esc(id)}">${esc(label || id)}</button>` : esc(label || id || '—'));
const table = (cols, rows, empty = 'Nothing recorded.') => !rows?.length ? `<p class="fcc-empty">${esc(empty)}</p>`
  : `<div class="fcc-scroll"><table class="fcc-t"><thead><tr>${cols.map(([h]) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map(([, f]) => `<td>${f(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const kv = (obj) => `<dl class="fcc-kv">${Object.entries(obj || {}).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${typeof v === 'object' && v !== null ? `<code>${esc(JSON.stringify(v))}</code>` : esc(v)}</dd>`).join('')}</dl>`;
const card = (title, body) => `<section class="fcc-card"><h3>${esc(title)}</h3>${body}</section>`;
const bars = (series, key, label) => { const max = Math.max(1, ...series.map((s) => Math.abs(Number(s[key]) || 0))); return `<div class="fcc-bars" role="img" aria-label="${esc(label)}">${series.map((s) => `<span title="${esc(`${s.day ?? s.label}: ${s[key]}`)}" style="height:${Math.round((Math.abs(Number(s[key]) || 0) / max) * 100)}%"></span>`).join('')}</div>`; };

export const COMMAND_TABS = Object.freeze([
  ['overview', 'Overview'], ['economy', 'Economy'], ['residents', 'Residents'], ['organizations', 'Organizations'], ['territory', 'Gangs & territory'], ['leadership', 'Leadership'],
  ['businesses', 'Businesses'], ['property', 'Property'], ['nfts', 'Business NFTs'], ['ledger', 'Ledger'], ['events', 'Events'], ['health', 'Health & switches'],
]);

// An inferred reason for a departure, from the recorded facts (always labelled as inference in the view).
export function inferDeparture(d) {
  if (d.action === 'removed') return `Removed by ${d.by || 'an officer'}.`;
  const facts = d.facts || [], betrayal = facts.find((f) => f.kind === 'betrayed'), conflict = facts.find((f) => f.kind === 'conflict'), goal = facts.find((f) => f.kind === 'goal_change');
  if (betrayal) return `Likely left after a betrayal by ${betrayal.subject || 'someone in the organization'}.`;
  if (d.ambitionAtExit === 'independence' || goal) return 'Likely left as their ambitions turned elsewhere.';
  if ((d.loyaltyAtExit ?? 100) < 15) return 'Likely left with loyalty worn down.';
  if (conflict) return 'Likely left after trouble connected to the organization.';
  return 'No recorded cause; the decision was their own.';
}
export function inferTerritory(events) {
  const by = {}; for (const e of events || []) { (by[e.org] ||= { gained: 0, lost: 0, kinds: {} }); if (e.applied > 0) by[e.org].gained += e.applied; else by[e.org].lost -= e.applied; by[e.org].kinds[e.kind] = (by[e.org].kinds[e.kind] || 0) + 1; }
  return Object.entries(by).map(([org, s]) => `${org}: +${s.gained} / -${s.lost} (mostly ${Object.entries(s.kinds).sort((a, b) => b[1] - a[1])[0]?.[0] || 'nothing'})`).join('; ') || 'No territory activity recorded.';
}

export function renderView(view, data, extra = {}) {
  const d = data || {};
  switch (view) {
    case 'overview': return card('City', kv({ 'Total supply (sNERDIE)': num(d.supply), residents: num(d.population?.residents), players: num(d.population?.players), employed: num(d.population?.employed), organizations: num(d.organizations), gangs: num(d.gangs) }))
      + card('Where the money is', table([['Account class', (r) => esc(r[0])], ['sNERDIE', (r) => num(r[1])]], Object.entries(d.accounts || {})))
      + card('Reconciliation (every check)', table([['Ledger', (r) => esc(r[0])], ['Passing', (r) => (r[1] ? '✓ yes' : '✗ NO')]], Object.entries(d.reconciliation || {})))
      + card('City treasury flows, last 7 days', table([['Kind', (r) => esc(r[0])], ['sNERDIE', (r) => num(r[1])]], Object.entries(d.flows7d || {})));
    case 'economy': return (d.limits?.length ? card('Limits right now (recorded state)', `<ul class="fcc-limits">${d.limits.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`) : '') + card('Treasury', `<p class="fcc-big">${num(d.treasury)} sNERDIE</p>${extra.history?.length ? bars(extra.history, 'treasury', 'Treasury by day') + '<p class="fcc-note">Treasury by day (recorded snapshots)</p>' : ''}`)
      + card('Residents\' money', kv({ residents: d.residents?.count, median: num(d.residents?.median), min: num(d.residents?.min), max: num(d.residents?.max), 'inequality (Gini, 0 = equal)': d.residents?.gini }))
      + card('Work', kv({ positions: d.employment?.positions, filled: d.employment?.filled, unemployed: d.employment?.unemployed, 'city vacancies within payroll': d.employment?.income?.cityVacancies, 'payroll headroom per day': d.employment?.income?.payrollHeadroom, 'temp slots': d.employment?.income?.tempSlots, 'open organization jobs': d.employment?.income?.orgJobs, 'business staff (paid from sales)': d.employment?.businessStaff ?? 0, 'funded business openings': d.employment?.income?.businessOpenings ?? 0, 'business hiring switch': d.employment?.income?.businessHiring ? 'on' : 'off' }))
      + card('Housing', kv(d.housing))
      + card('Organizations\' budgets (last 28 days)', table([['Organization', (r) => esc(r.name)], ['Kind', (r) => esc(r.kind)], ['Balance', (r) => num(r.balance)], ['In', (r) => num(r.in28d)], ['Out', (r) => num(r.out28d)], ['Stock', (r) => esc(Object.entries(r.stock || {}).map(([g, n]) => `${g.replace('sg_', '')} ${n}`).join(', ') || '—')]], d.organizations));
    case 'residents': return `<p class="fcc-note">${(Array.isArray(d) ? d : []).length} shown</p>` + table([['Name', (r) => idLink(r.id, r.name)], ['#', (r) => num(r.residentNo)], ['Kind', (r) => esc(r.kind)], ['Ambition', (r) => esc(r.ambition || '—')], ['Work', (r) => esc(r.job || r.life?.work || '—')], ['Home', (r) => esc(r.life?.housing || '—')], ['Organization', (r) => esc(r.org || '—')], ['sNERDIE', (r) => num(r.balance)]], d, 'No one matches.');
    case 'resident': return `<p><button type="button" class="fcc-link" data-tab="residents">← All residents</button></p>`
      + card(`${d.name} (${d.id})`, kv({ kind: d.kind, status: d.status, ambition: d.ambition?.primary_goal, 'secondary ambition': d.ambition?.secondary_goal, 'ambition reason': d.ambition?.reason, work: d.life?.work, housing: d.life?.housing, condition: d.condition ? JSON.stringify(d.condition) : 'well' }))
      + card('Accounts (sNERDIE)', kv(d.accounts)) + card('Ambition history (recorded)', table([['Day', (r) => num(r.day)], ['From', (r) => esc(r.from)], ['To', (r) => esc(r.to)], ['Reason', (r) => esc(r.reason)]], d.ambition?.history))
      + card('Employment', table([['Job', (r) => esc(r.job)], ['Status', (r) => esc(r.status)], ['Started', (r) => esc(String(r.started).slice(0, 10))]], d.employment))
      + card('Organizations', table([['Organization', (r) => idLink(r.orgId, r.name)], ['Title', (r) => esc(r.title)], ['Admin', (r) => (r.admin ? 'yes' : '')]], d.organizations))
      + card('Memories (most important first; recorded)', table([['Kind', (r) => esc(r.kind)], ['About', (r) => idLink(r.subject, r.subject || 'someone unknown')], ['When (city minute)', (r) => num(r.minute)], ['Importance', (r) => num(r.importance)], ['Source', (r) => esc(r.source)], ['Effect', (r) => `<code>${esc(JSON.stringify(r.impact || {}))}</code>`]], d.memories))
      + card('Relationships (their view)', table([['With', (r) => idLink(r.with, r.name)], ['Familiarity', (r) => num(r.familiarity)], ['Trust', (r) => num(r.trust)], ['Respect', (r) => num(r.respect)], ['Fear', (r) => num(r.fear)], ['Rivalry', (r) => num(r.rivalry)]], d.relationships))
      + card('Weapons', `<code>${esc(JSON.stringify(d.arms || {}))}</code>`)
      + card('Ledger (latest)', table([['#', (r) => num(r.seq)], ['Kind', (r) => esc(r.kind)], ['Memo', (r) => esc(r.memo)], ['sNERDIE', (r) => num(r.amount)], ['When', (r) => esc(String(r.at).slice(0, 16))]], d.ledger))
      + (extra.departures?.length ? card('Departures from organizations', extra.departures.map((x) => `<div class="fcc-why"><b>${esc(x.action)} ${esc(x.org)}</b> on day ${num(x.day)}<p class="fcc-fact">Recorded: loyalty ${esc(x.loyaltyAtExit ?? '—')}, ambition ${esc(x.ambitionAtExit || '—')}, ${x.facts?.length || 0} related memories.</p><p class="fcc-infer">Inferred: ${esc(inferDeparture(x))}</p></div>`).join('')) : '');
    case 'organizations': return (Array.isArray(d) ? d : []).map((o) => card(`${o.name} · ${o.kind}${o.gang ? ` · ${o.gang.style} crew` : ''}`, kv({ id: o.orgId, status: o.status, 'treasury (sNERDIE)': num(o.balance), influence: num(o.influence), headquarters: o.hq || 'none', founder: o.founder })
      + table([['Member', (r) => idLink(r.party)], ['Role', (r) => esc(r.role)], ['Admin', (r) => (r.admin ? 'yes' : '')], ['Loyalty', (r) => num(r.loyalty)]], o.roster, 'No members.')
      + table([['Relation with', (r) => idLink(r.with)], ['Score', (r) => num(r.score)], ['Band', (r) => esc(r.band)]], o.relations, 'No relations recorded.')
      + table([['Agreement', (r) => esc(r.kind)], ['Status', (r) => esc(r.status)], ['With', (r) => idLink(r.with)]], o.agreements, 'No agreements.'))).join('') || '<p class="fcc-empty">No organizations.</p>';
    case 'territory': return card('Zones (Neighborhood One)', table([['Zone', (r) => esc(r.name)], ['Controller', (r) => esc(r.controller || (r.protected ? 'protected' : r.contested ? 'contested' : 'open'))], ['Influence', (r) => esc(Object.entries(r.influence || {}).map(([o, p]) => `${o} ${p}`).join(', ') || '—')]], d.zones))
      + card('Challenges', table([['Day', (r) => num(r.city_day)], ['Zone', (r) => esc(r.zone_id)], ['Challenger', (r) => idLink(r.challenger)], ['Defender', (r) => idLink(r.defender)], ['Winner', (r) => idLink(r.winner, r.winner || 'none')], ['Resolved by', (r) => esc(r.resolution || r.status)]], d.challenges))
      + (extra.territoryEvents ? card('Why territory moved', `<p class="fcc-infer">Inferred summary: ${esc(inferTerritory(extra.territoryEvents))}</p>` + table([['Day', (r) => num(r.day)], ['Zone', (r) => esc(r.zone)], ['Organization', (r) => esc(r.org)], ['Recorded activity', (r) => esc(r.kind)], ['Change', (r) => num(r.applied)], ['After', (r) => num(r.after)]], extra.territoryEvents.slice(0, 60))) : '');
    case 'leadership': return card('Neighborhoods', table([['Neighborhood', (r) => esc(r.name)], ['Leading organization', (r) => esc(r.leader || 'vacant')], ['Don', (r) => esc(r.don || '—')], ['Territory active', (r) => (r.territoryActive ? 'yes' : 'not yet built')]], d.neighborhoods))
      + card('Standings and eligibility', table([['Neighborhood', (r) => esc(r.neighborhood)], ['Organization', (r) => idLink(r.orgId, r.org)], ['Influence', (r) => num(r.influence)], ['Lead', (r) => num(r.lead)], ['Days qualified', (r) => num(r.streak)], ['Missing', (r) => esc(['headquarters', 'productiveBusiness', 'structure', 'influenceMet'].filter((k) => !r.eligibility?.[k]).join(', ') || 'nothing — eligible')]], d.standings))
      + card('Rules in force', kv(d.policy)) + card('History (recorded)', table([['Day', (r) => num(r.city_day)], ['Neighborhood', (r) => esc(r.neighborhood_id)], ['Action', (r) => esc(r.action)], ['Organization', (r) => idLink(r.org_id)], ['Don', (r) => idLink(r.don_party)]], d.history));
    case 'businesses': return (Array.isArray(d) ? d : []).map((b) => card(`${b.name}${b.cityRun ? ' · City-run' : ''}`, kv({ id: b.businessId, type: b.type, site: b.site, 'operating balance': num(b.balance), 'sales, 28 days': num(b.sales28d) })
      + table([['Flow (28 days)', (r) => esc(r[0])], ['sNERDIE', (r) => num(r[1])]], Object.entries(b.flows28d || {}), 'No flows.')
      + table([['Operator', (r) => idLink(r.party)], ['Basis', (r) => esc(r.basis)], ['Share', (r) => `${num(r.shareBps / 100)}%`], ['Status', (r) => esc(r.status)]], b.operators, 'No private operators.')
      + table([['Lease', (r) => esc(r.leaseId)], ['Lessee', (r) => idLink(r.lessee)], ['Status', (r) => esc(r.status)], ['Weekly', (r) => num(r.weekly)], ['Share', (r) => `${num(r.shareBps / 100)}%`], ['Ends day', (r) => num(r.toDay)]], b.leases, 'No leases.'))).join('');
    case 'property': return card('Inventory by market and listing', kv(d.inventory)) + card('Owners by kind', kv(d.owners)) + card('Leases and arrears', kv({ 'active leases': d.activeLeases, 'overdue bills': d.arrears, 'price version in force': d.priceVersion || 'none (charges off)', 'business leases': JSON.stringify(d.businessLeases || {}) }));
    case 'nfts': return card('Business NFT classes (audited)', table([['Token', (r) => num(r.token_id)], ['Category', (r) => esc(r.category)], ['Max supply', (r) => num(r.max_supply)], ['Minted at audit', (r) => num(r.minted_at_audit)], ['Staking reward / day (real NERDIE)', (r) => num(r.reward_per_day_nerdie)]], d.classes))
      + (extra.chain ? card('Live chain (read-only)', kv(extra.chain)) : '')
      + card('Verified holders (snapshots)', table([['Player', (r) => idLink(r.party, r.name)], ['Token', (r) => num(r.tokenId)], ['In wallet', (r) => num(r.wallet)], ['Staked', (r) => num(r.staked)], ['Checked', (r) => esc(String(r.checkedAt).slice(0, 16))]], d.holders, 'No verified holders yet.'))
      + card('Staked NFTs may operate', `<p>${d.stakedOperate === true ? 'Yes (founder-approved development direction)' : d.stakedOperate === false ? 'No' : 'Undecided'}</p><p class="fcc-note">Staking rewards are real $NERDIE, claimed on-chain; they never appear in the sNERDIE ledger.</p>`);
    case 'ledger': return table([['#', (r) => num(r.seq)], ['Kind', (r) => esc(r.kind)], ['Memo', (r) => esc(r.memo)], ['Postings', (r) => (r.postings || []).map((p) => `${idLink(p.party)} ${num(p.amount)}`).join('<br>')], ['When', (r) => esc(String(r.at).slice(0, 16))]], d, 'No entries match.');
    case 'events': return table([['When', (r) => esc(r.at)], ['Event', (r) => esc(r.kind)], ['Who', (r) => idLink(r.party || r.org)], ['Zone', (r) => esc(r.zone || '')], ['Recorded details', (r) => `<code>${esc(JSON.stringify(r.details || {}))}</code>`]], d, 'No events match.');
    case 'health': return card('Service', kv({ 'service time': extra.health?.serviceTime, 'roster loaded': extra.health?.loadedAt, population: extra.health?.population, 'simulation lag (minutes)': d.lagMinutes, 'last advance (ms)': extra.health?.metrics?.lastAdvanceMs, 'events last advance': extra.health?.metrics?.lastProcessed, 'simulation errors': extra.health?.metrics?.simErrors, 'last simulation error': extra.health?.metrics?.lastSimError || 'none' }))
      + card('Requests since start', table([['Route', (r) => esc(r[0])], ['Count', (r) => num(r[1].count)], ['Errors', (r) => num(r[1].errors)], ['Average ms', (r) => num(Math.round(r[1].totalMs / Math.max(1, r[1].count)))], ['Slowest ms', (r) => num(r[1].maxMs)]], Object.entries(extra.health?.metrics?.requests || {})))
      + card('Open items', kv({ 'open incidents': d.openIncidents, 'disputed business leases': d.openDisputes, 'ammunition overdraw (rounds)': d.ammoOverdraw, 'active ammunition leases': d.activeLeases, 'Command Center views, 24 h': d.commandViews24h }))
      + (extra.switches ? card('Feature switches (current state)', Object.entries(extra.switches).map(([k, v]) => `<h4>${esc(k)}</h4>${kv(v)}`).join('')) : '');
    default: return '<p class="fcc-empty">Unknown view.</p>';
  }
}

const STYLE = `.fcc{position:fixed;inset:0;z-index:9999;background:#0d1016;color:#e8ecf2;font:14px/1.45 system-ui,sans-serif;display:flex;flex-direction:column}
.fcc header{display:flex;gap:8px;align-items:center;padding:10px 14px;border-bottom:1px solid #263040;flex-wrap:wrap}.fcc h2{margin:0;font-size:16px;margin-right:auto}
.fcc nav{display:flex;gap:4px;overflow-x:auto;padding:6px 14px;border-bottom:1px solid #263040}.fcc nav button,.fcc header button{background:#18202c;color:#cfd8e3;border:1px solid #2a3546;border-radius:6px;padding:6px 10px;white-space:nowrap;cursor:pointer}
.fcc nav button.on{background:#2c5bd8;color:#fff;border-color:#2c5bd8}.fcc main{flex:1;overflow:auto;padding:14px}.fcc-card{background:#141a24;border:1px solid #232c3b;border-radius:8px;padding:12px;margin:0 0 12px}
.fcc-card h3{margin:0 0 8px;font-size:14px;color:#9fb3cc}.fcc-scroll{overflow-x:auto}.fcc-t{border-collapse:collapse;width:100%;font-size:13px}.fcc-t th,.fcc-t td{border-bottom:1px solid #222b38;padding:5px 8px;text-align:left;vertical-align:top}
.fcc-kv{display:grid;grid-template-columns:max-content 1fr;gap:3px 12px;margin:0}.fcc-kv dt{color:#8da0b8}.fcc-kv dd{margin:0}.fcc-link{background:none;border:0;color:#7fb0ff;cursor:pointer;padding:0;text-decoration:underline}
.fcc-filters{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px}.fcc-filters input,.fcc-filters select{background:#18202c;color:#e8ecf2;border:1px solid #2a3546;border-radius:6px;padding:6px 8px}
.fcc-empty,.fcc-note{color:#8da0b8}.fcc-big{font-size:24px;margin:0 0 6px}.fcc-fact{margin:4px 0;color:#cfd8e3}.fcc-infer{margin:4px 0;color:#f0c674}.fcc-infer::before{content:'';}
.fcc-bars{display:flex;align-items:flex-end;gap:2px;height:80px}.fcc-bars span{flex:1;background:#2c5bd8;min-width:3px}.fcc code{font-size:12px;color:#b8c7da;word-break:break-all}.fcc-err{color:#ff8f8f}.fcc-limits{margin:0;padding-left:18px;color:#f0c674}`;

// The overlay. Filters for residents (name/id, kind), ledger (kind, party) and events (kind, party). History for the economy tab comes from
// the economy history report; switches for the health tab from the overview.
export class FounderCommandCenter {
  constructor({ load, loadHistory = null, loadChain = null, document: doc = globalThis.document }) { Object.assign(this, { load, loadHistory, loadChain, doc }); this.tab = 'overview'; this.params = {}; this.el = null; }
  open() {
    if (this.el) return;
    const d = this.doc, el = this.el = d.createElement('div'); el.className = 'fcc'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Founder Command Center');
    el.innerHTML = `<style>${STYLE}</style><header><h2>Founder Command Center <small style="color:#8da0b8;font-weight:400">read-only · every view is logged</small></h2><button type="button" data-act="refresh">Refresh</button><button type="button" data-act="close">Close</button></header>
      <nav>${COMMAND_TABS.map(([id, label]) => `<button type="button" data-tab="${id}">${esc(label)}</button>`).join('')}</nav><main aria-live="polite"></main>`;
    el.addEventListener('click', (e) => this.#click(e)); el.addEventListener('change', (e) => this.#filter(e)); el.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter' && e.target.matches?.('input')) this.#filter(e); });
    // Escape closes wherever focus is; while open, the game below never sees the keyboard
    this.onKey = (e) => { if (!this.el) return; if (e.key === 'Escape') { e.preventDefault(); this.close(); } e.stopPropagation(); };
    d.addEventListener('keydown', this.onKey, true);
    d.body.appendChild(el); this.show(this.tab);
  }
  close() { if (this.onKey) this.doc.removeEventListener('keydown', this.onKey, true); this.el?.remove(); this.el = null; }
  #click(e) {
    const t = e.target.closest?.('[data-tab],[data-open],[data-act]'); if (!t) return;
    if (t.dataset.act === 'close') return this.close();
    if (t.dataset.act === 'refresh') return this.show(this.tab, this.target);
    if (t.dataset.tab) { this.params = {}; return this.show(t.dataset.tab); }
    const id = t.dataset.open;
    if (/^(res_|ply_)/.test(id)) return this.show('resident', id);
    if (/^org_/.test(id)) { this.params = { party: id }; return this.show('organizations'); }
  }
  #filter(e) {
    const f = e.target.closest?.('.fcc-filters'); if (!f) return;
    this.params = Object.fromEntries([...f.querySelectorAll('[name]')].map((i) => [i.name, i.value]).filter(([, v]) => v));
    this.show(this.tab);
  }
  #filters(view) {
    const p = this.params, input = (name, ph) => `<input name="${name}" placeholder="${esc(ph)}" value="${esc(p[name] || '')}" aria-label="${esc(ph)}">`;
    if (view === 'residents') return `<div class="fcc-filters">${input('q', 'Search name or id')}<select name="kind" aria-label="Kind"><option value="">Everyone</option><option value="resident"${p.kind === 'resident' ? ' selected' : ''}>AI residents</option><option value="player"${p.kind === 'player' ? ' selected' : ''}>Players</option><option value="arrival"${p.kind === 'arrival' ? ' selected' : ''}>New arrivals (res_0037+)</option></select></div>`;
    if (view === 'ledger' || view === 'events') return `<div class="fcc-filters">${input('kind', view === 'ledger' ? 'Entry kind (e.g. wage)' : 'Event kind (e.g. org:, incident:)')}${input('party', 'Party id (res_, ply_, org_)')}</div>`;
    return '';
  }
  async show(view, target = null) {
    if (!this.el) return;
    this.tab = view === 'resident' ? 'residents' : view; this.target = target;
    for (const b of this.el.querySelectorAll('nav button')) b.classList.toggle('on', b.dataset.tab === this.tab);
    const main = this.el.querySelector('main'); main.innerHTML = '<p class="fcc-empty">Loading…</p>';
    try {
      const r = await this.load(view, { target, params: view === 'resident' ? {} : this.params }), extra = { health: r.health };
      if (view === 'economy' && this.loadHistory) extra.history = await this.loadHistory().catch(() => null);
      if (view === 'health') extra.switches = (await this.load('overview', {}).catch(() => null))?.data?.switches;
      if (view === 'territory') extra.territoryEvents = (await this.load('explain', { target: 'territory', params: {} }).catch(() => null))?.data;
      if (view === 'resident') extra.departures = (await this.load('explain', { target: 'departure', params: { ref: target } }).catch(() => null))?.data;
      if (view === 'nfts' && this.loadChain) extra.chain = await this.loadChain().catch(() => null);
      let data = r.data;
      if (view === 'organizations' && this.params.party) data = (data || []).filter((o) => o.orgId === this.params.party);
      main.innerHTML = this.#filters(view) + renderView(view, data, extra);
    } catch (err) { main.innerHTML = `<p class="fcc-err">${esc(err?.message || err)}</p>`; }
  }
}
