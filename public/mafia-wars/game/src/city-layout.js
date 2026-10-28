import { CITY_HALL, CIVIC_BLOCK, PARK, PARK_BLEACHERS, PARK_PAVILION } from './city-park-layout.js';
import { ACADEMY_AVENUE, ACADEMY_CHUNKS, ACADEMY_HALLS, CLOCK_TOWER, LIBRARY } from './academy-layout.js';
import { NEON_MARKET, NEON_ROADS, neonMarketDistricts } from './neon-market-layout.js';
import { CYBER_ROADS, cyberHqDistricts } from './cyber-hq-layout.js';
// Pure, deterministic city plan. Rendering code consumes this data so desktop
// and mobile share one collision/layout topology while choosing different
// visibility and detail budgets.
// Milestone 5.2C adds a complete 86 m-wide copy of the original Hood Warfare
// block east of the approved 280 m city. Its 120 m ground/street staging area
// reaches x=244 without overlapping the existing x=112 residential row.
// M7.2: the city grows east to x=420 for Academy Avenue and the Nerdie Blaq Academy (academy-layout.js).
// Stage 2: and north to z=356 for Neon Market and Cyber HQ (neon-market-layout.js, cyber-hq-layout.js).
export const CITY_BOUNDS = Object.freeze({ minX: -140, maxX: 420, minZ: -148, maxZ: NEON_MARKET.maxZ });

export const ORIGINAL_NEIGHBORHOOD_LAYOUT = Object.freeze({
  id: 'hood-original-neighborhood', centerX: 0, centerZ: 0,
  lotsPerSide: 10, houseCount: 20, lotSpacing: 8,
  footprint: Object.freeze({ minX: -43, maxX: 43, minZ: -46, maxZ: 46 }),
});

export const DUPLICATED_ORIGINAL_NEIGHBORHOOD = Object.freeze({
  id: 'hood-duplicate-neighborhood', centerX: 184, centerZ: 0,
  houseCount: ORIGINAL_NEIGHBORHOOD_LAYOUT.houseCount,
  footprint: Object.freeze({ minX: 141, maxX: 227, minZ: -46, maxZ: 46 }),
  renderRadius: Object.freeze({ desktop: 112, mobile: 82 }),
  enterableHouseId: 'hood-duplicate-west-5',
});

export const DUPLICATED_ENTERABLE_HOUSE_SITE = Object.freeze({
  id: DUPLICATED_ORIGINAL_NEIGHBORHOOD.enterableHouseId,
  name: '184 East Block House',
  districtId: DUPLICATED_ORIGINAL_NEIGHBORHOOD.id,
  x: 165, z: 4, width: 12, depth: 10, height: 6.8, interiorY: 85,
  facing: 'east', useExistingExterior: true,
  entry: Object.freeze({ x: 173.25, y: 0, z: 5.55 }),
  outsideSpawn: Object.freeze({ x: 173.55, y: 0, z: 5.55 }),
  outsideYaw: -Math.PI / 2,
});

export const CITY_PROFILES = Object.freeze({
  desktop: Object.freeze({ key: 'desktop', activeRadius: 92, windowStride: 1, roofDetails: true, streetLights: true }),
  mobile: Object.freeze({ key: 'mobile', activeRadius: 60, windowStride: 2, roofDetails: false, streetLights: false }),
});

// M7.0A: moved north 12 m. At z 100 the building stood on the north-market road (126 m2) and its
// entrance was in the traffic lane. Its interior, doors, and safe zone are derived from this site.
// Stage 2: apartment and loft buildings have six storeys of 3.4 m over a 0.6 m base (the showcase draws
// one row of windows per storey from the height).
export const APARTMENT_STOREYS = 6, APARTMENT_STOREY_HEIGHT = 3.4, APARTMENT_TOWER_HEIGHT = APARTMENT_STOREYS * APARTMENT_STOREY_HEIGHT + 0.6;

