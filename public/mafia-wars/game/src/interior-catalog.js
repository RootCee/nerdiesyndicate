// Stage 2 (27 October 2026): every building in the city can be entered. Pure (no Three.js): the client
// (generic-interiors.js), the server spaces (multiplayer-spaces.js) and the tests all read it.
//
// One catalog entry per building that has no hand-built interior: its template (house, apartments, lofts,
// shop kinds, warehouse, City Hall, lecture hall, clock tower), its property tier and value, its street door,
// and a layout in world coordinates (walls with doorways, furniture, the door, light points). Interiors are
// larger than the shells, the game's convention, and sized to the property's value.
//
// All of them sit at GENERIC_INTERIOR_Y: a client builds only the one it is in (and removes it on the way
// out) and the server keeps players apart by space, so they never meet. Each door is on the interior's north
// wall (max z); players arrive facing south.
import { createCityPlan, ENTERABLE_HOUSE_SITE } from './city-layout.js';
import { CITY_HALL_ENTRY } from './city-park-layout.js';
import { HOUSE_STOOP, flightDepth, houseDoorOffset } from './entry-steps.js';
import { APARTMENT_FLOORS, balconyFor, facadeBays, storeyCeiling, storeyFloor } from './apartment-building.js';
import { NEON_TOWER } from './neon-market-layout.js';
import { NEON_TOWER_HOMES, NEON_TOWER_LOBBY_SPACE, neonTowerFloor } from './neon-tower-residences.js';

export const GENERIC_INTERIOR_Y = 300;
const r2 = (v) => Math.round(v * 100) / 100;
const NORMALS = Object.freeze({ north: [0, 1], south: [0, -1], east: [1, 0], west: [-1, 0] });

// Property tiers: the value recorded for a home and the floor area its interior is built to (all spacious).
export const PROPERTY_TIERS = Object.freeze({
  penthouse: Object.freeze({ label: 'Penthouse', value: 25_000, area: 260 }),
  estate: Object.freeze({ label: 'Estate house', value: 18_000, area: 200 }),
  luxury: Object.freeze({ label: 'Luxury apartment', value: 9_000, area: 120 }),
  family: Object.freeze({ label: 'Family house', value: 8_000, area: 140 }),
  standard: Object.freeze({ label: 'Standard apartment', value: 4_000, area: 80 }),
  rowhouse: Object.freeze({ label: 'Rowhouse', value: 3_500, area: 90 }),
  walkup: Object.freeze({ label: 'Walk-up apartment', value: 1_800, area: 55 }),
});

// Storefront businesses without an interior yet (the bank and Ammo have their own).
const SHOPS = Object.freeze({
  'west-mixed-north-0': { name: 'The Blaq Note', template: 'music-venue' },
  'west-mixed-north-2': { name: '3 Piece', template: 'tailor' },
  'west-industrial-south-0': { name: 'Corner Market', template: 'grocery' },
  'west-industrial-south-1': { name: 'City Wholesaler', template: 'wholesale' },
  'west-industrial-south-2': { name: 'Laundromat', template: 'laundromat' },
  'west-industrial-south-3': { name: 'Sneaker Shop', template: 'sneakers' },
});
// Buildings with a hand-built interior, or open-air ones, stay as they are.
const SKIP = new Set(['west-mixed-north-1', 'west-mixed-north-3', 'academy-library', 'park-pavilion', 'park-bleachers']);

function templateFor(b, districtId) {
  if (SHOPS[b.id]) return SHOPS[b.id].template;
  if (b.kind === 'neon-shop') return 'vacant'; // Stage 2: a business lot waiting for its licensed operator
  if (b.kind === 'neon-tower') return 'tower';
  if (b.kind === 'house') return 'house';
  if (b.kind === 'mixed') return 'lofts';
  if (b.kind === 'warehouse') return 'warehouse';
  if (b.kind === 'civic') return 'city-hall';
  if (b.kind === 'academy-hall') return 'lecture-hall';
  if (b.kind === 'clock-tower') return 'clock-tower';
  if (!b.kind && (districtId === 'north' || districtId === 'south')) return 'apartments';
  return null;
}
const TIER = Object.freeze({ house: 'family', apartments: 'standard', lofts: 'standard' });
const FALLBACK_NAME = Object.freeze({ apartments: 'Apartments', lofts: 'Lofts', tower: 'Neon Tower', warehouse: 'Warehouse', house: 'House' });

// ---------------------------------------------------------------- layouts
// Each template builds in local metres (x across, z from the back wall at -d/2 to the door wall at +d/2)
// and returns size, partitions (wall runs with doorway gaps) and furniture. `k` is a stable per-building
// number so neighbouring copies of a template differ a little (colours, which side the sofa is on).
const wallX = (z, x0, x1, gaps = [], lv = {}) => ({ axis: 'x', at: z, from: x0, to: x1, gaps, ...lv });   // a wall along x at z (lv: { y, h } for an upper floor)
const wallZ = (x, z0, z1, gaps = [], lv = {}) => ({ axis: 'z', at: x, from: z0, to: z1, gaps, ...lv });   // a wall along z at x
// The game's player is 1.24 m across (PLAYER_COLLISION_RADIUS 0.62): doorways are 1.6 m, stairs 1.8 m, lanes 1.5 m.
export const DOORWAY = 1.6;
const f = (type, x, z, w, d, h, extra = {}) => ({ type, x, z, w, d, h, collide: true, ...extra });
const deco = (type, x, z, w, d, h, extra = {}) => ({ type, x, z, w, d, h, collide: false, ...extra });

