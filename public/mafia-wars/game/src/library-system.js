import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { insideInteractionRange, interactionCooldownReady } from './city-layout.js';
import { addInteriorIsolationShell, wallCollider } from './apartment-system.js';
import { KitBatch, signMaterial, PALETTE } from './city-showcase-kit.js';
import { LIBRARY, libraryInterior, librarySpace } from './academy-layout.js';
import { ACADEMY_BOOKS, ACADEMY_EXAMS, ACADEMY_MEDIA } from './academy-content.js';

// M7.2 the Nerdie Blaq Academy Library interior. Like the other interiors it sits high above the city
// on render layer 1 with its own colliders; readers come in from the top of the front stairs. Every
// glowing station opens the reading panel (library-panel.js): the two guides, the intro series and
// the ebook, the practice exams, and the directory. Nothing here is sent to the server but the door.
const TRANSITION_COOLDOWN = 0.65, STATION_REACH = 1.35;
const hexCss = (h) => `#${h.toString(16).padStart(6, '0')}`;
const STATION_LABEL = Object.freeze({
  'defi-guide': 'BEGINNER DEFI GUIDE', 'operator-guide': 'BUSINESS OPERATOR GUIDE', 'intro-series': 'ACADEMY INTRO SERIES', ebook: 'FROM 5K TO 1 MILLION',
  'defi-exam': 'PRACTICE EXAM · DEFI', 'operator-exam': 'PRACTICE EXAM · OPERATOR', directory: 'ACADEMY DIRECTORY',
});
const STATION_VERB = Object.freeze({ book: 'READ', media: 'OPEN', exam: 'START', directory: 'BROWSE' });

// procedural textures (DataTexture: they work without a canvas, in the tests and the CPU renderer)
function dataTexture(w, h, paint, repeat = [1, 1]) {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = paint(x, y), i = (y * w + x) * 4; data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255; }
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t;
}
const SPINES = [[75, 22, 140], [18, 61, 42], [193, 154, 73], [120, 34, 40], [32, 48, 82], [150, 110, 70], [60, 30, 90], [200, 190, 165], [28, 28, 32], [96, 70, 44]];
function spineTexture() { // five rows of book spines between dark shelf boards
  let s = 12345; const rand = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  const W = 128, H = 128, row = H / 4, cols = []; for (let r = 0; r < 4; r++) { const line = []; for (let x = 0; x < W;) { const w = 2 + Math.floor(rand() * 4), c = SPINES[Math.floor(rand() * SPINES.length)], top = 4 + Math.floor(rand() * 7); line.push([x, x + w, c, top, rand() < 0.3]); x += w; } cols.push(line); }
  return dataTexture(W, H, (x, y) => {
    const r = Math.floor(y / row), yy = y - r * row;
    if (yy >= row - 3) return [52, 34, 22];                       // the shelf board
    const book = cols[r].find((b) => x >= b[0] && x < b[1]); if (!book || yy < book[3]) return [30, 20, 14]; // the dark back of the case
    const [x0, x1, c, , band] = book, edge = x === x0 || x === x1 - 1 ? 0.7 : 1, gold = band && (yy === book[3] + 4 || yy === row - 8);
    return gold ? [210, 172, 92] : c.map((v) => Math.round(v * edge));
  }, [1, 1]);
}
function parquetTexture() {
  return dataTexture(64, 64, (x, y) => { const blk = (Math.floor(x / 16) + Math.floor(y / 16)) % 2, along = blk ? x % 16 : y % 16, n = ((x * 31 + y * 17) % 7) - 3; const base = blk ? [122, 82, 50] : [138, 94, 58]; return along === 0 ? [70, 46, 28] : base.map((v) => v + n * 2); }, [1, 1]);
}

export class LibrarySystem {
  constructor(scene, site, { addCollider, mobile = false, kit = null } = {}) {
    this.scene = scene; this.site = site; this.addCollider = addCollider; this.mobile = mobile; this.kit = kit;
    this.active = false; this.prompt = ''; this.transitionReadyAt = 0; this.actionReadyAt = 0;
    this.layout = libraryInterior(); this.space = librarySpace(this.layout);
    this.exterior = new THREE.Group(); this.exterior.name = `library-exterior-${site.id}`; // the facade is a showcase design (city-showcase.js)
    this.interior = new THREE.Group(); this.interior.name = `library-interior-${site.id}`; this.interior.visible = false;
    scene.add(this.interior);
    this.buildInterior();
    this.interior.traverse((o) => o.layers.set(1));
    const v = (p) => new THREE.Vector3(p.x, p.y, p.z);
    this.entry = v(this.space.entry); this.insideSpawn = v(this.space.inside); this.exit = v(this.space.exit); this.outsideSpawn = v(this.space.outside);
  }

