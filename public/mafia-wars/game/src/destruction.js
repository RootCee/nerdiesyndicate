// Destructible structures on three-avbd (Augmented Vertex Block Descent, GPU rigid bodies).
// The solver runs headless on a WebGPU device; the WebGL renderer draws every block from the solver's
// per-step readback through one InstancedMesh per structure. Without WebGPU the structures still exist
// (static instances) and a blast knocks blocks out with a canned tumble ("lite" mode).
//
// Structures: garden walls (small blocks) and the houses (big siding/brick panels + roof slabs). Every
// block is a box body; neighbours are welded with joints that tear on PULL (the paper's angular
// breakForce never lets go under a blast: measured in qa/avbd-smoke.html, the wall just topples whole).
import * as THREE from 'three';
import { pbr } from './assets.js';
import { colliders } from './world.js';

export const BLOCK = { x: 0.4, y: 0.2, z: 0.2 };   // garden-wall block (a chunk of mortared bricks)
export const PANEL = { x: 0.8, y: 0.4, z: 0.2 };   // house wall panel
const DENSITY = 8;                                 // solver-friendly masses (0.13 kg block, 0.5 kg panel), not real bricks
const ROOF_DENSITY = 1;
// Weld strength in newtons of pull, per kg of the lighter body. Sweep (qa/rocket.mjs weld=): for 0.128 kg
// blocks 8/5 N fails at rest, 14/8 holds and a rocket tears ~200 welds; shipped 16/9, scaled by mass.
const _weld = (new URLSearchParams(location.search).get('weld') || '').split(',').map(Number);
const WELD_DOWN = (_weld[0] || 16) / 0.128, WELD_SIDE = (_weld[1] || 9) / 0.128;

const FLAGS = new URLSearchParams(location.search); // debug: noroof, nocorner, nogable, stack
const D = { log: new URLSearchParams(location.search).has('breaklog') ? [] : null, world: null, walls: [], mode: 'none', blocks: 0, joints: 0, broken: 0, weld: [WELD_DOWN * 0.128, WELD_SIDE * 0.128], bySpec: new Map(), onBlast: null };
export const destruction = D;

