import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { mergeGeometries } from '/mafia-wars/game/vendor/three/jsm/utils/BufferGeometryUtils.js';

// M7.0B1 Neo-Urban Anime Realism kit: procedural textures (generated here, nothing downloaded or
// licensed), the shared materials, and a batch that merges every piece into one mesh per material.
// Official palette: Deep Royal Purple #4B168C, Deep Forest Green #123D2A, Charcoal #17191D,
// Warm Concrete #B5ADA1, Muted Gold #C19A49.
export const PALETTE = Object.freeze({ purple: 0x4b168c, green: 0x123d2a, charcoal: 0x17191d, concrete: 0xb5ada1, gold: 0xc19a49 });

const rand = (seed) => { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909), (s >>>= 0) / 4294967296)); };
const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const clamp8 = (v) => Math.max(0, Math.min(255, Math.round(v)));

// Painted, anime-style textures: crisp joints, a soft light-to-shade gradient on each unit, low noise.
function dataTexture(w, h, paint, { tileU = 1, tileV = 1, name = '' } = {}) {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = paint(x, y), i = (y * w + x) * 4; data[i] = clamp8(c[0]); data[i + 1] = clamp8(c[1]); data[i + 2] = clamp8(c[2]); data[i + 3] = 255; }
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true; t.name = name; t.userData.tile = [tileU, tileV];
  return t;
}
// bricks: rows of `rows` per tile, `per` bricks per row, staggered; each brick lit from the top
function brickTexture(base, mortar, { rows = 8, per = 4, seed = 7, w = 256, h = 128, vary = 26, tileU = 2, tileV = 1, name }) {
  const r = rand(seed), shade = Array.from({ length: rows * (per + 1) }, () => (r() - 0.5) * vary), b = hex(base), m = hex(mortar);
  const rh = h / rows, bw = w / per;
  return dataTexture(w, h, (x, y) => {
    const row = Math.floor(y / rh), off = row % 2 ? bw / 2 : 0, col = Math.floor(((x + off) % w) / bw), lx = (x + off) % bw, ly = y % rh;
    if (ly < 2 || lx < 2) return m.map((v, i) => v - (i === 2 ? 4 : 0));
    const k = shade[row * (per + 1) + col] + (ly / rh) * 14 - (lx > bw - 4 ? 10 : 0); // row 0 is the bottom: lit from above
    return b.map((v) => v + k);
  }, { tileU, tileV, name });
}
// ashlar stone: large blocks with chamfered joints (bank)
function ashlarTexture() {
  const r = rand(19), tint = Array.from({ length: 16 }, () => (r() - 0.5) * 14), b = hex(0xd8cfbf), m = hex(0xa79d8c);
  return dataTexture(256, 128, (x, y) => {
    const row = Math.floor(y / 64), off = row % 2 ? 64 : 0, col = Math.floor(((x + off) % 256) / 128), lx = (x + off) % 128, ly = y % 64;
    if (ly < 2 || lx < 2) return m;
    if (ly > 59 || lx < 4) return b.map((v) => v + 12); // top chamfer catching the light (row 0 is the bottom)
    if (ly < 5 || lx > 124) return b.map((v) => v - 18);
    return b.map((v) => v + tint[row * 2 + col] + (ly / 64) * 8);
  }, { tileU: 2.4, tileV: 1.2, name: 'showcase-ashlar' });
}
function stuccoTexture(base, seed, name) {
  const r = rand(seed), b = hex(base), blobs = Array.from({ length: 14 }, () => [r() * 128, r() * 128, 10 + r() * 26, (r() - 0.5) * 16]);
  return dataTexture(128, 128, (x, y) => {
    let k = 0; for (const [bx, by, rr, a] of blobs) for (const [ox, oy] of [[0, 0], [128, 0], [-128, 0], [0, 128], [0, -128]]) { const d = Math.hypot(x - bx - ox, y - by - oy); if (d < rr) k += a * (1 - d / rr); }
    return b.map((v) => v + k + ((x * 7 + y * 13) % 5) - 2);
  }, { tileU: 3, tileV: 3, name });
}
function tileTexture() { // glazed deep-green tiles with a soft highlight (The Blaq Note)
  const b = hex(0x1d5a3e), m = hex(0x0d241a);
  return dataTexture(128, 128, (x, y) => {
    const lx = x % 32, ly = y % 32; if (lx < 2 || ly < 2) return m;
    const g = Math.max(0, 1 - Math.hypot(lx - 10, ly - 22) / 22);
    return b.map((v, i) => v + g * (i === 1 ? 46 : 30) + ly * 0.6);
  }, { tileU: 1, tileV: 1, name: 'showcase-green-tile' });
}
function shingleTexture(base, seed, name) { // staggered roof shingles, each lit from the top edge
  const r = rand(seed), shade = Array.from({ length: 96 }, () => (r() - 0.5) * 20), b = hex(base);
  return dataTexture(128, 128, (x, y) => {
    const row = Math.floor(y / 16), off = row % 2 ? 12 : 0, col = Math.floor(((x + off) % 128) / 24), lx = (x + off) % 24, ly = y % 16;
    if (ly < 2 || lx < 1) return b.map((v) => v - 34);
    return b.map((v) => v + shade[row * 6 + col] + (ly / 16) * 16);
  }, { tileU: 1.6, tileV: 1.6, name });
}
function ribTexture(base, name, horizontal = false) { // corrugated cladding / roll-up door slats
  const b = hex(base);
  return dataTexture(64, 64, (x, y) => { const t = (horizontal ? y : x) % 16, k = Math.sin((t / 16) * Math.PI * 2) * 18 + (t < 2 ? -16 : 0); return b.map((v) => v + k); }, { tileU: horizontal ? 2 : 0.8, tileV: horizontal ? 0.8 : 2, name });
}
function grassTexture() { // painted lawn: soft blotches of two greens, a few lighter tufts
  const r = rand(31), blobs = Array.from({ length: 22 }, () => [r() * 128, r() * 128, 8 + r() * 22, (r() - 0.5) * 26]), b = hex(0x4a6438);
  return dataTexture(128, 128, (x, y) => {
    let k = 0; for (const [bx, by, rr, a] of blobs) for (const [ox, oy] of [[0, 0], [128, 0], [-128, 0], [0, 128], [0, -128]]) { const d = Math.hypot(x - bx - ox, y - by - oy); if (d < rr) k += a * (1 - d / rr); }
    const tuft = ((x * 31 + y * 17) % 23) === 0 ? 18 : 0;
    return [b[0] + k * 0.6 + tuft, b[1] + k + tuft, b[2] + k * 0.4];
  }, { tileU: 4, tileV: 4, name: 'showcase-grass' });
}
function paverTexture() {
  const r = rand(5), tint = Array.from({ length: 64 }, () => (r() - 0.5) * 12), b = hex(0xa9a296), m = hex(0x6f6a62);
  return dataTexture(128, 128, (x, y) => {
    const cx = Math.floor(x / 32), cy = Math.floor(y / 32), lx = x % 32, ly = y % 32;
    if (lx < 1 || ly < 1) return m;
    return b.map((v) => v + tint[cy * 8 + cx] + (lx < 3 || ly < 3 ? 8 : 0));
  }, { tileU: 1.6, tileV: 1.6, name: 'showcase-pavers' });
}

