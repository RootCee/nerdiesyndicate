import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { KitBatch, facade, fbox, fpoint, windowUnit, waterTank, roofUnits, signMaterial, PALETTE } from './city-showcase-kit.js';
import { SHOWCASE_HEROES, SHOWCASE_BUSINESSES } from './city-showcase-layout.js';
import { STOREFRONT_BUSINESSES } from './city-pois.js';
import { GUN_SHOP_BUILDING_ID } from './gun-shop-layout.js';

// M7.0B1 North Market showcase buildings. Every design keeps its building's footprint, height,
// and collider (city-expansion adds the same box as before; the server registry is unchanged);
// pieces proud of a facade stay within a few centimetres of it below head height.
const hashId = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const rng = (seed) => { let s = seed || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909), (s >>>= 0) / 4294967296)); };
const hexCss = (h) => `#${h.toString(16).padStart(6, '0')}`;

// ---- signs (canvas art; drawn again once the game's fonts have loaded) ----
const PREVIEW = new Map();
function drawn(kit, draw, opts) {
  const mat = signMaterial(kit, draw, { preview: PREVIEW.get(draw), ...opts });
  if (typeof document !== 'undefined' && document.fonts?.ready) document.fonts.ready.then(() => mat.userData.repaint()).catch(() => {});
  return mat;
}
const SIGN_ART = {
  bank: (ctx, w, h) => {
    ctx.fillStyle = hexCss(PALETTE.green); ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = hexCss(PALETTE.gold); ctx.lineWidth = 6; ctx.strokeRect(14, 14, w - 28, h - 28); ctx.lineWidth = 2; ctx.strokeRect(26, 26, w - 52, h - 52);
    ctx.fillStyle = '#e8c97a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 118px Barlow, sans-serif';
    ctx.fillText('NERDIE CITY BANK', w / 2, h / 2 + 4);
  },
  emblem: (ctx, w, h) => { // the Nerdie Blaq "NB" banner
    ctx.fillStyle = hexCss(PALETTE.purple); ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = hexCss(PALETTE.gold); ctx.fillRect(0, 0, w, 18); ctx.fillRect(0, h - 18, w, 18);
    ctx.beginPath(); ctx.arc(w / 2, h * 0.42, w * 0.32, 0, Math.PI * 2); ctx.lineWidth = 10; ctx.strokeStyle = hexCss(PALETTE.gold); ctx.stroke();
    ctx.fillStyle = '#f0d28a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 120px Barlow, sans-serif'; ctx.fillText('NB', w / 2, h * 0.43);
    ctx.font = '500 34px Barlow, sans-serif'; ctx.fillText('NERDIE BLAQ', w / 2, h * 0.8);
  },
  threads: (ctx, w, h) => { // 3 Piece: three-piece suits
    ctx.fillStyle = hexCss(PALETTE.charcoal); ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = hexCss(PALETTE.gold); ctx.lineWidth = 4; ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = '#a35cff'; ctx.shadowBlur = 22; ctx.fillStyle = '#efe4ff'; ctx.font = '700 136px Barlow, sans-serif'; ctx.fillText('3 PIECE', w / 2, h * 0.43);
    ctx.shadowBlur = 0; ctx.fillStyle = hexCss(PALETTE.gold); ctx.font = '500 40px Barlow, sans-serif'; ctx.fillText('THREE-PIECE SUITS  ·  TAILORING', w / 2, h * 0.84);
  },
  threadsBlade: (ctx, w, h) => { // vertical "3 PIECE" with a suit-jacket mark
    ctx.fillStyle = hexCss(PALETTE.purple); ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d6b4ff'; ctx.lineWidth = 8; ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.fillStyle = '#f3e8ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 150px Barlow, sans-serif'; ctx.fillText('3', w / 2, 120);
    ctx.font = '600 82px Barlow, sans-serif'; [...'PIECE'].forEach((c, i) => ctx.fillText(c, w / 2, 250 + i * 86));
    ctx.fillStyle = hexCss(PALETTE.gold); ctx.beginPath(); ctx.moveTo(w / 2, h - 120); ctx.lineTo(w / 2 - 40, h - 70); ctx.lineTo(w / 2 + 40, h - 70); ctx.fill(); // lapel notch
  },
  marquee: (ctx, w, h) => {
    ctx.fillStyle = '#f4ead8'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = hexCss(PALETTE.charcoal); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '600 104px Barlow, sans-serif'; ctx.fillText('THE BLAQ NOTE', w / 2, h * 0.38);
    ctx.fillStyle = hexCss(PALETTE.purple); ctx.font = '500 52px Barlow, sans-serif'; ctx.fillText('LIVE MUSIC · MUSIC LOUNGE', w / 2, h * 0.78);
  },
  noteVertical: (ctx, w, h) => {
    ctx.fillStyle = hexCss(PALETTE.charcoal); ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = '#4dffa8'; ctx.shadowBlur = 24; ctx.fillStyle = '#dfffee'; ctx.font = '600 104px Barlow, sans-serif';
    [...'BLAQNOTE'].forEach((c, i) => ctx.fillText(c, w / 2, 76 + i * ((h - 130) / 7)));
  },
  northCourt: (ctx, w, h) => {
    ctx.fillStyle = hexCss(PALETTE.green); ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = hexCss(PALETTE.gold); ctx.fillRect(0, h - 14, w, 14);
    ctx.fillStyle = '#efd08a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 122px Barlow, sans-serif'; ctx.fillText('NORTH COURT', w / 2, h * 0.42);
    ctx.font = '500 40px Barlow, sans-serif'; ctx.fillStyle = '#d8c79c'; ctx.fillText('RESIDENCES · 112', w / 2, h * 0.82);
  },
  arms: (ctx, w, h) => {
    ctx.fillStyle = hexCss(PALETTE.charcoal); ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = hexCss(PALETTE.gold); ctx.lineWidth = 6; ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#efcf86'; ctx.font = '700 150px Barlow, sans-serif'; ctx.fillText('AMMO', w / 2, h * 0.42);
    ctx.shadowColor = '#a35cff'; ctx.shadowBlur = 18; ctx.fillStyle = '#e2ccff'; ctx.font = '600 44px Barlow, sans-serif'; ctx.fillText('GUNS  ·  AMMUNITION  ·  GEAR', w / 2, h * 0.82);
  },
  armsBlade: (ctx, w, h) => { // crosshair logo
    ctx.fillStyle = hexCss(PALETTE.green); ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = hexCss(PALETTE.gold); ctx.lineWidth = 10; ctx.strokeRect(12, 12, w - 24, h - 24);
    const cx = w / 2, cy = h * 0.4, r = w * 0.3; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - r * 1.3, cy); ctx.lineTo(cx + r * 1.3, cy); ctx.moveTo(cx, cy - r * 1.3); ctx.lineTo(cx, cy + r * 1.3); ctx.stroke();
    ctx.fillStyle = '#f0d28a'; ctx.textAlign = 'center'; ctx.font = '700 64px Barlow, sans-serif'; ctx.fillText('AMMO', cx, h * 0.84);
  },
  interiorArms: (ctx, w, h) => { // a lit wall of rifles behind the counter
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#6b5a44'); g.addColorStop(0.75, '#2a241d'); g.addColorStop(1, '#17140f'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,226,170,.6)'; for (let i = 0; i < 5; i++) ctx.fillRect(60 + i * 200, 14, 90, 8);
    ctx.fillStyle = '#4a3f33'; ctx.fillRect(0, 40, w, 150);
    for (let i = 0; i < 9; i++) { const x = 40 + i * 110, y = 70 + (i % 2) * 50; ctx.fillStyle = '#16161a'; ctx.fillRect(x, y, 90, 10); ctx.fillRect(x + 10, y + 10, 14, 18); ctx.fillStyle = '#6a4a2c'; ctx.fillRect(x - 18, y - 2, 22, 14); }
    ctx.fillStyle = hexCss(PALETTE.gold); ctx.fillRect(0, 210, w, 6); ctx.fillStyle = '#1d1a16'; ctx.fillRect(0, 216, w, h - 216);
  },
  poster: (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, hexCss(PALETTE.purple)); g.addColorStop(1, hexCss(PALETTE.green)); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = hexCss(PALETTE.gold); ctx.beginPath(); ctx.arc(w / 2, h * 0.36, w * 0.24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff4dc'; ctx.textAlign = 'center'; ctx.font = '600 58px Barlow, sans-serif'; ctx.fillText('FRIDAY', w / 2, h * 0.72); ctx.font = '500 34px Barlow, sans-serif'; ctx.fillText('THE BLAQ NOTE', w / 2, h * 0.84);
  },
  mural: (ctx, w, h) => { // street art on the side wall: bold shapes in the house colours, a tag
    ctx.fillStyle = '#2b2d33'; ctx.fillRect(0, 0, w, h);
    const r = rng(42);
    for (let i = 0; i < 9; i++) { ctx.fillStyle = [hexCss(PALETTE.purple), '#6a2fc0', hexCss(PALETTE.green), '#1f6b4a', hexCss(PALETTE.gold)][i % 5]; ctx.beginPath(); ctx.moveTo(r() * w, h); ctx.lineTo(r() * w, r() * h * 0.6); ctx.lineTo(r() * w, h); ctx.fill(); }
    ctx.strokeStyle = '#f2e7d0'; ctx.lineWidth = 10; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(w * (0.15 + i * 0.18), h * 0.3, 40 + i * 10, 0, Math.PI * 1.4); ctx.stroke(); }
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '120px Marker, Barlow, sans-serif';
    ctx.save(); ctx.translate(w / 2, h * 0.58); ctx.rotate(-0.06); ctx.lineWidth = 14; ctx.strokeStyle = hexCss(PALETTE.charcoal); ctx.strokeText('NERDIE CITY', 0, 0); ctx.fillText('NERDIE CITY', 0, 0); ctx.restore();
  },
  // painted shop interiors behind the glass: warm light, racks, silhouettes
  interiorThreads: (ctx, w, h) => { // 3 Piece: suits on mannequins, a tie wall, warm wood
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#6a5440'); g.addColorStop(0.7, '#33281f'); g.addColorStop(1, '#1d1712'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,230,190,.55)'; for (let i = 0; i < 6; i++) ctx.fillRect(40 + i * 160, 16, 70, 9);
    ctx.fillStyle = '#4a3a2c'; ctx.fillRect(0, 210, w, 8);
    for (let i = 0; i < 18; i++) { ctx.fillStyle = ['#6a2fc0', '#c19a49', '#123d2a', '#8a1d2c', '#2c3e6a'][i % 5]; ctx.fillRect(420 + i * 13, 60, 9, 60 + (i % 3) * 8); } // ties
    for (const [x, suit, vest] of [[130, '#22252c', '#3a3f4a'], [300, '#2c3e6a', '#c19a49'], [700, '#3a2a22', '#6a2fc0'], [880, '#17191d', '#123d2a']]) {
      ctx.fillStyle = '#d8cbb8'; ctx.beginPath(); ctx.ellipse(x, 72, 18, 22, 0, 0, Math.PI * 2); ctx.fill(); // mannequin head
      ctx.fillStyle = suit; ctx.beginPath(); ctx.moveTo(x - 46, 108); ctx.lineTo(x + 46, 108); ctx.lineTo(x + 52, 250); ctx.lineTo(x - 52, 250); ctx.fill(); // jacket
      ctx.fillStyle = vest; ctx.beginPath(); ctx.moveTo(x - 16, 108); ctx.lineTo(x + 16, 108); ctx.lineTo(x + 20, 210); ctx.lineTo(x - 20, 210); ctx.fill(); // waistcoat
      ctx.fillStyle = '#f2ece2'; ctx.beginPath(); ctx.moveTo(x - 7, 108); ctx.lineTo(x + 7, 108); ctx.lineTo(x, 150); ctx.fill(); // shirt
      ctx.fillStyle = suit; ctx.fillRect(x - 40, 250, 34, 60); ctx.fillRect(x + 6, 250, 34, 60); // trousers
    }
  },
  interiorLounge: (ctx, w, h) => {
    const g = ctx.createRadialGradient(w * 0.5, h * 0.35, 20, w * 0.5, h * 0.4, w * 0.6); g.addColorStop(0, '#7a4fb0'); g.addColorStop(0.5, '#2c1c40'); g.addColorStop(1, '#120d18'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,214,150,.8)'; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(80 + i * 140, 60, 9, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#0b0a0e'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(130 + i * 250, 230, 60, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(124 + i * 250, 230, 12, 60); }
  },
  interiorDiner: (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#f1dcb4'); g.addColorStop(1, '#8a5a3c'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 5; i++) { ctx.fillStyle = '#1f6b4a'; ctx.fillRect(40 + i * 200, 170, 150, 70); ctx.fillStyle = '#e9e1d2'; ctx.fillRect(60 + i * 200, 150, 110, 12); }
  },
};

