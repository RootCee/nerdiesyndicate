export function collisionDistance(distance, hitFraction, padding = 0.2) {
  if (!Number.isFinite(distance) || distance <= 0) return 0;
  const hit = Number.isFinite(hitFraction) ? Math.min(1, Math.max(0, hitFraction)) : 1;
  if (hit >= 1) return distance;
  return Math.min(distance, Math.max(0.35, distance * hit - padding));
}

export function cameraFloorHeight(feetY, clearance = 0.24) {
  const floor = Number.isFinite(feetY) ? feetY : 0;
  return floor + Math.max(0, clearance);
}

export function clampCameraHeight(cameraY, feetY, clearance = 0.24) {
  return Math.max(cameraFloorHeight(feetY, clearance), Number.isFinite(cameraY) ? cameraY : cameraFloorHeight(feetY, clearance));
}

export function dampFactor(speed, dt) {
  return 1 - Math.exp(-Math.max(0, speed) * Math.max(0, dt));
}

export function dampValue(current, target, speed, dt) {
  return current + (target - current) * dampFactor(speed, dt);
}

export function shortestAngleDelta(current, target) {
  return Math.atan2(Math.sin(target - current), Math.cos(target - current));
}

export function dampAngle(current, target, speed, dt) {
  return current + shortestAngleDelta(current, target) * dampFactor(speed, dt);
}
