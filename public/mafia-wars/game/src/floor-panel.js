// The lift's floor menu in an apartment building: the lobby and storeys 2-6 with each apartment's kind,
// value and size. Like the other panels, html() is plain data the tests read; the panel draws it when there
// is a document. Every floor is open to visit for now (homes are not yet owned).
const STYLE = `
#floorPanel{position:fixed;inset:0;z-index:60;display:none;align-items:center;justify-content:center;background:rgba(5,3,10,.55);font-family:'Barlow Condensed',system-ui,sans-serif;color:#f3eefc;padding:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left))}
#floorPanel.on{display:flex}
#floorPanel .fp-card{background:linear-gradient(180deg,#120c22,#08060f);border:2px solid #c9a227;border-radius:14px;box-shadow:0 18px 60px rgba(0,0,0,.6);width:min(460px,100%);max-height:100%;overflow:auto}
#floorPanel .fp-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;border-bottom:1px solid #3a2d5c}
#floorPanel .fp-kicker{font-size:13px;letter-spacing:.18em;color:#c8b3ff;text-transform:uppercase}
#floorPanel h2{margin:2px 0 0;font-size:22px;letter-spacing:.04em;color:#f2d28b}
#floorPanel .fp-x{flex:none;background:none;border:1px solid #5b4a86;color:#f3eefc;border-radius:8px;width:44px;height:44px;font-size:22px;cursor:pointer}
#floorPanel .fp-list{display:flex;flex-direction:column-reverse;gap:6px;padding:12px 16px 16px}
#floorPanel .fp-floor{display:grid;grid-template-columns:44px 1fr;gap:2px 12px;align-items:center;width:100%;padding:10px 12px;background:#1a1230;border:1px solid #3a2d5c;border-radius:10px;color:#fff;text-align:left;cursor:pointer;font:inherit;min-height:56px}
#floorPanel .fp-floor:hover{border-color:#6a55a3}
#floorPanel .fp-floor.here{border-color:#e8c55a;background:#2a2112;cursor:default}
#floorPanel .fp-floor:disabled{opacity:.5;cursor:not-allowed}
#floorPanel .fp-n{grid-row:span 2;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;border:2px solid #c9a227;font-size:22px;font-weight:700;color:#f2d28b}
#floorPanel .fp-floor b{font-size:18px;font-weight:600}
#floorPanel .fp-floor small{font:400 14px/1.35 'Barlow',sans-serif;color:#b7a9db}
#floorPanel .fp-x:focus-visible,#floorPanel .fp-floor:focus-visible{outline:3px solid #e8c55a;outline-offset:1px}
`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export class FloorPanel {
  constructor({ onChoose = () => {}, onOpen = () => {}, document: doc = globalThis.document } = {}) { Object.assign(this, { onChoose, onOpen, doc }); this.menu = null; }
  get open() { return !!this.menu; }
  // menu: { building, current, floors: [{ floor, title, tier?, value?, area?, open }] }
  show(menu) { if (!menu) return; this.menu = menu; this.#ensureDom(); this.root?.classList.add('on'); this.render(); this.onOpen(true); this.root?.querySelector('.fp-floor:not(.here)')?.focus?.(); }
  close() { if (!this.menu) return; this.menu = null; this.root?.classList.remove('on'); this.onOpen(false); }
  choose(floor) { const f = this.menu?.floors.find((x) => x.floor === floor); if (!f || !f.open || floor === this.menu.current) return false; this.close(); this.onChoose(floor); return true; }
  #ensureDom() {
    if (this.root || !this.doc) return;
    const d = this.doc, style = d.createElement('style'); style.textContent = STYLE; d.head.appendChild(style);
    const root = d.createElement('div'); root.id = 'floorPanel'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Choose a floor');
    root.innerHTML = '<div class="fp-card"><div class="fp-head"><div><div class="fp-kicker">Elevator</div><h2></h2></div><button class="fp-x" type="button" aria-label="Close">×</button></div><div class="fp-list"></div></div>';
    d.body.appendChild(root); this.root = root; this.el = { title: root.querySelector('h2'), list: root.querySelector('.fp-list') };
    root.querySelector('.fp-x').addEventListener('click', () => this.close());
    root.addEventListener('click', (e) => { if (e.target === root) return this.close(); const b = e.target.closest('[data-floor]'); if (b) this.choose(Number(b.dataset.floor)); });
    for (const type of ['keydown', 'keyup']) root.addEventListener(type, (e) => {
      if (e.code === 'Escape') { if (type === 'keydown') this.close(); return; }
      e.stopPropagation();
      if (type === 'keydown' && /^Digit[1-6]$/.test(e.code)) this.choose(Number(e.code.slice(5)));
    });
  }
  html() {
    const m = this.menu; if (!m) return '';
    return m.floors.map((f) => {
      const here = f.floor === m.current, line = f.floor === 1 ? 'Street door, mail, concierge' : f.summary ? esc(f.summary) : `${esc(f.tier)} · ${Number(f.value).toLocaleString('en-US')} sNERDIE · about ${esc(f.area)} m²`;
      return `<button type="button" class="fp-floor${here ? ' here' : ''}" data-floor="${f.floor}"${!f.open ? ' disabled' : ''} aria-current="${here}"><span class="fp-n">${f.floor === 1 ? 'L' : f.floor}</span><b>${esc(f.title)}${here ? ' · you are here' : ''}</b><small>${line}${f.open ? '' : ' · private'}</small></button>`;
    }).join('');
  }
  render() { if (!this.el || !this.menu) return; this.el.title.textContent = this.menu.building; this.el.list.innerHTML = this.html(); }
}
