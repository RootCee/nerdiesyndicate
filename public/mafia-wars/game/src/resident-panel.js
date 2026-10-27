// Talking to a resident: who they are (name, job, workplace, shift, where they are now, where they live) and
// a light conversation (resident-talk.js). Balances and the full home address appear only for a signed-in
// founder. Like the bank panel, html() is plain data the tests read; the panel draws it when there is a document.
import { residentConversation } from './resident-talk.js';
import { economicMinuteOfDay } from './resident-schedule.js';
import { residentAddress } from './city-addresses.js';

const STYLE = `
#residentPanel{position:fixed;inset:0;z-index:60;display:none;align-items:flex-end;justify-content:center;background:rgba(5,3,10,.45);font-family:'Barlow Condensed',system-ui,sans-serif;color:#f3eefc;padding:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(14px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left))}
#residentPanel.on{display:flex}
#residentPanel .rp-card{background:linear-gradient(180deg,#120c22,#08060f);border:2px solid #c9a227;border-radius:14px;box-shadow:0 18px 60px rgba(0,0,0,.6);width:min(640px,100%);max-height:min(78vh,100%);display:flex;flex-direction:column;overflow:hidden}
#residentPanel .rp-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;border-bottom:1px solid #3a2d5c}
#residentPanel .rp-kicker{font-size:13px;letter-spacing:.18em;color:#c8b3ff;text-transform:uppercase}
#residentPanel h2{margin:2px 0 0;font-size:24px;letter-spacing:.04em;color:#f2d28b}
#residentPanel .rp-x{flex:none;background:none;border:1px solid #5b4a86;color:#f3eefc;border-radius:8px;width:44px;height:44px;font-size:22px;cursor:pointer}
#residentPanel .rp-main{overflow:auto;padding:14px 16px}
#residentPanel .rp-facts{margin:0 0 12px;font:400 15px/1.5 'Barlow',system-ui,sans-serif;color:#b7a9db}
#residentPanel .rp-facts b{color:#f3eefc;font-weight:600}
#residentPanel .rp-money{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0 0 12px}
#residentPanel .rp-money div{background:#1a1230;border:1px solid #3a2d5c;border-radius:10px;padding:8px 10px}
#residentPanel .rp-money b{display:block;font-size:12px;letter-spacing:.12em;color:#9b8fb8;font-weight:600}
#residentPanel .rp-money span{font-size:20px;font-variant-numeric:tabular-nums}
#residentPanel .rp-log{display:flex;flex-direction:column;gap:8px;margin:0 0 12px}
#residentPanel .rp-say{align-self:flex-start;max-width:85%;background:#1f1638;border:1px solid #3a2d5c;border-radius:12px 12px 12px 4px;padding:8px 12px;font:400 17px/1.45 'Barlow',sans-serif}
#residentPanel .rp-you{align-self:flex-end;max-width:85%;background:#3a2d16;border:1px solid #6b5420;border-radius:12px 12px 4px 12px;padding:6px 12px;font:400 15px/1.4 'Barlow',sans-serif;color:#f2e2b8}
#residentPanel .rp-actions{display:flex;flex-wrap:wrap;gap:8px}
#residentPanel .rp-b{min-height:44px;padding:0 14px;border-radius:9px;border:1px solid #6a55a3;background:#2a1d4a;color:#fff;font:600 16px 'Barlow Condensed',sans-serif;letter-spacing:.04em;cursor:pointer}
#residentPanel .rp-b:focus-visible,#residentPanel .rp-x:focus-visible{outline:3px solid #e8c55a;outline-offset:1px}
@media (max-width:520px){#residentPanel .rp-money span{font-size:17px}#residentPanel .rp-money div{padding:6px 8px}}
`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n = (v) => (v == null ? '—' : esc(Number(v).toLocaleString('en-US')));
const clock = (minute) => { const m = ((minute % 1440) + 1440) % 1440, h = Math.floor(m / 60); return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
const PLACES = Object.freeze({ 'nerdie-city-bank': 'Nerdie City Bank', 'city-hall': 'City Hall', 'academy-library': 'the Library', 'nerdie-arms': 'Ammo', 'central-park': 'Central Park', 'corner-market': 'Corner Market', 'north-court': 'North Court Apartments' });
const NOW = Object.freeze({ home: 'At home', commute: 'On the way to work at', work: 'Working at', shop: 'Shopping at', social: 'Hanging out at', leisure: 'Relaxing at' });
const PERSONALITY = Object.freeze({ peaceful: 'Friendly', cautious: 'Shy', defensive: 'Protective', aggressive: 'Blunt' });
const pacificDay = (ms) => new Date(ms - 7 * 3_600_000).toISOString().slice(0, 10); // a day key; only needs to change once a day

export class ResidentPanel {
  // founder: { signedIn(): boolean, resident(residentId): Promise<{ history }> } or null (balances only when signed in).
  constructor({ founder = null, onWaypoint = () => {}, onOpen = () => {}, document: doc = globalThis.document, now = () => Date.now() } = {}) {
    Object.assign(this, { founder, onWaypoint, onOpen, doc, now }); this.resident = null; this.log = []; this.mode = 'topics'; this.private = null;
  }
  get open() { return !!this.resident; }
  // resident: { index, residentId, name, personality, job, chess, housing: { propertyId } }
  show(resident) {
    const minute = economicMinuteOfDay(this.now());
    this.resident = resident; this.talk = residentConversation(resident, minute, pacificDay(this.now()));
    this.log = [{ who: 'them', text: this.talk.greeting }]; this.mode = 'topics'; this.private = null;
    this.#ensureDom(); this.root?.classList.add('on'); this.render(); this.onOpen(true);
    if (this.founder?.signedIn?.() && resident.residentId) {
      this.founder.resident(resident.residentId).then(({ history }) => { if (this.resident === resident) { this.private = history?.resident || null; this.render(); } }).catch(() => {});
    }
  }
  close() { if (!this.resident) return; this.resident = null; this.root?.classList.remove('on'); this.onOpen(false); }
  choose(topic, placeId = null) {
    if (!this.resident) return;
    if (topic === 'back') { this.mode = 'topics'; this.render(); return {}; }
    const label = topic === 'where' && placeId ? (PLACES[placeId] || placeId) : this.talk.topics.find((t) => t.id === topic)?.label;
    if (label) this.log.push({ who: 'you', text: label });
    const reply = this.talk.reply(topic, placeId);
    this.log.push({ who: 'them', text: reply.text }); this.log = this.log.slice(-8);
    this.mode = reply.places ? 'places' : 'topics';
    if (reply.waypoint) this.onWaypoint(reply.waypoint);
    this.render();
    return reply;
  }
  #ensureDom() {
    if (this.root || !this.doc) return;
    const d = this.doc, style = d.createElement('style'); style.textContent = STYLE; d.head.appendChild(style);
    const root = d.createElement('div'); root.id = 'residentPanel'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Talking with a resident');
    root.innerHTML = '<div class="rp-card"><div class="rp-head"><div><div class="rp-kicker"></div><h2></h2></div><button class="rp-x" type="button" aria-label="Close">×</button></div><div class="rp-main" aria-live="polite"></div></div>';
    d.body.appendChild(root); this.root = root;
    this.el = { kicker: root.querySelector('.rp-kicker'), title: root.querySelector('h2'), main: root.querySelector('.rp-main') };
    root.querySelector('.rp-x').addEventListener('click', () => this.close());
    root.addEventListener('click', (e) => {
      if (e.target === root) return this.close();
      const b = e.target.closest('[data-talk]'); if (!b) return;
      const reply = this.choose(b.dataset.talk, b.dataset.place || null);
      if (reply?.done || reply?.waypoint) setTimeout(() => this.close(), 1400);
    });
    for (const type of ['keydown', 'keyup']) root.addEventListener(type, (e) => { if (e.code === 'Escape') { if (type === 'keydown') this.close(); return; } e.stopPropagation(); });
  }
  html() {
    const r = this.resident; if (!r) return '';
    const job = r.job, at = this.talk, p = this.private;
    const where = at.activity === 'home' ? 'At home' : `${NOW[at.activity] || 'At'} ${esc(PLACES[at.locationId] || at.locationId)}`;
    const facts = [
      job ? `<b>${esc(job.title)}</b> at ${esc(PLACES[job.workplaceId] || job.workplaceId)} · ${clock(job.shiftStartMinute)}–${clock(job.shiftStartMinute + job.shiftDurationMinutes)}` : '<b>No steady job</b> · city temp work',
      `Now: <b>${where}</b>`,
      `Lives at ${p ? esc(residentAddress(r.housing?.propertyId) || PLACES['north-court']) : esc(PLACES['north-court'])}`,
      `${esc(PERSONALITY[r.personality] || 'Friendly')}${r.chess ? ` · chess: ${esc(r.chess.levelLabel || 'player')}` : ''}`,
    ];
    const money = p ? `<div class="rp-money"><div><b>CHECKING</b><span>${n(p.checking)}</span></div><div><b>SAVINGS</b><span>${n(p.savings)}</span></div><div><b>EARNED</b><span>${n(p.lifetime?.wages)}</span></div></div>` : '';
    const log = this.log.map((l) => `<div class="${l.who === 'you' ? 'rp-you' : 'rp-say'}">${esc(l.text)}</div>`).join('');
    const buttons = this.mode === 'places'
      ? [...at.reply('where').places.map((pl) => `<button type="button" class="rp-b" data-talk="where" data-place="${esc(pl.id)}">${esc(PLACES[pl.id] || pl.name)}</button>`), '<button type="button" class="rp-b" data-talk="back">Never mind</button>']
      : at.topics.map((t) => `<button type="button" class="rp-b" data-talk="${esc(t.id)}">${esc(t.label)}</button>`);
    return `<p class="rp-facts">${facts.join('<br>')}</p>${money}<div class="rp-log">${log}</div><div class="rp-actions">${buttons.join('')}</div>`;
  }
  render() {
    if (!this.el || !this.resident) return;
    this.el.kicker.textContent = this.private ? 'Resident · founder view' : 'Resident'; this.el.title.textContent = this.resident.name; this.el.main.innerHTML = this.html();
    this.el.main.scrollTop = this.el.main.scrollHeight;
  }
}
