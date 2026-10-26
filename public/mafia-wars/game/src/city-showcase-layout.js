// M7.0B1 North Market showcase: where it is, which buildings are its heroes, and where its street
// furniture stands. Pure (no Three.js): city-showcase.js draws it, city-navigation.js routes
// residents around its furniture, and the tests check it. Building footprints, heights, and
// colliders do not change, so the server's structure registry is untouched.
import { createCityPlan } from './city-layout.js';
import { cityGroundLayout, frontageKeepouts, GROUND } from './city-ground-layout.js';

// The west end of North Market (the bank, the Barbershop/Diner block) to North Court across Main St.
export const SHOWCASE = Object.freeze({ id: 'north-market', name: 'North Market', minX: -95, maxX: 40, minZ: 52, maxZ: 146 });
export const inShowcase = (x, z) => x > SHOWCASE.minX && x < SHOWCASE.maxX && z > SHOWCASE.minZ && z < SHOWCASE.maxZ;

export const SHOWCASE_HEROES = Object.freeze({ bank: 'west-mixed-north-1', boutique: 'west-mixed-north-2', lounge: 'west-mixed-north-0', apartment: 'north-court' });

// Provisional storefront identities, chosen from the Business NFT playable types (website
// src/config/gameplay/business.ts): streetwear_boutique (Retail Business, class 1) and
// music_lounge (Entertainment Venue, class 3). Names are placeholders for the founder to confirm.
export const SHOWCASE_BUSINESSES = Object.freeze({
  'west-mixed-north-2': Object.freeze({ id: 'nerdie-threads', name: 'Nerdie Threads', category: 'Streetwear Boutique', businessTypeId: 'streetwear_boutique', nftClass: 'retail_business', status: 'coming-soon' }),
  'west-mixed-north-0': Object.freeze({ id: 'the-blaq-note', name: 'The Blaq Note', category: 'Music Lounge', businessTypeId: 'music_lounge', nftClass: 'entertainment_venue', status: 'coming-soon' }),
});

const FURNITURE_SIZE = Object.freeze({ tree: [0.3, 0.3, 5.2], planter: [1.7, 0.9, 0.9], bench: [1.8, 0.6, 0.85], bollard: [0.3, 0.3, 0.95] });
const item = (id, kind, x, z, rotated = false, extra = {}) => {
  const [w, d, h] = FURNITURE_SIZE[kind];
  return Object.freeze({ id, kind, x, z, width: rotated ? d : w, depth: rotated ? w : d, height: h, ...extra });
};

