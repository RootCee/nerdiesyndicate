import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { KitBatch } from './city-showcase-kit.js';

// Stage 2: draws entrance-walkways.js: pale pavers with darker edge curbs, a doormat at each door, and low
// warm lamps along the way (every 3 m; every 6 m on phones). One batch: a handful of draw calls citywide.
export function buildEntranceWalkways(walkways, { mobile = false } = {}) {
  const group = new THREE.Group(); group.name = 'entrance-walkways';
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.r ?? 0.85, metalness: o.metal ?? 0, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 0 });
  const M = { paver: std(0xc4bcae), curb: std(0x6e675e), mat: std(0x2a2420, { r: 1 }), post: std(0x26282c, { r: 0.4, metal: 0.6 }), lamp: std(0x332a1c, { e: 0xffd9a0, ei: 1.6 }) };
  M.paver.name = 'walkway-paver'; M.lamp.name = 'walkway-lamp';
  const b = new KitBatch(), top = 0.115, box = (mat, x0, x1, y0, y1, z0, z1) => b.box(mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0);
  let lamps = 0;
  for (const w of walkways) {
    for (const s of w.segments) {
      box(M.paver, s.minX, s.maxX, 0.02, top, s.minZ, s.maxZ);
      const alongX = s.maxX - s.minX >= s.maxZ - s.minZ;
      if (alongX) { box(M.curb, s.minX, s.maxX, 0.02, top + 0.03, s.minZ, s.minZ + 0.1); box(M.curb, s.minX, s.maxX, 0.02, top + 0.03, s.maxZ - 0.1, s.maxZ); }
      else { box(M.curb, s.minX, s.minX + 0.1, 0.02, top + 0.03, s.minZ, s.maxZ); box(M.curb, s.maxX - 0.1, s.maxX, 0.02, top + 0.03, s.minZ, s.maxZ); }
    }
    box(M.mat, w.foot.x - 0.6, w.foot.x + 0.6, top, top + 0.015, w.foot.z - 0.6, w.foot.z + 0.6); // the doormat
    w.lamps.forEach((p, i) => {
      if (mobile && i % 4 >= 2 && i > 1) return; // every other pair on phones (the pair by the door always)
      box(M.post, p.x - 0.05, p.x + 0.05, 0, 0.85, p.z - 0.05, p.z + 0.05); box(M.lamp, p.x - 0.11, p.x + 0.11, 0.85, 1.05, p.z - 0.11, p.z + 0.11); lamps++;
    });
  }
  b.build(group, 'entrance-walkways', { castShadow: false });
  group.userData.lamps = lamps;
  return group;
}