// Night-driven emissive materials register here: emissiveIntensity = day + (night - day) * level.
export function createShowcaseMaterials({ mobile = false } = {}) {
  const night = [];
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: o.roughness ?? 0.85, metalness: o.metalness ?? 0, map: o.map || null, vertexColors: !!o.ao, ...(o.emissive ? { emissive: o.emissive, emissiveIntensity: o.day ?? 0 } : {}) });
  const glow = (m, day, nightValue) => { night.push({ m, day, night: nightValue }); m.emissiveIntensity = day; return m; };
  const tex = {
    brick: brickTexture(0x9a5843, 0x8a8076, { seed: 3, name: 'showcase-brick' }),
    darkBrick: brickTexture(0x2e3036, 0x55565c, { seed: 11, vary: 16, name: 'showcase-dark-brick' }),
    creamBrick: brickTexture(0xb49c7e, 0x857b70, { seed: 23, vary: 18, name: 'showcase-cream-brick' }),
    ashlar: ashlarTexture(), stucco: stuccoTexture(PALETTE.concrete, 9, 'showcase-stucco'), stuccoWarm: stuccoTexture(0xb2917a, 13, 'showcase-stucco-warm'),
    grass: grassTexture(),
    shingleCharcoal: shingleTexture(0x3e4248, 41, 'showcase-shingle-charcoal'), shingleTerracotta: shingleTexture(0x8a4f3a, 43, 'showcase-shingle-terracotta'),
    metal: ribTexture(0x5d6a6c, 'showcase-corrugated'), slats: ribTexture(0x9aa0a4, 'showcase-door-slats', true),
    tile: tileTexture(), pavers: paverTexture(),
  };
  const m = {
    brick: std(0xffffff, { map: tex.brick, ao: true }), darkBrick: std(0xffffff, { map: tex.darkBrick, ao: true }), creamBrick: std(0xffffff, { map: tex.creamBrick, ao: true }),
    stone: std(0xffffff, { map: tex.ashlar, ao: true, roughness: 0.78 }), stucco: std(0xffffff, { map: tex.stucco, ao: true }), stuccoWarm: std(0xffffff, { map: tex.stuccoWarm, ao: true }),
    tile: std(0xffffff, { map: tex.tile, ao: true, roughness: 0.32, metalness: 0.05 }), pavers: std(0xb4b0a8, { map: tex.pavers, roughness: 0.9 }),
    forecourt: std(0xd2c3aa, { map: tex.pavers, roughness: 0.85 }), grass: std(0xffffff, { map: tex.grass, roughness: 1 }),
    // residential: muted house tints on the stucco texture, shingle roofs; industrial: corrugated metal, door slats
    houseSage: std(0xb7c2ac, { map: tex.stucco, ao: true }), houseSand: std(0xe2d2b8, { map: tex.stucco, ao: true }), houseSlate: std(0xa9b4c2, { map: tex.stucco, ao: true }), houseBlush: std(0xd9b8a8, { map: tex.stucco, ao: true }),
    roofCharcoal: std(0xffffff, { map: tex.shingleCharcoal, roughness: 0.9 }), roofTerracotta: std(0xffffff, { map: tex.shingleTerracotta, roughness: 0.9 }),
    metal: std(0xffffff, { map: tex.metal, ao: true, roughness: 0.55, metalness: 0.35 }), slats: std(0xffffff, { map: tex.slats, roughness: 0.6, metalness: 0.3 }),
    driveway: std(0x9a958c, { roughness: 0.95 }),
    trim: std(0xcfc7b8, { ao: true, roughness: 0.8 }), concrete: std(PALETTE.concrete, { ao: true }), curb: std(0x9d978c, { roughness: 0.9 }),
    charcoal: std(PALETTE.charcoal, { roughness: 0.55, metalness: 0.35 }), frame: std(0x24272d, { roughness: 0.45, metalness: 0.55 }), roof: std(0x3a3d43, { roughness: 0.95 }),
    gold: std(PALETTE.gold, { roughness: 0.32, metalness: 0.75 }), purple: std(PALETTE.purple, { roughness: 0.6 }), green: std(PALETTE.green, { roughness: 0.6 }),
    fabricGreen: std(PALETTE.green, { roughness: 0.9 }), fabricPurple: std(PALETTE.purple, { roughness: 0.9 }),
    glass: std(0x1b2a3a, { roughness: 0.08, metalness: 0.65 }),
    glassWarm: glow(std(0x2a2620, { roughness: 0.15, metalness: 0.4, emissive: 0xffc985 }), 0, 1.15),
    glassCool: glow(std(0x22283a, { roughness: 0.15, metalness: 0.4, emissive: 0xb8d0ff }), 0, 0.85),
    lamp: glow(std(0x3a3328, { emissive: 0xffd9a0 }), 0.05, 2.4),
    neonPurple: glow(std(PALETTE.purple, { emissive: 0x9b4dff }), 0.25, 3.2),
    neonGreen: glow(std(PALETTE.green, { emissive: 0x3fd08a }), 0.2, 2.6),
    leaf: std(0x4f7d45, { roughness: 0.9 }), leafDark: std(0x3a6338, { roughness: 0.9 }), trunk: std(0x5d4434, { roughness: 0.95 }), soil: std(0x3b2f27, { roughness: 1 }),
  };
  for (const k of ['pavers', 'grass']) m[k].userData.tile = tex[k].userData.tile;
  m.forecourt.userData.tile = [2.4, 2.4];
  for (const k of ['houseSage', 'houseSand', 'houseSlate', 'houseBlush']) m[k].userData.tile = tex.stucco.userData.tile;
  m.roofCharcoal.userData.tile = tex.shingleCharcoal.userData.tile; m.roofTerracotta.userData.tile = tex.shingleTerracotta.userData.tile;
  m.metal.userData.tile = tex.metal.userData.tile; m.slats.userData.tile = tex.slats.userData.tile;
  for (const [k, t] of [['brick', 'brick'], ['darkBrick', 'darkBrick'], ['creamBrick', 'creamBrick'], ['stone', 'ashlar'], ['stucco', 'stucco'], ['stuccoWarm', 'stuccoWarm'], ['tile', 'tile']]) m[k].userData.tile = tex[t].userData.tile;
  for (const [k, v] of Object.entries(m)) v.name = `showcase-${k}`;
  return { m, tex, night, mobile, setNight(level) { for (const n of night) n.m.emissiveIntensity = n.day + (n.night - n.day) * level; } };
}

