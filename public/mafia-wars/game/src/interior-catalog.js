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
function apartmentLayout(k, style) {
  // lobby 5.5 m deep at the front; the model apartment (about 110 m²) behind a doorway
  const w = 15, d = 17, lobbyZ = d / 2 - 5.5;
  return { w, d, h: 3.4, palette: style === 'loft' ? 'loft' : k % 2 ? 'city' : 'oak', rooms: ['Lobby', 'Living room', 'Kitchen', 'Bedroom', 'Bath'],
    partitions: [wallX(lobbyZ, -w / 2, w / 2, [[0, 1.4]]), wallX(-2, -w / 2, w / 2, [[-3.8, 1.1], [3.2, 0.9]]), wallZ(1, -d / 2, -2)],
    furniture: [
      f('mailboxes', -7.2, lobbyZ + 2.6, 0.35, 3.2, 1.7), f('lift', 7.25, lobbyZ + 2.6, 0.3, 2, 2.4, { collide: true }), f('bench', -3.6, lobbyZ + 0.6, 2.2, 0.5, 0.45), f('plant', 5.6, d / 2 - 0.8, 0.6, 0.6, 1.3),
      f('sofa', -4, 0.6, 2.8, 0.95, 0.85), deco('rug', -4, 2.2, 3.2, 2.2, 0.01), f('table', -4, 2.2, 1.1, 0.6, 0.42), f('tv', -7.1, 1.6, 0.4, 2, 1.25),
      f('counter', 6.95, 0.3, 0.65, 3.4, 0.92), f('island', 4.2, 1.1, 1.0, 2, 0.92), f('fridge', 6.95, 2.5, 0.7, 0.7, 1.9),
      f('bed', -3.8, -5.6, 2.0, 2.2, 0.6), f('wardrobe', -7.1, -3.2, 0.6, 1.8, 2.1), f('nightstand', -5.4, -7.8, 0.5, 0.45, 0.55), f('desk', -0.4, -7.7, 1.4, 0.6, 0.76),
      f('tub', 4.2, -7.8, 1.7, 0.8, 0.6), f('sink', 6.95, -3.4, 0.45, 0.6, 0.9), f('toilet', 2, -5, 0.45, 0.65, 0.45),
    ] };
}
export const INTERIOR_TEMPLATES = Object.freeze(Object.keys(TEMPLATES));

// ---------------------------------------------------------------- the catalog
// Doors that cannot be on the plan's front: a warehouse packed against its neighbour opens on its north side.
const DOOR_SIDE = Object.freeze({ 'west-industrial-south-7': 'north' });
function doorOf(b) {
  // City Hall: its own entrance at the foot of the front steps (the waypoint's door)
  if (b.id === 'city-hall') return { facing: CITY_HALL_ENTRY.facing, out: (dist) => ({ x: r2(CITY_HALL_ENTRY.x - (dist - 1.4)), z: CITY_HALL_ENTRY.z }) };
  const facing = DOOR_SIDE[b.id] || b.front || b.facing || (b.x > 0 ? 'west' : 'east'), [nx, nz] = NORMALS[facing] || NORMALS.east, half = nx ? b.width / 2 : b.depth / 2;
  return { facing, out: (dist) => ({ x: r2(b.x + nx * (half + dist)), z: r2(b.z + nz * (half + dist)) }) };
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
  return Object.fromEntries(interiorCatalog(plan).map((e) => [e.spaceId, interiorSpace(e)]));
}
