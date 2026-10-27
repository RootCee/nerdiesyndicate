import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { KitBatch, signMaterial, PALETTE } from './city-showcase-kit.js';
import { parkMaterials, tree } from './city-park.js';
import {
  ACADEMY, ACADEMY_GREEN, ACADEMY_AXIS_Z, ACADEMY_PATHS, ACADEMY_BENCHES, ACADEMY_LAMPS, ACADEMY_GATE, ACADEMY_WALL, QUAD, FOUNTAIN, FOUNTAIN_PLAZA,
  LIBRARY, LIBRARY_FOOT, academyChunkFor, academyFixtures, academyTrees,
} from './academy-layout.js';

// M7.2 the Nerdie Blaq Academy grounds: lawns, walks, the fountain plaza, the gate and street wall,
// lamps, benches and trees, drawn from academy-layout.js into one merged mesh per material per
// render chunk (like the park). The buildings themselves are showcase designs (city-showcase.js).
const hexCss = (h) => `#${h.toString(16).padStart(6, '0')}`;
const rnd = (seed) => { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909), (s >>>= 0) / 4294967296)); };
const box = (b, mat, x0, x1, y0, y1, z0, z1) => b.box(mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0);

function gateSign(kit) {
  return signMaterial(kit, (ctx, w, h) => {
    ctx.fillStyle = hexCss(PALETTE.green); ctx.fillRect(0, 0, w, h); ctx.strokeStyle = hexCss(PALETTE.gold); ctx.lineWidth = 10; ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = '#f0d28a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 104px Barlow, sans-serif'; ctx.fillText('NERDIE BLAQ ACADEMY', w / 2, h * 0.42, w * 0.88);
    ctx.font = '500 40px Barlow, sans-serif'; ctx.fillText('KNOWLEDGE  ·  OWNERSHIP  ·  COMMUNITY', w / 2, h * 0.76, w * 0.84);
  }, { w: 1280, h: 220, day: 0.2, night: 1.1, preview: PALETTE.green });
}
function plaque(kit, title, lines) {
  return signMaterial(kit, (ctx, w, h) => {
    ctx.fillStyle = hexCss(PALETTE.charcoal); ctx.fillRect(0, 0, w, h); ctx.strokeStyle = hexCss(PALETTE.gold); ctx.lineWidth = 8; ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = '#f0d28a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 64px Barlow, sans-serif'; ctx.fillText(title, w / 2, 70, w * 0.9);
    ctx.fillStyle = '#e7e0d0'; ctx.font = '500 38px Barlow, sans-serif'; lines.forEach((l, i) => ctx.fillText(l, w / 2, 150 + i * 56, w * 0.9));
  }, { w: 768, h: 420, day: 0.25, night: 1.0, preview: PALETTE.charcoal });
}
function signPlane(parent, mat, x, y, z, w, h, rotY, name) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = rotY; m.name = name; m.castShadow = false; parent.add(m); return m; }

