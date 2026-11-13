// NC-LIFE-02 / 0.9.4 Phase 1: one registry of the city's staffed places and resident destinations, shared by the
// room (who works inside, at which station), the client (where to draw them) and the tests. Pure: no Three.js,
// no DOM, no bank or economy writes. Presence is a function of the bank's job rows (the schedules the roster
// sends) and the economic clock only, so who is seen at work is exactly who payroll pays for that shift.
//
// Station positions come from the existing interior layouts (never hand-typed copies), in world coordinates.
// Target hours are the founder's 0.9.4 targets, recorded as data and NOT enforced: until Phase 2 re-times jobs
// (migration 0017), staff appear only during the shifts the bank records today.
import { interiorCatalog, interiorLayout } from './interior-catalog.js';
import { libraryInterior } from './academy-layout.js';
import { rootsLoungeInterior } from './roots-lounge-layout.js';
import { bankInterior } from './bank-layout.js';
import { STORES } from './store-hours.js';
import { DEFAULT_HOME_LOCATION, homeLocationIdFor, parseHomePropertyId } from './home-ids.js';
import { scheduledPlace } from './resident-schedule.js';

const r2 = (v) => Math.round(v * 100) / 100;
const hours = (open, close, enforced = false) => Object.freeze({ open: open * 60, close: close * 60, enforced });

// How a location's staff are shown: 'room' (this registry + the room's `space-staff` message), 'bank-staff'
// (bank-staff.js, unchanged), 'store-staff' (store-staff.js, unchanged), 'roots' (the Roots residents list,
// the bartender behind the bar), 'street' (outdoors, the street simulation).
export const CITY_LOCATIONS = Object.freeze([
  { id: 'city-hall', kind: 'civic', name: 'Nerdie City Hall', spaceId: 'bld-city-hall', presence: 'room', roles: ['City Hall clerk'], coverage: 1, targetHours: hours(8, 18) },
  { id: 'academy-library', kind: 'civic', name: 'Academy Library', spaceId: 'academy-library', presence: 'room', roles: ['Library assistant'], coverage: 1, targetHours: hours(9, 20) },
  { id: 'roots-lounge', kind: 'venue', name: 'Roots Lounge', spaceId: 'roots-lounge', presence: 'roots', roles: ['Roots Lounge bartender'], coverage: 1, targetHours: hours(18, 2) },
  { id: 'nerdie-city-bank', kind: 'workplace', name: 'Nerdie City Bank', spaceId: 'nerdie-city-bank', presence: 'bank-staff', roles: ['Bank teller'], coverage: 1, targetHours: hours(9, 18) },
  ...STORES.filter((s) => s.id !== 'roots-lounge').map((s) => ({ id: s.id, kind: 'workplace', name: s.name, spaceId: s.spaceId, presence: 'store-staff', roles: [s.title], coverage: 1, targetHours: hours(4, 22, true) })),
  { id: 'central-park', kind: 'park', name: 'Central Park', spaceId: null, presence: 'street', roles: ['Groundskeeper'], coverage: 1, targetHours: null },
  { id: 'north-court', kind: 'home', name: 'North Court Apartments', spaceId: 'north-court', presence: 'home', roles: [], coverage: 0, targetHours: null },
].map((l) => Object.freeze(l)));
export const locationById = (id) => CITY_LOCATIONS.find((l) => l.id === id) || null;

// Workplaces whose staff the room keeps inside and reports with `space-staff` (no layout work at import).
export const ROOM_STAFFED_LOCATIONS = Object.freeze(new Set(CITY_LOCATIONS.filter((l) => l.presence === 'room').map((l) => l.id)));
export const staffedLocationForSpace = (spaceId) => CITY_LOCATIONS.find((l) => l.presence === 'room' && l.spaceId === spaceId)?.id || null;

// ---------------------------------------------------------------- stations (lazy: layouts build the city plan)
const cache = new Map();
const station = (id, role, x, y, z, yaw, route) => Object.freeze({ id, role, x: r2(x), y, z: r2(z), yaw, route: Object.freeze(route.map((p) => Object.freeze({ x: r2(p.x), z: r2(p.z) }))) });

