// Store hours (founder, 27 October 2026): every store in the city is open from 4 AM to 10 PM Pacific, every
// day, on the economic clock (resident-schedule.js economicMinuteOfDay). Open: lit, someone behind the
// counter, the door works. Closed: dark and locked. Three six-hour shifts cover the day exactly, one resident
// per shift (permanent-residents.js; bank migration 0013 records the same jobs). Pure: the room refuses a
// closed store's door, the client draws it, the tests check it.
export const STORE_OPEN_MINUTE = 240;   // 4 AM
export const STORE_CLOSE_MINUTE = 1_320; // 10 PM
export const STORE_SHIFTS = Object.freeze([
  Object.freeze({ id: 'early', start: 240 }), Object.freeze({ id: 'day', start: 600 }), Object.freeze({ id: 'late', start: 960 }),
]);
export const STORE_SHIFT_MINUTES = 360;

// The city's stores: workplace id (cityPois), the job title, the city-plan building and the space its door opens.
export const STORES = Object.freeze([
  { id: 'nerdie-arms', name: 'Ammo', title: 'Ammo store clerk', buildingId: 'west-mixed-north-3', spaceId: 'nerdie-arms' },
  { id: 'corner-market', name: 'Corner Market', title: 'Corner Market employee', buildingId: 'west-industrial-south-0', spaceId: 'bld-west-industrial-south-0' },
  { id: 'three-piece', name: '3 Piece', title: 'Tailor', buildingId: 'west-mixed-north-2', spaceId: 'bld-west-mixed-north-2' },
  { id: 'the-blaq-note', name: 'The Blaq Note', title: 'Bartender', buildingId: 'west-mixed-north-0', spaceId: 'bld-west-mixed-north-0' },
  { id: 'city-wholesaler', name: 'City Wholesaler', title: 'Wholesale clerk', buildingId: 'west-industrial-south-1', spaceId: 'bld-west-industrial-south-1' },
  { id: 'laundromat', name: 'Laundromat', title: 'Laundromat attendant', buildingId: 'west-industrial-south-2', spaceId: 'bld-west-industrial-south-2' },
  { id: 'sneaker-shop', name: 'Sneaker Shop', title: 'Sneaker Shop clerk', buildingId: 'west-industrial-south-3', spaceId: 'bld-west-industrial-south-3' },
].map((s) => Object.freeze(s)));

// Who works each shift, by resident index (early, day, late). The chess players (chess-residents.js) take
// only early shifts, and the tables skip anyone on shift; everyone else works days and lates.
export const STORE_ROTA = Object.freeze({
  'nerdie-arms': Object.freeze([21, 9, 10]),
  'corner-market': Object.freeze([20, 14, 15]),
  'three-piece': Object.freeze([25, 16, 18]),
  'the-blaq-note': Object.freeze([23, 19, 24]),
  'city-wholesaler': Object.freeze([33, 28, 29]),
  'laundromat': Object.freeze([34, 30, 31]),
  'sneaker-shop': Object.freeze([17, 32, 35]),
});

export const isStoreOpen = (minute) => minute >= STORE_OPEN_MINUTE && minute < STORE_CLOSE_MINUTE;
export const storeById = (id) => STORES.find((s) => s.id === id) || null;
export const storeForSpace = (spaceId) => STORES.find((s) => s.spaceId === spaceId) || null;
export const storeForBuilding = (buildingId) => STORES.find((s) => s.buildingId === buildingId) || null;
// The resident index on shift at a store at a minute of the day, or -1 (closed).
export function storeStaffAt(storeId, minute) {
  const rota = STORE_ROTA[storeId]; if (!rota || !isStoreOpen(minute)) return -1;
  const k = STORE_SHIFTS.findIndex((s) => minute >= s.start && minute < s.start + STORE_SHIFT_MINUTES);
  return k < 0 ? -1 : rota[k];
}
// The job id the bank records for a store shift (migration 0013).
export const storeJobId = (storeId, shiftId) => `job_${storeId.replace(/-/g, '_')}_${shiftId}`;
export const STORE_HOURS_TEXT = 'OPEN 4 AM – 10 PM';
