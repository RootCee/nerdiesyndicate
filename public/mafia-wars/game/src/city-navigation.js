// M6.6 pedestrian route planning. Routes follow the sidewalks that
// city-expansion.js builds beside every road (crossing roads where sidewalk
// lines meet, which is where the road paint puts crosswalks), the original
// neighbourhood alleys, and short validated approaches to building entrances.
// Obstacles mirror the world geometry: city-plan buildings, vehicles, street
// lights, venue/apartment/house shells, and the neighbourhood blocks from
// world.js (houses, backyard and alley fences, lamps). Pure math, no Three.js,
// so Node tests can check every route against the same obstacles.
import { cityGroundLayout } from './city-ground-layout.js';
import { showcaseFurniture } from './city-showcase-layout.js';
import { CHESS_AISLES, CIVIC_PATHS, PARK_PATHS, parkFixtures, parkSoftZones } from './city-park-layout.js';
import { createCityPlan } from './city-layout.js';

// Mirrors world.js: ROAD_HALF 4.5, SIDEWALK 2, LOT 8, HOUSE_FRONT 14,
// HOUSE_DEPTH 10, ALLEY_X 35.5; lots run z -40..40 inside the ±43 x block.
const BLOCK = Object.freeze({ halfX: 43, lotZ: 40, streetHalf: 6.5, houseFront: 14, houseBack: 24, alley: 35.5, alleyHalf: 2, lot: 8, firstLot: -40, lots: 10 });
const PAD = 0.3, MAX_CONNECTOR = 35, SHORT_DIAGONAL = 4, SNAP_DISTANCE = 10, ROAD_COST = 1.15, STEP = 8;

const rect = (minX, minZ, maxX, maxZ, extra = {}) => ({ minX, minZ, maxX, maxZ, ...extra });
const around = (x, z, width, depth, extra) => rect(x - width / 2, z - depth / 2, x + width / 2, z + depth / 2, extra);

function neighbourhoodObstacles(centerX) {
  const out = [];
  for (const s of [-1, 1]) {
    const x0 = centerX + s * BLOCK.streetHalf, x1 = centerX + s * (BLOCK.alley - BLOCK.alleyHalf);
    const x2 = centerX + s * (BLOCK.alley + BLOCK.alleyHalf), x3 = centerX + s * BLOCK.halfX;
    // Soft bands: private lots. Routes never run through them; only a door's
    // own walkway may cross its front yard (see connect()).
    out.push(rect(Math.min(x0, x1), -BLOCK.lotZ - 0.5, Math.max(x0, x1), BLOCK.lotZ + 0.5, { soft: true }));
    out.push(rect(Math.min(x2, x3), -BLOCK.lotZ - 0.5, Math.max(x2, x3), BLOCK.lotZ + 0.5, { soft: true }));
    // Hard: each house (front to back wall, 6.2 m wide on its lot), the garage
    // slot beyond the alley, backyard side fences, alley fences (each lot's has
    // a 2 m gate in the middle), lamps, and utility poles.
    for (let i = 0; i < BLOCK.lots; i++) {
      const zc = BLOCK.firstLot + i * BLOCK.lot + BLOCK.lot / 2;
      const hf = centerX + s * BLOCK.houseFront, hb = centerX + s * BLOCK.houseBack;
      out.push(rect(Math.min(hf, hb), zc - 3.1, Math.max(hf, hb), zc + 3.1));
      const g0 = centerX + s * 37.8, g1 = centerX + s * 43.4;
      out.push(rect(Math.min(g0, g1), zc - 3.5, Math.max(g0, g1), zc + 3.5));
    }
    for (let i = 0; i <= BLOCK.lots; i++) {
      const z = BLOCK.firstLot + i * BLOCK.lot, a = centerX + s * (BLOCK.houseBack - 0.2), b = centerX + s * (BLOCK.alley - 2.2);
      out.push(rect(Math.min(a, b), z - 0.12, Math.max(a, b), z + 0.12));
    }
    for (let i = 0; i < BLOCK.lots; i++) {
      const z0 = BLOCK.firstLot + i * BLOCK.lot, gx = centerX + s * (BLOCK.alley - 2.2);
      out.push(rect(gx - 0.12, z0, gx + 0.12, z0 + 3), rect(gx - 0.12, z0 + BLOCK.lot - 3, gx + 0.12, z0 + BLOCK.lot));
    }
    for (const z of s < 0 ? [-36, -12, 12, 36] : [-24, 0, 24]) out.push(around(centerX + s * 6.1, z, 0.3, 0.3));
    for (let z = -44; z <= 44; z += 22) out.push(around(centerX + s * (BLOCK.alley + 2.3), z, 0.3, 0.3));
  }
  return out;
}

