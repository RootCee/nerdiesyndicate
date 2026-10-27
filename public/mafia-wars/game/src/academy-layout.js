import { LIBRARY_STAIRS, entrySteps, flightDepth } from './entry-steps.js';
// M7.2 Nerdie Blaq Academy: the campus east of Central Park. Pure (no Three.js): the city plan, the
// client (academy.js, library-system.js), resident navigation, the map, the server, and the tests
// all read it.
//
// The city grows east from x 244 to x 420. Academy Avenue (x 252) runs the city's full depth along
// the park's east edge; North Cross, South Cross and South Market now end at it (T junctions), so no
// street runs into the campus. The campus fills x 261..418, z -42..146 (157 x 188 m): a walled street
// front with a gate facing North Cross, an avenue of trees to a central quad with the Syndicate
// fountain, four halls and a clock tower around the quad, and the Library at the head of the axis.
// South of the campus the Academy Green (x 261..418, z -146..-46) is open lawn and groves.

export const ACADEMY_AVENUE = Object.freeze({ id: 'academy-avenue', x: 252, z: 0, width: 10, depth: 296 });
export const ACADEMY = Object.freeze({ id: 'nerdie-blaq-academy', name: 'Nerdie Blaq Academy', minX: 261, maxX: 418, minZ: -42, maxZ: 146 });
export const ACADEMY_GREEN = Object.freeze({ id: 'academy-green', name: 'Academy Green', minX: 261, maxX: 418, minZ: -146, maxZ: -46 });
export const ACADEMY_AXIS_Z = 48.5; // North Cross's centre line, continued through the gate to the Library
export const QUAD = Object.freeze({ minX: 284, maxX: 352, minZ: 20, maxZ: 77 });
export const FOUNTAIN = Object.freeze({ x: 318, z: ACADEMY_AXIS_Z, radius: 3.6 });
export const FOUNTAIN_PLAZA = Object.freeze({ minX: 310, maxX: 326, minZ: 40.5, maxZ: 56.5 });

// Buildings (they join the city plan's districts: colliders, server structures, nav obstacles).
export const LIBRARY = Object.freeze({ id: 'academy-library', name: 'Nerdie Blaq Academy Library', kind: 'library', front: 'west', fixedFront: 'west', x: 388, z: ACADEMY_AXIS_Z, width: 40, depth: 44, height: 13 });
export { LIBRARY_STAIRS };
export const ACADEMY_HALLS = Object.freeze([
  { id: 'academy-defi', name: 'Web3 & DeFi Institute', sign: 'WEB3 & DEFI INSTITUTE', x: 296, z: 96, front: 'south', accent: 'purple' },
  { id: 'academy-business', name: 'School of Business & Operations', sign: 'SCHOOL OF BUSINESS', x: 340, z: 96, front: 'south', accent: 'green' },
  { id: 'academy-media', name: 'Academy Media Hall', sign: 'ACADEMY MEDIA HALL', x: 296, z: 0, front: 'north', accent: 'green' },
  { id: 'academy-founders', name: 'Founders Hall', sign: 'FOUNDERS HALL', x: 340, z: 0, front: 'north', accent: 'purple' },
].map((h) => Object.freeze({ ...h, kind: 'academy-hall', fixedFront: h.front, width: 32, depth: 24, height: 12 })));
export const CLOCK_TOWER = Object.freeze({ id: 'academy-clock-tower', name: 'Academy Clock Tower', kind: 'clock-tower', front: 'south', fixedFront: 'south', x: 318, z: 96, width: 7, depth: 7, height: 30 });
export const ACADEMY_BUILDINGS = Object.freeze([LIBRARY, ...ACADEMY_HALLS, CLOCK_TOWER]);

// The Library's front stairs (a 1.2 m plinth, like City Hall) and the walks that meet at their foot.
export const libraryStairs = () => entrySteps(LIBRARY);
const LIBRARY_FRONT = LIBRARY.x - LIBRARY.width / 2;
export const LIBRARY_FOOT = +(LIBRARY_FRONT - flightDepth(LIBRARY_STAIRS) - 0.6).toFixed(2);

// The street wall and gate on Academy Avenue: the gate opens on the axis, facing North Cross.
export const ACADEMY_GATE = Object.freeze({ x: 261, z: ACADEMY_AXIS_Z, opening: 8.6, pillar: 1.0, height: 4.6, archTop: 6.2 });
export const ACADEMY_WALL = Object.freeze({ x: 260.8, thick: 0.4, height: 1.1 });