// Signs: a canvas texture that reads by day and glows at night (one material and mesh per sign).
export function signMaterial(kit, draw, { w = 1024, h = 256, day = 0.18, night = 1.25, preview = 0x2a2830, res = 1 } = {}) {
  // the art is laid out in w x h units; `res` (and mobile, at half) sets the canvas resolution
  const s = (kit.mobile ? 0.5 : 1) * res, canvas = document.createElement('canvas'); canvas.width = Math.round(w * s); canvas.height = Math.round(h * s);
  const ctx = canvas.getContext('2d'), paint = () => { ctx.setTransform?.(s, 0, 0, s, 0, 0); draw(ctx, w, h); };
  paint();
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = kit.mobile ? 2 : 4;
  const mat = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: day, roughness: 0.6 });
  mat.userData.previewColor = preview; // the panel colour, for renderers without canvas (tools/city/software-render.mjs)
  mat.userData.repaint = () => { paint(); t.needsUpdate = true; };
  kit.night.push({ m: mat, day, night });
  return mat;
}

const tmpColor = [];
// One batch per chunk: every piece is added as geometry and merged into a single mesh per material.
export class KitBatch {
  constructor() { this.parts = new Map(); this.triangles = 0; }
  add(mat, geometry) { if (!mat) throw new Error('KitBatch: missing material'); if (!this.parts.has(mat)) this.parts.set(mat, []); this.parts.get(mat).push(geometry); return geometry; }
  box(mat, cx, cy, cz, sx, sy, sz) { if (sx <= 0 || sy <= 0 || sz <= 0) return null; return this.add(mat, new THREE.BoxGeometry(sx, sy, sz).translate(cx, cy, cz)); }
  cyl(mat, cx, cy, cz, r, h, seg = 10, rTop = r) { return this.add(mat, new THREE.CylinderGeometry(rTop, r, h, seg).translate(cx, cy, cz)); }
  blob(mat, cx, cy, cz, r, detail = 0) { return this.add(mat, new THREE.IcosahedronGeometry(r, detail).translate(cx, cy, cz)); }
  build(parent, name, { castShadow = true } = {}) {
    const meshes = [];
    for (const [mat, list] of this.parts) {
      const geometry = mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)), false);
      for (const g of list) g.dispose();
      const tile = mat.userData.tile;
      if (tile) worldUv(geometry, tile);
      if (mat.vertexColors) paintAo(geometry);
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, mat); mesh.name = `${name}-${mat.name}`;
      const emissive = mat.emissive && mat.emissive.getHex() !== 0;
      mesh.castShadow = castShadow && !emissive && !mat.name.includes('glass'); mesh.receiveShadow = true;
      parent.add(mesh); meshes.push(mesh); this.triangles += geometry.attributes.position.count / 3;
    }
    this.parts.clear();
    return meshes;
  }
}
// box-projected world UVs (all kit pieces are axis-aligned), so textures keep real-world scale
function worldUv(g, [tu, tv]) {
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) { uv[i * 2] = x / tu; uv[i * 2 + 1] = z / tv; }
    else if (ax >= az) { uv[i * 2] = z / tu; uv[i * 2 + 1] = y / tv; }
    else { uv[i * 2] = x / tu; uv[i * 2 + 1] = y / tv; }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
