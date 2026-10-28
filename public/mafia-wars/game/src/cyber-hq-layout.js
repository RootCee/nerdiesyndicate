// Stage 2, step 3: Cyber HQ, the upscale tech neighbourhood (founder-approved plan, 27 October 2026). The
// land kept east of Neon Market (x 140 to 420, z 148 to 356), north of Central Park and the Academy: Neon
// Boulevard, Neon Cross and Neon Row carry on east as Cyber Boulevard, Cyber Cross and Cyber Row; Academy
// Avenue carries on north; Cyber Lane, Cyber Way and Circuit Street run between. Eight blocks:
//
//   - 95 business lots, one per Business NFT license assigned to Cyber HQ: 40 Tech, 35 Manufacturing,
//     10 Financial, 5 Retail, 5 Entertainment. Wider lots than Neon Market's (14 m: studios and workshops);
//   - 20 townhomes, two-storey houses around one residential block;
//   - the Cyber Tower: the residential tower (100 apartments and 4 penthouses; its homes come next).
//
// Pure data, laid out with the same lot rules as Neon Market (lot-district.js).
import { ACADEMY_AVENUE } from './academy-layout.js';
import { assignLicenses, mergeToCount, shopRow } from './lot-district.js';

const r2 = (v) => Math.round(v * 100) / 100;

export const CYBER_HQ = Object.freeze({ id: 'cyber-hq', name: 'Cyber HQ', minX: 140, maxX: 420, minZ: 148, maxZ: 356 });

export const CYBER_ROADS = Object.freeze([
  { id: 'cyber-boulevard', x: 279, z: 156, width: 278, depth: 12 },
  { id: 'cyber-cross', x: 279, z: 252, width: 278, depth: 10 },
  { id: 'cyber-row', x: 279, z: 349, width: 278, depth: 10 },
  // Academy Avenue carries on north from the old city edge (z 148)
  { id: 'cyber-avenue', x: ACADEMY_AVENUE.x, z: 252, width: ACADEMY_AVENUE.width, depth: 208 },
  // from Cyber Boulevard (T junctions) to the north edge
  { id: 'cyber-lane', x: 194, z: 252, width: 8, depth: 204 },
  { id: 'cyber-way', x: 336, z: 253, width: 10, depth: 206 },
  { id: 'circuit-street', x: 414, z: 253, width: 8, depth: 206 },
].map((r) => Object.freeze(r)));
export const CYBER_STREET_NAMES = Object.freeze({
  'cyber-boulevard': 'Cyber Boulevard', 'cyber-cross': 'Cyber Cross', 'cyber-row': 'Cyber Row', 'cyber-avenue': 'Academy Avenue',
  'cyber-lane': 'Cyber Lane', 'cyber-way': 'Cyber Way', 'circuit-street': 'Circuit Street',
});

const COLS = [[142, 188], [200, 245], [259, 329], [343, 408]], ROWS = [[164, 245], [259, 342]];
export const CYBER_TOWER = Object.freeze({ id: 'cyber-tower', name: 'Cyber Tower', kind: 'cyber-tower', x: 294, z: 200, width: 28, depth: 30, height: 75.2, floors: 22, apartments: 100, penthouses: 4, fixedFront: 'south' });

const LOT = 14, SHOP_HEIGHTS = [9.2, 10.4, 8.8, 11.2];
const BLOCKS = {
  a1: { sides: 'swen' }, a2: { sides: 'swen' }, a3: { sides: 'en', tower: true }, a4: { sides: 'swen' },
  b1: { sides: 'swen' }, b2: { sides: 'swen' }, b3: { sides: 'swen' }, b4: { townhomes: true },
};

export const CYBER_LICENSES = Object.freeze({ tech: 40, manufacturing: 35, financial: 10, retail: 5, entertainment: 5 });
// Financial and Tech on Cyber Boulevard, Tech on Academy Avenue, Manufacturing on the quieter streets.
const STREET_OF = (b) => (b.front === 'south' && b.z < 200 ? 'boulevard' : (b.front === 'west' && Math.abs(b.x - 265) < 10) || (b.front === 'east' && Math.abs(b.x - 239) < 10) ? 'avenue' : (b.front === 'north' && b.z < 250) || (b.front === 'south' && b.z > 250 && b.z < 270) ? 'cross' : 'other');
const PREFER = { boulevard: ['financial', 'tech', 'retail'], avenue: ['tech', 'financial', 'entertainment'], cross: ['tech', 'entertainment', 'retail'], other: ['manufacturing', 'tech', 'retail', 'entertainment', 'financial'] };

