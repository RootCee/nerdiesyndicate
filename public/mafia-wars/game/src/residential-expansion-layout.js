import { DARK_ROADS, DARK_ALLEY } from './dark-alley-layout.js';
import { NEON_ROADS, NEON_MARKET } from './neon-market-layout.js';
import { CYBER_ROADS, CYBER_HQ } from './cyber-hq-layout.js';

export const RESIDENTIAL_EXPANSION_BOUNDS = Object.freeze({ minZ: 356, maxZ: 552 });

const ROAD_EXTENT = Object.freeze({ entryZ: 386, entryDepth: 8, northEndZ: 552, crossStreets: [400, 474, 546] });
const roadById = (roads, id) => {
  const road = roads.find((item) => item.id === id);
  if (!road) throw new Error(`Missing residential expansion connector: ${id}`);
  return road;
};

const CONNECTOR_ROADS = Object.freeze([
  ...['dark-west-way', 'dark-market-street', 'dark-service-alley', 'dark-rim'].map((id) => ({ road: roadById(DARK_ROADS, id), district: DARK_ALLEY })),
  ...['neon-west-avenue', 'neon-main', 'neon-east-avenue', 'neon-lane'].map((id) => ({ road: roadById(NEON_ROADS, id), district: NEON_MARKET })),
  ...['cyber-avenue', 'cyber-way', 'circuit-street'].map((id) => ({ road: roadById(CYBER_ROADS, id), district: CYBER_HQ })),
]);

export const RESIDENTIAL_EXPANSION_ROADS = Object.freeze(CONNECTOR_ROADS.flatMap(({ road, district }) => {
  const start = road.z + road.depth / 2;
  const approachEnd = ROAD_EXTENT.northEndZ;
  const districtConnectors = CONNECTOR_ROADS.filter((connector) => connector.district === district).map((connector) => connector.road);
  const entryMinX = Math.min(district.minX, ...districtConnectors.map((connector) => connector.x - connector.width / 2));
  const entryMaxX = Math.max(district.maxX, ...districtConnectors.map((connector) => connector.x + connector.width / 2));
  return [
    Object.freeze({
      id: `residential-approach-${road.id}`,
      x: road.x,
      z: (start + approachEnd) / 2,
      width: road.width,
      depth: approachEnd - start,
      ...(road.alley ? { alley: true } : {}),
      ...(road.sidewalks ? { sidewalks: true } : {}),
    }),
    ...(road.id === ({ [DARK_ALLEY.id]: 'dark-rim', [NEON_MARKET.id]: 'neon-lane', [CYBER_HQ.id]: 'circuit-street' })[district.id]
      ? [
        Object.freeze({ id: `residential-${district.id}-entry`, x: (entryMinX + entryMaxX) / 2, z: ROAD_EXTENT.entryZ, width: entryMaxX - entryMinX, depth: ROAD_EXTENT.entryDepth }),
        ...ROAD_EXTENT.crossStreets.map((z) => Object.freeze({
          id: `residential-${district.id}-cross-${z}`,
          x: (district.minX + district.maxX) / 2,
          z,
          width: district.maxX - district.minX,
          depth: 8,
        })),
      ]
      : []),
  ];
}));

export const RESIDENTIAL_GREENWAY_PATHS = Object.freeze([-275, 133].flatMap((x, index) => {
  const id = index === 0 ? 'dark-neon' : 'neon-cyber';
  const minX = index === 0 ? -340 : 70, maxX = index === 0 ? -210 : 196;
  const crossings = [386, 400, 474, 546];
  return [
    ...crossings.map((z) => Object.freeze({
      id: `greenway-${id}-cross-${z}`, axis: 'z', c: z, a0: minX, a1: maxX,
      x: (minX + maxX) / 2, z, width: maxX - minX, depth: 3,
    })),
    Object.freeze({
      id: `greenway-${id}-spine`, axis: 'x', c: x, a0: 386, a1: 546,
      x, z: 466, width: 3, depth: 160,
    }),
  ];
}));

