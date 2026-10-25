// M6.8A city structure registry: the solid outdoor structures that stop a
// bullet, as 3D boxes the authoritative server can test shots against. Every
// box is derived from the same source of truth the client builds its colliders
// from (city-layout.js for the city plan and sites, the world.js lot constants
// for the original Hood Warfare blocks, destruction.js wall sizes), so the
// server and the client agree on what is solid. Pure math, no Three.js.
//
// Category: A destructible, B partial (the entrance face is protected),
// C protected, prop (parked cars). Destructible houses and walls also list
// `parts`: the faces the client builds as separate colliders (house face
// 0 front/porch, 1 back, 2 and 3 the sides, as world.js and destruction.js
// number them; a wall is one face 0), the house floor (face -1), and its
// roof (face -2, gone once two faces are open, as on the client). Kit house
// parts and garages are the client's exact colliders (hood-geometry.js,
// generated from world.js). M6.8B opens faces; occlusion skips open ones.
//
// Deliberately left out, so the server never invents an invisible wall:
// chain-link fences (single-player bullets pass through them too), lamps and
// utility poles (0.24 m), and porches and steps.
import {
  APARTMENT_SITE, COMBAT_VENUE_SITE, DUPLICATED_ENTERABLE_HOUSE_SITE, DUPLICATED_ORIGINAL_NEIGHBORHOOD,
  ORIGINAL_EXPANSION_HOUSES, ORIGINAL_NEIGHBORHOOD_LAYOUT, createCityPlan,
} from './city-layout.js';
import { BANK_BUILDING_ID } from './city-pois.js';
import { HOOD_GEOMETRY } from './hood-geometry.js';

// Mirrors world.js: ROAD_HALF 4.5, SIDEWALK 2, LOT 8, HOUSE_FRONT 14,
// HOUSE_DEPTH 10, HOUSE_W 6.2, WALL_LOTS; destruction.js BLOCK 0.4 x 0.2 x 0.2.
const HOOD = Object.freeze({ roadHalf: 4.5, sidewalk: 2, lot: 8, firstLot: -40, lots: 10, houseFront: 14, houseDepth: 10, houseW: 6.2, block: 0.2, brick: 0.4 });
const WALL_LOTS = Object.freeze(['-1:1', '-1:4', '-1:7', '1:2', '1:5', '1:8']);

const box = (minX, minY, minZ, maxX, maxY, maxZ) => Object.freeze({ minX, minY, minZ, maxX, maxY, maxZ });
const fromArray = ([minX, minY, minZ, maxX, maxY, maxZ]) => box(minX, minY, minZ, maxX, maxY, maxZ);
// world.js buildHouse with blocks: four face colliders, the floor, and the roof (hood-geometry.js).
function kitHouseParts(id) {
  const g = HOOD_GEOMETRY.houses[id];
  if (!g) throw new Error(`hood-geometry.js has no house ${id}: run tools/structures/extract-hood-geometry.mjs --write`);
  return Object.freeze([...g.faces.map((f, face) => Object.freeze({ face, box: fromArray(f) })), Object.freeze({ face: -1, box: fromArray(g.floor) }), Object.freeze({ face: -2, box: fromArray(g.roof) })]);
}
const bounding = (parts) => box(Math.min(...parts.map((p) => p.box.minX)), 0, Math.min(...parts.map((p) => p.box.minZ)), Math.max(...parts.map((p) => p.box.maxX)), Math.max(...parts.map((p) => p.box.maxY)), Math.max(...parts.map((p) => p.box.maxZ)));
const wallParts = (b) => Object.freeze([Object.freeze({ face: 0, box: b })]);
const centered = (x, z, width, depth, height) => box(x - width / 2, 0, z - depth / 2, x + width / 2, height, z + depth / 2);
// destruction.js wallSpec rounds a wall to whole blocks.
const wallLength = (len) => Math.max(1, Math.round(len / HOOD.brick)) * HOOD.brick;

function neighbourhoodStructures(layout) {
  const out = [], cx = layout.centerX;
  for (let i = 0; i < HOOD.lots; i++) for (const side of [-1, 1]) {
    const zc = HOOD.firstLot + i * HOOD.lot + HOOD.lot / 2, row = side < 0 ? 'west' : 'east';
    const id = `${layout === ORIGINAL_NEIGHBORHOOD_LAYOUT ? 'hood-original' : 'hood-duplicate'}-${row}-${i}`;
    const parts = kitHouseParts(id);
    out.push({ id, kind: 'hood-house', category: id === DUPLICATED_ENTERABLE_HOUSE_SITE.id ? 'B' : 'A', box: bounding(parts), parts });
  }
  // main.js: front-yard walls on WALL_LOTS (two segments with a walkway gap), 7 courses.
  for (const key of WALL_LOTS) {
    const [s, i] = key.split(':').map(Number), z0 = HOOD.firstLot + i * HOOD.lot, z1 = z0 + HOOD.lot;
    const x = cx + s * (HOOD.roadHalf + HOOD.sidewalk + 1.4), wz = (z0 + z1) / 2 + (s < 0 ? HOOD.houseW / 4 : -HOOD.houseW / 4);
    for (const [part, lo, hi] of [['a', z0 + 0.3, wz - 0.9], ['b', wz + 0.9, z1 - 0.3]]) {
      const len = wallLength(hi - lo), mid = (lo + hi) / 2, b = box(x - HOOD.block / 2, 0, mid - len / 2, x + HOOD.block / 2, 7 * HOOD.block, mid + len / 2);
      out.push({ id: `${layout.id}-wall-${s}-${i}-${part}`, kind: 'wall', category: 'A', box: b, parts: wallParts(b) });
    }
  }
  // Two free-standing walls along x, 8 courses.
  for (const [part, x, z] of [['north', cx - 12, 42.2], ['south', cx + 12, -42.2]]) {
    const len = wallLength(6.4), b = box(x - len / 2, 0, z - HOOD.block / 2, x + len / 2, 8 * HOOD.block, z + HOOD.block / 2);
    out.push({ id: `${layout.id}-freestanding-${part}`, kind: 'wall', category: 'A', box: b, parts: wallParts(b) });
  }
  return out;
}

