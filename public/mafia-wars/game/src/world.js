// The block: a Chicago residential street at dusk. Houses are kit-built from real PBR photo textures
// (Poly Haven), props/fences/poles/trees are Poly Haven scans decimated in Blender.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { pbr, weather, prep, loadGLB } from './assets.js';

export const MAP = { minX: -43, maxX: 43, minZ: -46, maxZ: 46 };
// front yards that get a brick wall (destructible) instead of chain-link: 'side:lotIndex'
export const WALL_LOTS = new Set(['-1:1', '-1:4', '-1:7', '1:2', '1:5', '1:8']);
export const GEO = { ROAD_HALF: 4.5, SIDEWALK: 2, LOT: 8, HOUSE_W: 6.2 };
const ROAD_HALF = 4.5, SIDEWALK = 2, LOT = 8, HOUSE_FRONT = 14, HOUSE_DEPTH = 10, HOUSE_W = 6.2, ALLEY_X = 35.5;

// ---------- random ----------
let seed = 1337;
export function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
const rr = (a, b) => a + rnd() * (b - a);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

// ---------- geometry helpers ----------
const _c = new THREE.Color();
function colorAttr(g, tint) {
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  _c.set(tint ?? 0xffffff);
  for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
// Box with world-scaled UVs (so one texture tile = `tile` metres on every face).
function boxGeo(sx, sy, sz, tile = 2, tint = 0xffffff, swap = false) {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  const uv = g.attributes.uv, ext = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]];
  const ou = rnd(), ov = rnd();
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; const u = uv.getX(i) * ext[f][0] / tile + ou, w = uv.getY(i) * ext[f][1] / tile + ov; if (swap) uv.setXY(i, w, u); else uv.setXY(i, u, w); }
  return colorAttr(g, tint);
}
// siding walls: the Poly Haven beadboard runs vertically, so swap UVs to get horizontal clapboard
const sidingBox = (sx, sy, sz, tint) => boxGeo(sx, sy, sz, 1.25, tint, true);
function planeGeo(sx, sz, tile = 2, tint = 0xffffff) {
  const g = new THREE.PlaneGeometry(sx, sz, 1, 1); g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv; const ou = rnd(), ov = rnd();
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx / tile + ou, uv.getY(i) * sz / tile + ov);
  return colorAttr(g, tint);
}
// Triangle gable wall in the XY plane (base along X, apex up), normal +Z.
function gableGeo(base, height, tile, tint) {
  const s = new THREE.Shape([new THREE.Vector2(-base / 2, 0), new THREE.Vector2(base / 2, 0), new THREE.Vector2(0, height)]);
  const g = new THREE.ShapeGeometry(s);
  const uv = g.attributes.uv, p = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / tile, p.getY(i) / tile);
  return colorAttr(g, tint);
}

class Bucket {
  constructor() { this.map = new Map(); }
  add(key, g, m) { if (m) g.applyMatrix4(m); (this.map.get(key) || this.map.set(key, []).get(key)).push(g); }
  build(materials, scene, shadows) {
    const out = {};
    for (const [key, list] of this.map) {
      const g = mergeGeometries(list, false); if (!g) continue;
      const mesh = new THREE.Mesh(g, materials[key]);
      mesh.castShadow = shadows && key !== 'glass' && key !== 'glassLit'; mesh.receiveShadow = true; mesh.name = 'kit_' + key;
      scene.add(mesh); out[key] = mesh;
    }
    return out;
  }
}

// ---------- world state ----------
export const colliders = [];   // {minX,maxX,minY,maxY,minZ,maxZ,step,fence}
export const mapRects = [];    // minimap: {x,z,w,h,type}
export const lamps = [];       // {x,y,z, warm}
export const windowsLit = [];
function solid(minX, minZ, maxX, maxZ, minY, maxY, extra = {}) { const c = { minX, maxX, minY, maxY, minZ, maxZ, ...extra }; colliders.push(c); return c; }
export const houseDescs = [];   // destructible houses (see destruction.js addHouse)
let curWindows = null;

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
function mat(x, y, z, rotY) { _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY); _p.set(x, y, z); return _m.compose(_p, _q, _s).clone(); }

// Axis-aligned collider from a local box after a rotation that is a multiple of 90°.
function solidLocal(M, cx, cy, cz, sx, sy, sz, extra) {
  const a = new THREE.Vector3(cx - sx / 2, cy - sy / 2, cz - sz / 2).applyMatrix4(M), b = new THREE.Vector3(cx + sx / 2, cy + sy / 2, cz + sz / 2).applyMatrix4(M);
  return solid(Math.min(a.x, b.x), Math.min(a.z, b.z), Math.max(a.x, b.x), Math.max(a.z, b.z), Math.min(a.y, b.y), Math.max(a.y, b.y), extra);
}