export function buildNavObstacles(plan = createCityPlan()) {
  const out = [];
  for (const district of plan.districts) {
    for (const b of district.buildings) out.push(around(b.x, b.z, b.width, b.depth, { id: b.id }));
    for (const v of district.vehicles || []) out.push(around(v.x, v.z, 1.9, 4.2));
  }
  // M7.0A: the streetlight poles city-expansion.js draws (and collides with), from the shared ground layout
  const ground = cityGroundLayout(plan);
  for (const l of ground.streetlights) out.push(around(l.x, l.z, 0.3, 0.3, { id: l.id }));
  // M7.0B1: the North Market showcase's street furniture (trees at the curb, forecourt planters and benches)
  for (const f of showcaseFurniture(plan, ground)) out.push(around(f.x, f.z, f.width, f.depth, { id: f.id }));
  // M7.1A: Central Park and the City Hall plaza: tables, benches, hoops, goalposts, lamps, the fountain;
  // the playing fields are soft zones residents keep off until park activities lead them on
  for (const f of parkFixtures()) out.push(rect(f.minX, f.minZ, f.maxX, f.maxZ, { id: f.id }));
  for (const z of parkSoftZones()) out.push(rect(z.minX, z.minZ, z.maxX, z.maxZ, { id: z.id, soft: true }));
  const { apartment, combatVenue, enterableHouse, duplicatedEnterableHouse } = plan;
  out.push(around(apartment.x, apartment.z, apartment.width, apartment.depth, { id: apartment.id }));
  out.push(around(combatVenue.x, combatVenue.z, combatVenue.width, combatVenue.depth, { id: combatVenue.id }));
  out.push(around(enterableHouse.x, enterableHouse.z, enterableHouse.width, enterableHouse.depth, { id: enterableHouse.id }));
  out.push(around(duplicatedEnterableHouse.x, duplicatedEnterableHouse.z, duplicatedEnterableHouse.width, duplicatedEnterableHouse.depth, { id: duplicatedEnterableHouse.id }));
  // world.js kit house (6.2 x 10 m, 2.4 m porch) turned to face south (-z), plus margin.
  for (const site of plan.originalExpansionHouses) out.push(around(site.x, site.z - 1.1, 7.2, 13, { id: site.id }));
  out.push(...neighbourhoodObstacles(0), ...neighbourhoodObstacles(plan.duplicatedOriginalNeighborhood.centerX));
  return out;
}

const inside = (p, r, pad = 0) => p.x > r.minX - pad && p.x < r.maxX + pad && p.z > r.minZ - pad && p.z < r.maxZ + pad;

// Slab test: does segment a→b pass through rectangle r grown by pad?
export function segmentHitsRect(a, b, r, pad = PAD) {
  let t0 = 0, t1 = 1;
  const d = { x: b.x - a.x, z: b.z - a.z };
  for (const [axis, lo, hi] of [['x', r.minX - pad, r.maxX + pad], ['z', r.minZ - pad, r.maxZ + pad]]) {
    if (Math.abs(d[axis]) < 1e-9) { if (a[axis] <= lo || a[axis] >= hi) return false; continue; }
    let u0 = (lo - a[axis]) / d[axis], u1 = (hi - a[axis]) / d[axis];
    if (u0 > u1) [u0, u1] = [u1, u0];
    t0 = Math.max(t0, u0); t1 = Math.min(t1, u1);
    if (t0 >= t1) return false;
  }
  return true;
}
export const segmentClear = (a, b, obstacles, { pad = PAD, ignore = () => false } = {}) => !obstacles.some((r) => !ignore(r) && segmentHitsRect(a, b, r, pad));
export const inSoftZone = (p, obstacles) => obstacles.some((r) => r.soft && inside(p, r));
export const insideObstacle = (p, obstacles, pad = 0) => obstacles.some((r) => !r.soft && inside(p, r, pad));

