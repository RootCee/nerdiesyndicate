// NC-INPUT-01: Xbox and PlayStation controllers through the browser Gamepad API. This module turns a gamepad
// snapshot into the game's existing input state (src/input.js `input`) and look deltas, so movement, combat,
// interaction and server-validated multiplayer movement go through exactly the same pipeline as keyboard,
// mouse and touch. It adds no new gameplay actions. Pure apart from the injected `getPads`/`ui`: tests drive
// it with synthetic gamepads.
//
// W3C "standard" layout indices (what Chrome, Edge, Firefox and Safari report for Xbox and PlayStation pads):
//   0 A/Cross  1 B/Circle  2 X/Square  3 Y/Triangle  4 LB/L1  5 RB/R1  6 LT/L2  7 RT/R2  8 View/Share
//   9 Menu/Options  10 L3  11 R3  12-15 D-pad up/down/left/right ; axes 0,1 left stick, 2,3 right stick.
// A pad without mapping "standard" gets a limited layout (sticks on axes 0-3, face buttons 0-3 only) and its
// status says so: browsers do not agree on non-standard layouts.

export const CONTROLLER_STORAGE_KEY = 'nerdie-city-mafia-wars.controller';
export const CONTROLLER_DEFAULTS = Object.freeze({ deadZone: 0.15, sensitivity: 1, invertY: false });
export const CONTROLLER_LIMITS = Object.freeze({ deadZone: [0.05, 0.35, 0.05], sensitivity: [0.4, 2.5, 0.1] });
const BUTTONS = ['a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt', 'back', 'start', 'l3', 'r3', 'up', 'down', 'left', 'right'];
const TRIGGER_ON = 0.35, TRIGGER_OFF = 0.2, VIEW_HOLD_S = 0.7, LOOK_RATE = 3.2, PITCH_SCALE = 0.7, MOUSE_SENS = 0.0022;
const UI_REPEAT_FIRST = 0.38, UI_REPEAT = 0.13, UI_STICK = 0.6;
export const SPRINT_RELEASE_S = 0.35; // rc3: how long the stick must rest before a clicked sprint ends
export const SPRINT_ARMED_S = 1.0; // rc3: a click before moving waits this long for the stick

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (v, d) => (Number.isFinite(v) ? v : d);
export function normalizeControllerSettings(raw = {}) {
  const [dz0, dz1] = CONTROLLER_LIMITS.deadZone, [s0, s1] = CONTROLLER_LIMITS.sensitivity;
  return { deadZone: Math.round(clamp(num(Number(raw.deadZone), CONTROLLER_DEFAULTS.deadZone), dz0, dz1) * 100) / 100, sensitivity: Math.round(clamp(num(Number(raw.sensitivity), CONTROLLER_DEFAULTS.sensitivity), s0, s1) * 10) / 10, invertY: raw.invertY === true };
}
export function loadControllerSettings(storage = globalThis.localStorage) {
  try { return normalizeControllerSettings(JSON.parse(storage?.getItem(CONTROLLER_STORAGE_KEY) || '{}') || {}); } catch { return { ...CONTROLLER_DEFAULTS }; }
}
export function saveControllerSettings(settings, storage = globalThis.localStorage) {
  const s = normalizeControllerSettings(settings); try { storage?.setItem(CONTROLLER_STORAGE_KEY, JSON.stringify(s)); } catch { /* storage blocked: keep in memory */ } return s;
}

