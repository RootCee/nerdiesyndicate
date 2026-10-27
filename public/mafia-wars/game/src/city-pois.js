import { CITY_HALL, CITY_HALL_ENTRY, PARK } from './city-park-layout.js';
import { academyPois } from './academy-layout.js';
// M6.6 location registry: the single list of places the map, waypoints, and
// interactions share. Every coordinate is derived from the existing source of
// truth (city-layout.js site records, the server's MULTIPLAYER_SPACES entrance
// records, and the city plan's buildings) so the map cannot drift from the
// world. Pure data: no Three.js or DOM, so Node tests and future tools (AI
// agents, new neighbourhoods, player-owned businesses) can read it directly.
import { SHOWCASE_BUSINESSES } from './city-showcase-layout.js';
import {
  APARTMENT_SITE, COMBAT_VENUE_SITE, DUPLICATED_ENTERABLE_HOUSE_SITE, ENTERABLE_HOUSE_SITE, FRONT_NORMALS, ORIGINAL_EXPANSION_HOUSES, createCityPlan,
} from './city-layout.js';
import { MULTIPLAYER_SPACES } from './multiplayer-spaces.js';

// Provisional storefront identities, keyed by city-plan building id. Status
// 'coming-soon' means nothing can be bought or used there yet. To add or rename
// a business, edit this table only; ownership and NFT supply are not modelled.
export const STOREFRONT_BUSINESSES = Object.freeze({
  // M7.0B1 North Market showcase: provisional identities from the Business NFT playable types
  'west-mixed-north-0': SHOWCASE_BUSINESSES['west-mixed-north-0'],
  // Phase 2.1: the bank has an interior (bank-layout.js); its banking services still read as coming soon
  'west-mixed-north-1': Object.freeze({ id: 'nerdie-city-bank', name: 'Nerdie City Bank', category: 'Bank', status: 'wallet', spaceId: 'nerdie-city-bank' }),
  'west-mixed-north-2': SHOWCASE_BUSINESSES['west-mixed-north-2'],
  // Ammo: an enterable gun and ammo shop (gun-shop-layout.js); open, restocking is free for now
  'west-mixed-north-3': Object.freeze({ id: 'nerdie-arms', name: 'Ammo', category: 'Gun & Ammo Shop', status: 'open', spaceId: 'nerdie-arms', kind: 'shop' }),
  // Milestone 2.2: the first operational city-owned business.
  'west-industrial-south-0': Object.freeze({ id: 'corner-market', name: 'Corner Market', category: 'Grocery & Essentials', status: 'open', kind: 'shop' }),
  'west-industrial-south-1': Object.freeze({ id: 'city-wholesaler', name: 'City Wholesaler', category: 'Wholesale Supply', status: 'staff-only' }),
  'west-industrial-south-2': Object.freeze({ id: 'laundromat', name: 'Laundromat', category: 'Laundromat', status: 'coming-soon' }),
  'west-industrial-south-3': Object.freeze({ id: 'sneaker-shop', name: 'Sneaker Shop', category: 'Sneaker Shop', status: 'coming-soon' }),
});
import { BANK_BUILDING_ID } from './bank-layout.js';
export { BANK_BUILDING_ID };

// The bank opens the existing wallet only. Copy must never promise deposits,
// withdrawals, loans, or stored balances until those systems exist.
export const BANK_COPY = Object.freeze({
  prompt: 'NERDIE CITY BANK',
  action: 'ENTER BANK',
  description: 'The financial headquarters: tellers, the City Economy Board, market intelligence, and a wallet kiosk. Banking services are coming soon. Safe zone.',
});

export const STREET_NAMES = Object.freeze({
  main: 'Main Street', 'west-avenue': 'West Avenue', 'east-avenue': 'East Avenue', 'hood-duplicate-main': 'East Block Main',
  'central-cross': 'Central Cross', 'north-cross': 'North Cross', 'north-market': 'North Market', 'south-cross': 'South Cross', 'south-market': 'South Market',
  'academy-avenue': 'Academy Avenue',
});
export const DISTRICT_NAMES = Object.freeze({
  'central-park': 'Nerdie Central Park', 'civic-center': 'Civic Center',
  'academy-north': 'Nerdie Blaq Academy', 'academy-south': 'Nerdie Blaq Academy', 'academy-library': 'Nerdie Blaq Academy', 'academy-green': 'Academy Green',
  north: 'North Blocks', south: 'South Blocks', 'east-residential-north': 'East Market', 'east-residential-south': 'East Side',
  'west-mixed-north': 'West Market', 'west-industrial-south': 'Industrial South', 'hood-duplicate-neighborhood': '184 East Block',
});

// Storefront doors sit on the facade facing the street side of the building.
const ENTRY_CLEARANCE = 0.9, STEP_OUT = 2.5;
// M7.0A: on the street-facing side the plan assigns (building.front), any of the four directions.
export function storefrontEntry(building) {
  const facing = building.front || (building.facing === 'east' ? 'east' : building.facing === 'west' ? 'west' : building.x > 0 ? 'west' : 'east');
  const [nx, nz] = FRONT_NORMALS[facing], half = nx ? building.width / 2 : building.depth / 2;
  return { x: building.x + nx * (half + ENTRY_CLEARANCE), z: building.z + nz * (half + ENTRY_CLEARANCE), facing };
}

