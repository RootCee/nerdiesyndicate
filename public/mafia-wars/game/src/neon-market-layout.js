// Stage 2, step 2: Neon Market, the city's prime commercial neighbourhood (founder-approved plan, 27 October
// 2026). New land north of the original city (z 148 to 356): Neon Boulevard along its south edge, Main Street
// and both avenues carried north through it, Neon Cross through the middle and Neon Row along the north edge
// (land beyond stays free for later neighbourhoods). Eight blocks:
//
//   - 110 business lots, one per Business NFT license assigned to Neon Market: 40 Retail, 35 Entertainment,
//     25 Financial, 5 Tech, 5 Manufacturing. Each lot is its own two-storey shopfront with an address. A lot
//     stays available (enterable, empty, its plaque naming its license class) until it is opened;
//   - six six-storey loft buildings (30 lofts, the existing lofts template);
//   - the Neon Tower: the luxury residential tower (120 apartments and 6 penthouses);
//   - Neon Plaza, the open square at Main Street and Neon Boulevard.
//
// Pure data: the city plan, the ground (roads, sidewalks, streetlights), the catalog and the tests read it.
import { LICENSE_CLASSES, SHOP_DEPTH, assignLicenses, mergeToCount, shopRow } from './lot-district.js';

const r2 = (v) => Math.round(v * 100) / 100;

export const NEON_MARKET = Object.freeze({ id: 'neon-market', name: 'Neon Market', minX: -140, maxX: 140, minZ: 148, maxZ: 356 });

// Streets (the plan's road records: centre, width along x, depth along z).
export const NEON_ROADS = Object.freeze([
  { id: 'neon-boulevard', x: 0, z: 156, width: 280, depth: 12 },
  { id: 'neon-cross', x: 0, z: 252, width: 280, depth: 10 },
  { id: 'neon-row', x: 0, z: 349, width: 280, depth: 10 }, // its north sidewalk ends at the city edge (z 356)
  // the avenues and Main Street carry on north from the old city edge (z 148)
  { id: 'neon-west-avenue', x: -88, z: 252, width: 10, depth: 208 },
  { id: 'neon-main', x: 0, z: 252, width: 9, depth: 208 },
  { id: 'neon-east-avenue', x: 88, z: 252, width: 10, depth: 208 },
  { id: 'neon-lane', x: 136, z: 252, width: 8, depth: 204 }, // from Neon Boulevard (a T junction) to Neon Row
].map((r) => Object.freeze(r)));
export const NEON_STREET_NAMES = Object.freeze({
  'neon-boulevard': 'Neon Boulevard', 'neon-cross': 'Neon Cross', 'neon-row': 'Neon Row', 'neon-lane': 'Neon Lane',
  'neon-west-avenue': 'West Avenue', 'neon-main': 'Main Street', 'neon-east-avenue': 'East Avenue',
});

// The blocks between the sidewalks (2 m) of those streets.
const COLS = [[-140, -95], [-81, -6.5], [6.5, 81], [95, 130]], ROWS = [[164, 245], [259, 342]];
export const NEON_PLAZA = Object.freeze({ id: 'neon-plaza', name: 'Neon Plaza', minX: -81, maxX: -6.5, minZ: 164, maxZ: 214 });
// Lobby + 20 six-home apartment storeys + one six-home penthouse storey. At the shared 3.4 m storey
// height, 75.2 m leaves the top homes a full ceiling and a shallow roof/parapet above them.
export const NEON_TOWER = Object.freeze({ id: 'neon-tower', name: 'Neon Tower', kind: 'neon-tower', x: 36, z: 196, width: 26, depth: 28, height: 75.2, floors: 22, apartments: 120, penthouses: 6, fixedFront: 'west' });

const LOT = 11, SHOP_HEIGHTS = [8.4, 9.2, 8.8, 10];
// Which sides of each block carry shopfronts ('s' faces the street south of the block, and so on), and
// where the lofts stand. Block ids: neon-<row><col>, a1 at the south-west.
const BLOCKS = {
  a1: { sides: 'sen' }, a2: { sides: 'wen', plaza: true }, a3: { sides: 'en', tower: true }, a4: { sides: 'swen' },
  b1: { sides: 'se', lofts: [[-130, 330], [-116, 330]] }, b2: { sides: 'swen' }, b3: { sides: 'swen', lot: 10.5 }, b4: { lofts: [[104, 272], [121, 272], [104, 300], [121, 300]] },
};
const LOFT = { width: 14, depth: 14 };

