// Phase 2.1 Nerdie City Bank interior: the financial headquarters behind the existing North Market bank
// (storefront west-mixed-north-1, entrance on its north face). Pure (no Three.js): the client
// (bank-interior.js), the server space, and the tests all read it.
//
// Like every interior it is a separate space high above the city (the others use 40..130 m; the bank 145 m),
// entered only through an explicit ENTER at the street door. The hall is larger than the storefront shell,
// the usual game convention for a landmark interior; its door lines up with the real front door.
//
// Grand hall 24 x 30 m with a 10 m ceiling, door on the north wall:
//   north      vestibule and brand wall (the player arrives here facing south)
//   centre     lobby: floor medallion, the NB emblem ring above, benches, two rows of marble columns
//   east       teller hall: a 16 m counter with four teller windows and a wallet kiosk; the vault door behind
//   west       Market Intelligence Center: four terminals and the market wall
//   south      the City Economy Board above a dais; the Founder Executive Suite (restricted) in the south-west
import { createCityPlan } from './city-layout.js';

// The bank's storefront (city-pois.js re-exports this id); its site comes straight from the city plan, so this
// module can feed the multiplayer spaces without an import cycle through city-pois.js.
export const BANK_BUILDING_ID = 'west-mixed-north-1';
export function bankBuilding(plan = createCityPlan()) {
  const b = plan.districts.flatMap((d) => d.buildings).find((x) => x.id === BANK_BUILDING_ID);
  if (!b) throw new Error(`bank storefront ${BANK_BUILDING_ID} missing from the city plan`);
  return { id: 'nerdie-city-bank', name: 'Nerdie City Bank', x: b.x, z: b.z, width: b.width, depth: b.depth, height: b.height, front: b.front };
}

export const BANK_SPACE_ID = 'nerdie-city-bank';
export const BANK_INTERIOR_Y = 145;
const r2 = (v) => Math.round(v * 100) / 100;

export function bankInterior(site = bankBuilding()) {
  const y = BANK_INTERIOR_Y, cx = site.x, minX = cx - 12, maxX = cx + 12, maxZ = site.z + 14, minZ = maxZ - 30;
  const counter = { x: maxX - 4.5, z0: minZ + 8, z1: maxZ - 6, depth: 0.9, height: 1.1 };                   // the teller line
  const tellers = [0, 1, 2, 3].map((i) => r2(counter.z0 + 2 + i * 4));                                      // window centres along it
  const market = { minX, maxX: minX + 7, minZ: minZ + 8, maxZ: maxZ - 6 };                                  // the west wing
  const suite = { minX, maxX: minX + 9, minZ, maxZ: minZ + 7, doorX: r2(minX + 5), doorWidth: 1.6, wall: 0.18 };  // founder office
  const board = { x: r2(cx + 4.5), z: minZ, width: 12, height: 5, bottom: 2.6 };                           // City Economy Board
  const stations = [
    ...tellers.map((z, i) => ({ id: `teller-${i + 1}`, kind: 'teller', x: counter.x, z, stand: [-1.3, 0] })),
    { id: 'wallet-kiosk', kind: 'wallet', x: counter.x, z: r2(counter.z1 + 1.6), stand: [-1.3, 0] },
    ...[0, 1, 2, 3].map((i) => ({ id: `market-${i + 1}`, kind: 'market', x: r2(minX + 1.4), z: r2(market.minZ + 2.5 + i * 3.6), stand: [1.2, 0] })),
    { id: 'economy-board', kind: 'board', x: board.x, z: r2(minZ + 4.2), stand: [0, 0] },
    { id: 'executive-suite', kind: 'restricted', x: suite.doorX, z: r2(suite.maxZ + 0.2), stand: [0, 1.1] },
  ].map((s) => Object.freeze({ ...s, y, stand: Object.freeze({ x: r2(s.x + s.stand[0]), y, z: r2(s.z + s.stand[1]) }) }));
  return Object.freeze({
    y, height: 10, minX, maxX, minZ, maxZ, doorX: cx, doorWidth: 2.6,
    vestibule: Object.freeze({ minZ: maxZ - 4, screenGap: 4 }),
    columns: Object.freeze([-4, 4].flatMap((dx) => [10, 15, 20, 25].map((dz) => Object.freeze({ x: cx + dx, z: minZ + dz, radius: 0.45 })))),
    counter: Object.freeze(counter), tellers: Object.freeze(tellers), market: Object.freeze(market), suite: Object.freeze(suite), board: Object.freeze(board),
    dais: Object.freeze({ minX: board.x - 6.5, maxX: board.x + 6.5, minZ, maxZ: minZ + 2.4, height: 0.3 }),
    vault: Object.freeze({ x: maxX, z: r2(site.z - 2), radius: 2.1 }),
    medallion: Object.freeze({ x: cx, z: r2(site.z - 1), radius: 3.2 }),
    benches: Object.freeze([-1, 1].map((s) => Object.freeze({ x: cx + s * 1.9, z: r2(site.z - 1), length: 2.4, alongZ: true }))),
    stations: Object.freeze(stations),
  });
}

// The server space: the street door 1.4 m in front of the north facade, the hall behind it.
export function bankSpace(site = bankBuilding(), L = bankInterior(site)) {
  const front = site.z + site.depth / 2;
  return {
    id: BANK_SPACE_ID, layer: 1, safeZone: true,
    entry: { x: site.x, y: 0, z: r2(front + 1.4) }, inside: { x: L.doorX, y: L.y, z: r2(L.maxZ - 1.6) },
    exit: { x: L.doorX, y: L.y, z: r2(L.maxZ - 1.0) }, outside: { x: site.x, y: 0, z: r2(front + 1.2) },
    bounds: { minX: r2(L.minX + 0.2), maxX: r2(L.maxX - 0.2), minY: L.y - 1, maxY: L.y + L.height, minZ: r2(L.minZ + 0.2), maxZ: r2(L.maxZ - 0.2) },
  };
}