  buildInterior() {
    const L = this.layout, y = L.y, H = L.height, g = this.interior, kit = this.kit || { night: [], mobile: this.mobile, m: null }, b = new KitBatch(), mobile = this.mobile;
    const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.r ?? 0.8, metalness: o.metal ?? 0, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 0, map: o.map || null, transparent: !!o.opacity, opacity: o.opacity ?? 1, depthWrite: !o.opacity });
    const M = {
      floor: std(0xffffff, { map: parquetTexture(), r: 0.55 }), wood: std(0x5a3a24, { r: 0.6 }), darkWood: std(0x3a2618, { r: 0.65 }), plaster: std(0xe4dccb, { r: 0.9 }), stone: std(0xcfc7b8, { r: 0.8 }),
      gold: std(PALETTE.gold, { r: 0.32, metal: 0.75 }), purple: std(PALETTE.purple, { r: 0.85 }), green: std(PALETTE.green, { r: 0.85 }), charcoal: std(PALETTE.charcoal, { r: 0.55, metal: 0.3 }),
      leather: std(0x5b2a22, { r: 0.6 }), lampGreen: std(0x1d6b45, { e: 0x2fd27e, ei: 0.55, r: 0.35 }), lamp: std(0x3a3328, { e: 0xffdcaa, ei: 1.3 }), skylight: std(0xdfeaff, { e: 0xcfe0ff, ei: 1.4, r: 0.2 }),
      fire: std(0x3a1408, { e: 0xff7a2a, ei: 2.2 }), glow: std(0x2a2410, { e: 0xffd27a, ei: 1.6 }), screen: std(0x10121a, { e: 0x6b4dff, ei: 0.25, r: 0.2 }),
      glass: std(0xcfe0ee, { r: 0.05, metal: 0.1, opacity: 0.18 }), spines: std(0xffffff, { map: spineTexture(), r: 0.85 }),
    };
    M.glass.name = 'library-glass';
    const cx = (L.minX + L.maxX) / 2, cz = (L.minZ + L.maxZ) / 2, w = L.maxX - L.minX, d = L.maxZ - L.minZ, t = 0.25, Gl = L.gallery, St = L.stair, T = L.testing;
    const bx = (mat, x0, x1, y0, y1, z0, z1) => b.box(mat, (x0 + x1) / 2, y + (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0);
    const plane = (mat, x, yy, z, pw, ph, rotY, name) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), mat); m.position.set(x, y + yy, z); m.rotation.y = rotY; m.name = name; g.add(m); return m; };
    const sign = (draw, opts) => signMaterial(kit, draw, { day: 0.9, night: 0.9, ...opts });
    addInteriorIsolationShell(g, [cx, y + 6, cz], [w + 8, 16, d + 8], 'library-isolation-shell');
    // floor, the aisle runner and the round rug under the skylight
    bx(M.floor, L.minX, L.maxX, -0.16, 0, L.minZ, L.maxZ); M.floor.map.repeat.set(w / 2.4, d / 2.4);
    bx(M.purple, L.minX + 0.6, L.maxX - 4.6, 0, 0.012, L.doorZ - 1.3, L.doorZ + 1.3);
    for (const s of [-1, 1]) bx(M.gold, L.minX + 0.6, L.maxX - 4.6, 0.012, 0.016, L.doorZ + s * 1.3 - 0.06, L.doorZ + s * 1.3 + 0.06);
    b.add(M.green, new THREE.CylinderGeometry(4.2, 4.2, 0.014, 40).translate(L.skylight.x, y + 0.007, L.skylight.z)); b.add(M.gold, new THREE.TorusGeometry(4.1, 0.05, 4, 48).rotateX(Math.PI / 2).translate(L.skylight.x, y + 0.016, L.skylight.z));
    // walls: dark wood wainscot, plaster above, pilasters, a gold rail; the door gap on the west wall
    const wall = (x0, x1, z0, z1) => { bx(M.wood, x0, x1, 0, 1.2, z0, z1); bx(M.plaster, x0, x1, 1.2, H, z0, z1); };
    wall(L.minX - t, L.maxX + t, L.minZ - t, L.minZ); wall(L.minX - t, L.maxX + t, L.maxZ, L.maxZ + t); wall(L.maxX, L.maxX + t, L.minZ, L.maxZ);
    const door0 = L.doorZ - L.doorWidth / 2, door1 = L.doorZ + L.doorWidth / 2;
    wall(L.minX - t, L.minX, L.minZ, door0); wall(L.minX - t, L.minX, door1, L.maxZ); bx(M.plaster, L.minX - t, L.minX, 3.2, H, door0, door1);
    bx(M.darkWood, L.minX - 0.02, L.minX + 0.06, 0, 3.2, door0 - 0.2, door0); bx(M.darkWood, L.minX - 0.02, L.minX + 0.06, 0, 3.2, door1, door1 + 0.2); bx(M.darkWood, L.minX - 0.02, L.minX + 0.06, 3.0, 3.3, door0 - 0.2, door1 + 0.2);
    bx(M.charcoal, L.minX + 0.02, L.minX + 0.08, 0, 3.0, door0, door1); bx(M.gold, L.minX + 0.08, L.minX + 0.12, 1.1, 1.16, door0 + 0.3, door1 - 0.3);
    for (const [x0, x1, z0, z1] of [[L.minX, L.maxX, L.minZ, L.minZ + 0.03], [L.minX, L.maxX, L.maxZ - 0.03, L.maxZ], [L.maxX - 0.03, L.maxX, L.minZ, L.maxZ], [L.minX, L.minX + 0.03, L.minZ, L.maxZ]]) bx(M.gold, x0, x1, 1.2, 1.26, z0, z1);
    for (let x = L.minX + 4; x < L.maxX - 1; x += 6) for (const [z0, z1] of [[L.minZ, L.minZ + 0.3], [L.maxZ - 0.3, L.maxZ]]) bx(M.stone, x - 0.3, x + 0.3, 1.2, H, z0, z1);
    // the coffered ceiling with the skylight: a glowing disc in a gold ring, beams across
    bx(M.darkWood, L.minX - t, L.maxX + t, H, H + 0.2, L.minZ - t, L.maxZ + t);
    for (let x = L.minX + 3; x < L.maxX; x += 4.25) bx(M.wood, x - 0.15, x + 0.15, H - 0.45, H, L.minZ, L.maxZ);
    for (let z = L.minZ + 3; z < L.maxZ; z += 4.25) bx(M.wood, L.minX, L.maxX, H - 0.4, H - 0.05, z - 0.12, z + 0.12);
    const S = L.skylight;
    b.add(M.skylight, new THREE.CylinderGeometry(S.radius, S.radius, 0.06, 40).translate(S.x, y + H - 0.48, S.z)); b.add(M.gold, new THREE.TorusGeometry(S.radius + 0.1, 0.12, 6, 48).rotateX(Math.PI / 2).translate(S.x, y + H - 0.5, S.z));
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI; b.add(M.gold, new THREE.BoxGeometry(2 * S.radius, 0.06, 0.08).rotateY(a).translate(S.x, y + H - 0.52, S.z)); }
    // ---- the gallery: a slab along the north wall, its balustrade, shelves and the grand stair up to it
    bx(M.darkWood, Gl.minX, Gl.maxX, Gl.top - Gl.slab, Gl.top, Gl.minZ, Gl.maxZ); bx(M.floor, Gl.minX, Gl.maxX, Gl.top, Gl.top + 0.01, Gl.minZ, Gl.maxZ);
    bx(M.gold, Gl.minX, Gl.maxX, Gl.top - Gl.slab - 0.04, Gl.top - Gl.slab, Gl.minZ - 0.02, Gl.minZ + 0.04);
    const rail = (x0, x1) => { bx(M.darkWood, x0, x1, Gl.top + 0.95, Gl.top + 1.02, Gl.minZ - 0.04, Gl.minZ + 0.08); bx(M.gold, x0, x1, Gl.top + 1.02, Gl.top + 1.05, Gl.minZ - 0.02, Gl.minZ + 0.06); for (let x = x0 + 0.12; x < x1; x += mobile ? 0.6 : 0.3) bx(M.darkWood, x - 0.025, x + 0.025, Gl.top, Gl.top + 0.95, Gl.minZ, Gl.minZ + 0.05); };
    rail(L.minX, St.minX); rail(St.maxX, L.maxX);
    for (let x = L.minX + 3; x < L.maxX - 1; x += 6) b.cyl(M.stone, x, y + (Gl.top - Gl.slab) / 2, Gl.minZ + 0.25, 0.22, Gl.top - Gl.slab, 12); // columns under the gallery
    for (let k = 1; k <= St.steps; k++) { const z0 = St.z0 + (k - 1) * ((St.z1 - St.z0) / St.steps), z1 = z0 + (St.z1 - St.z0) / St.steps; bx(k % 2 ? M.wood : M.darkWood, St.minX, St.maxX, 0, k * St.rise, z0, z1); bx(M.purple, St.minX + 0.3, St.maxX - 0.3, k * St.rise, k * St.rise + 0.01, z0, z1); }
    for (const x of [St.maxX]) { // the stair's balustrade: a rising rail on posts
      const len = Math.hypot(St.z1 - St.z0, St.steps * St.rise), ang = Math.atan2(St.steps * St.rise, St.z1 - St.z0);
      b.add(M.gold, new THREE.BoxGeometry(0.06, 0.06, len).rotateX(-ang).translate(x - 0.03, y + St.steps * St.rise / 2 + 0.95, (St.z0 + St.z1) / 2));
      for (let k = 0; k <= St.steps; k += 3) { const z = St.z0 + k * ((St.z1 - St.z0) / St.steps); bx(M.darkWood, x - 0.06, x, k * St.rise, k * St.rise + 0.95, z - 0.03, z + 0.03); }
    }
    // ---- bookcases: spines on every wall run, ground floor and gallery
    // book spines on a case face: one material per repeat count, so a long case tiles instead of stretching
    const spineMats = new Map(), spinesFor = (pw, ph) => { const key = `${Math.max(1, Math.round(pw / 1.4))}x${Math.max(1, Math.round(ph / 1.4))}`; if (!spineMats.has(key)) { const m = M.spines.clone(); m.map = M.spines.map.clone(); m.map.repeat.set(...key.split('x').map(Number)); m.map.needsUpdate = true; spineMats.set(key, m); } return spineMats.get(key); };
    const spinePlane = (x, yy, z, pw, ph, rotY, name) => plane(spinesFor(pw, ph), x, yy, z, pw, ph, rotY, name);
    const caseRun = (x0, x1, z0, z1, y0, y1, faceZ, name) => { bx(M.darkWood, x0, x1, y0, y1, z0, z1); const fx = (x0 + x1) / 2, fz = faceZ > 0 ? z1 + 0.005 : faceZ < 0 ? z0 - 0.005 : (z0 + z1) / 2; const pw = x1 - x0 - 0.16, ph = y1 - y0 - 0.2;
      for (const s of faceZ ? [faceZ] : [1, -1]) spinePlane(fx, (y0 + y1) / 2, faceZ ? fz : fz + s * ((z1 - z0) / 2 + 0.005), pw, ph, s > 0 ? 0 : Math.PI, name); };
    caseRun(L.minX + 0.4, L.maxX - 0.4, L.maxZ - 0.7, L.maxZ - 0.05, 0, Gl.top - Gl.slab - 0.15, -1, 'library-shelves-north-low');
    caseRun(L.minX + 0.4, L.maxX - 0.4, L.maxZ - 0.7, L.maxZ - 0.05, Gl.top + 0.05, H - 0.6, -1, 'library-shelves-gallery');
    caseRun(L.minX + 0.4, L.fireplace.x - 3, L.minZ + 0.05, L.minZ + 0.7, 0, 6.2, 1, 'library-shelves-south');
    caseRun(L.fireplace.x + 3, T.minX - 0.3, L.minZ + 0.05, L.minZ + 0.7, 0, 6.2, 1, 'library-shelves-south-east');
    for (const [z0, z1] of [[L.minZ + 1.2, door0 - 0.8], [door1 + 0.8, St.z0 - 0.6]]) { bx(M.darkWood, L.minX + 0.05, L.minX + 0.7, 0, 3.8, z0, z1); spinePlane(L.minX + 0.705, 1.9, (z0 + z1) / 2, z1 - z0 - 0.16, 3.6, Math.PI / 2, 'library-shelves-west'); }
    for (const s of [-1, 1]) { const z0 = s < 0 ? T.maxZ + 0.6 : L.doorZ + 5, z1 = s < 0 ? L.doorZ - 5 : Gl.minZ - 0.6; bx(M.darkWood, L.maxX - 0.7, L.maxX - 0.05, 0, 3.8, z0, z1); spinePlane(L.maxX - 0.705, 1.9, (z0 + z1) / 2, z1 - z0 - 0.16, 3.6, -Math.PI / 2, 'library-shelves-east'); }
    // freestanding double-sided cases north and south of the reading tables
    caseRun(L.minX + 10, L.minX + 24, L.doorZ + 8.2, L.doorZ + 8.8, 0, 2.3, 0, 'library-stacks-north');
    caseRun(L.minX + 10, L.minX + 24, L.doorZ - 8.8, L.doorZ - 8.2, 0, 2.3, 0, 'library-stacks-south');
    // a rolling ladder on the tall south cases
    for (const s of [0, 0.5]) bx(M.gold, L.minX + 6 + s, L.minX + 6.05 + s, 0, 5.8, L.minZ + 0.95, L.minZ + 1.0);
    for (let k = 1; k < 18; k++) bx(M.gold, L.minX + 6, L.minX + 6.55, k * 0.32, k * 0.32 + 0.03, L.minZ + 0.95, L.minZ + 1.0);
    // ---- reading tables with green banker's lamps and chairs
    for (const tb of L.tables) {
      bx(M.wood, tb.x - tb.length / 2, tb.x + tb.length / 2, tb.height - 0.05, tb.height, tb.z - tb.width / 2, tb.z + tb.width / 2);
      bx(M.green, tb.x - tb.length / 2 + 0.2, tb.x + tb.length / 2 - 0.2, tb.height, tb.height + 0.005, tb.z - tb.width / 2 + 0.15, tb.z + tb.width / 2 - 0.15);
      for (const sx of [-1, 1]) bx(M.darkWood, tb.x + sx * (tb.length / 2 - 0.4) - 0.12, tb.x + sx * (tb.length / 2 - 0.4) + 0.12, 0, tb.height - 0.05, tb.z - tb.width / 2 + 0.1, tb.z + tb.width / 2 - 0.1);
      for (let i = 0; i < 4; i++) {
        const lx = tb.x - tb.length / 2 + 1.25 + i * ((tb.length - 2.5) / 3);
        b.cyl(M.gold, lx, y + tb.height + 0.2, tb.z, 0.02, 0.4, 6); b.add(M.lampGreen, new THREE.CylinderGeometry(0.1, 0.22, 0.14, 12, 1, true).translate(lx, y + tb.height + 0.42, tb.z)); b.cyl(M.gold, lx, y + tb.height + 0.01, tb.z, 0.09, 0.02, 10);
        if (!mobile) for (const sz of [-1, 1]) { const chz = tb.z + sz * (tb.width / 2 + 0.35); bx(M.wood, lx - 0.22, lx + 0.22, 0.44, 0.48, chz - 0.22, chz + 0.22); bx(M.leather, lx - 0.22, lx + 0.22, 0.48, 1.0, chz + sz * 0.2 - 0.03, chz + sz * 0.2 + 0.03); for (const ox of [-0.18, 0.18]) for (const oz of [-0.18, 0.18]) bx(M.darkWood, lx + ox - 0.02, lx + ox + 0.02, 0, 0.44, chz + oz - 0.02, chz + oz + 0.02); }
      }
    }
    // ---- the fireplace lounge: a stone surround with a fire, a mantel with the crest, armchairs and a sofa on a rug
    const FPc = L.fireplace;
    bx(M.stone, FPc.x - FPc.width / 2, FPc.x + FPc.width / 2, 0, 2.6, L.minZ, L.minZ + 0.7); bx(M.charcoal, FPc.x - 0.9, FPc.x + 0.9, 0.15, 1.15, L.minZ + 0.68, L.minZ + 0.72);
    bx(M.fire, FPc.x - 0.7, FPc.x + 0.7, 0.15, 0.75, L.minZ + 0.6, L.minZ + 0.7); bx(M.wood, FPc.x - FPc.width / 2 - 0.15, FPc.x + FPc.width / 2 + 0.15, 1.4, 1.52, L.minZ, L.minZ + 0.9);
    bx(M.stone, FPc.x - 1.2, FPc.x + 1.2, 2.6, 5.2, L.minZ, L.minZ + 0.5);
    bx(M.purple, FPc.x - 3, FPc.x + 3, 0, 0.012, L.minZ + 1.6, L.minZ + 6.2);
    for (const [ax, az, rot] of [[FPc.x - 2.1, L.minZ + 3.4, 1], [FPc.x + 2.1, L.minZ + 3.4, -1]]) { bx(M.leather, ax - 0.45, ax + 0.45, 0.2, 0.5, az - 0.45, az + 0.45); bx(M.leather, ax + rot * 0.38 - 0.08, ax + rot * 0.38 + 0.08, 0.5, 1.05, az - 0.45, az + 0.45); for (const s of [-1, 1]) bx(M.leather, ax - 0.45, ax + 0.45, 0.5, 0.72, az + s * 0.42 - 0.07, az + s * 0.42 + 0.07); }
    bx(M.leather, FPc.x - 1.3, FPc.x + 1.3, 0.2, 0.5, L.minZ + 5.2, L.minZ + 6.0); bx(M.leather, FPc.x - 1.3, FPc.x + 1.3, 0.5, 1.0, L.minZ + 5.85, L.minZ + 6.05); bx(M.wood, FPc.x - 0.7, FPc.x + 0.7, 0.36, 0.42, L.minZ + 3.0, L.minZ + 4.0);
    // ---- the Testing Room: glass walls on a wood base, a door gap, two exam desks with screens
    const glassWall = (x0, x1, z0, z1) => {
      bx(M.wood, x0, x1, 0, 0.9, z0, z1); bx(M.glass, x0, x1, 0.9, 3.0, z0, z1); bx(M.darkWood, x0, x1, 3.0, 3.2, z0, z1);
      const alongX = x1 - x0 > z1 - z0, len = alongX ? x1 - x0 : z1 - z0, n = Math.max(1, Math.round(len / 1.4)); // frames between the panes
      for (let k = 0; k <= n; k++) { const a = (alongX ? x0 : z0) + (len * k) / n; if (alongX) bx(M.darkWood, a - 0.04, a + 0.04, 0.9, 3.0, z0 - 0.01, z1 + 0.01); else bx(M.darkWood, x0 - 0.01, x1 + 0.01, 0.9, 3.0, a - 0.04, a + 0.04); }
      if (alongX) bx(M.gold, x0, x1, 1.95, 2.0, z0 - 0.015, z1 + 0.015); else bx(M.gold, x0 - 0.015, x1 + 0.015, 1.95, 2.0, z0, z1);
    };
    glassWall(T.minX, T.doorX0, T.maxZ - T.wall, T.maxZ); glassWall(T.doorX1, T.maxX, T.maxZ - T.wall, T.maxZ); glassWall(T.minX - T.wall, T.minX, T.minZ, T.maxZ);
    bx(M.darkWood, T.doorX0, T.doorX1, 2.6, 3.2, T.maxZ - T.wall, T.maxZ); bx(M.darkWood, T.minX, T.maxX, 3.2, 3.3, T.minZ, T.maxZ); // its ceiling
    // ---- stations: lecterns, desks, the media wall, the front desk; each glows
    for (const st of L.stations) {
      const sy = st.y - y;
      if (st.kind === 'book' || (st.kind === 'media' && st.id === 'ebook') || (st.kind === 'media' && st.id === 'intro-series')) {
        b.cyl(M.darkWood, st.x, y + sy + 0.5, st.z, 0.14, 1.0, 10, 0.1); b.cyl(M.darkWood, st.x, y + sy + 0.03, st.z, 0.4, 0.06, 14);
        // the reading slope tilts toward the reader (stand offset dx, dz)
        const dx = st.stand.x - st.x, dz = st.stand.z - st.z, tz = dx ? Math.sign(dx) * -0.35 : 0, tx = dz ? Math.sign(dz) * 0.35 : 0;
        b.add(M.wood, new THREE.BoxGeometry(0.62, 0.06, 0.48).rotateZ(tz).rotateX(tx).translate(st.x, y + sy + 1.08, st.z));
        b.add(M.glow, new THREE.BoxGeometry(0.42, 0.02, 0.32).rotateZ(tz).rotateX(tx).translate(st.x, y + sy + 1.12, st.z));
        b.add(M.glow, new THREE.TorusGeometry(0.75, 0.03, 4, 32).rotateX(Math.PI / 2).translate(st.x, y + sy + 0.015, st.z));
      } else if (st.kind === 'exam') {
        bx(M.wood, st.x - 0.75, st.x + 0.75, 0.72, 0.77, st.z - 0.4, st.z + 0.4); for (const sx of [-1, 1]) bx(M.darkWood, st.x + sx * 0.68 - 0.05, st.x + sx * 0.68 + 0.05, 0, 0.72, st.z - 0.35, st.z + 0.35);
        bx(M.charcoal, st.x - 0.4, st.x + 0.4, 0.8, 1.3, st.z - 0.3, st.z - 0.26); bx(M.screen, st.x - 0.36, st.x + 0.36, 0.84, 1.26, st.z - 0.26, st.z - 0.25);
        bx(M.wood, st.x - 0.25, st.x + 0.25, 0.44, 0.48, st.z + 0.7, st.z + 1.2); bx(M.leather, st.x - 0.25, st.x + 0.25, 0.48, 1.0, st.z + 1.15, st.z + 1.2);
        b.add(M.glow, new THREE.TorusGeometry(0.6, 0.03, 4, 32).rotateX(Math.PI / 2).translate(st.stand.x, y + 0.015, st.stand.z));
      } else if (st.kind === 'directory') {
        bx(M.darkWood, st.x - 1.4, st.x + 1.4, 0, 1.05, st.z - 0.45, st.z + 0.45); bx(M.wood, st.x - 1.5, st.x + 1.5, 1.05, 1.11, st.z - 0.52, st.z + 0.52); bx(M.gold, st.x - 1.4, st.x + 1.4, 0.95, 1.0, st.z + 0.455, st.z + 0.47);
        b.cyl(M.gold, st.x + 0.9, y + 1.3, st.z, 0.02, 0.4, 6); b.add(M.lampGreen, new THREE.CylinderGeometry(0.1, 0.2, 0.14, 12, 1, true).translate(st.x + 0.9, y + 1.5, st.z));
        b.add(M.glow, new THREE.TorusGeometry(0.6, 0.03, 4, 32).rotateX(Math.PI / 2).translate(st.stand.x, y + 0.015, st.stand.z));
      }
    }
    // the media wall: a big screen with the intro series, gold frame
    const screenArt = sign((ctx, cw, ch) => {
      const gr = ctx.createLinearGradient(0, 0, cw, ch); gr.addColorStop(0, '#2a0f52'); gr.addColorStop(1, '#0d2a1d'); ctx.fillStyle = gr; ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = '#f0d28a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 120px Barlow, sans-serif'; ctx.fillText('ACADEMY INTRO SERIES', cw / 2, ch * 0.3, cw * 0.9);
      ctx.beginPath(); ctx.arc(cw / 2, ch * 0.6, 90, 0, Math.PI * 2); ctx.fillStyle = 'rgba(240,210,138,.9)'; ctx.fill(); ctx.beginPath(); ctx.moveTo(cw / 2 - 30, ch * 0.6 - 48); ctx.lineTo(cw / 2 + 52, ch * 0.6); ctx.lineTo(cw / 2 - 30, ch * 0.6 + 48); ctx.closePath(); ctx.fillStyle = '#2a0f52'; ctx.fill();
      ctx.fillStyle = '#e7e0d0'; ctx.font = '500 52px Barlow, sans-serif'; ctx.fillText('NERDIE BLAQ ACADEMY  ·  WATCH ON YOUTUBE', cw / 2, ch * 0.88, cw * 0.9);
    }, { w: 1600, h: 900, preview: 0x2a0f52, day: 1.1, night: 1.1 });
    bx(M.gold, L.maxX - 0.12, L.maxX - 0.04, 1.3, 6.1, L.doorZ - 4.25, L.doorZ + 4.25);
    plane(screenArt, L.maxX - 0.125, 3.7, L.doorZ, 8.2, 4.6, -Math.PI / 2, 'library-media-wall');
    // signs: the crest over the door inside, section banners at the lecterns, the Testing Room, the gallery
    const crest = sign((ctx, cw, ch) => { ctx.fillStyle = hexCss(PALETTE.purple); ctx.fillRect(0, 0, cw, ch); ctx.beginPath(); ctx.arc(cw / 2, ch / 2, cw * 0.42, 0, Math.PI * 2); ctx.lineWidth = 16; ctx.strokeStyle = hexCss(PALETTE.gold); ctx.stroke(); ctx.fillStyle = '#f0d28a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 150px Barlow, sans-serif'; ctx.fillText('NB', cw / 2, ch * 0.47); ctx.font = '600 30px Barlow, sans-serif'; ctx.fillText('NERDIE BLAQ ACADEMY', cw / 2, ch * 0.72); }, { w: 512, h: 512, preview: PALETTE.purple });
    plane(crest, L.minX + 0.02, 5.4, L.doorZ, 2.4, 2.4, Math.PI / 2, 'library-crest');
    const banner = (title, sub, bg) => sign((ctx, cw, ch) => { ctx.fillStyle = hexCss(bg); ctx.fillRect(0, 0, cw, ch); ctx.fillStyle = hexCss(PALETTE.gold); ctx.fillRect(0, 0, cw, 14); ctx.fillRect(0, ch - 14, cw, 14); ctx.fillStyle = '#f0d28a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 64px Barlow, sans-serif'; ctx.fillText(title, cw / 2, ch * 0.38, cw * 0.9); ctx.font = '500 34px Barlow, sans-serif'; ctx.fillStyle = '#e7e0d0'; ctx.fillText(sub, cw / 2, ch * 0.7, cw * 0.9); }, { w: 768, h: 256, preview: bg });
    for (const st of L.stations.filter((s) => s.kind === 'book')) {
      const book = ACADEMY_BOOKS.find((x) => x.id === st.id), z = st.z + (st.z > L.doorZ ? 1.1 : -1.1);
      bx(M.gold, st.x - 0.02, st.x + 0.02, 0, 3.1, z - 0.02, z + 0.02);
      plane(banner(book.shelf.toUpperCase(), 'READ THE GUIDE · TAKE THE EXAM', book.cover), st.x - 0.03, 2.55, z, 1.6, 0.55, -Math.PI / 2, `library-banner-${st.id}`);
    }
    plane(banner('TESTING ROOM', 'PRACTICE EXAMS · FREE · NOTHING RECORDED', PALETTE.green), (T.doorX0 + T.doorX1) / 2 + 2.6, 3.6, T.maxZ + 0.01, 3.0, 1.0, 0, 'library-testing-sign');
    plane(banner('THE GALLERY', 'FROM 5K TO 1 MILLION · READING NOOK', PALETTE.purple), (St.minX + St.maxX) / 2 + 4.2, Gl.top - 0.95, Gl.minZ - 0.02, 3.2, 1.07, 0, 'library-gallery-sign');
    plane(banner('MEDIA WALL', 'ACADEMY INTRO SERIES', PALETTE.charcoal), L.maxX - 0.13, 6.75, L.doorZ, 3.0, 1.0, -Math.PI / 2, 'library-media-sign');
    // the gallery's reading nook: two armchairs by the ebook lectern
    const eb = L.stations.find((s) => s.id === 'ebook');
    for (const s of [-1, 1]) { const ax = eb.x + s * 2.0, az = eb.z + 0.6; bx(M.leather, ax - 0.42, ax + 0.42, Gl.top + 0.2, Gl.top + 0.5, az - 0.42, az + 0.42); bx(M.leather, ax - 0.42, ax + 0.42, Gl.top + 0.5, Gl.top + 1.0, az + 0.34, az + 0.48); }
    b.build(g, 'library-interior', { castShadow: false });
    // light: the skylight, two warm lamps (one on mobile), the fire
    const lights = mobile ? [[S.x, H - 1.2, S.z, 0xe8eeff, 60, 26], [L.fireplace.x, 1.4, L.minZ + 2, 0xffb070, 16, 9]] : [[S.x, H - 1.2, S.z, 0xe8eeff, 70, 26], [L.minX + 7, 3.4, L.doorZ, 0xffd6a0, 34, 16], [L.maxX - 6, 3.4, L.doorZ, 0xffd6a0, 30, 16], [L.fireplace.x, 1.4, L.minZ + 2, 0xffb070, 16, 9]];
    for (const [lx, ly, lz, c, i, r] of lights) { const light = new THREE.PointLight(c, i, r, 2); light.position.set(lx, y + ly, lz); light.name = 'library-light'; g.add(light); }
    this.addColliders();
  }

  addColliders() {
    const L = this.layout, y = L.y, H = L.height, t = 0.3, id = this.site.id, ac = this.addCollider, Gl = L.gallery, St = L.stair, T = L.testing;
    const cx = (L.minX + L.maxX) / 2, cz = (L.minZ + L.maxZ) / 2, w = L.maxX - L.minX, d = L.maxZ - L.minZ;
    const box = (x0, x1, y0, y1, z0, z1, extra = {}) => ac(x0, z0, x1, z1, y + y0, y + y1, { interior: id, ...extra });
    wallCollider(ac, cx, y - 0.05, cz, w + 0.6, 0.2, d + 0.6, { step: true, interior: id });
    wallCollider(ac, cx, y + H / 2, L.minZ - t / 2, w + 0.6, H, t, { interior: id }); wallCollider(ac, cx, y + H / 2, L.maxZ + t / 2, w + 0.6, H, t, { interior: id });
    wallCollider(ac, L.maxX + t / 2, y + H / 2, cz, t, H, d, { interior: id });
    const door0 = L.doorZ - L.doorWidth / 2, door1 = L.doorZ + L.doorWidth / 2;
    box(L.minX - t, L.minX, 0, H, L.minZ, door0); box(L.minX - t, L.minX, 0, H, door1, L.maxZ); box(L.minX - t, L.minX, 0, H, door0, door1, { door: `${id}-interior` });
    // the gallery floor (walkable from above), its balustrade, and the stair
    box(Gl.minX, Gl.maxX, Gl.top - Gl.slab, Gl.top, Gl.minZ, Gl.maxZ, { step: true, gallery: true });
    box(L.minX, St.minX, Gl.top, Gl.top + 1.05, Gl.minZ - 0.06, Gl.minZ + 0.1, { furniture: 'balustrade' }); box(St.maxX, L.maxX, Gl.top, Gl.top + 1.05, Gl.minZ - 0.06, Gl.minZ + 0.1, { furniture: 'balustrade' });
    for (let k = 1; k <= St.steps; k++) { const z0 = St.z0 + (k - 1) * ((St.z1 - St.z0) / St.steps), z1 = z0 + (St.z1 - St.z0) / St.steps; box(St.minX, St.maxX, 0, k * St.rise, z0, z1, { step: true, stair: k }); }
    box(St.maxX, St.maxX + 0.08, 0, St.steps * St.rise + 1.0, St.z0, St.z1, { furniture: 'stair-rail' });
    for (let x = L.minX + 3; x < L.maxX - 1; x += 6) box(x - 0.22, x + 0.22, 0, Gl.top - Gl.slab, Gl.minZ + 0.03, Gl.minZ + 0.47, { furniture: 'column' });
    // shelves, stacks, tables, fireplace, lounge, Testing Room walls and desks, stations, the gallery shelves
    box(L.minX + 0.4, L.maxX - 0.4, 0, Gl.top - Gl.slab, L.maxZ - 0.7, L.maxZ, { furniture: 'shelves' }); box(L.minX + 0.4, L.maxX - 0.4, Gl.top, H - 0.6, L.maxZ - 0.7, L.maxZ, { furniture: 'gallery-shelves' });
    box(L.minX + 0.4, T.minX - 0.3, 0, 6.2, L.minZ, L.minZ + 0.7, { furniture: 'shelves' });
    box(L.minX, L.minX + 0.7, 0, 3.8, L.minZ + 1.2, door0 - 0.8, { furniture: 'shelves' }); box(L.minX, L.minX + 0.7, 0, 3.8, door1 + 0.8, St.z0 - 0.6, { furniture: 'shelves' });
    box(L.maxX - 0.7, L.maxX, 0, 3.8, T.maxZ + 0.6, L.doorZ - 5, { furniture: 'shelves' }); box(L.maxX - 0.7, L.maxX, 0, 3.8, L.doorZ + 5, Gl.minZ - 0.6, { furniture: 'shelves' });
    box(L.minX + 10, L.minX + 24, 0, 2.3, L.doorZ + 8.2, L.doorZ + 8.8, { furniture: 'stacks' }); box(L.minX + 10, L.minX + 24, 0, 2.3, L.doorZ - 8.8, L.doorZ - 8.2, { furniture: 'stacks' });
    for (const tb of L.tables) box(tb.x - tb.length / 2, tb.x + tb.length / 2, 0, tb.height, tb.z - tb.width / 2 - 0.45, tb.z + tb.width / 2 + 0.45, { furniture: 'table' });
    const FPc = L.fireplace; box(FPc.x - FPc.width / 2, FPc.x + FPc.width / 2, 0, 2.6, L.minZ, L.minZ + 0.9, { furniture: 'fireplace' });
    for (const ax of [FPc.x - 2.1, FPc.x + 2.1]) box(ax - 0.45, ax + 0.45, 0, 1.05, L.minZ + 2.95, L.minZ + 3.85, { furniture: 'armchair' });
    box(FPc.x - 1.3, FPc.x + 1.3, 0, 1.0, L.minZ + 5.2, L.minZ + 6.05, { furniture: 'sofa' }); box(FPc.x - 0.7, FPc.x + 0.7, 0, 0.42, L.minZ + 3.0, L.minZ + 4.0, { furniture: 'coffee-table' });
    box(T.minX, T.doorX0, 0, 3.2, T.maxZ - T.wall, T.maxZ, { furniture: 'glass' }); box(T.doorX1, T.maxX, 0, 3.2, T.maxZ - T.wall, T.maxZ, { furniture: 'glass' }); box(T.minX - T.wall, T.minX, 0, 3.2, T.minZ, T.maxZ, { furniture: 'glass' });
    for (const st of L.stations) {
      const sy = st.y - y;
      if (st.kind === 'exam') box(st.x - 0.75, st.x + 0.75, 0, 0.77, st.z - 0.4, st.z + 0.4, { furniture: st.id });
      else if (st.kind === 'directory') box(st.x - 1.5, st.x + 1.5, 0, 1.11, st.z - 0.52, st.z + 0.52, { furniture: st.id });
      else box(st.x - 0.3, st.x + 0.3, sy, sy + 1.1, st.z - 0.3, st.z + 0.3, { furniture: st.id });
    }
    const eb = L.stations.find((s) => s.id === 'ebook');
    for (const s of [-1, 1]) box(eb.x + s * 2.0 - 0.42, eb.x + s * 2.0 + 0.42, Gl.top, Gl.top + 1.0, eb.z + 0.18, eb.z + 1.02, { furniture: 'armchair' });
  }

  // the station a reader is standing at (same floor, within reach of its stand point), or null
  stationAt(pos) {
    let best = null;
    for (const st of this.layout.stations) {
      if (Math.abs(pos.y - st.stand.y) > 0.9) continue;
      const dist = Math.hypot(pos.x - st.stand.x, pos.z - st.stand.z);
      if (dist <= STATION_REACH && (!best || dist < best.dist)) best = { st, dist };
    }
    return best?.st || null;
  }

  // { active, transitioned, prompt, name, mobileLabel, open: stationId | null }
  update(player, input, now = 0) {
    const interact = !!input.interact, tap = this.mobile ? 'TAP' : '[E]';
    const idle = (prompt = '', mobileLabel = '', open = null) => ({ active: this.active, transitioned: false, prompt, name: this.site.name, mobileLabel, open });
    if (!this.active) {
      if (!insideInteractionRange(player.pos, this.entry, 2.8)) return idle();
      if (!interact || !interactionCooldownReady(now, this.transitionReadyAt)) return idle(`ENTER THE ACADEMY LIBRARY · ${tap} ENTER`, 'ENTER LIBRARY');
      return this.#transition(player, now, true);
    }
    if (insideInteractionRange(player.pos, this.exit, 2.2)) {
      if (!interact || !interactionCooldownReady(now, this.transitionReadyAt)) return idle(`EXIT TO THE QUAD · ${tap} EXIT`, 'EXIT LIBRARY');
      return this.#transition(player, now, false);
    }
    const st = this.stationAt(player.pos);
    if (st) {
      const go = interact && interactionCooldownReady(now, this.actionReadyAt); if (go) this.actionReadyAt = now + 0.6;
      return idle(`${STATION_LABEL[st.id]} · ${tap} ${STATION_VERB[st.kind]}`, STATION_VERB[st.kind], go ? st.id : null);
    }
    return idle();
  }

  #transition(player, now, inside) {
    this.active = inside; this.interior.visible = inside;
    player.pos.copy(inside ? this.insideSpawn : this.outsideSpawn); player.vel.set(0, 0, 0); player.onGround = true;
    player.yaw = inside ? -Math.PI / 2 : Math.PI / 2; // facing into the reading room / back down the stairs toward the quad
    this.transitionReadyAt = now + TRANSITION_COOLDOWN; this.prompt = '';
    return { active: inside, transitioned: true, prompt: '', name: this.site.name, mobileLabel: '', open: null };
  }

  updateCameraVisibility() { return false; } // a 9.5 m reading room: the camera stays under its ceiling
}

export const LIBRARY_STATION_IDS = Object.freeze([...ACADEMY_BOOKS.map((b) => b.id), ...ACADEMY_MEDIA.map((m) => m.id), ...ACADEMY_EXAMS.map((e) => e.id), 'directory']);
export { LIBRARY };
