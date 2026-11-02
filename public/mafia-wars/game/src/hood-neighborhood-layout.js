const GARAGE_LOTS = Object.freeze([0, 1, 3, 4, 5, 7, 8, 9]);

export const ORIGINAL_STYLE_NEIGHBORHOODS = Object.freeze([
  Object.freeze({
    id: 'hood-dark-alley-neighborhood',
    districtId: 'dark-alley',
    housePrefix: 'hood-dark-alley',
    centerX: -440,
    centerZ: 628,
    houseCount: 20,
    lotsPerSide: 10,
    footprint: Object.freeze({ minX: -483, maxX: -397, minZ: 582, maxZ: 674 }),
    renderRadius: Object.freeze({ desktop: 112, mobile: 82 }),
    garageLots: GARAGE_LOTS,
  }),
  Object.freeze({
    id: 'hood-neon-market-neighborhood',
    districtId: 'neon-market',
    housePrefix: 'hood-neon-market',
    centerX: -70,
    centerZ: 628,
    houseCount: 20,
    lotsPerSide: 10,
    footprint: Object.freeze({ minX: -113, maxX: -27, minZ: 582, maxZ: 674 }),
    renderRadius: Object.freeze({ desktop: 112, mobile: 82 }),
    garageLots: GARAGE_LOTS,
  }),
  Object.freeze({
    id: 'hood-cyber-hq-neighborhood',
    districtId: 'cyber-hq',
    housePrefix: 'hood-cyber-hq',
    centerX: 336,
    centerZ: 628,
    houseCount: 20,
    lotsPerSide: 10,
    footprint: Object.freeze({ minX: 293, maxX: 379, minZ: 582, maxZ: 674 }),
    renderRadius: Object.freeze({ desktop: 112, mobile: 82 }),
    garageLots: GARAGE_LOTS,
  }),
]);

const NORTH_BOUND = 704;
const LOWER_ARTERIAL_Z = 574;
const UPPER_ARTERIAL_Z = 680;
export const HOOD_FRONTAGE = Object.freeze({ sidewalkWidth: 2, walkwayWidth: 1.2, houseFront: 13.8, garageFront: 43.4, roadOverlap: 0.5 });

const roads = [
  { id: 'hood-expansion-west-spine', x: -534, z: (552 + UPPER_ARTERIAL_Z) / 2, width: 10, depth: UPPER_ARTERIAL_Z - 552, roadClass: 'collector' },
  { id: 'hood-expansion-east-spine', x: 470, z: (552 + UPPER_ARTERIAL_Z) / 2, width: 10, depth: UPPER_ARTERIAL_Z - 552, roadClass: 'collector' },
  { id: 'hood-expansion-south-arterial', x: (-534 + 470) / 2, z: LOWER_ARTERIAL_Z, width: 1004, depth: 16, roadClass: 'arterial' },
  { id: 'hood-expansion-north-arterial', x: (-534 + 470) / 2, z: UPPER_ARTERIAL_Z, width: 1004, depth: 16, roadClass: 'arterial' },
  { id: 'hood-dark-west-collector-extension', x: -479, z: (552 + LOWER_ARTERIAL_Z) / 2, width: 10, depth: LOWER_ARTERIAL_Z - 552, roadClass: 'collector' },
  { id: 'hood-neon-collector-extension', x: -70, z: (552 + LOWER_ARTERIAL_Z) / 2, width: 10, depth: LOWER_ARTERIAL_Z - 552, roadClass: 'collector' },
  { id: 'hood-cyber-collector-extension', x: 392, z: (552 + LOWER_ARTERIAL_Z) / 2, width: 10, depth: LOWER_ARTERIAL_Z - 552, roadClass: 'collector' },
  { id: 'hood-dark-transition-collector', x: -364, z: 252, width: 48, depth: 10, roadClass: 'collector' },
];

for (const neighborhood of ORIGINAL_STYLE_NEIGHBORHOODS) {
  const { id, centerX, centerZ } = neighborhood;
  roads.push(
    { id: `${id}-main-street`, x: centerX, z: (LOWER_ARTERIAL_Z + UPPER_ARTERIAL_Z) / 2, width: 10, depth: UPPER_ARTERIAL_Z - LOWER_ARTERIAL_Z, roadClass: 'residential' },
    { id: `${id}-west-street`, x: centerX - 51, z: centerZ, width: 10, depth: 94, roadClass: 'residential' },
    { id: `${id}-east-street`, x: centerX + 51, z: centerZ, width: 10, depth: 94, roadClass: 'residential' },
    { id: `${id}-south-cross-street`, x: centerX, z: 581, width: 120, depth: 10, roadClass: 'residential' },
    { id: `${id}-north-cross-street`, x: centerX, z: 675, width: 120, depth: 10, roadClass: 'residential' },
    { id: `${id}-parking-access`, x: centerX + 64.5, z: centerZ, width: 27, depth: 8, roadClass: 'service' },
  );
  for (const side of [-1, 1]) for (const index of neighborhood.garageLots) {
    const z = centerZ - 40 + index * 8 + 4;
    const driveway = hoodDriveway(neighborhood, side, z, roads);
    roads.push({
      id: `${id}-driveway-${side < 0 ? 'west' : 'east'}-${index}`,
      x: driveway.x, z,
      width: driveway.width,
      depth: driveway.depth,
      roadClass: 'driveway',
    });
  }
}