const TEMPLATES = {
  // A family house: open living room and kitchen at the front, two bedrooms and a bath at the back.
  // A family house of two storeys (its exterior shows two): an open living room, dining room and kitchen
  // downstairs; a broad staircase; upstairs the main bedroom, a second bedroom and a big bathroom off a wide
  // landing. Doorways are 1.6 m double doors; every lane is wide enough to walk.
  house: (k) => {
    const w = 16, d = 13, up = 3.4, upH = 3.1, s = 1, lv = { y: up, h: upH }, half = DOORWAY / 2; // the living room always on the east side, clear of the stairs
    return { w, d, h: up + upH, palette: k % 3 === 0 ? 'warm' : k % 3 === 1 ? 'oak' : 'sage', rooms: ['Living room', 'Dining room', 'Kitchen', 'Main bedroom', 'Bedroom', 'Bathroom'],
      // the stairs rise along the west wall from the front of the house toward the back
      stairs: { x0: -w / 2, x1: -w / 2 + 1.8, zBottom: 2.6, steps: 16, tread: 0.32, rise: up / 16 },
      upper: { y: up, h: upH },
      partitions: [
        // a 2.2 m landing corridor beside the stair railing
        wallZ(-3.9, 0.8, d / 2, [], lv), wallZ(-3.9, -d / 2, -1.6, [], lv),
        wallX(0.8, -3.9, w / 2, [[3.6, half]], lv), wallX(-1.6, -3.9, w / 2, [[-1.0, half], [4.9, half]], lv), wallZ(1.8, -d / 2, -1.6, [], lv),
      ],
      furniture: [
        // downstairs: living (front), dining (middle), kitchen (back); the stair foot and the door lane stay open
        f('sofa', s * 4.2, 1.5, 3.0, 0.95, 0.85), f('table', s * 4.2, 3.3, 1.2, 0.6, 0.42), f('tv', s * 4.2, 6.1, 2.2, 0.4, 1.25), deco('rug', s * 4.2, 3.2, 3.6, 2.6, 0.01),
        f('table', -1.2, -2.6, 2.0, 1.0, 0.76, { chairs: 6 }), deco('rug', -1.2, -2.6, 3.4, 2.4, 0.01),
        f('counter', 4.2, -6.15, 6.0, 0.7, 0.92), f('island', 4.2, -3.6, 2.4, 1.0, 0.92), f('fridge', 7.55, -4.4, 0.8, 0.8, 1.95),
        f('plant', s * 7.3, 6.0, 0.6, 0.6, 1.4), f('lamp', s * 6.6, 1.4, 0.5, 0.5, 1.6),
        // upstairs
        f('bed', 2.4, 5.2, 2.0, 2.2, 0.6, { y: up }), f('nightstand', 0.95, 6.05, 0.5, 0.45, 0.55, { y: up }), f('nightstand', 3.85, 6.05, 0.5, 0.45, 0.55, { y: up }),
        f('wardrobe', 7.6, 3.6, 0.6, 2.0, 2.1, { y: up }), f('armchair', -2.7, 5.6, 0.9, 0.9, 0.9, { y: up }), deco('rug', 2.4, 3.6, 3.2, 2.0, 0.01, { y: up }),
        f('bed', 5.2, -5.3, 1.6, 2.0, 0.55, { y: up }), f('desk', 7.6, -2.6, 0.6, 1.2, 0.76, { y: up }),
        f('tub', -1.3, -5.9, 1.8, 0.8, 0.6, { y: up }), f('sink', 1.45, -3.9, 0.6, 1.4, 0.9, { y: up }), f('toilet', -3.45, -4.6, 0.5, 0.7, 0.45, { y: up }),
      ] };
  },
  // An apartment building: a lobby with mailboxes and the lift, and a model apartment behind it.
  apartments: (k) => apartmentLayout(k, 'city'),
  lofts: (k) => apartmentLayout(k, 'loft'),
  tower: () => {
    const w = 22, d = 18;
    return { w, d, h: 5.2, palette: 'penthouse', rooms: ['Grand lobby'], partitions: [],
      furniture: [
        ...[-4.8, -1.6, 1.6, 4.8].map((x) => f('lift', x, -d / 2 + 0.2, 2.2, 0.3, 2.8)), deco('rug', 0, -5.6, 11, 2.4, 0.01),
        f('counter', 6.7, 2.0, 4.0, 1.0, 1.1), f('desk', 6.7, 1.1, 0.7, 0.5, 0.76),
        f('sofa', -5.6, 3.5, 3.4, 1.0, 0.88), f('sofa', 0, 3.5, 3.4, 1.0, 0.88), f('table', -2.8, 2.1, 1.2, 0.7, 0.44),
        f('plant', -9.8, 7.6, 0.8, 0.8, 1.8), f('plant', 9.8, 7.6, 0.8, 0.8, 1.8),
      ] };
  },
  // A private lift hall. The six door slabs are visual landmarks; their interaction points and stable
  // residence IDs come from neon-tower-residences.js.
  'tower-floor': () => {
    const w = 18, d = 14;
    return { w, d, h: 3.2, palette: 'luxury', rooms: ['Lift hall'], partitions: [],
      furniture: [
        f('lift', -1.5, -d / 2 + 0.2, 1.8, 0.3, 2.5), f('lift', 1.5, -d / 2 + 0.2, 1.8, 0.3, 2.5), deco('rug', 0, -4.3, 4.8, 1.8, 0.01),
        ...[-4.1, 0, 4.1].flatMap((z) => [f('lift', -w / 2 + 0.2, z, 0.3, 1.8, 2.45), f('lift', w / 2 - 0.2, z, 0.3, 1.8, 2.45)]),
        f('bench', 0, 3.6, 2.8, 0.55, 0.45), f('plant', -3.6, 5.8, 0.7, 0.7, 1.5), f('plant', 3.6, 5.8, 0.7, 0.7, 1.5),
      ] };
  },
  grocery: () => shop(16, 13, 4.4, 'market', [
    ...[-4.6, -1.2, 2.2].map((x) => f('shelf', x, 1.0, 1.0, 6.4, 1.8)), f('fridge-row', -7.55, 0.5, 0.8, 8, 2.1),
    f('counter', 5.4, 4.2, 3.2, 0.9, 1.0), f('register', 5.4, 4.2, 0.5, 0.4, 1.25), deco('crates', 6.6, -4.6, 1.6, 1.2, 0.8),
  ]),
  wholesale: () => shop(18, 14, 6, 'industrial', [
    ...[-6, -2.4, 1.2].map((x) => f('rack', x, -0.6, 1.2, 8.4, 4.2)), f('counter', 5.6, 4.8, 3.6, 0.9, 1.0), f('pallet', 6.2, -3.4, 2.4, 2.4, 1.2), f('pallet', 6.2, 0.2, 2.4, 2.4, 0.9),
  ]),
  laundromat: () => shop(17, 13, 4.2, 'clean', [
    f('washers', -1.3, 0.2, 1.4, 7.2, 1.05), f('dryers', -8.05, 0.2, 0.9, 7.6, 1.9), f('dryers', 8.05, -1.2, 0.9, 5.6, 1.9),
    f('table', 4.4, 2.8, 2.4, 0.9, 0.9), f('bench', 4.4, 5.3, 2.4, 0.5, 0.45), f('counter', 5.2, -5.4, 3.2, 0.8, 1.0),
  ]),
  sneakers: () => shop(15, 12, 4.4, 'bright', [
    f('wall-shelf', -7.05, -0.5, 0.5, 9, 2.6), f('wall-shelf', 7.05, -0.5, 0.5, 9, 2.6), f('display', -2.4, 0.6, 1.4, 1.4, 1.0), f('display', 2.4, 0.6, 1.4, 1.4, 1.0),
    f('bench', 0, -2.6, 2.6, 0.55, 0.45), f('counter', 3.8, -4.4, 3, 0.8, 1.0), deco('rug', 0, 0.4, 6.4, 4.4, 0.01),
  ]),
  tailor: () => shop(16, 13, 4.6, 'suit', [
    f('rack', -5.6, 0.4, 0.6, 5.2, 1.7), f('rack', 5.6, 0.4, 0.6, 5.2, 1.7), f('mannequin', -2.2, 3.4, 0.6, 0.6, 1.85), f('mannequin', 2.2, 3.4, 0.6, 0.6, 1.85),
    f('booth', -6, -4.8, 2.2, 2.2, 2.4), f('mirror', 0, -6.3, 2.4, 0.15, 2.2), f('counter', 4.6, -4, 3, 0.8, 1.0), deco('rug', 0, 0.2, 6, 5, 0.01),
  ]),
  // A business lot nobody runs yet (Neon Market): an empty, lit shop floor with a counter at the back.
  vacant: () => shop(14, 12, 4.4, 'bright', [f('counter', 3.6, -4.6, 3, 0.8, 1.0)]),
  // The Blaq Note: a music lounge with a stage, a bar and tables.
  'music-venue': () => shop(20, 16, 6, 'lounge', [
    f('stage', 0, -6.2, 9, 3.4, 0.6, { step: true }), f('speaker', -4.8, -6.6, 0.9, 0.9, 1.8), f('speaker', 4.8, -6.6, 0.9, 0.9, 1.8), f('mic', 0, -5.4, 0.3, 0.3, 1.5),
    f('bar', 8.9, 0.6, 1.0, 9, 1.1), ...[[-5, -0.5], [-2, 2.2], [-6, 4], [2.4, -0.4], [4.6, 3.2]].map(([x, z]) => f('round-table', x, z, 1.0, 1.0, 1.05)), deco('rug', 0, -2.6, 7.6, 3, 0.01),
  ]),
  warehouse: (k) => {
    const w = 24, d = 18;
    return { w, d, h: 7.5, palette: 'industrial', rooms: ['Warehouse floor', 'Office'],
      partitions: [wallX(-3.5, 6.5, w / 2, [[9.2, 1.2]]), wallZ(6.5, -d / 2, -3.5)],
      furniture: [...[-8.5, -4.5, -0.5].map((x) => f('rack', x, -1.8, 1.4, 11, 5.2)), f('pallet', 3.2, 4.6, 2.2, 2.2, 1.1), f('pallet', 6.2, 5.6, 2.2, 2.2, 0.8),
        f('forklift', 3.6, -1.8, 1.4, 2.6, 2.1), f('desk', 9.4, -6.6, 1.6, 0.8, 0.76), f('shelf', 11.7, -6.5, 0.5, 4, 1.9), deco(k % 2 ? 'lines' : 'lines', 0, 2.5, 22, 0.15, 0.01)] };
  },
  // Nerdie City Hall: a lobby with the city seal, the clerks' counter, and the council chamber behind it.
  'city-hall': () => {
    const w = 26, d = 36;
    return { w, d, h: 9, palette: 'civic', rooms: ['Lobby', 'Clerk counter', 'Council chamber'],
      partitions: [wallX(1, -w / 2, w / 2, [[0, 4]])],
      furniture: [deco('seal', 0, 12.4, 6, 6, 0.01), f('counter', -7, 6.6, 9, 1.0, 1.1), f('counter', 7, 6.6, 9, 1.0, 1.1), f('bench', -8.5, 13.5, 3, 0.6, 0.45), f('bench', 8.5, 13.5, 3, 0.6, 0.45),
        f('dais', 0, -14.6, 14, 4.8, 0.5, { step: true }), f('council-desk', 0, -14.8, 11, 1.2, 1.25), f('flag', -8, -16.6, 0.5, 0.5, 3.2), f('flag', 8, -16.6, 0.5, 0.5, 3.2),
        ...[-9, -5.5, -2].flatMap((z) => [f('pew', -6.2, z, 7, 0.7, 0.9), f('pew', 6.2, z, 7, 0.7, 0.9)]), f('plant', -12, 16.6, 0.8, 0.8, 1.6), f('plant', 12, 16.6, 0.8, 0.8, 1.6)] };
  },
  // An Academy hall: tiered lecture seating facing the podium and screen.
  'lecture-hall': () => {
    const w = 26, d = 20;
    return { w, d, h: 7.2, palette: 'academy', rooms: ['Lecture hall'], partitions: [],
      furniture: [f('podium', 0, -7, 1.2, 0.8, 1.15), deco('screen', 0, -9.85, 10, 0.1, 4, { y: 1.6 }), f('stage', 0, -7.6, 12, 4, 0.3, { step: true }),
        // 15 cm tiers rising toward the door, so every step is an easy one
        ...[-3.2, -0.4, 2.4, 5.2].flatMap((z, i) => [f('tier', 0, z, w - 1, 2.8, 0.15 * (i + 1), { step: true }), f('desk-row', -6.6, z - 0.7, 9, 0.5, 0.15 * (i + 1) + 0.76), f('desk-row', 6.6, z - 0.7, 9, 0.5, 0.15 * (i + 1) + 0.76)])] };
  },
  'clock-tower': () => {
    const w = 10, d = 10;
    return { w, d, h: 14, palette: 'stone', rooms: ['Clock works'], partitions: [],
      furniture: [f('gears', 0, -1.2, 2.6, 2.6, 6), ...[0, 1, 2, 3, 4, 5].map((i) => deco('stair', -3.8 + (i % 3) * 0.1, -3.8 + i * 0.9, 1.4, 0.9, 0.3 * (i + 1)))] };
  },
};
function shop(w, d, h, palette, furniture) { return { w, d, h, palette, rooms: ['Shop floor'], partitions: [], furniture }; }
// An apartment building's lobby: the concierge desk, mailboxes, seating, and the lift bank on the back
// wall. The lift (its floor menu) takes residents and visitors to storeys 2-6 (apartmentUnit).
export const LOBBY_LIFT_Z = 2.2; // the lift call spot, this far in front of the lobby's back wall
function apartmentLayout(k, style) {
  const w = 15, d = 11; // a lofty 4.2 m lobby: the building's name sits above the lifts
  return { w, d, h: 4.2, palette: style === 'loft' ? 'loft' : k % 2 ? 'city' : 'oak', rooms: ['Lobby'], partitions: [],
    furniture: [
      f('lift', -1.6, -d / 2 + 0.2, 1.8, 0.3, 2.4), f('lift', 1.6, -d / 2 + 0.2, 1.8, 0.3, 2.4), deco('rug', 0, -d / 2 + LOBBY_LIFT_Z, 4.4, 1.6, 0.01),
      f('mailboxes', -7.3, -1.2, 0.35, 3.4, 1.7), f('counter', 4.8, 1.4, 2.8, 0.8, 1.05), f('desk', 4.8, 0.6, 0.5, 0.4, 0.76),
      f('sofa', -4.2, 2.6, 2.6, 0.9, 0.85), f('table', -4.2, 1.4, 1.1, 0.6, 0.42), f('plant', -6.8, d / 2 - 0.8, 0.6, 0.6, 1.4), f('plant', 6.8, d / 2 - 0.8, 0.6, 0.6, 1.4),
      f('plant', -3.2, -d / 2 + 0.6, 0.6, 0.6, 1.4), f('plant', 3.2, -d / 2 + 0.6, 0.6, 0.6, 1.4),
    ] };
}

