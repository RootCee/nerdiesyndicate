// Pure, deterministic city plan. Rendering code consumes this data so desktop
// and mobile share one collision/layout topology while choosing different
// visibility and detail budgets.
export const CITY_BOUNDS = Object.freeze({ minX: -140, maxX: 140, minZ: -148, maxZ: 148 });

export const CITY_PROFILES = Object.freeze({
  desktop: Object.freeze({ key: 'desktop', activeRadius: 92, windowStride: 1, roofDetails: true, streetLights: true }),
  mobile: Object.freeze({ key: 'mobile', activeRadius: 60, windowStride: 2, roofDetails: false, streetLights: false }),
});

export const APARTMENT_SITE = Object.freeze({
  id: 'north-court',
  name: 'North Court Apartments',
  x: 29,
  z: 100,
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
  const slots = [-28, -14, 0, 14, 28];
  for (const side of [-1, 1]) {
    for (let i = 0; i < slots.length; i++) {
      const z = centerZ + slots[i];
      const apartment = id === 'north' && side === 1 && i === 2;
      if (apartment) continue;
      const hash = (seedOffset + i * 17 + (side > 0 ? 31 : 0)) >>> 0;
      buildings.push({
        id: `${id}-${side < 0 ? 'west' : 'east'}-${i}`,
        x: side * (27 + (hash % 3)),
        z,
        width: 14 + (hash % 3),
        depth: 10 + ((hash >> 2) % 3),
        height: 7.5 + ((hash >> 4) % 4) * 2.4,
        tint: BUILDING_TINTS[hash % BUILDING_TINTS.length],
      });
    }
  }
  return { id, kind: 'legacy', center: { x: 0, z: centerZ }, radius: 48, buildings, vehicles: [] };
}

function eastResidential(id, centerZ, seedOffset) {
  const buildings = [];
  const zSlots = centerZ > 0 ? [60, 73, 86, 108, 121, 134] : [-60, -73, -86, -108, -121, -134];
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
  const vehicles = zSlots.slice(0, 3).map((z, i) => ({ id: `${id}-car-${i}`, x: 82, z: z + (i % 2 ? 3 : -3), yaw: 0 }));
  return { id, kind: 'residential', center: { x: 98, z: centerZ }, radius: 62, buildings, vehicles };
}

function westMixedUse(id, centerZ, seedOffset, industrial = false) {
  const buildings = [];
  const zSlots = centerZ > 0 ? [62, 78, 114, 132] : [-58, -88, -114, -132];
  const xSlots = [-65, -112, -128];
  let index = 0;
  for (const x of xSlots) for (const z of zSlots) {
    if (industrial && x < -100 && z > -96) continue; // reserve The Underground lot
    const hash = (seedOffset + index * 37) >>> 0;
    const kind = industrial && x < -100 ? 'warehouse' : x > -90 ? 'storefront' : 'mixed';
    buildings.push({
      id: `${id}-${index++}`,
      kind,
      x, z,
      width: kind === 'warehouse' ? 19 : 13 + (hash % 4),
      depth: kind === 'warehouse' ? 14 : 10 + ((hash >> 2) % 4),
      height: kind === 'mixed' ? 14 + ((hash >> 4) % 3) * 2.4 : kind === 'warehouse' ? 8.5 : 8 + ((hash >> 4) % 2) * 1.8,
      tint: BUILDING_TINTS[(hash + 2) % BUILDING_TINTS.length],
    });
  }
  const vehicles = zSlots.slice(0, 3).map((z, i) => ({ id: `${id}-car-${i}`, x: -82, z: z + (i % 2 ? -3 : 3), yaw: 0 }));
  return { id, kind: industrial ? 'industrial' : 'mixed', center: { x: -98, z: centerZ }, radius: 64, buildings, vehicles };
}

export function createCityPlan(profileName = 'desktop') {
  const profile = CITY_PROFILES[profileName] || CITY_PROFILES.desktop;
  return {
    bounds: { ...CITY_BOUNDS },
    profile,
    roads: [
      { id: 'main', x: 0, z: 0, width: 9, depth: 296 },
      { id: 'west-avenue', x: -88, z: 0, width: 10, depth: 296 },
      { id: 'east-avenue', x: 88, z: 0, width: 10, depth: 296 },
      { id: 'central-cross', x: 0, z: 0, width: 280, depth: 10 },
      { id: 'north-cross', x: 0, z: 48.5, width: 280, depth: 9 },
      { id: 'north-market', x: 0, z: 96, width: 280, depth: 9 },
      { id: 'south-cross', x: 0, z: -48.5, width: 280, depth: 9 },
      { id: 'south-market', x: 0, z: -96, width: 280, depth: 9 },
    ],
    districts: [
      district('north', 100, 401), district('south', -100, 809),
      eastResidential('east-residential-north', 96, 1201),
      eastResidential('east-residential-south', -96, 1601),
      westMixedUse('west-mixed-north', 96, 2203),
      westMixedUse('west-industrial-south', -96, 2801, true),
    ],
    apartment: { ...APARTMENT_SITE },
    enterableHouse: { ...ENTERABLE_HOUSE_SITE },
    originalExpansionHouses: ORIGINAL_EXPANSION_HOUSES.map((site) => ({ ...site, entry: site.entry ? { ...site.entry } : null, outsideSpawn: site.outsideSpawn ? { ...site.outsideSpawn } : null, spec: { ...site.spec } })),
    combatVenue: { ...COMBAT_VENUE_SITE },
  };
}

export function chunkVisible(chunkCenter, playerPosition, radius) {
  const dx = chunkCenter.x - playerPosition.x;
  const dz = chunkCenter.z - playerPosition.z;
  return dx * dx + dz * dz <= radius * radius;
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
