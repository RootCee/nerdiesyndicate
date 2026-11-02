// Cyber Tower's permanent residential hierarchy. Floors 2-21 hold five apartments each and
// floor 22 holds four penthouses, matching the approved 100-apartment / 4-penthouse tower shell.
import { APARTMENT_STOREY_HEIGHT } from './city-layout.js';
import { CYBER_TOWER } from './cyber-hq-layout.js';

export const CYBER_TOWER_LOBBY_SPACE = 'bld-cyber-tower';
export const CYBER_TOWER_APARTMENT_FLOORS = Object.freeze(Array.from({ length: 20 }, (_, i) => i + 2));
export const CYBER_TOWER_PENTHOUSE_FLOOR = 22;
export const CYBER_TOWER_RESIDENTIAL_FLOORS = Object.freeze([...CYBER_TOWER_APARTMENT_FLOORS, CYBER_TOWER_PENTHOUSE_FLOOR]);

const r2 = (value) => Math.round(value * 100) / 100;
const homesOnFloor = (floor) => floor === CYBER_TOWER_PENTHOUSE_FLOOR ? 4 : 5;
const floorLabel = (floor) => floor === CYBER_TOWER_PENTHOUSE_FLOOR ? 'Penthouse Level' : `Floor ${floor}`;
const unitCode = (floor, slot) => floor === CYBER_TOWER_PENTHOUSE_FLOOR ? `CPH${slot}` : `C${floor}${String(slot).padStart(2, '0')}`;

// Five-door apartment halls use three west-side doors and two east-side doors. The penthouse
// level uses two per side. Every trigger is centered on the door slab rendered by tower-floor.
export function cyberTowerFloorDoors(floor, y = 300) {
  if (!CYBER_TOWER_RESIDENTIAL_FLOORS.includes(floor)) return Object.freeze([]);
  const count = homesOnFloor(floor), westZ = count === 4 ? [-2.4, 2.4] : [-4.1, 0, 4.1], eastZ = [-2.4, 2.4];
  const positions = [...westZ.map((z) => ({ side: -1, z })), ...eastZ.map((z) => ({ side: 1, z }))];
  return Object.freeze(positions.map(({ side, z }, index) => Object.freeze({
    floor, slot: index + 1, code: unitCode(floor, index + 1),
    x: r2(CYBER_TOWER.x + side * 7.65), y, z: r2(CYBER_TOWER.z + z), facing: side < 0 ? 'west' : 'east',
  })));
}

function homeSite(floor, slot) {
  const penthouse = floor === CYBER_TOWER_PENTHOUSE_FLOOR, left = slot <= (penthouse ? 2 : 3);
  const row = left ? slot - 1 : slot - (penthouse ? 3 : 4), rows = left ? (penthouse ? 2 : 3) : 2;
  return Object.freeze({
    x: r2(CYBER_TOWER.x + (left ? -4.2 : 4.2)),
    z: r2(CYBER_TOWER.z + (row - (rows - 1) / 2) * 5.4),
    width: penthouse ? 20 : 15, depth: penthouse ? 18 : 11, height: CYBER_TOWER.height,
  });
}

export const CYBER_TOWER_HOMES = Object.freeze(CYBER_TOWER_RESIDENTIAL_FLOORS.flatMap((floor) =>
  Array.from({ length: homesOnFloor(floor) }, (_, index) => {
    const slot = index + 1, penthouse = floor === CYBER_TOWER_PENTHOUSE_FLOOR, code = unitCode(floor, slot), left = slot <= (penthouse ? 2 : 3);
    return Object.freeze({
      id: `cyber-tower-${code.toLowerCase()}`, spaceId: `${CYBER_TOWER_LOBBY_SPACE}-u${code.toLowerCase()}`,
      floorSpaceId: `${CYBER_TOWER_LOBBY_SPACE}-f${floor}`, floor, slot, code,
      title: penthouse ? `Cyber Penthouse ${slot}` : `Cyber Residence ${floor}${String(slot).padStart(2, '0')}`,
      tier: penthouse ? 'penthouse' : 'luxury', layout: penthouse ? 'penthouse' : (floor % 2 ? 'luxury-plus' : 'luxury'),
      facing: left ? 'west' : 'east', site: homeSite(floor, slot),
    });
  })));

export function cyberTowerFloor(floor) {
  if (!CYBER_TOWER_RESIDENTIAL_FLOORS.includes(floor)) return null;
  const homes = CYBER_TOWER_HOMES.filter((home) => home.floor === floor);
  return Object.freeze({ floor, spaceId: `${CYBER_TOWER_LOBBY_SPACE}-f${floor}`, title: floorLabel(floor), homes: Object.freeze(homes), doors: cyberTowerFloorDoors(floor) });
}

export function cyberTowerHome(spaceId) {
  return CYBER_TOWER_HOMES.find((home) => home.spaceId === spaceId) || null;
}

export function cyberTowerResidenceCounts() {
  return Object.freeze({ apartments: CYBER_TOWER_APARTMENT_FLOORS.length * 5, penthouses: 4, total: CYBER_TOWER_HOMES.length });
}

export const CYBER_TOWER_STOREY_HEIGHT = APARTMENT_STOREY_HEIGHT;