// Twenty townhomes on the residential block: six along Cyber Cross and Cyber Row, four along Cyber Way and
// Circuit Street, each behind a 3 m front yard.
function townhomes([x0, x1], [z0, z1], blockId) {
  const out = [], yard = 3, W = 9, D = 10;
  const along = (a0, a1, n) => Array.from({ length: n }, (_, i) => a0 + ((a1 - a0) / n) * (i + 0.5));
  for (const x of along(x0, x1, 6)) out.push({ x, z: z0 + yard + D / 2, width: W, depth: D, front: 'south' }, { x, z: z1 - yard - D / 2, width: W, depth: D, front: 'north' });
  for (const z of along(z0 + yard + D + 2, z1 - yard - D - 2, 4)) out.push({ x: x0 + yard + D / 2, z, width: D, depth: W, front: 'west' }, { x: x1 - yard - D / 2, z, width: D, depth: W, front: 'east' });
  return out.map((h, i) => ({ ...h, id: `${blockId}-townhome-${i}`, x: r2(h.x), z: r2(h.z) }));
}

function build() {
  const blocks = [], lots = [], homes = [];
  ROWS.forEach((z, r) => COLS.forEach((x, c) => {
    const id = `cyber-${'ab'[r]}${c + 1}`, spec = BLOCKS[`${'ab'[r]}${c + 1}`], block = { id, x, z, ...spec };
    blocks.push(block);
    for (const side of spec.sides || '') lots.push(...shopRow(id, block, side, spec.sides, LOT).map((l) => ({ ...l, blockId: id })));
    if (spec.townhomes) homes.push(...townhomes(x, z, id).map((h) => ({ ...h, blockId: id })));
  }));
  mergeToCount(lots, Object.values(CYBER_LICENSES).reduce((a, b) => a + b, 0), { spread: true });
  assignLicenses(lots, CYBER_LICENSES, STREET_OF, PREFER, ['boulevard', 'avenue', 'cross', 'other']);
  lots.forEach((l, i) => { l.lotId = `CH-${String(i + 1).padStart(3, '0')}`; l.height = SHOP_HEIGHTS[i % SHOP_HEIGHTS.length]; });
  return { blocks, lots, homes };
}
const BUILT = build();
export const CYBER_BLOCKS = Object.freeze(BUILT.blocks.map((b) => Object.freeze({ id: b.id, minX: b.x[0], maxX: b.x[1], minZ: b.z[0], maxZ: b.z[1] })));
export const CYBER_LOTS = Object.freeze(BUILT.lots.map((l) => Object.freeze({ id: l.lotId, buildingId: `cyber-lot-${l.lotId.slice(3)}`, blockId: l.blockId, license: l.license, x: l.x, z: l.z, width: l.width, depth: l.depth, height: l.height, front: l.front })));
export const CYBER_TOWNHOMES = Object.freeze(BUILT.homes.map((h) => Object.freeze(h)));

// The city plan's buildings, by render chunk (one per block).
export function cyberHqDistricts() {
  return CYBER_BLOCKS.map((blk) => {
    const buildings = [
      ...CYBER_LOTS.filter((l) => l.blockId === blk.id).map((l) => ({ id: l.buildingId, kind: 'neon-shop', style: 'cyber', lotId: l.id, license: l.license, x: l.x, z: l.z, width: l.width, depth: l.depth, height: l.height, fixedFront: l.front, name: `Lot ${l.id}` })),
      ...CYBER_TOWNHOMES.filter((h) => h.blockId === blk.id).map((h) => ({ id: h.id, kind: 'house', propertyTier: 'rowhouse', x: h.x, z: h.z, width: h.width, depth: h.depth, height: 7.3, facing: h.front, fixedFront: h.front, tint: 0x6d7884 })),
      ...(blk.id === 'cyber-a3' ? [{ ...CYBER_TOWER }] : []),
    ];
    return { id: blk.id, kind: 'cyber', center: { x: r2((blk.minX + blk.maxX) / 2), z: r2((blk.minZ + blk.maxZ) / 2) }, radius: r2(Math.hypot(blk.maxX - blk.minX, blk.maxZ - blk.minZ) / 2), buildings, vehicles: [] };
  });
}
