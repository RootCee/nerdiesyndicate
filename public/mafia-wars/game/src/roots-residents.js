import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { seedPopulation } from './npc-population.js';
import { applySeatedPose, findSeatBones } from './seated-pose.js';
import { CITY_RESIDENT_IDENTITIES } from './permanent-residents.js';
import { barStations } from './city-locations.js';

// NC-ECO-01C: residents settle clear of the doorway (exit range + TALK range) and at least `spacing` apart.
export const ROOTS_RESIDENT_LIMITS = Object.freeze({ mobile: 10, desktop: 20, interactionRange: 1.5, barReach: 2.3, speed: 1.25, spacing: 0.6, doorClearance: 4.1 });
const SETTLED = 0.15;

// A permanent resident (res_0007, NC-LIFE-01A) looks exactly as on the street; the room economy's
// generated residents keep their seeded looks.
const lookFor = (resident) => {
  const permanent = /^res_\d{4}$/.test(resident.id) && CITY_RESIDENT_IDENTITIES[Number(resident.id.slice(4)) - 1];
  if (permanent) return { ...permanent, id: `roots-${resident.id}` };
  const index = Math.max(0, Number(String(resident.id).match(/\d+/)?.[0] || 1) - 1), batch = Math.floor(index / 36), identity = seedPopulation(`roots-economy-${batch}`, 36)[index % 36];
  return { ...identity, id: `roots-${resident.id}` };
};

// NC-LIFE-02 0.9.4: the bartender on shift (the room's bank-backed residents list: occupation 'bartender', activity
// 'bar') works behind the bar, facing the room (city-locations.js stations). Guests whose activity is 'bar' are
// customers and stay on the room side, at the stools, as before.
export const isBartender = (resident) => resident?.occupation === 'bartender' && resident?.activity === 'bar';
const barCache = new WeakMap();
function behindBar(layout, taken) {
  if (!barCache.has(layout)) barCache.set(layout, barStations(layout));
  const stations = barCache.get(layout), s = stations.find((st) => taken.every((t) => Math.hypot(st.x - t.x, st.z - t.z) >= ROOTS_RESIDENT_LIMITS.spacing)) || stations[0];
  return { x: s.x, z: s.z, yaw: s.yaw, activity: 'bar', staff: true, via: s.route.slice(1, -1) };
}
export function rootsResidentDestination(layout, resident, index) {
  const activity = resident.activity || 'socializing', group = Number(String(resident.socialGroupId || '').match(/\d+/)?.[0] || index);
  if (activity === 'dancing') { const k = index % 8; return { x: layout.danceFloor.x + (k % 4 - 1.5) * 0.9, z: layout.danceFloor.z + 0.3 + (Math.floor(k / 4) - 0.5) * 1.15, yaw: (k % 4) * Math.PI / 2, activity }; }
  if (activity === 'seated') { const seat = layout.seats[index % layout.seats.length]; return { x: seat.x, z: seat.z, yaw: seat.yaw, activity }; }
  if (activity === 'bar') return { x: layout.bar.x - 1.15, z: layout.bar.z - 1.8 + (index % 5) * 0.9, yaw: Math.PI / 2, activity };
  // Social groups gather beside the dance floor, by the bar, and in the VIP corner: never in the doorway.
  const angle = (index % 4) * Math.PI / 2 + group, cluster = [[layout.minX + 2.7, layout.minZ + 3.9], [layout.bar.x - 2.45, layout.bar.z + 1.6], [layout.vip.x, layout.vip.z - 0.3]][group % 3];
  return { x: cluster[0] + Math.cos(angle) * 0.6, z: cluster[1] + Math.sin(angle) * 0.6, yaw: angle + Math.PI, activity: 'socializing' };
}