for (const [k, c] of Object.entries({ arms: PALETTE.charcoal, armsBlade: PALETTE.green, interiorArms: 0x4a3d2e, bank: PALETTE.green, emblem: PALETTE.purple, threads: PALETTE.charcoal, threadsBlade: PALETTE.purple, marquee: 0xf4ead8, noteVertical: PALETTE.charcoal, northCourt: PALETTE.green, poster: 0x3a2a6a, mural: 0x5a3f8a, interiorThreads: 0x4a3c58, interiorLounge: 0x3a2850, interiorDiner: 0xc89a6a })) PREVIEW.set(SIGN_ART[k], c);

// Sign art made per business: a name board with an "opening soon" line, and a painted shop interior.
const SHOP_TINTS = [[PALETTE.green, '#efd08a'], [PALETTE.charcoal, '#f2e7cf'], [PALETTE.purple, '#f0d28a'], [0xf2e6cf, hexCss(PALETTE.green)]];
function storefrontSign(name, i) {
  const [bg, fg] = SHOP_TINTS[i % SHOP_TINTS.length];
  const draw = (ctx, w, h) => {
    ctx.fillStyle = hexCss(bg); ctx.fillRect(0, 0, w, h); ctx.strokeStyle = hexCss(PALETTE.gold); ctx.lineWidth = 6; ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 110px Barlow, sans-serif'; ctx.fillText(name.toUpperCase(), w / 2, h * 0.42);
    ctx.font = '500 38px Barlow, sans-serif'; ctx.fillText('OPENING SOON', w / 2, h * 0.82);
  };
  return [draw, bg];
}
function shopInterior(i) {
  const tints = ['#c9a77a', '#8fa7b8', '#b9a0c9', '#a9c29a'];
  const draw = (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, tints[i % 4]); g.addColorStop(1, '#2a241f'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,240,210,.6)'; for (let k = 0; k < 6; k++) ctx.fillRect(40 + k * 160, 16, 70, 8);
    for (let k = 0; k < 5; k++) { ctx.fillStyle = '#3a312a'; ctx.fillRect(60 + k * 190, 90, 150, 6); ctx.fillRect(60 + k * 190, 170, 150, 6); for (let j = 0; j < 7; j++) { ctx.fillStyle = ['#c19a49', '#123d2a', '#4b168c', '#d8d0c4', '#8a1d2c'][(j + k) % 5]; ctx.fillRect(66 + k * 190 + j * 20, 60 + (j % 2) * 4, 14, 30); ctx.fillRect(66 + k * 190 + j * 20, 140, 14, 30); } }
  };
  return [draw, 0x7a6a58];
}