export const APARTMENT_SITE = Object.freeze({
  id: 'north-court',
  name: 'North Court Apartments',
  x: 29,
  z: 112,
  width: 18,
  depth: 13,
  height: 15,
  interiorY: 40,
});

export const COMBAT_VENUE_SITE = Object.freeze({
  id: 'the-underground',
  name: 'The Underground',
  x: -112,
  z: -72,
  width: 27,
  depth: 19,
  height: 10.5,
});

export const ENTERABLE_HOUSE_SITE = Object.freeze({
  id: 'east-73',
  name: '73 East Market House',
  districtId: 'east-residential-north',
  x: 112,
  z: 73,
  width: 11,
  depth: 8.5,
  height: 6.2,
  interiorY: 55,
  facing: 'west',
});

// Two original Hood Warfare kit houses extend the first block sideways along
// North Cross. They remain ordinary destruction.js structures (not decorative
// city shells); this shared plan only supplies their stable identity and the
// interaction position for the west house's separately loaded interior.
export const ORIGINAL_EXPANSION_HOUSES = Object.freeze([
  Object.freeze({
    id: 'hood-cross-west', name: '47 North Cross House', x: -50, z: 62,
    rotY: Math.PI / 2, facing: 'south', enterable: true, interiorY: 70,
    entry: Object.freeze({ x: -48.45, y: 0, z: 53.75 }),
    outsideSpawn: Object.freeze({ x: -48.45, y: 0, z: 53.45 }), outsideYaw: 0,
    spec: Object.freeze({ floors: 2, brick: true, worn: false, tint: 0xffffff, ridgeX: true, porch: true, chimney: true }),
  }),
  Object.freeze({
    id: 'hood-cross-east', name: '51 North Cross House', x: 50, z: 62,
    rotY: Math.PI / 2, facing: 'south', enterable: false,
    spec: Object.freeze({ floors: 2, brick: false, worn: true, tint: 0xd8e8f4, ridgeX: true, porch: true, chimney: false }),
  }),
]);

const BUILDING_TINTS = [0x8d654c, 0x6d7884, 0x75604e, 0x7f7467, 0x665f58, 0x73514a];

function district(id, centerZ, seedOffset) {
  const buildings = [];
  // M7.0A: slots between the streets. The old evenly spaced slots (centre +/- 0, 14, 28) put
  // the middle building on the market road and others on its sidewalks. Two buildings sit
  // between the cross street and the market street, three beyond the market street; on the
  // north block's east side North Court takes the first of those three. The nearest pair stays
  // beyond |z| 64 so the district still streams in more than 40 m before it can be reached (mobile).
  const north = centerZ > 0, abs = (zs) => zs.map((z) => (north ? z : -z));
  for (const side of [-1, 1]) {
    const apartmentColumn = id === 'north' && side === 1;
    const slots = abs(apartmentColumn ? [71, 83, null, 127, 141] : [71, 83, 110, 124, 138]);
    for (let i = 0; i < slots.length; i++) {
      if (slots[i] === null) continue; // North Court Apartments
      const z = slots[i];
      const hash = (seedOffset + i * 17 + (side > 0 ? 31 : 0)) >>> 0;
      buildings.push({
        id: `${id}-${side < 0 ? 'west' : 'east'}-${i}`,
        x: side * (27 + (hash % 3)),
        z,
        width: 14 + (hash % 3),
        depth: 10 + ((hash >> 2) % 3),
        height: APARTMENT_TOWER_HEIGHT, // Stage 2: six-storey apartment buildings (3.4 m floors over a 0.6 m base)
        tint: BUILDING_TINTS[hash % BUILDING_TINTS.length],
      });
    }
  }
  return { id, kind: 'legacy', center: { x: 0, z: centerZ }, radius: 48, buildings, vehicles: [] };
}

