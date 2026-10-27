import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { KitBatch, signMaterial, PALETTE } from './city-showcase-kit.js';
import {
  PARK, PATH_WIDTH, PARK_PATHS, CIVIC_PATHS, BASEBALL, COURTS, FOOTBALL, CHESS_PLAZA, CHESS_TABLES, PICNIC_TABLES, PARK_BENCHES, PARK_LAMPS,
  HOOPS, GOALPOSTS, CIVIC_FIXTURES, parkFixtures, parkTrees,
} from './city-park-layout.js';

// M7.1A Nerdie Central Park and the City Hall plaza: everything is drawn from city-park-layout.js
// and merged into one mesh per material per chunk, like the M7.0B kit. Heights: lawn under 0,
// turf 0.02, paths 0.035, court and field paint 0.045, so nothing fights for the same depth.
const hexCss = (h) => `#${h.toString(16).padStart(6, '0')}`;
const rnd = (seed) => { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909), (s >>>= 0) / 4294967296)); };

function texture(w, h, paint, tile) {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = paint(x, y), i = (y * w + x) * 4; data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255; }
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true; t.userData.tile = tile;
  return t;
}
export function parkMaterials(kit) {
  const std = (color, o = {}) => { const m = new THREE.MeshStandardMaterial({ color, roughness: o.roughness ?? 0.85, metalness: o.metalness ?? 0, map: o.map || null, transparent: !!o.opacity, opacity: o.opacity ?? 1, depthWrite: !o.opacity, side: o.side ?? THREE.FrontSide }); if (o.map) m.userData.tile = o.map.userData.tile; m.name = `park-${o.name}`; return m; };
  // mowed turf: alternating light and dark stripes, 4 m each
  const turf = texture(64, 64, (x) => { const k = x < 32 ? 10 : -6; return [72 + k, 122 + k * 1.4, 64 + k]; }, [8, 8]);
  const clay = texture(64, 64, (x, y) => { const n = ((x * 37 + y * 91) % 13) - 6; return [176 + n, 112 + n, 72 + n]; }, [2, 2]);
  const board = texture(64, 64, (x, y) => { if (x < 4 || y < 4 || x > 59 || y > 59) return [193, 154, 73]; const dark = (Math.floor((x - 4) / 7) + Math.floor((y - 4) / 7)) % 2; return dark ? [18, 61, 42] : [232, 222, 198]; }, [1, 1]);
  const P = {
    turf: std(0xffffff, { map: turf, name: 'turf', roughness: 1 }), clay: std(0xffffff, { map: clay, name: 'clay', roughness: 1 }),
    track: std(0x9a4e3e, { name: 'track', roughness: 0.95 }), paint: std(0xf3f0e8, { name: 'paint', roughness: 0.7 }),
    courtPurple: std(PALETTE.purple, { name: 'court', roughness: 0.6 }), courtGreen: std(PALETTE.green, { name: 'court-key', roughness: 0.6 }), courtGold: std(PALETTE.gold, { name: 'court-gold', roughness: 0.6 }),
    endPurple: std(0x5a2a99, { name: 'end-zone-purple', roughness: 0.9 }), endGreen: std(0x1d5a3e, { name: 'end-zone-green', roughness: 0.9 }),
    padding: std(0x1f4d36, { name: 'fence-padding', roughness: 0.8 }), yellow: std(0xe6c24a, { name: 'yellow', roughness: 0.5 }), orange: std(0xd9622b, { name: 'rim', roughness: 0.4, metalness: 0.4 }),
    backboard: std(0xf4f6f8, { name: 'backboard', roughness: 0.3 }), chainlink: std(0x9aa3a8, { name: 'chainlink', opacity: 0.32, metalness: 0.4, side: THREE.DoubleSide }),
    board: std(0xffffff, { map: board, name: 'chessboard', roughness: 0.4 }), stone: kit.m.trim, pieceLight: std(0xece4d2, { name: 'piece-light', roughness: 0.45 }), pieceDark: std(0x22242a, { name: 'piece-dark', roughness: 0.4, metalness: 0.2 }),
    water: std(0x3d7f9e, { name: 'water', roughness: 0.08, metalness: 0.5 }), flagPurple: std(PALETTE.purple, { name: 'flag-purple', roughness: 0.9, side: THREE.DoubleSide }), flagGreen: std(PALETTE.green, { name: 'flag-green', roughness: 0.9, side: THREE.DoubleSide }),
    // (the chessboard keeps its own 0..1 UVs, so each board shows the whole pattern)
    leafA: std(0x4f7d45, { name: 'leaf-a', roughness: 0.9 }), leafB: std(0x3a6338, { name: 'leaf-b', roughness: 0.9 }), leafC: std(0x5f8a3e, { name: 'leaf-c', roughness: 0.9 }),
  };
  delete P.board.userData.tile;
  return P;
}
const box = (b, mat, x0, x1, y0, y1, z0, z1) => b.box(mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0);
const strip = (b, mat, x0, x1, z0, z1, y = 0.045) => box(b, mat, x0, x1, y - 0.008, y, z0, z1);
// a flat ring (or arc) painted on the ground: centre, radius, line width, start angle, sweep
function ring(b, mat, x, z, r, w, start = 0, sweep = Math.PI * 2, y = 0.046) {
  const g = new THREE.RingGeometry(r - w / 2, r + w / 2, 40, 1, start, sweep).rotateX(-Math.PI / 2); b.add(mat, g.translate(x, y, z));
}
// a straight wall segment between two points (fence panels along an arc)
function segment(b, mat, x0, z0, x1, z1, y0, y1, thick) {
  const len = Math.hypot(x1 - x0, z1 - z0), g = new THREE.BoxGeometry(len, y1 - y0, thick).rotateY(-Math.atan2(z1 - z0, x1 - x0));
  b.add(mat, g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
}
export function tree(b, P, kit, x, z, r) {
  const s = 0.85 + r() * 0.45;
  b.cyl(kit.m.trunk, x, 1.5 * s, z, 0.16 * s, 3 * s, 7, 0.11 * s);
  const leaf = [P.leafA, P.leafB, P.leafC];
  b.blob(leaf[Math.floor(r() * 3)], x, 3.7 * s, z, 1.45 * s, 1);
  for (let i = 0; i < 3; i++) { const a = r() * Math.PI * 2; b.blob(leaf[Math.floor(r() * 3)], x + Math.cos(a) * 0.8 * s, (3.1 + r() * 1.3) * s, z + Math.sin(a) * 0.8 * s, (0.8 + r() * 0.35) * s, 0); }
}
function signPlane(parent, mat, x, y, z, w, h, rotY, name) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = rotY; m.name = name; parent.add(m); return m; }
function sign(kit, draw, preview, opts = {}) { return signMaterial(kit, draw, { preview, ...opts }); }