// A sign plane on a facade, facing out of it.
function signPlane(parent, mat, f, a, y, out, w, h, name) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  const [x, z] = fpoint(f, a, out); mesh.position.set(x, y, z); mesh.rotation.y = Math.atan2(f.nx, f.nz); mesh.name = name;
  mesh.castShadow = false; mesh.receiveShadow = false; parent.add(mesh); return mesh;
}
// A projecting (blade) sign: two back-to-back planes facing along the street.
function bladeSign(parent, batch, kit, mat, f, a, y, out, w, h, name) {
  fbox(batch, kit.m.charcoal, f, a, y, out, 0.12, h + 0.12, w + 0.12);
  fbox(batch, kit.m.frame, f, a, y + h / 2 + 0.2, out - w / 2 + 0.1, 0.06, 0.06, w + 0.4);
  for (const s of [-1, 1]) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    const [x, z] = fpoint(f, a + s * 0.065, out); mesh.position.set(x, y, z);
    mesh.rotation.y = Math.atan2(f.ux * s, f.uz * s); mesh.name = `${name}-${s < 0 ? 'a' : 'b'}`; parent.add(mesh);
  }
}
// A sloped fabric awning hung from the facade.
function awning(batch, mat, f, a, y, across, out, drop = 0.45) {
  const len = Math.hypot(out, drop), g = new THREE.BoxGeometry(f.nx ? len : across, 0.05, f.nx ? across : len);
  const angle = Math.atan2(drop, out);
  if (f.nx) g.rotateZ(-f.nx * angle); else g.rotateX(f.nz * angle);
  const [x, z] = fpoint(f, a, out / 2); batch.add(mat, g.translate(x, y - drop / 2, z));
  fbox(batch, mat, f, a, y - drop - 0.12, out, across, 0.26, 0.04); // valance
}
// A half-round arch top over a window.
function arch(batch, mat, f, a, y, out, r, thick) {
  const g = new THREE.CylinderGeometry(r, r, thick, 14, 1, false, Math.PI / 2, Math.PI).rotateX(Math.PI / 2);
  if (f.nx) g.rotateY(Math.PI / 2);
  const [x, z] = fpoint(f, a, out); batch.add(mat, g.translate(x, y, z));
}
// A disc facing out of a facade (medallions, portholes).
function disc(batch, mat, f, a, y, out, r, thick) {
  const g = new THREE.CylinderGeometry(r, r, thick, 20).rotateX(Math.PI / 2); if (f.nx) g.rotateY(Math.PI / 2);
  const [x, z] = fpoint(f, a, out); batch.add(mat, g.translate(x, y, z));
}
const litGlass = (kit, r, share = 0.38) => (r() < share ? (r() < 0.75 ? kit.m.glassWarm : kit.m.glassCool) : kit.m.glass);
const interiorMaterial = (kit, key) => { const mat = drawn(kit, SIGN_ART[key], { w: 1024, h: 320, day: 0.32, night: 1.0 }); mat.roughness = 0.2; mat.metalness = 0.2; return mat; };

function parapet(batch, kit, b, mat, h = 0.6, t = 0.3) {
  const top = b.height;
  batch.box(mat, b.x, top + h / 2, b.z - b.depth / 2 + t / 2, b.width, h, t); batch.box(mat, b.x, top + h / 2, b.z + b.depth / 2 - t / 2, b.width, h, t);
  batch.box(mat, b.x - b.width / 2 + t / 2, top + h / 2, b.z, t, h, b.depth - 2 * t); batch.box(mat, b.x + b.width / 2 - t / 2, top + h / 2, b.z, t, h, b.depth - 2 * t);
  batch.box(kit.m.trim, b.x, top + h + 0.05, b.z - b.depth / 2 + t / 2, b.width + 0.1, 0.1, t + 0.1); batch.box(kit.m.trim, b.x, top + h + 0.05, b.z + b.depth / 2 - t / 2, b.width + 0.1, 0.1, t + 0.1);
  batch.box(kit.m.trim, b.x - b.width / 2 + t / 2, top + h + 0.05, b.z, t + 0.1, 0.1, b.depth); batch.box(kit.m.trim, b.x + b.width / 2 - t / 2, top + h + 0.05, b.z, t + 0.1, 0.1, b.depth);
  batch.box(kit.m.roof, b.x, top + 0.03, b.z, b.width - 2 * t, 0.06, b.depth - 2 * t);
}
const cornice = (batch, kit, b, y, mat = kit.m.trim, out = 0.3, h = 0.32) => { for (const side of ['north', 'south', 'east', 'west']) { const f = facade(b, side); fbox(batch, mat, f, 0, y, out / 2, f.length + out * 2, h, out); } };
const course = (batch, kit, b, y, mat = kit.m.trim) => { for (const side of ['north', 'south', 'east', 'west']) { const f = facade(b, side); fbox(batch, mat, f, 0, y, 0.05, f.length + 0.12, 0.14, 0.1); } };

// ---------------------------------------------------------------- the bank
function bank(batch, kit, b, parent) {
  const m = kit.m, f = facade(b, b.front);
  batch.box(m.stone, b.x, b.height / 2, b.z, b.width, b.height, b.depth);
  batch.box(m.concrete, b.x, 0.5, b.z, b.width + 0.24, 1.0, b.depth + 0.24);
  course(batch, kit, b, 1.02, m.gold);
  // engaged columns and the doors and windows between them
  for (const a of [-4.3, -1.5, 1.5, 4.3]) {
    fbox(batch, m.trim, f, a, 1.17, 0.05, 0.78, 0.3, 0.42);
    const [x, z] = fpoint(f, a, 0.1); batch.cyl(m.trim, x, 3.1, z, 0.32, 3.6, 16, 0.28);
    fbox(batch, m.trim, f, a, 5.07, 0.05, 0.82, 0.26, 0.42);
    fbox(batch, m.lamp, f, a, 1.36, 0.36, 0.3, 0.06, 0.14); // uplight at each column foot
  }
  // central doors: gold-framed glass, a transom above
  fbox(batch, m.glassWarm, f, 0, 1.0 + 1.55, 0.04, 2.3, 3.1, 0.04);
  fbox(batch, m.gold, f, 0, 2.55, 0.08, 0.08, 3.1, 0.06);
  for (const s of [-1, 1]) fbox(batch, m.gold, f, s * 1.18, 2.55, 0.08, 0.1, 3.2, 0.08);
  fbox(batch, m.gold, f, 0, 4.12, 0.08, 2.46, 0.1, 0.08); fbox(batch, m.glassWarm, f, 0, 4.5, 0.04, 2.3, 0.66, 0.04);
  for (const s of [-1, 1]) fbox(batch, m.gold, f, s * 0.25, 2.3, 0.14, 0.05, 0.5, 0.06);
  // tall windows in the side bays, gold mullions
  for (const s of [-1, 1]) {
    fbox(batch, m.glassWarm, f, s * 2.9, 3.0, 0.04, 1.6, 3.6, 0.04);
    for (const k of [-1, 0, 1]) fbox(batch, m.gold, f, s * 2.9 + k * 0.53, 3.0, 0.07, 0.05, 3.6, 0.05);
    fbox(batch, m.gold, f, s * 2.9, 3.9, 0.07, 1.6, 0.05, 0.05);
    fbox(batch, m.trim, f, s * 2.9, 4.95, 0.1, 1.9, 0.14, 0.2);
  }
  // pylons with the Nerdie Blaq banners
  const emblem = drawn(kit, SIGN_ART.emblem, { w: 256, h: 512, day: 0.1, night: 0.7 });
  for (const s of [-1, 1]) { fbox(batch, m.gold, f, s * 5.55, 4.95, 0.06, 1.16, 0.06, 0.1); signPlane(parent, emblem, f, s * 5.55, 3.8, 0.07, 1.05, 2.1, `showcase-bank-banner-${s < 0 ? 'l' : 'r'}`); }
  // entablature with the name, cornice, attic with the NB medallion, pediment
  fbox(batch, m.stone, f, 0, 5.85, 0.2, b.width + 0.2, 1.1, 0.4);
  for (const y of [5.28, 6.42]) fbox(batch, m.gold, f, 0, y, 0.41, b.width + 0.2, 0.05, 0.02);
  signPlane(parent, drawn(kit, SIGN_ART.bank, { w: 1024, h: 160, day: 0.12, night: 0.9 }), f, 0, 5.85, 0.415, 8.2, 1.28, 'showcase-bank-sign');
  cornice(batch, kit, b, 6.62, m.trim, 0.5, 0.3);
  disc(batch, m.purple, f, 0, 7.42, 0.04, 0.48, 0.06); disc(batch, m.gold, f, 0, 7.42, 0.03, 0.56, 0.04);
  fbox(batch, m.gold, f, 0, 7.42, 0.08, 0.36, 0.06, 0.02); fbox(batch, m.gold, f, 0, 7.42, 0.08, 0.06, 0.36, 0.02);
  parapet(batch, kit, b, m.stone, 0.42, 0.35);
  fbox(batch, m.stone, f, 0, b.height + 0.25, -0.2, 5.2, 0.5, 0.4); fbox(batch, m.stone, f, 0, b.height + 0.6, -0.2, 2.8, 0.3, 0.4); fbox(batch, m.gold, f, 0, b.height + 0.77, -0.2, 2.9, 0.04, 0.42);
  batch.box(m.glassCool, b.x, b.height + 0.35, b.z - 0.6, 3.4, 0.55, 2.2); batch.box(m.frame, b.x, b.height + 0.65, b.z - 0.6, 3.5, 0.06, 2.3);
  // arched windows on the other three sides
  for (const side of ['east', 'west', 'north', 'south']) {
    if (side === b.front) continue; const g = facade(b, side), n = side === 'east' || side === 'west' ? 3 : 4;
    for (let i = 0; i < n; i++) {
      const a = (i - (n - 1) / 2) * (g.length / n);
      windowUnit(batch, kit, g, a, 2.85, 1.25, 2.5, { glass: i % 2 ? m.glassWarm : m.glass, surround: m.trim });
      arch(batch, m.glass, g, a, 4.1, 0.03, 0.62, 0.04); arch(batch, m.trim, g, a, 4.1, 0.06, 0.78, 0.1);
    }
  }
}