export function buildCityStructures(plan = createCityPlan()) {
  const out = [], seen = new Set();
  const add = (entry) => { if (!seen.has(entry.id)) { seen.add(entry.id); out.push(Object.freeze(entry)); } };
  // city-expansion.js addBuilding: one collider per building, 0.5 m above its height.
  for (const district of plan.districts) {
    for (const b of district.buildings) add({ id: b.id, kind: b.id === BANK_BUILDING_ID ? 'bank' : b.kind || 'building', category: 'C', box: centered(b.x, b.z, b.width, b.depth, b.height + 0.5) });
    for (const v of district.vehicles || []) add({ id: v.id, kind: 'vehicle', category: 'prop', box: centered(v.x, v.z, 1.9, 4.2, 1.45) });
  }
  // Apartment and venue shells; their doors are fixed colliders, so each shell is solid from outside.
  add({ id: APARTMENT_SITE.id, kind: 'apartment', category: 'C', box: centered(APARTMENT_SITE.x, APARTMENT_SITE.z, APARTMENT_SITE.width, APARTMENT_SITE.depth, APARTMENT_SITE.height) });
  add({ id: COMBAT_VENUE_SITE.id, kind: 'venue', category: 'C', box: centered(COMBAT_VENUE_SITE.x, COMBAT_VENUE_SITE.z, COMBAT_VENUE_SITE.width, COMBAT_VENUE_SITE.depth, COMBAT_VENUE_SITE.height + 0.5) });
  // world.js kit houses turned a quarter turn to face south: 6.2 m wide in x, 10 m deep in z.
  for (const site of ORIGINAL_EXPANSION_HOUSES) {
    const parts = kitHouseParts(site.id);
    add({ id: site.id, kind: 'kit-house', category: site.enterable ? 'B' : 'A', box: bounding(parts), parts });
  }
  for (const entry of [...neighbourhoodStructures(ORIGINAL_NEIGHBORHOOD_LAYOUT), ...neighbourhoodStructures(DUPLICATED_ORIGINAL_NEIGHBORHOOD)]) add(entry);
  // Garages beyond the alleys (on the lots world.js gave one), protected.
  HOOD_GEOMETRY.garages.forEach((g, i) => add({ id: `hood-garage-${i}`, kind: 'garage', category: 'C', box: fromArray(g) }));
  return Object.freeze(out);
}

export const CITY_STRUCTURES = buildCityStructures();

const openCount = (mask) => { let n = 0; for (let m = mask; m; m &= m - 1) n++; return n; };
// Is this part gone? An open face, or the roof once two faces are open (it falls in, client destruction.js).
export const partOpen = (part, mask) => (part.face >= 0 ? (mask & (1 << part.face)) !== 0 : part.face === -2 && openCount(mask) >= 2);

// Distance along a ray to a box, or null on a miss (0 when the ray starts inside).
export function rayBoxDistance(origin, direction, b) {
  let near = 0, far = Infinity;
  for (const [o, d, lo, hi] of [[origin.x, direction.x, b.minX, b.maxX], [origin.y, direction.y, b.minY, b.maxY], [origin.z, direction.z, b.minZ, b.maxZ]]) {
    if (Math.abs(d) < 1e-8) { if (o < lo || o > hi) return null; continue; }
    let t0 = (lo - o) / d, t1 = (hi - o) / d;
    if (t0 > t1) [t0, t1] = [t1, t0];
    near = Math.max(near, t0); far = Math.min(far, t1);
    if (near > far) return null;
  }
  return far >= 0 ? near : null;
}

// Nearest structure a ray meets before `distance`, or null. A ray starting
// inside a box (near 0) ignores that box, like the interior-shell test.
// `open` (id -> bitmask of open faces) removes destroyed faces.
export function firstStructureHit(origin, direction, distance, structures = CITY_STRUCTURES, open = null) {
  const ex = origin.x + direction.x * distance, ez = origin.z + direction.z * distance;
  const minX = Math.min(origin.x, ex), maxX = Math.max(origin.x, ex), minZ = Math.min(origin.z, ez), maxZ = Math.max(origin.z, ez);
  let best = null;
  for (const s of structures) {
    const b = s.box;
    if (b.maxX < minX || b.minX > maxX || b.maxZ < minZ || b.minZ > maxZ) continue;
    if (!s.parts) {
      const hit = rayBoxDistance(origin, direction, b);
      if (hit !== null && hit > 0.03 && hit < distance - 0.05 && (!best || hit < best.distance)) best = { structure: s, distance: hit, face: null };
      continue;
    }
    const mask = open?.get(s.id) || 0;
    for (const part of s.parts) {
      if (partOpen(part, mask)) continue;
      const hit = rayBoxDistance(origin, direction, part.box);
      if (hit !== null && hit > 0.03 && hit < distance - 0.05 && (!best || hit < best.distance)) best = { structure: s, distance: hit, face: part.face };
    }
  }
  return best;
}

export const cityStructureOccluded = (origin, direction, distance, structures = CITY_STRUCTURES, open = null) => firstStructureHit(origin, direction, distance, structures, open) !== null;
