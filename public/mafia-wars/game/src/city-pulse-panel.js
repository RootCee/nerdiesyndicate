// NC-PULSE-01: the City Pulse panel opened from the Roots Lounge board. It draws cityPulseView() (city-pulse.js):
// City Activity, Resident Demand, Roots Lounge, Business Opportunities, plus loading / empty / unavailable /
// not-connected states, Retry and the last refresh. Read-only: it never sends anything but GETs through the feed.
// Like the library panel it pauses movement and releases the mouse (onOpen), and one is open at a time.
import { CityPulseFeed, CITY_PULSE_REFRESH_MS } from './city-pulse.js';

const STYLE = `
#cityPulsePanel{position:fixed;inset:0;z-index:60;display:none;align-items:center;justify-content:center;background:rgba(6,5,10,.66);font-family:'Barlow Condensed','Barlow',system-ui,sans-serif;color:#f1ecfa;padding:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left))}
#cityPulsePanel.on{display:flex}
#cityPulsePanel .cp-card{background:#0f0c16;border:2px solid #7b3fe4;border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.6);width:min(760px,100%);max-height:100%;display:flex;flex-direction:column;overflow:hidden}
#cityPulsePanel .cp-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:3px solid #b6f23a;background:#1d1036}
#cityPulsePanel .cp-kicker{font-size:13px;letter-spacing:.16em;color:#b9aed2;text-transform:uppercase}
#cityPulsePanel h2{margin:2px 0 0;font-size:24px;letter-spacing:.06em;color:#b6f23a;line-height:1.1}
#cityPulsePanel .cp-x{flex:none;background:#2a1650;border:1px solid #7b3fe4;color:#fff;border-radius:10px;min-width:48px;height:48px;font:600 15px 'Barlow Condensed',sans-serif;letter-spacing:.08em;cursor:pointer;touch-action:manipulation}
#cityPulsePanel .cp-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px 14px;border-bottom:1px solid #2a2338;background:#130f1c;font-size:14px;color:#b9aed2}
#cityPulsePanel .cp-bar .grow{flex:1;min-width:140px}
#cityPulsePanel .cp-b{min-height:44px;padding:0 14px;border-radius:9px;border:1px solid #4b3a74;background:#1e1730;color:#f1ecfa;font:600 15px 'Barlow Condensed',sans-serif;letter-spacing:.05em;cursor:pointer;touch-action:manipulation}
#cityPulsePanel .cp-b.on{border-color:#b6f23a;color:#b6f23a;background:#1d2410}
#cityPulsePanel .cp-body{overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y;padding:12px 14px 18px;min-height:0}
#cityPulsePanel section{margin:0 0 16px}
#cityPulsePanel h3{margin:0 0 6px;font-size:18px;letter-spacing:.12em;color:#fff;text-transform:uppercase}
#cityPulsePanel h3 i{font-style:normal;color:#b6f23a;margin-right:6px}
#cityPulsePanel p{margin:4px 0 8px;font:400 15px/1.45 'Barlow',system-ui,sans-serif;color:#ddd5ee}
#cityPulsePanel .cp-note{font:400 13px/1.4 'Barlow',system-ui,sans-serif;color:#9d93b3}
#cityPulsePanel .cp-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:6px 0 10px}
#cityPulsePanel .cp-tile{background:#18131f;border:1px solid #2a2338;border-left:4px solid #b6f23a;border-radius:8px;padding:8px 10px}
#cityPulsePanel .cp-tile.leisure{border-left-color:#7b3fe4}#cityPulsePanel .cp-tile.roots{border-left-color:#e8c55a}
#cityPulsePanel .cp-tile small{display:block;font-size:12px;letter-spacing:.12em;color:#9d93b3;text-transform:uppercase}
#cityPulsePanel .cp-tile strong{font-size:28px;font-variant-numeric:tabular-nums}
#cityPulsePanel .cp-days{display:grid;gap:4px;margin:6px 0}
#cityPulsePanel .cp-day{display:grid;grid-template-columns:62px 1fr 42px;align-items:center;gap:8px;font-size:14px;color:#b9aed2}
#cityPulsePanel .cp-day b{text-align:right;color:#f1ecfa;font-variant-numeric:tabular-nums;font-weight:600}
#cityPulsePanel .cp-track{display:flex;height:12px;border-radius:6px;background:#1e1730;overflow:hidden}
#cityPulsePanel .cp-track span{display:block;height:100%}
#cityPulsePanel .cp-track .food{background:#b6f23a}#cityPulsePanel .cp-track .leisure{background:#7b3fe4}#cityPulsePanel .cp-track .other{background:#5aa6e8}#cityPulsePanel .cp-track .roots{background:#e8c55a}
#cityPulsePanel .cp-legend{display:flex;flex-wrap:wrap;gap:12px;font-size:13px;color:#b9aed2}
#cityPulsePanel .cp-legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}
#cityPulsePanel ul{margin:4px 0 8px;padding-left:18px;font:400 15px/1.45 'Barlow',system-ui,sans-serif;color:#ddd5ee}
#cityPulsePanel .cp-ok{border:1px solid #3d5a14;background:#141c0b;color:#d6f79a;border-radius:8px;padding:10px 12px;font:500 15px/1.4 'Barlow',system-ui,sans-serif}
#cityPulsePanel .cp-state{padding:26px 8px;text-align:center}
#cityPulsePanel .cp-state p{font-size:16px}
#cityPulsePanel .cp-foot{padding:8px 14px;border-top:1px solid #2a2338;background:#130f1c;font:500 12px/1.3 'Barlow',system-ui,sans-serif;letter-spacing:.08em;color:#9d93b3;text-transform:uppercase}
#cityPulsePanel .cp-b:focus-visible,#cityPulsePanel .cp-x:focus-visible{outline:3px solid #b6f23a;outline-offset:1px}
@media (max-width:560px),(max-height:500px){#cityPulsePanel h2{font-size:20px}#cityPulsePanel .cp-head{padding:8px 10px}#cityPulsePanel .cp-body{padding:10px}#cityPulsePanel .cp-tile strong{font-size:22px}}
`;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n = (v) => Number(v || 0).toLocaleString('en-US');
const pct = (v, max) => `${Math.max(0, Math.min(100, (v / max) * 100)).toFixed(1)}%`;