const fromSpace = (spaceId) => {
  const { x, z } = MULTIPLAYER_SPACES[spaceId].entry;
  return { x, z };
};

// Every place with a marker. `entry` is where waypoints lead and where the
// interaction prompt appears; `spaceId` links interiors to the server's
// entrance validation (entry within 3.6 m).
export function cityPois(plan = createCityPlan()) {
  const pois = [
    { id: 'the-underground', name: COMBAT_VENUE_SITE.name, kind: 'arena', status: 'open', x: COMBAT_VENUE_SITE.x, z: COMBAT_VENUE_SITE.z, entry: fromSpace('underground'), spaceId: 'underground', description: '6v6 combat arena. Enter at the front door.' },
    // M7.1A: the Civic Center and Nerdie Central Park
    { id: CITY_HALL.id, name: CITY_HALL.name, kind: 'civic', status: 'coming-soon', x: CITY_HALL.x, z: CITY_HALL.z, entry: { x: CITY_HALL_ENTRY.x, z: CITY_HALL_ENTRY.z }, approach: [{ x: CITY_HALL_ENTRY.x - 1.6, z: CITY_HALL_ENTRY.z }], description: 'City Hall. Civic services coming soon.' },
    { id: PARK.id, name: PARK.name, kind: 'park', status: 'open', x: (PARK.minX + PARK.maxX) / 2, z: (PARK.minZ + PARK.maxZ) / 2, entry: { x: PARK.minX + 1, z: 96 }, description: 'Baseball, basketball, 7v7 football, chess tables, paths, picnic grove.' },
    { id: APARTMENT_SITE.id, name: APARTMENT_SITE.name, kind: 'apartment', status: 'open', x: APARTMENT_SITE.x, z: APARTMENT_SITE.z, entry: fromSpace(APARTMENT_SITE.id), spaceId: APARTMENT_SITE.id, description: 'Apartment interior. Safe zone.' },
    { id: ENTERABLE_HOUSE_SITE.id, name: ENTERABLE_HOUSE_SITE.name, kind: 'house', status: 'open', x: ENTERABLE_HOUSE_SITE.x, z: ENTERABLE_HOUSE_SITE.z, entry: fromSpace(ENTERABLE_HOUSE_SITE.id), spaceId: ENTERABLE_HOUSE_SITE.id, description: 'Enterable house. Safe zone.' },
    { id: DUPLICATED_ENTERABLE_HOUSE_SITE.id, name: DUPLICATED_ENTERABLE_HOUSE_SITE.name, kind: 'house', status: 'open', x: DUPLICATED_ENTERABLE_HOUSE_SITE.x, z: DUPLICATED_ENTERABLE_HOUSE_SITE.z, entry: fromSpace(DUPLICATED_ENTERABLE_HOUSE_SITE.id), spaceId: DUPLICATED_ENTERABLE_HOUSE_SITE.id, description: 'Enterable house. Safe zone.' },
    // M7.2: the Nerdie Blaq Academy and its Library
    ...academyPois(),
    ...ORIGINAL_EXPANSION_HOUSES.filter((site) => site.enterable).map((site) => ({
      id: site.id, name: site.name, kind: 'house', status: 'open', x: site.x, z: site.z, entry: fromSpace(site.id), spaceId: site.id, description: 'Enterable house. Safe zone.',
    })),
  ];
  for (const district of plan.districts) for (const building of district.buildings) {
    const business = STOREFRONT_BUSINESSES[building.id];
    if (!business || building.kind !== 'storefront') continue;
    const door = storefrontEntry(building), entry = business.spaceId ? { ...fromSpace(business.spaceId), facing: door.facing } : door;
    pois.push({
      id: business.id, name: business.name, kind: business.kind || (business.id === STOREFRONT_BUSINESSES[BANK_BUILDING_ID].id ? 'bank' : 'business'), ...(business.spaceId ? { spaceId: business.spaceId } : {}),
      category: business.category, status: business.status, x: building.x, z: building.z, entry: { x: entry.x, z: entry.z }, buildingId: building.id,
      // Step straight out of the door before turning, clear of wider neighbours.
      approach: [{ x: entry.x + FRONT_NORMALS[entry.facing][0] * STEP_OUT, z: entry.z + FRONT_NORMALS[entry.facing][1] * STEP_OUT }],
      description: business.status === 'wallet' ? BANK_COPY.description
        : business.status === 'staff-only' ? `${business.category}. Staff operations only.`
          : business.status === 'open' ? (business.id === 'nerdie-arms' ? `${business.category}. Restock ammo at the counter. Safe zone.` : `${business.category}. Open for business.`)
            : `${business.category}. Coming soon.`,
    });
  }
  return pois.map((poi) => Object.freeze({ ...poi, entry: Object.freeze(poi.entry), approach: Object.freeze(poi.approach || []) }));
}

export function bankSite(plan = createCityPlan()) {
  const building = plan.districts.flatMap((district) => district.buildings).find((b) => b.id === BANK_BUILDING_ID);
  if (!building || building.kind !== 'storefront') throw new Error(`Bank storefront ${BANK_BUILDING_ID} missing from the city plan`);
  return { ...building, name: STOREFRONT_BUSINESSES[BANK_BUILDING_ID].name, entry: storefrontEntry(building) };
}
