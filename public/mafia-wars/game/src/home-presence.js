// NC-LIFE-02B-2: where the residents who are home stand inside a Neighborhood One home, and which home an
// interior space is. Pure (no Three.js): the client view, the room and the tests read the same answer.
// Only interiors the game already builds are used — a house's own layout (interiorLayout) or an apartment
// unit (apartmentUnit) — never new geometry. North Court (one interior for 36 homes) and lobbies show no one.
import { parseHomePropertyId } from './home-ids.js';

// iPhone / desktop caps on residents drawn inside one home (the outdoor caps are 10 / 16).
export const HOME_PRESENCE_LIMITS = Object.freeze({ mobile: 2, desktop: 4 });
const BODY = 0.4, FURNITURE_PAD = 0.15, WALL_PAD = 0.3, DOOR_CLEAR = 1.6, SPACING = 1.3, STEP = 0.25;

// 'bld-<buildingId>' (a house, or an apartment lobby) or 'bld-<buildingId>-f<floor>' (an apartment unit).
export function homeSpaceOf(spaceId) {
  const m = /^bld-(.+?)(?:-f(\d))?$/.exec(String(spaceId || ''));
  return m ? { buildingId: m[1], floor: m[2] ? Number(m[2]) : null } : null;
}
// Is this resident's home (their property) the interior this space shows? Houses: the house itself;
// apartments: only their own unit's floor (nobody is shown in a lobby).
export function propertyInSpace(propertyId, spaceId) {
  const home = parseHomePropertyId(propertyId), space = homeSpaceOf(spaceId);
  if (!home || !space || home.buildingId !== space.buildingId) return false;
  return home.floor == null ? space.floor == null : space.floor === home.floor;
}

const inBox = (p, b, pad) => p.x > b.minX - pad && p.x < b.maxX + pad && p.z > b.minZ - pad && p.z < b.maxZ + pad;
const boxOf = (f) => ({ minX: f.x - f.w / 2, maxX: f.x + f.w / 2, minZ: f.z - f.d / 2, maxZ: f.z + f.d / 2 });

// view: { kind: 'house', layout } (interiorLayout) or { kind: 'unit', unit } (apartmentUnit), plus
// avoid: [{ x, z }] points to keep clear (arrival point, exit, lift). Returns up to `count` spots
// { x, y, z, yaw } on the main floor, clear of furniture, walls, stairs and doorways, spaced apart,
// living room first (nearest the sofa), facing into the room. Deterministic.
export function homePresenceSpots(view, count, avoid = []) {
  if (!view || count <= 0) return [];
  const house = view.kind === 'house', L = house ? view.layout : null, U = house ? null : view.unit;
  const bounds = house ? { minX: L.minX, maxX: L.maxX, minZ: L.minZ, maxZ: L.maxZ } : U?.inner;
  if (!bounds) return [];
  const y = house ? L.y : U.level;
  const furniture = (house ? L.furniture : U.furniture).filter((f) => f.collide).map(boxOf);
  const walls = [];
  if (house) {
    for (const p of L.partitions || []) {
      const box = p.axis === 'z' ? { minX: p.at - 0.1, maxX: p.at + 0.1, minZ: p.from, maxZ: p.to } : { minX: p.from, maxX: p.to, minZ: p.at - 0.1, maxZ: p.at + 0.1 };
      walls.push(box);
    }
    for (const s of L.stairs?.steps || []) walls.push(s);
    if (L.upper?.opening) walls.push(L.upper.opening);
  } else {
    for (const r of U.runs || []) walls.push(r);
    for (const o of U.openings || []) if (o.door) avoid = [...avoid, { x: o.x, z: o.z }];
  }
  const anchor = (house ? L.furniture : U.furniture).find((f) => f.type === 'sofa') || { x: (bounds.minX + bounds.maxX) / 2, z: (bounds.minZ + bounds.maxZ) / 2 };
  const free = [];
  for (let x = bounds.minX + WALL_PAD + BODY; x <= bounds.maxX - WALL_PAD - BODY + 1e-9; x += STEP) {
    for (let z = bounds.minZ + WALL_PAD + BODY; z <= bounds.maxZ - WALL_PAD - BODY + 1e-9; z += STEP) {
      const p = { x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100 };
      if (furniture.some((b) => inBox(p, b, BODY + FURNITURE_PAD)) || walls.some((b) => inBox(p, b, BODY + 0.1))) continue;
      if (avoid.some((a) => Math.hypot(a.x - p.x, a.z - p.z) < DOOR_CLEAR)) continue;
      free.push(p);
    }
  }
  free.sort((a, b) => Math.hypot(a.x - anchor.x, a.z - anchor.z) - Math.hypot(b.x - anchor.x, b.z - anchor.z) || a.x - b.x || a.z - b.z);
  const spots = [];
  for (const p of free) {
    if (spots.length >= count) break;
    if (spots.some((s) => Math.hypot(s.x - p.x, s.z - p.z) < SPACING)) continue;
    spots.push({ x: p.x, y, z: p.z, yaw: Math.atan2(anchor.x - p.x, anchor.z - p.z) }); // face the living area
  }
  return spots;
}
