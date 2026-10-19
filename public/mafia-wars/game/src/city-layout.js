// Pure, deterministic Milestone 4 city plan. Rendering code consumes this data
// so desktop and mobile share one collision/layout topology.
export const CITY_BOUNDS = Object.freeze({ minX: -68, maxX: 68, minZ: -148, maxZ: 148 });

export const CITY_PROFILES = Object.freeze({
  desktop: Object.freeze({ key: 'desktop', activeRadius: 170, windowStride: 1, roofDetails: true }),
  mobile: Object.freeze({ key: 'mobile', activeRadius: 88, windowStride: 2, roofDetails: false }),
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
  return { id, center: { x: 0, z: centerZ }, buildings };
}

export function createCityPlan(profileName = 'desktop') {
  const profile = CITY_PROFILES[profileName] || CITY_PROFILES.desktop;
  return {
    bounds: { ...CITY_BOUNDS },
    profile,
    roads: [
      { id: 'main', x: 0, z: 0, width: 9, depth: 296 },
      { id: 'north-cross', x: 0, z: 48.5, width: 136, depth: 9 },
      { id: 'north-market', x: 0, z: 96, width: 136, depth: 9 },
      { id: 'south-cross', x: 0, z: -48.5, width: 136, depth: 9 },
      { id: 'south-market', x: 0, z: -96, width: 136, depth: 9 },
    ],
    districts: [district('north', 100, 401), district('south', -100, 809)],
    apartment: { ...APARTMENT_SITE },
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
