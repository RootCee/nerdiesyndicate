// NC-LIFE-02 Milestone 2: North Court Apartments' individual units, one per existing resident, read from their existing
// housing assignment (registry.properties north-court-001..036, bank migration 0004; nothing is changed or migrated).
// Built on the existing architecture: the hand-built North Court interior (apartment-system.js) stays the ground floor
// (entrance and lounge); its stairs lead to a hallway on storeys 2-4 with twelve numbered doors each (the Towers'
// 'tower-floor' hall); each door opens that unit (the Towers' apartment unit), its own multiplayer space. Only the
// hallway or unit a player is in is built, so 36 addresses add no live scenes.
//   north-court-001 -> unit 201 ... north-court-012 -> 212, north-court-013 -> 301 ... north-court-036 -> 412.
// Pure: no Three.js. Shared by the server (spaces, access), the client (interiors, doors) and the tests.
import { APARTMENT_SITE } from './city-layout.js';
import { LOBBY_LIFT_Z, apartmentUnitSpace, interiorLayout, towerHomeEntry } from './interior-catalog.js';

export const NORTH_COURT_SPACE = 'north-court';
export const NORTH_COURT_FLOORS = Object.freeze([2, 3, 4]);
export const NORTH_COURT_HOMES_PER_FLOOR = 12;
const HALL = Object.freeze({ w: 10, d: 22 }); // a corridor: the stairs/lift at the south end, six doors down each side
const DOOR_Z = Object.freeze([-6, -3, 0, 3, 6, 9]);
const r2 = (v) => Math.round(v * 100) / 100;
const pad = (n, w) => String(n).padStart(w, '0');

export const unitCode = (floor, slot) => `${floor}${pad(slot, 2)}`;
// The ground-floor stairs in the hand-built interior (13 x 10 m at interiorY): by the east wall, between the
// partitions' gap and the sofa, clear of the kitchen. Players and the server both use this point.
export const NORTH_COURT_STAIRS = Object.freeze({ x: r2(APARTMENT_SITE.x + 5.4), y: APARTMENT_SITE.interiorY, z: r2(APARTMENT_SITE.z) });

function hallDoors(floor, y = 300) {
  return Object.freeze(Array.from({ length: NORTH_COURT_HOMES_PER_FLOOR }, (_, i) => {
    const side = i < 6 ? -1 : 1, slot = i + 1;
    return Object.freeze({ floor, slot, code: unitCode(floor, slot), x: r2(APARTMENT_SITE.x + side * (HALL.w / 2 - 0.35)), y, z: r2(APARTMENT_SITE.z + DOOR_Z[i % 6]), facing: side < 0 ? 'west' : 'east' });
  }));
}
// Every unit uses the same compact footprint inside the real building at its real storey height (windows on the
// street side); units on one floor may share it because only one is ever built for a player.
const UNIT_SITE = Object.freeze({ x: APARTMENT_SITE.x, z: APARTMENT_SITE.z, width: APARTMENT_SITE.width - 2, depth: APARTMENT_SITE.depth - 2, height: APARTMENT_SITE.height });

export const NORTH_COURT_HOMES = Object.freeze(NORTH_COURT_FLOORS.flatMap((floor, f) => Array.from({ length: NORTH_COURT_HOMES_PER_FLOOR }, (_, i) => {
  const slot = i + 1, code = unitCode(floor, slot), n = f * NORTH_COURT_HOMES_PER_FLOOR + slot;
  return Object.freeze({
    id: `north-court-${code}`, propertyId: `north-court-${pad(n, 3)}`, spaceId: `${NORTH_COURT_SPACE}-u${code}`, floorSpaceId: `${NORTH_COURT_SPACE}-f${floor}`,
    floor, slot, code, title: `Apartment ${code}`, tier: 'standard', layout: 'standard', facing: 'west', site: UNIT_SITE, noBalcony: true,
  });
})));
export const northCourtHomeForProperty = (propertyId) => NORTH_COURT_HOMES.find((h) => h.propertyId === propertyId) || null;
export const northCourtHomeForSpace = (spaceId) => NORTH_COURT_HOMES.find((h) => h.spaceId === spaceId) || null;
export const isNorthCourtUnitSpace = (spaceId) => !!northCourtHomeForSpace(spaceId);
export const northCourtFloorForSpace = (spaceId) => { const m = /^north-court-f(\d)$/.exec(String(spaceId || '')); return m && NORTH_COURT_FLOORS.includes(Number(m[1])) ? Number(m[1]) : null; };

export function northCourtFloor(floor) {
  if (!NORTH_COURT_FLOORS.includes(floor)) return null;
  return Object.freeze({ floor, spaceId: `${NORTH_COURT_SPACE}-f${floor}`, title: `Floor ${floor}`, homes: Object.freeze(NORTH_COURT_HOMES.filter((h) => h.floor === floor)), doors: hallDoors(floor), w: HALL.w, d: HALL.d });
}

