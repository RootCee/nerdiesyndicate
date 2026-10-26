// M7.0A city ground layout: one pure, shared definition of the road surfaces, sidewalks, alleys,
// road paint, and streetlights, derived from the city plan. city-expansion.js renders it,
// city-navigation.js routes residents around its poles, and the depth probe and tests check it.
//
// Fixes it encodes (each measured in tools/city/layout-audit.mjs):
// - Sidewalks used to run each road's full length, straight across every intersection (92 strips
//   over a road), covering the crosswalks and the first lane dashes. They now stop at the cross street.
// - Crossing roads overlapped as two coplanar boxes; intersections are now one surface.
// - Alleys (4 m) got sidewalks; they now have none. The original block's alleys were the old
//   Hood Warfare gray planes; they are now drawn here like the copied block's alleys.
// - Streetlights stood in traffic lanes (district centre +/- 14 m); they now stand on sidewalks at
//   the curb, clear of intersections, entrances, driveways, and parked cars.
import { createCityPlan, ORIGINAL_NEIGHBORHOOD_LAYOUT, DUPLICATED_ORIGINAL_NEIGHBORHOOD, FRONT_NORMALS } from './city-layout.js';
import { createRoadPaintLayout } from './city-road-paint-layout.js';

export const GROUND = Object.freeze({
  roadTop: 0.05, sidewalkTop: 0.105, sidewalkWidth: 2, alleyMaxWidth: 6,
  lightSpacing: 26, lightCurbInset: 0.45, lightIntersectionClear: 6.5, lightEntranceClear: 2.6, lightVehicleClear: 1.2,
});

const rect = (minX, maxX, minZ, maxZ, extra = {}) => ({ minX, maxX, minZ, maxZ, ...extra });
const roadRect = (r) => rect(r.x - r.width / 2, r.x + r.width / 2, r.z - r.depth / 2, r.z + r.depth / 2, { id: r.id, vertical: r.depth > r.width, alley: Math.min(r.width, r.depth) < GROUND.alleyMaxWidth });
function subtract(start, end, cuts) {
  const out = []; let cursor = start;
  for (const [a, b] of cuts.map(([a, b]) => [Math.max(start, a), Math.min(end, b)]).filter(([a, b]) => b > a).sort((p, q) => p[0] - q[0])) { if (a > cursor) out.push([cursor, a]); cursor = Math.max(cursor, b); }
  if (cursor < end) out.push([cursor, end]);
  return out.filter(([a, b]) => b - a > 0.05);
}
const blocks = [ORIGINAL_NEIGHBORHOOD_LAYOUT.footprint, DUPLICATED_ORIGINAL_NEIGHBORHOOD.footprint];
const inBlock = (x, z) => blocks.some((b) => x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ);

export function cityGroundLayout(plan = createCityPlan()) {
  const roads = plan.roads.map(roadRect), streets = roads.filter((r) => !r.alley);
  const vertical = streets.filter((r) => r.vertical), horizontal = streets.filter((r) => !r.vertical);
  const crosses = (v, h) => v.minX < h.maxX && v.maxX > h.minX && h.minZ < v.maxZ && h.maxZ > v.minZ;
  const intersections = vertical.flatMap((v) => horizontal.filter((h) => crosses(v, h)).map((h) => rect(v.minX, v.maxX, h.minZ, h.maxZ, { v: v.id, h: h.id })));

  // Road surfaces: vertical streets whole; horizontal streets cut where a vertical street crosses
  // (the intersection belongs to the vertical surface); alleys whole.
  const surfaces = [];
  for (const v of vertical) surfaces.push({ ...v, kind: 'road' });
  for (const h of horizontal) for (const [a, b] of subtract(h.minX, h.maxX, vertical.filter((v) => crosses(v, h)).map((v) => [v.minX, v.maxX]))) surfaces.push(rect(a, b, h.minZ, h.maxZ, { id: h.id, kind: 'road' }));
  const alleys = roads.filter((r) => r.alley).map((r) => ({ ...r, kind: 'alley' }));
  // the original block's alleys (world.js used to draw them as gray Hood Warfare planes)
  for (const s of [-1, 1]) alleys.push(rect(s * 35.5 - 2, s * 35.5 + 2, -45, 45, { id: `hood-original-${s < 0 ? 'west' : 'east'}-alley`, kind: 'alley' }));

  // Sidewalks: both sides of every street, stopping at each crossing street. A vertical street's
  // sidewalk keeps the corner squares; a horizontal street's stops at the vertical sidewalk.
  const W = GROUND.sidewalkWidth, sidewalks = [];
  for (const v of vertical) for (const side of [-1, 1]) {
    const x0 = side < 0 ? v.minX - W : v.maxX, x1 = side < 0 ? v.minX : v.maxX + W;
    for (const [a, b] of subtract(v.minZ, v.maxZ, horizontal.filter((h) => h.minX < x1 && h.maxX > x0 && h.minZ < v.maxZ && h.maxZ > v.minZ).map((h) => [h.minZ, h.maxZ]))) sidewalks.push(rect(x0, x1, a, b, { id: `${v.id}-walk-${side < 0 ? 'w' : 'e'}`, side, street: v.id, vertical: true }));
  }
  for (const h of horizontal) for (const side of [-1, 1]) {
    const z0 = side < 0 ? h.minZ - W : h.maxZ, z1 = side < 0 ? h.minZ : h.maxZ + W;
    for (const [a, b] of subtract(h.minX, h.maxX, vertical.filter((v) => v.minZ < z1 && v.maxZ > z0 && v.minX < h.maxX && v.maxX > h.minX).map((v) => [v.minX - W, v.maxX + W]))) sidewalks.push(rect(a, b, z0, z1, { id: `${h.id}-walk-${side < 0 ? 's' : 'n'}`, side, street: h.id, vertical: false }));
  }

  // Road paint: the existing layout, from streets only (alleys carry none).
  const paint = createRoadPaintLayout(plan.roads.filter((r) => Math.min(r.width, r.depth) >= GROUND.alleyMaxWidth));

  return { roads, intersections, surfaces, alleys, sidewalks, paint, streetlights: placeStreetlights(plan, streets, intersections, sidewalks) };
}

