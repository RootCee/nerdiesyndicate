// NC-LIFE-02A-1: Neighborhood One's homes and which permanent resident lives in which. Pure and
// deterministic (no Three.js, no randomness at runtime): the bank's home plan (migration 0015), the City
// Service roster, the room simulation and the tests all read the same answer.
//
// Homes come from what already exists: every house and every apartment-building home that the interior
// catalog (interior-catalog.js) can open inside Neighborhood One's approved 280 x 296 m boundary
// (city-layout.js). Hand-built spaces (North Court, the public enterable houses) and shops, lofts, civic
// buildings and warehouses are not homes here. Doors and outside points are the catalog's own.
import { createCityPlan } from './city-layout.js';
import { interiorCatalog } from './interior-catalog.js';
import { APARTMENT_FLOORS } from './apartment-building.js';
import { streetAddress } from './city-addresses.js';
import { homeLocationFor, homeLocationIdFor, homePropertyId, parseHomePropertyId } from './home-ids.js';

export const NEIGHBORHOOD_ONE_BOUNDS = Object.freeze({ minX: -140, maxX: 140, minZ: -148, maxZ: 148 });
// Changing the seed would move everyone: a new plan needs a new version (and a new bank plan).
export const HOUSING_PLAN_VERSION = 'nc-life-02a-homes-v1';

const FRONT = Object.freeze({ north: [0, 1], south: [0, -1], east: [1, 0], west: [-1, 0] });
const ENTRY_OUT = 1.2, STEP_OUT = 2.5; // stand clear of the facade, then step out like the storefront POIs
const r2 = (v) => Math.round(v * 100) / 100;
const inside = (s) => !!s && s.x >= NEIGHBORHOOD_ONE_BOUNDS.minX && s.x <= NEIGHBORHOOD_ONE_BOUNDS.maxX && s.z >= NEIGHBORHOOD_ONE_BOUNDS.minZ && s.z <= NEIGHBORHOOD_ONE_BOUNDS.maxZ;
// FNV-1a: a stable, dependency-free rank for each home.
function rank(text) { let h = 0x811c9dc5; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h; }

function homeFrom(entry, floorSpec) {
  const n = FRONT[entry.facing] || [0, 0], out = entry.outside || entry.door;
  const at = { x: r2(out.x + n[0] * ENTRY_OUT), z: r2(out.z + n[1] * ENTRY_OUT) };
  return Object.freeze({
    propertyId: homePropertyId(entry.buildingId, floorSpec?.floor ?? null),
    buildingId: entry.buildingId, spaceId: entry.spaceId, districtId: entry.districtId,
    kind: floorSpec ? 'apartment' : 'house', unit: floorSpec ? `${floorSpec.floor}01` : null, floor: floorSpec?.floor ?? null,
    tier: floorSpec ? floorSpec.tier : entry.tier, facing: entry.facing, locationId: homeLocationIdFor(entry.buildingId),
    door: Object.freeze({ x: entry.door.x, z: entry.door.z }),
    entry: Object.freeze(at),
    approach: Object.freeze([Object.freeze({ x: r2(at.x + n[0] * STEP_OUT), z: r2(at.z + n[1] * STEP_OUT) })]),
  });
}

let cached = null;
// Every Neighborhood One home, in property-id order.
export function neighborhoodHomes(plan = null) {
  if (!plan && cached) return cached;
  const homes = [];
  for (const entry of interiorCatalog(plan || createCityPlan())) {
    if (!inside(entry.site) || !entry.door) continue;
    if (entry.template === 'house') homes.push(homeFrom(entry, null));
    else if (entry.template === 'apartments') for (const spec of APARTMENT_FLOORS) homes.push(homeFrom(entry, spec));
  }
  homes.sort((a, b) => (a.propertyId < b.propertyId ? -1 : a.propertyId > b.propertyId ? 1 : 0));
  const out = Object.freeze(homes);
  if (!plan) cached = out;
  return out;
}

// The first `count` permanent residents' homes: resident n gets the n-th home in the plan's fixed ranking,
// so the answer for resident n never depends on how many residents there are (growth keeps every home).
// Returns [{ residentId: 'res_0001', propertyId }]. Throws past the neighborhood's capacity.
export function assignHomes(count, homes = neighborhoodHomes()) {
  if (!Number.isInteger(count) || count < 0) throw new RangeError('count must be a whole number');
  if (count > homes.length) throw new RangeError(`Neighborhood One has ${homes.length} homes; ${count} requested`);
  const ranked = [...homes].sort((a, b) => rank(`${HOUSING_PLAN_VERSION}:${a.propertyId}`) - rank(`${HOUSING_PLAN_VERSION}:${b.propertyId}`) || (a.propertyId < b.propertyId ? -1 : 1));
  return ranked.slice(0, count).map((home, i) => Object.freeze({ residentId: `res_${String(i + 1).padStart(4, '0')}`, propertyId: home.propertyId }));
}

// Schedules with the plan's homes applied (resident n -> the n-th planned home): the same homes the bank's
// registry.set_neighborhood_homes(true) gives. Used only where there is no bank: local QA (NEIGHBORHOOD_HOMES=1)
// and the no-database release-candidate preview Worker (HOUSING_PLAN). Never changes the bank or its records.
export function schedulesWithPlannedHomes(schedules) {
  const plan = new Map(assignHomes(schedules.length).map((h) => [h.residentId, h.propertyId]));
  return schedules.map((s) => ({ ...s, propertyId: plan.get(s.residentId), homeLocationId: homeLocationFor(plan.get(s.residentId)) }));
}

let byProperty = null, byLocation = null;
function indexes() {
  if (!byProperty) {
    byProperty = new Map(neighborhoodHomes().map((h) => [h.propertyId, h]));
    byLocation = new Map();
    for (const h of neighborhoodHomes()) if (!byLocation.has(h.locationId)) byLocation.set(h.locationId, h);
  }
}
export function homeByProperty(propertyId) { if (!parseHomePropertyId(propertyId)) return null; indexes(); return byProperty.get(propertyId) || null; }
// The street door residents walk to for a home location (home:<buildingId>), shaped like a city POI.
export function homePoi(locationId) {
  indexes(); const h = byLocation.get(locationId); if (!h) return null;
  return { id: h.locationId, name: h.kind === 'house' ? 'House' : 'Apartments', kind: 'home', entry: h.entry, approach: h.approach, buildingId: h.buildingId, spaceId: h.spaceId };
}
// "Apt 201, 112 Main Street" or "64 East Avenue" (null for anything that is not a Neighborhood One home).
export function homeAddress(propertyId) {
  const h = homeByProperty(propertyId); if (!h) return null;
  const street = streetAddress(h.door, h.facing);
  const where = street ? street.text : 'Neighborhood One';
  return h.unit ? `Apt ${h.unit}, ${where}` : where;
}
