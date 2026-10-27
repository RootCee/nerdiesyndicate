import { APARTMENT_SITE } from './city-layout.js';
import { gunShopSpace } from './gun-shop-layout.js';
import { CHESS_PLAZA } from './city-park-layout.js';
import { librarySpace } from './academy-layout.js';
import { bankSpace } from './bank-layout.js';
import { genericInteriorSpaces } from './interior-catalog.js';

export const SPACE_SCHEMA_VERSION = 1;

// North Court's doors and interior, from its site: street door 1.4 m in front of the west facade,
// interior at site.interiorY (the offsets the hard-coded record used at x 29, z 100).
function apartmentSpace(site) {
  const front = site.x - site.width / 2, round = (v) => Math.round(v * 100) / 100;
  return {
    id: site.id, layer: 1, safeZone: true,
    entry: { x: round(front - 1.4), y: 0, z: site.z }, inside: { x: round(front + 3.7), y: site.interiorY, z: site.z },
    exit: { x: round(front + 3.3), y: site.interiorY, z: site.z }, outside: { x: round(front - 1.2), y: 0, z: site.z },
    bounds: { minX: round(front + 2.2), maxX: round(site.x + 6.8), minY: site.interiorY - 1, maxY: site.interiorY + 5, minZ: site.z - 5.5, maxZ: site.z + 5.5 },
  };
}

export const MULTIPLAYER_SPACES = Object.freeze({
  city: Object.freeze({ id: 'city', layer: 0 }),
  underground: Object.freeze({ id: 'underground', layer: 0, entry: { x: -97, y: 0, z: -72 }, inside: { x: 0, y: 0, z: 36 }, exit: { x: 0, y: 0, z: 43 }, outside: { x: -96.2, y: 0, z: -72 }, bounds: { minX: -43, maxX: 43, minY: -4, maxY: 40, minZ: -46, maxZ: 46 } }),
  // M7.0A: derived from APARTMENT_SITE (same offsets as before), so moving the building moves its doors and interior
  'north-court': Object.freeze(apartmentSpace(APARTMENT_SITE)),
  // Ammo, the gun and ammo shop (gun-shop-layout.js): a safe-zone interior with a restock counter
  'nerdie-arms': Object.freeze(gunShopSpace()),
  // M7.2 the Nerdie Blaq Academy Library (academy-layout.js): two floors of reading room, a safe zone
  'academy-library': Object.freeze(librarySpace()),
  // Phase 2.1 the Nerdie City Bank (bank-layout.js): the financial headquarters, a safe zone
  'nerdie-city-bank': Object.freeze(bankSpace()),
  'east-73': Object.freeze({ id: 'east-73', layer: 1, safeZone: true, entry: { x: 105.15, y: 0, z: 73 }, inside: { x: 107.3, y: 55, z: 73 }, exit: { x: 106.9, y: 55, z: 73 }, outside: { x: 105.05, y: 0, z: 73 }, bounds: { minX: 105.5, maxX: 118.5, minY: 54, maxY: 60, minZ: 67.5, maxZ: 78.5 } }),
  'hood-cross-west': Object.freeze({ id: 'hood-cross-west', layer: 1, safeZone: true, entry: { x: -48.45, y: 0, z: 53.75 }, inside: { x: -54.7, y: 70, z: 62 }, exit: { x: -55.1, y: 70, z: 62 }, outside: { x: -48.45, y: 0, z: 53.45 }, bounds: { minX: -56.5, maxX: -43.5, minY: 69, maxY: 75, minZ: 56.5, maxZ: 67.5 } }),
  'hood-duplicate-west-5': Object.freeze({ id: 'hood-duplicate-west-5', layer: 1, safeZone: true, entry: { x: 173.25, y: 0, z: 5.55 }, inside: { x: 159.7, y: 85, z: 4 }, exit: { x: 159.9, y: 85, z: 4 }, outside: { x: 173.55, y: 0, z: 5.55 }, bounds: { minX: 158.5, maxX: 171.5, minY: 84, maxY: 90, minZ: -1.5, maxZ: 9.5 } }),
  // Stage 2: every other building (interior-catalog.js): houses, apartments, shops, warehouses, City Hall, the Academy halls
  ...genericInteriorSpaces(),
});

