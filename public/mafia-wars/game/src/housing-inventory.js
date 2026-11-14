// NC-LIFE-02 Milestone 5: the city's homes, from the same game data the interiors are built from, for seeding the bank's authoritative
// property inventory (registry.seed_property_inventory). Pure; no Three.js.
//   - player market: every enterable house, every apartment unit (storeys 2-6) of the apartment and loft buildings, every Tower home;
//   - resident: North Court's 36 units, the permanent residents' homes, never listed (their housing assignments are untouched).
// Property ids are stable: house-<building>, apt-<building>-f<floor>, the Towers' own ids (neon-tower-201), north-court-NNN.
import { interiorCatalog, apartmentUnit } from './interior-catalog.js';
import { APARTMENT_FLOORS } from './apartment-building.js';
import { TOWER_DEFINITIONS } from './tower-residences.js';
import { NORTH_COURT_HOMES } from './north-court-residences.js';
import { priceProperty } from './property-pricing.js';

let cached = null;
export function housingInventory() {
  if (cached) return cached;
  const out = [];
  for (const e of interiorCatalog()) {
    if (e.template === 'house') { const area = Math.round(e.site.width * e.site.depth);
      out.push({ propertyId: `house-${e.buildingId}`, kind: 'house', tier: e.tier, priceTier: priceTierFor({ kind: 'house', tier: e.tier, area }), area, storeys: Math.max(1, Math.round(e.site.height / 3.6)), districtId: e.districtId, buildingId: e.buildingId, unit: null, spaceId: e.spaceId, label: e.name, market: 'player' }); }
    if (e.template === 'apartments' || e.template === 'lofts') for (const { floor } of APARTMENT_FLOORS) {
      const U = apartmentUnit(e, floor);
      const area = Math.round((U.inner.maxX - U.inner.minX) * (U.inner.maxZ - U.inner.minZ));
      out.push({ propertyId: `apt-${e.buildingId}-f${floor}`, kind: 'apartment', tier: U.tier, priceTier: priceTierFor({ kind: 'apartment', tier: U.tier, floor }), area, floor, layout: U.layout, districtId: e.districtId, buildingId: e.buildingId, unit: String(floor), spaceId: `${e.spaceId}-f${floor}`, label: `${e.name} · ${U.title}`, market: 'player' });
    }
  }
  const districtOf = Object.fromEntries(interiorCatalog().map((e) => [e.buildingId, e.districtId]));
  for (const t of TOWER_DEFINITIONS) for (const h of t.homes) out.push({ propertyId: h.id, kind: 'apartment', tower: true, tier: h.tier, priceTier: priceTierFor({ kind: 'tower', tier: h.tier, floor: h.floor }), area: Math.round(h.site.width * h.site.depth), floor: h.floor, layout: h.layout, districtId: districtOf[t.building.id], buildingId: t.building.id, unit: h.code, spaceId: h.spaceId, label: `${t.building.name} · ${h.title}`, market: 'player' });
  for (const h of NORTH_COURT_HOMES) out.push({ propertyId: h.propertyId, kind: 'apartment', tier: 'standard', priceTier: 'one_bed', districtId: 'north', buildingId: 'north-court', unit: h.code, spaceId: h.spaceId, label: `North Court · ${h.title}`, market: 'resident' });
  cached = Object.freeze(out.map((x) => Object.freeze(x)));
  return cached;
}
export const playerMarketHomes = () => housingInventory().filter((h) => h.market === 'player');
export const inventoryBySpace = (spaceId) => housingInventory().find((h) => h.spaceId === spaceId) || null;

// Re-tiering (Milestone 5 expansion; a recommendation for the founder, not approved). Every apartment "unit" in the city is a whole
// floor of 126-191 m2 and every Tower home is 140 m2, so there are no physically small homes: the price tier follows the floor and the
// interior's own layout grade instead (floor 2 "standard" up to floor 6 "penthouse"), which keeps 209 of the 482 homes in the three
// cheapest tiers without building anything. Houses follow their footprint and grade.
export const PRICE_TIERS = Object.freeze(['studio', 'one_bed', 'two_bed', 'three_bed', 'small_house', 'family_house', 'luxury_house', 'penthouse']);
const APARTMENT_FLOOR_TIER = Object.freeze({ 2: 'studio', 3: 'one_bed', 4: 'two_bed', 5: 'three_bed', 6: 'penthouse' });
export function priceTierFor({ kind, tier, floor = null, area = 0 }) {
  if (kind === 'house') return tier === 'estate' ? 'luxury_house' : tier === 'rowhouse' || area < 100 ? 'small_house' : 'family_house';
  if (kind === 'tower') return tier === 'penthouse' ? 'penthouse' : floor <= 11 ? 'two_bed' : 'three_bed';
  return APARTMENT_FLOOR_TIER[floor] || (tier === 'penthouse' ? 'penthouse' : 'two_bed');
}

// The founder's eight-tier PLANNING table (13 Nov 2026): planning assumptions, not approved prices. Migration 0019 seeds it as
// price version 'planning-1' (unapproved). Higher-rent scenarios are tools/economy-sim.mjs inputs only.
export const PLANNING_HOUSING_TIERS = Object.freeze([
  { tier: 'studio', label: 'Studio', listPrice: 1_500, weeklyRent: 45 },
  { tier: 'one_bed', label: '1-bedroom apartment', listPrice: 2_500, weeklyRent: 70 },
  { tier: 'two_bed', label: '2-bedroom apartment', listPrice: 4_000, weeklyRent: 110 },
  { tier: 'three_bed', label: '3-bedroom apartment', listPrice: 5_500, weeklyRent: 150 },
  { tier: 'small_house', label: 'Small house', listPrice: 8_000, weeklyRent: 200 },
  { tier: 'family_house', label: 'Family house', listPrice: 12_000, weeklyRent: 300 },
  { tier: 'luxury_house', label: 'Luxury house', listPrice: 20_000, weeklyRent: 500 },
  { tier: 'penthouse', label: 'Penthouse', listPrice: 30_000, weeklyRent: 750 },
].map((t) => Object.freeze({ ...t, planning: true })));

// Milestone 8: each player-market home priced from what it is (src/property-pricing.js): { propertyId, label, weeklyRent, listPrice, attributes }.
export function pricedHomes() {
  return playerMarketHomes().map((h) => ({ propertyId: h.propertyId, label: h.label, ...priceProperty({ kind: h.kind === 'house' ? 'house' : h.tower ? 'tower' : 'apartment', tier: h.tier, layout: h.layout, floor: h.floor, area: h.area, storeys: h.storeys, districtId: h.districtId }) }));
}