// Walk lines: two sidewalk centre lines per road plus three lines on the road
// itself (centre and both lane middles: there is no traffic, and some parked
// cars or legacy buildings sit on a sidewalk or half the road), alleys as one centre line, plus the original neighbourhood's
// alleys, which only world.js builds. Road lines cost a little more so routes
// keep to sidewalks wherever those are clear.
export function walkLines(plan = createCityPlan()) {
  const lines = [];
  const add = (axis, c, a0, a1, id, cost = 1, road = id) => lines.push({ axis, c, a0, a1, id, cost, road });
  for (const road of plan.roads) {
    const vertical = road.depth > road.width, half = (vertical ? road.width : road.depth) / 2, span = (vertical ? road.depth : road.width) / 2;
    const c = vertical ? road.x : road.z, mid = vertical ? road.z : road.x;
    if (half <= 2) add(vertical ? 'x' : 'z', c, mid - span, mid + span, road.id);
    else {
      for (const s of [-1, 1]) add(vertical ? 'x' : 'z', c + s * (half + 1), mid - span, mid + span, `${road.id}:${s}`, 1, road.id);
      for (const offset of [-half / 2, 0, half / 2]) add(vertical ? 'x' : 'z', c + offset, mid - span, mid + span, `${road.id}:road:${offset}`, ROAD_COST, road.id);
    }
  }
  for (const s of [-1, 1]) add('x', s * BLOCK.alley, -45, 45, `original-alley:${s}`);
  // M7.1A: Central Park's paths, the chess plaza aisle and the City Hall plaza walks
  for (const p of [...PARK_PATHS, ...CIVIC_PATHS, ...CHESS_AISLES]) add(p.axis, p.c, p.a0, p.a1, p.id);
  return lines;
}

export function buildNavGraph(plan = createCityPlan(), obstacles = buildNavObstacles(plan)) {
  const nodes = [], keyToId = new Map(), adjacency = [], edges = [];
  const node = (x, z) => {
    const key = `${x.toFixed(2)},${z.toFixed(2)}`;
    if (!keyToId.has(key)) { keyToId.set(key, nodes.length); nodes.push({ x, z }); adjacency.push([]); }
    return keyToId.get(key);
  };
  const lines = walkLines(plan);
  for (const line of lines) {
    // Stops: line ends, every crossing line, and an 8 m grid shared by the
    // three lines of a road so a blocked stretch only removes that piece.
    const stops = new Set([line.a0, line.a1]);
    for (let a = Math.ceil(line.a0 / STEP) * STEP; a < line.a1; a += STEP) stops.add(a);
    for (const other of lines) {
      if (other.axis === line.axis) continue;
      if (other.c >= line.a0 && other.c <= line.a1 && line.c >= other.a0 && line.c <= other.a1) stops.add(other.c);
    }
    const sorted = [...stops].sort((a, b) => a - b);
    for (let i = 0; i + 1 < sorted.length; i++) {
      const a = line.axis === 'x' ? { x: line.c, z: sorted[i] } : { x: sorted[i], z: line.c };
      const b = line.axis === 'x' ? { x: line.c, z: sorted[i + 1] } : { x: sorted[i + 1], z: line.c };
      if (!segmentClear(a, b, obstacles)) continue; // blocked: no edge, so no route through it
      const ia = node(a.x, a.z), ib = node(b.x, b.z), length = Math.hypot(b.x - a.x, b.z - a.z) * line.cost;
      adjacency[ia].push({ to: ib, length }); adjacency[ib].push({ to: ia, length }); edges.push([ia, ib, line.cost]);
    }
  }
  // Step sideways between neighbouring lines of the same road (sidewalk, lane,
  // centre, lane, sidewalk) at the shared grid stops.
  const byRoad = new Map();
  for (const line of lines) (byRoad.get(line.road) || byRoad.set(line.road, []).get(line.road)).push(line);
  for (const group of byRoad.values()) {
    group.sort((a, b) => a.c - b.c);
    for (let k = 0; k + 1 < group.length; k++) {
      const left = group[k], right = group[k + 1];
      for (let a = Math.ceil(left.a0 / STEP) * STEP; a < left.a1; a += STEP) {
        const pa = left.axis === 'x' ? { x: left.c, z: a } : { x: a, z: left.c }, pb = left.axis === 'x' ? { x: right.c, z: a } : { x: a, z: right.c };
        const ia = keyToId.get(`${pa.x.toFixed(2)},${pa.z.toFixed(2)}`), ib = keyToId.get(`${pb.x.toFixed(2)},${pb.z.toFixed(2)}`);
        if (ia === undefined || ib === undefined || !segmentClear(pa, pb, obstacles)) continue;
        const length = Math.hypot(pb.x - pa.x, pb.z - pa.z) * ROAD_COST;
        adjacency[ia].push({ to: ib, length }); adjacency[ib].push({ to: ia, length }); edges.push([ia, ib, ROAD_COST]);
      }
    }
  }
  return { nodes, adjacency, edges, obstacles, bounds: plan.bounds, blockCenters: [0, plan.duplicatedOriginalNeighborhood.centerX] };
}