// The Tower-shaped definition the generic interior system and the space builders use. `linkedLobby`: the ground floor is
// the hand-built North Court interior (not a catalog lobby), reached by the stairs.
export const NORTH_COURT_TOWER = Object.freeze({
  id: 'north-court', districtId: 'north-court', linkedLobby: true,
  building: Object.freeze({ id: 'north-court', name: APARTMENT_SITE.name, x: APARTMENT_SITE.x, z: APARTMENT_SITE.z, width: APARTMENT_SITE.width, depth: APARTMENT_SITE.depth, height: APARTMENT_SITE.height }),
  lobbySpaceId: NORTH_COURT_SPACE, homes: NORTH_COURT_HOMES, residentialFloors: NORTH_COURT_FLOORS, penthouseFloor: null,
  floor: northCourtFloor, home: northCourtHomeForSpace,
});

// A hallway as a generic 'tower-floor' interior entry (its doors and corridor size come from the floor record).
export function northCourtFloorEntry(floor) {
  const record = northCourtFloor(floor); if (!record) return null;
  return Object.freeze({ buildingId: `north-court-floor-${floor}`, spaceId: record.spaceId, districtId: 'north-court', template: 'tower-floor', name: `${APARTMENT_SITE.name} · ${record.title}`, tier: null, value: null, facing: 'west',
    site: Object.freeze({ x: APARTMENT_SITE.x, z: APARTMENT_SITE.z, width: HALL.w, depth: HALL.d, height: 3.2 }), towerFloor: record, door: NORTH_COURT_STAIRS, outside: NORTH_COURT_STAIRS });
}
// The hallway's multiplayer space: entered from North Court's ground floor at the stairs, left the same way.
export function northCourtFloorSpace(floor) {
  const entry = northCourtFloorEntry(floor); if (!entry) return null;
  const L = interiorLayout(entry), landing = Object.freeze({ x: L.doorX, y: L.y, z: r2(L.minZ + LOBBY_LIFT_Z) });
  return Object.freeze({ id: entry.spaceId, parent: NORTH_COURT_SPACE, floor, layer: 1, safeZone: true, entry: NORTH_COURT_STAIRS, inside: landing, exit: landing, outside: NORTH_COURT_STAIRS,
    bounds: Object.freeze({ minX: r2(L.minX + 0.2), maxX: r2(L.maxX - 0.2), minY: L.y - 1, maxY: L.y + L.height, minZ: r2(L.minZ + 0.2), maxZ: r2(L.maxZ - 0.2) }) });
}
// A unit's multiplayer space: entered from its hallway at its door, left back to the door.
export function northCourtHomeSpace(home, floorSpace = northCourtFloorSpace(home.floor)) {
  const entry = towerHomeEntry(NORTH_COURT_TOWER, home), door = northCourtFloor(home.floor).doors.find((d) => d.slot === home.slot), base = apartmentUnitSpace(entry, home.floor);
  return Object.freeze({ ...base, id: home.spaceId, parent: floorSpace.id, entry: Object.freeze({ x: door.x, y: door.y, z: door.z }), outside: Object.freeze({ x: r2(door.x + (door.facing === 'west' ? 0.9 : -0.9)), y: door.y, z: door.z }) });
}
export function northCourtSpaces() {
  const out = {};
  for (const floor of NORTH_COURT_FLOORS) { const fs = northCourtFloorSpace(floor); out[fs.id] = fs; for (const h of northCourtFloor(floor).homes) { const hs = northCourtHomeSpace(h, fs); out[hs.id] = hs; } }
  return out;
}

// Who may enter a unit (server-side; future: ownership, tenancy, invitations, customization). Today every unit is a
// resident's private home: players may not enter unless the transport allows development visits (never production).
// identity: the room's VERIFIED identity for the player (a signed room pass, room-pass.js), never anything the client claims.
// Milestone 4: the founder may inspect every unit (audited by the room). Milestone 5 adds owners, tenants and invitations here.
export function residenceAccess(spaceId, { visitsAllowed = false, identity = null, now = Date.now() } = {}) {
  const home = northCourtHomeForSpace(spaceId); if (!home) return { ok: true };
  if (identity && identity.exp * 1000 > now && Array.isArray(identity.homes) && identity.homes.includes(spaceId)) return { ok: true, reason: 'own_home' };
  if (identity && identity.exp * 1000 > now && Array.isArray(identity.roles) && identity.roles.includes('founder')) return { ok: true, reason: 'founder_inspection', audit: true };
  return visitsAllowed ? { ok: true, reason: 'development_visit' } : { ok: false, reason: 'private_residence' };
}