// ---------- the house kit ----------
const TINTS = [0xffffff, 0xd8e8f4, 0xd4d4d4, 0xeadfc6, 0xb6c6d8, 0xe9e3b4, 0xc9d6c0, 0xf2f2f2];
function addWindow(b, M, wallX, wallZ, nx, nz, y, lit, brick) {
  // tangent along the wall: if the normal is x the window runs along z, and vice-versa
  const tX = nz !== 0, W = 1.05, H = 1.55, F = 0.1, D = 0.1;
  // along-wall helper: dims (along, up, out) -> box sizes in x/z
  const bx = (along, upv, out) => boxGeo(tX ? along : out, upv, tX ? out : along, 1, 0xffffff);
  const at = (g, a, yy, o) => g.translate(tX ? wallX + nx * o + 0 : wallX + nx * o, yy, tX ? wallZ + nz * o : wallZ + nz * o).translate(tX ? a : 0, 0, tX ? 0 : a);
  // frame: 4 strips standing proud of the wall
  b.add('trim', at(bx(W + 2 * F, F, D), 0, y + H / 2 + F / 2, D / 2 - 0.01), M);
  b.add('trim', at(bx(W + 2 * F, F, D), 0, y - H / 2 - F / 2, D / 2 - 0.01), M);
  b.add('trim', at(bx(F, H, D), -(W + F) / 2, y, D / 2 - 0.01), M);
  b.add('trim', at(bx(F, H, D), (W + F) / 2, y, D / 2 - 0.01), M);
  // sill
  b.add('trim', at(bx(W + 2 * F + 0.1, 0.07, 0.2), 0, y - H / 2 - F - 0.03, 0.1 - 0.01), M);
  if (brick) b.add('trim', at(bx(W + 2 * F + 0.1, 0.12, 0.06), 0, y + H / 2 + F + 0.06, 0.03), M);
  // glass, recessed into the wall a touch, with a thin mullion cross in front
  b.add(lit ? 'glassLit' : 'glass', at(bx(W, H, 0.03), 0, y, -0.02), M);
  b.add('trim', at(bx(W, 0.05, 0.04), 0, y, 0.01), M);
  b.add('trim', at(bx(0.05, H, 0.04), 0, y, 0.01), M);
  if (lit) { const p = new THREE.Vector3(wallX + nx * 0.2, y, wallZ + nz * 0.2).applyMatrix4(M); windowsLit.push(p); }
  if (curWindows) curWindows.push({ face: nx > 0 ? 0 : nx < 0 ? 1 : nz > 0 ? 2 : 3, u: nx !== 0 ? wallZ : wallX, y, w: W + 2 * F, h: H + 2 * F });
}

