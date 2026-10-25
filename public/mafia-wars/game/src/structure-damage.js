// M6.8B server-authoritative building destruction: pure rules shared by the
// room and tests. Only the server runs these; a client never sends damage.
//
// A rocket is flown along the same arc the clients draw (rocket.js: 38 m/s,
// 2.5 m/s² drop, 5 s life) against the city structures, with destroyed faces
// removed. Where it bursts, every face of a destructible structure (category
// A, or B except its protected entrance face) within openRadius opens whole,
// exactly the unit the original Hood Warfare destruction.js opens (one face
// collider). Clients then knock down every panel of that face and drop its
// collider, so the visual, bullet, and movement states agree.
import { CITY_STRUCTURES, partOpen, rayBoxDistance } from './city-structures.js';

export const DESTRUCTION_RULES = Object.freeze({
  openRadius: 1.2,           // faces this close to the burst open
  rocketSpeed: 38, rocketGravity: 2.5, rocketLifeS: 5, stepS: 1 / 120,
  repairAfterMs: 5 * 60_000, // approved: repair once nobody has been near for 5 minutes...
  repairClearRadius: 60,     // ...within 60 m
  repairCheckMs: 5000,
});

const ENTRANCE_FACE = 0; // world.js: the porch/door face
export const destructible = (s) => !!s.parts && (s.category === 'A' || s.category === 'B');
export const protectedMask = (s) => (s.category === 'B' ? 1 << ENTRANCE_FACE : 0);
export const fullMask = (s) => s.parts.reduce((m, p) => (p.face >= 0 ? m | (1 << p.face) : m), 0) & ~protectedMask(s);
export const DESTRUCTIBLE_STRUCTURES = Object.freeze(CITY_STRUCTURES.filter(destructible));
const BY_ID = new Map(CITY_STRUCTURES.map((s) => [s.id, s]));

const boxDistance = (p, b) => Math.hypot(Math.max(b.minX - p.x, 0, p.x - b.maxX), Math.max(b.minY - p.y, 0, p.y - b.maxY), Math.max(b.minZ - p.z, 0, p.z - b.maxZ));

// First intact structure part a segment meets, as a fraction of the segment.
function segmentHit(a, b, open, structures) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, len = Math.hypot(dx, dy, dz);
  if (len < 1e-9) return null;
  const dir = { x: dx / len, y: dy / len, z: dz / len };
  const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x), minZ = Math.min(a.z, b.z), maxZ = Math.max(a.z, b.z);
  let best = null;
  for (const s of structures) {
    const bb = s.box;
    if (bb.maxX < minX || bb.minX > maxX || bb.maxZ < minZ || bb.minZ > maxZ || bb.maxY < Math.min(a.y, b.y)) continue;
    const mask = open?.get(s.id) || 0;
    for (const part of s.parts || [{ face: null, box: bb }]) {
      if (part.face !== null && partOpen(part, mask)) continue;
      const t = rayBoxDistance(a, dir, part.box);
      if (t !== null && t > 0 && t <= len && (!best || t < best.t)) best = { t, len, structure: s, face: part.face };
    }
  }
  return best;
}

// Where a rocket fired from `origin` along `direction` bursts: the first
// structure it meets, else the ground, else nowhere (out of life).
export function rocketImpact(origin, direction, open = null, structures = CITY_STRUCTURES, rules = DESTRUCTION_RULES) {
  const l = Math.hypot(direction.x, direction.y, direction.z) || 1;
  const vel = { x: direction.x / l * rules.rocketSpeed, y: direction.y / l * rules.rocketSpeed, z: direction.z / l * rules.rocketSpeed };
  let pos = { ...origin }, time = 0;
  while (time < rules.rocketLifeS) {
    vel.y -= rules.rocketGravity * rules.stepS;
    const next = { x: pos.x + vel.x * rules.stepS, y: pos.y + vel.y * rules.stepS, z: pos.z + vel.z * rules.stepS };
    const hit = segmentHit(pos, next, open, structures);
    if (hit) {
      const k = hit.t / hit.len;
      return { point: { x: pos.x + (next.x - pos.x) * k, y: pos.y + (next.y - pos.y) * k, z: pos.z + (next.z - pos.z) * k }, structureId: hit.structure.id, face: hit.face, flightMs: Math.round((time + rules.stepS * k) * 1000) };
    }
    if (next.y <= 0.05) return { point: { x: next.x, y: 0.05, z: next.z }, structureId: null, face: null, flightMs: Math.round((time + rules.stepS) * 1000) };
    pos = next; time += rules.stepS;
  }
  return null;
}

// Faces a burst at `point` newly opens: [[id, newMask], ...]. Protected faces never open.
export function burstFaces(point, open = null, structures = DESTRUCTIBLE_STRUCTURES, rules = DESTRUCTION_RULES) {
  const out = [];
  for (const s of structures) {
    if (boxDistance(point, s.box) > rules.openRadius) continue;
    const already = open?.get(s.id) || 0, allowed = fullMask(s);
    let mask = 0;
    for (const part of s.parts) {
      if (part.face < 0) continue;
      const bit = 1 << part.face;
      if (!(allowed & bit) || already & bit) continue;
      if (boxDistance(point, part.box) <= rules.openRadius) mask |= bit;
    }
    if (mask) out.push([s.id, mask]);
  }
  return out;
}

const centre = (s) => ({ x: (s.box.minX + s.box.maxX) / 2, z: (s.box.minZ + s.box.maxZ) / 2 });

// One room's destruction state. `open` maps structure id -> open-face bitmask.
export class StructureDamage {
  constructor({ rules = DESTRUCTION_RULES } = {}) { this.rules = rules; this.open = new Map(); this.damagedAt = new Map(); this.revision = 0; this.lastRepairCheck = 0; this.metrics = { rockets: 0, bursts: 0, opened: 0, repaired: 0 }; }

  // A validated public-city RPG shot. Returns null when nothing opened.
  applyRocket(origin, direction, now) {
    this.metrics.rockets++;
    const impact = rocketImpact(origin, direction, this.open, CITY_STRUCTURES, this.rules);
    if (!impact) return null;
    this.metrics.bursts++;
    const changes = burstFaces(impact.point, this.open, DESTRUCTIBLE_STRUCTURES, this.rules);
    if (!changes.length) return { impact, changes, revision: this.revision };
    this.revision++;
    for (const [id, mask] of changes) {
      const next = (this.open.get(id) || 0) | mask;
      this.open.set(id, next); this.damagedAt.set(id, now);
      for (let m = mask; m; m &= m - 1) this.metrics.opened++;
    }
    return { impact, changes: changes.map(([id, mask]) => [id, mask, this.open.get(id)]), revision: this.revision };
  }

  snapshot() { return { open: [...this.open.entries()], revision: this.revision }; }

  // Structures due for repair: damaged long enough ago with no city player near.
  repairDue(now, cityPositions) {
    if (!this.open.size || now - this.lastRepairCheck < this.rules.repairCheckMs) return [];
    this.lastRepairCheck = now;
    const ids = [];
    for (const [id] of this.open) {
      if (now - (this.damagedAt.get(id) || 0) < this.rules.repairAfterMs) continue;
      const c = centre(BY_ID.get(id));
      if (cityPositions.some((p) => Math.hypot(p.x - c.x, p.z - c.z) < this.rules.repairClearRadius)) continue;
      ids.push(id);
    }
    if (!ids.length) return [];
    this.revision++;
    for (const id of ids) { this.open.delete(id); this.damagedAt.delete(id); this.metrics.repaired++; }
    return ids;
  }
}