export function cityHallLayout() { return interiorLayout(interiorCatalog().find((e) => e.buildingId === 'city-hall')); }
// City Hall: a clerk behind each of the two counters (staff side, toward the council chamber, facing the door),
// then the Registration desk on the west wall (facing into the lobby). Clerks come in by the door and walk down
// the centre aisle between the counters; the registration clerk goes along the west wall, behind the benches.
function cityHallStations() {
  const L = cityHallLayout(), door = { x: L.doorX, z: L.maxZ - 1.6 }, counters = L.furniture.filter((f) => f.type === 'counter').sort((a, b) => a.x - b.x);
  const out = counters.map((c, i) => { const z = c.z - c.d / 2 - 0.5; return station(`counter-${i + 1}`, 'City Hall clerk', c.x, L.y, z, 0, [door, { x: L.doorX, z }, { x: c.x, z }]); });
  const desk = L.furniture.find((f) => f.station === 'registration');
  if (desk) { const x = desk.x - desk.w / 2 - 0.5; out.push(station('registration', 'City Hall clerk', x, L.y, desk.z, Math.PI / 2, [door, { x, z: L.maxZ - 3 }, { x, z: desk.z }])); }
  return out;
}
// The library: an assistant behind the front desk (the directory desk by the door), and one beside each of the
// two book lecterns on the far side from the reader, facing them.
function libraryStations() {
  const L = libraryInterior(), door = { x: L.minX + 1.6, z: L.doorZ }, st = (id) => L.stations.find((s) => s.id === id);
  const desk = st('directory'), deskZ = desk.z - 1.05;
  return [
    station('front-desk', 'Library assistant', desk.x, L.y, deskZ, 0, [door, { x: L.minX + 1.4, z: deskZ }, { x: desk.x, z: deskZ }]),
    ...['defi-guide', 'operator-guide'].map((id) => { const s = st(id), x = s.x + 0.9; return station(`help-${id}`, 'Library assistant', x, L.y, s.z, -Math.PI / 2, [door, { x, z: L.doorZ }, { x, z: s.z }]); }),
  ];
}
// Roots Lounge: behind the bar (between it and the bottle wall), facing the room. In from the door, round the
// bar's south end, then along behind it. More than one bartender (the next shift arriving) stand along it.
export function barStations(L) {
  const B = L.bar, x = L.maxX - 0.44, door = { x: L.doorX, z: L.minZ + 0.55 }, corner = { x, z: B.z - B.depth / 2 - 0.5 };
  return [0, -1.3, 1.3].map((dz, i) => station(i ? `bar-${i + 1}` : 'bar', 'Roots Lounge bartender', x, L.y, B.z + dz, -Math.PI / 2, [door, corner, { x, z: B.z + dz }]));
}
const rootsStations = () => barStations(rootsLoungeInterior());
// The bank's windows, described from bank-layout (bank-staff.js draws them; nothing changes there).
function bankStations() {
  const L = bankInterior(), c = L.counter, x = r2(c.x + c.depth / 2 + 0.55);
  return L.tellers.map((z, i) => station(`window-${i + 1}`, 'Bank teller', x, L.y, z, -Math.PI / 2, [{ x, z: r2(c.z0 + 0.45) }, { x, z }]));
}
const BUILDERS = { 'city-hall': cityHallStations, 'academy-library': libraryStations, 'roots-lounge': rootsStations, 'nerdie-city-bank': bankStations };
// The stations of a location in fill order ([] for places without fixed stations, e.g. stores use their
// layout's counter in store-staff.js, the park is outdoors).
export function stationsFor(locationId) {
  if (!BUILDERS[locationId]) return [];
  if (!cache.has(locationId)) cache.set(locationId, Object.freeze(BUILDERS[locationId]()));
  return cache.get(locationId);
}

// Who works at which station: on-duty residents sorted by resident id take the stations in order, so the
// answer is stable and the same in the room, in solo play and in tests. Extra residents (more on duty than
// stations) get no station and are not drawn. residents: [{ residentId, ... }]
export function assignStations(locationId, residents) {
  const stations = stationsFor(locationId);
  return [...residents].sort((a, b) => String(a.residentId).localeCompare(String(b.residentId))).map((r, i) => ({ ...r, station: stations[i]?.id || null }));
}
export const stationById = (locationId, id) => stationsFor(locationId).find((s) => s.id === id) || null;

// On duty at a location at a minute of the economic day: exactly the residents whose shift (from the bank's job
// rows) covers that minute, the shifts payroll pays (city-service economy.js). schedules: the roster's
// [{ residentId, employment, homeLocationId }]. Returns the schedules, in input order.
export function onDutyAt(locationId, minute, schedules) {
  return schedules.filter((s) => s?.employment?.workplaceId === locationId && scheduledPlace(s.employment, minute, s.homeLocationId || DEFAULT_HOME_LOCATION).activity === 'work');
}

// ---------------------------------------------------------------- homes (foundation only: no record changes)
const NORTH_COURT_UNIT = /^north-court-(\d{3})$/;
// A resident's home destination from their existing housing assignment's property id (the bank's
// registry.properties: north-court-001..036 from 0004, or a Neighborhood One id if 0015 were ever on). Reads only.
export function homeDestination(propertyId) {
  const nc = NORTH_COURT_UNIT.exec(String(propertyId || ''));
  if (nc) return Object.freeze({ locationId: 'north-court', buildingId: 'north-court', unit: nc[1], propertyId });
  const home = parseHomePropertyId(propertyId);
  if (home) return Object.freeze({ locationId: homeLocationIdFor(home.buildingId), buildingId: home.buildingId, unit: home.unit, propertyId });
  return Object.freeze({ locationId: DEFAULT_HOME_LOCATION, buildingId: null, unit: null, propertyId: propertyId || null });
}
