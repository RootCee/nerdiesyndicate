// M6.6 location registry: the single list of places the map, waypoints, and
// interactions share. Every coordinate is derived from the existing source of
// truth (city-layout.js site records, the server's MULTIPLAYER_SPACES entrance
// records, and the city plan's buildings) so the map cannot drift from the
// world. Pure data: no Three.js or DOM, so Node tests and future tools (AI
// agents, new neighbourhoods, player-owned businesses) can read it directly.
import {
  APARTMENT_SITE, COMBAT_VENUE_SITE, DUPLICATED_ENTERABLE_HOUSE_SITE, ENTERABLE_HOUSE_SITE, ORIGINAL_EXPANSION_HOUSES, createCityPlan,
} from './city-layout.js';
import { MULTIPLAYER_SPACES } from './multiplayer-spaces.js';

// Provisional storefront identities, keyed by city-plan building id. Status
// 'coming-soon' means nothing can be bought or used there yet. To add or rename
// a business, edit this table only; ownership and NFT supply are not modelled.
export const STOREFRONT_BUSINESSES = Object.freeze({
  'west-mixed-north-0': Object.freeze({ id: 'corner-store', name: 'Corner Store', category: 'Corner Store', status: 'coming-soon' }),
  'west-mixed-north-1': Object.freeze({ id: 'nerdie-city-bank', name: 'Nerdie City Bank', category: 'Bank', status: 'wallet' }),
  'west-mixed-north-2': Object.freeze({ id: 'barbershop', name: 'Barbershop', category: 'Barbershop', status: 'coming-soon' }),
  'west-mixed-north-3': Object.freeze({ id: 'diner', name: 'Diner', category: 'Diner', status: 'coming-soon' }),
  'west-industrial-south-0': Object.freeze({ id: 'hardware-store', name: 'Hardware Store', category: 'Hardware Store', status: 'coming-soon' }),
  'west-industrial-south-1': Object.freeze({ id: 'auto-shop', name: 'Auto Shop', category: 'Auto Shop', status: 'coming-soon' }),
  'west-industrial-south-2': Object.freeze({ id: 'laundromat', name: 'Laundromat', category: 'Laundromat', status: 'coming-soon' }),
  'west-industrial-south-3': Object.freeze({ id: 'sneaker-shop', name: 'Sneaker Shop', category: 'Sneaker Shop', status: 'coming-soon' }),
});
export const BANK_BUILDING_ID = 'west-mixed-north-1';

// The bank opens the existing wallet only. Copy must never promise deposits,
// withdrawals, loans, or stored balances until those systems exist.
export const BANK_COPY = Object.freeze({
  prompt: 'NERDIE CITY BANK',
  action: 'OPEN WALLET',
  description: 'Opens your Nerdie Cash wallet. Banking services are coming soon.',
});

export const STREET_NAMES = Object.freeze({
  main: 'Main Street', 'west-avenue': 'West Avenue', 'east-avenue': 'East Avenue', 'hood-duplicate-main': 'East Block Main',
  'central-cross': 'Central Cross', 'north-cross': 'North Cross', 'north-market': 'North Market', 'south-cross': 'South Cross', 'south-market': 'South Market',
});
export const DISTRICT_NAMES = Object.freeze({
  north: 'North Blocks', south: 'South Blocks', 'east-residential-north': 'East Market', 'east-residential-south': 'East Side',
  'west-mixed-north': 'West Market', 'west-industrial-south': 'Industrial South', 'hood-duplicate-neighborhood': '184 East Block',
});

// Storefront doors sit on the facade facing the street side of the building.
const ENTRY_CLEARANCE = 0.9, STEP_OUT = 2.5;
export function storefrontEntry(building) {
  const direction = building.facing === 'east' ? 1 : building.facing === 'west' ? -1 : building.x > 0 ? -1 : 1;
  return { x: building.x + direction * (building.width / 2 + ENTRY_CLEARANCE), z: building.z, facing: direction > 0 ? 'east' : 'west' };
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
    { id: APARTMENT_SITE.id, name: APARTMENT_SITE.name, kind: 'apartment', status: 'open', x: APARTMENT_SITE.x, z: APARTMENT_SITE.z, entry: fromSpace(APARTMENT_SITE.id), spaceId: APARTMENT_SITE.id, description: 'Apartment interior. Safe zone.' },
    { id: ENTERABLE_HOUSE_SITE.id, name: ENTERABLE_HOUSE_SITE.name, kind: 'house', status: 'open', x: ENTERABLE_HOUSE_SITE.x, z: ENTERABLE_HOUSE_SITE.z, entry: fromSpace(ENTERABLE_HOUSE_SITE.id), spaceId: ENTERABLE_HOUSE_SITE.id, description: 'Enterable house. Safe zone.' },
    { id: DUPLICATED_ENTERABLE_HOUSE_SITE.id, name: DUPLICATED_ENTERABLE_HOUSE_SITE.name, kind: 'house', status: 'open', x: DUPLICATED_ENTERABLE_HOUSE_SITE.x, z: DUPLICATED_ENTERABLE_HOUSE_SITE.z, entry: fromSpace(DUPLICATED_ENTERABLE_HOUSE_SITE.id), spaceId: DUPLICATED_ENTERABLE_HOUSE_SITE.id, description: 'Enterable house. Safe zone.' },
    ...ORIGINAL_EXPANSION_HOUSES.filter((site) => site.enterable).map((site) => ({
      id: site.id, name: site.name, kind: 'house', status: 'open', x: site.x, z: site.z, entry: fromSpace(site.id), spaceId: site.id, description: 'Enterable house. Safe zone.',
    })),
  ];
  for (const district of plan.districts) for (const building of district.buildings) {
    const business = STOREFRONT_BUSINESSES[building.id];
    if (!business || building.kind !== 'storefront') continue;
    const entry = storefrontEntry(building);
    pois.push({
      id: business.id, name: business.name, kind: business.id === STOREFRONT_BUSINESSES[BANK_BUILDING_ID].id ? 'bank' : 'business',
      category: business.category, status: business.status, x: building.x, z: building.z, entry: { x: entry.x, z: entry.z }, buildingId: building.id,
      // Step straight out of the door before turning, clear of wider neighbours.
      approach: [{ x: entry.x + (entry.facing === 'east' ? STEP_OUT : -STEP_OUT), z: entry.z }],
      description: business.status === 'wallet' ? BANK_COPY.description : `${business.category}. Coming soon.`,
    });
  }
  return pois.map((poi) => Object.freeze({ ...poi, entry: Object.freeze(poi.entry), approach: Object.freeze(poi.approach || []) }));
}

export function bankSite(plan = createCityPlan()) {
  const building = plan.districts.flatMap((district) => district.buildings).find((b) => b.id === BANK_BUILDING_ID);
  if (!building || building.kind !== 'storefront') throw new Error(`Bank storefront ${BANK_BUILDING_ID} missing from the city plan`);
  return { ...building, name: STOREFRONT_BUSINESSES[BANK_BUILDING_ID].name, entry: storefrontEntry(building) };
}
