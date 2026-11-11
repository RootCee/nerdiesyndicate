// RC1 hotfix: the bank's tellers behind their windows. Residents #1-3 work at the Nerdie City Bank from 8 AM to
// noon Pacific (permanent-residents.js; the bank ledger records the same jobs). The room keeps them inside while
// they work (npc-sim indoorWorkplace, like store clerks), so they are never also on the street, and tells a
// player in the bank who is on shift (`bank-staff`, room-core.js). A room that does not send it (an older
// Worker) leaves the windows empty, as before, so nobody is ever drawn twice.
// Bank visits (approved 11 November 2026): the same message lists residents visiting as customers (`visitors`);
// they stand at customer spots (a step back from the teller windows, by the market terminals, by the benches)
// and can be talked to like anyone in the city. Visits involve no money.
//
// Teller lifecycle (fix for "a teller disappeared", founder iPhone test 11 November 2026):
// - Everyone keeps their window or spot until they leave; one person leaving never moves anyone else.
// - Someone who arrives while the player watches walks in (tellers from the staff gate, visitors from the door);
//   someone who leaves walks out the same way and only then disappears. Whoever is already there when the
//   player enters (or after a reconnect resync) is simply there.
// - A dropped connection does not clear anyone; the room re-sends the current list after every (re)connect.
// - diagnostics() describes each teller, and `events` keeps the last changes with their reasons.
import { PERMANENT_RESIDENT_IDENTITIES, PERMANENT_RESIDENT_SCHEDULES } from './permanent-residents.js';
import { scheduledPlace } from './resident-schedule.js';

const WAVE_MS = 2600, NOTICE_M = 6, WALK_SPEED = 1.25, ARRIVED = 0.06, PLACE_WINDOW_S = 1.5, EVENT_LIMIT = 40;
export const BANK_STAFF_LIMIT = 4; // one per teller window
export const BANK_VISITOR_LIMITS = Object.freeze({ mobile: 4, desktop: 8 });
export const BANK_TELLER_INDICES = Object.freeze(PERMANENT_RESIDENT_SCHEDULES.map((s, i) => (s.employment?.workplaceId === 'nerdie-city-bank' ? i : -1)).filter((i) => i >= 0));
const r2 = (v) => Math.round(v * 100) / 100;

// Where a teller stands: behind the counter (the staff side, east of the line) at their window, facing the
// customers' side. Pure, from bank-layout.js bankInterior(); windows are filled in order.
export function tellerStands(layout) {
  const c = layout.counter, x = r2(c.x + c.depth / 2 + 0.55);
  return layout.tellers.map((z) => Object.freeze({ x, y: layout.y, z, yaw: -Math.PI / 2 }));
}
// Where customers stand, in the order they are filled: at teller windows 1-3 (a step back from the station, so
// the player can still use it), then the four market terminals, then by the two benches. Each faces what they
// came for. Pure.
export function visitorSpots(layout) {
  const y = layout.y, st = (id) => layout.stations.find((s) => s.id === id), spots = [];
  for (const id of ['teller-1', 'teller-2', 'teller-3']) { const s = st(id); spots.push({ x: r2(s.stand.x - 0.6), z: s.stand.z, yaw: Math.PI / 2 }); }
  for (const id of ['market-1', 'market-2', 'market-3', 'market-4']) { const s = st(id); spots.push({ x: r2(s.stand.x + 0.6), z: s.stand.z, yaw: -Math.PI / 2 }); }
  for (const b of layout.benches) spots.push({ x: r2(b.x + (b.x < layout.medallion.x ? -0.75 : 0.75)), z: r2(b.z + 0.4), yaw: b.x < layout.medallion.x ? Math.PI / 2 : -Math.PI / 2 });
  return spots.map((s) => Object.freeze({ ...s, y }));
}
// How someone gets between the way in and their stand (walked in reverse when leaving). Tellers: along the
// staff side of the counter from the staff gate at its north end. Visitors: from the street door up the centre
// aisle (between the columns), across past the benches' ends, then to their spot. Pure.
export function bankRoute(layout, stand, role) {
  const y = layout.y;
  if (role === 'teller') return [{ x: stand.x, y, z: r2(layout.counter.z0 + 0.45) }, { x: stand.x, y, z: stand.z }];
  const aisle = layout.doorX, door = { x: aisle, y, z: r2(layout.maxZ - 1.0) };
  const clearZ = r2(Math.max(stand.z, ...layout.benches.map((b) => b.z + b.length / 2 + 1.0)));
  return [door, { x: aisle, y, z: clearZ }, { x: stand.x, y, z: clearZ }, { x: stand.x, y, z: stand.z }];
}
// The residents to draw: valid permanent residents, unique, lowest resident number first.
export function tellersToDraw(residents, limit = BANK_STAFF_LIMIT, exclude = new Set()) {
  const seen = new Set(), out = [];
  for (const r of Array.isArray(residents) ? residents : []) {
    if (!Number.isSafeInteger(r?.index) || !PERMANENT_RESIDENT_IDENTITIES[r.index] || seen.has(r.index) || exclude.has(r.index)) continue;
    seen.add(r.index); out.push(r.index);
  }
  return out.sort((a, b) => a - b).slice(0, limit);
}
// Keeps everyone where they are: residents already placed keep their slot; newcomers take the first free slot
// in order. Returns Map(index -> slot number). Pure.
export function assignSlots(previous, wanted, slotCount) {
  const out = new Map(), used = new Set();
  for (const index of wanted) if (previous.has(index) && previous.get(index) < slotCount && !used.has(previous.get(index))) { out.set(index, previous.get(index)); used.add(previous.get(index)); }
  for (const index of wanted) {
    if (out.has(index)) continue;
    let slot = 0; while (used.has(slot)) slot++;
    if (slot >= slotCount) continue; out.set(index, slot); used.add(slot);
  }
  return out;
}