function eastResidential(id, centerZ, seedOffset) {
  const buildings = [];
  // M7.0A: the third slot moved in 1 m (86 -> 85) so those houses clear the market street's sidewalk.
  const zSlots = centerZ > 0 ? [60, 73, 85, 108, 121, 134] : [-60, -73, -85, -108, -121, -134];
  // Two parallel rows face the existing east avenue. The cross and market
  // streets already span the full city, so both rows connect without changing
  // Neighborhood One's approved 280 x 296 metre boundary.
  const rows = [
    { x: 65, facing: 'east' },
    { x: 112, facing: 'west' },
  ];
  let index = 0;
  for (const row of rows) for (const z of zSlots) {
    const hash = (seedOffset + index * 29) >>> 0;
    const enterable = id === ENTERABLE_HOUSE_SITE.districtId && row.x === ENTERABLE_HOUSE_SITE.x && z === ENTERABLE_HOUSE_SITE.z;
    buildings.push({
      id: `${id}-${index++}`,
      kind: 'house',
      x: row.x, z,
      width: enterable ? ENTERABLE_HOUSE_SITE.width : 10.5 + (hash % 2),
      depth: enterable ? ENTERABLE_HOUSE_SITE.depth : 8 + ((hash >> 2) % 2) * 0.5,
      height: enterable ? ENTERABLE_HOUSE_SITE.height : 6.2 + ((hash >> 4) % 2) * 1.1,
      facing: row.facing,
      driveway: true,
      enterableHouseId: enterable ? ENTERABLE_HOUSE_SITE.id : null,
      tint: BUILDING_TINTS[hash % BUILDING_TINTS.length],
    });
  }
  // parked in the avenue's curb lane (they used to stand on the sidewalk at x = 82)
  const vehicles = zSlots.slice(0, 3).map((z, i) => ({ id: `${id}-car-${i}`, x: 84.2, z: z + (i % 2 ? 3 : -3), yaw: 0 }));
  return { id, kind: 'residential', center: { x: 98, z: centerZ }, radius: 62, buildings, vehicles };
}

function westMixedUse(id, centerZ, seedOffset, industrial = false) {
  const buildings = [];
  // M7.0A: the south slots mirror the north (-58 and -88 put storefronts on the south-cross sidewalk and the south-market road)
  const zSlots = centerZ > 0 ? [62, 78, 114, 132] : [-62, -78, -114, -132];
  const xSlots = [-65, -112, -128];
  let index = 0;
  for (const x of xSlots) for (const z of zSlots) {
    if (industrial && x < -100 && z > -96) continue; // reserve The Underground lot
    const hash = (seedOffset + index * 37) >>> 0;
    const kind = industrial && x < -100 ? 'warehouse' : x > -90 ? 'storefront' : 'mixed';
    buildings.push({
      id: `${id}-${index++}`,
      kind,
      // M7.0A: 19 m warehouses 16 m apart overlapped by 3 m; they now stand 20 m apart (-106, -126)
      x: kind === 'warehouse' ? (x === -112 ? -106 : -126) : x, z,
      width: kind === 'warehouse' ? 19 : 13 + (hash % 4),
      depth: kind === 'warehouse' ? 14 : 10 + ((hash >> 2) % 4),
      height: kind === 'mixed' ? APARTMENT_TOWER_HEIGHT : kind === 'warehouse' ? 8.5 : 8 + ((hash >> 4) % 2) * 1.8,
      tint: BUILDING_TINTS[(hash + 2) % BUILDING_TINTS.length],
    });
  }
  const vehicles = zSlots.slice(0, 3).map((z, i) => ({ id: `${id}-car-${i}`, x: -84.2, z: z + (i % 2 ? -3 : 3), yaw: 0 }));
  return { id, kind: industrial ? 'industrial' : 'mixed', center: { x: -98, z: centerZ }, radius: 64, buildings, vehicles };
}