// Street furniture: curb trees between the streetlights on the showcase's sidewalks, and planters,
// benches, and bollards on the forecourts in front of the hero buildings, clear of every entrance
// approach (at least 3 m off its axis) and of the sidewalk walk lines.
export function showcaseFurniture(plan = createCityPlan(), ground = cityGroundLayout(plan)) {
  const out = [];
  const keepouts = frontageKeepouts(plan);
  const clearOf = (x, z, r) => !keepouts.some((k) => Math.hypot(x - k.x, z - k.z) < k.r + r)
    && !ground.streetlights.some((l) => Math.hypot(x - l.x, z - l.z) < 6)
    && !ground.intersections.some((i) => x > i.minX - GROUND.lightIntersectionClear && x < i.maxX + GROUND.lightIntersectionClear && z > i.minZ - GROUND.lightIntersectionClear && z < i.maxZ + GROUND.lightIntersectionClear);
  const heroes = plan.districts.flatMap((d) => d.buildings).filter((b) => b.id === SHOWCASE_HEROES.bank || b.id === SHOWCASE_HEROES.boutique || b.id === SHOWCASE_HEROES.lounge);
  const heroAxes = [...heroes.map((b) => [b.x, b.z, 'x']), ...(plan.apartment ? [[plan.apartment.x, plan.apartment.z, 'z']] : [])];
  // curb trees: half way between same-side streetlights on the same street
  const bySide = new Map();
  for (const l of ground.streetlights) if (inShowcase(l.x, l.z)) { const k = `${l.street}:${l.armX}:${l.armZ}`; if (!bySide.has(k)) bySide.set(k, []); bySide.get(k).push(l); }
  for (const lights of bySide.values()) {
    const vertical = lights[0].armX !== 0;
    lights.sort((a, b) => (vertical ? a.z - b.z : a.x - b.x));
    for (let i = 0; i + 1 < lights.length; i++) {
      const a = lights[i], b = lights[i + 1], gap = vertical ? b.z - a.z : b.x - a.x;
      if (gap < 18) continue;
      const x = vertical ? a.x : (a.x + b.x) / 2, z = vertical ? (a.z + b.z) / 2 : a.z;
      if (!inShowcase(x, z) || !clearOf(x, z, 0.6)) continue;
      if (heroAxes.some(([ax, az, axis]) => (axis === 'x' ? Math.abs(x - ax) < 5 && Math.abs(z - az) < 14 : Math.abs(z - az) < 5 && Math.abs(x - ax) < 14))) continue; // keep hero facades in view
      if (!ground.sidewalks.some((w) => x > w.minX && x < w.maxX && z > w.minZ && z < w.maxZ)) continue;
      out.push(item(`tree-${a.street}-${out.length}`, 'tree', x, z));
    }
  }
  // forecourts: the bank (north-market, facing north), Nerdie Threads (facing south), North Court (facing west)
  const bank = plan.districts.flatMap((d) => d.buildings).find((b) => b.id === SHOWCASE_HEROES.bank);
  if (bank) {
    const fz = bank.z + bank.depth / 2 + 3.2;
    for (const s of [-1, 1]) { out.push(item(`planter-bank-${s < 0 ? 'w' : 'e'}`, 'planter', bank.x + s * 4.6, fz)); out.push(item(`bollard-bank-${s < 0 ? 'w' : 'e'}`, 'bollard', bank.x + s * 3.1, fz + 2.2)); }
  }
  const boutique = plan.districts.flatMap((d) => d.buildings).find((b) => b.id === SHOWCASE_HEROES.boutique);
  if (boutique) { const fz = boutique.z - boutique.depth / 2 - 2.6; for (const s of [-1, 1]) out.push(item(`bench-threads-${s < 0 ? 'w' : 'e'}`, 'bench', boutique.x + s * 4.4, fz)); }
  const apt = plan.apartment;
  if (apt) {
    const front = apt.x - apt.width / 2;
    for (const s of [-1, 1]) {
      out.push(item(`planter-north-court-${s < 0 ? 's' : 'n'}`, 'planter', front - 3.2, apt.z + s * 4.2, true));
      out.push(item(`bench-north-court-${s < 0 ? 's' : 'n'}`, 'bench', front - 7.5, apt.z + s * 4.6, true));
    }
  }
  return out;
}

// Paved forecourts between a hero's facade and the sidewalk (drawn just below sidewalk height).
export function showcaseForecourts(plan = createCityPlan(), ground = cityGroundLayout(plan)) {
  const out = [], buildings = plan.districts.flatMap((d) => d.buildings);
  const walkEdge = (x, z, axis, dir) => {
    // the nearest sidewalk edge from (x, z) along an axis/direction
    let best = Infinity;
    for (const w of ground.sidewalks) {
      if (axis === 'z' && x > w.minX && x < w.maxX) { const e = dir > 0 ? w.minZ - z : z - w.maxZ; if (e >= 0 && e < best) best = e; }
      if (axis === 'x' && z > w.minZ && z < w.maxZ) { const e = dir > 0 ? w.minX - x : x - w.maxX; if (e >= 0 && e < best) best = e; }
    }
    return best;
  };
  for (const id of [SHOWCASE_HEROES.bank, SHOWCASE_HEROES.boutique, SHOWCASE_HEROES.lounge]) {
    const b = buildings.find((x) => x.id === id); if (!b) continue;
    const dir = b.front === 'north' ? 1 : -1, face = b.z + dir * b.depth / 2, gap = walkEdge(b.x, face, 'z', dir);
    if (!Number.isFinite(gap) || gap < 0.3) continue;
    out.push(Object.freeze({ id: `forecourt-${id}`, minX: b.x - b.width / 2 - 1, maxX: b.x + b.width / 2 + 1, minZ: Math.min(face, face + dir * gap), maxZ: Math.max(face, face + dir * gap) }));
  }
  const apt = plan.apartment;
  if (apt) { const face = apt.x - apt.width / 2, gap = walkEdge(face, apt.z, 'x', -1); if (Number.isFinite(gap)) out.push(Object.freeze({ id: 'forecourt-north-court', minX: face - gap, maxX: face, minZ: apt.z - apt.depth / 2 - 1, maxZ: apt.z + apt.depth / 2 + 1 })); }
  return out;
}
