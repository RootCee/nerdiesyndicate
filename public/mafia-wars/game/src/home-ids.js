// NC-LIFE-02A-1: the ids of Neighborhood One homes, shared by the bank (registry.properties), the City
// Service roster and the room simulation. No imports, so the City Service Worker can use it cheaply.
//   house:     nbhd1-<buildingId>             e.g. nbhd1-east-residential-north-0
//   apartment: nbhd1-<buildingId>-apt-<unit>  e.g. nbhd1-north-west-0-apt-201 (floor 2, home 01)
// A resident's home location (what scheduledPlace returns while they are at home) is home:<buildingId>;
// everything else (North Court, or no housing) stays 'north-court', exactly as before.
export const HOME_PROPERTY_PREFIX = 'nbhd1-';
export const HOME_LOCATION_PREFIX = 'home:';
export const DEFAULT_HOME_LOCATION = 'north-court';

const PROPERTY = /^nbhd1-([a-z0-9-]+?)(?:-apt-(\d)(\d{2}))?$/;

export function homePropertyId(buildingId, floor = null) {
  return floor == null ? `${HOME_PROPERTY_PREFIX}${buildingId}` : `${HOME_PROPERTY_PREFIX}${buildingId}-apt-${floor}01`;
}
export function parseHomePropertyId(propertyId) {
  const m = PROPERTY.exec(String(propertyId || ''));
  return m ? { buildingId: m[1], floor: m[2] ? Number(m[2]) : null, unit: m[2] ? `${m[2]}${m[3]}` : null } : null;
}
export const homeLocationIdFor = (buildingId) => `${HOME_LOCATION_PREFIX}${buildingId}`;
export const isHomeLocation = (locationId) => String(locationId || '').startsWith(HOME_LOCATION_PREFIX);
// The location a resident's schedule sends them to at home, from their active housing assignment.
export function homeLocationFor(propertyId) {
  const home = parseHomePropertyId(propertyId);
  return home ? homeLocationIdFor(home.buildingId) : DEFAULT_HOME_LOCATION;
}
