// NC Milestone 9: territory zones in Neighborhood One (the game's own approved 280 x 296 m boundary, src/neighborhood-housing.js), one
// per real district inside it, at the district's own centre and radius in the city plan. The civic centre (City Hall) is protected:
// never contestable, never patrolled. Shared by the bank (registry.territory_zones), the City Service and the room. Pure.
import { createCityPlan } from './city-layout.js';
import { cityPois } from './city-pois.js';
import { interiorCatalog } from './interior-catalog.js';

export const NEIGHBORHOOD_ONE_ZONES = Object.freeze([
  { zoneId: 'n1_north', districtId: 'north', name: 'North blocks' },
  { zoneId: 'n1_south', districtId: 'south', name: 'South blocks' },
  { zoneId: 'n1_east_north', districtId: 'east-residential-north', name: 'East residential (north)' },
  { zoneId: 'n1_east_south', districtId: 'east-residential-south', name: 'East residential (south)' },
  { zoneId: 'n1_west_north', districtId: 'west-mixed-north', name: 'West mixed (bank, Roots, Ammo)' },
  { zoneId: 'n1_west_south', districtId: 'west-industrial-south', name: 'West industrial (Corner Market)' },
  { zoneId: 'n1_civic', districtId: 'civic-center', name: 'Civic centre (City Hall)', protected: true },
].map((z) => Object.freeze({ protected: false, ...z })));

let cache = null;
// Each zone with its centre, radius and a patrol anchor: a walkable doorway inside the zone (a place's entry), so residents route there.
export function territoryZones(plan = createCityPlan()) {
  if (cache) return cache;
  const districts = new Map(plan.districts.map((d) => [d.id, d])), pois = cityPois(plan).filter((p) => p.entry && Number.isFinite(p.entry.x));
  const doorsteps = interiorCatalog().filter((e) => e.outside && Number.isFinite(e.outside.x)).map((e) => ({ id: e.buildingId, districtId: e.districtId, entry: e.outside }));
  cache = Object.freeze(NEIGHBORHOOD_ONE_ZONES.map((z) => {
    const d = districts.get(z.districtId), c = d.center, r = d.radius;
    const near = (list) => list.sort((a, b) => Math.hypot(a.entry.x - c.x, a.entry.z - c.z) - Math.hypot(b.entry.x - c.x, b.entry.z - c.z));
    // a doorstep in this very district first (a building's outside point), then any place's entry within the zone
    const inside = [...near(doorsteps.filter((d) => d.districtId === z.districtId)), ...near(pois.filter((p) => Math.hypot(p.entry.x - c.x, p.entry.z - c.z) <= r))];
    const anchor = inside[0] ? { x: inside[0].entry.x, z: inside[0].entry.z, near: inside[0].id } : { x: c.x, z: c.z, near: null };
    return Object.freeze({ ...z, center: { x: c.x, z: c.z }, radius: r, anchor });
  }));
  return cache;
}
export const zoneById = (zoneId) => territoryZones().find((z) => z.zoneId === zoneId) || null;
// The zone a point is in (nearest centre within its radius), or null outside Neighborhood One's zones.
export function zoneAt(x, z) {
  let best = null, bestD = Infinity;
  for (const zone of territoryZones()) { const d = Math.hypot(x - zone.center.x, z - zone.center.z); if (d <= zone.radius && d < bestD) { best = zone; bestD = d; } }
  return best;
}
// A patrol location id the resident schedule understands ('zone:<id>'), with the point residents walk to.
export const patrolLocationId = (zoneId) => `zone:${zoneId}`;
export function patrolPoi(locationId) {
  const zone = typeof locationId === 'string' && locationId.startsWith('zone:') ? zoneById(locationId.slice(5)) : null;
  if (!zone || zone.protected) return null;
  return { id: locationId, name: zone.name, kind: 'patrol', x: zone.anchor.x, z: zone.anchor.z, entry: { x: zone.anchor.x, z: zone.anchor.z } };
}
