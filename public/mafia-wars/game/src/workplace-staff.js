// NC-LIFE-02 / 0.9.4 Phase 1: the staff on shift inside City Hall and the Academy Library, each at their station
// (city-locations.js), drawn only while the player is in that space. Built like bank-staff.js, which is unchanged.
// - Multiplayer: the room says who is working there (`space-staff`); it keeps them off the street while they
//   work, so nobody is ever drawn twice. A room that does not send it (the 0.9.3 Worker) leaves the space empty.
// - Solo play: the same answer from the same schedules (the bank's job rows) and the economic clock.
// - Whoever is there when the player comes in is simply there; someone arriving while the player watches walks
//   in from the door along their station's route, and someone leaving walks out the same way, then disappears.
// Presence only: nothing here posts, pays, or reads balances.
import { PERMANENT_RESIDENT_IDENTITIES, PERMANENT_RESIDENT_SCHEDULES } from './permanent-residents.js';
import { economicMinuteOfDay } from './resident-schedule.js';
import { assignStationsStable, onDutyAt, staffedLocationForSpace, stationById } from './city-locations.js';

const WALK_SPEED = 1.25, ARRIVED = 0.06, NOTICE_M = 6, WAVE_MS = 2600, PLACE_WINDOW_MS = 1500, SOLO_REFRESH_MS = 5000;
export const WORKPLACE_STAFF_LIMIT = 3; // one per station: City Hall's two counters and Registration desk, the library's three

// Solo play: who works at a location this minute, with their stations ([{ index, residentId, station }]).
// previous: Map(residentId -> station) from the last answer, so whoever holds a station keeps it (as the room does).
export function soloStaff(locationId, minute, schedules = PERMANENT_RESIDENT_SCHEDULES, previous = new Map()) {
  return assignStationsStable(locationId, onDutyAt(locationId, minute, schedules).map((s) => ({ index: schedules.indexOf(s), residentId: s.residentId })), previous).filter((o) => o.station);
}
// The residents to draw from a room message or solo list: known permanent residents at a real station of this
// location, each resident and each station once, at most the limit. Returns [{ index, station }].
export function staffToDraw(locationId, staff, limit = WORKPLACE_STAFF_LIMIT) {
  const seen = new Set(), stations = new Set(), out = [];
  for (const s of Array.isArray(staff) ? staff : []) {
    if (!Number.isSafeInteger(s?.index) || !PERMANENT_RESIDENT_IDENTITIES[s.index] || seen.has(s.index) || stations.has(s.station) || !stationById(locationId, s.station)) continue;
    seen.add(s.index); stations.add(s.station); out.push({ index: s.index, station: s.station });
  }
  return out.slice(0, limit);
}