// ---------------------------------------------------------------- apartments (storeys 2-6)
// One apartment per storey, laid out inside the real building at its real height, so its windows (the
// facade's own window bays) look out on the city and its balcony door opens onto the facade's balcony.
// Layouts scale with the footprint; each storey is better than the one below; the penthouse has stairs to
// a private roof terrace.
const CORE_A = 1.4; // the entrance hall either side of the lift core, along the facade
export function apartmentUnit(entry, floor) {
  const spec = entry.towerHome ? { floor, tier: entry.towerHome.tier, layout: entry.towerHome.layout, title: entry.towerHome.title } : APARTMENT_FLOORS.find((x) => x.floor === floor); if (!spec) return null;
  const b = { ...entry.site, front: entry.facing, kind: 'apartments' }, [nx, nz] = NORMALS[b.front], ux = nz, uz = -nx;
  const L = nx ? b.depth : b.width, D = nx ? b.width : b.depth, A = L / 2 - 0.3, Dh = D / 2 - 0.3; // inner half-sizes
  const level = storeyFloor(floor), ceiling = storeyCeiling(floor), top = b.height, penthouse = spec.layout === 'penthouse';
  const P = (a, dd) => ({ x: r2(b.x + ux * a + nx * dd), z: r2(b.z + uz * a + nz * dd) });
  const rect = (a0, a1, d0, d1) => { const p = P(a0, d0), q = P(a1, d1); return { minX: Math.min(p.x, q.x), maxX: Math.max(p.x, q.x), minZ: Math.min(p.z, q.z), maxZ: Math.max(p.z, q.z) }; };
  const box = (type, a, dd, wa, wd, h, extra = {}) => { const c = P(a, dd), along = Math.abs(ux) > 0.5; return { type, x: c.x, z: c.z, w: along ? wa : wd, d: along ? wd : wa, h, collide: extra.collide ?? true, ...extra }; };
  // Open plans sized for the game's 1.24 m player: a 1.7 m lane from the lift straight to the balcony, 1.8 m
  // openings into bedrooms, 1.6 m bathroom doors, a living room at least 4.2 m deep, and little furniture.
  const coreA = 1.3, coreD = -Dh + 2.0, lux = spec.tier !== 'standard';
  const back = Math.min(-Dh + 4.6, Dh - 4.2), BW = Math.max(DOORWAY, 1.8) / 2, DH = DOORWAY / 2;
  // world sides for 'back toward' a local direction: -d is the building's back, +a the right-hand wall
  const sideOf = (da, dd) => { const wx = ux * da + nx * dd, wz = uz * da + nz * dd; return Math.abs(wx) > Math.abs(wz) ? (wx < 0 ? 'minX' : 'maxX') : (wz < 0 ? 'minZ' : 'maxZ'); };
  const toBack = sideOf(0, -1), toFront = sideOf(0, 1), toRight = sideOf(1, 0), toLeft = sideOf(-1, 0);
  const runs = [];
  const runA = (dd, a0, a1, gaps = []) => runs.push({ dd, a0, a1, gaps, axis: 'a' }); // a wall running along the facade at depth dd
  const runD = (a, d0, d1, gaps = []) => runs.push({ a, d0, d1, gaps, axis: 'd' });  // a wall running front-to-back at a
  const bedL = (-A - coreA) / 2, rightMid = (A + coreA) / 2;
  runA(back, -A, -coreA, [[bedL, penthouse ? 1.2 : BW]]); runD(-coreA, -Dh, back);                // the bedroom (back left), opened wide
  const stairA0 = A - 1.8;
  // the luxury corner bathroom (front right, 3.6 x 3.4) needs a wide building: room left of it, or a lane behind it,
  // for the second bedroom's doorway; narrower buildings keep the bathroom at the back and one larger bedroom
  // (the penthouse's stairs are planned first: its bathroom stops short of the stair foot)
  const stN = Math.ceil((top - level) / 0.28), stRun = stN * 0.28, stTop = -Dh + 0.7, stBottom = stTop + stRun;
  const bathA0 = A - 3.6, bathD0 = penthouse ? Math.max(Dh - 3.4, stBottom + 0.9 + 0.75) : Dh - 3.4, bed2Door = coreA + 1.9;
  const frontBath = lux && (penthouse || (A >= 6.4 && (bathD0 - back >= 1.7 || bed2Door + 0.9 <= bathA0 - 0.2)));
  const twoBeds = lux && !penthouse && frontBath;
  if (penthouse) { /* back right: an open dressing area beside the stairwell (its wall is added with the stairs) */ }
  else if (twoBeds) { runA(back, coreA, A, [[bed2Door, BW]]); runD(coreA, -Dh, back); }             // a second bedroom (back right)
  else { runA(back, coreA, A, [[rightMid, DH]]); runD(coreA, -Dh, back); }                             // the bathroom (back right)
  // luxury floors: the bathroom is a 3.2 m room in the front-right corner, its door facing the living room
  const bath = frontBath ? { a0: bathA0, d0: bathD0 } : null; // (the penthouse's too)
  if (bath) { runD(bath.a0, bath.d0, Dh, [[Dh - 1.1, DH]]); runA(bath.d0, bath.a0, A); } // its door near the front, into the clear part
  const fx = [
    box('lift', 0, -Dh + 1.0, 2.6, 2.0, 2.4, { back: toBack }),
    // living: a sofa facing the windows (1.75 m clear behind it, so the rooms behind open onto a lane) and a low table
    box('sofa', -A * 0.5, back + 2.3, Math.min(2.8, A - 2.0), 0.95, 0.85, { back: toBack }), box('table', -A * 0.5, back + 3.55, 1.2, 0.6, 0.42), box('rug', -A * 0.5, back + 3.2, Math.min(3.4, A - 1.6), 2.4, 0.01, { collide: false }),
    // the bedroom: the bed's head against the back wall, a wardrobe on the side wall
    // the bedroom: the headboard against the side wall, the wardrobe on the back wall beside it, a clear strip in front
    box('bed', -A + 1.15, -Dh + 0.3 + (lux ? 1.0 : 0.85), 2.2, lux ? 2.0 : 1.7, 0.6, { back: toLeft }), box('wardrobe', (-A + 2.5 - coreA - 0.15) / 2, -Dh + 0.32, Math.min(1.6, -coreA - 0.15 - (-A + 2.5)), 0.62, 2.1, { back: toBack }),
    box('plant', -A + 0.45, Dh - 0.55, 0.6, 0.6, 1.4),
  ];
  // the kitchen: along the right-hand wall (the left on luxury floors, whose front-right is the bathroom)
  const kA = bath || penthouse ? -A + 0.36 : A - 0.36, kSide = bath || penthouse ? toLeft : toRight, kLen = Math.min(3.8, Dh - back - 1.0);
  if (bath || penthouse) { fx[1] = box('sofa', A * 0.12 + 0.9, back + 2.3, Math.min(2.6, A - 3.4), 0.95, 0.85, { back: toBack }); fx[2] = box('table', A * 0.12 + 0.9, back + 3.55, 1.1, 0.6, 0.42); fx[3] = box('rug', A * 0.12 + 0.9, back + 3.2, 3.0, 2.2, 0.01, { collide: false }); }
  fx.push(box('counter', kA, back + 0.45 + kLen / 2, 0.66, kLen, 0.92, { back: kSide }), box('fridge', kA, Math.min(Dh - 0.5, back + 0.85 + kLen), 0.7, 0.75, 1.95, { back: kSide }));
  if (bath) {
    if (penthouse) fx.push(box('wardrobe', (coreA + stairA0) / 2, -Dh + 0.32, Math.min(1.8, stairA0 - coreA - 0.3), 0.62, 2.1, { back: toBack })); // the dressing area
    else fx.push(box('bed', A - 1.1, -Dh + 1.1, 2.0, 1.6, 0.55, { back: toRight }));
    // the corner bathroom: the tub along the side wall, the vanity and the toilet side by side on its back wall; the front stays clear
    fx.push(box('tub', A - 0.45, bath.d0 + 1.25, 0.8, 1.8, 0.6, { back: toRight }), box('sink', bath.a0 + 1.0, bath.d0 + 0.39, 1.1, 0.62, 0.9, { back: toBack }), box('toilet', bath.a0 + 2.15, bath.d0 + 0.42, 0.5, 0.7, 0.45, { back: toBack }));
  } else {
    fx.push(box('tub', rightMid, -Dh + 0.45, 1.8, 0.8, 0.6, { back: toBack }), box('sink', A - 0.33, -Dh + 2.3, 0.62, 1.2, 0.9, { back: toRight }), box('toilet', coreA + 0.4, -Dh + 2.6, 0.5, 0.7, 0.45, { back: toLeft }));
  }
  // from floor 3: a dining table near the windows; from floor 5: an island and an armchair
  if (spec.layout !== 'standard') fx.push(box('table', bath || penthouse ? -A * 0.45 : A * 0.42, Dh - 1.9, 1.7, 0.9, 0.76, { chairs: 4 }));
  // from floor 5, an island, where the building is wide enough to keep the bedroom doorway clear
  // (it stands at least 1.75 m in front of the bedroom wall, so the bedroom doorway behind it stays open)
  const islandLen = Math.min(2.0, Dh - back - 2.7);
  if ((spec.layout === 'luxury-plus' || penthouse) && A >= 6.4 && islandLen >= 1.4) fx.push(box('island', bath || penthouse ? -A + 2.3 : A - 2.3, back + 1.75 + islandLen / 2, 0.95, islandLen, 0.92, { back: bath || penthouse ? toRight : toLeft }));
  // the penthouse's stairs to the roof: an enclosed stairwell along the right wall, rising toward the back
  let stairs = null, roof = null;
  if (penthouse) {
    const n = stN, rise = (top - level) / n, tread = 0.28, dTop = stTop, dBottom = stBottom; // the top step clear of the back wall
    runs.push({ a: stairA0, d0: -Dh, d1: dBottom - 0.05, gaps: [], axis: 'd' }); // the stairwell's wall
    stairs = { steps: Array.from({ length: n }, (_, i) => ({ ...rect(stairA0, A, dBottom - (i + 1) * tread, dBottom - i * tread), top: r2(level + rise * (i + 1)) })), opening: rect(stairA0, A, dTop - 0.05, dBottom), bottom: P((stairA0 + A) / 2, dBottom + 0.9), top: P((stairA0 + A) / 2, dTop + 0.15),
      // on the roof: a railing along the opening's open side and across its far end (the stairs come up at the near end)
      rails: [rect(stairA0 - 0.08, stairA0, dTop + 1.8, dBottom), rect(stairA0, A, dBottom, dBottom + 0.08)] }; // (the top 1.8 m is the way off the stairs)
    // the terrace: two loungers 1.8 m apart facing the street, a table for four, a hot tub at the back away from the stairs
    roof = { y: top, rect: rect(-A - 0.3, A + 0.3, -Dh - 0.3, Dh + 0.3), furniture: [box('lounger', -A + 2.0, Dh - 2.1, 0.8, 2.0, 0.4), box('lounger', -A + 4.6, Dh - 2.1, 0.8, 2.0, 0.4), box('tub', -A + 2.3, -Dh + 2.4, 2.2, 2.2, 0.8), box('plant', -A + 0.75, Dh - 0.75, 0.7, 0.7, 1.6), box('plant', A - 0.75, Dh - 0.75, 0.7, 0.7, 1.6), box('table', A - 2.6, Dh - 2.6, 1.2, 1.2, 0.74), box('rug', -A + 3.3, Dh - 2.1, 4.2, 2.6, 0.01, { collide: false })].map((o) => ({ ...o, y: 0 })) };
  }
  // the facade's windows on every side (facadeBays), with the front balcony bays as doors
  const balcony = balconyFor(b, floor), openings = [];
  for (const [side, [sx, sz]] of Object.entries(NORMALS)) {
    const length = sx ? b.depth : b.width, half = sx ? b.width / 2 : b.depth / 2, bays = facadeBays(length), sux = sz, suz = -sx, front = side === b.front;
    for (let i = 0; i < bays.bays; i++) {
      const a = bays.at(i), door = front && balcony?.bays.includes(i);
      openings.push({ side, x: r2(b.x + sx * half + sux * a), z: r2(b.z + sz * half + suz * a), width: door ? DOORWAY : Math.min(1.5, bays.span * 0.55), sill: door ? 0 : 0.9, head: door ? 2.3 : 2.54, door: !!door, normal: [sx, sz] });
    }
  }
  const out = balcony ? (() => { const c0 = P(balcony.along - balcony.width / 2, D / 2), c1 = P(balcony.along + balcony.width / 2, D / 2 + balcony.depth); return { minX: Math.min(c0.x, c1.x), maxX: Math.max(c0.x, c1.x), minZ: Math.min(c0.z, c1.z), maxZ: Math.max(c0.z, c1.z), level, front: b.front }; })() : null;
  const lift = P(0, coreD + 0.8);
  return Object.freeze({
    floor, tier: spec.tier, title: spec.title, layout: spec.layout, unitCode: entry.towerHome?.code || null, level, ceiling, height: r2(ceiling - level), facing: b.front, building: rect(-L / 2, L / 2, -D / 2, D / 2), inner: rect(-A, A, -Dh, Dh),
    runs: runs.map((r) => r.axis === 'a' ? { ...rect(r.a0, r.a1, r.dd - 0.08, r.dd + 0.08), gaps: r.gaps.map(([c, h]) => ({ ...P(c, r.dd), half: h })) } : { ...rect(r.a - 0.08, r.a + 0.08, r.d0, r.d1), gaps: r.gaps.map(([c, h]) => ({ ...P(r.a, c), half: h })) }),
    furniture: Object.freeze(fx), openings: Object.freeze(openings), balcony: out, stairs, roof, lift: { x: lift.x, z: lift.z },
    area: Math.round((2 * A) * (2 * Dh) + (balcony ? balcony.width * balcony.depth : 0) + (roof ? (2 * A + 0.6) * (2 * Dh + 0.6) : 0)),
  });
}
export function apartmentUnitSpace(entry, floor, U = apartmentUnit(entry, floor), lobby = interiorLayout(entry)) {
  const liftLobby = { x: lobby.doorX, y: lobby.y, z: r2(lobby.minZ + LOBBY_LIFT_Z) }, inside = { x: U.lift.x, y: U.level, z: U.lift.z };
  const minX = Math.min(U.building.minX, U.balcony?.minX ?? Infinity), maxX = Math.max(U.building.maxX, U.balcony?.maxX ?? -Infinity);
  const minZ = Math.min(U.building.minZ, U.balcony?.minZ ?? Infinity), maxZ = Math.max(U.building.maxZ, U.balcony?.maxZ ?? -Infinity);
  return Object.freeze({
    id: `${entry.spaceId}-f${floor}`, parent: entry.spaceId, floor, layer: 0, safeZone: true,
    entry: Object.freeze(liftLobby), inside: Object.freeze(inside), exit: Object.freeze(inside), outside: Object.freeze(liftLobby),
    bounds: Object.freeze({ minX: r2(minX), maxX: r2(maxX), minY: U.level - 1, maxY: r2((U.roof ? U.roof.y + 3 : U.ceiling + 0.5)), minZ: r2(minZ), maxZ: r2(maxZ) }),
  });
}
// tower-floor is an internal, on-demand lift hall rather than a street-facing catalog building.
export const INTERIOR_TEMPLATES = Object.freeze(Object.keys(TEMPLATES).filter((name) => name !== 'tower-floor'));