// The panel's HTML body for a view (exported for tests: everything shown passes through esc()).
export function cityPulseBodyHtml(v) {
  if (v.status === 'not-connected') return '<div class="cp-state" data-state="not-connected"><p>City Pulse is not connected in this build.</p><p class="cp-note">This preview does not read the production city, so there are no figures to show.</p></div>';
  if (!v.hasData && v.status === 'unavailable') return '<div class="cp-state" data-state="unavailable"><p>City figures are unavailable right now.</p><p class="cp-note">The game keeps running; nothing was changed. Try again in a moment.</p><button class="cp-b" type="button" data-act="retry">Retry</button></div>';
  if (!v.hasData) return '<div class="cp-state" data-state="loading" aria-busy="true"><p>Reading the city…</p></div>';
  const a = v.activity, cls = (k) => (k === 'food' || k === 'leisure' ? k : 'other');
  const stale = v.status === 'stale' ? '<p class="cp-note" data-state="stale">Could not refresh. Showing the last figures received. <button class="cp-b" type="button" data-act="retry">Retry</button></p>' : '';
  const activity = `<section data-section="activity"><h3><i>A</i>City Activity</h3>
    <div class="cp-tiles">${a.categories.map((c) => `<div class="cp-tile ${cls(c.key)}"><small>${esc(c.label)} items</small><strong>${n(c.total)}</strong></div>`).join('') || '<div class="cp-tile"><small>Purchases</small><strong>0</strong></div>'}
      <div class="cp-tile roots"><small>Roots Lounge visits</small><strong>${n(v.roots.totalVisits)}</strong></div></div>
    <div class="cp-legend">${a.categories.map((c) => `<span><i class="${cls(c.key)}" style="background:${cls(c.key) === 'food' ? '#b6f23a' : cls(c.key) === 'leisure' ? '#7b3fe4' : '#5aa6e8'}"></i>${esc(c.label)}</span>`).join('')}</div>
    <div class="cp-days">${a.days.map((d) => `<div class="cp-day"><span>${esc(d.label)}${d.latest ? '*' : ''}</span><div class="cp-track" role="img" aria-label="${esc(d.label)}: ${a.categories.map((c) => `${d.values[c.key]} ${c.label.toLowerCase()}`).join(', ')}">${a.categories.map((c) => `<span class="${cls(c.key)}" style="width:${pct(d.values[c.key], a.max)}"></span>`).join('')}</div><b>${n(d.total)}</b></div>`).join('')}</div>
    <p>${a.busiest ? `Busiest day: ${esc(a.busiest.label)} with ${n(a.busiest.total)} items. ` : ''}About ${n(a.averagePerDay)} items a day.</p>
    <p class="cp-note">${esc(a.note)} *Latest recorded day.</p></section>`;
  const d = v.demand;
  const demand = `<section data-section="demand"><h3><i>B</i>Resident Demand</h3>${d.empty ? `<div class="cp-ok" data-state="demand-empty">${esc(d.message)}</div>`
    : `<p>${esc(d.message)}</p><ul>${d.categories.map((c) => `<li><strong>${esc(c.label)}</strong>: ${n(c.missed)} item${c.missed === 1 ? '' : 's'} not available</li>`).join('')}</ul>${d.items.length ? `<p class="cp-note">Most wanted: ${d.items.slice(0, 6).map((i) => `${esc(i.item)} (${n(i.missed)})`).join(' · ')}</p>` : ''}`}</section>`;
  const r = v.roots;
  const roots = `<section data-section="roots"><h3><i>C</i>Roots Lounge</h3>
    <p>${n(r.totalVisits)} resident visit${r.totalVisits === 1 ? '' : 's'} in this period · about ${r.averagePerDay} a day${r.busiest ? ` · busiest ${esc(r.busiest.label)} (${n(r.busiest.rootsVisits)})` : ''}.</p>
    <div class="cp-days">${r.days.map((x) => `<div class="cp-day"><span>${esc(x.label)}${x.latest ? '*' : ''}</span><div class="cp-track"><span class="roots" style="width:${pct(x.visits, r.max)}"></span></div><b>${n(x.visits)}</b></div>`).join('')}</div>
    <ul>${r.facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></section>`;
  const o = v.opportunities;
  const opps = `<section data-section="opportunities"><h3><i>D</i>Business Opportunities</h3>${o.signals.length ? `<ul>${o.signals.map((s) => `<li>${esc(s.text)}</li>`).join('')}</ul>` : `<p data-state="no-opportunity">${esc(o.message)}</p>`}<p class="cp-note">${esc(o.disclaimer)}</p></section>`;
  return stale + activity + demand + roots + opps;
}