// groups: { [chunkId]: THREE.Group }. Returns { triangles }.
export function buildAcademyGrounds(kit, groups, { mobile = false } = {}) {
  const P = parkMaterials(kit), m = kit.m, batches = new Map(), r = rnd(2072);
  const B = (x, z) => { const id = academyChunkFor(x, z); if (!batches.has(id)) batches.set(id, new KitBatch()); return batches.get(id); };
  const group = (x, z) => groups[academyChunkFor(x, z)]; // signs are meshes of their own, in the chunk's group
  const gravel = new THREE.MeshStandardMaterial({ color: 0xbcae93, roughness: 0.95, name: 'academy-gravel' });
  // the quad: mowed turf with a gold-edged border; the walks; the fountain plaza
  box(B(318, 30), P.turf, QUAD.minX, QUAD.maxX, -0.02, 0.025, QUAD.minZ, QUAD.maxZ);
  for (const p of ACADEMY_PATHS) {
    if (!p.width) continue;
    const h = p.width / 2, mat = p.id.startsWith('campus-loop') ? gravel : m.forecourt;
    const [x0, x1, z0, z1] = p.axis === 'x' ? [p.c - h, p.c + h, p.a0 - (p.id.startsWith('campus-loop') ? h : 0), p.a1 + (p.id.startsWith('campus-loop') ? h : 0)] : [p.a0 - (p.id.startsWith('campus-loop') ? h : 0), p.a1 + (p.id.startsWith('campus-loop') ? h : 0), p.c - h, p.c + h];
    // long walks go in pieces so each lands in the chunk it crosses
    const along = p.axis === 'x' ? [z0, z1] : [x0, x1];
    for (let a = along[0]; a < along[1] - 0.01; a += 24) {
      const e = Math.min(along[1], a + 24), cx = p.axis === 'x' ? p.c : (a + e) / 2, cz = p.axis === 'x' ? (a + e) / 2 : p.c;
      if (p.axis === 'x') box(B(cx, cz), mat, x0, x1, 0.01, 0.04, a, e); else box(B(cx, cz), mat, a, e, 0.01, 0.04, z0, z1);
    }
    if (p.width >= 4) for (const s of [-1, 1]) for (let a = along[0]; a < along[1] - 0.01; a += 24) { // gold-edged main walks
      const e = Math.min(along[1], a + 24), cz = p.c + s * (h - 0.08); box(B((a + e) / 2, cz), m.gold, a, e, 0.04, 0.05, cz - 0.08, cz + 0.08);
    }
  }
  const FP = FOUNTAIN_PLAZA, fb = B(FOUNTAIN.x, FOUNTAIN.z);
  box(fb, m.forecourt, FP.minX, FP.maxX, 0.01, 0.045, FP.minZ, FP.maxZ);
  for (const [x0, x1, z0, z1] of [[FP.minX, FP.maxX, FP.minZ, FP.minZ + 0.2], [FP.minX, FP.maxX, FP.maxZ - 0.2, FP.maxZ], [FP.minX, FP.minX + 0.2, FP.minZ, FP.maxZ], [FP.maxX - 0.2, FP.maxX, FP.minZ, FP.maxZ]]) box(fb, m.gold, x0, x1, 0.045, 0.055, z0, z1);
  // ---- the Syndicate fountain: a stone basin, water, three tiers, the gold crest sphere
  const F = FOUNTAIN;
  fb.add(P.stone, new THREE.CylinderGeometry(F.radius, F.radius + 0.12, 0.7, 32).translate(F.x, 0.35, F.z));
  fb.add(m.gold, new THREE.TorusGeometry(F.radius - 0.02, 0.06, 4, 40).rotateX(Math.PI / 2).translate(F.x, 0.71, F.z));
  fb.add(P.water, new THREE.CylinderGeometry(F.radius - 0.25, F.radius - 0.25, 0.04, 32).translate(F.x, 0.64, F.z));
  fb.cyl(P.stone, F.x, 1.2, F.z, 0.5, 1.2, 14, 0.36); fb.add(P.stone, new THREE.CylinderGeometry(1.6, 1.2, 0.2, 24).translate(F.x, 1.85, F.z)); fb.add(P.water, new THREE.CylinderGeometry(1.45, 1.45, 0.04, 24).translate(F.x, 1.96, F.z));
  fb.cyl(P.stone, F.x, 2.45, F.z, 0.26, 1.0, 12, 0.2); fb.add(P.stone, new THREE.CylinderGeometry(0.85, 0.6, 0.16, 20).translate(F.x, 2.98, F.z)); fb.add(P.water, new THREE.CylinderGeometry(0.72, 0.72, 0.04, 20).translate(F.x, 3.07, F.z));
  fb.cyl(m.purple, F.x, 3.35, F.z, 0.12, 0.5, 10); fb.add(m.gold, new THREE.SphereGeometry(0.42, 20, 12).translate(F.x, 3.85, F.z)); fb.add(m.gold, new THREE.TorusGeometry(0.62, 0.04, 6, 32).rotateY(Math.PI / 2).translate(F.x, 3.85, F.z));
  // ---- the gate on Academy Avenue: stone pillars with lanterns, an arch carrying the name both ways, iron gates folded back
  const G = ACADEMY_GATE, gb = B(G.x, G.z), half = G.opening / 2, rotW = -Math.PI / 2, rotE = Math.PI / 2;
  for (const s of [-1, 1]) {
    const pz = G.z + s * (half + G.pillar / 2);
    box(gb, m.stone, G.x - G.pillar / 2, G.x + G.pillar / 2, 0, G.height, pz - G.pillar / 2, pz + G.pillar / 2);
    box(gb, m.trim, G.x - 0.6, G.x + 0.6, 0, 0.5, pz - 0.6, pz + 0.6); box(gb, m.gold, G.x - 0.58, G.x + 0.58, G.height, G.height + 0.14, pz - 0.58, pz + 0.58);
    gb.cyl(m.frame, G.x, G.height + 0.45, pz, 0.05, 0.6, 8); box(gb, m.lamp, G.x - 0.18, G.x + 0.18, G.height + 0.7, G.height + 1.12, pz - 0.18, pz + 0.18); box(gb, m.charcoal, G.x - 0.24, G.x + 0.24, G.height + 1.12, G.height + 1.2, pz - 0.24, pz + 0.24);
    for (let k = 0; k < 9; k++) gb.cyl(m.frame, G.x + 0.1 + k * 0.32, 1.1, pz - s * (G.pillar / 2 + 0.06), 0.025, 2.2, 6); // gate leaves folded back against the wall line
    box(gb, m.frame, G.x + 0.05, G.x + 2.8, 2.1, 2.16, pz - s * (G.pillar / 2 + 0.06) - 0.03, pz - s * (G.pillar / 2 + 0.06) + 0.03);
  }
  box(gb, m.stone, G.x - 0.45, G.x + 0.45, G.height + 0.2, G.archTop, G.z - half - G.pillar, G.z + half + G.pillar);
  box(gb, m.gold, G.x - 0.47, G.x + 0.47, G.archTop, G.archTop + 0.08, G.z - half - G.pillar, G.z + half + G.pillar);
  const gs = gateSign(kit);
  signPlane(group(G.x, G.z), gs, G.x - 0.47, (G.height + 0.2 + G.archTop) / 2, G.z, G.opening + 1.4, 1.3, rotW, 'academy-gate-sign-west');
  signPlane(group(G.x, G.z), gs, G.x + 0.47, (G.height + 0.2 + G.archTop) / 2, G.z, G.opening + 1.4, 1.3, rotE, 'academy-gate-sign-east');
  // the street wall: a stone base, iron railings, piers every 8 m
  const W = ACADEMY_WALL;
  for (const [z0, z1] of [[ACADEMY.minZ, G.z - half - G.pillar], [G.z + half + G.pillar, ACADEMY.maxZ]]) {
    for (let a = z0; a < z1 - 0.01; a += 24) {
      const e = Math.min(z1, a + 24), wb = B(W.x, (a + e) / 2);
      box(wb, m.stone, W.x - W.thick / 2, W.x + W.thick / 2, 0, 0.55, a, e); box(wb, m.trim, W.x - W.thick / 2 - 0.04, W.x + W.thick / 2 + 0.04, 0.55, 0.62, a, e);
      box(wb, m.frame, W.x - 0.02, W.x + 0.02, 1.32, 1.36, a, e);
      if (!mobile) for (let z = a + 0.2; z < e; z += 0.3) wb.cyl(m.frame, W.x, 0.97, z, 0.016, 0.75, 5);
      for (let z = Math.ceil(a / 8) * 8; z < e; z += 8) { box(wb, m.stone, W.x - 0.3, W.x + 0.3, 0, 1.5, z - 0.3, z + 0.3); box(wb, m.gold, W.x - 0.32, W.x + 0.32, 1.5, 1.56, z - 0.32, z + 0.32); }
    }
  }
  // a welcome board inside the gate, and one at the Library's stair foot
  const welcome = plaque(kit, 'WELCOME TO THE ACADEMY', ['THE LIBRARY: GUIDES AND PRACTICE EXAMS', 'AT THE HEAD OF THE AVENUE, PAST THE FOUNTAIN', 'SAFE ZONE INSIDE · FREE TO ALL']);
  const libraryBoard = plaque(kit, 'ACADEMY LIBRARY · OPEN', ['TWO GUIDES · TWO PRACTICE EXAMS', 'THE INTRO SERIES · THE EBOOK', 'UP THE STAIRS · SAFE ZONE INSIDE']);
  for (const [x, z, rot, name] of [[266, ACADEMY_AXIS_Z - 4.4, -Math.PI / 2, 'academy-welcome'], [LIBRARY_FOOT - 2, LIBRARY.z - 7.5, -Math.PI / 2, 'academy-library-board']]) {
    const bb = B(x, z); box(bb, m.frame, x - 0.05, x + 0.05, 0, 1.0, z - 0.9, z - 0.8); box(bb, m.frame, x - 0.05, x + 0.05, 0, 1.0, z + 0.8, z + 0.9); box(bb, m.charcoal, x - 0.06, x + 0.06, 0.95, 2.3, z - 1.0, z + 1.0);
    signPlane(group(x, z), name === 'academy-welcome' ? welcome : libraryBoard, x - 0.07, 1.62, z, 1.9, 1.04, rot, name);
  }
  // benches, lamps, trees
  for (const s of ACADEMY_BENCHES) {
    const L = 1.8, ax = s.alongZ, bb = B(s.x, s.z);
    for (const k of [-1, 1]) box(bb, m.frame, s.x + (ax ? -0.25 : k * 0.75) - 0.04, s.x + (ax ? 0.25 : k * 0.75) + 0.04, 0, 0.46, s.z + (ax ? k * 0.75 : -0.25) - 0.04, s.z + (ax ? k * 0.75 : 0.25) + 0.04);
    box(bb, m.trunk, s.x - (ax ? 0.25 : L / 2), s.x + (ax ? 0.25 : L / 2), 0.44, 0.5, s.z - (ax ? L / 2 : 0.25), s.z + (ax ? L / 2 : 0.25));
  }
  for (const l of ACADEMY_LAMPS) { const lb = B(l.x, l.z); lb.cyl(m.frame, l.x, 2.1, l.z, 0.07, 4.2, 8, 0.05); lb.cyl(m.charcoal, l.x, 4.25, l.z, 0.24, 0.12, 10); lb.cyl(m.lamp, l.x, 4.1, l.z, 0.2, 0.18, 10); }
  const trees = academyTrees();
  for (const [i, t] of trees.entries()) { if (mobile && t.z < ACADEMY.minZ && i % 2) continue; tree(B(t.x, t.z), P, kit, t.x, t.z, r); }
  let triangles = 0;
  for (const [id, b] of batches) { b.build(groups[id], `academy-grounds-${id}`, { castShadow: true }); triangles += b.triangles; }
  return { triangles };
}

