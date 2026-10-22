export const PROTOCOL_VERSION = 1;
export const MULTIPLAYER_LIMITS = Object.freeze({
  maxPlayers: 2,
  updateHz: 15,
  interpolationMs: 120,
  reconnectGraceMs: 15_000,
  roomIdleMs: 15 * 60_000,
  maxPayloadBytes: 1024,
  maxMessagesPerSecond: 30,
  maxSpeed: 8.5,
  maxAcceleration: 32,
  bounds: Object.freeze({ minX: -140, maxX: 244, minZ: -148, maxZ: 148 }),
});

export function validMovement(message) {
  if (!message || message.v !== PROTOCOL_VERSION || message.type !== 'move') return false;
  if (!Number.isSafeInteger(message.seq) || message.seq < 0) return false;
  return ['x', 'y', 'z', 'yaw', 'speed'].every((key) => Number.isFinite(message[key]))
    && ['idle', 'walk', 'run'].includes(message.state);
}

export function interpolateSnapshots(snapshots, renderAt, out = {}) {
  if (!snapshots.length) return null;
  while (snapshots.length > 2 && snapshots[1].at <= renderAt) snapshots.shift();
  const a = snapshots[0], b = snapshots[1] || a;
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
  return out;
}