// License classes in Neon Market (the token ids on the Business NFT contract): its 110 licenses.
export const NEON_LICENSES = Object.freeze({ financial: 25, entertainment: 35, retail: 40, tech: 5, manufacturing: 5 });
export { LICENSE_CLASSES };

// Prime frontage first: Financial on Neon Boulevard and Main Street, Entertainment on Neon Cross and around the
// plaza, Tech and Manufacturing on Neon Lane, Retail everywhere else.
const STREET_OF = (b) => (b.front === 'south' && b.z < 200 ? 'boulevard' : b.front === 'east' && b.x > 125 ? 'lane' : (b.front === 'east' && b.x < 0) || (b.front === 'west' && b.x > 0 && b.x < 20) ? 'main' : (b.front === 'north' && b.z < 250) || (b.front === 'south' && b.z > 250 && b.z < 270) ? 'cross' : 'other');
const PREFER = { boulevard: ['financial', 'entertainment', 'retail'], main: ['financial', 'retail', 'entertainment'], cross: ['entertainment', 'retail', 'financial'], lane: ['tech', 'manufacturing', 'retail'], other: ['retail', 'entertainment', 'tech', 'manufacturing', 'financial'] };
function build() {
  const blocks = [], lots = [], lofts = [];
  ROWS.forEach((z, r) => COLS.forEach((x, c) => {
    const id = `neon-${'ab'[r]}${c + 1}`, spec = BLOCKS[`${'ab'[r]}${c + 1}`], block = { id, x, z, ...spec };
    blocks.push(block);
    for (const side of spec.sides || '') lots.push(...shopRow(id, block, side, spec.sides, LOT).map((l) => ({ ...l, blockId: id })));
    (spec.lofts || []).forEach(([lx, lz], i) => lofts.push({ id: `${id}-lofts-${i}`, blockId: id, x: lx, z: lz, ...LOFT }));
  }));
  // the plaza block keeps its south half open (the plaza): its side rows stop at the plaza
  const plaza = NEON_PLAZA, open = lots.filter((l) => l.blockId === 'neon-a2' && l.z < plaza.maxZ + SHOP_DEPTH / 2 && l.front !== 'north');
  for (const l of open) lots.splice(lots.indexOf(l), 1);
  // exactly one lot per license
  mergeToCount(lots, Object.values(NEON_LICENSES).reduce((a, b) => a + b, 0));
  assignLicenses(lots, NEON_LICENSES, STREET_OF, PREFER, ['boulevard', 'main', 'lane', 'cross', 'other']);
  lots.forEach((l, i) => { l.lotId = `NM-${String(i + 1).padStart(3, '0')}`; l.height = SHOP_HEIGHTS[i % SHOP_HEIGHTS.length]; });
  return { blocks, lots, lofts };
}
const BUILT = build();
export const NEON_BLOCKS = Object.freeze(BUILT.blocks.map((b) => Object.freeze({ id: b.id, minX: b.x[0], maxX: b.x[1], minZ: b.z[0], maxZ: b.z[1] })));
export const NEON_LOTS = Object.freeze(BUILT.lots.map((l) => Object.freeze({ id: l.lotId, buildingId: `neon-lot-${l.lotId.slice(3)}`, blockId: l.blockId, license: l.license, x: l.x, z: l.z, width: l.width, depth: l.depth, height: l.height, front: l.front })));
export const NEON_LOFTS = Object.freeze(BUILT.lofts.map((l) => Object.freeze(l)));

// The city plan's buildings, by render chunk (one per block).
export function neonMarketDistricts() {
  return NEON_BLOCKS.map((blk) => {
    const buildings = [
      ...NEON_LOTS.filter((l) => l.blockId === blk.id).map((l) => ({ id: l.buildingId, kind: 'neon-shop', lotId: l.id, license: l.license, x: l.x, z: l.z, width: l.width, depth: l.depth, height: l.height, fixedFront: l.front, name: `Lot ${l.id}` })),
      ...NEON_LOFTS.filter((l) => l.blockId === blk.id).map((l) => ({ id: l.id, kind: 'mixed', x: l.x, z: l.z, width: l.width, depth: l.depth, height: 21, tint: 0x3a3346, name: 'Neon Lofts' })),
      ...(blk.id === 'neon-a3' ? [{ ...NEON_TOWER }] : []),
    ];
    return { id: blk.id, kind: 'neon', center: { x: r2((blk.minX + blk.maxX) / 2), z: r2((blk.minZ + blk.maxZ) / 2) }, radius: r2(Math.hypot(blk.maxX - blk.minX, blk.maxZ - blk.minZ) / 2), buildings, vehicles: [] };
  });
}