// Local frame: house centred at origin, front wall faces +X. M places it in the world.
function buildHouse(b, M, spec, hb = null) {
  const { w = HOUSE_W, d = HOUSE_DEPTH, floors = 2, brick = false, tint = 0xffffff, ridgeX = true, porch = true, chimney = true, collide = true, litChance = 0.4 } = spec;
  const H = floors * 3, base = 0.8, top = base + H, wallKey = brick ? 'brick' : (spec.worn ? 'siding2' : 'siding'), wallTint = brick ? 0xffffff : tint;
  // blocks: the walls, gables and roof are physics bodies (destruction.js); the kit keeps the base, porch, chimney,
  // and puts windows/door/corner trim into the per-house bucket `hb` so they can vanish when the house is hit
  const blocks = !!spec.blocks, wb = blocks && hb ? hb : b;
  curWindows = blocks ? [] : null;
  b.add('brick', boxGeo(d, base, w, 1.5, 0xffffff).translate(0, base / 2, 0), M);
  if (!blocks) b.add(wallKey, brick ? boxGeo(d, H, w, 1.6, wallTint).translate(0, base + H / 2, 0) : sidingBox(d, H, w, wallTint).translate(0, base + H / 2, 0), M);
  if (!brick) for (const sx of [-1, 1]) for (const sz of [-1, 1]) wb.add('trim', boxGeo(0.16, H, 0.16, 1, 0xffffff).translate(sx * d / 2, base + H / 2, sz * w / 2), M);
  // roof
  const pitch = 0.62;
  const RhX = (w / 2 + 0.3) * pitch, RhZ = (d / 2 + 0.3) * pitch, Rh0 = ridgeX ? RhX : RhZ;
  if (blocks) { /* roof + gables are bodies */ } else if (ridgeX) {
    const Rh = (w / 2 + 0.3) * pitch, L = Math.hypot(w / 2 + 0.35, Rh), ang = Math.atan2(Rh, w / 2 + 0.35);
    for (const s of [-1, 1]) {
      const g = boxGeo(d + 0.7, 0.14, L, 1.4, 0xffffff); g.rotateX(s * ang); g.translate(0, top + Rh / 2 + 0.02, s * (w / 4 + 0.18)); b.add('roof', g, M);
      const fas = boxGeo(d + 0.7, 0.22, 0.08, 1, 0xffffff).translate(0, top + 0.05, s * (w / 2 + 0.35)); b.add('trim', fas, M);
    }
    for (const s of [-1, 1]) { const g = gableGeo(w, Rh, brick ? 1.6 : 2.2, wallTint); g.rotateY(s * Math.PI / 2); g.translate(s * d / 2, top, 0); b.add(wallKey, g, M); }
    b.add(wallKey, boxGeo(d, 0.1, w, 2, wallTint).translate(0, top + 0.05, 0), M);
  } else {
    const Rh = (d / 2 + 0.3) * pitch, L = Math.hypot(d / 2 + 0.35, Rh), ang = Math.atan2(Rh, d / 2 + 0.35);
    for (const s of [-1, 1]) {
      const g = boxGeo(L, 0.14, w + 0.7, 1.4, 0xffffff); g.rotateZ(-s * ang); g.translate(s * (d / 4 + 0.18), top + Rh / 2 + 0.02, 0); b.add('roof', g, M);
      const fas = boxGeo(0.08, 0.22, w + 0.7, 1, 0xffffff).translate(s * (d / 2 + 0.35), top + 0.05, 0); b.add('trim', fas, M);
    }
    for (const s of [-1, 1]) { const g = gableGeo(d, Rh, brick ? 1.6 : 2.2, wallTint); if (s < 0) g.rotateY(Math.PI); g.translate(0, top, s * w / 2); b.add(wallKey, g, M); }
    b.add(wallKey, boxGeo(d, 0.1, w, 2, wallTint).translate(0, top + 0.05, 0), M);
  }
  // windows
  for (let f = 0; f < floors; f++) {
    const y = base + f * 3 + 1.7;
    for (const z of [-w / 4, w / 4]) { if (f === 0 && porch && z > 0) continue; addWindow(wb, M, d / 2, z, 1, 0, y, rnd() < litChance, brick); }
    for (const x of [-d / 3, 0, d / 3]) { addWindow(wb, M, x, w / 2, 0, 1, y, rnd() < litChance, brick); addWindow(wb, M, x, -w / 2, 0, -1, y, rnd() < litChance, brick); }
    for (const z of [-w / 4, w / 4]) addWindow(wb, M, -d / 2, z, -1, 0, y, rnd() < litChance, brick);
  }
  // door
  const dz = porch ? w / 4 : 0;
  wb.add('trim', boxGeo(0.16, 2.3, 1.2, 1, 0xffffff).translate(d / 2 + 0.03, base + 1.15, dz), M);
  wb.add('door', boxGeo(0.08, 2.15, 1.0, 1.2, 0xffffff).translate(d / 2 + 0.05, base + 1.08, dz), M);
  // porch
  if (porch) {
    const px = d / 2 + 1.2, pd = 2.4;
    b.add('wood', boxGeo(pd, 0.22, w, 1.2, 0xffffff).translate(px, base - 0.11, 0), M);
    b.add('brick', boxGeo(pd - 0.2, base - 0.3, w - 0.2, 1.5, 0xffffff).translate(px, (base - 0.3) / 2, 0), M);
    b.add('roof', boxGeo(pd + 0.3, 0.14, w + 0.4, 1.4, 0xffffff).translate(px + 0.1, base + 3.05, 0), M);
    b.add('trim', boxGeo(pd + 0.3, 0.2, 0.08, 1, 0xffffff).translate(px + 0.1, base + 2.95, w / 2 + 0.2), M);
    b.add('trim', boxGeo(pd + 0.3, 0.2, 0.08, 1, 0xffffff).translate(px + 0.1, base + 2.95, -w / 2 - 0.2), M);
    b.add('trim', boxGeo(0.08, 0.2, w + 0.4, 1, 0xffffff).translate(px + pd / 2 + 0.2, base + 2.95, 0), M);
    for (const z of [-w / 2 + 0.2, w / 2 - 0.2]) b.add('trim', boxGeo(0.14, 3, 0.14, 1, 0xffffff).translate(px + pd / 2 - 0.1, base + 1.5, z), M);
    b.add('trim', boxGeo(0.14, 3, 0.14, 1, 0xffffff).translate(px + pd / 2 - 0.1, base + 1.5, dz - 0.9), M);
    // railing (left of the steps)
    for (const z of [-w / 2 + 0.1]) {
      b.add('trim', boxGeo(pd - 0.2, 0.08, 0.08, 1, 0xffffff).translate(px, base + 0.95, z), M);
      for (let i = 0; i < 5; i++) b.add('trim', boxGeo(0.05, 0.9, 0.05, 1, 0xffffff).translate(px - pd / 2 + 0.3 + i * 0.45, base + 0.5, z), M);
    }
    b.add('trim', boxGeo(0.08, 0.08, w / 2 - 0.9, 1, 0xffffff).translate(px + pd / 2 - 0.1, base + 0.95, -w / 4 - 0.2), M);
    for (let i = 0; i < 4; i++) b.add('trim', boxGeo(0.05, 0.9, 0.05, 1, 0xffffff).translate(px + pd / 2 - 0.1, base + 0.5, -w / 2 + 0.4 + i * 0.5), M);
    // steps
    for (let k = 0; k < 3; k++) {
      const sx = px + pd / 2 + 0.175 + k * 0.35, topY = base - k * 0.27;
      b.add('concrete', boxGeo(0.35, topY, 1.5, 1, 0xffffff).translate(sx, topY / 2, dz), M);
      if (collide) solidLocal(M, sx, topY / 2, dz, 0.35, topY, 1.5, { step: true });
    }
    if (collide) solidLocal(M, px, base / 2, 0, pd, base, w, { step: true });
    if (collide) { solidLocal(M, px + pd / 2 - 0.1, base + 1.5, -w / 2 + 0.2, 0.2, 3, 0.2); solidLocal(M, px + pd / 2 - 0.1, base + 1.5, w / 2 - 0.2, 0.2, 3, 0.2); }
    if (collide) { solidLocal(M, px, base + 0.6, -w / 2 + 0.1, pd, 1.2, 0.1); solidLocal(M, px + pd / 2 - 0.1, base + 0.6, -w / 4 - 0.2, 0.1, 1.2, w / 2 - 0.9); }
  }
  if (chimney) { b.add('brick', boxGeo(0.7, H + 3.4, 0.7, 1.5, 0xffffff).translate(-d / 4, base + (H + 3.4) / 2 - 0.4, w / 2 + 0.1), M); if (collide) solidLocal(M, -d / 4, 2, w / 2 + 0.1, 0.7, 4, 0.7); }
  if (collide && !blocks) solidLocal(M, 0, (top + 2) / 2, 0, d, top + 2, w);
  if (blocks) {
    const hT = top + Rh0 + 0.2;
    const faces = [solidLocal(M, d / 2 - 0.1, hT / 2, 0, 0.2, hT, w), solidLocal(M, -d / 2 + 0.1, hT / 2, 0, 0.2, hT, w), solidLocal(M, 0, hT / 2, w / 2 - 0.1, d, hT, 0.2), solidLocal(M, 0, hT / 2, -w / 2 + 0.1, d, hT, 0.2)];
    solidLocal(M, 0, base / 2, 0, d, base, w, { step: true });                  // the floor: walk in once a wall is open
    const roofC = solidLocal(M, 0, top + Rh0 / 2, 0, d, Rh0, w);               // keeps rockets from flying through the roof
    houseDescs.push({ M: M.clone(), d, w, base, top, H, brick, tint: wallTint, worn: !!spec.worn, ridgeX, Rh: Rh0, pitch, windows: curWindows, door: { u: dz, y: base + 1.15, w: 1.2, h: 2.3 }, faces, roofC, statics: [] });
  }
  curWindows = null;
  const c = new THREE.Vector3(0, 0, 0).applyMatrix4(M); const e = new THREE.Vector3(d / 2 + (porch ? 2.4 : 0), 0, w / 2).applyMatrix4(M); const o = new THREE.Vector3(-d / 2, 0, -w / 2).applyMatrix4(M);
  mapRects.push({ x: Math.min(e.x, o.x), z: Math.min(e.z, o.z), w: Math.abs(e.x - o.x), h: Math.abs(e.z - o.z), type: 'house' });
}

