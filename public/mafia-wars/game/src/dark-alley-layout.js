// Stage 2, step 4: Dark Alley. New land west of Neon Market (x -340 to -140, z 148 to 356),
// joined to the city by the three existing east-west market streets. Six compact blocks hold the
// district's 54 reserved Business NFT lots: 25 black-market stalls, 12 clubs, 7 music lounges,
// 6 streetwear boutiques and 4 workshops. The Nerdie City Casino is a separate public landmark;
// it does not consume one of the 54 licensed lots.
import { mergeToCount, shopRow } from './lot-district.js';

const r2 = (v) => Math.round(v * 100) / 100;

export const DARK_ALLEY = Object.freeze({ id: 'dark-alley', name: 'Dark Alley', minX: -340, maxX: -140, minZ: 148, maxZ: 356 });

export const DARK_ROADS = Object.freeze([
  { id: 'dark-boulevard', x: -240, z: 156, width: 200, depth: 12 },
  { id: 'dark-cross', x: -240, z: 252, width: 200, depth: 10 },
  { id: 'dark-row', x: -240, z: 349, width: 200, depth: 10 },
  { id: 'dark-west-way', x: -334, z: 252, width: 8, depth: 204 },
  { id: 'dark-market-street', x: -276, z: 252, width: 10, depth: 204 },
  { id: 'dark-service-alley', x: -204, z: 252, width: 6, depth: 204, alley: true },
  // Its east sidewalk ends exactly at x -140, the Neon Market boundary.
  { id: 'dark-gateway', x: -146, z: 252, width: 8, depth: 204 },
].map((road) => Object.freeze(road)));

export const DARK_STREET_NAMES = Object.freeze({
  'dark-boulevard': 'Dark Boulevard', 'dark-cross': 'Dark Cross', 'dark-row': 'Dark Row',
  'dark-west-way': 'West Way', 'dark-market-street': 'Market Street',
  'dark-service-alley': 'Service Alley', 'dark-gateway': 'Dark Gateway',
});

// Boundaries sit outside each road's 2 m sidewalk: no shop wall occupies pedestrian space.
const COLS = [[-328, -283], [-269, -209], [-199, -152]], ROWS = [[164, 245], [259, 342]];
const BLOCKS = {
  a1: { sides: 'sen' }, a2: { sides: 'swen' }, a3: { sides: 'swn', casino: true },
  b1: { sides: 'sen' }, b2: { sides: 'swen' }, b3: { sides: 'swen' },
};
const LOT = 10.5, HEIGHTS = [7.4, 8.2, 9.0, 7.8];

export const DARK_BUSINESS_TYPES = Object.freeze({
  black_market_stall: Object.freeze({ count: 25, license: 'retail', label: 'Black Market Stall' }),
  club: Object.freeze({ count: 12, license: 'entertainment', label: 'Club' }),
  music_lounge: Object.freeze({ count: 7, license: 'entertainment', label: 'Music Lounge' }),
  streetwear_boutique: Object.freeze({ count: 6, license: 'retail', label: 'Streetwear Boutique' }),
  workshop: Object.freeze({ count: 4, license: 'manufacturing', label: 'Workshop' }),
});
export const DARK_LICENSES = Object.freeze({ retail: 31, entertainment: 19, manufacturing: 4 });

export const DARK_CASINO = Object.freeze({
  id: 'dark-alley-casino', name: 'Nerdie City Casino', kind: 'casino', blockId: 'dark-a3',
  x: -174, z: 204, width: 34, depth: 32, height: 15, fixedFront: 'south',
});

function streetOf(lot) {
  if ((lot.front === 'east' && lot.x < -200) || (lot.front === 'west' && lot.x > -208)) return 'alley';
  if (lot.front === 'south' && lot.z < 200) return 'boulevard';
  if ((lot.front === 'north' && lot.z < 250) || (lot.front === 'south' && lot.z > 250 && lot.z < 275)) return 'cross';
  return 'back';
}

