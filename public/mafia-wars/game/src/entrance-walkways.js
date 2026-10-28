// Stage 2: every enterable building's entrance can be found from the street. A building set back from the
// sidewalk gets a paved walkway from its door (or the foot of its stoop) straight out to the nearest
// sidewalk, alley or road, with low lamps along longer ones. Pure: the city draws it, the tests check it.
// (The Academy halls have their own campus walks; City Hall its grand stairs to the street.)
import { createCityPlan } from './city-layout.js';
import { cityGroundLayout } from './city-ground-layout.js';
import { interiorCatalog } from './interior-catalog.js';

const NORMALS = Object.freeze({ north: [0, 1], south: [0, -1], east: [1, 0], west: [-1, 0] });
const WIDTH = Object.freeze({ house: 1.5, apartments: 2.4, lofts: 2.4, warehouse: 2, grocery: 2.6, wholesale: 2.6, laundromat: 2.6, sneakers: 2.6, tailor: 2.6, 'music-venue': 3 });
const SKIP = new Set(['lecture-hall', 'clock-tower', 'city-hall', 'vacant']); // (Neon Market's lots open straight onto the sidewalk)
const r2 = (v) => Math.round(v * 100) / 100;
const inside = (p, r) => p.x > r.minX && p.x < r.maxX && p.z > r.minZ && p.z < r.maxZ;

// When a straight walk out of the door would run into another building, find the shortest way to pavement on
// a 0.5 m grid around everything solid, as straight runs (a lane between buildings, then to the street).
function routeAround(foot, paved, solids, own, width) {
  const cell = 0.5, R = 70, n = Math.round((2 * R) / cell), x0 = foot.x - R, z0 = foot.z - R, idx = (i, j) => i * n + j;
  const at = (i, j) => ({ x: x0 + (i + 0.5) * cell, z: z0 + (j + 0.5) * cell });
  const m = width / 2 + 0.2, blocked = (p) => solids.some((r) => r !== own && p.x > r.minX - m && p.x < r.maxX + m && p.z > r.minZ - m && p.z < r.maxZ + m); // the whole walkway's width clear
  const prev = new Int32Array(n * n).fill(-2), start = [Math.floor(R / cell), Math.floor(R / cell)], queue = [start]; prev[idx(...start)] = -1;
  for (let q = 0; q < queue.length; q++) {
    const [i, j] = queue[q], p = at(i, j);
    if (q > 0 && paved.some((r) => inside(p, r))) { const path = []; let k = idx(i, j); while (k >= 0) { path.push(at(Math.floor(k / n), k % n)); k = prev[k]; } return path.reverse(); }
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= n || b >= n || prev[idx(a, b)] !== -2) continue; const pp = at(a, b); if (blocked(pp)) { prev[idx(a, b)] = -3; continue; } prev[idx(a, b)] = idx(i, j); queue.push([a, b]); }
  }
  return null;
}
// a polyline of grid points as straight segments (corners where the direction turns)
function straightRuns(points) {
  const runs = []; let s = points[0];
  for (let k = 1; k < points.length; k++) { const a = points[k - 1], b = points[k], c = points[k + 1]; if (!c || Math.sign(c.x - b.x) !== Math.sign(b.x - a.x) || Math.sign(c.z - b.z) !== Math.sign(b.z - a.z)) { runs.push([s, b]); s = b; } }
  return runs;
}

export function entranceWalkways(plan = createCityPlan(), ground = cityGroundLayout(plan)) {
  const paved = [...ground.sidewalks, ...ground.surfaces, ...ground.alleys], out = [];
  const buildings = plan.districts.flatMap((d) => d.buildings).map((b) => ({ id: b.id, minX: b.x - b.width / 2, maxX: b.x + b.width / 2, minZ: b.z - b.depth / 2, maxZ: b.z + b.depth / 2 }));
  for (const e of interiorCatalog()) {
    if (SKIP.has(e.template)) continue;
    const [nx, nz] = NORMALS[e.facing], own = buildings.find((b) => b.id === e.buildingId);
    // the door's foot: on the facade, or at the bottom of a house's stoop (the catalog's door point, 1.4 m further out)
    const foot = { x: r2(e.door.x - nx * 1.4), z: r2(e.door.z - nz * 1.4) }, width = WIDTH[e.template] || 2;
    let reach = null;
    for (let t = 0; t <= 30; t += 0.25) {
      const p = { x: foot.x + nx * t, z: foot.z + nz * t };
      if (buildings.some((b) => b !== own && inside(p, b))) break;
      if (paved.some((r) => inside(p, r))) { reach = t; break; }
    }
    let runs;
    if (reach !== null) runs = [[foot, { x: r2(foot.x + nx * (reach + 0.15)), z: r2(foot.z + nz * (reach + 0.15)) }]];
    else {
      // out of the door to the lane first, then around
      const lane = { x: r2(foot.x + nx * 1.5), z: r2(foot.z + nz * 1.5) }, path = routeAround(lane, paved, buildings, own, width);
      if (!path) continue;
      runs = [[foot, lane], ...straightRuns([lane, ...path])];
    }
    const segRect = ([a, b]) => { const vx = Math.abs(b.x - a.x) >= Math.abs(b.z - a.z); return Object.freeze({ minX: r2(Math.min(a.x, b.x) - (vx ? 0 : width / 2)), maxX: r2(Math.max(a.x, b.x) + (vx ? 0 : width / 2)), minZ: r2(Math.min(a.z, b.z) - (vx ? width / 2 : 0)), maxZ: r2(Math.max(a.z, b.z) + (vx ? width / 2 : 0)) }); };
    const segments = runs.map(segRect), length = r2(runs.reduce((n, [a, b]) => n + Math.hypot(b.x - a.x, b.z - a.z), 0));
    // lamps every 3 m on both sides, always a pair by the door
    const lamps = [];
    for (const [a, b] of runs) {
      const len = Math.hypot(b.x - a.x, b.z - a.z); if (len < 0.5) continue;
      const dx = (b.x - a.x) / len, dz = (b.z - a.z) / len, px = -dz, pz = dx;
      for (let t = 0.8; t < len - 0.4; t += len > 3 ? 3 : len) for (const s of [-1, 1]) lamps.push({ x: r2(a.x + dx * t + px * s * (width / 2 + 0.3)), z: r2(a.z + dz * t + pz * s * (width / 2 + 0.3)) });
    }
    out.push(Object.freeze({ spaceId: e.spaceId, buildingId: e.buildingId, facing: e.facing, foot: Object.freeze(foot), length, width, segments: Object.freeze(segments), rect: segments[0], lamps: Object.freeze(lamps), setBack: length > 0.45 }));
  }
  return Object.freeze(out);
}