// Which family's button names to show. The id string is browser-specific; unknown pads use Xbox positions.
export function controllerFamily(id = '') {
  const s = String(id).toLowerCase();
  if (/xbox|xinput|045e|microsoft/.test(s)) return 'xbox'; // first: Xbox pads report "Xbox Wireless Controller"
  if (/dualsense|dualshock|playstation|054c|sony|wireless controller/.test(s)) return 'playstation';
  return 'generic';
}
export const BUTTON_LABELS = Object.freeze({
  xbox: { a: 'A', b: 'B', x: 'X', y: 'Y', lb: 'LB', rb: 'RB', lt: 'LT', rt: 'RT', back: 'VIEW', start: 'MENU', l3: 'L3', r3: 'R3' },
  playstation: { a: '✕', b: '○', x: '□', y: '△', lb: 'L1', rb: 'R1', lt: 'L2', rt: 'R2', back: 'SHARE', start: 'OPTIONS', l3: 'L3', r3: 'R3' },
});
export const buttonLabel = (family, button) => (BUTTON_LABELS[family] || BUTTON_LABELS.xbox)[button] || button.toUpperCase();

// Radial dead zone, rescaled so motion starts smoothly at the edge of the dead zone and reaches 1 at full tilt.
export function applyDeadZone(x, y, deadZone) {
  const m = Math.hypot(x, y);
  if (!(m > deadZone)) return { x: 0, y: 0, m: 0 };
  const scaled = Math.min(1, (m - deadZone) / (1 - deadZone));
  return { x: (x / m) * scaled, y: (y / m) * scaled, m: scaled };
}

// A plain snapshot of one pad: sticks (raw, -1..1, y down) and button pressure (0..1).
export function readPad(gp) {
  if (!gp || gp.connected === false) return null;
  const standard = gp.mapping === 'standard', axes = gp.axes || [], b = gp.buttons || [];
  const v = (i) => { const x = b[i]; return x == null ? 0 : typeof x === 'number' ? x : x.value > 0 ? x.value : x.pressed ? 1 : 0; }; // analog value wins (triggers)
  const buttons = {};
  BUTTONS.forEach((name, i) => { buttons[name] = standard || i < 4 ? v(i) : 0; });
  return { id: String(gp.id || ''), index: gp.index ?? 0, standard, family: controllerFamily(gp.id), lx: num(axes[0], 0), ly: num(axes[1], 0), rx: num(axes[2], 0), ry: num(axes[3], 0), buttons };
}

// Pick the pad to listen to: the one used most recently (any button or stick past the dead zone), else the first.
export function choosePad(pads, previousIndex, deadZone) {
  const live = [...(pads || [])].map(readPad).filter(Boolean);
  if (!live.length) return null;
  const active = live.find((p) => Object.values(p.buttons).some((x) => x > 0.5) || Math.hypot(p.lx, p.ly) > deadZone || Math.hypot(p.rx, p.ry) > deadZone);
  return active || live.find((p) => p.index === previousIndex) || live[0];
}