// ------------------------------------------------------------------------- park
export function buildPark(kit, group, { mobile = false } = {}) {
  const P = parkMaterials(kit), m = kit.m, b = new KitBatch(), r = rnd(7111);
  // turf over the whole block
  box(b, P.turf, PARK.minX, PARK.maxX, -0.02, 0.02, PARK.minZ, PARK.maxZ);
  // paths: the rubber jogging loop, paved walks
  for (const p of PARK_PATHS) {
    const mat = p.kind === 'jog' ? P.track : m.forecourt, h = PATH_WIDTH / 2;
    const [x0, x1, z0, z1] = p.axis === 'x' ? [p.c - h, p.c + h, p.a0 - (p.kind === 'jog' ? h : 0), p.a1 + (p.kind === 'jog' ? h : 0)] : [p.a0 - (p.kind === 'jog' ? h : 0), p.a1 + (p.kind === 'jog' ? h : 0), p.c - h, p.c + h];
    box(b, mat, x0, x1, 0.01, 0.035, z0, z1);
  }
  // ---- baseball: clay infield with a grass square, mound, bases, home plate, foul lines, fence, backstop
  const { home: H, bases: B, fence: F } = BASEBALL;
  box(b, P.clay, H.x - 2.5, H.x + B + 4.5, 0.02, 0.03, H.z - B - 4.5, H.z + 2.5);
  box(b, P.turf, H.x + 2.6, H.x + B - 2.6, 0.03, 0.036, H.z - B + 2.6, H.z - 2.6);
  const mound = { x: H.x + BASEBALL.mound / Math.SQRT2, z: H.z - BASEBALL.mound / Math.SQRT2 };
  b.add(P.clay, new THREE.CylinderGeometry(2.4, 2.7, 0.25, 20).translate(mound.x, 0.125, mound.z)); box(b, P.paint, mound.x - 0.3, mound.x + 0.3, 0.25, 0.27, mound.z - 0.08, mound.z + 0.08);
  for (const [x, z] of [[H.x + B, H.z], [H.x + B, H.z - B], [H.x, H.z - B]]) box(b, P.paint, x - 0.19, x + 0.19, 0.03, 0.1, z - 0.19, z + 0.19);
  box(b, P.paint, H.x - 0.22, H.x + 0.22, 0.03, 0.05, H.z - 0.22, H.z + 0.22);
  strip(b, P.paint, H.x, H.x + F, H.z - 0.05, H.z + 0.05); strip(b, P.paint, H.x - 0.05, H.x + 0.05, H.z - F, H.z);
  for (const [x, z] of [[H.x + F, H.z], [H.x, H.z - F]]) b.cyl(P.yellow, x, 4, z, 0.1, 8, 8); // foul poles
  // padded outfield fence along the arc, open at both foul lines so players can walk on
  const arc = [];
  for (let deg = 5; deg <= 85; deg += 2.5) { const a = deg * Math.PI / 180; arc.push([H.x + Math.cos(a) * F, H.z - Math.sin(a) * F]); }
  for (let i = 0; i + 1 < arc.length; i++) { segment(b, P.padding, ...arc[i], ...arc[i + 1], 0, 1.2, 0.25); segment(b, P.yellow, ...arc[i], ...arc[i + 1], 1.2, 1.28, 0.3); }
  // backstop: posts, rails, chain-link
  for (const s of BASEBALL.backstop) {
    const alongX = s.maxX - s.minX > s.maxZ - s.minZ, len = alongX ? s.maxX - s.minX : s.maxZ - s.minZ, n = Math.ceil(len / 3);
    for (let i = 0; i <= n; i++) { const t = i / n; b.cyl(m.frame, alongX ? s.minX + t * len : s.minX, 2, alongX ? s.minZ : s.minZ + t * len, 0.06, 4, 8); }
    for (const y of [0.05, 2, 3.95]) box(b, m.frame, s.minX, s.maxX, y - 0.04, y + 0.04, s.minZ, s.maxZ);
    box(b, P.chainlink, s.minX, s.maxX, 0, 4, s.minZ, s.maxZ);
  }
  for (const [x0, x1, z0, z1] of [[H.x + 6, H.x + 16, H.z + 2.4, H.z + 3.0], [H.x - 3.0, H.x - 2.4, H.z - 16, H.z - 6]]) { box(b, m.trunk, x0, x1, 0.42, 0.5, z0, z1); box(b, m.frame, x0, x1, 0, 0.42, z0 + (z1 - z0) * 0.4, z1 - (z1 - z0) * 0.4); }
  // scoreboard beyond centre field
  const sb = { x: H.x + (F + 5) / Math.SQRT2, z: H.z - (F + 5) / Math.SQRT2 };
  for (const s of [-1, 1]) b.cyl(m.frame, sb.x + s * 2.4 / Math.SQRT2, 2.5, sb.z + s * 2.4 / Math.SQRT2, 0.12, 5, 8);
  signPlane(group, sign(kit, (ctx, w, h) => { ctx.fillStyle = hexCss(PALETTE.green); ctx.fillRect(0, 0, w, h); ctx.strokeStyle = hexCss(PALETTE.gold); ctx.lineWidth = 10; ctx.strokeRect(8, 8, w - 16, h - 16); ctx.fillStyle = '#f0d28a'; ctx.textAlign = 'center'; ctx.font = '700 70px Barlow, sans-serif'; ctx.fillText('NERDIE CENTRAL PARK', w / 2, 90); ctx.font = '600 56px Barlow, sans-serif'; ctx.fillText('HOME  0      GUEST  0', w / 2, 190); }, PALETTE.green, { w: 768, h: 256, day: 0.25, night: 1.0 }), sb.x, 5.4, sb.z, 6, 2.2, -Math.PI / 4, 'park-scoreboard'); // facing home plate
  // ---- basketball: purple courts, green keys, gold centre circle, white lines, hoops
  for (const c of COURTS) {
    box(b, P.courtGreen, c.minX, c.maxX, 0.012, 0.04, c.minZ, c.maxZ);
    box(b, P.courtPurple, c.playMinX, c.playMaxX, 0.04, 0.044, c.playMinZ, c.playMaxZ);
    const cz = (c.minZ + c.maxZ) / 2, cx = (c.playMinX + c.playMaxX) / 2, w = 0.06;
    for (const s of [-1, 1]) { const x = s < 0 ? c.playMinX : c.playMaxX; box(b, P.courtGreen, s < 0 ? x : x - 5.8, s < 0 ? x + 5.8 : x, 0.044, 0.047, cz - 2.45, cz + 2.45); ring(b, P.paint, s < 0 ? x + 5.8 : x - 5.8, cz, 1.8, w, s < 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI, 0.049); ring(b, P.paint, s < 0 ? x + 1.6 : x - 1.6, cz, 6.75, w, s < 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI, 0.049); }
    strip(b, P.paint, c.playMinX, c.playMaxX, c.playMinZ, c.playMinZ + w, 0.049); strip(b, P.paint, c.playMinX, c.playMaxX, c.playMaxZ - w, c.playMaxZ, 0.049);
    strip(b, P.paint, c.playMinX, c.playMinX + w, c.playMinZ, c.playMaxZ, 0.049); strip(b, P.paint, c.playMaxX - w, c.playMaxX, c.playMinZ, c.playMaxZ, 0.049); strip(b, P.paint, cx - w / 2, cx + w / 2, c.playMinZ, c.playMaxZ, 0.049);
    ring(b, P.courtGold, cx, cz, 1.8, 0.3, 0, Math.PI * 2, 0.048);
  }
  for (const h of HOOPS) {
    const px = h.x - h.faceX * 1.2;
    b.cyl(m.frame, px, 1.95, h.z, 0.1, 3.9, 10); box(b, m.frame, Math.min(px, h.x - h.faceX * 0.1), Math.max(px, h.x - h.faceX * 0.1), 3.0, 3.1, h.z - 0.05, h.z + 0.05);
    box(b, P.backboard, h.x - h.faceX * 0.06 - 0.03, h.x - h.faceX * 0.06 + 0.03, 2.9, 3.95, h.z - 0.9, h.z + 0.9);
    box(b, P.courtPurple, h.x - h.faceX * 0.06 - 0.035 + h.faceX * 0.01, h.x - h.faceX * 0.06 + 0.035 + h.faceX * 0.01, 3.05, 3.5, h.z - 0.3, h.z + 0.3);
    b.add(P.orange, new THREE.TorusGeometry(0.23, 0.02, 6, 18).rotateX(Math.PI / 2).translate(h.x + h.faceX * 0.25, 3.05, h.z));
  }
  // ---- 7v7 football: yard lines every 5 yards, end zones in the house colours, goalposts
  const FB = FOOTBALL, fx = (FB.minX + FB.maxX) / 2;
  box(b, P.endPurple, FB.minX, FB.maxX, 0.02, 0.04, FB.maxZ - FB.endZone, FB.maxZ); box(b, P.endGreen, FB.minX, FB.maxX, 0.02, 0.04, FB.minZ, FB.minZ + FB.endZone);
  for (let z = FB.minZ + FB.endZone; z <= FB.maxZ - FB.endZone + 0.01; z += 4.572) strip(b, P.paint, FB.minX, FB.maxX, z - 0.06, z + 0.06);
  strip(b, P.paint, FB.minX, FB.minX + 0.1, FB.minZ, FB.maxZ); strip(b, P.paint, FB.maxX - 0.1, FB.maxX, FB.minZ, FB.maxZ);
  for (const [z, label, bg] of [[FB.maxZ - FB.endZone / 2, 'NERDIE', PALETTE.purple], [FB.minZ + FB.endZone / 2, 'CITY', PALETTE.green]]) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(FB.maxX - FB.minX - 3, 5), sign(kit, (ctx, w, h) => { ctx.clearRect(0, 0, w, h); ctx.fillStyle = hexCss(bg); ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#f3e9cf'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 180px Barlow, sans-serif'; ctx.fillText(label, w / 2, h / 2); }, bg, { w: 1024, h: 200, day: 0.05, night: 0.25 }));
    plane.rotation.x = -Math.PI / 2; plane.rotation.z = z > fx ? Math.PI : 0; plane.position.set(fx, 0.05, z); plane.name = `park-end-zone-${label.toLowerCase()}`; group.add(plane);
  }
  for (const g of GOALPOSTS) {
    b.cyl(P.yellow, g.x, 1.5, g.z + g.faceZ * -0.6, 0.12, 3.05, 10);
    box(b, P.yellow, g.x - 0.1, g.x + 0.1, 2.95, 3.05, g.z - g.faceZ * 0.6 - 0.1, g.z + 0.1);
    box(b, P.yellow, g.x - 2.85, g.x + 2.85, 3.0, 3.12, g.z - 0.06, g.z + 0.06);
    for (const s of [-1, 1]) b.cyl(P.yellow, g.x + s * 2.8, 4.55, g.z, 0.06, 3.1, 8);
  }
  // ---- chess plaza: pavers, gold border, eight tables set for a game, two stools each
  const CP = CHESS_PLAZA;
  box(b, m.forecourt, CP.minX, CP.maxX, 0.02, 0.04, CP.minZ, CP.maxZ);
  for (const [x0, x1, z0, z1] of [[CP.minX, CP.maxX, CP.minZ, CP.minZ + 0.2], [CP.minX, CP.maxX, CP.maxZ - 0.2, CP.maxZ], [CP.minX, CP.minX + 0.2, CP.minZ, CP.maxZ], [CP.maxX - 0.2, CP.maxX, CP.minZ, CP.maxZ]]) box(b, kit.m.gold, x0, x1, 0.04, 0.05, z0, z1);
  for (const t of CHESS_TABLES) {
    b.cyl(P.stone, t.x, 0.36, t.z, 0.16, 0.72, 10, 0.12); b.cyl(P.stone, t.x, 0.03, t.z, 0.32, 0.06, 12);
    box(b, P.stone, t.x - 0.48, t.x + 0.48, 0.7, 0.75, t.z - 0.48, t.z + 0.48); box(b, P.board, t.x - 0.4, t.x + 0.4, 0.75, 0.76, t.z - 0.4, t.z + 0.4);
    for (const s of t.seats) { b.cyl(P.stone, s.x, 0.22, s.z, 0.14, 0.44, 10, 0.11); b.cyl(P.stone, s.x, 0.45, s.z, 0.22, 0.04, 12); }
    if (!mobile) for (const [side, file0] of [[-1, 0], [1, 7]]) { // white plays from the -x seat: its pieces stand on the first two ranks there
      const mat = side < 0 ? P.pieceLight : P.pieceDark, rankX = (k) => t.x + side * (0.35 - k * 0.1);
      for (let f = 0; f < 8; f++) { const z = t.z - 0.35 + f * 0.1; b.cyl(mat, rankX(1), 0.79, z, 0.025, 0.05, 6, 0.018); b.cyl(mat, rankX(0), 0.8, z, 0.032, 0.08, 6, 0.024); if (f === 3 || f === 4) b.cyl(mat, rankX(0), 0.86, z, 0.012, 0.05, 6); }
      void file0;
    }
  }
  // picnic tables and benches
  for (const p of PICNIC_TABLES) { box(b, m.trunk, p.x - 0.9, p.x + 0.9, 0.72, 0.78, p.z - 0.4, p.z + 0.4); for (const s of [-1, 1]) { box(b, m.trunk, p.x - 0.9, p.x + 0.9, 0.42, 0.46, p.z + s * 0.72 - 0.14, p.z + s * 0.72 + 0.14); box(b, m.frame, p.x - 0.75, p.x - 0.68, 0, 0.74, p.z - 0.8, p.z + 0.8); box(b, m.frame, p.x + 0.68, p.x + 0.75, 0, 0.74, p.z - 0.8, p.z + 0.8); } }
  for (const s of PARK_BENCHES) {
    const L = 1.8, ax = s.alongZ;
    for (const k of [-1, 1]) box(b, m.frame, s.x + (ax ? -0.25 : k * 0.75) - 0.04, s.x + (ax ? 0.25 : k * 0.75) + 0.04, 0, 0.46, s.z + (ax ? k * 0.75 : -0.25) - 0.04, s.z + (ax ? k * 0.75 : 0.25) + 0.04);
    box(b, m.trunk, s.x - (ax ? 0.25 : L / 2), s.x + (ax ? 0.25 : L / 2), 0.44, 0.5, s.z - (ax ? L / 2 : 0.25), s.z + (ax ? L / 2 : 0.25));
  }
  // lamps: posts with emissive heads (they follow the city's night level through kit.m.lamp)
  for (const l of PARK_LAMPS) { b.cyl(m.frame, l.x, 2.1, l.z, 0.07, 4.2, 8, 0.05); b.cyl(m.charcoal, l.x, 4.25, l.z, 0.24, 0.12, 10); b.cyl(m.lamp, l.x, 4.1, l.z, 0.2, 0.18, 10); }
  // trees
  const tr = rnd(4242);
  for (const t of parkTrees()) if (t.x > PARK.minX - 1) tree(b, P, kit, t.x, t.z, tr);
  // entrance gates: the North Market entrance (facing west) and the promenade gate on North Cross (facing south)
  const gateSign = sign(kit, (ctx, w, h) => { ctx.fillStyle = hexCss(PALETTE.purple); ctx.fillRect(0, 0, w, h); ctx.strokeStyle = hexCss(PALETTE.gold); ctx.lineWidth = 10; ctx.strokeRect(8, 8, w - 16, h - 16); ctx.fillStyle = '#f0d28a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 104px Barlow, sans-serif'; ctx.fillText('NERDIE CENTRAL PARK', w / 2, h / 2 + 4); }, PALETTE.purple, { w: 1024, h: 160, day: 0.2, night: 1.0 });
  for (const g of [{ x: 120, z: 96, alongZ: true, rot: -Math.PI / 2 }, { x: 193.5, z: 56, alongZ: false, rot: Math.PI }]) {
    for (const s of [-1, 1]) { const px = g.x + (g.alongZ ? 0 : s * 3.2), pz = g.z + (g.alongZ ? s * 3.2 : 0); box(b, kit.m.stone, px - 0.45, px + 0.45, 0, 4.6, pz - 0.45, pz + 0.45); box(b, kit.m.gold, px - 0.5, px + 0.5, 4.6, 4.75, pz - 0.5, pz + 0.5); }
    box(b, m.charcoal, g.x - (g.alongZ ? 0.25 : 3.65), g.x + (g.alongZ ? 0.25 : 3.65), 3.9, 4.5, g.z - (g.alongZ ? 3.65 : 0.25), g.z + (g.alongZ ? 3.65 : 0.25));
    signPlane(group, gateSign, g.x + (g.alongZ ? -0.27 : 0), 4.2, g.z + (g.alongZ ? 0 : -0.27), 6.6, 0.55, g.rot, 'park-gate-sign');
  }
  const meshes = b.build(group, 'central-park', { castShadow: true });
  return { meshes, triangles: b.triangles };
}

// --------------------------------------------------------------- civic plaza
export function buildCivicPlaza(kit, group) {
  const P = parkMaterials(kit), m = kit.m, b = new KitBatch(), r = rnd(9001);
  const PL = CIVIC_FIXTURES.plaza;
  box(b, m.forecourt, PL.minX, PL.maxX, 0.02, 0.1, PL.minZ, PL.maxZ);
  for (const p of CIVIC_PATHS) { const h = PATH_WIDTH / 2; const [x0, x1, z0, z1] = p.axis === 'x' ? [p.c - h, p.c + h, p.a0, p.a1] : [p.a0, p.a1, p.c - h, p.c + h]; box(b, m.forecourt, x0, x1, 0.02, 0.1, z0, z1); }
  // fountain: a stone basin, water, a central column with a gold finial
  const F = CIVIC_FIXTURES.fountain;
  b.add(P.stone, new THREE.CylinderGeometry(F.radius, F.radius + 0.1, 0.7, 28).translate(F.x, 0.35, F.z));
  b.add(P.water, new THREE.CylinderGeometry(F.radius - 0.25, F.radius - 0.25, 0.04, 28).translate(F.x, 0.66, F.z));
  b.cyl(P.stone, F.x, 1.3, F.z, 0.35, 1.3, 12, 0.25); b.add(P.water, new THREE.CylinderGeometry(1.1, 0.9, 0.12, 20).translate(F.x, 1.95, F.z)); b.blob(kit.m.gold, F.x, 2.25, F.z, 0.22, 1);
  // flagpoles with the city's colours
  for (const [i, p] of CIVIC_FIXTURES.flagpoles.entries()) {
    b.cyl(m.frame, p.x, 4.5, p.z, 0.07, 9, 8, 0.05); b.blob(kit.m.gold, p.x, 9.05, p.z, 0.12, 0);
    const flag = new THREE.BoxGeometry(0.02, 1.2, 1.9).translate(p.x, 8.2, p.z + 1.0); b.add(i === 1 ? P.flagPurple : P.flagGreen, flag);
  }
  const tr = rnd(77);
  for (const t of parkTrees()) if (t.x < 0) tree(b, P, kit, t.x, t.z, tr);
  void r;
  const meshes = b.build(group, 'civic-plaza', { castShadow: true });
  return { meshes, triangles: b.triangles };
}

// Every park and plaza fixture blocks walking but not bullets (fence colliders), like the streetlights.
export function addParkColliders(addCollider) {
  const out = [];
  for (const f of parkFixtures()) out.push(addCollider(f.minX, f.minZ, f.maxX, f.maxZ, 0, f.height, { fence: true, park: f.id }));
  // the outfield fence, in short pieces along the arc (open at both foul lines)
  const { home: H, fence: F } = BASEBALL;
  for (let deg = 5; deg <= 85; deg += 1) { const a = deg * Math.PI / 180, x = H.x + Math.cos(a) * F, z = H.z - Math.sin(a) * F; out.push(addCollider(x - 0.3, z - 0.3, x + 0.3, z + 0.3, 0, 1.3, { fence: true, park: 'outfield-fence' })); }
  return out;
}