// Campus fixtures block walking but not bullets (fence colliders), like the park's.
export function addAcademyColliders(addCollider) {
  return academyFixtures().map((f) => addCollider(f.minX, f.minZ, f.maxX, f.maxZ, 0, f.height, { fence: true, academy: f.id }));
}

// Map rectangles for the campus: lawns, walks, the plaza.
export function academyMapRects() {
  const out = [{ x: ACADEMY.minX, z: ACADEMY.minZ, w: ACADEMY.maxX - ACADEMY.minX, h: ACADEMY.maxZ - ACADEMY.minZ, type: 'park' }, { x: ACADEMY_GREEN.minX, z: ACADEMY_GREEN.minZ, w: ACADEMY_GREEN.maxX - ACADEMY_GREEN.minX, h: ACADEMY_GREEN.maxZ - ACADEMY_GREEN.minZ, type: 'park' }];
  out.push({ x: QUAD.minX, z: QUAD.minZ, w: QUAD.maxX - QUAD.minX, h: QUAD.maxZ - QUAD.minZ, type: 'field' });
  for (const p of ACADEMY_PATHS) { const h = Math.max(p.width, 3) / 2; out.push(p.axis === 'x' ? { x: p.c - h, z: p.a0, w: 2 * h, h: p.a1 - p.a0, type: 'walk' } : { x: p.a0, z: p.c - h, w: p.a1 - p.a0, h: 2 * h, type: 'walk' }); }
  out.push({ x: FOUNTAIN_PLAZA.minX, z: FOUNTAIN_PLAZA.minZ, w: FOUNTAIN_PLAZA.maxX - FOUNTAIN_PLAZA.minX, h: FOUNTAIN_PLAZA.maxZ - FOUNTAIN_PLAZA.minZ, type: 'walk' });
  return out;
}