// The controller state machine. `input` is src/input.js's shared object. `ui` (gamepad-ui.js in the game) answers
// whether a menu/panel has the controller and performs focus moves; null means gameplay only.
export class GamepadController {
  constructor({ input, getPads = () => (globalThis.navigator?.getGamepads?.() || []), ui = null, settings = loadControllerSettings(), onChange = () => {}, onSettingsRequest = () => {} } = {}) {
    Object.assign(this, { input, getPads, ui, settings: normalizeControllerSettings(settings), onChange, onSettingsRequest });
    this.prev = Object.fromEntries(BUTTONS.map((n) => [n, 0])); this.pad = null; this.connected = false; this.active = false; this.lastUsed = 0;
    this.owned = { move: false, fire: false, ads: false, sprint: false }; this.sprintLatch = false; this.viewHeld = 0; this.viewHoldFired = false; this.trigger = { rt: false, lt: false };
    this.repeat = { dir: '', t: 0 }; this.events = 0;
  }
  setSettings(s) { this.settings = normalizeControllerSettings({ ...this.settings, ...s }); return this.settings; }
  get status() { return this.pad ? { connected: true, id: this.pad.id, family: this.pad.family, standard: this.pad.standard, index: this.pad.index } : { connected: false }; }
  // Releases everything the controller is holding (disconnect, focus loss, a menu taking over).
  release() {
    const i = this.input;
    if (this.owned.move) { i.moveX = 0; i.moveY = 0; } if (this.owned.fire) i.fire = false; if (this.owned.ads) i.ads = false; if (this.owned.sprint) i.sprint = false;
    this.owned = { move: false, fire: false, ads: false, sprint: false }; this.sprintLatch = false; this.trigger = { rt: false, lt: false }; this.repeat = { dir: '', t: 0 };
  }
  // Window blur / hidden page: drop held actions and treat every button as released until it is pressed again.
  blur() { this.release(); this.prev = Object.fromEntries(BUTTONS.map((n) => [n, 1])); this.viewHoldFired = true; }
  // Keyboard, mouse or touch was used: prompts and look gating go back to that device until the pad is used again.
  otherInput() { this.active = false; }
  // Called once per frame after src/input.js poll(). Returns the look delta in mouse-pixel units.
  update(dt) {
    const out = { dx: 0, dy: 0 };
    const pad = choosePad(this.getPads(), this.pad?.index, this.settings.deadZone);
    if (!pad) { if (this.connected) { this.release(); this.connected = false; this.active = false; this.pad = null; this.onChange(this.status); } return out; }
    const changed = !this.pad || this.pad.id !== pad.id || this.pad.index !== pad.index;
    const B = pad.buttons;
    this.pad = pad;
    if (!this.connected || changed) {
      // A newly connected pad: buttons already held (the press that woke the pad up) are not new presses.
      this.connected = true; for (const n of BUTTONS) this.prev[n] = B[n]; this.viewHeld = 0; this.viewHoldFired = B.back > 0.5; this.onChange(this.status);
    }
    const  pressed = (n, t = 0.5) => B[n] > t, edge = (n) => B[n] > 0.5 && !(this.prev[n] > 0.5), up = (n) => !(B[n] > 0.5) && this.prev[n] > 0.5;
    const L = applyDeadZone(pad.lx, pad.ly, this.settings.deadZone), R = applyDeadZone(pad.rx, pad.ry, this.settings.deadZone);
    const used = L.m > 0 || R.m > 0 || BUTTONS.some((n) => pressed(n));
    if (used) { this.active = true; this.lastUsed++; }
    const i = this.input; if (BUTTONS.some((n) => edge(n))) this.ui?.rescan?.();
    const uiRoot = this.ui?.active?.() || null;
    if (uiRoot) {
      // A menu or panel has the controller: release gameplay holds, navigate, confirm, go back.
      if (this.owned.move || this.owned.fire || this.owned.ads || this.owned.sprint) this.release();
      const pad = pressed('up') ? 'up' : pressed('down') ? 'down' : pressed('left') ? 'left' : pressed('right') ? 'right' : '';
      const stick = L.y < -UI_STICK ? 'up' : L.y > UI_STICK ? 'down' : L.x < -UI_STICK ? 'left' : L.x > UI_STICK ? 'right' : '';
      const dir = pad || stick, source = pad ? 'dpad' : 'stick', key = dir && `${source}:${dir}`;
      if (dir && key !== this.repeat.dir) { this.repeat = { dir: key, t: UI_REPEAT_FIRST }; this.ui.move(dir, source); }
      else if (dir) { this.repeat.t -= dt; if (this.repeat.t <= 0) { this.repeat.t = UI_REPEAT; this.ui.move(dir, source); } }
      else this.repeat = { dir: '', t: 0 };
      if (edge('a')) this.ui.confirm();
      if (edge('b')) this.ui.back();
      if (edge('start')) this.ui.menu?.();
      if (R.m > 0) this.ui.scroll?.(R.y * 900 * dt, R.x);
      if (B.rt > TRIGGER_ON || B.lt > TRIGGER_ON) this.ui.zoom?.((B.rt - B.lt) * dt);
    } else {
      // Movement: the stick overrides the keyboard while it is tilted and hands back when centred (no doubling).
      if (L.m > 0) { i.moveX = L.x || 0; i.moveY = L.y ? -L.y : 0; this.owned.move = true; }
      else if (this.owned.move) { i.moveX = 0; i.moveY = 0; this.owned.move = false; }
      // Look: proportional with a gentle curve for fine aim; never moves when the stick is centred.
      if (R.m > 0) {
        const curve = (v) => Math.sign(v) * Math.pow(Math.abs(v), 1.6), rate = (LOOK_RATE * this.settings.sensitivity * dt) / MOUSE_SENS;
        out.dx = curve(R.x) * rate; out.dy = curve(R.y) * rate * PITCH_SCALE * (this.settings.invertY ? -1 : 1);
      }
      // Triggers with hysteresis: fire and aim are held only while pressed.
      this.trigger.rt = this.trigger.rt ? B.rt > TRIGGER_OFF : B.rt > TRIGGER_ON; this.trigger.lt = this.trigger.lt ? B.lt > TRIGGER_OFF : B.lt > TRIGGER_ON;
      if (this.trigger.rt) { i.fire = true; this.owned.fire = true; } else if (this.owned.fire) { i.fire = false; this.owned.fire = false; }
      if (this.trigger.lt) { i.ads = true; this.owned.ads = true; } else if (this.owned.ads) { i.ads = false; this.owned.ads = false; }
      // Sprint: click L3 (a latch, as on most console games). rc2 ended it in the same frame whenever the stick was
      // centred, so the usual "click, then push" never sprinted. Now the click counts for a moment before the stick
      // moves, and sprint ends once the stick has rested SPRINT_RELEASE_S, or on crouch (R3).
      // A click with the stick at rest stays armed for up to SPRINT_ARMED_S until the stick first moves.
      if (edge('l3')) { this.sprintLatch = true; this.sprintIdle = 0; this.sprintMoved = L.m > 0; this.sprintArmed = SPRINT_ARMED_S; }
      if (L.m > 0) { this.sprintMoved = true; this.sprintIdle = 0; }
      else if (!this.sprintMoved) { this.sprintArmed = (this.sprintArmed || 0) - dt; if (this.sprintArmed <= 0) this.sprintLatch = false; }
      else { this.sprintIdle = (this.sprintIdle || 0) + dt; if (this.sprintIdle >= SPRINT_RELEASE_S) this.sprintLatch = false; }
      if (edge('r3')) this.sprintLatch = false;
      if (this.sprintLatch) { i.sprint = true; this.owned.sprint = true; } else if (this.owned.sprint) { i.sprint = false; this.owned.sprint = false; }
      if (edge('a')) i.jump = true;
      if (edge('x')) i.interact = true;
      if (edge('y')) i.swap = 'next';
      if (edge('lb')) i.swap = 'prev';
      if (edge('rb')) i.reload = true;
      if (edge('r3')) i.crouch = !i.crouch;
      if (edge('start')) i.map = true;
      if (edge('left')) i.ab = 4; if (edge('up')) i.ab = 5; if (edge('right')) i.ab = 6;
    }
    // View/Share: a tap switches camera view (gameplay); holding it opens the controller settings (anywhere).
    if (pressed('back')) { this.viewHeld += dt; if (this.viewHeld >= VIEW_HOLD_S && !this.viewHoldFired) { this.release(); this.viewHoldFired = true; this.onSettingsRequest(); } }
    else if (up('back')) { if (!this.viewHoldFired && !uiRoot) i.camera = true; this.viewHeld = 0; this.viewHoldFired = false; }
    for (const n of BUTTONS) this.prev[n] = B[n];
    return out;
  }
}

// Interaction prompts in the controller's own button names: "[E] ENTER" / "TAP ENTER" -> "[X] ENTER" (Xbox) or
// "[□] ENTER" (PlayStation). A prompt with no key at all (mobile resident talk) gets the button in front.
export function controllerPrompt(text, family = 'xbox') {
  if (!text) return text;
  const key = `[${buttonLabel(family, 'x')}]`;
  const out = String(text).replace(/\[E\]/g, key).replace(/\bTAP\b/g, key);
  return out === text && !out.includes(key) ? `${key} ${out}` : out;
}