// painted ambient occlusion: walls darken toward the ground, undersides are shaded
function paintAo(g) {
  const p = g.attributes.position, n = g.attributes.normal, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), ny = n.getY(i), t = Math.min(1, Math.max(0, y / 3.2)), base = ny < -0.5 ? 0.62 : ny > 0.5 ? 1 : 0.74 + 0.26 * t * t * (3 - 2 * t);
    c[i * 3] = base; c[i * 3 + 1] = base; c[i * 3 + 2] = base * 1.01;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
}

// A facade frame: the face of a footprint on one side, with `along` running across it.
export const SIDES = Object.freeze({ east: [1, 0], west: [-1, 0], north: [0, 1], south: [0, -1] });
export function facade(b, side) {
  const [nx, nz] = SIDES[side], half = nx ? b.width / 2 : b.depth / 2, length = nx ? b.depth : b.width;
  // `along` runs left to right as seen from the street
  const ux = nz, uz = -nx; // the viewer's right hand: (-n) x up
  return { side, nx, nz, ux, uz, half, length, cx: b.x + nx * half, cz: b.z + nz * half };
}
// a box on a facade: `a` along it, `y` centre height, `out` metres proud of the face; sizes: across, height, depth off the face
export function fbox(batch, mat, f, a, y, out, across, h, thick) {
  const x = f.cx + f.ux * a + f.nx * out, z = f.cz + f.uz * a + f.nz * out;
  return batch.box(mat, x, y, z, f.nx ? thick : across, h, f.nx ? across : thick);
}
export function fpoint(f, a, out) { return [f.cx + f.ux * a + f.nx * out, f.cz + f.uz * a + f.nz * out]; }