// Walk centre lines (they join the resident walk graph). Main walks are 4 m wide, the rest 3 m.
export const ACADEMY_PATHS = Object.freeze([
  { id: 'academy-main-west', axis: 'z', c: ACADEMY_AXIS_Z, a0: ACADEMY_AVENUE.x + ACADEMY_AVENUE.width / 2 + 1, a1: 312, width: 4 }, // from the avenue sidewalk's centre line
  { id: 'academy-main-east', axis: 'z', c: ACADEMY_AXIS_Z, a0: 324, a1: LIBRARY_FOOT, width: 4 },
  // around the fountain (the plaza is paved; these are its walk lines)
  { id: 'fountain-south', axis: 'z', c: 42.5, a0: 312, a1: 324, width: 0 },
  { id: 'fountain-north', axis: 'z', c: 54.5, a0: 312, a1: 324, width: 0 },
  { id: 'fountain-west', axis: 'x', c: 312, a0: 42.5, a1: 54.5, width: 0 },
  { id: 'fountain-east', axis: 'x', c: 324, a0: 42.5, a1: 54.5, width: 0 },
  // the quad's edges, the cross walk to the clock tower and out to the Green
  { id: 'quad-south', axis: 'z', c: QUAD.minZ, a0: QUAD.minX, a1: QUAD.maxX, width: 3 },
  { id: 'quad-north', axis: 'z', c: QUAD.maxZ, a0: QUAD.minX, a1: QUAD.maxX, width: 3 },
  { id: 'quad-west', axis: 'x', c: QUAD.minX, a0: QUAD.minZ, a1: QUAD.maxZ, width: 3 },
  { id: 'quad-east', axis: 'x', c: QUAD.maxX, a0: QUAD.minZ, a1: QUAD.maxZ, width: 3 },
  { id: 'quad-cross-north', axis: 'x', c: FOUNTAIN.x, a0: 54.5, a1: CLOCK_TOWER.z - CLOCK_TOWER.depth / 2, width: 3 },
  { id: 'quad-cross-south', axis: 'x', c: FOUNTAIN.x, a0: ACADEMY.minZ, a1: 42.5, width: 3 },
  // each hall's front door to the quad
  ...ACADEMY_HALLS.map((h) => ({ id: `${h.id}-walk`, axis: 'x', c: h.x, a0: h.front === 'south' ? QUAD.maxZ : h.z + h.depth / 2, a1: h.front === 'south' ? h.z - h.depth / 2 : QUAD.minZ, width: 3 })),
  // the campus loop just inside the walls (behind the Library on the east)
  { id: 'campus-loop-south', axis: 'z', c: -36, a0: 268, a1: 412, width: 3 },
  { id: 'campus-loop-north', axis: 'z', c: 140, a0: 268, a1: 412, width: 3 },
  { id: 'campus-loop-west', axis: 'x', c: 268, a0: -36, a1: 140, width: 3 },
  { id: 'campus-loop-east', axis: 'x', c: 412, a0: -36, a1: 140, width: 3 },
].map((p) => Object.freeze(p)));

const rect = (x, z, w, d, extra = {}) => Object.freeze({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, ...extra });
const inRect = (x, z, r, pad = 0) => x > r.minX - pad && x < r.maxX + pad && z > r.minZ - pad && z < r.maxZ + pad;
const nearPath = (x, z, clear) => ACADEMY_PATHS.some((p) => (p.axis === 'x' ? Math.abs(x - p.c) < clear && z > p.a0 - clear && z < p.a1 + clear : Math.abs(z - p.c) < clear && x > p.a0 - clear && x < p.a1 + clear));