// ---------------------------------------------------------------- the catalog
// Doors that cannot be on the plan's front: a warehouse packed against its neighbour opens on its north side.
const DOOR_SIDE = Object.freeze({ 'west-industrial-south-7': 'north' });
function doorOf(b) {
  // City Hall: its own entrance at the foot of the front steps (the waypoint's door)
  if (b.id === 'city-hall') return { facing: CITY_HALL_ENTRY.facing, out: (dist) => ({ x: r2(CITY_HALL_ENTRY.x - (dist - 1.4)), z: CITY_HALL_ENTRY.z }) };
  const facing = DOOR_SIDE[b.id] || b.front || b.facing || (b.x > 0 ? 'west' : 'east'), [nx, nz] = NORMALS[facing] || NORMALS.east, half = nx ? b.width / 2 : b.depth / 2;
  // where the facade draws its door (city-showcase.js): a house's beside its garage, up its stoop; an apartment
  // building's in its middle bay; everything else at the centre
  const along = doorAlong(b, facing), stoop = b.kind === 'house' ? flightDepth(HOUSE_STOOP) : 0, ux = nz, uz = -nx;
  return { facing, along, stoop, out: (dist) => ({ x: r2(b.x + nx * (half + stoop + dist) + ux * along), z: r2(b.z + nz * (half + stoop + dist) + uz * along) }) };
}
export function doorAlong(b, facing = b.front) {
  if (b.kind === 'house') return houseDoorOffset(b);
  if ((!b.kind || b.kind === 'mixed') && facing === b.front) { // midrise: the entrance bay
    const length = NORMALS[facing][0] ? b.depth : b.width, bays = Math.max(1, Math.floor((length - 1.2) / 2.8)), span = (length - 1.2) / bays;
    return r2(-length / 2 + 0.6 + span * (Math.floor(bays / 2) + 0.5));
  }
  return 0;
}
const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

