import { CIVIC_STAIRS, flightDepth } from './entry-steps.js';
// M7.1A Nerdie Central Park and the Civic Center (approved Layout A). Pure (no Three.js): the city
// plan, the client (city-park.js), resident navigation, the map, and the tests all read it.
//
// The park fills the northeast block, x 120..244, z 55..148 (124 x 93 m). The dead-end east
// section of North Market (x > 118) and the Hood duplicate's stub north of North Cross were
// removed to free it. City Hall stands on the civic block west of the Hood, x -81..-43,
// z -42..42 (38 x 84 m), freed by removing the central cross street's dead-end stub (x -83..-43).
// Measurements are real-world: youth/softball baseball (18.3 m bases, 61 m fences), FIBA basketball
// (28 x 15 m), 7v7 football (27.4 x 64 m including end zones).

export const PARK = Object.freeze({ id: 'central-park', name: 'Nerdie Central Park', minX: 120, maxX: 244, minZ: 55, maxZ: 148 });
// (east edge stops at the Hood garages, which reach x -43.4)
export const CIVIC_BLOCK = Object.freeze({ id: 'civic-center', name: 'Civic Center', minX: -81, maxX: -43.5, minZ: -42, maxZ: 42 });
export const PATH_WIDTH = 3;

// Buildings (they join the city plan's districts, so they get colliders, server structures, and nav obstacles).
export const CITY_HALL = Object.freeze({ id: 'city-hall', name: 'Nerdie City Hall', kind: 'civic', facing: 'west', fixedFront: 'west', x: -56, z: 0, width: 20, depth: 40, height: 12 });
export const PARK_PAVILION = Object.freeze({ id: 'park-pavilion', name: 'Park Pavilion', kind: 'pavilion', fixedFront: 'west', x: 219, z: 62, width: 8, depth: 6, height: 3.8 });
export const PARK_BLEACHERS = Object.freeze({ id: 'park-bleachers', name: 'Football Bleachers', kind: 'bleachers', fixedFront: 'east', x: 199.75, z: 112, width: 4.5, depth: 36, height: 2.6 });

// Sports facilities.
export const BASEBALL = Object.freeze({ home: Object.freeze({ x: 130, z: 139 }), fence: 61, bases: 18.3, mound: 13.1, fair: Object.freeze({ minX: 130, maxX: 191, minZ: 78, maxZ: 139 }),
  backstop: Object.freeze([Object.freeze({ minX: 125.6, maxX: 138, minZ: 142.8, maxZ: 143.2 }), Object.freeze({ minX: 125.6, maxX: 126, minZ: 131, maxZ: 143.2 })]) });
// fair territory runs toward +x (first-base line) and -z (third-base line) from home plate
export const COURTS = Object.freeze([
  Object.freeze({ id: 'court-1', minX: 125, maxX: 155, minZ: 59, maxZ: 76 }),
  Object.freeze({ id: 'court-2', minX: 158, maxX: 188, minZ: 59, maxZ: 76 }),
].map((c) => Object.freeze({ ...c, playMinX: c.minX + 1, playMaxX: c.maxX - 1, playMinZ: c.minZ + 1, playMaxZ: c.maxZ - 1 })));
export const FOOTBALL = Object.freeze({ minX: 205, maxX: 232.4, minZ: 80, maxZ: 144, endZone: 9.1 });