function buildGarage(b, M) {
  const d = 5.6, w = 5.8, H = 2.6, brick = rnd() < 0.5;
  b.add(brick ? 'brick' : 'siding', boxGeo(d, H, w, brick ? 1.6 : 2.2, pick(TINTS)).translate(0, H / 2, 0), M);
  const Rh = 0.9, L = Math.hypot(w / 2 + 0.3, Rh), ang = Math.atan2(Rh, w / 2 + 0.3);
  for (const s of [-1, 1]) { const g = boxGeo(d + 0.5, 0.12, L, 1.4, 0xffffff); g.rotateX(s * ang); g.translate(0, H + Rh / 2, s * (w / 4 + 0.15)); b.add('roof', g, M); }
  for (const s of [-1, 1]) { const g = gableGeo(w, Rh, 2.2, 0xffffff); g.rotateY(s * Math.PI / 2); g.translate(s * d / 2, H, 0); b.add(brick ? 'brick' : 'siding', g, M); }
  b.add('roll', boxGeo(0.1, 2.2, 2.8, 0.9, 0xffffff).translate(d / 2 + 0.02, 1.12, 0.6), M);
  b.add('trim', boxGeo(0.14, 2.3, 3.0, 1, 0xffffff).translate(d / 2 - 0.02, 1.15, 0.6), M);
  solidLocal(M, 0, (H + 1) / 2, 0, d, H + 1, w);
  const e = new THREE.Vector3(d / 2, 0, w / 2).applyMatrix4(M), o = new THREE.Vector3(-d / 2, 0, -w / 2).applyMatrix4(M);
  mapRects.push({ x: Math.min(e.x, o.x), z: Math.min(e.z, o.z), w: Math.abs(e.x - o.x), h: Math.abs(e.z - o.z), type: 'garage' });
}

// ---------- props ----------
const propCache = new Map();
async function prop(slug) {
  if (!propCache.has(slug)) propCache.set(slug, loadGLB(`assets/models/${slug}.glb`).then((g) => prep(g.scene)));
  return propCache.get(slug);
}
function placeClone(scene, root, x, y, z, rotY, scale = 1, collide = null) {
  const c = root.clone(); c.position.set(x, y, z); c.rotation.y = rotY; c.scale.setScalar(scale); scene.add(c);
  if (collide) { const bb = new THREE.Box3().setFromObject(c); solid(bb.min.x, bb.min.z, bb.max.x, bb.max.z, bb.min.y, bb.max.y, collide === true ? {} : collide); }
  return c;
}
function firstMesh(root) { let m = null; root.traverse((o) => { if (!m && o.isMesh) m = o; }); return m ? m.parent && m.parent !== root && m.parent.children.every((c) => c.isMesh) ? m.parent : m : null; }
// a named glTF node is a Mesh (one primitive) or a Group of Meshes (several materials)
function findNode(root, name) { let m = null; root.traverse((o) => { if (!m && o.name === name && (o.isMesh || (o.isGroup && o.children.some((c) => c.isMesh)))) m = o; }); if (!m) console.warn('kit piece missing:', name); return m; }
function instanced(scene, node, items, { cast = true, receive = true } = {}) {
  if (!node || !items.length) return null;
  const meshes = node.isMesh ? [node] : node.children.filter((c) => c.isMesh);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), local = new THREE.Matrix4();
  let first = null;
  for (const mesh of meshes) {
    const im = new THREE.InstancedMesh(mesh.geometry, mesh.material, items.length);
    im.castShadow = cast; im.receiveShadow = receive; local.copy(mesh.matrix);
    items.forEach((it, i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), it.r || 0); p.set(it.x, it.y || 0, it.z); s.setScalar(it.s || 1); if (it.sy) s.y = it.sy; im.setMatrixAt(i, m.compose(p, q, s).multiply(local)); });
    im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; scene.add(im); first = first || im;
  }
  return first;
}

// catenary wire between two points
function wire(scene, a, b, mat, sag = 0.9) {
  const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector3().lerpVectors(a, b, t).add(new THREE.Vector3(0, -sag * 4 * t * (1 - t), 0))); }
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.018, 3, false);
  const m = new THREE.Mesh(g, mat); scene.add(m); return m;
}

