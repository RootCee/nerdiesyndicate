export const PROTOCOL_VERSION = 4;
export const MULTIPLAYER_LIMITS = Object.freeze({
  maxPlayers: 6,
  updateHz: 15,
  interpolationMs: 120,
  interpolationMinMs: 100,
  interpolationMaxMs: 220,
  maxExtrapolationMs: 100,
  idleUpdateMs: 1000,
  joinTicketMs: 30_000,
  reconnectGraceMs: 15_000,
  roomIdleMs: 15 * 60_000,
  maxPayloadBytes: 1024,
  maxMessagesPerSecond: 30,
  maxAppearanceUpdatesPerSecond: 2,
  maxEquipmentUpdatesPerSecond: 4,
  maxSpeed: 8.5,
  maxAcceleration: 32,
  bounds: Object.freeze({ minX: -140, maxX: 244, minZ: -148, maxZ: 148 }),
});

// Server-assigned indices keep joins separated without moving anyone already in
// the room. Clients resolve these targets through the normal free-cell search.
export const MULTIPLAYER_SPAWNS = Object.freeze([
  Object.freeze({ x: -8, z: 24 }), Object.freeze({ x: 0, z: 24 }),
  Object.freeze({ x: 8, z: 24 }), Object.freeze({ x: -8, z: 32 }),
  Object.freeze({ x: 0, z: 32 }), Object.freeze({ x: 8, z: 32 }),
]);

export function validMovement(message) {
  if (!message || message.v !== PROTOCOL_VERSION || message.type !== 'move') return false;
  if (!Number.isSafeInteger(message.seq) || message.seq < 0) return false;
  return ['x', 'y', 'z', 'yaw', 'speed'].every((key) => Number.isFinite(message[key]))
    && ['idle', 'walk', 'run'].includes(message.state);
}

export function interpolateSnapshots(snapshots, renderAt, out = {}, maxExtrapolationMs = 0) {
  if (!snapshots.length) return null;
  while (snapshots.length > 2 && snapshots[1].at <= renderAt) snapshots.shift();
  const a = snapshots[0], b = snapshots[1] || a;
  if (b !== a && renderAt > b.at && maxExtrapolationMs > 0) {
    const sampleMs = Math.max(1, b.at - a.at), extraMs = Math.min(maxExtrapolationMs, renderAt - b.at);
    const ratio = extraMs / sampleMs;
    const angle = Math.atan2(Math.sin(b.yaw - a.yaw), Math.cos(b.yaw - a.yaw));
    out.x = b.x + (b.x - a.x) * ratio;
    out.y = b.y + (b.y - a.y) * ratio;
    out.z = b.z + (b.z - a.z) * ratio;
    out.yaw = b.yaw + angle * ratio;
    out.speed = b.speed;
    out.state = b.state;
    out.at = renderAt;
    out.extrapolated = true;
    return out;
  }
  const span = Math.max(1, b.at - a.at);
  const t = Math.max(0, Math.min(1, (renderAt - a.at) / span));
  const angle = Math.atan2(Math.sin(b.yaw - a.yaw), Math.cos(b.yaw - a.yaw));
  out.x = a.x + (b.x - a.x) * t;
  out.y = a.y + (b.y - a.y) * t;
  out.z = a.z + (b.z - a.z) * t;
  out.yaw = a.yaw + angle * t;
  out.speed = a.speed + (b.speed - a.speed) * t;
  out.state = t < 0.5 ? a.state : b.state;
  out.at = renderAt;
  out.extrapolated = false;
  return out;
}