// Paths: axis-aligned centre lines (they join the resident walk graph). The jogging loop runs inside
// the park's edge; the promenade crosses from the North Cross sidewalk (z 54) to the loop's north side;
// the entrance continues North Market's centre line (z 96) into the park.
export const PARK_PATHS = Object.freeze([
  { id: 'park-loop-south', axis: 'z', c: 57, a0: 122, a1: 242, kind: 'jog' },
  { id: 'park-loop-north', axis: 'z', c: 146, a0: 122, a1: 242, kind: 'jog' },
  { id: 'park-loop-west', axis: 'x', c: 122, a0: 57, a1: 146, kind: 'jog' },
  { id: 'park-loop-east', axis: 'x', c: 242, a0: 57, a1: 146, kind: 'jog' },
  { id: 'park-promenade', axis: 'x', c: 193.5, a0: 54, a1: 146, kind: 'walk' },
  { id: 'park-entrance', axis: 'z', c: 96, a0: 118, a1: 122, kind: 'walk' },
  { id: 'park-service', axis: 'z', c: 77.5, a0: 193.5, a1: 242, kind: 'walk' },
].map((p) => Object.freeze(p)));
// City Hall plaza: two walks either side of the fountain from the West Avenue sidewalk to the doors.
// M7.1B: the walks meet at the foot of City Hall's front stairs (0.6 m clear of the bottom tread)
const HALL_FOOT = +(CITY_HALL.x - CITY_HALL.width / 2 - flightDepth(CIVIC_STAIRS) - 0.6).toFixed(2);
export const CIVIC_PATHS = Object.freeze([
  { id: 'civic-walk-south', axis: 'z', c: -5, a0: -82, a1: HALL_FOOT, kind: 'walk' },
  { id: 'civic-walk-north', axis: 'z', c: 5, a0: -82, a1: HALL_FOOT, kind: 'walk' },
  { id: 'civic-front', axis: 'x', c: HALL_FOOT, a0: -5, a1: 5, kind: 'walk' },
].map((p) => Object.freeze(p)));
export const CITY_HALL_ENTRY = Object.freeze({ x: HALL_FOOT, z: 0, facing: 'west' });

// Eight chess tables in the plaza by the promenade; each seat is a future interaction point
// (players and residents sit facing each other along x). Spectators stand within 2.5 m.
export const CHESS_PLAZA = Object.freeze({ minX: 197, maxX: 213, minZ: 59, maxZ: 75 });
export const CHESS_TABLES = Object.freeze([199.75, 203.25, 206.75, 210.25].flatMap((x) => [63, 71].map((z) => [x, z])).map(([x, z], i) => Object.freeze({
  id: `chess-${i + 1}`, x, z, size: 0.9, height: 0.76, interactRadius: 1.2, spectatorRadius: 2.5,
  // each stool is a fixture; `stand` is the open spot beside it (toward the centre aisle) a player or resident walks to before sitting
  seats: Object.freeze([['white', -1, 1], ['black', 1, -1]].map(([side, s, faceX]) => Object.freeze({ side, x: x + s * 1.05, z, faceX, stand: Object.freeze({ x: x + s * 1.05, z: z + (z < 67 ? 0.85 : -0.85) }) }))),
})));

// Walk-only lines (the plaza is already paved): the centre aisle between the two rows of tables,
// joined to the promenade, so every stand point is a short step from the resident walk graph.
export const CHESS_AISLES = Object.freeze([Object.freeze({ id: 'chess-aisle', axis: 'z', c: 67, a0: 193.5, a1: CHESS_PLAZA.maxX })]);

export const PICNIC_TABLES = Object.freeze([228, 233, 238].flatMap((x) => [62, 70].map((z) => Object.freeze({ id: `picnic-${x}-${z}`, x, z, width: 1.8, depth: 1.6 }))));
export const HOOPS = Object.freeze(COURTS.flatMap((c) => [1, -1].map((s) => Object.freeze({ id: `${c.id}-hoop-${s > 0 ? 'w' : 'e'}`, x: s > 0 ? c.playMinX + 1.2 : c.playMaxX - 1.2, z: (c.minZ + c.maxZ) / 2, faceX: s }))));
export const GOALPOSTS = Object.freeze([FOOTBALL.minZ, FOOTBALL.maxZ].map((z, i) => Object.freeze({ id: `goalpost-${i ? 'n' : 's'}`, x: (FOOTBALL.minX + FOOTBALL.maxX) / 2, z, faceZ: i ? -1 : 1 })));
export const CIVIC_FIXTURES = Object.freeze({
  fountain: Object.freeze({ x: -74, z: 0, radius: 3 }),
  flagpoles: Object.freeze([-6, 0, 6].map((z) => Object.freeze({ x: -79.5, z }))),
  plaza: Object.freeze({ minX: -81, maxX: -66, minZ: -18, maxZ: 18 }),
});

const rect = (x, z, w, d, extra = {}) => Object.freeze({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, ...extra });
const inRect = (x, z, r, pad = 0) => x > r.minX - pad && x < r.maxX + pad && z > r.minZ - pad && z < r.maxZ + pad;
const nearPath = (x, z, paths, clear) => paths.some((p) => (p.axis === 'x' ? Math.abs(x - p.c) < clear && z > p.a0 - clear && z < p.a1 + clear : Math.abs(z - p.c) < clear && x > p.a0 - clear && x < p.a1 + clear));

