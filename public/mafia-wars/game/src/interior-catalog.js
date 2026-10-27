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
const FALLBACK_NAME = Object.freeze({ apartments: 'Apartments', lofts: 'Lofts', warehouse: 'Warehouse', house: 'House' });

// ---------------------------------------------------------------- layouts
// Each template builds in local metres (x across, z from the back wall at -d/2 to the door wall at +d/2)
// and returns size, partitions (wall runs with doorway gaps) and furniture. `k` is a stable per-building
// number so neighbouring copies of a template differ a little (colours, which side the sofa is on).
const wallX = (z, x0, x1, gaps = []) => ({ axis: 'x', at: z, from: x0, to: x1, gaps });   // a wall along x at z
const wallZ = (x, z0, z1, gaps = []) => ({ axis: 'z', at: x, from: z0, to: z1, gaps });   // a wall along z at x
const f = (type, x, z, w, d, h, extra = {}) => ({ type, x, z, w, d, h, collide: true, ...extra });
const deco = (type, x, z, w, d, h, extra = {}) => ({ type, x, z, w, d, h, collide: false, ...extra });

const TEMPLATES = {
  // A family house: open living room and kitchen at the front, two bedrooms and a bath at the back.
  house: (k) => {
    const w = 15, d = 12, s = k % 2 ? 1 : -1; // s: which side the living room is on
    return { w, d, h: 3.3, palette: k % 3 === 0 ? 'warm' : k % 3 === 1 ? 'oak' : 'sage', rooms: ['Living room', 'Kitchen', 'Bedroom', 'Bedroom', 'Bath'],
      partitions: [wallX(0, -w / 2, w / 2, [[-5, 1.1], [-0.3, 0.9], [4.6, 1.1]]), wallZ(-2.2, -d / 2, 0), wallZ(1.6, -d / 2, 0)],
      furniture: [
        // the sofa stands clear of the bedroom doorways in the wall behind it
        f('sofa', s * -4.2, 2.0, 3, 0.95, 0.85), deco('rug', s * -4.2, 3.5, 3.4, 2.2, 0.01), f('table', s * -4.2, 3.4, 1.2, 0.6, 0.42), f('tv', s * -4.2, 5.6, 2.2, 0.45, 1.25),
        f('counter', s * 6.95, 3, 0.65, 5, 0.92), f('island', s * 4.6, 3.2, 1.0, 2.2, 0.92), f('table', s * 2.3, 4.6, 1.6, 0.9, 0.76), f('fridge', s * 6.95, 0.75, 0.7, 0.7, 1.9),
        f('bed', -4.7, -4.1, 1.9, 2.2, 0.6), f('nightstand', -6.1, -5.4, 0.5, 0.45, 0.55), f('wardrobe', -6.95, -1.6, 0.6, 1.8, 2.1),
        f('tub', -0.3, -5.4, 1.7, 0.8, 0.6), f('sink', 1.1, -1.9, 0.6, 0.45, 0.9), f('toilet', -1.6, -2.6, 0.45, 0.65, 0.45),
        f('bed', 4.4, -4.1, 1.6, 2.1, 0.55), f('desk', 6.8, -1.4, 0.7, 1.4, 0.76), deco('rug', 4.4, -2.2, 2.2, 1.4, 0.01),
        f('plant', s * -6.8, 5.4, 0.6, 0.6, 1.3), f('plant', s * 6.9, 5.5, 0.6, 0.6, 1.3),
      ] };
  },
  // An apartment building: a lobby with mailboxes and the lift, and a model apartment behind it.
  apartments: (k) => apartmentLayout(k, 'city'),
  lofts: (k) => apartmentLayout(k, 'loft'),
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
  const w = 15, d = 11;
  return { w, d, h: 3.6, palette: style === 'loft' ? 'loft' : k % 2 ? 'city' : 'oak', rooms: ['Lobby'], partitions: [],
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
  const spec = APARTMENT_FLOORS.find((x) => x.floor === floor); if (!spec) return null;
  const b = { ...entry.site, front: entry.facing, kind: 'apartments' }, [nx, nz] = NORMALS[b.front], ux = nz, uz = -nx;
  const L = nx ? b.depth : b.width, D = nx ? b.width : b.depth, A = L / 2 - 0.3, Dh = D / 2 - 0.3; // inner half-sizes
  const level = storeyFloor(floor), ceiling = storeyCeiling(floor), top = b.height, penthouse = spec.layout === 'penthouse';
  const P = (a, dd) => ({ x: r2(b.x + ux * a + nx * dd), z: r2(b.z + uz * a + nz * dd) });
  const rect = (a0, a1, d0, d1) => { const p = P(a0, d0), q = P(a1, d1); return { minX: Math.min(p.x, q.x), maxX: Math.max(p.x, q.x), minZ: Math.min(p.z, q.z), maxZ: Math.max(p.z, q.z) }; };
  const box = (type, a, dd, wa, wd, h, extra = {}) => { const c = P(a, dd), along = Math.abs(ux) > 0.5; return { type, x: c.x, z: c.z, w: along ? wa : wd, d: along ? wd : wa, h, collide: extra.collide ?? true, ...extra }; };
  // the hall runs from the lift (coreD) to the living room (back); doors off it are always in front of the lift.
  // The penthouse's living room is deeper, but never so deep that the rooms behind it get cramped.
  const coreD = -Dh + 2.2, back = penthouse ? Math.max(-Dh * 0.25, coreD + 3.1) : 0.4, split = Math.max((-Dh + back) / 2, coreD + 1.3);
  // walls in local (a = along the facade, d = depth, + toward the street), turned into world runs
  const runs = [];
  const runA = (dd, a0, a1, gaps = []) => runs.push({ dd, a0, a1, gaps, axis: 'a' }); // a wall running along the facade at depth dd
  const runD = (a, d0, d1, gaps = []) => runs.push({ a, d0, d1, gaps, axis: 'd' });  // a wall running front-to-back at a
  runA(back, -A, -CORE_A); runD(-CORE_A, -Dh, back, [[(coreD + back) / 2, 0.55]]);
  const luxury = spec.tier !== 'standard';
  if (luxury) { runA(back, CORE_A, A); runA(split, CORE_A, A); runD(CORE_A, -Dh, back, [[(coreD + split) / 2, 0.5], [(split + back) / 2, 0.5]]); }
  else { runA(back, CORE_A, A); runD(CORE_A, -Dh, back, [[(coreD + back) / 2, 0.5]]); }
  const fx = [
    box('lift', 0, -Dh + 1.1, 2.4, 2.2, 2.4),
    // living (front): sofa facing the windows' side wall, a table, the TV; the kitchen on the other side
    box('sofa', -A * 0.45, Dh * 0.35, Math.min(3.2, A * 0.6), 0.95, 0.85), box('table', -A * 0.45, Dh * 0.62, 1.2, 0.6, 0.42), box('rug', -A * 0.45, Dh * 0.55, Math.min(3.6, A * 0.7), 2.2, 0.01, { collide: false }),
    box('tv', -A + 0.25, Dh * 0.5, 0.4, 2.0, 1.25), box('counter', A - 0.35, back + (Dh - back) * 0.45, 0.65, Math.min(4.2, (Dh - back) * 0.7), 0.92),
    box('island', A * 0.42, back + (Dh - back) * 0.5, luxury ? 2.2 : 1.6, 0.95, 0.92), box('fridge', A - 0.35, back + 0.55, 0.7, 0.7, 1.9),
    // the bedroom (back left)
    box('bed', (-A - CORE_A) / 2, (-Dh + back) / 2 - 0.3, luxury ? 2.0 : 1.7, 2.2, 0.6), box('wardrobe', -A + 0.3, back - 1.1, 0.6, 1.8, 2.1), box('nightstand', (-A - CORE_A) / 2 + 1.4, -Dh + 0.35, 0.5, 0.45, 0.55),
    box('plant', -A + 0.4, Dh - 0.5, 0.6, 0.6, 1.4),
  ];
  if (luxury) fx.push(box('bed', (A + CORE_A) / 2, (-Dh + split) / 2, 1.6, 2.0, 0.55), box('tub', (A + CORE_A) / 2, back - 0.55, 1.7, 0.8, 0.6), box('sink', A - 0.3, split + 0.6, 0.45, 0.6, 0.9), box('toilet', CORE_A + 0.45, split + 0.55, 0.45, 0.65, 0.45));
  else fx.push(box('tub', (A + CORE_A) / 2, -Dh + 0.5, 1.7, 0.8, 0.6), box('sink', A - 0.3, back - 0.8, 0.45, 0.6, 0.9), box('toilet', CORE_A + 0.5, -Dh + 1.6, 0.45, 0.65, 0.45));
  // from floor 3 up: a study desk and a dining table
  if (spec.layout !== 'standard') fx.push(box('desk', -A * 0.4, back + 0.45, 1.4, 0.6, 0.76), box('table', A * 0.42, Dh - 1.1, 1.6, 0.9, 0.76));
  if (spec.layout === 'luxury-plus' || penthouse) fx.push(box('wardrobe', -CORE_A - 0.35, -Dh + 0.5, 0.6, 0.9, 2.1), box('plant', A - 0.4, Dh - 0.5, 0.6, 0.6, 1.4), box('sofa', -A * 0.45, Dh * 0.08, Math.min(2.4, A * 0.45), 0.9, 0.85));
  // the penthouse's stairs to the roof: real steps along the left wall, up through an opening in the ceiling
  let stairs = null, roof = null;
  if (penthouse) {
    const n = Math.ceil((top - level) / 0.2), rise = (top - level) / n, tread = 0.28, run = n * tread, d0 = Math.min(Dh - 0.3 - run, back + 0.6);
    stairs = { steps: Array.from({ length: n }, (_, i) => ({ ...rect(-A, -A + 1.15, d0 + i * tread, d0 + (i + 1) * tread), top: r2(level + rise * (i + 1)) })), opening: rect(-A, -A + 1.2, d0 + run - 3.2, d0 + run + 0.2) };
    roof = { y: top, rect: rect(-A - 0.3, A + 0.3, -Dh - 0.3, Dh + 0.3), furniture: [box('lounger', A * 0.3, Dh * 0.5, 0.8, 2.0, 0.4), box('lounger', A * 0.6, Dh * 0.5, 0.8, 2.0, 0.4), box('tub', A * 0.45, -Dh * 0.4, 2.2, 2.2, 0.8), box('plant', A - 0.5, -Dh + 0.5, 0.8, 0.8, 1.6), box('plant', A - 0.5, Dh - 0.5, 0.8, 0.8, 1.6), box('table', -A * 0.2, Dh * 0.4, 1.2, 1.2, 0.74), box('rug', -A * 0.2, Dh * 0.4, 3, 3, 0.01, { collide: false })].map((o) => ({ ...o, y: 0 })) };
  }
  // the facade's windows on every side (facadeBays), with the front balcony bays as doors
  const balcony = balconyFor(b, floor), openings = [];
  for (const [side, [sx, sz]] of Object.entries(NORMALS)) {
    const length = sx ? b.depth : b.width, half = sx ? b.width / 2 : b.depth / 2, bays = facadeBays(length), sux = sz, suz = -sx, front = side === b.front;
    for (let i = 0; i < bays.bays; i++) {
      const a = bays.at(i), door = front && balcony?.bays.includes(i);
      openings.push({ side, x: r2(b.x + sx * half + sux * a), z: r2(b.z + sz * half + suz * a), width: door ? 1.25 : Math.min(1.5, bays.span * 0.55), sill: door ? 0 : 0.9, head: door ? 2.3 : 2.54, door: !!door, normal: [sx, sz] });
    }
  }
  const out = balcony ? (() => { const c0 = P(balcony.along - balcony.width / 2, D / 2), c1 = P(balcony.along + balcony.width / 2, D / 2 + balcony.depth); return { minX: Math.min(c0.x, c1.x), maxX: Math.max(c0.x, c1.x), minZ: Math.min(c0.z, c1.z), maxZ: Math.max(c0.z, c1.z), level, front: b.front }; })() : null;
  const lift = P(0, coreD + 0.8);
  return Object.freeze({
    floor, tier: spec.tier, title: spec.title, layout: spec.layout, level, ceiling, height: r2(ceiling - level), facing: b.front, building: rect(-L / 2, L / 2, -D / 2, D / 2), inner: rect(-A, A, -Dh, Dh),
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
export const INTERIOR_TEMPLATES = Object.freeze(Object.keys(TEMPLATES));

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
  });
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
    const door = doorOf(b), tier = TIER[template] || null;
    out.push(Object.freeze({
      buildingId: b.id, spaceId: `bld-${b.id}`, districtId: district.id, template, name: SHOPS[b.id]?.name || b.name || FALLBACK_NAME[template] || 'Building',
      tier, value: tier ? PROPERTY_TIERS[tier].value : null, facing: door.facing,
      site: Object.freeze({ x: b.x, z: b.z, width: b.width, depth: b.depth, height: b.height }),
      door: Object.freeze(door.out(1.4)), outside: Object.freeze(door.out(1.2)),
    }));
  }
  const frozen = Object.freeze(out);
  if (!plan) cached = frozen;
  return frozen;
}

export function genericInteriorSpaces(plan = null) {
  const out = {};
  for (const e of interiorCatalog(plan)) {
    out[e.spaceId] = interiorSpace(e);
    if (e.template === 'apartments' || e.template === 'lofts') for (const { floor } of APARTMENT_FLOORS) { const sp = apartmentUnitSpace(e, floor); out[sp.id] = sp; }
  }
  return out;
}