export function interiorLayout(entry) {
  const k = hash(entry.buildingId), T = TEMPLATES[entry.template](k), y = GENERIC_INTERIOR_Y;
  const cx = entry.site.x, cz = entry.site.z, minX = r2(cx - T.w / 2), maxX = r2(cx + T.w / 2), minZ = r2(cz - T.d / 2), maxZ = r2(cz + T.d / 2);
  const at = (o) => ({ ...o, x: r2(cx + o.x), z: r2(cz + o.z) });
  return Object.freeze({
    y, height: T.h, minX, maxX, minZ, maxZ, doorX: cx, doorWidth: 2, palette: T.palette, rooms: T.rooms, variant: k % 997,
    partitions: Object.freeze(T.partitions.map((p) => Object.freeze({ ...p, at: r2((p.axis === 'x' ? cz : cx) + p.at), from: r2((p.axis === 'x' ? cx : cz) + p.from), to: r2((p.axis === 'x' ? cx : cz) + p.to),
      gaps: p.gaps.map(([c, half]) => [r2((p.axis === 'x' ? cx : cz) + c), half]) }))),
    furniture: Object.freeze(T.furniture.map((o) => Object.freeze(at(o)))),
    lights: Object.freeze([{ x: cx, z: r2(cz + T.d / 4) }, { x: cx, z: r2(cz - T.d / 4) }]),
    ...stairsAndUpper(T, cx, cz),
  });
}
// A two-storey interior's stairs (treads in world coordinates, each with its top), the upper floor's slab
// height and its opening over the stairs, and the railing around that opening.
function stairsAndUpper(T, cx, cz) {
  if (!T.stairs || !T.upper) return { upper: null, stairs: null };
  const S = T.stairs, n = S.steps, top = r2(S.zBottom - n * S.tread);
  const steps = Array.from({ length: n }, (_, i) => Object.freeze({ minX: r2(cx + S.x0), maxX: r2(cx + S.x1), minZ: r2(cz + S.zBottom - (i + 1) * S.tread), maxZ: r2(cz + S.zBottom - i * S.tread), top: r2(S.rise * (i + 1)) }));
  const opening = Object.freeze({ minX: r2(cx + S.x0), maxX: r2(cx + S.x1), minZ: r2(cz + top), maxZ: r2(cz + S.zBottom) });
  return {
    upper: Object.freeze({ y: T.upper.y, h: T.upper.h, opening }),
    stairs: Object.freeze({ steps: Object.freeze(steps), width: r2(S.x1 - S.x0), bottom: Object.freeze({ x: r2(cx + (S.x0 + S.x1) / 2), z: r2(cz + S.zBottom + 0.8) }), top: Object.freeze({ x: r2(cx + (S.x0 + S.x1) / 2), z: r2(cz + top - 0.9) }),
      // the landing railing: along the open side of the opening and across its front end
      rails: Object.freeze([{ minX: opening.maxX, maxX: r2(opening.maxX + 0.08), minZ: opening.minZ, maxZ: opening.maxZ }, { minX: opening.minX, maxX: opening.maxX, minZ: opening.maxZ, maxZ: r2(opening.maxZ + 0.08) }]) }),
  };
}

