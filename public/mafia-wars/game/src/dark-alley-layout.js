// Stage 2, step 4: Dark Alley sits west of Neon Market, beyond a dedicated underground-venue
// transition district. The whole district is translated without changing its stable lot identities.
// The only way in from the transition is the narrow, dog-leg Shadow Passage, which opens onto Dark
// Cross so the district is discovered rather than presented as another row of Market blocks. Six courtyard blocks hold the
// district's 54 reserved Business NFT lots: 25 black-market stalls, 12 clubs, 7 music lounges,
// 6 streetwear boutiques and 4 workshops. The Nerdie City Casino is a separate public landmark;
// it does not consume one of the 54 licensed lots.
import { mergeToCount, shopRow } from './lot-district.js';

const r2 = (v) => Math.round(v * 100) / 100;
export const DARK_ALLEY_X_OFFSET = -200;

export const DARK_ALLEY = Object.freeze({ id: 'dark-alley', name: 'Dark Alley', minX: -540, maxX: -340, minZ: 148, maxZ: 356 });

export const DARK_ROADS = Object.freeze([
  { id: 'dark-boulevard', x: -264, z: 156, width: 152, depth: 12 },
  { id: 'dark-cross', x: -264, z: 252, width: 152, depth: 10 },
  { id: 'dark-row', x: -264, z: 349, width: 152, depth: 10 },
  { id: 'dark-west-way', x: -334, z: 252, width: 8, depth: 204 },
  { id: 'dark-market-street', x: -279, z: 252, width: 10, depth: 204 },
  { id: 'dark-service-alley', x: -223, z: 252, width: 6, depth: 204, alley: true, sidewalks: true },
  { id: 'dark-rim', x: -188, z: 252, width: 8, depth: 204 },
  // A deliberately indirect route through the empty district buffer. It begins at Neon Cross,
  // turns twice behind the screen line, then opens onto the full Dark Cross streetscape.
  { id: 'shadow-entry', x: -150, z: 252, width: 20, depth: 5, alley: true },
  { id: 'shadow-turn-east', x: -160, z: 243, width: 5, depth: 18, alley: true },
  { id: 'shadow-passage', x: -174, z: 234, width: 28, depth: 5, alley: true },
  { id: 'shadow-turn-west', x: -188, z: 243, width: 5, depth: 18, alley: true },
].map((road) => Object.freeze({ ...road, x: r2(road.x + DARK_ALLEY_X_OFFSET) })));

export const DARK_STREET_NAMES = Object.freeze({
  'dark-boulevard': 'Dark Boulevard', 'dark-cross': 'Dark Cross', 'dark-row': 'Dark Row',
  'dark-west-way': 'West Way', 'dark-market-street': 'Market Street',
  'dark-service-alley': 'Service Alley', 'dark-rim': 'Rim Street',
  'shadow-entry': 'Shadow Passage', 'shadow-turn-east': 'Shadow Passage',
  'shadow-passage': 'Shadow Passage', 'shadow-turn-west': 'Shadow Passage',
});

// Boundaries sit outside each road's 2 m sidewalk: no shop wall occupies pedestrian space.
const COLS = [[-328, -286], [-272, -229.8], [-216.2, -194]], ROWS = [[164, 245], [259, 342]];
const BLOCKS = {
  a1: { sides: 'sen' }, a2: { sides: 'swen', casino: true }, a3: { sides: 'swn' },
  b1: { sides: 'sen' }, b2: { sides: 'swen' }, b3: { sides: 'swn' },
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

const RAW_DARK_CASINO = Object.freeze({
  id: 'dark-alley-casino', name: 'Nerdie City Casino', kind: 'casino', blockId: 'dark-a2',
  x: -251, z: 204, width: 26, depth: 32, height: 15, fixedFront: 'south',
});
export const DARK_CASINO = Object.freeze({ ...RAW_DARK_CASINO, x: r2(RAW_DARK_CASINO.x + DARK_ALLEY_X_OFFSET) });

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
  for (const lot of lots.filter((item) => item.blockId === RAW_DARK_CASINO.blockId && overlaps(item, RAW_DARK_CASINO))) lots.splice(lots.indexOf(lot), 1);
  mergeToCount(lots, 54, { spread: true });
  // Real breathing room between neighbouring facades: each frontage gives back 0.75 m per side.
  // The blocks retain active street edges while their centres remain open courts rather than solid mats.
  for (const lot of lots) {
    if (lot.front === 'north' || lot.front === 'south') lot.width = r2(Math.max(5, lot.width - 1.5));
    else lot.depth = r2(Math.max(5, lot.depth - 1.5));
  }
  assignBusinessTypes(lots);
  lots.forEach((lot, index) => { lot.lotId = `DA-${String(index + 1).padStart(3, '0')}`; lot.height = HEIGHTS[index % HEIGHTS.length]; });
  return { blocks, lots };
}

const BUILT = build();
export const DARK_BLOCKS = Object.freeze(BUILT.blocks.map((block) => Object.freeze({ id: block.id, minX: r2(block.x[0] + DARK_ALLEY_X_OFFSET), maxX: r2(block.x[1] + DARK_ALLEY_X_OFFSET), minZ: block.z[0], maxZ: block.z[1] })));
export const DARK_LOTS = Object.freeze(BUILT.lots.map((lot) => Object.freeze({
  id: lot.lotId, buildingId: `dark-lot-${lot.lotId.slice(3)}`, blockId: lot.blockId,
  businessType: lot.businessType, license: lot.license, x: r2(lot.x + DARK_ALLEY_X_OFFSET), z: lot.z,
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