// Benches along the promenade and the loop, 2.6 m from the path centre (clear of the walk line).
export const PARK_BENCHES = Object.freeze((() => {
  const out = [];
  for (let z = 86; z <= 140; z += 13) out.push({ id: `bench-prom-${z}`, x: 193.5 + (out.length % 2 ? 2.6 : -2.6), z, alongZ: true });
  for (let x = 134; x <= 236; x += 17) if (!(x > 190 && x < 197)) out.push({ id: `bench-loop-n-${x}`, x, z: 146 - 2.6, alongZ: false });
  return out.map((b) => Object.freeze(b));
})());
// Lamp posts along the promenade and the loop (emissive heads; they follow the city's night level).
export const PARK_LAMPS = Object.freeze((() => {
  const out = [];
  for (let z = 64; z <= 140; z += 19) out.push({ x: 193.5 + 2.3, z });
  for (const z of [57, 146]) for (let x = 140; x <= 232; x += 23) if (Math.abs(x - 193.5) > 4) out.push({ x, z: z + (z < 100 ? 2.3 : -2.3) });
  for (const x of [122, 242]) for (let z = 75; z <= 130; z += 27) out.push({ x: x + (x < 200 ? 2.3 : -2.3), z });
  return out.map((l, i) => Object.freeze({ id: `park-lamp-${i}`, ...l }));
})());

// Every solid thing a player bumps into and a resident walks around (rectangles, x/z).
export function parkFixtures() {
  const out = [];
  for (const t of CHESS_TABLES) { out.push(rect(t.x, t.z, t.size, t.size, { id: t.id, kind: 'chess-table', height: t.height })); for (const s of t.seats) out.push(rect(s.x, s.z, 0.45, 0.45, { id: `${t.id}-${s.side}-seat`, kind: 'stool', height: 0.46 })); }
  for (const p of PICNIC_TABLES) out.push(rect(p.x, p.z, p.width, p.depth, { id: p.id, kind: 'picnic', height: 0.75 }));
  for (const b of PARK_BENCHES) out.push(rect(b.x, b.z, b.alongZ ? 0.6 : 1.8, b.alongZ ? 1.8 : 0.6, { id: b.id, kind: 'bench', height: 0.85 }));
  for (const h of HOOPS) out.push(rect(h.x - h.faceX * 1.2, h.z, 0.3, 0.3, { id: h.id, kind: 'hoop-pole', height: 3.9 }));
  for (const g of GOALPOSTS) for (const s of [-1, 1]) out.push(rect(g.x + s * 2.8, g.z, 0.2, 0.2, { id: `${g.id}-${s < 0 ? 'l' : 'r'}`, kind: 'goalpost', height: 6 }));
  for (const [i, b] of BASEBALL.backstop.entries()) out.push(Object.freeze({ ...b, id: `backstop-${i}`, kind: 'backstop', height: 4 }));
  for (const l of PARK_LAMPS) out.push(rect(l.x, l.z, 0.24, 0.24, { id: l.id, kind: 'lamp', height: 4.2 }));
  const f = CIVIC_FIXTURES.fountain; out.push(rect(f.x, f.z, f.radius * 2, f.radius * 2, { id: 'civic-fountain', kind: 'fountain', height: 0.8 }));
  for (const [i, p] of CIVIC_FIXTURES.flagpoles.entries()) out.push(rect(p.x, p.z, 0.2, 0.2, { id: `civic-flagpole-${i}`, kind: 'flagpole', height: 9 }));
  return out;
}
// Playing surfaces residents keep off for now (future activities will lead them on deliberately).
export function parkSoftZones() {
  return [Object.freeze({ ...BASEBALL.fair, id: 'baseball-field' }), ...COURTS.map((c) => Object.freeze({ minX: c.minX, maxX: c.maxX, minZ: c.minZ, maxZ: c.maxZ, id: c.id })), Object.freeze({ minX: FOOTBALL.minX, maxX: FOOTBALL.maxX, minZ: FOOTBALL.minZ, maxZ: FOOTBALL.maxZ, id: 'football-field' })];
}