export function interiorSpace(entry, L = interiorLayout(entry)) {
  return Object.freeze({
    id: entry.spaceId, layer: 1, safeZone: true,
    entry: Object.freeze({ ...entry.door, y: 0 }), inside: Object.freeze({ x: L.doorX, y: L.y, z: r2(L.maxZ - 1.6) }),
    exit: Object.freeze({ x: L.doorX, y: L.y, z: r2(L.maxZ - 1.0) }), outside: Object.freeze({ ...entry.outside, y: 0 }),
    bounds: Object.freeze({ minX: r2(L.minX + 0.2), maxX: r2(L.maxX - 0.2), minY: L.y - 1, maxY: L.y + L.height, minZ: r2(L.minZ + 0.2), maxZ: r2(L.maxZ - 0.2) }),
  });
}

let cached = null;
// Every enterable building without a hand-built interior, in plan order.
export function interiorCatalog(plan = null) {
  if (!plan && cached) return cached;
  const p = plan || createCityPlan(), out = [];
  const house = p.districts.flatMap((d) => d.buildings).find((b) => Math.abs(b.x - ENTERABLE_HOUSE_SITE.x) < 0.5 && Math.abs(b.z - ENTERABLE_HOUSE_SITE.z) < 0.5);
  for (const district of p.districts) for (const b of district.buildings) {
    if (SKIP.has(b.id) || b.id === house?.id) continue;
    const template = templateFor(b, district.id); if (!template) continue;
    const door = doorOf(b), tier = b.propertyTier || TIER[template] || null;
    out.push(Object.freeze({
      buildingId: b.id, spaceId: `bld-${b.id}`, districtId: district.id, template, name: SHOPS[b.id]?.name || b.name || FALLBACK_NAME[template] || 'Building',
      tier, value: tier ? PROPERTY_TIERS[tier].value : null, facing: door.facing, lotId: b.lotId || null, license: b.license || null,
      site: Object.freeze({ x: b.x, z: b.z, width: b.width, depth: b.depth, height: b.height }),
      door: Object.freeze(door.out(1.4)), outside: Object.freeze(door.out(1.2)),
    }));
  }
  const frozen = Object.freeze(out);
  if (!plan) cached = frozen;
  return frozen;
}