export const MULTIPLAYER_SAFE_ZONES = Object.freeze(Object.values(MULTIPLAYER_SPACES)
  .filter((space) => space.safeZone && space.bounds)
  .map((space) => Object.freeze({ id: space.id, bounds: space.bounds })));
// M7.1D: open-air no-combat zones in the city. The chess plaza in Central Park protects the
// players and residents standing in it (a game cannot be broken up by gunfire), but unlike an
// interior shell (MULTIPLAYER_SAFE_ZONES also occlude shots) it does not stop shots passing over it.
export const CITY_SAFE_ZONES = Object.freeze([Object.freeze({ id: 'chess-plaza', bounds: Object.freeze({ ...CHESS_PLAZA, minY: -1, maxY: 4 }) })]);

export const isProtectedSpace = (spaceId) => MULTIPLAYER_SPACES[spaceId]?.safeZone === true;

export function isInsideSafeZone(position) {
  if (!position || !['x', 'y', 'z'].every((key) => Number.isFinite(position[key]))) return false;
  return [...MULTIPLAYER_SAFE_ZONES, ...CITY_SAFE_ZONES].some(({ bounds }) =>
    position.x >= bounds.minX && position.x <= bounds.maxX
    && position.y >= bounds.minY && position.y <= bounds.maxY
    && position.z >= bounds.minZ && position.z <= bounds.maxZ);
}

const distance = (a, b) => Math.hypot((a?.x || 0) - b.x, (a?.y || 0) - b.y, (a?.z || 0) - b.z);

export function validSpaceIntent(message, protocolVersion) {
  return !!message && message.v === protocolVersion && message.type === 'space' && Number.isSafeInteger(message.seq) && message.seq >= 0
    && ['enter', 'exit'].includes(message.action) && typeof message.spaceId === 'string' && !!MULTIPLAYER_SPACES[message.spaceId]
    && !['playerId', 'context', 'team', 'position', 'destination'].some((field) => Object.hasOwn(message, field));
}

export function positionAllowedInSpace(position, spaceId, cityBounds) {
  if (!position || !['x', 'y', 'z'].every((key) => Number.isFinite(position[key]))) return false;
  if (spaceId === 'city') return position.x >= cityBounds.minX && position.x <= cityBounds.maxX && position.z >= cityBounds.minZ && position.z <= cityBounds.maxZ && position.y >= -4 && position.y <= 40;
  const bounds = MULTIPLAYER_SPACES[spaceId]?.bounds; if (!bounds) return false;
  return position.x >= bounds.minX && position.x <= bounds.maxX && position.y >= bounds.minY && position.y <= bounds.maxY && position.z >= bounds.minZ && position.z <= bounds.maxZ;
}

export function applySpaceIntent(player, message, now, protocolVersion) {
  if (!validSpaceIntent(message, protocolVersion)) return { ok: false, reason: 'invalid_space' };
  if (message.seq <= (player.lastSpaceSeq ?? -1)) return { ok: false, reason: 'stale_space_sequence' };
  player.lastSpaceSeq = message.seq;
  const current = player.context?.space?.id || 'city', target = MULTIPLAYER_SPACES[message.spaceId];
  if (!player.state) return { ok: false, reason: 'position_unavailable' };
  // Stage 2: an apartment (a space with a parent) is entered from its building's lobby, at the lift, and left
  // back into the lobby; everything else is entered from the city and left to it.
  const from = target.parent || 'city';
  if (message.action === 'enter') {
    if (current !== from || target.id === 'city' || distance(player.state, target.entry) > 3.6) return { ok: false, reason: 'not_at_entrance' };
    player.context.space = { id: target.id, instanceId: target.id }; player.contextRevision++;
    player.state = { ...player.state, x: target.inside.x, y: target.inside.y, z: target.inside.z, serverTime: now };
  } else {
    if (current !== target.id || target.id === 'city' || distance(player.state, target.exit) > 3.6) return { ok: false, reason: 'not_at_exit' };
    player.context.space = target.parent ? { id: target.parent, instanceId: target.parent } : { id: 'city', instanceId: null }; player.contextRevision++;
    player.state = { ...player.state, x: target.outside.x, y: target.outside.y, z: target.outside.z, serverTime: now };
  }
  return { ok: true, state: { playerId: player.id, context: player.context, contextRevision: player.contextRevision, state: player.state, serverTime: now } };
}