// ---------- main build ----------
export async function buildWorld(scene, Q, progress = () => {}) {
  seed = 1337;
  const materials = {
    siding: weather(pbr('white_planks_clean', { vertexColors: true, normalScale: 0.8 }), 0.07),
    siding2: weather(pbr('weathered_plank_siding', { vertexColors: true, color: 0xd8d0c4, normalScale: 0.9 }), 0.05),
    trim: pbr('white_planks_clean', { color: 0xf4f4f0, roughness: 0.6, normalScale: 0.3 }),
    brick: weather(pbr('red_brick', { vertexColors: true }), 0.09),
    roof: pbr('grey_roof_tiles', { color: 0x6a6c70, normalScale: 0.9 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x05070b, roughness: 0.06, metalness: 0.9, envMapIntensity: 0.7 }),
    glassLit: new THREE.MeshStandardMaterial({ color: 0x2a1c0c, roughness: 0.3, metalness: 0.1, emissive: 0xffb064, emissiveIntensity: 3.2 }),
    door: pbr('distressed_painted_planks', { color: 0x7a7570 }),
    wood: pbr('weathered_plank_siding', { color: 0x9c8f7c }),
    concrete: pbr('concrete_pavement', { color: 0xbdbdb8 }),
    roll: pbr('corrugated_iron', { color: 0xa9a9a9, normalScale: 0.5 }),
  };
  materials.siding.map.repeat.set(1, 1);
  const b = new Bucket();

  // houses: west row faces +x, east row faces -x
  const lots = [], houseBuckets = [];
  for (let i = 0; i < 10; i++) {
    const zc = -40 + i * LOT + LOT / 2;
    for (const side of [-1, 1]) {
      const spec = { floors: rnd() < 0.2 ? 1.5 : 2, brick: rnd() < 0.35, worn: rnd() < 0.22, tint: pick(TINTS), ridgeX: rnd() < 0.7, porch: rnd() < 0.85, chimney: rnd() < 0.5 };
      if (spec.floors === 1.5) spec.floors = 1.4;
      const M = mat(side * (HOUSE_FRONT + HOUSE_DEPTH / 2), 0, zc, side < 0 ? 0 : Math.PI);
      spec.blocks = Q.houses !== false; const hb = new Bucket(); buildHouse(b, M, spec, hb); houseBuckets.push(hb);
      lots.push({ side, zc, spec });
      if (rnd() < 0.75) buildGarage(b, mat(side * (ALLEY_X + 2 + 2.8 + 0.3), 0, zc + rr(-0.6, 0.6), side < 0 ? Math.PI : 0));
    }
  }
  // backdrop rows beyond the cross streets (not reachable)
  for (let i = 0; i < 9; i++) for (const s of [-1, 1]) {
    const x = -36 + i * 9 + rr(-0.5, 0.5);
    buildHouse(b, mat(x, 0, s * 60, s < 0 ? Math.PI / 2 : -Math.PI / 2), { floors: 2, brick: rnd() < 0.4, tint: pick(TINTS), ridgeX: rnd() < 0.6, porch: true, chimney: rnd() < 0.5, collide: false, litChance: 0.3 });
  }
  const kit = b.build(materials, scene, true);
  houseBuckets.forEach((hb, i) => { if (houseDescs[i]) houseDescs[i].statics = Object.values(hb.build(materials, scene, true)); });
  progress(0.3);

  // ---------- ground ----------
  const gm = {
    grass: pbr('grass_ground', { color: 0x6f7a55 }), grass2: pbr('sparse_grass', { color: 0x8a8766 }), dirt: pbr('dirt', { color: 0x8f7d66 }),
    road: pbr('worn_asphalt', { color: 0x8c8c8c }), alley: pbr('asphalt_02', { color: 0x9a9a95 }), walk: pbr('concrete_pavement', { color: 0xb5b5b0 }),
  };
  const ground = new Bucket();
  ground.add('grass', planeGeo(120, 140, 3).translate(0, 0, 0));
  ground.add('road', planeGeo(ROAD_HALF * 2, 140, 4).translate(0, 0.02, 0));
  for (const s of [-1, 1]) {
    ground.add('road', planeGeo(100, 9, 4).translate(0, 0.02, s * 48.5));
    ground.add('alley', planeGeo(4, 90, 3).translate(s * ALLEY_X, 0.02, 0));
    ground.add('walk', planeGeo(SIDEWALK, 92, 2).translate(s * (ROAD_HALF + SIDEWALK / 2), 0.03, 0));
    mapRects.push({ x: s * ALLEY_X - 2, z: -45, w: 4, h: 90, type: 'alley' });
    mapRects.push({ x: s * (ROAD_HALF) - (s < 0 ? SIDEWALK : 0), z: -46, w: SIDEWALK, h: 92, type: 'walk' });
  }
  mapRects.push({ x: -ROAD_HALF, z: -70, w: ROAD_HALF * 2, h: 140, type: 'road' });
  for (const s of [-1, 1]) mapRects.push({ x: -50, z: s * 48.5 - 4.5, w: 100, h: 9, type: 'road' });
  for (const l of lots) {
    const fx = l.side * (HOUSE_FRONT - 0.2);
    ground.add('walk', planeGeo(1.2, 6.4, 2).translate(l.side * (ROAD_HALF + SIDEWALK + 3.2), 0.035, l.zc + (l.side < 0 ? HOUSE_W / 4 : -HOUSE_W / 4)));
    if (rnd() < 0.5) ground.add(rnd() < 0.5 ? 'dirt' : 'grass2', planeGeo(rr(4, 8), rr(4, 6), 3).translate(l.side * rr(26, 31), 0.012, l.zc + rr(-2, 2)));
    if (rnd() < 0.35) ground.add('grass2', planeGeo(rr(3, 5), rr(3, 6), 3).translate(l.side * rr(9, 12), 0.012, l.zc + rr(-2, 2)));
  }
  const gmesh = ground.build(gm, scene, false);
  for (const k in gmesh) gmesh[k].castShadow = false;
  progress(0.4);

  // ---------- fences (chain-link kit, instanced) ----------
  const fenceKit = await prop('modular_chainlink_fence');
  const panel = findNode(fenceKit, 'modular_chainlink_fence_double'), post = findNode(fenceKit, 'modular_chainlink_fence_post');
  const panels = [], posts = [];
  const fenceLine = (x0, z0, x1, z1, h = 1, gapAt = -1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 1.9)), ang = Math.atan2(z1 - z0, x1 - x0);
    for (let i = 0; i < n; i++) {
      if (i === gapAt) continue;
      const t0 = i / n, t1 = (i + 1) / n; const ax = x0 + (x1 - x0) * t1, az = z0 + (z1 - z0) * t1;
      panels.push({ x: ax, z: az, r: -ang, sy: h, s: 1 });
      if (i === 0) posts.push({ x: x0, z: z0, sy: h });
      posts.push({ x: ax, z: az, sy: h });
    }
    const th = 0.12; solid(Math.min(x0, x1) - th, Math.min(z0, z1) - th, Math.max(x0, x1) + th, Math.max(z0, z1) + th, 0, 2.4 * h, { fence: true, gap: gapAt >= 0 ? { x0, z0, x1, z1, i: gapAt, n } : null });
    mapRects.push({ x: Math.min(x0, x1) - 0.1, z: Math.min(z0, z1) - 0.1, w: Math.abs(x1 - x0) + 0.2, h: Math.abs(z1 - z0) + 0.2, type: 'fence' });
  };
  // the collider above spans the whole line even with a gap; add gap-aware version: split into two colliders instead
  colliders.length = colliders.length; // (no-op, keep simple)
  for (let i = 0; i <= 10; i++) {
    const z = -40 + i * LOT;
    for (const s of [-1, 1]) {
      // backyard side lines from house back to alley fence
      fenceLine(s * (HOUSE_FRONT + HOUSE_DEPTH + 0.3), z, s * (ALLEY_X - 2.2), z, 0.72);
    }
  }
  for (let i = 0; i < 10; i++) {
    const z0 = -40 + i * LOT, z1 = z0 + LOT;
    for (const s of [-1, 1]) {
      // alley-side fence with a gate gap in the middle
      const gx = s * (ALLEY_X - 2.2);
      fenceLine(gx, z0, gx, z0 + 3, 0.72); fenceLine(gx, z1 - 3, gx, z1, 0.72);
      // some front-yard low fences along the sidewalk edge with an opening at the walkway
      if (rnd() < 0.45 && !WALL_LOTS.has(s + ':' + i)) { const fx = s * (ROAD_HALF + SIDEWALK + 1.4); const wz = (z0 + z1) / 2 + (s < 0 ? HOUSE_W / 4 : -HOUSE_W / 4); fenceLine(fx, z0 + 0.3, fx, wz - 0.9, 0.5); fenceLine(fx, wz + 0.9, fx, z1 - 0.3, 0.5); }
    }
  }
  // fix: the alley/front fence colliders were added per segment already; remove the fence 'gap' helper entries
  for (const c of colliders) delete c.gap;
  instanced(scene, panel, panels, { cast: false }); instanced(scene, post, posts);
  progress(0.5);

  // ---------- poles, cables, lamps ----------
  const poleKit = await prop('modular_electricity_poles');
  const pole = findNode(poleKit, 'pole_large'), cross = findNode(poleKit, 'connection_large_01'), cross2 = findNode(poleKit, 'support_large_01');
  const poleItems = [], crossItems = [], cross2Items = [];
  const wireMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.8 });
  const poleTops = { '-1': [], '1': [] };
  for (const s of [-1, 1]) for (let z = -44; z <= 44; z += 22) {
    const x = s * (ALLEY_X + 2.3); poleItems.push({ x, z, r: Math.PI / 2 }); crossItems.push({ x, y: 1.9, z, r: Math.PI / 2 }); cross2Items.push({ x, y: 1.9, z, r: Math.PI / 2 });
    solid(x - 0.12, z - 0.12, x + 0.12, z + 0.12, 0, 7); poleTops[s].push(new THREE.Vector3(x, 6.9, z));
    mapRects.push({ x: x - 0.15, z: z - 0.15, w: 0.3, h: 0.3, type: 'pole' });
  }
  instanced(scene, pole, poleItems); instanced(scene, cross, crossItems); instanced(scene, cross2, cross2Items);
  for (const s of [-1, 1]) { const arr = poleTops[s]; for (let i = 0; i + 1 < arr.length; i++) for (const off of [-0.5, 0, 0.5]) wire(scene, arr[i].clone().add(new THREE.Vector3(0, 0, off)), arr[i + 1].clone().add(new THREE.Vector3(0, 0, off)), wireMat, 0.8); }
  // service drops to a few houses
  for (const s of [-1, 1]) { const arr = poleTops[s]; for (let i = 0; i < arr.length; i++) { const z = arr[i].z + rr(-3, 3); wire(scene, arr[i], new THREE.Vector3(s * (HOUSE_FRONT + HOUSE_DEPTH - 0.5), 6.2, THREE.MathUtils.clamp(z, -40, 40)), wireMat, 0.5); } }
  // alley security lights on poles
  const secLight = await prop('security_light');
  for (const s of [-1, 1]) for (let i = 0; i < poleTops[s].length; i += 2) { const p = poleTops[s][i]; placeClone(scene, secLight, p.x - s * 0.1, 5.4, p.z, s < 0 ? Math.PI / 2 : -Math.PI / 2, 1); lamps.push({ x: p.x - s * 0.6, y: 5.2, z: p.z, warm: true, alley: true }); }
  // street lamps (victorian style, Poly Haven)
  const lamp = await prop('street_lamp_01');
  const lampZ = { '-1': [-36, -12, 12, 36], '1': [-24, 0, 24] };
  for (const s of [-1, 1]) for (const z of lampZ[s]) { const x = s * (ROAD_HALF + SIDEWALK - 0.4); placeClone(scene, lamp, x, 0, z, 0, 1.15, true); lamps.push({ x, y: 4.1, z, warm: true }); mapRects.push({ x: x - 0.2, z: z - 0.2, w: 0.4, h: 0.4, type: 'pole' }); }
  // lamps over the cross streets (backdrop)
  for (const s of [-1, 1]) for (const x of [-30, 0, 30]) { placeClone(scene, lamp, x, 0, s * 44.2, 0, 1.15, true); lamps.push({ x, y: 4.1, z: s * 44.2, warm: true, far: true }); }
  progress(0.6);

  // ---------- props ----------
  const P = {};
  for (const n of ['fire_hydrant', 'metal_trash_can', 'old_tyre', 'plastic_monobloc_chair_01', 'trashbag', 'cardboard_box_01', 'propane_tank', 'utility_box_01', 'old_bed_frame', 'concrete_road_barrier', 'covered_car', 'wooden_crate_01', 'plastic_crate_01', 'metal_jerrycan', 'water_manhole_cover', 'power_box_01', 'ammo_box', 'dead_tree_trunk']) P[n] = await prop(n);
  progress(0.7);
  placeClone(scene, P.fire_hydrant, 5.6, 0, -20, 0.3, 1, true); placeClone(scene, P.fire_hydrant, -5.6, 0, 18, 2.1, 1, true);
  for (const z of [-30, -6, 14, 34]) placeClone(scene, P.water_manhole_cover, rr(-2.5, 2.5), 0.03, z, rnd() * 6);
  // road blocked at the ends by barriers (map edge)
  for (const s of [-1, 1]) for (const x of [-3, 0, 3]) placeClone(scene, P.concrete_road_barrier, x, 0, s * 45.5, Math.PI / 2, 1, true);
  for (const s of [-1, 1]) for (const x of [-ALLEY_X, ALLEY_X]) placeClone(scene, P.concrete_road_barrier, x, 0, s * 45.5, Math.PI / 2, 1, true);
  // cars on the street
  const carSpots = [[-3.2, -34], [3.2, -16], [-3.2, 4], [3.2, 26], [-ALLEY_X - 0.3, 20], [ALLEY_X + 0.3, -8]];
  for (const [x, z] of carSpots) placeClone(scene, P.covered_car, x, 0, z, Math.PI / 2 + rr(-0.05, 0.05) + (rnd() < 0.5 ? Math.PI : 0), 1, true);
  for (const l of lots) {
    const s = l.side, bx = s * rr(27, 31), fx = s * rr(9.5, 12.5);
    // backyard clutter
    const k = rnd();
    if (k < 0.3) { placeClone(scene, P.old_tyre, bx, 0, l.zc + rr(-2.5, 2.5), rnd() * 6, 1, true); placeClone(scene, P.old_tyre, bx + 0.5, 0, l.zc + rr(-2.5, 2.5), rnd() * 6, 1); }
    else if (k < 0.5) placeClone(scene, P.old_bed_frame, bx, 0, l.zc + rr(-2, 2), rnd() * 6, 1, true);
    else if (k < 0.7) { placeClone(scene, P.plastic_monobloc_chair_01, bx, 0, l.zc - 0.6, rnd() * 6, 1, true); placeClone(scene, P.plastic_monobloc_chair_01, bx + 0.7, 0, l.zc + 0.6, rnd() * 6, 1, true); }
    else placeClone(scene, P.wooden_crate_01, bx, 0, l.zc + rr(-2, 2), rnd() * 6, 1, true);
    if (rnd() < 0.5) placeClone(scene, P.metal_trash_can, s * (ALLEY_X - 2.9), 0, l.zc + rr(2.2, 3.4), rnd() * 6, 1, true);
    if (rnd() < 0.35) placeClone(scene, P.trashbag, s * (ALLEY_X - 2.6), 0, l.zc - rr(2.2, 3.2), rnd() * 6, 1);
    if (rnd() < 0.3) placeClone(scene, P.cardboard_box_01, s * (ALLEY_X - 1.2), 0, l.zc + rr(-3, 3), rnd() * 6, 1, true);
    if (rnd() < 0.25) placeClone(scene, P.propane_tank, s * (HOUSE_FRONT + HOUSE_DEPTH + 0.6), 0, l.zc + rr(-2, 2), rnd() * 6, 1, true);
    if (rnd() < 0.3) placeClone(scene, P.plastic_crate_01, s * (ALLEY_X - 2.6), 0, l.zc + rr(-1, 1), rnd() * 6, 1, true);
    if (rnd() < 0.2) placeClone(scene, P.metal_jerrycan, s * (HOUSE_FRONT + HOUSE_DEPTH + 0.5), 0, l.zc + rr(-2, 2), rnd() * 6, 1);
    // front yard lawn chairs / junk
    if (rnd() < 0.4) { placeClone(scene, P.plastic_monobloc_chair_01, fx, 0, l.zc + rr(-2.5, 2.5), rnd() * 6, 1, true); }
    if (rnd() < 0.25) placeClone(scene, P.old_tyre, fx, 0, l.zc + rr(-2.5, 2.5), rnd() * 6, 1, true);
    // wall mounted bits
    const wx = s * (HOUSE_FRONT + 0.1), wz = l.zc + (s < 0 ? -HOUSE_W / 2 : HOUSE_W / 2);
    if (rnd() < 0.5) placeClone(scene, P.utility_box_01, s * (HOUSE_FRONT + rr(2, 8)), 1.2, wz - s * 0 + (s < 0 ? -0.15 : 0.15), s < 0 ? Math.PI : 0, 1);
  }
  placeClone(scene, P.dead_tree_trunk, -29, 0, 25, 0.4, 1, true); placeClone(scene, P.power_box_01, 7.2, 0, -2, Math.PI, 1, true);
  for (const [x, z] of [[-ALLEY_X + 1.3, -42], [ALLEY_X - 1.3, 40]]) placeClone(scene, P.ammo_box, x, 0, z, rnd() * 6, 1);
  progress(0.78);

  // ---------- vegetation ----------
  const trees = {};
  for (const n of ['island_tree_01', 'tree_small_02', 'jacaranda_tree']) trees[n] = await prop(n);
  const treeSpots = [['island_tree_01', -7.4, -26, 1.0], ['tree_small_02', 7.4, -34, 1.1], ['island_tree_01', -7.4, 2, 0.9], ['island_tree_01', 7.4, 14, 0.95], ['tree_small_02', -7.4, 30, 1.0], ['tree_small_02', 7.4, 38, 0.95],
    ['island_tree_01', -29, -14, 0.85], ['tree_small_02', 30, 6, 0.9], ['island_tree_01', 28, -30, 0.8], ['island_tree_01', -30, 38, 0.8]];
  const treeCount = Q.mobile ? 4 : 8;
  for (let i = 0; i < treeCount; i++) { const [n, x, z, s] = treeSpots[i]; const t = placeClone(scene, trees[n], x, 0, z, rnd() * 6, s); const bb = new THREE.Box3().setFromObject(t); const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2; solid(x - 0.45, z - 0.45, x + 0.45, z + 0.45, 0, 4); mapRects.push({ x: x - 2.2, z: z - 2.2, w: 4.4, h: 4.4, type: 'tree' }); }
  // grass clumps + weeds, instanced
  const g1 = await prop('grass_medium_01'), g2 = await prop('grass_medium_02');
  const clumps = [findNode(g1, 'grass_medium_01_tall_a_LOD0'), findNode(g1, 'grass_medium_01_mid_a_LOD0'), findNode(g1, 'grass_medium_01_large_b_LOD0'), findNode(g2, 'grass_medium_02_e'), findNode(g2, 'grass_medium_02_d')];
  const nGrass = Q.mobile ? 380 : 950, perClump = [[], [], [], [], []];
  const inHouse = (x, z) => colliders.some((c) => !c.fence && x > c.minX - 0.3 && x < c.maxX + 0.3 && z > c.minZ - 0.3 && z < c.maxZ + 0.3 && c.maxY > 0.5);
  for (let i = 0; i < nGrass; i++) {
    const s = rnd() < 0.5 ? -1 : 1, zone = rnd();
    let x, z;
    if (zone < 0.25) { x = s * rr(6.6, 8.2); z = rr(-44, 44); }                 // parkway
    else if (zone < 0.55) { x = s * rr(8.2, 13.6); z = rr(-40, 40); }            // front yards
    else { x = s * rr(24.5, 33); z = rr(-40, 40); }                              // backyards
    if (inHouse(x, z)) continue;
    const k = rnd(); perClump[k < 0.55 ? 0 : k < 0.8 ? 1 : k < 0.9 ? 3 : k < 0.96 ? 4 : 2].push({ x, z, r: rnd() * 6.28, s: rr(1.7, 3.4) });
  }
  clumps.forEach((c, i) => { if (c && perClump[i].length) instanced(scene, c, perClump[i], { cast: false, receive: true }); });
  const weeds = { nettle_plant: 1, weed_plant_02: 1, dandelion_01: 1, wild_rooibos_bush: 1 };
  for (const n in weeds) {
    const w = await prop(n); const items = [];
    const count = Q.mobile ? 8 : 16;
    for (let i = 0; i < count; i++) { const s = rnd() < 0.5 ? -1 : 1; const x = s * (rnd() < 0.5 ? rr(31, 33) : rr(24.6, 26)); const z = rr(-40, 40); if (!inHouse(x, z)) items.push({ x, z, r: rnd() * 6.28, s: rr(0.8, 1.4) }); }
    if (items.length) instanced(scene, firstMesh(w), items, { cast: false });
  }
  const shrubs = [await prop('shrub_01'), await prop('shrub_03')];
  const shrubItems = [[], []];
  for (const l of lots) if (rnd() < 0.55) shrubItems[Math.floor(rnd() * 2)].push({ x: l.side * rr(12, 13.4), z: l.zc + rr(-2.6, 2.6) * (l.side < 0 ? -1 : 1) * 0.5 - l.side * 0, r: rnd() * 6.28, s: rr(0.8, 1.3) });
  shrubs.forEach((s, i) => { if (shrubItems[i].length) instanced(scene, firstMesh(s), shrubItems[i], { cast: !Q.mobile }); });
  progress(0.9);

  // ---------- map boundary ----------
  solid(MAP.minX - 2, MAP.minZ - 2, MAP.minX, MAP.maxZ + 2, 0, 6); solid(MAP.maxX, MAP.minZ - 2, MAP.maxX + 2, MAP.maxZ + 2, 0, 6);
  solid(MAP.minX - 2, MAP.minZ - 2, MAP.maxX + 2, MAP.minZ, 0, 6); solid(MAP.minX - 2, MAP.maxZ, MAP.maxX + 2, MAP.maxZ + 2, 0, 6);
  // backdrop house row blockers
  return { kit, materials, lots };
}