export function neonTowerFloorEntry(floor) {
  const record = neonTowerFloor(floor); if (!record) return null;
  return Object.freeze({ buildingId: `neon-tower-floor-${floor}`, spaceId: record.spaceId, districtId: 'neon-a3', template: 'tower-floor', name: `Neon Tower · ${record.title}`, tier: null, value: null, facing: 'west', site: Object.freeze({ x: NEON_TOWER.x, z: NEON_TOWER.z, width: 18, depth: 14, height: 3.2 }), door: Object.freeze({ x: NEON_TOWER.x - 10.4, z: NEON_TOWER.z }), outside: Object.freeze({ x: NEON_TOWER.x - 10.2, z: NEON_TOWER.z }) });
}

export function neonTowerHomeEntry(home) {
  return Object.freeze({ buildingId: home.id, spaceId: home.spaceId, districtId: 'neon-a3', template: 'apartments', name: `${NEON_TOWER.name} · ${home.title}`, tier: home.tier, value: PROPERTY_TIERS[home.tier].value, facing: home.facing, site: home.site, towerHome: home, door: Object.freeze({ x: 0, z: 0 }), outside: Object.freeze({ x: 0, z: 0 }) });
}

export function neonTowerFloorSpace(floor, lobby = interiorSpace(interiorCatalog().find((e) => e.spaceId === NEON_TOWER_LOBBY_SPACE))) {
  const record = neonTowerFloor(floor), entry = neonTowerFloorEntry(floor), L = interiorLayout(entry); if (!record || !lobby) return null;
  const root = interiorCatalog().find((e) => e.spaceId === NEON_TOWER_LOBBY_SPACE), rootLayout = interiorLayout(root);
  const lobbyLift = Object.freeze({ x: rootLayout.doorX, y: rootLayout.y, z: r2(rootLayout.minZ + LOBBY_LIFT_Z) });
  const floorLift = Object.freeze({ x: L.doorX, y: L.y, z: r2(L.minZ + LOBBY_LIFT_Z) });
  return Object.freeze({ id: record.spaceId, parent: NEON_TOWER_LOBBY_SPACE, floor, layer: 1, safeZone: true, entry: lobbyLift, inside: floorLift, exit: floorLift, outside: lobbyLift, bounds: Object.freeze({ minX: L.minX + 0.2, maxX: L.maxX - 0.2, minY: L.y - 1, maxY: L.y + L.height, minZ: L.minZ + 0.2, maxZ: L.maxZ - 0.2 }) });
}