function centralCrossSegments() {
  const blocks = [ORIGINAL_NEIGHBORHOOD_LAYOUT.footprint, DUPLICATED_ORIGINAL_NEIGHBORHOOD.footprint].sort((a, b) => a.minX - b.minX);
  const spans = []; let cursor = CITY_BOUNDS.minX;
  for (const b of blocks) { if (b.minX > cursor) spans.push([cursor, b.minX]); cursor = b.maxX; }
  // M7.2: the eastmost span ends at Academy Avenue (it used to stop short at the old city edge, x 244)
  if (cursor < ACADEMY_AVENUE.x) spans.push([cursor, ACADEMY_AVENUE.x]);
  // M7.1A: the westmost span stopped at the back of the Hood (a dead end); it now ends at West
  // Avenue's east curb, and the civic block takes its place
  if (spans[0][1] === ORIGINAL_NEIGHBORHOOD_LAYOUT.footprint.minX) spans[0][1] = CIVIC_BLOCK.minX - 2;
  return spans.map(([a, b], i) => ({ id: i === 0 ? 'central-cross' : `central-cross-${i}`, x: (a + b) / 2, z: 0, width: b - a, depth: 10 }));
}

// M7.0A: each city building faces a street. A building keeps its side if a street lies within
// 18 m of it there (the legacy blocks face the main road, the east rows their avenue); otherwise
// it turns to its nearest street (the bank and the west storefronts faced empty lots).
export const FRONT_NORMALS = Object.freeze({ east: Object.freeze([1, 0]), west: Object.freeze([-1, 0]), north: Object.freeze([0, 1]), south: Object.freeze([0, -1]) });
export function streetGaps(building, roads) {
  const minX = building.x - building.width / 2, maxX = building.x + building.width / 2, minZ = building.z - building.depth / 2, maxZ = building.z + building.depth / 2;
  const gaps = { east: Infinity, west: Infinity, north: Infinity, south: Infinity };
  for (const r of roads) {
    const rx0 = r.x - r.width / 2, rx1 = r.x + r.width / 2, rz0 = r.z - r.depth / 2, rz1 = r.z + r.depth / 2;
    if (r.depth > r.width && building.z >= rz0 && building.z <= rz1) { if (rx0 >= maxX) gaps.east = Math.min(gaps.east, rx0 - maxX); if (rx1 <= minX) gaps.west = Math.min(gaps.west, minX - rx1); }
    if (r.width > r.depth && building.x >= rx0 && building.x <= rx1) { if (rz0 >= maxZ) gaps.north = Math.min(gaps.north, rz0 - maxZ); if (rz1 <= minZ) gaps.south = Math.min(gaps.south, minZ - rz1); }
  }
  return gaps;
}
export function buildingFront(building, roads) {
  const legacy = building.facing === 'east' || building.facing === 'west' ? building.facing : building.x > 0 ? 'west' : 'east';
  const gaps = streetGaps(building, roads);
  if (gaps[legacy] <= 18) return legacy;
  return Object.entries(gaps).sort((a, b) => a[1] - b[1])[0][0];
}

const ACADEMY_CHUNK_BUILDINGS = Object.freeze({ 'academy-north': [ACADEMY_HALLS[0], ACADEMY_HALLS[1], CLOCK_TOWER], 'academy-south': [ACADEMY_HALLS[2], ACADEMY_HALLS[3]], 'academy-library': [LIBRARY], 'academy-green': [] });

