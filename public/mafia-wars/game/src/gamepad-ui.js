// NC-INPUT-01: the controller's way through menus and panels, and its settings. When a modal panel is open (the
// start menu, City Pulse, the bank, library, chess, residents, floors, economy boards, combat lobby, city map,
// character panel or these controller settings) the D-pad moves a visible focus between that panel's own
// buttons, A/Cross presses the focused one, B/Circle presses the panel's Close/Back (or sends Escape, which the
// game already handles). Nothing here invents actions: every press is a click on an existing control.
import { CONTROLLER_LIMITS, buttonLabel, loadControllerSettings, normalizeControllerSettings, saveControllerSettings } from './gamepad-input.js';

const FOCUSABLE = 'button, a[href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';
const CLOSE = '.cp-x, .lp-x, .bp-x, .rp-x, .fp-x, .gp-x, [aria-label^="Close" i], [data-act="close"]';
const CLOSE_TEXT = /^(close|×|✕|back|back to city|cancel|done|exit|leave)$/i;

// Pure spatial focus: from the current rect, the nearest candidate whose centre lies in `dir`. Distance along the
// direction counts once, sideways offset counts double, so a row or column is followed before jumping across.
export function pickFocus(rects, current, dir) {
  const c = rects[current]; if (!c) return rects.length ? 0 : -1;
  const cx = c.x + c.w / 2, cy = c.y + c.h / 2, v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
  let best = -1, bestScore = Infinity;
  rects.forEach((r, i) => {
    if (i === current) return;
    const dx = r.x + r.w / 2 - cx, dy = r.y + r.h / 2 - cy, along = dx * v[0] + dy * v[1], across = Math.abs(dx * v[1] - dy * v[0]);
    if (along <= 1) return;
    const score = along + across * 2; if (score < bestScore) { bestScore = score; best = i; }
  });
  return best === -1 ? current : best;
}

const visible = (el) => {
  if (!el || el.hidden || !el.isConnected) return false;
  const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
  const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0.05;
};

// The panel that should take the controller: the deepest visible modal dialog (a promotion picker inside chess
// beats the chess panel), otherwise the one drawn on top. Non-modal overlays (aria-modal="false") never take it.
export function findUiRoot(doc = globalThis.document) {
  const dialogs = [...doc.querySelectorAll('[role="dialog"], #ov')].filter((el) => el.getAttribute('aria-modal') !== 'false' && visible(el));
  if (!dialogs.length) return null;
  const deepest = dialogs.filter((d) => !dialogs.some((o) => o !== d && d.contains(o)));
  const z = (el) => { let n = 0; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const v = parseInt(getComputedStyle(e).zIndex, 10); if (Number.isFinite(v)) { n = v; break; } } return n; };
  return deepest.sort((a, b) => z(b) - z(a))[0];
}