// ---------- queries used by player/bots ----------
export function groundAt(x, z, feetY) {
  let g = 0;
  for (const c of colliders) if (c.step && x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ && c.maxY - feetY <= 0.85 && c.maxY > g) g = c.maxY;
  return g;
}
// push a circle (x,z, radius r) with vertical span [y0,y1] out of solid colliders. Returns true if blocked.
export function resolve(p, r, y0, y1, feetY) {
  let hit = false;
  for (const c of colliders) {
    if (c.step && c.maxY - feetY <= 0.85) continue;          // climbable
    if (y1 <= c.minY || y0 >= c.maxY) continue;
    const nx = Math.max(c.minX, Math.min(p.x, c.maxX)), nz = Math.max(c.minZ, Math.min(p.z, c.maxZ));
    const dx = p.x - nx, dz = p.z - nz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    hit = true;
    if (d2 > 1e-6) { const d = Math.sqrt(d2); p.x += dx / d * (r - d); p.z += dz / d * (r - d); }
    else { // inside: push along smallest penetration
      const px = Math.min(p.x - c.minX, c.maxX - p.x), pz = Math.min(p.z - c.minZ, c.maxZ - p.z);
      if (px < pz) p.x += (p.x - c.minX < c.maxX - p.x ? -(px + r) : (px + r)); else p.z += (p.z - c.minZ < c.maxZ - p.z ? -(pz + r) : (pz + r));
    }
  }
  return hit;
}
// segment vs solid (non-fence) colliders; returns t in [0,1] of first hit or 1 if clear. Also normal.
const _n = new THREE.Vector3();
export function raycastWorld(o, d, maxT = 1, ignoreFences = true, out = null) {
  let best = maxT;
  for (const c of colliders) {
    if (ignoreFences && c.fence) continue;
    let tmin = 0, tmax = best, nAxis = -1, nSign = 0;
    const o3 = [o.x, o.y, o.z], d3 = [d.x, d.y, d.z], mn = [c.minX, c.minY, c.minZ], mx = [c.maxX, c.maxY, c.maxZ];
    let ok = true;
    for (let a = 0; a < 3; a++) {
      if (Math.abs(d3[a]) < 1e-9) { if (o3[a] < mn[a] || o3[a] > mx[a]) { ok = false; break; } continue; }
      let t1 = (mn[a] - o3[a]) / d3[a], t2 = (mx[a] - o3[a]) / d3[a], s = -1;
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; s = 1; }
      if (t1 > tmin) { tmin = t1; nAxis = a; nSign = s; }
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) { ok = false; break; }
    }
    if (ok && tmin < best && tmin > 0) { best = tmin; if (out) { out.n.set(0, 0, 0); if (nAxis >= 0) out.n.setComponent(nAxis, nSign); } }
  }
  if (out) out.t = best;
  return best;
}
export function lineClear(a, b) { const d = new THREE.Vector3().subVectors(b, a); return raycastWorld(a, d, 1, true) >= 1; }