// Where a resident actually settles: their activity spot unless a seat is taken, another resident already
// stands there, or it is in the doorway; then the nearest clear spot on a small spiral around it.
function placeResident(layout, resident, slot, taken, door) {
  if (isBartender(resident)) return behindBar(layout, taken);
  const base = rootsResidentDestination(layout, resident, slot), clearOf = (p) => Math.hypot(p.x - door.x, p.z - door.z) > ROOTS_RESIDENT_LIMITS.doorClearance && taken.every((t) => Math.hypot(p.x - t.x, p.z - t.z) >= ROOTS_RESIDENT_LIMITS.spacing);
  const inside = (p) => p.x > layout.minX + 0.5 && p.x < layout.maxX - 0.5 && p.z > layout.minZ + 0.5 && p.z < layout.maxZ - 0.5 && !inRect(p, layout.bar, 0.4) && !inRect(p, layout.stage, 0.4);
  if (base.activity === 'seated') {
    for (let k = 0; k < layout.seats.length; k++) { const seat = layout.seats[(slot + k) % layout.seats.length], p = { x: seat.x, z: seat.z, yaw: seat.yaw, activity: 'seated' }; if (clearOf(p)) return p; }
    return placeResident(layout, { ...resident, activity: 'socializing' }, slot, taken, door);
  }
  if (clearOf(base) && inside(base)) return base;
  for (let ring = 1; ring <= 6; ring++) for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4 + ring, p = { ...base, x: base.x + Math.cos(a) * ring * 0.45, z: base.z + Math.sin(a) * ring * 0.45 };
    if (clearOf(p) && inside(p)) return p;
  }
  return base;
}
const inRect = (p, r, pad = 0) => Math.abs(p.x - r.x) <= r.width / 2 + pad && Math.abs(p.z - r.z) <= r.depth / 2 + pad;

