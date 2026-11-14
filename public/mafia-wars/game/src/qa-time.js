// Founder QA time override (QA preview build only; never production). The founder can set a PRIVATE room's clock to a
// time of day (11 AM, 3 PM, 8 PM, any time) or back to normal. The room (server) checks the key, that the room is
// private and that its Worker allows it; then everyone in that room follows the room's clock and sees the banner.
// The same schedules and station logic run as always; nothing touches the economy.
// - The key lives only in this tab's memory (a variable here): never in the URL, storage, cookies or logs.
// - The panel appears only on preview or local hosts with ?qaTime=1. The banner shows to anyone in a QA room.
import { isRc1PreviewHost } from './multiplayer-endpoint.js';

const PRODUCTION = new Set(['nerdieblaq.xyz', 'www.nerdieblaq.xyz']);
const isProductionHost = (host) => PRODUCTION.has(host);

export const QA_TIME_PRESETS = Object.freeze([{ label: '11 AM', minute: 660 }, { label: '3 PM', minute: 900 }, { label: '8 PM', minute: 1200 }]);
const LOCAL = /^(localhost|127\.0\.0\.1|::1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/;
export function qaTimePanelAllowed(locationLike = globalThis.location) {
  const host = String(locationLike?.hostname || '').toLowerCase();
  if (!host || isProductionHost(host)) return false;
  return (isRc1PreviewHost(host) || LOCAL.test(host)) && new URLSearchParams(locationLike?.search || '').get('qaTime') === '1';
}
export const clockLabel = (minute) => { const h = Math.floor(minute / 60) % 24, m = minute % 60; return `${(h % 12) || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
export function parseClock(text) { const m = /^(\d{1,2}):(\d{2})$/.exec(String(text || '').trim()); if (!m) return null; const h = Number(m[1]), mm = Number(m[2]); return h < 24 && mm < 60 ? h * 60 + mm : null; }
const REASONS = Object.freeze({
  qa_denied: 'Wrong QA key.', qa_locked: 'Locked: too many wrong keys. Leave and rejoin the room to try again.', qa_private_room_only: 'Only in a private room (Create a room, not Public).',
  qa_unavailable: 'Not available on this server.', invalid_qa_time: 'Invalid time.', unknown_player: 'Not in a room.',
});
export const qaReasonText = (reason, remaining) => `${REASONS[reason] || 'Refused.'}${reason === 'qa_denied' && Number.isInteger(remaining) ? ` ${remaining} tries left.` : ''}`;

const STYLE = `#qaTimeBanner{position:fixed;left:50%;top:52px;transform:translateX(-50%);z-index:60;padding:6px 14px;border-radius:999px;background:#7a1fb8;color:#fff;font:700 13px/1.2 Barlow,system-ui,sans-serif;letter-spacing:.06em;box-shadow:0 2px 10px #0008;pointer-events:none;display:none}
#qaTimeBanner.on{display:block}
#qaTimePanel{position:fixed;right:12px;top:120px;z-index:61;width:230px;padding:10px;border-radius:10px;background:#120f18ee;color:#eee;font:13px/1.3 Barlow,system-ui,sans-serif;box-shadow:0 4px 16px #000a}
#qaTimePanel h3{margin:0 0 6px;font-size:13px;letter-spacing:.08em;color:#d9b3ff}
#qaTimePanel input{width:100%;box-sizing:border-box;margin:4px 0;padding:6px;border-radius:6px;border:1px solid #555;background:#1d1926;color:#fff;font:inherit}
#qaTimePanel .row{display:flex;gap:6px;margin:4px 0}#qaTimePanel button{flex:1;padding:7px 4px;border-radius:6px;border:0;background:#3b2c55;color:#fff;font:700 12px Barlow,system-ui,sans-serif;cursor:pointer}
#qaTimePanel button.normal{background:#2b4a3a}#qaTimePanel .st{min-height:16px;margin-top:4px;color:#ccc;font-size:12px}`;

export class QaTime {
  constructor({ doc = globalThis.document, send = () => false, panel = false, minuteNow = () => 0 } = {}) {
    Object.assign(this, { doc, send, minuteNow }); this.active = false; this.minute = null; this.banner = null; this.panel = null;
    let key = ''; // memory only
    this.setKey = (k) => { key = String(k || ''); };
    this.request = (minute) => (key ? this.send({ type: 'qa-time', key, minute }) : false);
    if (doc?.createElement) { const style = doc.createElement('style'); style.textContent = STYLE; doc.head.appendChild(style); }
    if (doc?.createElement) { this.banner = doc.createElement('div'); this.banner.id = 'qaTimeBanner'; this.banner.setAttribute('role', 'status'); doc.body.appendChild(this.banner); }
    if (panel && doc?.createElement) this.#buildPanel();
  }
  // From the room's clock (economy snapshot life.clock): qa true = simulated, false/absent = normal time.
  setActive(active, minute = null) {
    this.active = !!active; this.minute = this.active ? minute : null; this.refresh();
  }
  refresh() { if (!this.banner) return; this.banner.classList.toggle('on', this.active); if (this.active) this.banner.textContent = `QA SIMULATED TIME · ${clockLabel(this.minuteNow())} · THIS ROOM ONLY`; }
  // The room's answer to a request: { type: 'qa-time', active, minute } or a reject { reason, qaTime: true, remaining }.
  result(message) {
    const text = message?.type === 'qa-time' ? (message.active ? `Room clock set to ${clockLabel(message.minute)}.` : 'Normal time.') : qaReasonText(message?.reason, message?.remaining);
    if (this.status) this.status.textContent = text; return text;
  }
  #buildPanel() {
    const d = this.doc, root = d.createElement('div'); root.id = 'qaTimePanel'; root.setAttribute('aria-label', 'Founder QA time');
    root.innerHTML = `<h3>FOUNDER QA TIME</h3><input type="password" autocomplete="off" spellcheck="false" placeholder="QA key (this tab only)" aria-label="QA key">
      <div class="row">${QA_TIME_PRESETS.map((p) => `<button type="button" data-min="${p.minute}">${p.label}</button>`).join('')}</div>
      <div class="row"><input type="text" placeholder="HH:MM" aria-label="Custom time (24 h)" style="flex:2"><button type="button" data-custom>Set</button></div>
      <div class="row"><button type="button" class="normal" data-normal>Normal time</button></div><div class="st" aria-live="polite">Private rooms only.</div>`;
    d.body.appendChild(root); this.panel = root; this.status = root.querySelector('.st');
    const [keyInput, timeInput] = root.querySelectorAll('input');
    keyInput.addEventListener('input', () => this.setKey(keyInput.value));
    const go = (minute) => { if (!this.request(minute)) this.status.textContent = keyInput.value ? 'Not connected to a room.' : 'Enter the QA key first.'; else this.status.textContent = 'Asking the room…'; };
    root.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.min) go(Number(b.dataset.min));
      else if ('custom' in b.dataset) { const m = parseClock(timeInput.value); if (m === null) this.status.textContent = 'Use HH:MM, 24-hour.'; else go(m); }
      else if ('normal' in b.dataset) go(null);
    });
    // typing in the panel never moves the player or triggers game keys
    for (const type of ['keydown', 'keyup', 'keypress']) root.addEventListener(type, (e) => e.stopPropagation());
  }
}