export class WorkplaceStaff {
  constructor(scene, { library, now = () => performance.now(), minute = () => economicMinuteOfDay() } = {}) {
    Object.assign(this, { scene, library, clock: now, minute });
    this.room = { spaceId: null, staff: [] }; this.entries = new Map(); this.spaceId = null; this.enteredAt = -Infinity; this.solo = { at: -Infinity, list: [] }; this.waveUntil = 0;
  }
  // From the room: who is working in the space the player is in (spaceId null: the player is not in one).
  setStaff(spaceId, staff = []) { this.room = { spaceId: spaceId || null, staff: spaceId ? staff : [] }; }
  // The player's session ended (not a dropped connection: the room re-sends after a reconnect).
  clear() { this.room = { spaceId: null, staff: [] }; this.#dropAll(); }
  get drawn() { return [...this.entries].filter(([, e]) => !e.leaving).map(([i, e]) => ({ index: i, station: e.station.id })).sort((a, b) => a.index - b.index); }
  // A worker within reach to talk to (across their counter or desk): { index, identity, station } or null.
  nearby(player, reach) {
    let best = null, bestD = reach;
    for (const [index, e] of this.entries) { if (e.leaving || e.path.length) continue; const d = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z); if (d < bestD) { best = { index, identity: e.identity, station: e.station.id }; bestD = d; } }
    return best;
  }
  #wanted(locationId, solo) {
    if (!solo) return staffToDraw(locationId, this.room.spaceId === this.spaceId ? this.room.staff : []);
    const now = this.clock();
    if (now - this.solo.at >= SOLO_REFRESH_MS || this.solo.locationId !== locationId) {
      const previous = this.solo.locationId === locationId ? this.solo.held || new Map() : new Map(), staff = soloStaff(locationId, this.minute(), undefined, previous);
      this.solo = { at: now, locationId, held: new Map(staff.map((o) => [o.residentId, o.station])), list: staffToDraw(locationId, staff) };
    }
    return this.solo.list;
  }
  // Each frame: the space the player is in (any space id; only staffed ones draw anyone), and solo or not.
  update(dt, spaceId, player, { solo = false } = {}) {
    const locationId = staffedLocationForSpace(spaceId);
    if (!locationId) { if (this.spaceId) this.#dropAll(); this.spaceId = null; return; }
    const now = this.clock();
    if (this.spaceId !== spaceId) { this.#dropAll(); this.spaceId = spaceId; this.enteredAt = now; this.solo.at = -Infinity; }
    const placing = now - this.enteredAt < PLACE_WINDOW_MS, want = new Map(this.#wanted(locationId, solo).map((w) => [w.index, w.station]));
    for (const [index, e] of this.entries) { // leaving: back along their route, out of the door
      if (e.leaving || want.get(index) === e.station.id) continue;
      e.leaving = true; e.path = e.station.route.slice(0, -1).reverse();
    }
    for (const [index, stationId] of want) {
      if (this.entries.has(index) && !this.entries.get(index).leaving) continue;
      if (this.entries.has(index)) { this.entries.get(index).visual.dispose(); this.entries.delete(index); } // came back while leaving
      const identity = PERMANENT_RESIDENT_IDENTITIES[index], station = stationById(locationId, stationId);
      if (!this.library.npcPackReady(identity.appearance.pack)) { this.library.ensureNpcPack(identity.appearance.pack).catch(() => {}); continue; }
      const visual = this.library.buildNpcVisual(identity); if (!visual) continue;
      const start = placing ? station : station.route[0];
      const e = { visual, identity, station, leaving: false, pos: { x: start.x, z: start.z }, path: placing ? [] : station.route.slice(1) };
      visual.root.position.set(start.x, station.y, start.z); visual.root.rotation.y = station.yaw;
      visual.root.traverse((o) => o.layers.set(1)); this.scene.add(visual.root);
      this.entries.set(index, e); this.waveUntil = now + WAVE_MS;
    }
    const remove = [];
    for (const [index, e] of this.entries) {
      if (e.path.length) {
        const to = e.path[0], dx = to.x - e.pos.x, dz = to.z - e.pos.z, d = Math.hypot(dx, dz), step = Math.min(d, WALK_SPEED * dt);
        if (d > 1e-6) { e.pos.x += dx / d * step; e.pos.z += dz / d * step; e.visual.root.rotation.y = Math.atan2(dx, dz); }
        if (d - step <= ARRIVED) e.path.shift();
        e.visual.root.position.set(e.pos.x, e.station.y, e.pos.z); e.visual.play('Walk', 0.2);
        if (!e.path.length && e.leaving) remove.push(index);
        if (!e.path.length && !e.leaving) e.visual.root.rotation.y = e.station.yaw;
      } else if (e.leaving) remove.push(index);
      else {
        const near = player && Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z) < NOTICE_M;
        e.visual.play(now < this.waveUntil && near ? 'Wave' : e.identity.traits.sociability > 0.5 ? 'Idle' : 'Idle_Neutral', 0.25);
        e.visual.root.rotation.y = near ? Math.atan2(player.pos.x - e.pos.x, player.pos.z - e.pos.z) : e.station.yaw; // looks at whoever comes up
      }
      e.visual.mixer.update(dt);
    }
    for (const index of remove) { this.entries.get(index).visual.dispose(); this.entries.delete(index); }
  }
  // Development diagnostics (QA): who is drawn where.
  diagnostics() {
    return { spaceId: this.spaceId, room: this.room, drawn: [...this.entries].map(([index, e]) => ({ index, residentId: PERMANENT_RESIDENT_SCHEDULES[index]?.residentId || null, station: e.station.id,
      state: e.leaving ? 'leaving' : e.path.length ? 'arriving' : 'at-station', position: { x: Math.round(e.pos.x * 100) / 100, z: Math.round(e.pos.z * 100) / 100 }, visible: e.visual.root.parent === this.scene })) };
  }
  #dropAll() { for (const e of this.entries.values()) e.visual.dispose(); this.entries.clear(); }
}