// Leaving (or reaching) a point inside a neighbourhood lot, using only gaps
// world.js guarantees: the front walkway gate, the 0.6 m gap where neighbouring
// front fences meet on a lot boundary, the gap between houses, and each
// backyard's alley gate. Returns candidate leg lists to the street (the plain
// exit first, then 1.2 m sidesteps along the sidewalk edge for when a lamp
// stands where the gap meets the sidewalk), or null when p is not in a lot.
export function lotExits(p, centerXs = [0]) {
  for (const cx of centerXs) {
    const s = p.x < cx ? -1 : 1, u = s * (p.x - cx);
    if (u <= BLOCK.streetHalf || u >= BLOCK.halfX || Math.abs(p.z) > BLOCK.lotZ) continue;
    const i = Math.min(BLOCK.lots - 1, Math.max(0, Math.floor((p.z - BLOCK.firstLot) / BLOCK.lot)));
    const zc = BLOCK.firstLot + i * BLOCK.lot + BLOCK.lot / 2, boundary = Math.round((p.z - BLOCK.firstLot) / BLOCK.lot) * BLOCK.lot + BLOCK.firstLot;
    const sidewalk = cx + s * (BLOCK.streetHalf - 1), alley = cx + s * BLOCK.alley, kerb = cx + s * (BLOCK.streetHalf + 0.5);
    const start = { x: p.x, z: p.z };
    if (u > BLOCK.alley - BLOCK.alleyHalf && u < BLOCK.alley + BLOCK.alleyHalf) return null; // in the alley: already walkable
    if (u >= BLOCK.alley + BLOCK.alleyHalf) return [[start, { x: alley, z: p.z }]];
    if (u >= BLOCK.houseBack) return [[start, { x: p.x, z: zc }, { x: alley, z: zc }]];
    const toStreet = (z, lead) => [[...lead, { x: sidewalk, z }], ...[1.2, -1.2].map((d) => [...lead, { x: kerb, z }, { x: kerb, z: z + d }, { x: sidewalk, z: z + d }])];
    const onBoundary = Math.abs(p.z - boundary) <= 0.25;
    if (u >= BLOCK.houseFront) return onBoundary ? toStreet(p.z, [start]) : toStreet(boundary, [start, { x: p.x, z: boundary }]);
    const walkway = zc + (s < 0 ? 1.55 : -1.55);
    return onBoundary || Math.abs(p.z - walkway) <= 0.25 ? toStreet(p.z, [start]) : toStreet(walkway, [start, { x: p.x, z: walkway }]);
  }
  return null;
}

const project = (p, a, b) => {
  const dx = b.x - a.x, dz = b.z - a.z, len2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2));
  return { x: a.x + dx * t, z: a.z + dz * t, t };
};