// Benches along the quad's walks (facing the lawn) and the avenue of trees.
export const ACADEMY_BENCHES = Object.freeze((() => {
  const out = [];
  for (const x of [292, 304, 332, 344]) for (const z of [QUAD.minZ + 2.4, QUAD.maxZ - 2.4]) out.push({ id: `academy-bench-${x}-${z}`, x, z, alongZ: false });
  for (const z of [30, 40, 58, 68]) for (const x of [QUAD.minX + 2.4, QUAD.maxX - 2.4]) out.push({ id: `academy-bench-${x}-${z}`, x, z, alongZ: true });
  for (const x of [274, 288, 302]) for (const s of [-1, 1]) out.push({ id: `academy-bench-main-${x}-${s}`, x, z: ACADEMY_AXIS_Z + s * 3.6, alongZ: false });
  return out.map((b) => Object.freeze(b));
})());
// Lamp posts (emissive heads that follow the city's night level), 2.3 m off the walk centre.
export const ACADEMY_LAMPS = Object.freeze((() => {
  const out = [];
  for (let x = 266; x <= 306; x += 10) for (const s of [-1, 1]) out.push({ x, z: ACADEMY_AXIS_Z + s * 3.1 });
  for (let x = 330; x <= 358; x += 10) for (const s of [-1, 1]) out.push({ x, z: ACADEMY_AXIS_Z + s * 3.1 });
  for (const x of [QUAD.minX, QUAD.maxX]) for (const z of [QUAD.minZ, QUAD.maxZ]) out.push({ x: x + (x < 318 ? -2.3 : 2.3), z: z + (z < 48 ? -2.3 : 2.3) });
  for (const [c, a0, a1, axis] of [[-36, 276, 404, 'z'], [140, 276, 404, 'z'], [268, -28, 132, 'x'], [412, -28, 132, 'x']]) for (let a = a0; a <= a1; a += 32) out.push(axis === 'z' ? { x: a, z: c + (c < 0 ? 2.3 : -2.3) } : { x: c + (c < 300 ? 2.3 : -2.3), z: a });
  return out.filter((l) => !ACADEMY_BUILDINGS.some((b) => inRect(l.x, l.z, rect(b.x, b.z, b.width, b.depth), 1.5))).map((l, i) => Object.freeze({ id: `academy-lamp-${i}`, ...l }));
})());

// Every solid thing a player bumps into and a resident walks around (rectangles, x/z).
export function academyFixtures() {
  const out = [];
  const f = FOUNTAIN; out.push(rect(f.x, f.z, f.radius * 2, f.radius * 2, { id: 'academy-fountain', kind: 'fountain', height: 0.8 }));
  for (const b of ACADEMY_BENCHES) out.push(rect(b.x, b.z, b.alongZ ? 0.6 : 1.8, b.alongZ ? 1.8 : 0.6, { id: b.id, kind: 'bench', height: 0.85 }));
  for (const l of ACADEMY_LAMPS) out.push(rect(l.x, l.z, 0.24, 0.24, { id: l.id, kind: 'lamp', height: 4.2 }));
  const G = ACADEMY_GATE, half = G.opening / 2;
  for (const s of [-1, 1]) out.push(rect(G.x, G.z + s * (half + G.pillar / 2), G.pillar, G.pillar, { id: `academy-gate-pillar-${s < 0 ? 's' : 'n'}`, kind: 'pillar', height: G.height }));
  // the street wall either side of the gate, along the campus front
  const W = ACADEMY_WALL, wallS = [ACADEMY.minZ, G.z - half - G.pillar], wallN = [G.z + half + G.pillar, ACADEMY.maxZ];
  for (const [z0, z1] of [wallS, wallN]) out.push(Object.freeze({ minX: W.x - W.thick / 2, maxX: W.x + W.thick / 2, minZ: z0, maxZ: z1, id: `academy-wall-${z0 < G.z ? 's' : 'n'}`, kind: 'wall', height: W.height }));
  for (const s of libraryStairs().filter((x) => x.part === 'cheek')) out.push(Object.freeze({ minX: s.minX, maxX: s.maxX, minZ: s.minZ, maxZ: s.maxZ, id: s.id, kind: 'cheek', height: s.top }));
  return out;
}