// --------------------------------------------- 3 Piece (three-piece suits)
function threads(batch, kit, b, parent) {
  const m = kit.m, f = facade(b, b.front), half = f.length / 2;
  batch.box(m.darkBrick, b.x, b.height / 2, b.z, b.width, b.height, b.depth);
  batch.box(m.charcoal, b.x, 0.25, b.z, b.width + 0.16, 0.5, b.depth + 0.16);
  // full-width shopfront: steel frame, a painted interior behind the glass, centre doors
  for (const s of [-1, 1]) fbox(batch, m.charcoal, f, s * (half - 0.4), 1.75, 0.08, 0.8, 3.5, 0.16);
  const interior = interiorMaterial(kit, 'interiorThreads');
  signPlane(parent, interior, f, 0, 1.6, 0.03, 2 * half - 1.6, 2.5, 'showcase-three-piece-interior');
  for (let i = 0; i <= 6; i++) fbox(batch, m.frame, f, -half + 0.8 + i * ((2 * half - 1.6) / 6), 1.6, 0.06, 0.08, 2.6, 0.08);
  fbox(batch, m.frame, f, 0, 2.92, 0.06, 2 * half - 1.6, 0.1, 0.1); fbox(batch, m.charcoal, f, 0, 0.42, 0.06, 2 * half - 1.6, 0.36, 0.1);
  fbox(batch, m.glassWarm, f, 0, 3.3, 0.04, 2 * half - 1.6, 0.5, 0.04);
  fbox(batch, m.glass, f, 0, 1.25, 0.08, 1.9, 2.3, 0.04); fbox(batch, m.frame, f, 0, 1.25, 0.1, 0.06, 2.3, 0.05);
  for (const s of [-1, 1]) fbox(batch, m.neonPurple, f, s * 0.22, 1.2, 0.14, 0.04, 0.9, 0.04);
  // canopy with a purple neon edge, fascia with the wordmark
  fbox(batch, m.charcoal, f, 0, 3.66, 0.7, 2 * half - 1.0, 0.12, 1.4);
  fbox(batch, m.neonPurple, f, 0, 3.6, 1.41, 2 * half - 1.0, 0.06, 0.04);
  for (let i = -2; i <= 2; i++) fbox(batch, m.lamp, f, i * 2.3, 3.59, 0.9, 0.3, 0.02, 0.3);
  fbox(batch, m.charcoal, f, 0, 4.35, 0.08, 2 * half - 1.0, 1.0, 0.16);
  signPlane(parent, drawn(kit, SIGN_ART.threads, { w: 1024, h: 200, day: 0.2, night: 1.2 }), f, 0, 4.35, 0.17, 7.6, 0.95, 'showcase-three-piece-sign');
  // upper floor: industrial steel windows with forest-green surrounds
  for (const a of [-4.2, 0, 4.2]) {
    fbox(batch, m.glassWarm, f, a, 6.25, 0.03, 2.8, 2.0, 0.04);
    for (const k of [-1, 0, 1]) fbox(batch, m.frame, f, a + k * 0.93, 6.25, 0.06, 0.05, 2.0, 0.05);
    for (const k of [-1, 1]) fbox(batch, m.frame, f, a, 6.25 + k * 0.5, 0.06, 2.8, 0.05, 0.05);
    fbox(batch, m.green, f, a, 7.36, 0.1, 3.1, 0.18, 0.2); fbox(batch, m.green, f, a, 5.16, 0.12, 3.2, 0.14, 0.24);
  }
  cornice(batch, kit, b, b.height - 0.2, m.charcoal, 0.25, 0.3);
  for (const side of ['north', 'south', 'east', 'west']) { const g = facade(b, side); fbox(batch, m.gold, g, 0, b.height - 0.38, 0.27, g.length + 0.5, 0.04, 0.02); }
  parapet(batch, kit, b, m.darkBrick, 0.5, 0.3);
  // blade sign at the corner, mural on the open east wall, windows elsewhere
  bladeSign(parent, batch, kit, drawn(kit, SIGN_ART.threadsBlade, { w: 256, h: 760, day: 0.25, night: 1.35 }), f, half - 0.6, 6.0, 0.75, 0.9, 2.7, 'showcase-three-piece-blade');
  const east = facade(b, 'east');
  signPlane(parent, drawn(kit, SIGN_ART.mural, { w: 1024, h: 576, day: 0.0, night: 0.08 }), east, 0, 4.0, 0.02, 9.4, 5.3, 'showcase-mural');
  const r = rng(hashId(b.id));
  for (const side of ['west', 'north']) { const g = facade(b, side); for (let i = 0; i < 3; i++) windowUnit(batch, kit, g, (i - 1) * (g.length / 3), 6.1, 1.4, 1.8, { glass: litGlass(kit, r), surround: m.charcoal }); }
  waterTank(batch, kit, b.x + 3.2, b.height, b.z + 2.2, 1.0); roofUnits(batch, kit, b.x - 3, b.height, b.z + 1, 2, r);
}

