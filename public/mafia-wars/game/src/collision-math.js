export const PLAYER_MOVE_SUBSTEP = 0.16;
export const PLAYER_COLLISION_RADIUS = 0.62;
export const COLLISION_SOLVER_PASSES = 6;

export function movementSubsteps(dx, dz, maxStep = PLAYER_MOVE_SUBSTEP) {
  const distance = Math.hypot(dx, dz);
  return Math.max(1, Math.ceil(distance / Math.max(0.01, maxStep)));
}

// Push a circle out of an axis-aligned rectangle. Keeping this pure makes the
// low-cost player/world collision path testable without loading Three.js.
export function resolveCircleAabb(point, radius, box, outNormal = null) {
  const nearestX = Math.max(box.minX, Math.min(point.x, box.maxX));
  const nearestZ = Math.max(box.minZ, Math.min(point.z, box.maxZ));
  const dx = point.x - nearestX;
  const dz = point.z - nearestZ;
  const distanceSq = dx * dx + dz * dz;
  if (distanceSq >= radius * radius) return false;

  if (distanceSq > 1e-8) {
    const distance = Math.sqrt(distanceSq);
    const nx = dx / distance, nz = dz / distance;
    point.x += nx * (radius - distance);
    point.z += nz * (radius - distance);
    if (outNormal) { outNormal.x = nx; outNormal.z = nz; }
  } else {
    const penetrationX = Math.min(point.x - box.minX, box.maxX - point.x);
    const penetrationZ = Math.min(point.z - box.minZ, box.maxZ - point.z);
    if (penetrationX < penetrationZ) {
      const nx = point.x - box.minX < box.maxX - point.x ? -1 : 1;
      point.x += nx * (penetrationX + radius);
      if (outNormal) { outNormal.x = nx; outNormal.z = 0; }
    } else {
      const nz = point.z - box.minZ < box.maxZ - point.z ? -1 : 1;
      point.z += nz * (penetrationZ + radius);
      if (outNormal) { outNormal.x = 0; outNormal.z = nz; }
    }
  }
  return true;
}

// A single collider pass is not sufficient at joined walls or where a parked
// vehicle overlaps another blocker: resolving the later box can move the circle
// back into an earlier one. Iterate to a stable non-penetrating position and
// retain the normals so callers can project velocity for wall sliding.
export function resolveCircleAabbs(point, radius, boxes, contacts = null, maxPasses = COLLISION_SOLVER_PASSES) {
  let hit = false;
  const normal = { x: 0, z: 0 };
  if (contacts) contacts.length = 0;
  for (let pass = 0; pass < maxPasses; pass++) {
    let passHit = false;
    for (const box of boxes) {
      if (!resolveCircleAabb(point, radius, box, normal)) continue;
      hit = passHit = true;
      if (contacts) contacts.push({ x: normal.x, z: normal.z, box });
    }
    if (!passHit) break;
  }
  return hit;
}

export function moveCircleWithSubsteps(point, dx, dz, radius, boxes, maxStep = PLAYER_MOVE_SUBSTEP, contacts = null) {
  const steps = movementSubsteps(dx, dz, maxStep);
  const stepX = dx / steps;
  const stepZ = dz / steps;
  let hit = false;
  const stepContacts = contacts ? [] : null;
  if (contacts) contacts.length = 0;
  for (let i = 0; i < steps; i++) {
    point.x += stepX;
    point.z += stepZ;
    if (resolveCircleAabbs(point, radius, boxes, stepContacts)) {
      hit = true;
      if (contacts) contacts.push(...stepContacts);
    }
  }
  return hit;
}
