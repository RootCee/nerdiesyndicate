// Street addresses in Nerdie City. A door's street is the first named road straight out of it (the side
// the building faces), else the nearest named road; its number follows the position along that road,
// odd on one side and even on the other, like a real city. Pure: the bank panel and resident cards read it.
import { createCityPlan, APARTMENT_SITE } from './city-layout.js';
import { STREET_NAMES } from './city-pois.js';
import { MULTIPLAYER_SPACES } from './multiplayer-spaces.js';

const NORMALS = Object.freeze({ north: [0, 1], south: [0, -1], east: [1, 0], west: [-1, 0] });
// Road segments share a street's name ('central-cross-1' is Central Cross).
const streetName = (roadId) => STREET_NAMES[roadId] || STREET_NAMES[String(roadId).replace(/-\d+$/, '')] || null;
const toRoad = (p, r) => Math.hypot(Math.max(Math.abs(p.x - r.x) - r.width / 2, 0), Math.max(Math.abs(p.z - r.z) - r.depth / 2, 0));

let namedRoads = null;
function roads(plan) {
  if (plan) return plan.roads.filter((r) => streetName(r.id));
  return (namedRoads ||= createCityPlan().roads.filter((r) => streetName(r.id)));
}

// door: { x, z }; facing: 'north' | 'south' | 'east' | 'west' (optional). Returns { number, street, text }.
export function streetAddress(door, facing = null, plan = null) {
  const named = roads(plan);
  let road = null;
  const n = NORMALS[facing];
  if (n) for (let d = 0; d <= 60 && !road; d += 1) road = named.find((r) => toRoad({ x: door.x + n[0] * d, z: door.z + n[1] * d }, r) === 0) || null;
  road ||= named.reduce((best, r) => (!best || toRoad(door, r) < toRoad(door, best) ? r : best), null);
  if (!road) return null;
  const vertical = road.depth > road.width, along = vertical ? door.z : door.x, side = vertical ? door.x - road.x : door.z - road.z;
  const number = 2 * Math.round((along + 300) / 4) + (side >= 0 ? 1 : 0);
  return { number, street: streetName(road.id), text: `${number} ${streetName(road.id)}` };
}

// North Court's 36 homes: nine apartments a floor on floors 1-4 (north-court-001 is Apt 101).
export function apartmentLabel(propertyId) {
  const m = /^north-court-(\d{3})$/.exec(String(propertyId || ''));
  if (!m) return null;
  const n = Number(m[1]), floor = Math.ceil(n / 9), unit = ((n - 1) % 9) + 1;
  return `Apt ${floor}${String(unit).padStart(2, '0')}`;
}

// A resident's home address, e.g. "Apt 101, North Court Apartments, 207 Main Street".
export function residentAddress(propertyId) {
  const apt = apartmentLabel(propertyId); if (!apt) return null;
  const door = MULTIPLAYER_SPACES[APARTMENT_SITE.id].entry, street = streetAddress(door, 'west');
  return `${apt}, ${APARTMENT_SITE.name}${street ? `, ${street.text}` : ''}`;
}