// Candidate attachment points from p onto the walk graph. Hard obstacles always
// block; a point inside a private lot (a front-yard door) may cross its own lot
// band but nothing else.
function connect(graph, p, { maxDistance = MAX_CONNECTOR, limit = 4 } = {}) {
  const ownSoft = graph.obstacles.filter((r) => r.soft && inside(p, r));
  const ignore = (r) => ownSoft.includes(r);
  const out = [];
  for (const [ia, ib, cost] of graph.edges) {
    const q = project(p, graph.nodes[ia], graph.nodes[ib]), distance = Math.hypot(q.x - p.x, q.z - p.z);
    if (distance > maxDistance) continue;
    // Approaches meet a walk line square-on; only short diagonals are allowed,
    // so a route never cuts across open ground to reach a line's far end.
    if (distance > SHORT_DIAGONAL && (q.t <= 1e-6 || q.t >= 1 - 1e-6)) continue;
    // A step of under a metre back onto the line (a resident that sidestepped beside a curb pole)
    // only needs to miss the obstacle itself, not its full clearance.
    if (distance > 0.05 && !segmentClear(p, q, graph.obstacles, { ignore, pad: distance < 1 ? 0.05 : PAD })) continue;
    out.push({ ia, ib, cost, point: { x: q.x, z: q.z }, distance });
  }
  out.sort((a, b) => a.distance - b.distance);
  return out.slice(0, limit);
}

// Nearest point on a street to a tapped map location, or null when the tap is
// not near any walkable street (the map then asks for a street or a place).
export function snapToStreet(graph, p, maxDistance = SNAP_DISTANCE) {
  let best = null;
  for (const [ia, ib] of graph.edges) {
    const q = project(p, graph.nodes[ia], graph.nodes[ib]), distance = Math.hypot(q.x - p.x, q.z - p.z);
    if (distance <= maxDistance && (!best || distance < best.distance)) best = { x: q.x, z: q.z, distance };
  }
  return best && { x: best.x, z: best.z };
}

// A* from → to over the walk graph plus temporary attachment nodes.
// Returns { ok, points, distance } or { ok: false, reason } — never a guess.
// `approach` lists optional points leading out from the destination door (a
// step straight out of a storefront before turning). The route uses whichever
// of the direct and stepped approaches is valid and shorter.
export function findRoute(graph, from, to, { approach = [] } = {}) {
  const direct = findDirectRoute(graph, from, to);
  if (!approach.length) return direct;
  const legs = [to, ...approach];
  if (!legs.every((p, i) => i === 0 || segmentClear(legs[i - 1], p, graph.obstacles))) return direct;
  const inner = findDirectRoute(graph, from, approach[approach.length - 1]);
  if (!inner.ok) return direct;
  const points = simplify([...inner.points, ...[...approach].reverse().slice(1), to]);
  const stepped = { ok: true, points, distance: polylineLength(points) };
  return direct.ok && direct.distance <= stepped.distance ? direct : stepped;
}
const polylineLength = (points) => points.reduce((sum, p, i) => i ? sum + Math.hypot(p.x - points[i - 1].x, p.z - points[i - 1].z) : 0, 0);

function findDirectRoute(graph, from, to) {
  if (insideObstacle(from, graph.obstacles)) return { ok: false, reason: 'start-blocked' };
  if (insideObstacle(to, graph.obstacles)) return { ok: false, reason: 'destination-blocked' };
  // Points inside private lots leave through a guaranteed gap first.
  const hard = graph.obstacles.filter((r) => !r.soft), centers = graph.blockCenters;
  const legsClear = (legs) => legs.every((p, i) => i === 0 || segmentClear(legs[i - 1], p, hard, { pad: 0.25 }));
  const exitFrom = inSoftZone(from, graph.obstacles) ? (lotExits(from, centers) || []).find(legsClear) : null;
  const exitTo = inSoftZone(to, graph.obstacles) ? (lotExits(to, centers) || []).find(legsClear) : null;
  if (inSoftZone(from, graph.obstacles) && !exitFrom) return { ok: false, reason: 'off-street' };
  if (inSoftZone(to, graph.obstacles) && !exitTo) return { ok: false, reason: 'no-street-near-destination' };
  const routeFrom = exitFrom ? exitFrom[exitFrom.length - 1] : from, routeTo = exitTo ? exitTo[exitTo.length - 1] : to;
  const inner = findStreetRoute(graph, routeFrom, routeTo);
  if (!inner.ok) return inner;
  const head = exitFrom ? exitFrom.slice(0, -1) : [], tail = exitTo ? [...exitTo].reverse().slice(1) : [];
  const points = simplify([...head, ...inner.points, ...tail]);
  return { ok: true, points, distance: polylineLength(points) };
}