const HOME_COLUMNS = Object.freeze({
  'dark-alley': [-507, -450, -406, -361],
  'neon-market': [-187, -114, -26, 42],
  'cyber-hq': [219, 290, 350, 430],
});
const HOME_ROWS = Object.freeze([
  Object.freeze({ z: 414, front: 'south' }),
  Object.freeze({ z: 436, front: 'north' }),
  Object.freeze({ z: 458, front: 'north' }),
]);
const HOME_STYLE = Object.freeze({
  'dark-alley': { style: 'dark-alley-residential', propertyTier: 'rowhouse', tint: 0x626267 },
  'neon-market': { style: 'neon-residential', propertyTier: 'family', tint: 0xc07fb6 },
  'cyber-hq': { style: 'cyber-residential', propertyTier: 'estate', tint: 0x8fa9bb },
});

export const RESIDENTIAL_EXPANSION_HOMES = Object.freeze(Object.entries(HOME_COLUMNS).flatMap(([districtId, columns]) =>
  HOME_ROWS.flatMap((row, rowIndex) => columns.map((x, columnIndex) => {
    const destructible = (rowIndex + columnIndex) % 2 === 0;
    const width = columnIndex % 2 ? 14 : 12;
    const depth = rowIndex === 1 ? 12 : 11;
    return Object.freeze({
      id: `residential-${districtId}-home-${rowIndex * columns.length + columnIndex + 1}`,
      name: `${districtId.replaceAll('-', ' ')} home ${rowIndex * columns.length + columnIndex + 1}`,
      kind: 'house',
      districtId,
      x,
      z: row.z,
      width,
      depth,
      height: destructible ? 11.1 : 8.7,
      front: row.front,
      fixedFront: row.front,
      propertyTier: HOME_STYLE[districtId].propertyTier,
      style: HOME_STYLE[districtId].style,
      residentialStyle: HOME_STYLE[districtId].style,
      tint: HOME_STYLE[districtId].tint,
      destructible,
    });
  })),
));

const PARCEL_ROWS = Object.freeze([494, 526]);
const parcel = (districtId, index, x, z, width) => Object.freeze({
  id: `future-${districtId}-${String(index).padStart(2, '0')}`,
  districtId,
  x,
  z,
  width,
  depth: 32,
  minX: x - width / 2,
  maxX: x + width / 2,
  minZ: z - 16,
  maxZ: z + 16,
});

function parcelsFor(districtId, rowSpecs) {
  let index = 0;
  return Object.freeze(rowSpecs.flatMap(({ z, lots }) => lots.map(([x, width]) => parcel(districtId, ++index, x, z, width))));
}

const DARK_PARCEL_ROWS = Object.freeze([
  Object.freeze({ z: PARCEL_ROWS[0], lots: Object.freeze([[-507, 30], [-450, 30], [-406, 20], [-361, 30]]) }),
  Object.freeze({ z: PARCEL_ROWS[1], lots: Object.freeze([[-507, 30], [-450, 30], [-361, 30]]) }),
]);
const NEON_PARCEL_ROW = Object.freeze([[-187, 30], [-138, 22], [-114, 22], [-90, 22], [-45, 30], [-7, 30], [42, 30]]);
const NEON_PARCEL_ROWS = Object.freeze(PARCEL_ROWS.map((z) => Object.freeze({ z, lots: NEON_PARCEL_ROW })));
const CYBER_PARCEL_ROW = Object.freeze([[219, 30], [273, 30], [296, 14], [337, 30], [369, 30], [414, 30], [448, 30]]);
const CYBER_PARCEL_ROWS = Object.freeze(PARCEL_ROWS.map((z) => Object.freeze({ z, lots: CYBER_PARCEL_ROW })));

export const RESIDENTIAL_FUTURE_PLOTS = Object.freeze([
  ...parcelsFor('dark-alley', DARK_PARCEL_ROWS),
  ...parcelsFor('neon-market', NEON_PARCEL_ROWS),
  ...parcelsFor('cyber-hq', CYBER_PARCEL_ROWS),
]);

export function residentialExpansionDistricts() {
  const districtSpecs = [
    { id: 'dark-alley', minX: -540, maxX: -340 },
    { id: 'neon-market', minX: -210, maxX: 70 },
    { id: 'cyber-hq', minX: 196, maxX: 476 },
  ];
  return districtSpecs.map(({ id, minX, maxX }) => {
    const buildings = RESIDENTIAL_EXPANSION_HOMES.filter((home) => home.districtId === id);
    return {
      id: `residential-${id}`,
      kind: 'residential-expansion',
      center: { x: (minX + maxX) / 2, z: 436 },
      radius: Math.hypot((maxX - minX) / 2, 98),
      buildings: buildings.map((home) => ({ ...home })),
      vehicles: [],
    };
  });
}