export function createCityPlan(profileName = 'desktop') {
  const profile = CITY_PROFILES[profileName] || CITY_PROFILES.desktop;
  const westToAvenue = { x: (CITY_BOUNDS.minX + ACADEMY_AVENUE.x) / 2, width: ACADEMY_AVENUE.x - CITY_BOUNDS.minX };
  const plan = {
    bounds: { ...CITY_BOUNDS },
    profile,
    roads: [
      { id: 'main', x: 0, z: 0, width: 9, depth: 296 },
      { id: 'west-avenue', x: -88, z: 0, width: 10, depth: 296 },
      { id: 'east-avenue', x: 88, z: 0, width: 10, depth: 296 },
      // M7.1A: its stub north of North Cross (a dead end) gave way to Central Park
      { id: 'hood-duplicate-main', x: DUPLICATED_ORIGINAL_NEIGHBORHOOD.centerX, z: (-70 + PARK.minZ - 2) / 2, width: 9, depth: PARK.minZ - 2 + 70 },
      { id: 'hood-duplicate-west-alley', x: DUPLICATED_ORIGINAL_NEIGHBORHOOD.centerX - 35.5, z: 0, width: 4, depth: 90 },
      { id: 'hood-duplicate-east-alley', x: DUPLICATED_ORIGINAL_NEIGHBORHOOD.centerX + 35.5, z: 0, width: 4, depth: 90 },
      // M7.0A: the central cross street stops at both Hood Warfare blocks instead of running
      // under the houses either side of it (their lots 4 and 5 meet at z = 0).
      ...centralCrossSegments(),
      // M7.2: the cross streets and South Market end at Academy Avenue (T junctions): none runs into the campus
      { id: 'academy-avenue', x: ACADEMY_AVENUE.x, z: ACADEMY_AVENUE.z, width: ACADEMY_AVENUE.width, depth: ACADEMY_AVENUE.depth },
      { id: 'north-cross', x: westToAvenue.x, z: 48.5, width: westToAvenue.width, depth: 9 },
      // M7.1A: North Market ends at the park entrance (x 118); its dead-end east section became Central Park
      { id: 'north-market', x: (CITY_BOUNDS.minX + PARK.minX - 2) / 2, z: 96, width: PARK.minX - 2 - CITY_BOUNDS.minX, depth: 9 },
      { id: 'south-cross', x: westToAvenue.x, z: -48.5, width: westToAvenue.width, depth: 9 },
      { id: 'south-market', x: westToAvenue.x, z: -96, width: westToAvenue.width, depth: 9 },
      // Stage 2: Neon Market's streets (Neon Boulevard, Neon Cross, Neon Row, the avenues carried north)
      ...NEON_ROADS.map((r) => ({ ...r })),
      // Stage 2: Cyber HQ's streets (east of Neon Market; Academy Avenue carried north)
      ...CYBER_ROADS.map((r) => ({ ...r })),
    ],
    districts: [
      district('north', 100, 401), district('south', -100, 809),
      eastResidential('east-residential-north', 96, 1201),
      eastResidential('east-residential-south', -96, 1601),
      westMixedUse('west-mixed-north', 96, 2203),
      westMixedUse('west-industrial-south', -96, 2801, true),
      // M7.1A: the Civic Center (City Hall) and Nerdie Central Park (its pavilion and bleachers)
      { id: CIVIC_BLOCK.id, kind: 'civic', center: { x: (CIVIC_BLOCK.minX + CIVIC_BLOCK.maxX) / 2, z: 0 }, radius: 48, buildings: [{ ...CITY_HALL }], vehicles: [] },
      { id: PARK.id, kind: 'park', center: { x: (PARK.minX + PARK.maxX) / 2, z: (PARK.minZ + PARK.maxZ) / 2 }, radius: 72, buildings: [{ ...PARK_PAVILION }, { ...PARK_BLEACHERS }], vehicles: [] },
      // M7.2: the Nerdie Blaq Academy, in four render chunks (academy-layout.js ACADEMY_CHUNKS)
      ...ACADEMY_CHUNKS.map((c) => ({ id: c.id, kind: 'academy', center: { ...c.center }, radius: c.radius, buildings: ACADEMY_CHUNK_BUILDINGS[c.id].map((b) => ({ ...b })), vehicles: [] })),
      // Stage 2: Neon Market, one render chunk per block
      ...neonMarketDistricts(),
      // Stage 2: Cyber HQ, one render chunk per block
      ...cyberHqDistricts(),
      { id: DUPLICATED_ORIGINAL_NEIGHBORHOOD.id, kind: 'original-copy', center: { x: DUPLICATED_ORIGINAL_NEIGHBORHOOD.centerX, z: 0 }, radius: 58, buildings: [], vehicles: [] },
    ],
    apartment: { ...APARTMENT_SITE },
    enterableHouse: { ...ENTERABLE_HOUSE_SITE },
    originalExpansionHouses: ORIGINAL_EXPANSION_HOUSES.map((site) => ({ ...site, entry: site.entry ? { ...site.entry } : null, outsideSpawn: site.outsideSpawn ? { ...site.outsideSpawn } : null, spec: { ...site.spec } })),
    duplicatedOriginalNeighborhood: { ...DUPLICATED_ORIGINAL_NEIGHBORHOOD, footprint: { ...DUPLICATED_ORIGINAL_NEIGHBORHOOD.footprint }, renderRadius: { ...DUPLICATED_ORIGINAL_NEIGHBORHOOD.renderRadius } },
    duplicatedEnterableHouse: { ...DUPLICATED_ENTERABLE_HOUSE_SITE, entry: { ...DUPLICATED_ENTERABLE_HOUSE_SITE.entry }, outsideSpawn: { ...DUPLICATED_ENTERABLE_HOUSE_SITE.outsideSpawn } },
    combatVenue: { ...COMBAT_VENUE_SITE },
  };
  // (M7.1A park buildings face what they serve, not a street: fixedFront)
  for (const district of plan.districts) for (const building of district.buildings) building.front = building.fixedFront || buildingFront(building, plan.roads);
  return plan;
}