// ------------------------------------------------- The Blaq Note (music lounge)
function lounge(batch, kit, b, parent) {
  const m = kit.m, f = facade(b, b.front), half = f.length / 2, base = 4.2;
  batch.box(m.tile, b.x, base / 2, b.z, b.width, base, b.depth);
  batch.box(m.stucco, b.x, base + (b.height - base) / 2, b.z, b.width, b.height - base, b.depth);
  course(batch, kit, b, base, m.gold);
  // gold art-deco fins up the facade, tall windows between them
  const r = rng(hashId(b.id));
  for (let i = 0; i <= 6; i++) { const a = -half + 1.3 + i * ((2 * half - 2.6) / 6); fbox(batch, m.gold, f, a, base + (b.height - base) / 2, 0.12, 0.18, b.height - base, 0.24); }
  for (let i = 0; i < 6; i++) {
    const a = -half + 1.3 + (i + 0.5) * ((2 * half - 2.6) / 6); if (Math.abs(a) < 1.2) continue;
    for (const y of [5.8, 8.2]) windowUnit(batch, kit, f, a, y, 1.0, 1.7, { glass: litGlass(kit, r, 0.5), surround: m.trim, mullion: false });
  }
  // marquee: letter board, bulb border, lit underside
  fbox(batch, m.charcoal, f, 0, 3.55, 0.9, 9.4, 0.85, 1.8);
  signPlane(parent, drawn(kit, SIGN_ART.marquee, { w: 1024, h: 180, day: 0.25, night: 1.15 }), f, 0, 3.55, 1.81, 8.9, 0.72, 'showcase-lounge-marquee');
  for (let i = 0; i < 24; i++) fbox(batch, m.lamp, f, -4.6 + i * 0.4, 3.08, 1.82, 0.09, 0.09, 0.05);
  fbox(batch, m.lamp, f, 0, 3.11, 0.9, 9.0, 0.02, 1.6);
  for (const s of [-1, 1]) fbox(batch, m.neonPurple, f, s * 4.72, 3.55, 1.82, 0.05, 0.86, 0.05);
  // vertical neon sign
  fbox(batch, m.charcoal, f, 0, 6.9, 0.2, 1.5, 4.6, 0.4);
  signPlane(parent, drawn(kit, SIGN_ART.noteVertical, { w: 220, h: 900, day: 0.25, night: 1.3 }), f, 0, 6.9, 0.41, 1.32, 4.4, 'showcase-lounge-vertical');
  for (const s of [-1, 1]) fbox(batch, m.neonGreen, f, s * 0.78, 6.9, 0.42, 0.05, 4.5, 0.04);
  // doors with portholes, poster frames, lounge windows
  fbox(batch, m.charcoal, f, 0, 1.3, 0.05, 2.4, 2.6, 0.06); fbox(batch, m.gold, f, 0, 1.3, 0.08, 0.05, 2.6, 0.04);
  fbox(batch, m.gold, f, 0, 2.66, 0.08, 2.6, 0.12, 0.1); for (const s of [-1, 1]) fbox(batch, m.gold, f, s * 1.26, 1.36, 0.08, 0.12, 2.72, 0.1);
  for (const s of [-1, 1]) { disc(batch, m.glassWarm, f, s * 0.6, 1.75, 0.09, 0.22, 0.03); disc(batch, m.gold, f, s * 0.6, 1.75, 0.085, 0.27, 0.03); }
  const poster = drawn(kit, SIGN_ART.poster, { w: 256, h: 360, day: 0.15, night: 0.8 });
  for (const s of [-1, 1]) { fbox(batch, m.gold, f, s * 2.6, 1.65, 0.05, 1.08, 1.48, 0.06); signPlane(parent, poster, f, s * 2.6, 1.65, 0.085, 0.96, 1.36, `showcase-lounge-poster-${s < 0 ? 'l' : 'r'}`); }
  const interior = interiorMaterial(kit, 'interiorLounge');
  for (const s of [-1, 1]) { signPlane(parent, interior, f, s * 5.4, 1.75, 0.03, 3.2, 2.3, `showcase-lounge-window-${s < 0 ? 'l' : 'r'}`); fbox(batch, m.gold, f, s * 5.4, 2.97, 0.06, 3.4, 0.1, 0.1); fbox(batch, m.gold, f, s * 5.4, 0.56, 0.08, 3.5, 0.12, 0.14); }
  // deco crown
  cornice(batch, kit, b, b.height - 0.22, m.trim, 0.25, 0.3);
  parapet(batch, kit, b, m.stucco, 0.4, 0.3);
  fbox(batch, m.stucco, f, 0, b.height + 0.3, -0.2, 6, 0.6, 0.4); fbox(batch, m.stucco, f, 0, b.height + 0.62, -0.2, 3.4, 0.4, 0.4); fbox(batch, m.gold, f, 0, b.height + 0.84, -0.2, 3.5, 0.05, 0.42);
  for (const side of ['east', 'west', 'north']) { const g = facade(b, side), n = Math.max(2, Math.floor(g.length / 3)); for (let i = 0; i < n; i++) windowUnit(batch, kit, g, (i - (n - 1) / 2) * (g.length / n), 6.6, 1.2, 1.7, { glass: litGlass(kit, r), surround: m.trim }); }
  roofUnits(batch, kit, b.x + 3, b.height, b.z + 2.5, 3, r);
}

// ------------------------------------------------- Ammo (gun and ammo shop)
function arms(batch, kit, b, parent) {
  const m = kit.m, f = facade(b, b.front), half = f.length / 2, base = 4.4;
  batch.box(m.darkBrick, b.x, b.height / 2, b.z, b.width, b.height, b.depth);
  batch.box(m.charcoal, b.x, 0.3, b.z, b.width + 0.16, 0.6, b.depth + 0.16);
  // steel-clad ground floor: pilasters, barred display windows showing the gun wall, the steel door
  fbox(batch, m.green, f, 0, base / 2, 0.05, f.length + 0.06, base, 0.1); // forest-green cladding
  for (const a of [-half + 0.35, -1.6, 1.6, half - 0.35]) { fbox(batch, m.charcoal, f, a, base / 2, 0.14, 0.5, base, 0.18); fbox(batch, m.gold, f, a, base - 0.1, 0.24, 0.54, 0.05, 0.02); }
  const interior = interiorMaterial(kit, 'interiorArms');
  for (const s of [-1, 1]) {
    const a = s * (half / 2 + 0.6), w = half - 2.6;
    signPlane(parent, interior, f, a, 1.75, 0.12, w, 2.1, `showcase-arms-window-${s < 0 ? 'l' : 'r'}`);
    for (let i = 0; i <= Math.round(w / 0.32); i++) fbox(batch, m.frame, f, a - w / 2 + i * (w / Math.round(w / 0.32)), 1.75, 0.16, 0.04, 2.1, 0.04); // security bars
    fbox(batch, m.gold, f, a, 2.86, 0.16, w + 0.12, 0.06, 0.06); fbox(batch, m.trim, f, a, 0.62, 0.18, w + 0.3, 0.12, 0.2);
    fbox(batch, m.charcoal, f, a, 3.25, 0.32, w + 0.3, 0.42, 0.42); // roll-down shutter housing
    for (let k = 0; k < 3; k++) fbox(batch, m.frame, f, a, 3.1 + k * 0.12, 0.54, w + 0.3, 0.02, 0.02);
  }
  fbox(batch, m.frame, f, 0, 1.25, 0.12, 2.0, 2.5, 0.08); fbox(batch, m.charcoal, f, 0, 1.2, 0.16, 1.6, 2.36, 0.06);
  fbox(batch, m.glassWarm, f, 0, 1.75, 0.2, 0.5, 0.35, 0.02); fbox(batch, m.gold, f, 0.55, 1.15, 0.2, 0.06, 0.4, 0.06);
  fbox(batch, m.neonGreen, f, -1.2, 2.1, 0.2, 0.12, 0.12, 0.05); // the door buzzer light
  // fascia sign with a purple neon underline, lamps over the door
  fbox(batch, m.charcoal, f, 0, base + 0.55, 0.16, f.length - 0.6, 1.1, 0.3);
  signPlane(parent, drawn(kit, SIGN_ART.arms, { w: 1024, h: 230, day: 0.22, night: 1.2 }), f, 0, base + 0.58, 0.32, Math.min(10, f.length - 1.4), 1.0, 'showcase-arms-sign');
  fbox(batch, m.neonPurple, f, 0, base + 0.02, 0.32, Math.min(10, f.length - 1.4), 0.05, 0.04);
  for (const s of [-1, 1]) { fbox(batch, m.frame, f, s * 0.75, 2.75, 0.3, 0.06, 0.06, 0.5); fbox(batch, m.lamp, f, s * 0.75, 2.68, 0.52, 0.22, 0.08, 0.22); }
  // upper floor: barred windows, a gold target emblem, a crosshair blade sign at the corner
  const r = rng(hashId(b.id));
  for (const a of [-half + 2.2, -half + 4.6, half - 4.6, half - 2.2]) {
    windowUnit(batch, kit, f, a, 6.3, 1.2, 1.6, { glass: litGlass(kit, r, 0.4), surround: m.charcoal, mullion: false });
    for (let i = -2; i <= 2; i++) fbox(batch, m.frame, f, a + i * 0.24, 6.3, 0.1, 0.03, 1.6, 0.03);
  }
  disc(batch, m.gold, f, 0, 6.35, 0.06, 0.95, 0.06); disc(batch, m.charcoal, f, 0, 6.35, 0.07, 0.75, 0.06); disc(batch, m.gold, f, 0, 6.35, 0.08, 0.5, 0.06); disc(batch, m.purple, f, 0, 6.35, 0.09, 0.22, 0.06);
  bladeSign(parent, batch, kit, drawn(kit, SIGN_ART.armsBlade, { w: 320, h: 420, day: 0.2, night: 1.1 }), f, half - 0.8, 6.2, 0.8, 1.1, 1.45, 'showcase-arms-blade');
  cornice(batch, kit, b, b.height - 0.22, m.charcoal, 0.28, 0.32);
  for (const side of ['north', 'south', 'east', 'west']) { const g = facade(b, side); fbox(batch, m.gold, g, 0, b.height - 0.4, 0.29, g.length + 0.56, 0.04, 0.02); }
  parapet(batch, kit, b, m.darkBrick, 0.5, 0.3);
  for (const side of ['north', 'south', 'east']) { const g = facade(b, side), n = Math.max(2, Math.floor(g.length / 3.2)); for (let i = 0; i < n; i++) { const a = (i - (n - 1) / 2) * (g.length / n); windowUnit(batch, kit, g, a, 6.2, 1.1, 1.4, { glass: litGlass(kit, r, 0.3), surround: m.charcoal, mullion: false }); for (let k = -1; k <= 1; k++) fbox(batch, m.frame, g, a + k * 0.3, 6.2, 0.1, 0.03, 1.4, 0.03); } }
  roofUnits(batch, kit, b.x + 2, b.height, b.z - 2, 2, r);
}

