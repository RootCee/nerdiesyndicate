// Distinct east-west transition districts separate Dark Alley, Neon Market, and Cyber HQ.
// The transition streets are deliberately not continuations of the commercial block grid.
export const DISTRICT_TRANSITION_BOUNDS = Object.freeze({
  darkNeon: Object.freeze({ minX: -340, maxX: -210, minZ: 148, maxZ: 356 }),
  neonCyber: Object.freeze({ minX: 70, maxX: 196, minZ: 148, maxZ: 356 }),
});

export const DISTRICT_TRANSITION_ROADS = Object.freeze([
  { id: 'dark-venue-arrival', x: -322.5, z: 252, width: 35, depth: 10 },
  { id: 'dark-estate-west-way', x: -306, z: 253, width: 8, depth: 102 },
  { id: 'dark-estate-north-collector', x: -278.5, z: 302, width: 55, depth: 10 },
  { id: 'dark-estate-east-way', x: -251, z: 253, width: 8, depth: 102 },
  { id: 'dark-neon-gate', x: -231, z: 252, width: 52, depth: 12 },
  { id: 'dark-estate-south-collector', x: -278.5, z: 202, width: 55, depth: 10 },
  { id: 'cyber-transition-west-way', x: 81, z: 252, width: 10, depth: 208 },
  { id: 'cyber-neon-transition-link', x: 73.5, z: 252, width: 19, depth: 12 },
  { id: 'cyber-transition-south-link', x: 137, z: 190, width: 112, depth: 8 },
  { id: 'cyber-arena-approach', x: 166, z: 240, width: 6, depth: 112 },
  { id: 'cyber-transition-north-link', x: 137, z: 290, width: 122, depth: 10 },
  { id: 'cyber-west-frontage', x: 193, z: 252, width: 10, depth: 208 },
  { id: 'cyber-parking-drive', x: 144, z: 210, width: 44, depth: 8 },
].map((road) => Object.freeze(road)));

const darkBuildings = [
  { id: 'shadowbox-live', name: 'Shadowbox Underground', kind: 'venue', venueType: 'underground', interiorTemplate: 'underground-venue', x: -278, z: 252, width: 42, depth: 32, height: 9.5, tint: 0x382d3a, fixedFront: 'west' },
  { id: 'dark-estate-west-1', name: 'Shadow Passage Estate', kind: 'house', propertyTier: 'estate', x: -326, z: 221, width: 18, depth: 20, height: 8.8, tint: 0x755e69, fixedFront: 'east' },
  { id: 'dark-estate-west-2', name: 'Shadow Passage Estate', kind: 'house', propertyTier: 'estate', x: -326, z: 283, width: 22, depth: 24, height: 10.5, tint: 0x9a795d, fixedFront: 'east' },
  { id: 'dark-estate-east-1', name: 'Dark Alley Estate House', kind: 'house', propertyTier: 'estate', x: -233, z: 221, width: 20, depth: 22, height: 9.2, tint: 0x755e69, fixedFront: 'west' },
  { id: 'dark-estate-east-2', name: 'Dark Alley Estate House', kind: 'house', propertyTier: 'estate', x: -230, z: 283, width: 24, depth: 20, height: 11, tint: 0x9a795d, fixedFront: 'west' },
];

const cyberBuildings = [
  { id: 'neon-cyber-pavilion', name: 'Nerdie Arena', kind: 'venue', venueType: 'arena', interiorTemplate: 'cyber-arena', x: 133, z: 252, width: 56, depth: 44, height: 16, tint: 0x394b73, fixedFront: 'east' },
  { id: 'cyber-estate-west-1', name: 'Cyber Estate House', kind: 'house', propertyTier: 'estate', x: 96, z: 214, width: 16, depth: 20, height: 10, tint: 0x787c88, fixedFront: 'south' },
  { id: 'cyber-estate-west-2', name: 'Cyber Estate House', kind: 'house', propertyTier: 'estate', x: 96, z: 268, width: 16, depth: 18, height: 11.5, tint: 0x667c82, fixedFront: 'north' },
  { id: 'cyber-estate-east-1', name: 'Cyber Estate House', kind: 'house', propertyTier: 'estate', x: 178, z: 235, width: 14, depth: 18, height: 9.4, tint: 0x787c88, fixedFront: 'south' },
  { id: 'cyber-estate-east-2', name: 'Cyber Estate House', kind: 'house', propertyTier: 'estate', x: 178, z: 265, width: 14, depth: 18, height: 10.8, tint: 0x667c82, fixedFront: 'north' },
];

export const DISTRICT_TRANSITION_BUILDINGS = Object.freeze(
  [...darkBuildings, ...cyberBuildings].map((building) => Object.freeze(building)),
);

export const DISTRICT_FUTURE_PLOTS = Object.freeze([
  ...[-325, -230].flatMap((x, side) => [170, 331].map((z, row) => Object.freeze({
    id: `dark-buffer-future-${side}-${row}`,
    districtId: 'dark-neon-transition',
    x,
    z,
    width: side ? 40 : 30,
    depth: 42,
  }))),
  ...[111, 178].flatMap((x, side) => [166, 323].map((z, row) => Object.freeze({
    id: `cyber-buffer-future-${side}-${row}`,
    districtId: 'neon-cyber-transition',
    x,
    z,
    width: side ? 16 : 46,
    depth: row ? 50 : 36,
  }))),
]);

export const DISTRICT_TRANSITION_PARKING = Object.freeze([
  Object.freeze({ id: 'cyber-arena-parking', minX: 131, maxX: 161, minZ: 182, maxZ: 208 }),
]);

export function districtTransitionDistricts() {
  return [
    { id: 'dark-neon-transition', kind: 'district-transition', center: { x: -275, z: 252 }, radius: 150, buildings: darkBuildings.map((building) => ({ ...building })), vehicles: [] },
    { id: 'neon-cyber-transition', kind: 'district-transition', center: { x: 133, z: 252 }, radius: 150, buildings: cyberBuildings.map((building) => ({ ...building })), vehicles: [] },
  ];
}