export function createGamepadUi({ doc = globalThis.document, hud = null, getController = () => null, onPanel = () => {} } = {}) {
  let root = null, focused = null, zoomAcc = 0, panAcc = 0, scannedAt = -1e9, scans = 0;
  const clock = () => globalThis.performance?.now?.() ?? Date.now();
  const style = doc.createElement('style');
  style.textContent = `.gp-focus{outline:3px solid #b6f23a!important;outline-offset:2px!important;box-shadow:0 0 0 6px rgba(182,242,58,.25)!important}
#controllerPanel{position:fixed;inset:0;z-index:70;display:none;align-items:center;justify-content:center;background:rgba(6,5,10,.66);font-family:'Barlow Condensed','Barlow',system-ui,sans-serif;color:#f1ecfa;padding:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left))}
#controllerPanel.on{display:flex}
#controllerPanel .gp-card{background:#0f0c16;border:2px solid #7b3fe4;border-radius:14px;width:min(520px,100%);max-height:100%;overflow:auto;padding:14px 16px}
#controllerPanel h2{margin:0;font-size:22px;letter-spacing:.06em;color:#b6f23a}
#controllerPanel .gp-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px}
#controllerPanel .gp-row{display:grid;grid-template-columns:1fr auto 64px auto;align-items:center;gap:8px;padding:8px 0;border-top:1px solid #2a2338;font-size:17px}
#controllerPanel .gp-row b{text-align:center;font-variant-numeric:tabular-nums}
#controllerPanel button{min-height:44px;min-width:44px;padding:0 12px;border-radius:9px;border:1px solid #4b3a74;background:#1e1730;color:#f1ecfa;font:600 16px 'Barlow Condensed',sans-serif;cursor:pointer;touch-action:manipulation}
#controllerPanel .gp-status,#controllerPanel .gp-note,#controllerPanel .gp-map{font:400 14px/1.45 'Barlow',system-ui,sans-serif;color:#b9aed2;margin:6px 0}
#controllerPanel .gp-map{display:grid;grid-template-columns:auto 1fr;gap:2px 10px}
#controllerPanel .gp-map b{color:#f1ecfa}`;
  doc.head.appendChild(style);

  // ---- controller settings panel (persisted in localStorage like the camera and sound preferences)
  let settings = loadControllerSettings(), panel = null;
  const label = (b) => buttonLabel(getController()?.status?.family || 'xbox', b);
  function renderPanel() {
    if (!panel) return;
    const st = getController()?.status || { connected: false }, [dz0, dz1, dzs] = CONTROLLER_LIMITS.deadZone, [s0, s1, ss] = CONTROLLER_LIMITS.sensitivity;
    const fam = st.family === 'playstation' ? 'PlayStation-style' : st.family === 'xbox' ? 'Xbox-style' : 'Controller';
    panel.querySelector('.gp-status').textContent = st.connected ? `${fam} connected${st.standard ? '' : ' · limited support: this browser did not report a standard layout, so only the sticks and four face buttons are used'} · ${st.id.slice(0, 60)}` : 'No controller connected. Press any button on a paired controller.';
    panel.querySelector('[data-v="deadZone"]').textContent = settings.deadZone.toFixed(2);
    panel.querySelector('[data-v="sensitivity"]').textContent = `${settings.sensitivity.toFixed(1)}×`;
    panel.querySelector('[data-v="invertY"]').textContent = settings.invertY ? 'On' : 'Off';
    panel.querySelector('[data-step="deadZone:-1"]').disabled = settings.deadZone <= dz0; panel.querySelector('[data-step="deadZone:1"]').disabled = settings.deadZone >= dz1;
    panel.querySelector('[data-step="sensitivity:-1"]').disabled = settings.sensitivity <= s0; panel.querySelector('[data-step="sensitivity:1"]').disabled = settings.sensitivity >= s1;
    panel.dataset.steps = `${dzs},${ss}`;
    panel.querySelector('.gp-map').innerHTML = [['Left stick', 'Move · click to sprint'], ['Right stick', 'Look · click to crouch'], [label('a'), 'Jump · confirm'], [label('b'), 'Back / close'], [label('x'), 'Interact (doors, residents, bank, City Pulse)'], [label('y'), 'Next weapon'], [`${label('lb')} / ${label('rb')}`, 'Previous weapon / reload'], [`${label('lt')} / ${label('rt')}`, 'Aim / fire'], [label('back'), 'Tap: camera view · hold: these settings'], [label('start'), 'City map'], ['D-pad', 'Menus: move focus · combat: abilities']].map(([k, v]) => `<b>${k}</b><span>${v}</span>`).join('');
  }
  function ensurePanel() {
    if (panel) return panel;
    panel = doc.createElement('div'); panel.id = 'controllerPanel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', 'Controller settings');
    panel.innerHTML = `<div class="gp-card"><div class="gp-head"><h2>Controller</h2><button class="gp-x" type="button" aria-label="Close controller settings">CLOSE</button></div>
      <div class="gp-status" role="status"></div>
      <div class="gp-row"><span>Stick dead zone</span><button type="button" data-step="deadZone:-1" aria-label="Smaller dead zone">−</button><b data-v="deadZone"></b><button type="button" data-step="deadZone:1" aria-label="Larger dead zone">+</button></div>
      <div class="gp-row"><span>Camera sensitivity</span><button type="button" data-step="sensitivity:-1" aria-label="Lower sensitivity">−</button><b data-v="sensitivity"></b><button type="button" data-step="sensitivity:1" aria-label="Higher sensitivity">+</button></div>
      <div class="gp-row"><span>Invert look Y</span><span></span><b data-v="invertY"></b><button type="button" data-toggle="invertY" aria-label="Toggle invert Y">Toggle</button></div>
      <div class="gp-map"></div><div class="gp-note">Saved on this device only. Keyboard, mouse and touch keep working alongside the controller.</div></div>`;
    doc.body.appendChild(panel);
    panel.addEventListener('click', (e) => {
      const t = e.target.closest?.('button'); if (!t || t.disabled) return;
      if (t.classList.contains('gp-x')) return close();
      if (t.dataset.step) { const [k, d] = t.dataset.step.split(':'), step = k === 'deadZone' ? CONTROLLER_LIMITS.deadZone[2] : CONTROLLER_LIMITS.sensitivity[2]; apply({ [k]: settings[k] + Number(d) * step }); }
      if (t.dataset.toggle) apply({ invertY: !settings.invertY });
    });
    for (const type of ['keydown', 'keyup']) panel.addEventListener(type, (e) => { if (e.code !== 'Escape') e.stopPropagation(); });
    return panel;
  }
  function apply(next) { settings = saveControllerSettings(normalizeControllerSettings({ ...settings, ...next })); getController()?.setSettings(settings); renderPanel(); }
  function open() { ensurePanel(); renderPanel(); panel.classList.add('on'); onPanel(true); }
  function close() { if (panel?.classList.contains('on')) { panel.classList.remove('on'); onPanel(false); } }
  doc.addEventListener('keydown', (e) => { if (e.code === 'Escape' && panel?.classList.contains('on')) close(); });

  // ---- focus handling inside the active panel
  const candidates = () => (root ? [...root.querySelectorAll(FOCUSABLE)].filter((el) => !el.disabled && visible(el) && el.closest('[role="dialog"], #ov') === root) : []);
  function setFocus(el) {
    if (focused && focused !== el) focused.classList.remove('gp-focus');
    focused = el || null; if (!el) return;
    el.classList.add('gp-focus'); try { el.focus({ preventScroll: true }); } catch { /* not focusable */ } el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }
  function initialFocus() {
    const list = candidates(); if (!list.length) return setFocus(null);
    const go = root.id === 'ov' && list.find((el) => el.id === 'go');
    setFocus(go || list.find((el) => el.hasAttribute('autofocus') || el.classList.contains('on') || el.getAttribute('aria-checked') === 'true') || list[0]);
  }
  const rectOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
  const isMap = () => root?.id === 'cityMap';
  // A synthetic key press (down then up, so src/input.js never keeps a key held) on the map or the window.
  const key = (k) => { const target = isMap() ? root : globalThis, init = { key: k, code: k === 'Escape' ? 'Escape' : k, bubbles: true }; target.dispatchEvent(new KeyboardEvent('keydown', init)); target.dispatchEvent(new KeyboardEvent('keyup', init)); };

  const ui = {
    // Called every frame by the controller: the active panel, or null for gameplay. Only does work when the
    // controller is the device in use, so mouse and touch users never see a focus ring.
    active() {
      // Looking for the open panel reads styles and layout, so it runs at most five times a second (and again
      // straight after any controller press, see rescan()).
      if (clock() - scannedAt < 200 && (!root || root.isConnected)) return root;
      scannedAt = clock(); scans++;
      const next = findUiRoot(doc);
      if (next !== root) { root = next; focused?.classList.remove('gp-focus'); focused = null; if (root && getController()?.active) initialFocus(); }
      if (root && getController()?.active && (!focused || !root.contains(focused) || !visible(focused))) initialFocus();
      return root;
    },
    move(dir, source) {
      if (isMap() && source === 'stick') { panAcc++; key({ up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[dir]); return; }
      const list = candidates(); if (!list.length) return;
      const i = Math.max(0, list.indexOf(focused)); setFocus(list[pickFocus(list.map(rectOf), focused ? i : -1, dir)] || list[0]);
    },
    confirm() {
      const el = focused && root?.contains(focused) ? focused : candidates()[0]; if (!el) return;
      if (el.tagName === 'SELECT') { el.selectedIndex = (el.selectedIndex + 1) % el.options.length; el.dispatchEvent(new Event('change', { bubbles: true })); return; }
      if ((el.tagName === 'INPUT' && !/^(button|submit|checkbox|radio|range)$/i.test(el.type)) || el.tagName === 'TEXTAREA') { el.focus(); return; }
      el.click();
    },
    back() {
      if (!root || root.id === 'ov') return;
      const close = root.querySelector(CLOSE) || [...root.querySelectorAll('button')].find((b) => CLOSE_TEXT.test(b.textContent.trim()) && visible(b));
      if (close && visible(close) && close.closest('[role="dialog"], #ov') === root) close.click(); else key('Escape');
    },
    menu() { if (isMap()) key('Escape'); },
    scroll(dy) {
      if (!root || !dy) return;
      let el = focused; while (el && el !== root && !(el.scrollHeight > el.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
      const target = el && el !== root ? el : [...root.querySelectorAll('*')].find((e) => e.scrollHeight > e.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(e).overflowY)) || root;
      target.scrollTop += dy;
    },
    zoom(z) { if (!isMap()) return; zoomAcc += z; while (Math.abs(zoomAcc) >= 0.25) { key(zoomAcc > 0 ? '+' : '-'); zoomAcc -= Math.sign(zoomAcc) * 0.25; } },
    rescan() { scannedAt = -1e9; },
    get focused() { return focused; }, get stats() { return { panAcc, scans }; },
    openSettings: open, closeSettings: close, get settingsOpen() { return !!panel?.classList.contains('on'); }, get settings() { return settings; }, renderSettings: renderPanel,
    announce(status) {
      renderPanel();
      if (!hud) return;
      if (status.connected) hud.callout('CONTROLLER CONNECTED', `${status.family === 'playstation' ? 'PLAYSTATION' : status.family === 'xbox' ? 'XBOX' : 'CONTROLLER'}${status.standard ? '' : ' · LIMITED LAYOUT'} · HOLD ${buttonLabel(status.family, 'back')} FOR SETTINGS`);
      else hud.callout('CONTROLLER DISCONNECTED', 'KEYBOARD, MOUSE AND TOUCH STILL WORK');
    },
  };
  return ui;
}