// A window that reads as set into the wall: glass just proud of the face, a deeper surround
// (lintel, sill, jambs), and a mullion on wide windows. `lit` picks the night glass.
export function windowUnit(batch, kit, f, a, y, w, h, { glass = kit.m.glass, surround = kit.m.trim, mullion = true, sill = true, depth = 0.16 } = {}) {
  const m = kit.m;
  fbox(batch, glass, f, a, y, 0.03, w, h, 0.04);
  fbox(batch, surround, f, a, y + h / 2 + 0.09, depth / 2, w + 0.32, 0.18, depth);
  if (sill) fbox(batch, surround, f, a, y - h / 2 - 0.06, depth / 2 + 0.04, w + 0.36, 0.12, depth + 0.08);
  for (const s of [-1, 1]) fbox(batch, surround, f, a + s * (w / 2 + 0.07), y, depth / 2, 0.14, h, depth);
  if (mullion && w > 1.1) fbox(batch, m.frame, f, a, y, 0.06, 0.06, h, 0.05);
  if (mullion && h > 1.4) fbox(batch, m.frame, f, a, y + h * 0.18, 0.06, w, 0.05, 0.05);
}

// Rooftop details that give a skyline its anime-city character: a timber water tank on legs,
// condenser units, a stair bulkhead.
export function waterTank(batch, kit, x, y, z, r = 1.1) {
  const m = kit.m;
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) batch.box(m.frame, x + dx * r * 0.62, y + 0.9, z + dz * r * 0.62, 0.14, 1.8, 0.14);
  batch.box(m.frame, x, y + 1.82, z, r * 1.6, 0.1, r * 1.6);
  batch.cyl(m.trunk, x, y + 2.95, z, r, 2.2, 12);
  for (const hy of [2.2, 3.0, 3.7]) batch.cyl(m.frame, x, y + hy, z, r + 0.03, 0.07, 12);
  batch.cyl(m.roof, x, y + 4.35, z, r * 1.05, 0.65, 12, 0.08);
}
export function roofUnits(batch, kit, x, y, z, count, rnd) {
  for (let i = 0; i < count; i++) {
    const ox = (rnd() - 0.5) * 3, oz = (rnd() - 0.5) * 3;
    batch.box(kit.m.concrete, x + ox, y + 0.45, z + oz, 1.3, 0.9, 1.0);
    batch.cyl(kit.m.frame, x + ox, y + 0.92, z + oz, 0.32, 0.06, 10);
  }
}

