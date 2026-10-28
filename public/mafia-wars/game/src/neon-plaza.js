// Neon Plaza (neon-market-layout.js NEON_PLAZA): the open square at Main Street and Neon Boulevard. Paving,
// a neon gateway arch on the boulevard naming the neighbourhood, a basin ringed with neon in the middle, and
// planters with benches. Fixtures block walking but not bullets (fence colliders), like the park's.
import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { KitBatch, signMaterial } from './city-showcase-kit.js';
import { NEON_PLAZA } from './neon-market-layout.js';

const P = NEON_PLAZA, cx = (P.minX + P.maxX) / 2, cz = (P.minZ + P.maxZ) / 2;
// [x, z, width, depth, height] of every solid fixture, for the colliders and the tests
export const NEON_PLAZA_FIXTURES = Object.freeze([
  ...[-1, 1].map((s) => Object.freeze({ id: `neon-arch-post-${s < 0 ? 'w' : 'e'}`, x: cx + s * 7, z: P.minZ + 2, width: 0.9, depth: 0.9, height: 7.6 })),
  Object.freeze({ id: 'neon-basin', x: cx, z: cz, width: 7, depth: 7, height: 0.8 }),
  ...[[-24, -14], [24, -14], [-24, 14], [24, 14], [-12, -16], [12, -16], [-12, 16], [12, 16]].map(([dx, dz], i) => Object.freeze({ id: `neon-planter-${i}`, x: cx + dx, z: cz + dz, width: 3, depth: 3, height: 0.9 })),
]);

export function buildNeonPlaza(kit, group, { mobile = false } = {}) {
  const m = kit.m, b = new KitBatch();
  b.box(m.forecourt, cx, 0.06, cz, P.maxX - P.minX, 0.08, P.maxZ - P.minZ);
  // the gateway: two dark posts wrapped in neon, a beam with tubes along both faces
  for (const s of [-1, 1]) {
    const x = cx + s * 7, z = P.minZ + 2;
    b.box(m.charcoal, x, 3.8, z, 0.9, 7.6, 0.9);
    for (const k of [0.2, 0.8]) b.box(m.neonPink, x, 7.6 * k, z, 1.0, 0.08, 1.0);
    b.box(m.neonCyan, x - s * 0.47, 3.8, z, 0.06, 7.0, 0.06);
  }
  b.box(m.charcoal, cx, 7.9, P.minZ + 2, 15.4, 1.4, 0.7);
  for (const s of [-1, 1]) { b.box(m.neonCyan, cx, 7.25, P.minZ + 2 + s * 0.37, 15, 0.07, 0.05); b.box(m.neonPink, cx, 8.55, P.minZ + 2 + s * 0.37, 15, 0.07, 0.05); }
  // the basin: a stone ring, dark water, a neon ring at the rim and a lit column
  b.add(m.stone, new THREE.CylinderGeometry(3.5, 3.6, 0.8, mobile ? 18 : 28).translate(cx, 0.4, cz));
  b.add(m.glass, new THREE.CylinderGeometry(3.2, 3.2, 0.05, mobile ? 18 : 28).translate(cx, 0.76, cz));
  b.add(m.neonPink, new THREE.TorusGeometry(3.45, 0.05, 6, mobile ? 24 : 40).rotateX(Math.PI / 2).translate(cx, 0.82, cz));
  b.cyl(m.charcoal, cx, 1.8, cz, 0.35, 2.2, 12, 0.3); b.cyl(m.neonCyan, cx, 3.0, cz, 0.12, 0.6, 10, 0.12);
  // planters with a bench on their inner side
  for (const f of NEON_PLAZA_FIXTURES.filter((x) => x.id.startsWith('neon-planter'))) {
    b.box(m.charcoal, f.x, 0.45, f.z, 3, 0.9, 3); b.box(m.grass, f.x, 0.92, f.z, 2.7, 0.06, 2.7);
    b.cyl(m.trunk, f.x, 1.6, f.z, 0.12, 1.4, 8, 0.1); b.blob(m.leaf, f.x, 3.0, f.z, 1.3, 1);
    const dz = Math.sign(cz - f.z); b.box(m.frame, f.x, 0.45, f.z + dz * 2.2, 2.4, 0.12, 0.6);
  }
  const meshes = b.build(group, 'neon-plaza', { castShadow: true });
  // the arch's sign, on both faces of the beam
  const sign = signMaterial(kit, (ctx, w, h) => {
    ctx.fillStyle = '#0c0c14'; ctx.fillRect(0, 0, w, h); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff7cc4'; ctx.font = '700 118px Barlow, sans-serif'; ctx.fillText('NEON MARKET', w / 2, h * 0.52);
  }, { w: 1024, h: 180, day: 0.35, night: 1.4, preview: 0x0c0c14 });
  for (const s of [-1, 1]) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.1), sign);
    plane.position.set(cx, 7.9, P.minZ + 2 + s * 0.36); plane.rotation.y = s < 0 ? Math.PI : 0; plane.name = `neon-plaza-sign-${s < 0 ? 's' : 'n'}`;
    group.add(plane);
  }
  return { meshes, triangles: b.triangles };
}

export function addNeonPlazaColliders(addCollider) {
  return NEON_PLAZA_FIXTURES.map((f) => addCollider(f.x - f.width / 2, f.z - f.depth / 2, f.x + f.width / 2, f.z + f.depth / 2, 0, f.height, { fence: true, park: f.id }));
}