// ---------- materials ----------
const mats = {};
function wallMaterial(kind, tint) {
  const key = kind + ':' + tint;
  if (mats[key]) return mats[key];
  let m;
  if (kind === 'brick') m = pbr('red_brick', { color: tint === 0xffffff ? 0xb08878 : tint, normalScale: 0.9 });
  else if (kind === 'siding2') m = pbr('weathered_plank_siding', { color: tint === 0xffffff ? 0xd8d0c4 : tint, normalScale: 0.9 });
  else if (kind === 'roof') m = pbr('grey_roof_tiles', { color: 0x6a6c70, normalScale: 0.9 });
  else m = pbr('white_planks_clean', { color: tint, normalScale: 0.8 });
  if (kind === 'brick') m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      vec2 e = abs(fract(vMapUv) - 0.5) * 2.0; float edge = smoothstep(0.9, 1.0, max(e.x, e.y));
      diffuseColor.rgb *= 1.0 - edge * 0.22;`);
  };
  mats[key] = m; return m;
}
function paneMaterial() { return mats.pane || (mats.pane = new THREE.MeshStandardMaterial({ color: 0x0b1016, roughness: 0.1, metalness: 0.85, envMapIntensity: 0.9 })); }
// box with world-scaled uvs so the photo tiles continuously across neighbouring blocks (siding: uv swapped so the clapboard runs horizontally)
function blockGeometry(sz, tile, swap) {
  const g = new THREE.BoxGeometry(sz.x, sz.y, sz.z);
  const uv = g.attributes.uv, ext = [[sz.z, sz.y], [sz.z, sz.y], [sz.x, sz.z], [sz.x, sz.z], [sz.x, sz.y], [sz.x, sz.y]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; const u = uv.getX(i) * ext[f][0] / tile, w = uv.getY(i) * ext[f][1] / tile; if (swap) uv.setXY(i, w, u); else uv.setXY(i, u, w); }
  return g;
}

// ---------- structures ----------
// A structure: items [{p: world position, q: world quaternion, size, face}], one InstancedMesh, optional roof slabs,
// colliders (one per face), bodies once the solver is up.
function makeStructure(scene, items, geo, mat, extra) {
  const unit = extra.kind === 'house' ? PANEL.x : BLOCK.x;
  const solid = items.filter((it) => !it.pane), panes = items.filter((it) => it.pane);
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, solid.length)); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.count = solid.length;
  const m = new THREE.Matrix4(), s = new THREE.Vector3(1, 1, 1);
  solid.forEach((it, i) => { it.mesh = mesh; it.mi = i; s.set(it.size.x / unit, 1, 1); mesh.setMatrixAt(i, m.compose(it.p, it.q, s)); });
  mesh.instanceMatrix.needsUpdate = true; scene.add(mesh);
  let paneMesh = null;
  if (panes.length) {
    paneMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(PANEL.x, PANEL.y, 0.1), paneMaterial(), panes.length); paneMesh.castShadow = false; paneMesh.receiveShadow = true; paneMesh.frustumCulled = false;
    panes.forEach((it, i) => { it.mesh = paneMesh; it.mi = i; s.set(it.size.x / unit, 1, 1); paneMesh.setMatrixAt(i, m.compose(it.p, it.q, s)); });
    paneMesh.instanceMatrix.needsUpdate = true; scene.add(paneMesh);
  }
  const spec = { items, mesh, paneMesh, unit, bodies: null, standing: true, touched: false, colliders: [], slabs: [], statics: null, ...extra };
  D.walls.push(spec); D.blocks += items.length;
  return spec;
}

// --- garden wall: `len` m long, `courses` high, centred at (x,z), along x (dir 0) or z (dir 1)
export function wallSpec(x, z, len, courses, dir) { const cols = Math.max(1, Math.round(len / BLOCK.x)); return { x, z, len: cols * BLOCK.x, cols, courses, dir }; }
export function addWall(scene, w) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), w.dir === 0 ? 0 : -Math.PI / 2); // -90°: a block's local +x runs along +z
  const items = [];
  for (let r = 0; r < w.courses; r++) for (let c = 0; c < w.cols; c++) {
    const u = c * BLOCK.x - w.len / 2 + BLOCK.x / 2 + ((r % 2) ? BLOCK.x / 2 : 0), y = BLOCK.y / 2 + r * BLOCK.y;
    items.push({ p: w.dir === 0 ? new THREE.Vector3(w.x + u, y, w.z) : new THREE.Vector3(w.x, y, w.z + u), q, size: BLOCK, face: 0 });
  }
  const spec = makeStructure(scene, items, blockGeometry(BLOCK, 1.6, false), wallMaterial('brick', 0xffffff), { kind: 'wall', mass: BLOCK.x * BLOCK.y * BLOCK.z * DENSITY });
  const hx = w.dir === 0 ? w.len / 2 : BLOCK.z / 2, hz = w.dir === 0 ? BLOCK.z / 2 : w.len / 2;
  const c = { minX: w.x - hx, maxX: w.x + hx, minZ: w.z - hz, maxZ: w.z + hz, minY: 0, maxY: w.courses * BLOCK.y, face: 0 };
  colliders.push(c); spec.colliders = [c];
  return spec;
}

// --- house: walls + gables as panels, roof as two slabs, from the descriptor world.js records
const _v = new THREE.Vector3();
export function addHouse(scene, h) {
  const { M, d, w, base, top, Rh, ridgeX } = h;
  const Mrot = new THREE.Quaternion().setFromRotationMatrix(M);
  const rotZ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2); // panels on x-faces run along z
  const local = [];  // {c: house-local centre, rot: bool (x-face), face, size}
  const windows = h.windows || [];
  const openings = (face) => windows.filter((o) => o.face === face).map((o) => ({ u: o.u, y: o.y, w: o.w + 0.12, h: o.h + 0.12 })).concat(face === 0 ? [{ u: h.door.u, y: h.door.y, w: h.door.w + 0.1, h: h.door.h + 0.1 }] : []);
  const inOpening = (ops, u, y) => ops.some((o) => Math.abs(u - o.u) < o.w / 2 + PANEL.x * 0.25 && Math.abs(y - o.y) < o.h / 2 + PANEL.y * 0.25);
  // one face: along coordinate u from -L/2..L/2 on axis `ax` ('x' or 'z') at `sign`; rows from y0 up; optional gable above y1
  const face = (fi, ax, sign, L, y0, y1, gableH) => {
    const ops = openings(fi); const rows = Math.round((y1 - y0) / PANEL.y);
    const gRows = gableH ? Math.floor(gableH / PANEL.y) : 0;
    for (let r = 0; r < rows + gRows; r++) {
      const y = y0 + PANEL.y / 2 + r * PANEL.y;
      let half = L / 2; if (r >= rows) half = (L / 2) * (1 - (y + PANEL.y / 2 + 0.32 - y1) / gableH); if (half < PANEL.x * 0.6) break;
      const n = Math.max(1, Math.round((half * 2) / PANEL.x)), width = (half * 2) / n;
      const cells = [];   // [centre u, panel width]: running bond on odd rows (half panels at the ends) so no weld carries a whole column
      if (r % 2 === 0 || n < 2 || FLAGS.has('stack')) for (let c = 0; c < n; c++) cells.push([-half + width / 2 + c * width, width]);
      else { cells.push([-half + width / 4, width / 2]); for (let c = 1; c < n; c++) cells.push([-half + c * width, width]); cells.push([half - width / 4, width / 2]); }
      for (const [u, pw] of cells) {
        const pane = r < rows && inOpening(ops, u, y);           // a window/door: a thin pane at the inner face, still welded in
        const tz = pane ? 0.1 : PANEL.z, off = pane ? PANEL.z - tz / 2 : PANEL.z / 2;
        const cen = ax === 'x' ? new THREE.Vector3(sign * (d / 2 - off), y, u) : new THREE.Vector3(u, y, sign * (w / 2 - off));
        local.push({ c: cen, rot: ax === 'x', face: fi, pane, size: { x: pw, y: PANEL.y, z: tz } });
      }
    }
  };
  // x-faces span the full width w, z-faces are inset by a panel thickness so the corners meet
  const G = FLAGS.has('nogable') ? 0 : 1;
  face(0, 'x', 1, w, base, top, ridgeX ? Rh * G : 0); face(1, 'x', -1, w, base, top, ridgeX ? Rh * G : 0);
  face(2, 'z', 1, d - 2 * PANEL.z, base, top, ridgeX ? 0 : Rh * G); face(3, 'z', -1, d - 2 * PANEL.z, base, top, ridgeX ? 0 : Rh * G);
  // roof slabs (house-local pose), as in the kit
  const slabs = [];
  if (FLAGS.has('noroof')) { /* debug: no roof bodies */ } else
  // each slab is shortened by 0.16 m along the slope and slid 0.08 m down it, so the two never overlap at the ridge
  if (ridgeX) { const L = Math.hypot(w / 2 + 0.35, Rh) - 0.16, ang = Math.atan2(Rh, w / 2 + 0.35); for (const s of [-1, 1]) { const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), s * ang); const c = new THREE.Vector3(0, top + Rh / 2 - 0.14, s * (w / 4 + 0.18)).add(new THREE.Vector3(0, 0, s * 0.08).applyQuaternion(q)); slabs.push({ size: new THREE.Vector3(d + 0.7, 0.14, L), c, q }); } }
  else { const L = Math.hypot(d / 2 + 0.35, Rh) - 0.16, ang = Math.atan2(Rh, d / 2 + 0.35); for (const s of [-1, 1]) { const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -s * ang); const c = new THREE.Vector3(s * (d / 4 + 0.18), top + Rh / 2 - 0.14, 0).add(new THREE.Vector3(s * 0.08, 0, 0).applyQuaternion(q)); slabs.push({ size: new THREE.Vector3(L, 0.14, w + 0.7), c, q }); } }
  const items = local.map((b) => ({ p: b.c.clone().applyMatrix4(M), q: b.rot ? Mrot.clone().multiply(rotZ) : Mrot.clone(), size: b.size, face: b.face, pane: b.pane }));
  const kind = h.brick ? 'brick' : (h.worn ? 'siding2' : 'siding');
  const spec = makeStructure(scene, items, blockGeometry(PANEL, h.brick ? 1.6 : 1.25, !h.brick), wallMaterial(kind, h.tint), { kind: 'house', mass: PANEL.x * PANEL.y * PANEL.z * DENSITY, house: h, Mrot });
  for (const s of slabs) {
    const mesh = new THREE.Mesh(blockGeometry(s.size, 1.4, false), wallMaterial('roof', 0)); mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.position.copy(s.c).applyMatrix4(M); mesh.quaternion.copy(Mrot).multiply(s.q); scene.add(mesh);
    spec.slabs.push({ mesh, size: s.size, p: mesh.position.clone(), q: mesh.quaternion.clone(), body: null });
  }
  spec.colliders = h.faces.slice(); spec.statics = h.statics; spec.roofC = h.roofC;
  return spec;
}

// ---------- the physics bridge ----------
function anchorLocal(it, pWorld) { return _v.copy(pWorld).sub(it.p).applyQuaternion(it.q.clone().invert()).toArray(); }
function worldAabb(it) {  // rotations are multiples of 90° about y, so the rotated extents are exact
  const ex = new THREE.Vector3(it.size.x / 2, it.size.y / 2, it.size.z / 2).applyQuaternion(it.q); ex.set(Math.abs(ex.x), Math.abs(ex.y), Math.abs(ex.z));
  return { min: it.p.clone().sub(ex), max: it.p.clone().add(ex) };
}
export async function initDestruction(scene, { enabled = true } = {}) {
  if (!enabled || !navigator.gpu) { D.mode = 'lite'; return D.mode; }
  try {
    const adapter = await navigator.gpu.requestAdapter(); if (!adapter) throw new Error('no adapter');
    const device = await adapter.requestDevice();
    const { World } = await import('../vendor/three-avbd/lib/world.js');
    const world = await World.create({ device, maxBodies: Math.max(1024, D.blocks + 512), iterations: 8 });
    world.addBox({ size: [220, 2, 220], position: [0, -1, 0], fixed: true, friction: 0.7 });
    const all = [];
    for (const spec of D.walls) {
      if (spec.house) { // the foundation the panels stand on (the kit's base box), fixed
        const h = spec.house; const c = new THREE.Vector3(0, h.base / 2, 0).applyMatrix4(h.M);
        world.addBox({ size: [h.d, h.base, h.w], position: c.toArray(), rotation: spec.Mrot.toArray(), fixed: true, friction: 0.7 });
      }
      spec.bodies = spec.items.map((it) => { const b = world.addBox({ size: [it.size.x, it.size.y, it.size.z], position: it.p.toArray(), rotation: it.q.toArray(), density: DENSITY, friction: 0.6 }); D.bySpec.set(b, spec); return b; });
      // (every weld passes rest:'current': a fixed joint otherwise twists bodies placed turned apart toward each other — the tilted roof and the corner panels)
      // roof slabs start FIXED: a rigid frame the walls are welded to (a free 5 kg slab on 0.5 kg panels tears them apart at rest);
      // the first hit sets them free (shatter), so a blasted house drops its roof
      for (const s of spec.slabs) { s.body = world.addBox({ size: s.size.toArray(), position: s.p.toArray(), rotation: s.q.toArray(), density: ROOF_DENSITY, friction: 0.6, fixed: true }); D.bySpec.set(s.body, spec); }
      // welds: every pair of touching items (same row: side welds; row below: down welds, stronger), anchored at the contact area's centre
      const boxes = spec.items.map(worldAabb), tol = 0.03; const topY = Math.max(...spec.items.map((it) => it.p.y + it.size.y / 2));
      const rows = new Map(); spec.items.forEach((it, i) => { const k = Math.round(it.p.y / 0.1); (rows.get(k) || rows.set(k, []).get(k)).push(i); });
      for (const [k, lst] of rows) for (const i of lst) for (const k2 of [k, k + 1, k + 2, k + 3, k + 4]) {
        const lst2 = rows.get(k2); if (!lst2) continue;
        for (const j of lst2) {
          if (k2 === k && j <= i) continue;
          const a = boxes[i], b = boxes[j];
          const ox = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x), oy = Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y), oz = Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z);
          if (ox < -tol || oy < -tol || oz < -tol) continue;
          if ((ox > 0.05) + (oy > 0.05) + (oz > 0.05) < 2) continue;   // a shared face (panes are 0.1 thick), not a corner touch
          if (FLAGS.has('nocorner') && spec.items[i].face !== spec.items[j].face) continue;
          const c = new THREE.Vector3((Math.max(a.min.x, b.min.x) + Math.min(a.max.x, b.max.x)) / 2, (Math.max(a.min.y, b.min.y) + Math.min(a.max.y, b.max.y)) / 2, (Math.max(a.min.z, b.min.z) + Math.min(a.max.z, b.max.z)) / 2);
          const vertical = oy < 0.08, mass = spec.mass * Math.min(spec.items[i].size.x, spec.items[j].size.x) / spec.unit;   // (panes count as full panels: they carry load)
          const corner = spec.items[i].face !== spec.items[j].face ? 1.5 : 1;
          const rowsAbove = Math.max(0, Math.round((topY - c.y) / spec.items[i].size.y)); const carry = 1 + 0.08 * rowsAbove;   // the lower the weld, the more it holds up
          D.joints++; world.addJoint(spec.bodies[i], spec.bodies[j], { anchorA: anchorLocal(spec.items[i], c), anchorB: anchorLocal(spec.items[j], c), breakForce: (vertical ? WELD_DOWN * carry : WELD_SIDE * corner) * mass, breakOnPull: true, rest: 'current' });
        }
      }
      // roof slabs: welded to every panel whose top sits against the slab's underside, and to each other along the ridge
      if (spec.slabs.length === 2) {
        const [a, b] = spec.slabs; const mid = a.p.clone().add(b.p).multiplyScalar(0.5); const along = (a.size.x > a.size.z ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1)).applyQuaternion(spec.Mrot); const len = Math.max(a.size.x, a.size.z);
        for (const t of [-0.4, 0, 0.4]) { const c = mid.clone().addScaledVector(along, t * len); D.joints++; world.addJoint(a.body, b.body, { anchorA: c.clone().sub(a.p).applyQuaternion(a.q.clone().invert()).toArray(), anchorB: c.clone().sub(b.p).applyQuaternion(b.q.clone().invert()).toArray(), breakForce: WELD_DOWN * spec.mass * 6, breakOnPull: true, rest: 'current' }); }
      }
      all.push(...spec.bodies, ...spec.slabs.map((s) => s.body));
    }
    world.onBreak((j) => {
      D.broken++; const spec = D.bySpec.get(j.a) || D.bySpec.get(j.b); if (!spec) return;
      if (world.stepCount < 240) return;                       // settling: a few interior welds give, the structure stands
      spec.breaks = (spec.breaks || 0) + 1; if (spec.breaks < 4 && !spec.touched) return;
      if (D.log) { const ia = spec.bodies.indexOf(j.a), ib = spec.bodies.indexOf(j.b); const A = spec.items[ia], B = spec.items[ib]; D.log.push({ k: spec.kind, slab: ia < 0 || ib < 0, pane: !!(A?.pane || B?.pane), corner: !!(A && B && A.face !== B.face), y: +((A || B)?.p.y ?? -1).toFixed(1), gable: !!(A && spec.house && A.p.y > spec.house.top) }); }
      shatter(spec);
    });
    world.readbackEvery = 1; world.track(all);
    for (let i = 0; i < 60; i++) world.step();   // settle off-screen
    D.world = world; D.mode = 'gpu';
  } catch (e) { console.warn('three-avbd unavailable, structures in lite mode:', e.message); D.mode = 'lite'; }
  return D.mode;
}

// the structure has been hit: windows/door vanish (blown out) and its bodies get drawn from the readback
function shatter(spec) {
  spec.touched = true;
  if (!spec.standing) return; spec.standing = false;
  if (D.mode === 'gpu') for (const s of spec.slabs) s.body.setFixed(false);
  if (spec.statics) for (const m of spec.statics) m.visible = false;
}
function openFace(spec, fi) {
  const c = spec.colliders[fi]; if (!c) return; const i = colliders.indexOf(c); if (i >= 0) colliders.splice(i, 1); spec.colliders[fi] = null;
}

// Per frame: step the solver and copy the readback poses into the instance matrices of touched structures.
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1);
export function updateDestruction(dt) {
  if (D.mode === 'gpu' && D.world) {
    D.world.update(Math.min(dt, 0.05));
    for (const spec of D.walls) {
      if (!spec.touched) continue;
      spec.bodies.forEach((b, i) => { const p = b.position, r = b.rotation; const it = spec.items[i]; _p.set(p[0], p[1], p[2]); _q.set(r[0], r[1], r[2], r[3]); _s.set(it.size.x / spec.unit, 1, 1); it.mesh.setMatrixAt(it.mi, _m.compose(_p, _q, _s)); });
      spec.mesh.instanceMatrix.needsUpdate = true; if (spec.paneMesh) spec.paneMesh.instanceMatrix.needsUpdate = true;
      for (const s of spec.slabs) { const p = s.body.position, r = s.body.rotation; s.mesh.position.set(p[0], p[1], p[2]); s.mesh.quaternion.set(r[0], r[1], r[2], r[3]); }
    }
  } else if (D.mode === 'lite') {
    for (const spec of D.walls) {
      if (!spec.lite) continue; let any = false;
      for (const k of spec.lite) {
        if (k.life <= 0) continue; any = true; k.life -= dt; k.v.y -= 9.8 * dt; k.p.addScaledVector(k.v, dt);
        if (k.p.y < k.size.y / 2) { k.p.y = k.size.y / 2; k.v.set(k.v.x * 0.4, -k.v.y * 0.25, k.v.z * 0.4); k.w.multiplyScalar(0.5); }
        k.q.multiply(_q.setFromAxisAngle(k.w.clone().normalize(), k.w.length() * dt)); _s.set(k.size.x / spec.unit, 1, 1); const it = spec.items[k.i]; it.mesh.setMatrixAt(it.mi, _m.compose(k.p, k.q, _s));
      }
      if (any) { spec.mesh.instanceMatrix.needsUpdate = true; if (spec.paneMesh) spec.paneMesh.instanceMatrix.needsUpdate = true; }
    }
  }
}

// A blast at `p`: push every block within `radius`, scaled by mass so blocks leave at up to `speed` m/s.
// A face that loses blocks loses its collider: the hole can be walked and shot through.
export function blast(p, radius = 3.6, speed = 7.5) {
  D.last = { p: p.toArray().map((v) => +v.toFixed(2)), hits: [] };
  for (const spec of D.walls) {
    const near = spec.items.some((it) => Math.abs(it.p.x - p.x) < radius + 1 && Math.abs(it.p.z - p.z) < radius + 1 && Math.abs(it.p.y - p.y) < radius + 3);
    if (!near) continue;
    const faceHits = [0, 0, 0, 0]; let hit = 0;
    if (D.mode === 'gpu' && spec.bodies) {
      spec.bodies.forEach((b, i) => {
        const q = b.position; const dx = q[0] - p.x, dy = q[1] - p.y, dz = q[2] - p.z; const d = Math.hypot(dx, dy, dz);
        if (d > radius) return; const k = (1 - d / radius); const v = speed * (0.2 + 0.8 * k * k); const inv = 1 / Math.max(d, 0.2); const mass = spec.mass * (spec.items[i].size.x / spec.unit);
        b.applyImpulse([dx * inv * v * mass, (dy * inv * v + 1.6 * k) * mass, dz * inv * v * mass]); hit++; faceHits[spec.items[i].face]++;
      });
      for (const s of spec.slabs) { const q = s.body.position; const d = Math.hypot(q[0] - p.x, q[1] - p.y, q[2] - p.z); if (d < radius + 2) { const m = s.size.x * s.size.y * s.size.z * ROOF_DENSITY; s.body.applyImpulse([(q[0] - p.x) / d * 2 * m, 3 * m, (q[2] - p.z) / d * 2 * m]); hit++; } }
    } else {
      spec.lite = spec.lite || [];
      spec.items.forEach((it, i) => {
        const dx = it.p.x - p.x, dy = it.p.y - p.y, dz = it.p.z - p.z; const d = Math.hypot(dx, dy, dz);
        if (d > radius || spec.lite.some((k) => k.i === i)) return;
        const k = 1 - d / radius, inv = 1 / Math.max(d, 0.2);
        spec.lite.push({ i, size: it.size, p: it.p.clone(), v: new THREE.Vector3(dx * inv * speed * k, dy * inv * speed * k + 3 * k, dz * inv * speed * k), w: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(8), q: it.q.clone(), life: 4 }); hit++; faceHits[it.face]++;
      });
    }
    if (hit) { D.last.hits.push([spec.kind, hit, faceHits]); shatter(spec); faceHits.forEach((n, fi) => { if (n >= 2) openFace(spec, fi); }); D.onBlast?.(p, hit); }
  }
}