function assignBusinessTypes(lots) {
  const left = Object.fromEntries(Object.entries(DARK_BUSINESS_TYPES).map(([type, spec]) => [type, spec.count]));
  const prefer = {
    alley: ['black_market_stall', 'workshop', 'club', 'streetwear_boutique', 'music_lounge'],
    boulevard: ['club', 'music_lounge', 'streetwear_boutique', 'black_market_stall', 'workshop'],
    cross: ['music_lounge', 'club', 'streetwear_boutique', 'black_market_stall', 'workshop'],
    back: ['black_market_stall', 'workshop', 'club', 'streetwear_boutique', 'music_lounge'],
  };
  for (const street of ['alley', 'boulevard', 'cross', 'back']) for (const lot of lots.filter((item) => streetOf(item) === street)) {
    const type = prefer[street].find((key) => left[key] > 0) || Object.keys(left).find((key) => left[key] > 0);
    left[type]--; lot.businessType = type; lot.license = DARK_BUSINESS_TYPES[type].license;
  }
}

function overlaps(a, b, pad = 2) {
  return Math.abs(a.x - b.x) < a.width / 2 + b.width / 2 + pad && Math.abs(a.z - b.z) < a.depth / 2 + b.depth / 2 + pad;
}

function build() {
  const blocks = [], lots = [];
  ROWS.forEach((z, row) => COLS.forEach((x, col) => {
    const key = `${'ab'[row]}${col + 1}`, id = `dark-${key}`, spec = BLOCKS[key], block = { id, x, z, ...spec };
    blocks.push(block);
    for (const side of spec.sides) lots.push(...shopRow(id, block, side, spec.sides, LOT).map((lot) => ({ ...lot, blockId: id })));
  }));
  // Keep a generous pedestrian apron around the casino's front and service walls.
  for (const lot of lots.filter((item) => item.blockId === DARK_CASINO.blockId && overlaps(item, DARK_CASINO))) lots.splice(lots.indexOf(lot), 1);
  mergeToCount(lots, 54, { spread: true });
  assignBusinessTypes(lots);
  lots.forEach((lot, index) => { lot.lotId = `DA-${String(index + 1).padStart(3, '0')}`; lot.height = HEIGHTS[index % HEIGHTS.length]; });
  return { blocks, lots };
}

const BUILT = build();
export const DARK_BLOCKS = Object.freeze(BUILT.blocks.map((block) => Object.freeze({ id: block.id, minX: block.x[0], maxX: block.x[1], minZ: block.z[0], maxZ: block.z[1] })));
export const DARK_LOTS = Object.freeze(BUILT.lots.map((lot) => Object.freeze({
  id: lot.lotId, buildingId: `dark-lot-${lot.lotId.slice(3)}`, blockId: lot.blockId,
  businessType: lot.businessType, license: lot.license, x: lot.x, z: lot.z,
  width: lot.width, depth: lot.depth, height: lot.height, front: lot.front,
})));

export function darkAlleyDistricts() {
  return DARK_BLOCKS.map((block) => {
    const buildings = [
      ...DARK_LOTS.filter((lot) => lot.blockId === block.id).map((lot) => ({
        id: lot.buildingId, kind: 'neon-shop', style: 'dark-alley', lotId: lot.id,
        businessType: lot.businessType, license: lot.license, x: lot.x, z: lot.z,
        width: lot.width, depth: lot.depth, height: lot.height, fixedFront: lot.front,
        name: `${DARK_BUSINESS_TYPES[lot.businessType].label} ${lot.id}`,
      })),
      ...(block.id === DARK_CASINO.blockId ? [{ ...DARK_CASINO }] : []),
    ];
    return { id: block.id, kind: 'dark-alley', center: { x: r2((block.minX + block.maxX) / 2), z: r2((block.minZ + block.maxZ) / 2) }, radius: r2(Math.hypot(block.maxX - block.minX, block.maxZ - block.minZ) / 2), buildings, vehicles: [] };
  });
}