// Trees: an avenue along the main walk, rows around the loop, groves on the lawns and the Green.
export function academyTrees() {
  const blocked = [QUAD, FOUNTAIN_PLAZA, ...ACADEMY_BUILDINGS.map((b) => rect(b.x, b.z, b.width + 5, b.depth + 5)), rect(LIBRARY_FRONT - 4, LIBRARY.z, 9, LIBRARY_STAIRS.width + 6)];
  const fixtures = academyFixtures(), out = [];
  const ok = (x, z, spacing) => !blocked.some((r) => inRect(x, z, r, 1)) && !nearPath(x, z, 3.4) && !fixtures.some((r) => inRect(x, z, r, 1.6)) && !out.some((t) => Math.hypot(t.x - x, t.z - z) < spacing);
  const candidates = [];
  for (let x = 266; x <= 308; x += 7) for (const s of [-1, 1]) candidates.push([x, ACADEMY_AXIS_Z + s * 5.6, 5]);           // the avenue
  for (let x = 274; x <= 406; x += 9) candidates.push([x, -31.5, 7], [x, 135.5, 7], [x, -40, 7], [x, 144, 7]);              // inside the loop
  for (let z = -28; z <= 132; z += 9) candidates.push([272.5, z, 7], [263.5, z, 7], [407.5, z, 7], [416, z, 7]);
  for (const [x, z] of [[360, 92], [372, 100], [386, 90], [398, 104], [366, 118], [384, 124], [400, 120], [362, 6], [376, -4], [392, 8], [404, -10], [370, -20], [388, -24]]) candidates.push([x, z, 6.5]); // groves east of the quad
  for (const [x, z] of [[280, 122], [296, 128], [312, 120], [330, 126], [348, 122], [282, -24], [300, -28], [336, -26], [350, -20]]) candidates.push([x, z, 6.5]);
  for (let x = 268; x <= 412; x += 12) for (let z = -138; z <= -54; z += 12) if (((x * 7 + z * 3) & 7) < 4) candidates.push([x + ((z & 4) ? 3 : 0), z, 7]); // groves on the Green
  for (const [x, z, spacing] of candidates) if ((inRect(x, z, ACADEMY) || inRect(x, z, ACADEMY_GREEN)) && ok(x, z, spacing)) out.push(Object.freeze({ id: `academy-tree-${out.length}`, x, z }));
  return out;
}

// Render chunks: each is visible while the player is anywhere in its area (city-expansion shows a chunk
// within activeRadius + 0.35 x radius of its centre; the mobile active radius is 60 m).
export const ACADEMY_CHUNKS = Object.freeze([
  { id: 'academy-north', area: Object.freeze({ minX: ACADEMY.minX, maxX: ACADEMY.maxX, minZ: 60, maxZ: ACADEMY.maxZ }) },
  { id: 'academy-south', area: Object.freeze({ minX: ACADEMY.minX, maxX: ACADEMY.maxX, minZ: ACADEMY.minZ, maxZ: 60 }) },
  { id: 'academy-library', area: Object.freeze({ minX: LIBRARY.x - LIBRARY.width / 2 - 8, maxX: LIBRARY.x + LIBRARY.width / 2, minZ: LIBRARY.z - LIBRARY.depth / 2, maxZ: LIBRARY.z + LIBRARY.depth / 2 }), landmark: 110 },
  { id: 'academy-green', area: ACADEMY_GREEN },
].map((c) => {
  const a = c.area, center = { x: (a.minX + a.maxX) / 2, z: (a.minZ + a.maxZ) / 2 }, far = Math.hypot((a.maxX - a.minX) / 2, (a.maxZ - a.minZ) / 2);
  return Object.freeze({ ...c, center: Object.freeze(center), radius: Math.max(c.landmark || 0, Math.ceil((far + 12 - 60) / 0.35)) });
}));
export const academyChunkFor = (x, z) => (inRect(x, z, ACADEMY_CHUNKS[2].area) ? 'academy-library' : z < ACADEMY.minZ - 2 ? 'academy-green' : z >= 60 ? 'academy-north' : 'academy-south');