// Trees: rows inside the loop and groves by the picnic area and the civic gardens, kept clear of
// paths (4 m), fields, courts, the plaza, buildings, and fixtures.
export function parkTrees() {
  const blocked = [...parkSoftZones(), CHESS_PLAZA, rect(PARK_PAVILION.x, PARK_PAVILION.z, PARK_PAVILION.width + 2, PARK_PAVILION.depth + 2), rect(PARK_BLEACHERS.x, PARK_BLEACHERS.z, PARK_BLEACHERS.width + 2, PARK_BLEACHERS.depth + 2),
    rect(CITY_HALL.x, CITY_HALL.z, CITY_HALL.width + 4, CITY_HALL.depth + 4), CIVIC_FIXTURES.plaza, Object.freeze({ minX: BASEBALL.home.x - 8, maxX: BASEBALL.home.x + 4, minZ: BASEBALL.home.z - 4, maxZ: BASEBALL.home.z + 6 })];
  const fixtures = parkFixtures(), paths = [...PARK_PATHS, ...CIVIC_PATHS], out = [];
  const ok = (x, z) => !blocked.some((r) => inRect(x, z, r, 1.5)) && !nearPath(x, z, paths, 4) && !fixtures.some((r) => inRect(x, z, r, 1.6)) && !out.some((t) => Math.hypot(t.x - x, t.z - z) < 6.5);
  const candidates = [];
  for (let x = 128; x <= 238; x += 7.5) candidates.push([x, 61.5], [x, 141.5]);
  for (let z = 64; z <= 138; z += 7.5) candidates.push([126.5, z], [237.5, z], [189, z]);
  for (const [x, z] of [[214, 70], [221, 72], [236, 76], [225, 77], [204, 84], [212, 88]]) candidates.push([x, z]);
  for (const sz of [-1, 1]) for (let x = -78; x <= -47; x += 7) for (const dz of [26, 35]) candidates.push([x, sz * dz]);
  for (const [x, z] of candidates) if ((inRect(x, z, PARK) || inRect(x, z, CIVIC_BLOCK)) && ok(x, z)) out.push(Object.freeze({ id: `tree-${out.length}`, x, z }));
  return out;
}

// Future resident activities (M7.2C and later): every reservable spot in the park and civic plaza.
export function activitySlots() {
  const slots = [];
  for (const t of CHESS_TABLES) for (const s of t.seats) slots.push({ id: `${t.id}:${s.side}`, kind: 'chess-seat', x: s.x, z: s.z, faceX: s.faceX, table: t.id, stand: s.stand });
  for (const b of PARK_BENCHES) for (const k of [-0.5, 0.5]) slots.push({ id: `${b.id}:${k}`, kind: 'bench-seat', x: b.x + (b.alongZ ? 0 : k), z: b.z + (b.alongZ ? k : 0) });
  for (let row = 0; row < 3; row++) for (let i = 0; i < 12; i++) slots.push({ id: `bleachers:${row}:${i}`, kind: 'bleacher-seat', x: PARK_BLEACHERS.x - 1.4 + row * 1.4, y: 0.6 + row * 0.7, z: PARK_BLEACHERS.z - 16.5 + i * 3, faceX: 1 });
  for (const p of PICNIC_TABLES) for (const dz of [-0.7, 0.7]) for (const dx of [-0.5, 0.5]) slots.push({ id: `${p.id}:${dx}:${dz}`, kind: 'picnic-seat', x: p.x + dx, z: p.z + dz });
  for (const c of COURTS) for (let i = 0; i < 4; i++) slots.push({ id: `${c.id}:spot-${i}`, kind: 'court-spot', x: c.playMinX + 5 + i * 6, z: (c.minZ + c.maxZ) / 2 + (i % 2 ? 3 : -3) });
  const loop = PARK_PATHS.filter((p) => p.kind === 'jog');
  for (const p of loop) for (let a = p.a0; a <= p.a1; a += 12) slots.push({ id: `${p.id}:${a}`, kind: 'jog-waypoint', x: p.axis === 'x' ? p.c : a, z: p.axis === 'x' ? a : p.c });
  return slots.map((s) => Object.freeze(s));
}
