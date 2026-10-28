// Neon Tower Phase B: a stable, pure registry for all 126 homes. The lobby is the parent space, each
// residential floor is a child, and its six homes are children of that floor. Only the floor or home the
// player occupies is rendered, so adding 126 addresses does not add 126 live scenes on a phone.
import { APARTMENT_STOREY_HEIGHT } from './city-layout.js';
import { NEON_TOWER } from './neon-market-layout.js';

export const NEON_TOWER_LOBBY_SPACE = 'bld-neon-tower';
export const NEON_TOWER_APARTMENT_FLOORS = Object.freeze(Array.from({ length: 20 }, (_, i) => i + 2));
export const NEON_TOWER_PENTHOUSE_FLOOR = 22;
export const NEON_TOWER_RESIDENTIAL_FLOORS = Object.freeze([...NEON_TOWER_APARTMENT_FLOORS, NEON_TOWER_PENTHOUSE_FLOOR]);
export const NEON_TOWER_HOMES_PER_FLOOR = 6;

const r2 = (v) => Math.round(v * 100) / 100;
const floorLabel = (floor) => floor === NEON_TOWER_PENTHOUSE_FLOOR ? 'Penthouse Level' : `Floor ${floor}`;
const unitCode = (floor, slot) => floor === NEON_TOWER_PENTHOUSE_FLOOR ? `PH${slot}` : `${floor}${String(slot).padStart(2, '0')}`;

// A floor is an isolated lift hall at the generic-interior altitude. These are local coordinates around
// the Tower's x/z so the same renderer/collision code used by other interiors can build it.
export function neonTowerFloorDoors(floor, y = 300) {
  const z = [-4.1, 0, 4.1];
  return Object.freeze(Array.from({ length: 6 }, (_, i) => {
    const side = i < 3 ? -1 : 1, row = i % 3, slot = i + 1;
    return Object.freeze({ floor, slot, code: unitCode(floor, slot), x: r2(NEON_TOWER.x + side * 7.65), y, z: r2(NEON_TOWER.z + z[row]), facing: side < 0 ? 'west' : 'east' });
  }));
}

function homeSite(floor, slot) {
  const penthouse = floor === NEON_TOWER_PENTHOUSE_FLOOR, left = slot <= 3, row = (slot - 1) % 3;
  // Each address is a separate multiplayer space, so homes may reuse a roomy authored footprint while
  // keeping their windows at their real storey height. Only one home scene is built for a client at once.
  return Object.freeze({
    x: r2(NEON_TOWER.x + (left ? -3.8 : 3.8)), z: r2(NEON_TOWER.z + (row - 1) * 5.4),
    width: penthouse ? 18 : 14, depth: penthouse ? 16 : 10, height: NEON_TOWER.height,
  });
}

export const NEON_TOWER_HOMES = Object.freeze(NEON_TOWER_RESIDENTIAL_FLOORS.flatMap((floor) =>
  Array.from({ length: NEON_TOWER_HOMES_PER_FLOOR }, (_, i) => {
    const slot = i + 1, penthouse = floor === NEON_TOWER_PENTHOUSE_FLOOR, code = unitCode(floor, slot);
    return Object.freeze({
      id: `neon-tower-${code.toLowerCase()}`, spaceId: `${NEON_TOWER_LOBBY_SPACE}-u${code.toLowerCase()}`,
      floorSpaceId: `${NEON_TOWER_LOBBY_SPACE}-f${floor}`, floor, slot, code,
      title: penthouse ? `Penthouse ${slot}` : `Residence ${code}`,
      tier: penthouse ? 'penthouse' : 'luxury', layout: penthouse ? 'penthouse' : (floor % 2 ? 'luxury-plus' : 'luxury'),
      facing: slot <= 3 ? 'west' : 'east', site: homeSite(floor, slot),
    });
  })));

export function neonTowerFloor(floor) {
  if (!NEON_TOWER_RESIDENTIAL_FLOORS.includes(floor)) return null;
  const homes = NEON_TOWER_HOMES.filter((home) => home.floor === floor);
  return Object.freeze({ floor, spaceId: `${NEON_TOWER_LOBBY_SPACE}-f${floor}`, title: floorLabel(floor), homes: Object.freeze(homes), doors: neonTowerFloorDoors(floor) });
}

export function neonTowerHome(spaceId) {
  return NEON_TOWER_HOMES.find((home) => home.spaceId === spaceId) || null;
}

export function neonTowerResidenceCounts() {
  return Object.freeze({ apartments: NEON_TOWER_APARTMENT_FLOORS.length * NEON_TOWER_HOMES_PER_FLOOR, penthouses: NEON_TOWER_HOMES_PER_FLOOR, total: NEON_TOWER_HOMES.length });
}

export const NEON_TOWER_STOREY_HEIGHT = APARTMENT_STOREY_HEIGHT;