// Street furniture pieces (positions come from city-showcase-layout.js).
export function furniturePiece(batch, kit, f) {
  const m = kit.m;
  if (f.kind === 'tree') {
    batch.box(m.curb, f.x, 0.1, f.z, 1.1, 0.06, 1.1); batch.box(m.soil, f.x, 0.115, f.z, 0.9, 0.04, 0.9);
    batch.cyl(m.trunk, f.x, 1.6, f.z, 0.13, 3.2, 7, 0.09);
    batch.blob(m.leaf, f.x, 3.9, f.z, 1.35, 1); batch.blob(m.leafDark, f.x + 0.7, 3.4, f.z + 0.3, 0.9, 0); batch.blob(m.leaf, f.x - 0.6, 3.5, f.z - 0.4, 0.95, 0); batch.blob(m.leaf, f.x + 0.1, 4.7, f.z - 0.2, 0.8, 0);
  } else if (f.kind === 'planter') {
    batch.box(m.concrete, f.x, 0.42, f.z, f.width, 0.7, f.depth); batch.box(m.gold, f.x, 0.79, f.z, f.width + 0.04, 0.04, f.depth + 0.04); batch.box(m.soil, f.x, 0.78, f.z, f.width - 0.16, 0.04, f.depth - 0.16);
    const along = f.width > f.depth; for (const s of [-0.5, 0, 0.5]) batch.blob(s ? m.leafDark : m.leaf, f.x + (along ? s * f.width * 0.6 : 0), 1.15, f.z + (along ? 0 : s * f.depth * 0.6), 0.42, 0);
  } else if (f.kind === 'bench') {
    const along = f.width > f.depth, len = Math.max(f.width, f.depth);
    for (const s of [-1, 1]) batch.box(m.frame, f.x + (along ? s * len * 0.38 : 0), 0.24, f.z + (along ? 0 : s * len * 0.38), along ? 0.08 : 0.5, 0.48, along ? 0.5 : 0.08);
    batch.box(m.trunk, f.x, 0.5, f.z, along ? len : 0.5, 0.07, along ? 0.5 : len);
    batch.box(m.trunk, along ? f.x : f.x + 0.22, 0.78, along ? f.z + 0.22 : f.z, along ? len : 0.06, 0.38, along ? 0.06 : len);
  } else if (f.kind === 'bollard') {
    batch.cyl(m.charcoal, f.x, 0.48, f.z, 0.13, 0.95, 10); batch.cyl(m.gold, f.x, 0.88, f.z, 0.14, 0.06, 10);
  }
}