export const HOOD_EXPANSION_ROADS = Object.freeze(roads.map((road) => Object.freeze(road)));
export const HOOD_EXPANSION_BOUNDS = Object.freeze({ minZ: 356, maxZ: NORTH_BOUND });

export const HOOD_EXPANSION_DRIVING_LOOP = Object.freeze([
  Object.freeze({ x: 0, z: 0 }),
  Object.freeze({ x: 0, z: 156 }),
  Object.freeze({ x: -70, z: 156 }),
  Object.freeze({ x: -70, z: 252 }),
  Object.freeze({ x: -251, z: 252 }),
  Object.freeze({ x: -251, z: 302 }),
  Object.freeze({ x: -306, z: 302 }),
  Object.freeze({ x: -306, z: 252 }),
  Object.freeze({ x: -534, z: 252 }),
  Object.freeze({ x: -534, z: 680 }),
  Object.freeze({ x: 470, z: 680 }),
  Object.freeze({ x: 470, z: 574 }),
  Object.freeze({ x: 392, z: 574 }),
  Object.freeze({ x: 392, z: 252 }),
  Object.freeze({ x: 193, z: 252 }),
  Object.freeze({ x: 193, z: 290 }),
  Object.freeze({ x: 81, z: 290 }),
  Object.freeze({ x: 81, z: 252 }),
  Object.freeze({ x: -158, z: 252 }),
  Object.freeze({ x: -158, z: 148 }),
  Object.freeze({ x: -88, z: 148 }),
  Object.freeze({ x: -88, z: -48.5 }),
  Object.freeze({ x: 0, z: -48.5 }),
  Object.freeze({ x: 0, z: 0 }),
]);

export const HOOD_EXPANSION_PARKING = Object.freeze(ORIGINAL_STYLE_NEIGHBORHOODS.map(({ id, centerX, centerZ }) => Object.freeze({
  id: `${id}-public-parking`,
  minX: centerX + 78,
  maxX: centerX + 98,
  minZ: centerZ - 12,
  maxZ: centerZ + 12,
})));

// The restored houses retain Hood Warfare's lot positions, but their public
// streets are 10 m wide rather than the original block's 9 m road. Derive the
// yard connection from the authoritative road instead of ROAD_HALF constants.
export function hoodFrontage(neighborhood, side, z, roadList = HOOD_EXPANSION_ROADS) {
  const road = roadList.find((item) => item.id === `${neighborhood.id}-main-street`);
  if (!road) throw new Error(`Missing Hood frontage road: ${neighborhood.id}`);
  const direction = side < 0 ? -1 : 1;
  const sidewalkEdge = neighborhood.centerX + direction * (road.width / 2 + HOOD_FRONTAGE.sidewalkWidth);
  const houseEdge = neighborhood.centerX + direction * HOOD_FRONTAGE.houseFront;
  return Object.freeze({
    roadId: road.id, side, z,
    x: (sidewalkEdge + houseEdge) / 2,
    width: Math.abs(houseEdge - sidewalkEdge), depth: HOOD_FRONTAGE.walkwayWidth,
    minX: Math.min(sidewalkEdge, houseEdge), maxX: Math.max(sidewalkEdge, houseEdge),
    minZ: z - HOOD_FRONTAGE.walkwayWidth / 2, maxZ: z + HOOD_FRONTAGE.walkwayWidth / 2,
  });
}

export function hoodDriveway(neighborhood, side, z, roadList = HOOD_EXPANSION_ROADS) {
  const road = roadList.find((item) => item.id === `${neighborhood.id}-${side < 0 ? 'west' : 'east'}-street`);
  if (!road) throw new Error(`Missing Hood driveway road: ${neighborhood.id}`);
  const direction = side < 0 ? -1 : 1;
  const streetEdge = road.x - direction * road.width / 2;
  const garageEdge = neighborhood.centerX + direction * HOOD_FRONTAGE.garageFront;
  const minX = Math.min(garageEdge, streetEdge) - HOOD_FRONTAGE.roadOverlap / 2;
  const maxX = Math.max(garageEdge, streetEdge) + HOOD_FRONTAGE.roadOverlap / 2;
  return Object.freeze({ x: (minX + maxX) / 2, z, width: maxX - minX, depth: 3.1, minX, maxX, minZ: z - 1.55, maxZ: z + 1.55 });
}