// ------------------------------------------------------------------ the Library interior
// Like the other interiors it sits high above the city (40, 55, 70, 85, 115 m), here at 130 m, over
// the building's own footprint. The door is on the west wall, on the axis. A double-height reading
// room under a skylight, a gallery (mezzanine) along the north wall up a grand stair, the guide
// lecterns, a media wall, a fireplace lounge, and a glass-walled Testing Room.
export const LIBRARY_INTERIOR_Y = 130;
const r2 = (v) => Math.round(v * 100) / 100;
export function libraryInterior() {
  const y = LIBRARY_INTERIOR_Y, minX = LIBRARY_FRONT + 3, maxX = minX + 34, minZ = LIBRARY.z - 17, maxZ = LIBRARY.z + 17;
  const gallery = { minX, maxX, minZ: maxZ - 5.5, maxZ, top: 4.2, slab: 0.25 };
  const stair = { minX: minX + 1.2, maxX: minX + 3.4, z0: gallery.minZ - 21 * 0.3, z1: gallery.minZ, rise: 0.2, steps: 21 };
  const testing = { minX: maxX - 9, maxX, minZ, maxZ: minZ + 8.5, doorX0: maxX - 8.2, doorX1: maxX - 6.6, wall: 0.12 };
  // `stand` (offset dx, dz): where a reader stands to use it, facing it
  const stations = [
    // book lecterns either side of the centre aisle; the media wall lectern; the gallery's ebook nook; the Testing Room desks; the front desk
    { id: 'defi-guide', kind: 'book', x: minX + 8, z: LIBRARY.z + 5, stand: [-1, 0] },
    { id: 'operator-guide', kind: 'book', x: minX + 8, z: LIBRARY.z - 5, stand: [-1, 0] },
    { id: 'intro-series', kind: 'media', x: maxX - 3.4, z: LIBRARY.z, stand: [-1.2, 0] },
    { id: 'ebook', kind: 'media', x: minX + 21, z: gallery.maxZ - 2.2, y: gallery.top, stand: [0, -1.1] },
    { id: 'defi-exam', kind: 'exam', x: testing.minX + 2.6, z: minZ + 2.2, stand: [0, 1] },
    { id: 'operator-exam', kind: 'exam', x: testing.minX + 6.2, z: minZ + 2.2, stand: [0, 1] },
    { id: 'directory', kind: 'directory', x: minX + 3.4, z: LIBRARY.z - 3.6, stand: [0, 1.1] },
  ].map((s) => {
    const sy = y + (s.y || 0);
    return Object.freeze({ ...s, y: sy, stand: Object.freeze({ x: r2(s.x + s.stand[0]), y: sy, z: r2(s.z + s.stand[1]) }) });
  });
  return Object.freeze({
    y, height: 9.5, minX, maxX, minZ, maxZ, doorZ: LIBRARY.z, doorWidth: 2.4,
    gallery: Object.freeze(gallery), stair: Object.freeze(stair), testing: Object.freeze(testing), stations: Object.freeze(stations),
    tables: Object.freeze([-3.4, 3.4].map((dz) => Object.freeze({ x: minX + 18, z: LIBRARY.z + dz, length: 10, width: 1.4, height: 0.76 }))),
    fireplace: Object.freeze({ x: minX + 18, z: minZ + 0.5, width: 3.6 }),
    skylight: Object.freeze({ x: minX + 18, z: LIBRARY.z, radius: 5 }),
  });
}

// The server space: the door on the landing at the top of the front stairs (1.2 m up), the reading
// room inside it, both levels included in its bounds. A safe zone, like every interior.
export function librarySpace(L = libraryInterior()) {
  const landing = LIBRARY_STAIRS.height;
  return {
    id: LIBRARY.id, layer: 1, safeZone: true,
    entry: { x: r2(LIBRARY_FRONT - 1.4), y: landing, z: LIBRARY.z }, inside: { x: r2(L.minX + 1.6), y: L.y, z: LIBRARY.z },
    exit: { x: r2(L.minX + 1.0), y: L.y, z: LIBRARY.z }, outside: { x: r2(LIBRARY_FRONT - 1.3), y: landing, z: LIBRARY.z },
    bounds: { minX: r2(L.minX + 0.2), maxX: r2(L.maxX - 0.2), minY: L.y - 1, maxY: L.y + L.gallery.top + 5, minZ: r2(L.minZ + 0.2), maxZ: r2(L.maxZ - 0.2) },
  };
}

// Points of interest on the campus (markers and waypoints on the city map).
export function academyPois() {
  // like City Hall, waypoints lead to the foot of the front stairs (the door is on the landing above them)
  return [
    { id: LIBRARY.id, name: LIBRARY.name, kind: 'library', status: 'open', x: LIBRARY.x, z: LIBRARY.z, entry: { x: LIBRARY_FOOT, z: LIBRARY.z }, approach: [{ x: LIBRARY_FOOT - 1.6, z: LIBRARY.z }], description: 'Up the front stairs: the guides, practice exams, the intro series and the ebook. Safe zone.' },
    { id: ACADEMY.id, name: ACADEMY.name, kind: 'campus', status: 'open', x: (QUAD.minX + QUAD.maxX) / 2, z: ACADEMY_AXIS_Z, entry: { x: ACADEMY_GATE.x - 1.5, z: ACADEMY_AXIS_Z }, description: 'The Academy campus: the quad, the halls, the clock tower, and the Library.' },
  ];
}