// ----------------------------------------------------- houses (east residential)
// A gable roof whose ridge runs along the front facade; `gable` triangles close its ends.
function gableRoof(batch, kit, b, roofMat, wallMat, rise, overhang = 0.45) {
  const alongX = !(b.front === 'east' || b.front === 'west'); // ridge direction
  const span = alongX ? b.depth : b.width, length = alongX ? b.width : b.depth, run = span / 2 + overhang, angle = Math.atan2(rise, run), slab = Math.hypot(run, rise);
  for (const s of [-1, 1]) {
    const g = alongX ? new THREE.BoxGeometry(length + 0.6, 0.14, slab).rotateX(s * angle) : new THREE.BoxGeometry(slab, 0.14, length + 0.6).rotateZ(-s * angle);
    batch.add(roofMat, g.translate(b.x + (alongX ? 0 : s * run / 2), b.height + rise / 2 - 0.02, b.z + (alongX ? s * run / 2 : 0)));
  }
  const tri = new THREE.Shape([new THREE.Vector2(-span / 2, 0), new THREE.Vector2(span / 2, 0), new THREE.Vector2(0, rise * (span / 2) / run)]);
  for (const s of [-1, 1]) {
    const g = new THREE.ShapeGeometry(tri);
    if (alongX) g.rotateY(s > 0 ? Math.PI / 2 : -Math.PI / 2); else if (s < 0) g.rotateY(Math.PI);
    batch.add(wallMat, g.translate(b.x + (alongX ? s * (b.width / 2 + 0.002) : 0), b.height, b.z + (alongX ? 0 : s * (b.depth / 2 + 0.002))));
  }
  batch.box(kit.m.trim, b.x, b.height + rise + 0.03, b.z, alongX ? length + 0.6 : 0.16, 0.1, alongX ? 0.16 : length + 0.6); // ridge cap
}
function house(batch, kit, b, parent, { mobile = false } = {}) {
  const m = kit.m, h = hashId(b.id), r = rng(h), f = facade(b, b.front), half = f.length / 2;
  const body = [m.houseSage, m.houseSand, m.houseSlate, m.houseBlush, m.creamBrick][h % 5], roofMat = h % 3 ? m.roofCharcoal : m.roofTerracotta;
  const accent = [m.green, m.purple, m.charcoal, m.green][(h >>> 3) % 4];
  batch.box(body, b.x, b.height / 2, b.z, b.width, b.height, b.depth);
  batch.box(m.concrete, b.x, 0.3, b.z, b.width + 0.16, 0.6, b.depth + 0.16);
  course(batch, kit, b, b.height * 0.48, m.trim);
  for (const side of ['north', 'south', 'east', 'west']) { const g = facade(b, side); fbox(batch, m.trim, g, 0, b.height - 0.12, 0.08, g.length + 0.16, 0.24, 0.16); }
  gableRoof(batch, kit, b, roofMat, body, 1.7);
  batch.box(m.brick, b.x + (r() - 0.5) * b.width * 0.4, b.height + 1.6, b.z + (r() - 0.5) * b.depth * 0.3, 0.8, 2.2, 0.8); // chimney
  const garage = b.driveway && !b.enterableHouseId && f.nx, doorAt = garage ? half - 1.25 : 0, lower = 1.35, upper = b.height * 0.48 + 1.55;
  // porch: a roof on two slim posts, a light; the enterable house's door comes from its interior system
  fbox(batch, m.trim, f, doorAt, 2.72, 0.55, 2.1, 0.12, 1.1); fbox(batch, roofMat, f, doorAt, 2.8, 0.55, 2.2, 0.06, 1.2);
  for (const s of [-1, 1]) fbox(batch, m.trim, f, doorAt + s * 0.95, 1.36, 0.42, 0.1, 2.72, 0.1);
  fbox(batch, m.lamp, f, doorAt + 0.75, 2.2, 0.06, 0.14, 0.22, 0.08);
  if (!b.enterableHouseId) { fbox(batch, m.trim, f, doorAt, 1.18, 0.05, 1.22, 2.36, 0.08); fbox(batch, accent, f, doorAt, 1.12, 0.09, 1.0, 2.22, 0.06); fbox(batch, m.glassWarm, f, doorAt, 1.75, 0.13, 0.4, 0.5, 0.02); fbox(batch, m.gold, f, doorAt + 0.36, 1.1, 0.13, 0.06, 0.06, 0.04); }
  if (garage) { fbox(batch, m.trim, f, -0.4, 1.3, 0.05, 3.0, 2.6, 0.08); fbox(batch, m.slats, f, -0.4, 1.2, 0.09, 2.7, 2.4, 0.05); fbox(batch, m.lamp, f, -0.4, 2.75, 0.08, 0.3, 0.06, 0.08); }
  const shutters = (g, a, y, w, wh) => { if (mobile) return; for (const s of [-1, 1]) fbox(batch, accent, g, a + s * (w / 2 + 0.28), y, 0.05, 0.36, wh + 0.1, 0.05); };
  // front windows: one beside the door downstairs (none beside a garage), two upstairs
  if (!garage) for (const s of [-1, 1]) { const a = doorAt + s * 2.4; if (Math.abs(a) < half - 0.6) { windowUnit(batch, kit, f, a, lower, 1.1, 1.3, { glass: litGlass(kit, r, 0.4), surround: m.trim, mullion: !mobile }); shutters(f, a, lower, 1.1, 1.3); } }
  for (const a of [-half / 2, half / 2]) { windowUnit(batch, kit, f, a, upper, 1.0, 1.2, { glass: litGlass(kit, r, 0.4), surround: m.trim, mullion: !mobile }); shutters(f, a, upper, 1.0, 1.2); }
  for (const side of ['north', 'south', 'east', 'west']) {
    if (side === b.front) continue; const g = facade(b, side), n = g.length > 10 ? 3 : 2;
    for (let i = 0; i < n; i++) { const a = (i - (n - 1) / 2) * (g.length / n); for (const y of [lower, upper]) windowUnit(batch, kit, g, a, y, 0.95, 1.15, { glass: litGlass(kit, r, 0.3), surround: m.trim, mullion: false, sill: !mobile }); }
  }
}