// Where entrances, driveways, and parked cars meet the sidewalks: streetlights keep clear of them.
export function frontageKeepouts(plan) {
  const out = [];
  for (const d of plan.districts) {
    for (const b of d.buildings) {
      const n = FRONT_NORMALS[b.front] || FRONT_NORMALS.east, half = n[0] ? b.width / 2 : b.depth / 2, along = n[0] ? b.depth : b.width;
      // door (city-expansion: a quarter of the facade off centre) and the facade centre (shopfront / bank door)
      for (const t of [along * 0.24, 0]) out.push({ x: b.x + n[0] * (half + 0.5) + (n[0] ? 0 : t), z: b.z + n[1] * (half + 0.5) + (n[0] ? t : 0), r: GROUND.lightEntranceClear, kind: 'entrance', id: b.id });
      if (b.driveway) out.push({ x: n[0] > 0 ? 82 : 94, z: b.z, r: 2.4, kind: 'driveway', id: b.id, span: 'x' });
    }
    for (const v of d.vehicles || []) out.push({ x: v.x, z: v.z, r: 2.1 + GROUND.lightVehicleClear, kind: 'vehicle', id: v.id });
  }
  const sites = [plan.apartment, plan.combatVenue, plan.enterableHouse, plan.duplicatedEnterableHouse, ...plan.originalExpansionHouses];
  for (const s of sites) if (s?.entry) out.push({ x: s.entry.x, z: s.entry.z, r: GROUND.lightEntranceClear, kind: 'entrance', id: s.id });
  if (plan.apartment) out.push({ x: plan.apartment.x - plan.apartment.width / 2 - 1.4, z: plan.apartment.z, r: GROUND.lightEntranceClear, kind: 'entrance', id: plan.apartment.id });
  return out;
}

function placeStreetlights(plan, streets, intersections, sidewalks) {
  const keepouts = frontageKeepouts(plan), lights = [];
  const nearIntersection = (x, z) => intersections.some((i) => x > i.minX - GROUND.lightIntersectionClear && x < i.maxX + GROUND.lightIntersectionClear && z > i.minZ - GROUND.lightIntersectionClear && z < i.maxZ + GROUND.lightIntersectionClear);
  const blocked = (x, z) => keepouts.some((k) => Math.hypot(x - k.x, z - k.z) < k.r);
  const insideBuilding = (x, z) => plan.districts.some((d) => d.buildings.some((b) => Math.abs(x - b.x) < b.width / 2 + 0.3 && Math.abs(z - b.z) < b.depth / 2 + 0.3));
  for (const street of streets) {
    const along = street.vertical ? [street.minZ, street.maxZ] : [street.minX, street.maxX];
    let k = 0;
    for (let t = along[0] + GROUND.lightSpacing / 2; t < along[1]; t += GROUND.lightSpacing / 2, k++) {
      const side = k % 2 ? 1 : -1; // staggered: alternate sides every half spacing (each side every full spacing)
      const curb = street.vertical ? (side < 0 ? street.minX - GROUND.lightCurbInset : street.maxX + GROUND.lightCurbInset) : (side < 0 ? street.minZ - GROUND.lightCurbInset : street.maxZ + GROUND.lightCurbInset);
      // nudge along the street (up to 4 m either way) to find a clear spot
      for (const nudge of [0, 1.5, -1.5, 3, -3, 4.5, -4.5]) {
        const x = street.vertical ? curb : t + nudge, z = street.vertical ? t + nudge : curb;
        if (inBlock(x, z) || nearIntersection(x, z) || blocked(x, z) || insideBuilding(x, z)) continue;
        if (!sidewalks.some((w) => x > w.minX && x < w.maxX && z > w.minZ && z < w.maxZ)) continue;
        // the arm reaches over the road
        lights.push({ id: `light-${street.id}-${lights.length}`, x, z, street: street.id, armX: street.vertical ? -side : 0, armZ: street.vertical ? 0 : -side });
        break;
      }
    }
  }
  return lights;
}
