// NC-ECO-01 Roots Lounge: reuses the existing North Market music-lounge shell.
// Pure layout shared by rendering, multiplayer validation, navigation, and tests.
import { createCityPlan, FRONT_NORMALS } from './city-layout.js';

export const ROOTS_LOUNGE_BUILDING_ID = 'west-mixed-north-0';
export const ROOTS_LOUNGE_ID = 'roots-lounge';
const round = (v) => Math.round(v * 100) / 100;

export function rootsLoungeSite(plan = createCityPlan()) {
  const b = plan.districts.flatMap((d) => d.buildings).find((x) => x.id === ROOTS_LOUNGE_BUILDING_ID);
  if (!b) throw new Error(`Roots Lounge building ${ROOTS_LOUNGE_BUILDING_ID} missing`);
  return Object.freeze({ id: ROOTS_LOUNGE_ID, buildingId: b.id, name: 'Roots Lounge', x: b.x, z: b.z, width: b.width, depth: b.depth, height: b.height, front: b.front, interiorY: 132 });
}

export function rootsLoungeInterior(site = rootsLoungeSite()) {
  const wall = 0.3, y = site.interiorY, minX = site.x - site.width / 2 + wall, maxX = site.x + site.width / 2 - wall, minZ = site.z - site.depth / 2 + wall, maxZ = site.z + site.depth / 2 - wall;
  return Object.freeze({
    y, height: 4.5, minX, maxX, minZ, maxZ, doorX: site.x, doorWidth: 2.2,
    danceFloor: Object.freeze({ x: site.x, z: site.z - 0.2, width: 5.8, depth: 4.4 }),
    stage: Object.freeze({ x: site.x, z: maxZ - 1.35, width: 6.8, depth: 2.2, height: 0.55 }),
    bar: Object.freeze({ x: maxX - 1.25, z: site.z - 0.2, width: 1.1, depth: 5.6, height: 1.05 }),
    vip: Object.freeze({ x: minX + 2.5, z: maxZ - 2.25, width: 4.2, depth: 2.6 }),
    seats: Object.freeze([
      { x: minX + 2.0, z: minZ + 2.0, yaw: Math.PI / 2 }, { x: minX + 2.0, z: site.z, yaw: Math.PI / 2 },
      { x: maxX - 3.3, z: minZ + 1.5, yaw: -Math.PI / 2 }, { x: minX + 4.0, z: minZ + 1.5, yaw: Math.PI },
    ]),
    interactions: Object.freeze([
      { id: 'demand-board', kind: 'demand', label: 'VIEW CITY DEMAND BOARD', x: minX + 0.8, y, z: site.z },
      { id: 'treasury-console', kind: 'treasury', label: 'VIEW SIMULATED CITY TREASURY', x: minX + 0.8, y, z: site.z + 2.4 },
      { id: 'sound-booth', kind: 'volume', label: 'ADJUST MUSIC VOLUME', x: maxX - 3.0, y, z: maxZ - 1.2 },
    ]),
  });
}

export function rootsLoungeSpace(site = rootsLoungeSite()) {
  const L = rootsLoungeInterior(site), [nx, nz] = FRONT_NORMALS[site.front], half = nx ? site.width / 2 : site.depth / 2;
  const entry = { x: round(site.x + nx * (half + 1.4)), y: 0, z: round(site.z + nz * (half + 1.4)) };
  const outside = { x: round(site.x + nx * (half + 1.2)), y: 0, z: round(site.z + nz * (half + 1.2)) };
  const inside = { x: site.x, y: site.interiorY, z: round(L.minZ + 1.45) }, exit = { x: site.x, y: site.interiorY, z: round(L.minZ + 1.0) };
  return { id: ROOTS_LOUNGE_ID, layer: 1, safeZone: true, protectedSocial: true, entry, inside, exit, outside,
    bounds: { minX: round(L.minX + 0.2), maxX: round(L.maxX - 0.2), minY: site.interiorY - 1, maxY: site.interiorY + 5.5, minZ: round(L.minZ + 0.2), maxZ: round(L.maxZ - 0.2) } };
}
