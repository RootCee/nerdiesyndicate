// Multiplayer shots start at the player's position + MULTIPLAYER_SHOT_EYE_HEIGHT
// (server authority), not at the camera. In first person the camera eye sits
// higher than that origin; in third person it sits behind and beside the
// player. Aiming at whatever lies under the crosshair and sending the direction
// from the server origin makes both views land on the crosshair at any range.
// Plain-object math so it runs in Node tests without Three.js.
export function crosshairShotDirection({ camera, forward, origin, hitDistance, range }, out = {}) {
  // Hits between the camera and the player (the third-person camera looks over
  // the player's shoulder) are ignored so a shot can never point backwards.
  const behind = (origin.x - camera.x) * forward.x + (origin.y - camera.y) * forward.y + (origin.z - camera.z) * forward.z;
  const minimum = Math.max(0, behind) + 0.5;
  const distance = Number.isFinite(hitDistance) && hitDistance > minimum ? hitDistance : minimum + range;
  const x = camera.x + forward.x * distance - origin.x, y = camera.y + forward.y * distance - origin.y, z = camera.z + forward.z * distance - origin.z;
  const length = Math.hypot(x, y, z) || 1;
  out.x = x / length; out.y = y / length; out.z = z / length;
  return out;
}

// Distance along a unit ray to an upright cylinder standing at `base` (a remote
// player's body), or Infinity when the ray misses it.
export function rayCapsuleDistance(from, dir, base, radius = 0.42, height = 1.8) {
  const ox = from.x - base.x, oz = from.z - base.z, a = dir.x * dir.x + dir.z * dir.z;
  if (a < 1e-8) return Infinity;
  const b = ox * dir.x + oz * dir.z, c = ox * ox + oz * oz - radius * radius, disc = b * b - a * c;
  if (disc < 0) return Infinity;
  const t = (-b - Math.sqrt(disc)) / a;
  if (t < 0) return Infinity;
  const y = from.y + dir.y * t - base.y;
  return y >= 0 && y <= height ? t : Infinity;
}
