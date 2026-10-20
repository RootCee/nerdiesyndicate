export const PLAYER_MOVE_SUBSTEP = 0.16;
export const PLAYER_COLLISION_RADIUS = 0.62;

export function movementSubsteps(dx, dz, maxStep = PLAYER_MOVE_SUBSTEP) {
  const distance = Math.hypot(dx, dz);
  return Math.max(1, Math.ceil(distance / Math.max(0.01, maxStep)));
}

// Push a circle out of an axis-aligned rectangle. Keeping this pure makes the
// low-cost player/world collision path testable without loading Three.js.
export function resolveCircleAabb(point, radius, box) {
  const nearestX = Math.max(box.minX, Math.min(point.x, box.maxX));
  const nearestZ = Math.max(box.minZ, Math.min(point.z, box.maxZ));
  const dx = point.x - nearestX;
  const dz = point.z - nearestZ;
  const distanceSq = dx * dx + dz * dz;
  if (distanceSq >= radius * radius) return false;

  if (distanceSq > 1e-8) {
    const distance = Math.sqrt(distanceSq);
    point.x += dx / distance * (radius - distance);
    point.z += dz / distance * (radius - distance);
  } else {
    const penetrationX = Math.min(point.x - box.minX, box.maxX - point.x);
    const penetrationZ = Math.min(point.z - box.minZ, box.maxZ - point.z);
    if (penetrationX < penetrationZ) point.x += point.x - box.minX < box.maxX - point.x ? -(penetrationX + radius) : penetrationX + radius;
    else point.z += point.z - box.minZ < box.maxZ - point.z ? -(penetrationZ + radius) : penetrationZ + radius;
  }
  return true;
}

export function moveCircleWithSubsteps(point, dx, dz, radius, boxes, maxStep = PLAYER_MOVE_SUBSTEP) {
  const steps = movementSubsteps(dx, dz, maxStep);
  const stepX = dx / steps;
  const stepZ = dz / steps;
  let hit = false;
  for (let i = 0; i < steps; i++) {
    point.x += stepX;
    point.z += stepZ;
    for (const box of boxes) hit = resolveCircleAabb(point, radius, box) || hit;
  }
  return hit;
}