export class BankStaff {
  constructor(scene, { library, layout, mobile = false, debug = false, now = () => performance.now() }) {
    Object.assign(this, { scene, library, layout, debug, clock: now }); this.stands = tellerStands(layout); this.spots = visitorSpots(layout);
    this.visitorLimit = Math.min(this.spots.length, mobile ? BANK_VISITOR_LIMITS.mobile : BANK_VISITOR_LIMITS.desktop);
    this.wanted = []; this.wantedVisitors = []; this.slots = { teller: new Map(), visitor: new Map() }; this.entries = new Map(); this.waveUntil = 0;
    this.inside = false; this.enteredAt = -Infinity; this.lastMessageAt = null; this.firstMessageAt = null; this.events = [];
  }
  #event(index, what, reason) {
    const e = { at: Math.round(this.clock()), index, residentId: PERMANENT_RESIDENT_SCHEDULES[index]?.residentId || null, what, reason };
    this.events.push(e); if (this.events.length > EVENT_LIMIT) this.events.shift();
    if (this.debug) console.info(`[bank] ${e.residentId} ${what} (${reason})`);
  }
  // From the room: who is on shift inside, and who is visiting (an empty list means nobody).
  setResidents(residents, visitors = []) {
    this.lastMessageAt = this.clock();
    if (this.inside && this.firstMessageAt === null) this.firstMessageAt = this.lastMessageAt; // the room's first answer since entering
    this.wanted = tellersToDraw(residents);
    this.wantedVisitors = tellersToDraw(visitors, this.visitorLimit, new Set(this.wanted));
    this.slots.teller = assignSlots(this.slots.teller, this.wanted, this.stands.length);
    this.slots.visitor = assignSlots(this.slots.visitor, this.wantedVisitors, this.spots.length);
  }
  // The player's session ended (not a dropped connection: the room re-sends after a reconnect).
  clear(reason = 'session-ended') {
    for (const index of this.entries.keys()) this.#event(index, 'removed', reason);
    this.wanted = []; this.wantedVisitors = []; this.slots = { teller: new Map(), visitor: new Map() }; this.#dropAll();
  }
  get count() { return [...this.entries.values()].filter((e) => !e.leaving).length; }
  get drawn() { return [...this.entries].filter(([, e]) => e.role === 'teller' && !e.leaving).map(([i]) => i).sort((a, b) => a - b); }
  get drawnVisitors() { return [...this.entries].filter(([, e]) => e.role === 'visitor' && !e.leaving).map(([i]) => i).sort((a, b) => a - b); }
  // A visitor within reach to talk to: { index, identity } or null (tellers are served by the teller station).
  nearbyVisitor(player, reach) {
    let best = null, bestD = reach;
    for (const [index, e] of this.entries) { if (e.role !== 'visitor' || e.leaving) continue; const d = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z); if (d < bestD) { best = { index, identity: e.identity }; bestD = d; } }
    return best;
  }
  // Each frame: inside the bank or not.
  update(dt, inside, player) {
    if (!inside) { if (this.inside) { for (const index of this.entries.keys()) this.#event(index, 'removed', 'player-left-bank'); this.#dropAll(); } this.inside = false; return; }
    // On entering: a list already in hand (the room's answer can arrive a frame before the client is inside) counts
    // as the room's first answer; otherwise wait for it.
    if (!this.inside) { this.inside = true; this.enteredAt = this.clock(); this.firstMessageAt = this.wanted.length || this.wantedVisitors.length ? this.enteredAt : null; }
    // Whoever the room lists on entering (however long its first answer takes on a phone network) is already there.
    const now = this.clock(), placing = now - this.enteredAt < PLACE_WINDOW_S * 1000 || this.firstMessageAt === null || now - this.firstMessageAt < 500;
    const want = new Map();
    for (const [index, slot] of this.slots.teller) want.set(index, { stand: this.stands[slot], role: 'teller' });
    for (const [index, slot] of this.slots.visitor) want.set(index, { stand: this.spots[slot], role: 'visitor' });
    // leaving: walk out the way they came, then disappear
    for (const [index, e] of this.entries) {
      if (e.leaving || (want.has(index) && want.get(index).stand === e.stand)) continue;
      const route = bankRoute(this.layout, e.stand, e.role).reverse(); route.shift(); // from their stand outwards
      e.leaving = true; e.path = route; this.#event(index, 'leaving', e.role === 'teller' ? 'shift-over' : 'visit-over');
    }
    for (const [index, { stand, role }] of want) {
      if (this.entries.has(index) && !this.entries.get(index).leaving) continue;
      if (this.entries.has(index)) { this.entries.get(index).visual.dispose(); this.entries.delete(index); } // came back while leaving: start again
      const identity = PERMANENT_RESIDENT_IDENTITIES[index];
      if (!this.library.npcPackReady(identity.appearance.pack)) { this.library.ensureNpcPack(identity.appearance.pack).catch(() => {}); continue; }
      const visual = this.library.buildNpcVisual(identity); if (!visual) continue;
      const route = bankRoute(this.layout, stand, role), walkIn = !placing, start = walkIn ? route[0] : stand;
      const e = { visual, stand, identity, role, leaving: false, pos: { x: start.x, z: start.z }, path: walkIn ? route.slice(1) : [] };
      visual.root.position.set(start.x, stand.y, start.z); visual.root.rotation.y = stand.yaw;
      visual.root.traverse((o) => o.layers.set(1)); this.scene.add(visual.root);
      this.entries.set(index, e); if (role === 'teller') this.waveUntil = now + WAVE_MS;
      this.#event(index, walkIn ? 'arriving' : 'present', walkIn ? (role === 'teller' ? 'shift-start' : 'visit-start') : 'already-there');
    }
    const remove = [];
    for (const [index, e] of this.entries) {
      if (e.path.length) { // walking
        const to = e.path[0], dx = to.x - e.pos.x, dz = to.z - e.pos.z, d = Math.hypot(dx, dz), step = Math.min(d, WALK_SPEED * dt);
        if (d > 1e-6) { e.pos.x += dx / d * step; e.pos.z += dz / d * step; e.visual.root.rotation.y = Math.atan2(dx, dz); }
        if (d - step <= ARRIVED) e.path.shift();
        e.visual.root.position.set(e.pos.x, e.stand.y, e.pos.z); e.visual.play('Walk', 0.2);
        if (!e.path.length && e.leaving) remove.push(index);
        if (!e.path.length && !e.leaving) e.visual.root.rotation.y = e.stand.yaw;
      } else {
        const near = player && Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z) < (e.role === 'teller' ? NOTICE_M : 2.5);
        e.visual.play(e.role === 'teller' && now < this.waveUntil && near ? 'Wave' : e.identity.traits.sociability > 0.5 ? 'Idle' : 'Idle_Neutral', 0.25);
        e.visual.root.rotation.y = near ? Math.atan2(player.pos.x - e.pos.x, player.pos.z - e.pos.z) : e.stand.yaw; // looks at whoever comes up to them
      }
      e.visual.mixer.update(dt);
    }
    for (const index of remove) { const e = this.entries.get(index); e.visual.dispose(); this.entries.delete(index); this.#event(index, 'gone', e.role === 'teller' ? 'through-staff-gate' : 'out-the-door'); }
  }
  // Development diagnostics (QA, ?bankDebug=1): each teller's schedule, what the room last said, what is drawn.
  // three: the page's Three.js (window.__hw.THREE) for the in-view test; this module stays Three.js-free for Node.
  diagnostics({ minute = null, camera = null, three = null } = {}) {
    const frustum = camera && three ? new three.Frustum().setFromProjectionMatrix(new three.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)) : null;
    return BANK_TELLER_INDICES.map((index) => {
      const s = PERMANENT_RESIDENT_SCHEDULES[index], e = this.entries.get(index), job = s.employment;
      const at = minute === null ? null : scheduledPlace(job, minute, s.homeLocationId, index);
      return {
        residentId: s.residentId, index, job: job?.title || null, shift: job ? `${job.shiftStartMinute}-${job.shiftStartMinute + job.shiftDurationMinutes}` : null,
        minute, scheduled: at ? `${at.activity}@${at.locationId}` : null, inLatestMessage: this.wanted.includes(index), playerInside: this.inside,
        drawn: !!e, state: !e ? 'none' : e.leaving ? 'leaving' : e.path.length ? 'arriving' : 'at-window',
        window: this.slots.teller.has(index) ? this.slots.teller.get(index) + 1 : null, position: e ? { x: r2(e.pos.x), z: r2(e.pos.z) } : null,
        visible: !!e && e.visual.root.visible && e.visual.root.parent === this.scene,
        inView: !!e && !!frustum && frustum.containsPoint(new three.Vector3(e.pos.x, e.stand.y + 1.0, e.pos.z)),
        lastChange: [...this.events].reverse().find((ev) => ev.index === index) || null,
      };
    });
  }
  #dropAll() { for (const e of this.entries.values()) e.visual.dispose(); this.entries.clear(); this.inside = false; }
}