function findStreetRoute(graph, from, to) {
  const starts = connect(graph, from), goals = connect(graph, to);
  if (!starts.length) return { ok: false, reason: 'no-street-near-start' };
  if (!goals.length) return { ok: false, reason: 'no-street-near-destination' };
  const base = graph.nodes.length, nodes = [...graph.nodes, from, to], START = base, GOAL = base + 1;
  const extra = new Map([[START, []], [GOAL, []]]);
  const link = (a, b, length) => { (extra.get(a) || extra.set(a, []).get(a)).push({ to: b, length }); (extra.get(b) || extra.set(b, []).get(b)).push({ to: a, length }); };
  // Attachment points become temporary nodes splitting their edge.
  for (const [list, owner] of [[starts, START], [goals, GOAL]]) for (const c of list) {
    const id = nodes.length; nodes.push(c.point);
    link(owner, id, c.distance);
    link(id, c.ia, Math.hypot(c.point.x - graph.nodes[c.ia].x, c.point.z - graph.nodes[c.ia].z) * c.cost);
    link(id, c.ib, Math.hypot(c.point.x - graph.nodes[c.ib].x, c.point.z - graph.nodes[c.ib].z) * c.cost);
  }
  // Same edge: walk along it directly between the two attachment points.
  for (const s of starts) for (const g of goals) if ((s.ia === g.ia && s.ib === g.ib) || (s.ia === g.ib && s.ib === g.ia)) {
    const si = nodes.indexOf(s.point), gi = nodes.indexOf(g.point);
    link(si, gi, Math.hypot(s.point.x - g.point.x, s.point.z - g.point.z) * s.cost);
  }
  const neighbours = (id) => [...(graph.adjacency[id] || []), ...(extra.get(id) || [])];
  const h = (id) => Math.hypot(nodes[id].x - to.x, nodes[id].z - to.z);
  const cost = new Map([[START, 0]]), prev = new Map(), open = new Set([START]);
  while (open.size) {
    let current = null, best = Infinity;
    for (const id of open) { const f = cost.get(id) + h(id); if (f < best) { best = f; current = id; } }
    if (current === GOAL) break;
    open.delete(current);
    for (const { to: next, length } of neighbours(current)) {
      const score = cost.get(current) + length;
      if (score < (cost.get(next) ?? Infinity)) { cost.set(next, score); prev.set(next, current); open.add(next); }
    }
  }
  if (!cost.has(GOAL)) return { ok: false, reason: 'no-connected-route' };
  const points = [];
  for (let id = GOAL; id !== undefined; id = prev.get(id)) points.unshift({ x: nodes[id].x, z: nodes[id].z });
  return { ok: true, points: simplify(points), distance: cost.get(GOAL) };
}

// Drops duplicate and collinear points so the drawn route stays light.
function simplify(points) {
  const out = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && Math.hypot(p.x - last.x, p.z - last.z) < 0.05) continue;
    if (out.length >= 2) {
      const a = out[out.length - 2], b = last, cross = (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x);
      if (Math.abs(cross) < 1e-6) { out[out.length - 1] = p; continue; }
    }
    out.push(p);
  }
  return out;
}

// Remaining distance along a route from position p, the next point to walk
// toward, and how far p has strayed from the route (for re-routing).
export function routeProgress(points, p) {
  if (!points?.length) return null;
  let bestIndex = 0, bestDistance = Infinity, bestPoint = points[0];
  for (let i = 0; i + 1 < points.length; i++) {
    const q = project(p, points[i], points[i + 1]), d = Math.hypot(q.x - p.x, q.z - p.z);
    if (d < bestDistance) { bestDistance = d; bestIndex = i; bestPoint = q; }
  }
  if (points.length === 1) bestDistance = Math.hypot(points[0].x - p.x, points[0].z - p.z);
  let remaining = points.length > 1 ? Math.hypot(points[bestIndex + 1].x - bestPoint.x, points[bestIndex + 1].z - bestPoint.z) : bestDistance;
  for (let i = bestIndex + 1; i + 1 < points.length; i++) remaining += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].z - points[i].z);
  const next = points.length > 1 ? points[bestIndex + 1] : points[0];
  return { remaining, next, offRoute: bestDistance, destination: points[points.length - 1] };
}