export class RootsResidentRenderer {
  constructor(group, layout, library, { mobile = false, door = { x: layout.doorX, z: layout.minZ + 1.0 } } = {}) {
    this.group = group; this.layout = layout; this.library = library; this.mobile = mobile; this.door = door; this.limit = mobile ? ROOTS_RESIDENT_LIMITS.mobile : ROOTS_RESIDENT_LIMITS.desktop;
    this.entries = new Map(); this.active = false; this.stats = { known: 0, visible: 0, triangles: 0, updateMs: 0 };
  }
  setActive(active) { this.active = !!active; this.group.visible = this.active; }
  // Each resident keeps a slot (and so a spot) for the whole visit; only a new arrival or an activity change
  // places them again, so someone the player is talking to does not walk off when others come and go.
  setResidents(residents = []) {
    const selected = residents.slice(0, this.limit), wanted = new Set(selected.map((r) => r.id));
    for (const entry of this.entries.values()) if (!wanted.has(entry.resident.id) && !entry.departing) { entry.path = entry.destination?.staff ? [...entry.destination.via].reverse() : []; entry.departing = true; entry.destination = { x: this.layout.doorX, z: this.layout.minZ + 0.45, yaw: Math.PI, activity: 'leaving' }; }
    for (const resident of selected) {
      let entry = this.entries.get(resident.id);
      if (!entry) {
        const used = new Set([...this.entries.values()].map((e) => e.slot)); let slot = 0; while (used.has(slot)) slot++;
        entry = { resident, identity: lookFor(resident), slot, activity: null, x: this.layout.doorX, z: this.layout.minZ + 0.55, yaw: 0, destination: null, visual: null, seatedBones: null, departing: false };
        this.entries.set(resident.id, entry); this.library.ensureNpcPack(entry.identity.appearance.pack).catch(() => {});
      }
      entry.resident = resident;
      if (entry.departing || entry.activity !== resident.activity) {
        const taken = [...this.entries.values()].filter((e) => e !== entry && !e.departing && e.destination).map((e) => e.destination);
        const wasStaff = !!entry.destination?.staff;
        entry.departing = false; entry.activity = resident.activity; entry.seatedBones = null; entry.destination = placeResident(this.layout, resident, entry.slot, taken, this.door);
        entry.path = entry.destination.staff && !wasStaff ? entry.destination.via.slice() : []; // round the end of the bar
      }
    }
    this.stats.known = selected.length;
  }
  // The TALK target: a visible resident who has arrived at their spot (not one walking past), within range.
  // The current target is kept while still in range, so two residents side by side do not flicker.
  nearest(position, preferId = null) {
    let best = null;
    for (const entry of this.entries.values()) if (!entry.departing && entry.visual && Math.hypot(entry.destination.x - entry.x, entry.destination.z - entry.z) <= SETTLED) {
      const distance = Math.hypot(position.x - entry.x, position.z - entry.z);
      if (distance > (entry.destination.staff ? ROOTS_RESIDENT_LIMITS.barReach : ROOTS_RESIDENT_LIMITS.interactionRange)) continue; // the bartender: across the bar
      if (entry.resident.id === preferId) return { ...entry.resident, distance };
      if (!best || distance < best.distance) best = { ...entry.resident, distance };
    }
    return best;
  }
  update(dt) {
    const started = performance.now(), remove = []; let visible = 0, triangles = 0, builds = 0;
    for (const entry of this.entries.values()) {
      if (!entry.visual && builds < 2 && this.library.npcPackReady(entry.identity.appearance.pack)) {
        entry.visual = this.library.buildNpcVisual(entry.identity, { castShadow: false }); builds++;
        if (entry.visual) { entry.visual.root.traverse((o) => o.layers.set(1)); this.group.add(entry.visual.root); } // every mesh: layers are not inherited
      }
      if (!entry.visual) continue;
      while (entry.path?.length && Math.hypot(entry.path[0].x - entry.x, entry.path[0].z - entry.z) <= 0.08) entry.path.shift();
      const target = entry.path?.length ? entry.path[0] : entry.destination;
      const dx = target.x - entry.x, dz = target.z - entry.z, distance = Math.hypot(dx, dz) + (entry.path?.length ? 1 : 0), moving = distance > 0.08;
      if (moving) {
        const leg = Math.hypot(dx, dz), step = Math.min(leg, ROOTS_RESIDENT_LIMITS.speed * dt); if (leg > 1e-6) { entry.x += dx / leg * step; entry.z += dz / leg * step; entry.yaw = Math.atan2(dx, dz); } entry.visual.play('Walk', 0.2);
      } else {
        entry.yaw = entry.destination.yaw; const activity = entry.destination.activity;
        entry.visual.play(activity === 'dancing' ? (entry.slot % 2 ? 'Interact' : 'Wave') : activity === 'socializing' && entry.slot % 4 === 0 ? 'Interact' : 'Idle', 0.25);
      }
      entry.visual.root.visible = this.active; entry.visual.root.position.set(entry.x, this.layout.y, entry.z); entry.visual.root.rotation.y = entry.yaw; entry.visual.mixer.update(Math.min(0.05, dt));
      if (!moving && entry.destination.activity === 'seated') { entry.seatedBones ||= findSeatBones(entry.visual.root); if (entry.seatedBones) applySeatedPose(entry.visual.root, entry.seatedBones, { x: entry.x, z: entry.z, yaw: entry.yaw, seatTop: this.layout.y + 0.5 }); }
      if (entry.departing && distance <= 0.08) remove.push(entry.resident.id);
      if (this.active) { visible++; triangles += (entry.visual.mesh.geometry.index?.count || entry.visual.mesh.geometry.attributes.position.count) / 3; }
    }
    for (const id of remove) { this.entries.get(id)?.visual?.dispose(); this.entries.delete(id); }
    Object.assign(this.stats, { visible, triangles, updateMs: this.stats.updateMs * 0.9 + (performance.now() - started) * 0.1 });
  }
  dispose() { for (const entry of this.entries.values()) entry.visual?.dispose(); this.entries.clear(); }
}