export function neonTowerHomeSpace(home, floorSpace = neonTowerFloorSpace(home.floor)) {
  const entry = neonTowerHomeEntry(home), U = apartmentUnit(entry, home.floor), door = neonTowerFloor(home.floor).doors.find((d) => d.slot === home.slot);
  const base = apartmentUnitSpace(entry, home.floor, U);
  return Object.freeze({ ...base, id: home.spaceId, parent: floorSpace.id, entry: Object.freeze({ x: door.x, y: door.y, z: door.z }), outside: Object.freeze({ x: door.x + (door.facing === 'west' ? 0.9 : -0.9), y: door.y, z: door.z }) });
}

export function genericInteriorSpaces(plan = null) {
  const out = {};
  for (const e of interiorCatalog(plan)) {
    out[e.spaceId] = interiorSpace(e);
    if (e.template === 'apartments' || e.template === 'lofts') for (const { floor } of APARTMENT_FLOORS) { const sp = apartmentUnitSpace(e, floor); out[sp.id] = sp; }
  }
  if (!plan) for (const floor of new Set(NEON_TOWER_HOMES.map((home) => home.floor))) {
    const floorSpace = neonTowerFloorSpace(floor, out[NEON_TOWER_LOBBY_SPACE]); out[floorSpace.id] = floorSpace;
    for (const home of NEON_TOWER_HOMES.filter((item) => item.floor === floor)) { const space = neonTowerHomeSpace(home, floorSpace); out[space.id] = space; }
  }
  return out;
}
