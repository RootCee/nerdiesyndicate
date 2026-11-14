// NC Milestone 8: property prices from what each home actually is (founder correction, 13 Nov 2026: rent and purchase prices must reflect
// size, quality, location and prestige; a large apartment is never priced as a tiny studio). Pure and deterministic: the same game data
// gives the same schedule, and every price carries the factors that made it, so it can be explained and audited.
//
//   weekly rent = usable area (m2) x base rate for the property class x grade x amenities x location, rounded, between a floor and a cap
//   list price  = weekly rent x 34 (about a 3 % weekly gross yield, the planning table's ratio), rounded to 50, between a floor and a cap
//
// Usable area: an apartment "unit" in the city is a whole floor (its interior, wall to wall); a Tower residence 85 % of its plan (walls,
// shared corridor); a house its footprint x storeys x 80 % (walls, stairs). Rooms are estimated at ~35 m2 each (bedrooms = rooms - 1).
export const PRICING_VERSION = 'size-1';
export const PRICING_RULES = Object.freeze({
  rentPerM2: Object.freeze({ apartment_floor: 0.30, tower_residence: 0.32, tower_penthouse: 0.32, rowhouse: 0.28, family_house: 0.30, estate: 0.30 }),
  grade: Object.freeze({ standard: 1.0, 'standard-plus': 1.1, luxury: 1.3, 'luxury-plus': 1.45, penthouse: 2.2, rowhouse: 0.95, family: 1.1, estate: 1.8 }),
  location: Object.freeze({ neighborhood_one: 1.15, park_academy: 1.0, neon_market: 1.2, cyber_hq: 1.25, dark_alley: 0.8 }),
  amenities: Object.freeze({ tower: 1.1, yard: 1.05, none: 1.0 }),
  towerFloorPremium: 0.01, towerFloorPremiumCap: 0.2,   // 1 % a storey above the second, at most 20 %
  rentFloor: 40, rentCap: 1000, priceMultiple: 34, priceFloor: 1500, priceCap: 40000,
});
// Districts to neighborhoods (migration 0022; Neighborhood One is the game's approved 280 x 296 m boundary).
export const NEIGHBORHOOD_OF = Object.freeze(Object.fromEntries([
  ['neighborhood_one', ['north', 'south', 'civic-center', 'east-residential-north', 'east-residential-south', 'west-mixed-north', 'west-industrial-south']],
  ['park_academy', ['central-park', 'academy-north', 'academy-south', 'academy-library', 'academy-green']],
  ['neon_market', ['neon-a1', 'neon-a2', 'neon-a3', 'neon-a4', 'neon-b1', 'neon-b2', 'neon-b3', 'neon-b4', 'residential-neon-market']],
  ['cyber_hq', ['cyber-a1', 'cyber-a2', 'cyber-a3', 'cyber-a4', 'cyber-b1', 'cyber-b2', 'cyber-b3', 'cyber-b4', 'residential-cyber-hq', 'neon-cyber-transition']],
  ['dark_alley', ['dark-a1', 'dark-a2', 'dark-a3', 'dark-b1', 'dark-b2', 'dark-b3', 'residential-dark-alley', 'dark-neon-transition', 'hood-dark-alley-neighborhood']],
].flatMap(([n, ds]) => ds.map((d) => [d, n]))));

// home: { kind: 'apartment'|'tower'|'house', tier, layout?, floor?, area (plan m2), storeys?, districtId }
export function priceProperty(home, rules = PRICING_RULES) {
  const cls = home.kind === 'house' ? (home.tier === 'estate' ? 'estate' : home.tier === 'rowhouse' ? 'rowhouse' : 'family_house')
    : home.kind === 'tower' ? (home.tier === 'penthouse' ? 'tower_penthouse' : 'tower_residence') : 'apartment_floor';
  const usable = Math.round(home.kind === 'house' ? home.area * Math.max(1, home.storeys || 1) * 0.8 : home.kind === 'tower' ? home.area * 0.85 : home.area);
  const rooms = Math.max(1, Math.min(10, Math.round(usable / 35))), bedrooms = Math.max(0, rooms - 1);
  const gradeKey = home.kind === 'house' ? home.tier : (home.layout || home.tier);
  const grade = rules.grade[gradeKey] ?? 1;
  const amenity = home.kind === 'tower' ? rules.amenities.tower * (1 + Math.min(rules.towerFloorPremiumCap, Math.max(0, (home.floor || 2) - 2) * rules.towerFloorPremium)) : home.kind === 'house' ? rules.amenities.yard : rules.amenities.none;
  const neighborhood = NEIGHBORHOOD_OF[home.districtId] || 'neighborhood_one', location = rules.location[neighborhood] ?? 1;
  const raw = usable * rules.rentPerM2[cls] * grade * amenity * location;
  const weeklyRent = Math.max(rules.rentFloor, Math.min(rules.rentCap, Math.round(raw)));
  const listPrice = Math.max(rules.priceFloor, Math.min(rules.priceCap, Math.round((weeklyRent * rules.priceMultiple) / 50) * 50));
  const prestige = grade * amenity >= 2.2 ? 'landmark' : grade * amenity >= 1.6 ? 'prestige' : grade * amenity >= 1.25 ? 'upscale' : 'standard';
  return { weeklyRent, listPrice, attributes: { class: cls, usableM2: usable, rooms, bedrooms, grade: gradeKey, neighborhood, location, amenity: Math.round(amenity * 100) / 100, prestige,
    capped: raw > rules.rentCap ? 'rent_cap' : raw < rules.rentFloor ? 'rent_floor' : null, version: PRICING_VERSION } };
}
