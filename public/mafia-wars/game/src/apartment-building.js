// Stage 2: the six-storey apartment and loft buildings, shared by the facade (city-showcase.js draws the
// balconies and balcony doors), the apartments (interior-catalog.js lays them out at their real height,
// so their windows look out on the city) and the server spaces. Pure.
//
// Storey 1 is the lobby; storeys 2-6 are one apartment each, better with every floor up to the penthouse,
// which has its own stairs to a rooftop terrace.
import { APARTMENT_STOREYS, APARTMENT_STOREY_HEIGHT } from './city-layout.js';

export const APARTMENT_FLOORS = Object.freeze([
  Object.freeze({ floor: 2, tier: 'standard', layout: 'standard', title: 'Standard apartment' }),
  Object.freeze({ floor: 3, tier: 'standard', layout: 'standard-plus', title: 'Standard apartment with study' }),
  Object.freeze({ floor: 4, tier: 'luxury', layout: 'luxury', title: 'Luxury apartment' }),
  Object.freeze({ floor: 5, tier: 'luxury', layout: 'luxury-plus', title: 'Luxury apartment with suite' }),
  Object.freeze({ floor: APARTMENT_STOREYS, tier: 'penthouse', layout: 'penthouse', title: 'Penthouse with roof terrace' }),
]);
export const FLOOR_SLAB = 0.15;
const r2 = (v) => Math.round(v * 100) / 100;

// The legacy North/South Blocks and the West Market mixed buildings.
export const isApartmentBuilding = (b) => !b.kind || b.kind === 'mixed';
// A storey's floor level and its ceiling (the slab above), in metres above the street.
export const storeyFloor = (floor) => r2((floor - 1) * APARTMENT_STOREY_HEIGHT + FLOOR_SLAB);
export const storeyCeiling = (floor) => r2(floor * APARTMENT_STOREY_HEIGHT - 0.2);
// The facade's window bays (city-showcase.js midrise): the same arithmetic, so windows line up.
export function facadeBays(length) {
  const bays = Math.max(1, Math.floor((length - 1.2) / 2.8)), span = (length - 1.2) / bays;
  return { bays, span, at: (i) => r2(-length / 2 + 0.6 + span * (i + 0.5)) };
}
// The front balcony of a storey: the middle bay (above the entrance), three bays for the penthouse terrace.
export function balconyFor(b, floor) {
  if (floor < 2) return null;
  const length = b.front === 'east' || b.front === 'west' ? b.depth : b.width, { bays, span, at } = facadeBays(length), mid = Math.floor(bays / 2);
  const wide = floor === APARTMENT_STOREYS && bays >= 3, idx = wide ? [mid - 1, mid, mid + 1] : [mid];
  return Object.freeze({ bays: Object.freeze(idx), along: at(mid), width: r2(span * idx.length - 0.3), depth: wide ? 2.0 : 1.5, level: storeyFloor(floor) });
}
