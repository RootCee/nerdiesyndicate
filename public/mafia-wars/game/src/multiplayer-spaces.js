export const SPACE_SCHEMA_VERSION = 1;

export const MULTIPLAYER_SPACES = Object.freeze({
  city: Object.freeze({ id: 'city', layer: 0 }),
  'north-court': Object.freeze({ id: 'north-court', layer: 1, entry: { x: 18.6, y: 0, z: 100 }, inside: { x: 23.7, y: 40, z: 100 }, exit: { x: 23.3, y: 40, z: 100 }, outside: { x: 18.8, y: 0, z: 100 }, bounds: { minX: 22.2, maxX: 35.8, minY: 39, maxY: 45, minZ: 94.5, maxZ: 105.5 } }),
  'east-73': Object.freeze({ id: 'east-73', layer: 1, entry: { x: 105.15, y: 0, z: 73 }, inside: { x: 107.3, y: 55, z: 73 }, exit: { x: 106.9, y: 55, z: 73 }, outside: { x: 105.05, y: 0, z: 73 }, bounds: { minX: 105.5, maxX: 118.5, minY: 54, maxY: 60, minZ: 67.5, maxZ: 78.5 } }),
  'hood-cross-west': Object.freeze({ id: 'hood-cross-west', layer: 1, entry: { x: -48.45, y: 0, z: 53.75 }, inside: { x: -54.7, y: 70, z: 62 }, exit: { x: -55.1, y: 70, z: 62 }, outside: { x: -48.45, y: 0, z: 53.45 }, bounds: { minX: -56.5, maxX: -43.5, minY: 69, maxY: 75, minZ: 56.5, maxZ: 67.5 } }),
  'hood-duplicate-west-5': Object.freeze({ id: 'hood-duplicate-west-5', layer: 1, entry: { x: 173.25, y: 0, z: 5.55 }, inside: { x: 159.7, y: 85, z: 4 }, exit: { x: 159.9, y: 85, z: 4 }, outside: { x: 173.55, y: 0, z: 5.55 }, bounds: { minX: 158.5, maxX: 171.5, minY: 84, maxY: 90, minZ: -1.5, maxZ: 9.5 } }),
});

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
  if (message.action === 'enter') {
    if (current !== 'city' || target.id === 'city' || distance(player.state, target.entry) > 3.6) return { ok: false, reason: 'not_at_entrance' };
    player.context.space = { id: target.id, instanceId: target.id }; player.contextRevision++;
    player.state = { ...player.state, x: target.inside.x, y: target.inside.y, z: target.inside.z, serverTime: now };
  } else {
    if (current !== target.id || target.id === 'city' || distance(player.state, target.exit) > 3.6) return { ok: false, reason: 'not_at_exit' };
    player.context.space = { id: 'city', instanceId: null }; player.contextRevision++;
    player.state = { ...player.state, x: target.outside.x, y: target.outside.y, z: target.outside.z, serverTime: now };
  }
  return { ok: true, state: { playerId: player.id, context: player.context, contextRevision: player.contextRevision, state: player.state, serverTime: now } };
}