// ------------------------------------------------- warehouses (west industrial)
const warehouseSign = (n) => (ctx, w, h) => {
  ctx.fillStyle = '#3c4446'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#e8dfc8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 120px Barlow, sans-serif'; ctx.fillText(`WAREHOUSE ${n}`, w / 2, h * 0.45);
  ctx.fillStyle = hexCss(PALETTE.gold); ctx.fillRect(w * 0.2, h * 0.8, w * 0.6, 8);
};
function warehouse(batch, kit, b, parent) {
  const m = kit.m, r = rng(hashId(b.id)), f = facade(b, b.front), half = f.length / 2, base = 1.6;
  batch.box(m.brick, b.x, base / 2, b.z, b.width, base, b.depth);
  batch.box(m.metal, b.x, base + (b.height - base) / 2, b.z, b.width, b.height - base, b.depth);
  course(batch, kit, b, base, m.concrete);
  for (const side of ['north', 'south', 'east', 'west']) {
    const g = facade(b, side), n = Math.max(2, Math.round(g.length / 4.75));
    for (let i = 0; i <= n; i++) fbox(batch, m.charcoal, g, -g.length / 2 + i * (g.length / n), b.height / 2, 0.06, 0.3, b.height, 0.12); // structural ribs
    fbox(batch, m.glassCool, g, 0, 6.7, 0.03, g.length - 1.0, 0.8, 0.04); fbox(batch, m.frame, g, 0, 7.15, 0.06, g.length - 0.8, 0.08, 0.08); fbox(batch, m.frame, g, 0, 6.25, 0.06, g.length - 0.8, 0.08, 0.08);
    for (let i = 1; i < Math.round(g.length / 1.6); i++) fbox(batch, m.frame, g, -g.length / 2 + 0.5 + i * ((g.length - 1) / Math.round(g.length / 1.6)), 6.7, 0.06, 0.05, 0.8, 0.05);
  }
  // two roll-up loading doors with canopies and lamps, a personnel door between them
  for (const s of [-1, 1]) {
    const a = s * half / 2;
    fbox(batch, m.charcoal, f, a, 2.2, 0.08, 4.2, 4.4, 0.14); fbox(batch, m.slats, f, a, 2.05, 0.17, 3.8, 4.1, 0.04); // the door in front of its frame
    fbox(batch, m.charcoal, f, a, 4.75, 0.6, 4.6, 0.12, 1.2); fbox(batch, m.lamp, f, a, 4.67, 1.0, 0.4, 0.04, 0.2);
    fbox(batch, m.gold, f, a - 1.6, 0.6, 0.18, 0.12, 1.1, 0.12); // bump post on the door jamb
  }
  fbox(batch, m.frame, f, 0, 1.15, 0.06, 1.2, 2.3, 0.08); fbox(batch, m.charcoal, f, 0, 1.1, 0.1, 1.0, 2.2, 0.05); fbox(batch, m.green, f, 0, 2.55, 0.35, 1.5, 0.08, 0.7);
  const n = Number(b.id.match(/(\d+)$/)?.[1] ?? 1) - 3;
  signPlane(parent, drawn(kit, warehouseSign(n), { w: 1024, h: 200, res: 0.5, day: 0.12, night: 0.6, preview: 0x3c4446 }), f, 0, 5.35, 0.13, 6.2, 1.2, `showcase-${b.id}-sign`);
  parapet(batch, kit, b, m.metal, 0.5, 0.25);
  for (let i = 0; i < 4; i++) batch.cyl(m.frame, b.x + (i - 1.5) * b.width * 0.2, b.height + 0.5, b.z + (i % 2 ? 2 : -2), 0.35, 1.0, 10, 0.25);
  for (const s of [-1, 1]) batch.box(m.glassCool, b.x, b.height + 0.2, b.z + s * b.depth * 0.22, b.width * 0.6, 0.35, 1.2);
  void r;
}

// ----------------------------------------- the rest of North Market: mid-rise kit
function midrise(batch, kit, b, parent, { mobile = false } = {}) {
  const m = kit.m, r = rng(hashId(b.id));
  const body = [m.brick, m.stucco, m.creamBrick, m.brick, m.stuccoWarm, m.darkBrick][hashId(b.id) % 6];
  batch.box(body, b.x, b.height / 2, b.z, b.width, b.height, b.depth);
  batch.box(m.concrete, b.x, 0.45, b.z, b.width + 0.2, 0.9, b.depth + 0.2);
  const floors = Math.max(2, Math.floor((b.height - 0.6) / 3.1)), fh = (b.height - 0.6) / floors;
  for (let k = 1; k < floors; k++) course(batch, kit, b, k * fh, m.trim);
  const shop = b.kind === 'storefront';
  for (const side of ['north', 'south', 'east', 'west']) {
    const f = facade(b, side), front = side === b.front, bays = Math.max(1, Math.floor((f.length - 1.2) / 2.8)), span = (f.length - 1.2) / bays;
    for (let k = 0; k < floors; k++) {
      if (k === 0 && front && shop) continue;
      for (let i = 0; i < bays; i++) {
        const a = -f.length / 2 + 0.6 + span * (i + 0.5);
        if (k === 0 && front && i === Math.floor(bays / 2)) { // entrance with a canopy
          fbox(batch, m.frame, f, a, 1.2, 0.05, 1.5, 2.4, 0.06); fbox(batch, m.glass, f, a, 1.2, 0.08, 1.3, 2.2, 0.03); fbox(batch, m.trim, f, a, 2.55, 0.1, 1.9, 0.16, 0.2);
          if (r() < 0.5) awning(batch, r() < 0.5 ? m.fabricGreen : m.fabricPurple, f, a, 2.95, 2.2, 1.1, 0.4); else fbox(batch, m.charcoal, f, a, 2.9, 0.55, 2.2, 0.1, 1.1);
          fbox(batch, m.lamp, f, a, 2.83, 0.75, 0.25, 0.03, 0.25);
          continue;
        }
        windowUnit(batch, kit, f, a, k * fh + fh * 0.55, Math.min(1.5, span * 0.55), fh * 0.48, { glass: litGlass(kit, r), surround: body === m.brick ? m.trim : m.concrete, mullion: !mobile, sill: !mobile || front });
      }
    }
    if (front && shop) {
      const half = f.length / 2, business = STOREFRONT_BUSINESSES[b.id];
      const shopIndex = hashId(b.id) % 4, [interiorArt, interiorPreview] = shopInterior(shopIndex);
      const interior = drawn(kit, interiorArt, { w: 1024, h: 320, res: 0.5, day: 0.32, night: 1.0, preview: interiorPreview }); interior.roughness = 0.2; interior.metalness = 0.2;
      signPlane(parent, interior, f, 0, 1.55, 0.03, 2 * half - 1.4, 2.3, `showcase-${b.id}-interior`);
      for (let i = 0; i <= 4; i++) fbox(batch, m.frame, f, -half + 0.7 + i * ((2 * half - 1.4) / 4), 1.55, 0.06, 0.08, 2.4, 0.08);
      for (const s of [-1, 1]) fbox(batch, m.trim, f, s * (half - 0.35), 1.7, 0.08, 0.7, 3.4, 0.16);
      awning(batch, [m.fabricGreen, m.fabricPurple, m.charcoal][shopIndex % 3], f, 0, 3.15, 2 * half - 1.2, 1.4, 0.5);
      if (business) { const [art, preview] = storefrontSign(business.name, shopIndex); signPlane(parent, drawn(kit, art, { w: 1024, h: 200, res: 0.6, day: 0.2, night: 1.1, preview }), f, 0, 3.85, 0.06, Math.min(6.4, 2 * half - 1.6), 1.25, `showcase-${b.id}-sign`); }
    }
  }
  cornice(batch, kit, b, b.height - 0.25, m.trim, 0.3, 0.34);
  parapet(batch, kit, b, body, 0.55, 0.3);
  if (r() < 0.4) waterTank(batch, kit, b.x + (r() - 0.5) * b.width * 0.4, b.height, b.z + (r() - 0.5) * b.depth * 0.4, 0.95);
  roofUnits(batch, kit, b.x, b.height, b.z, 1 + Math.floor(r() * 2), r);
  if (r() < 0.5) batch.box(m.concrete, b.x - b.width * 0.25, b.height + 1.2, b.z + b.depth * 0.2, 2.6, 2.4, 2.6);
}

export const SHOWCASE_DESIGNS = Object.freeze({ [SHOWCASE_HEROES.bank]: bank, [SHOWCASE_HEROES.boutique]: threads, [SHOWCASE_HEROES.lounge]: lounge, [GUN_SHOP_BUILDING_ID]: arms });
export function showcaseBuilding(batch, kit, b, parent, opts = {}) { (SHOWCASE_DESIGNS[b.id] || (b.kind === 'house' ? house : b.kind === 'warehouse' ? warehouse : midrise))(batch, kit, b, parent, opts); }