export class CityPulsePanel {
  constructor({ client = null, productionEndpoint = '', onOpen = () => {}, onView = () => {}, canOpen = () => true, document: doc = globalThis.document, now = () => Date.now(), setInterval: si = globalThis.setInterval?.bind(globalThis), clearInterval: ci = globalThis.clearInterval?.bind(globalThis) } = {}) {
    Object.assign(this, { onOpen, onView, canOpen, doc, si, ci }); this.isOpen = false; this.timer = 0; this.opens = 0;
    this.feed = new CityPulseFeed({ client, productionEndpoint, now, onChange: (view) => { this.onView(view); if (this.isOpen) this.render(view); } });
  }
  get open() { return this.isOpen; }
  view() { return this.feed.view(); }
  // Opens (refreshing figures older than a minute), unless another panel is open. Returns whether it opened.
  show() {
    if (this.isOpen) return true;
    if (!this.canOpen()) return false;
    this.isOpen = true; this.opens++; this.#ensureDom(); this.root?.classList.add('on'); this.render(this.feed.view()); this.onOpen(true);
    this.feed.load();
    // While open, follow the city once a minute (the service caches as long); stops on close.
    if (this.si) this.timer = this.si(() => { if (this.isOpen) this.feed.load(); }, CITY_PULSE_REFRESH_MS);
    this.root?.querySelector('.cp-x')?.focus?.({ preventScroll: true });
    return true;
  }
  close() {
    if (!this.isOpen) return;
    this.isOpen = false; if (this.timer && this.ci) this.ci(this.timer); this.timer = 0;
    this.root?.classList.remove('on'); this.onOpen(false);
  }
  #ensureDom() {
    if (this.root || !this.doc?.createElement) return;
    const d = this.doc, style = d.createElement('style'); style.textContent = STYLE; d.head.appendChild(style);
    const root = d.createElement('div'); root.id = 'cityPulsePanel'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'cityPulseTitle');
    root.innerHTML = `<div class="cp-card"><div class="cp-head"><div><div class="cp-kicker">Roots Lounge · Nerdie City</div><h2 id="cityPulseTitle">City Pulse</h2></div><button class="cp-x" type="button" aria-label="Close City Pulse">CLOSE</button></div>
      <div class="cp-bar"><span class="grow" data-el="range"></span><button class="cp-b" type="button" data-act="range" data-arg="7">7 days</button><button class="cp-b" type="button" data-act="range" data-arg="30">30 days</button><button class="cp-b" type="button" data-act="retry" data-el="refresh">Refresh</button></div>
      <div class="cp-body" aria-live="polite"></div><div class="cp-foot" data-el="foot"></div></div>`;
    d.body.appendChild(root); this.root = root;
    this.el = { body: root.querySelector('.cp-body'), range: root.querySelector('[data-el="range"]'), foot: root.querySelector('[data-el="foot"]'), ranges: [...root.querySelectorAll('[data-act="range"]')] };
    root.querySelector('.cp-x').addEventListener('click', () => this.close());
    root.addEventListener('click', (e) => {
      const t = e.target.closest?.('[data-act]'); if (!t || t.disabled) return;
      if (t.dataset.act === 'retry') this.feed.load({ force: true });
      else if (t.dataset.act === 'range') this.feed.setRange(Number(t.dataset.arg));
    });
    // Keys typed in the panel stay in the panel (E, WASD, Space…); Escape reaches the game, which closes it.
    for (const type of ['keydown', 'keyup']) root.addEventListener(type, (e) => { if (e.code !== 'Escape') e.stopPropagation(); });
    // Touches on the panel never reach the game's look/move handlers.
    for (const type of ['touchstart', 'touchmove', 'touchend']) root.addEventListener(type, (e) => e.stopPropagation(), { passive: true });
  }
  render(view = this.feed.view()) {
    if (!this.el) return;
    this.el.body.innerHTML = cityPulseBodyHtml(view);
    this.el.range.textContent = view.hasData ? `${view.rangeLabel}${view.updated ? ` · updated ${view.updated}` : ''}` : view.status === 'loading' ? 'Loading…' : '';
    for (const b of this.el.ranges) b.classList.toggle('on', Number(b.dataset.arg) === view.range);
    this.el.foot.textContent = `${view.sourceLabel} · ${view.notice}`;
  }
}