export function chunkVisible(chunkCenter, playerPosition, radius) {
  const dx = chunkCenter.x - playerPosition.x;
  const dz = chunkCenter.z - playerPosition.z;
  return dx * dx + dz * dz <= radius * radius;
}

export function selectStreamingDistrict(groups, playerPosition, radius, currentId = null, hysteresis = 8) {
  const distances = groups.map((group) => ({
    id: group.id,
    distance: Math.hypot(playerPosition.x - group.centerX, playerPosition.z - group.centerZ),
  }));
  const candidates = distances.filter((group) => group.distance <= radius).sort((a, b) => a.distance - b.distance);
  const nearest = candidates[0] || null;
  if (!nearest) return null;
  const current = currentId ? distances.find((group) => group.id === currentId) : null;
  if (!current || current.distance > radius) return nearest.id;
  return nearest.id !== current.id && nearest.distance + hysteresis < current.distance ? nearest.id : current.id;
}

export function insideInteractionRange(playerPosition, target, radius = 2.4) {
  const dx = playerPosition.x - target.x;
  const dy = playerPosition.y - target.y;
  const dz = playerPosition.z - target.z;
  return dx * dx + dy * dy + dz * dz <= radius * radius;
}

export function interactionCooldownReady(now, readyAt) {
  return Number.isFinite(now) && Number.isFinite(readyAt) && now >= readyAt;
}

export function shouldTransitionApartment(near, wantsInteract, cooldownReady) {
  return !!near && !!wantsInteract && !!cooldownReady;
}

// Intersect the camera-to-character segment with the underside of the separately
// loaded ceiling slab. The point lets the apartment fade one cutaway panel
// instead of making the whole roof disappear.
export function ceilingIntersection(camera, target, bounds, nearClearance = 1.05) {
  if (!camera || !target || !bounds || target.y >= bounds.minY) return null;
  const cameraInside = camera.x >= bounds.minX && camera.x <= bounds.maxX && camera.z >= bounds.minZ && camera.z <= bounds.maxZ;
  // A perspective camera can have its center just below the slab while the
  // near-plane/frustum is already inside it. Treat that upper indoor band as
  // obstructed rather than waiting for the center ray to cross the ceiling.
  if (cameraInside && camera.y < bounds.minY && camera.y >= bounds.minY - Math.max(0, nearClearance)) return { x: camera.x, z: camera.z };
  if (camera.y <= bounds.minY) return null;
  const dy = camera.y - target.y;
  if (dy <= 1e-6) return null;
  const t = (camera.y - bounds.minY) / dy;
  if (t < 0 || t > 1) return null;
  const x = camera.x + (target.x - camera.x) * t;
  const z = camera.z + (target.z - camera.z) * t;
  return x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ ? { x, z } : null;
}

export function ceilingObstructsView(camera, target, bounds, nearClearance = 1.05) {
  return !!ceilingIntersection(camera, target, bounds, nearClearance);
}