// ------------------------------------------------------------- North Court
// The apartment's exterior. HybridApartmentSystem keeps its colliders, door, entry, and interior.
export function northCourtExterior(group, site, kit, { mobile = false } = {}) {
  // facades attach to the outer face of the walls, which are centred on the footprint edge (0.35 m thick)
  const m = kit.m, batch = new KitBatch(), b = { x: site.x, z: site.z, width: site.width + 0.35, depth: site.depth + 0.35, height: site.height, front: 'west' };
  const f = facade(b, 'west'), half = f.length / 2, frontX = site.x - site.width / 2, wall = 0.35, door = 2.2, wing = (site.depth - door) / 2, lower = 6.3;
  // the shell (same wall boxes as the colliders, the door opening kept): brick below, stucco above
  const shell = (mat, y0, y1) => {
    const h = y1 - y0, y = (y0 + y1) / 2;
    batch.box(mat, site.x, y, site.z - site.depth / 2, site.width, h, wall); batch.box(mat, site.x, y, site.z + site.depth / 2, site.width, h, wall);
    batch.box(mat, site.x + site.width / 2, y, site.z, wall, h, site.depth);
    if (y0 >= 2.7) batch.box(mat, frontX, y, site.z, wall, h, site.depth);
    else { batch.box(mat, frontX, y, site.z - door / 2 - wing / 2, wall, h, wing); batch.box(mat, frontX, y, site.z + door / 2 + wing / 2, wall, h, wing); batch.box(mat, frontX, (2.7 + y1) / 2, site.z, wall, y1 - 2.7, door); }
  };
  shell(m.brick, 0, lower); shell(m.stucco, lower, site.height);
  batch.box(m.concrete, site.x, 0.4, site.z, site.width + 0.2, 0.8, site.depth + 0.2);
  for (const y of [3.4, lower, 9.2, 12.1]) course(batch, kit, b, y, m.trim);
  const r = rng(hashId(site.id)), floorsY = [3.4, 6.3, 9.2, 12.1], fh = 2.9;
  // corner pilasters in charcoal
  for (const side of ['west', 'east']) { const g = facade(b, side); for (const s of [-1, 1]) fbox(batch, m.charcoal, g, s * (half - 0.25), site.height / 2, 0.06, 0.5, site.height, 0.12); }
  // entrance: canopy with a gold edge, lit fascia sign, sconces, the stair-core glass above
  fbox(batch, m.charcoal, f, 0, 3.0, 0.9, 3.8, 0.16, 1.8); fbox(batch, m.gold, f, 0, 3.0, 1.81, 3.8, 0.17, 0.03);
  fbox(batch, m.lamp, f, 0, 2.91, 0.9, 1.2, 0.02, 0.8);
  for (const s of [-1, 1]) { fbox(batch, m.gold, f, s * 1.55, 2.2, 0.12, 0.16, 0.42, 0.14); fbox(batch, m.lamp, f, s * 1.55, 2.2, 0.2, 0.1, 0.3, 0.02); }
  signPlane(group, drawn(kit, SIGN_ART.northCourt, { w: 1024, h: 220, day: 0.18, night: 1.1 }), f, 0, 3.62, 0.2, 3.6, 0.78, 'showcase-north-court-sign');
  fbox(batch, m.green, f, 0, 3.62, 0.1, 3.8, 0.9, 0.18);
  fbox(batch, m.glassCool, f, 0, 9.3, 0.04, 1.8, 10.4, 0.04);
  for (const y of floorsY.slice(1)) fbox(batch, m.frame, f, 0, y, 0.07, 1.9, 0.1, 0.08);
  fbox(batch, m.frame, f, -0.95, 9.3, 0.07, 0.1, 10.4, 0.08); fbox(batch, m.frame, f, 0.95, 9.3, 0.07, 0.1, 10.4, 0.08);
  fbox(batch, m.purple, f, 1.55, 9.4, 0.16, 0.62, 11.2, 0.32); fbox(batch, m.gold, f, 1.55, 15.05, 0.16, 0.7, 0.1, 0.36); fbox(batch, m.gold, f, 1.55, 3.85, 0.16, 0.7, 0.08, 0.36);
  // lobby windows, then two windows per side bay per floor; balconies from the second floor up
  for (const s of [-1, 1]) fbox(batch, m.glassWarm, f, s * 4.3, 1.55, 0.03, 3.4, 2.1, 0.04);
  for (const s of [-1, 1]) { fbox(batch, m.trim, f, s * 4.3, 2.72, 0.08, 3.8, 0.16, 0.16); fbox(batch, m.trim, f, s * 4.3, 0.44, 0.1, 3.9, 0.12, 0.2); for (const k of [-1, 0, 1]) fbox(batch, m.frame, f, s * 4.3 + k * 1.13, 1.55, 0.06, 0.06, 2.1, 0.05); }
  floorsY.forEach((y, k) => {
    for (const s of [-1, 1]) {
      const balcony = k >= 1;
      for (const a of [3.1, 5.3]) {
        if (balcony) { fbox(batch, litGlass(kit, r, 0.42), f, s * a, y + 1.12, 0.03, 1.1, 2.1, 0.04); fbox(batch, m.trim, f, s * a, y + 2.26, 0.07, 1.36, 0.16, 0.14); for (const e of [-1, 1]) fbox(batch, m.trim, f, s * a + e * 0.62, y + 1.12, 0.07, 0.12, 2.1, 0.14); }
        else windowUnit(batch, kit, f, s * a, y + 1.45, 1.2, 1.5, { glass: litGlass(kit, r, 0.42), surround: m.trim, mullion: !mobile });
      }
      if (balcony) {
        fbox(batch, m.concrete, f, s * 4.2, y + 0.02, 0.55, 3.9, 0.16, 1.1);
        fbox(batch, m.frame, f, s * 4.2, y + 1.02, 1.08, 3.9, 0.05, 0.05);
        for (const e of [-1, 1]) fbox(batch, m.frame, f, s * 4.2 + e * 1.93, y + 0.55, 0.55, 0.05, 1.0, 1.1);
        if (mobile) fbox(batch, m.glass, f, s * 4.2, y + 0.55, 1.08, 3.85, 0.9, 0.02);
        else for (let i = 0; i <= 8; i++) fbox(batch, m.frame, f, s * 4.2 - 1.9 + i * 0.475, y + 0.55, 1.08, 0.03, 0.95, 0.03);
        if (r() < 0.6) batch.blob(r() < 0.5 ? m.leaf : m.leafDark, ...(() => { const [x, z] = [f.cx + f.ux * (s * 4.2 + (r() - 0.5) * 2.4) + f.nx * 0.8, f.cz + f.uz * (s * 4.2) + f.nz * 0.8]; return [x, y + 0.45, z]; })(), 0.32, 0);
      }
    }
  });
  // the long sides and the back: windows on every floor
  for (const side of ['north', 'south', 'east']) {
    const g = facade(b, side), bays = side === 'east' ? 4 : 5, span = (g.length - 1.2) / bays;
    for (let i = 0; i < bays; i++) {
      const a = -g.length / 2 + 0.6 + span * (i + 0.5);
      windowUnit(batch, kit, g, a, 1.6, 1.4, 1.6, { glass: litGlass(kit, r, 0.3), surround: m.trim, mullion: !mobile });
      for (const y of floorsY) windowUnit(batch, kit, g, a, y + 1.45, 1.3, 1.5, { glass: litGlass(kit, r, 0.42), surround: m.trim, mullion: !mobile, sill: !mobile });
    }
  }
  // crown: cornice, parapet, water tank, condensers, stair bulkhead
  cornice(batch, kit, b, site.height - 0.25, m.trim, 0.32, 0.36);
  parapet(batch, kit, b, m.stucco, 0.6, 0.3);
  waterTank(batch, kit, site.x + 4.5, site.height, site.z - 3, 1.25);
  roofUnits(batch, kit, site.x + 2, site.height, site.z + 3.2, 3, r);
  batch.box(m.stucco, frontX + 2.4, site.height + 1.3, site.z, 3, 2.6, 3.2); batch.box(m.trim, frontX + 2.4, site.height + 2.65, site.z, 3.2, 0.12, 3.4);
  const meshes = batch.build(group, 'north-court-showcase');
  return { meshes, triangles: batch.triangles };
}
