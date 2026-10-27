import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { insideInteractionRange, interactionCooldownReady } from './city-layout.js';
import { addInteriorIsolationShell, wallCollider } from './apartment-system.js';
import { KitBatch, signMaterial, PALETTE } from './city-showcase-kit.js';
import { bankInterior, bankSpace } from './bank-layout.js';

// Phase 2.1 Nerdie City Bank interior: the city's financial headquarters. Like the other interiors it sits
// high above the city on render layer 1 with its own colliders, entered only by an explicit ENTER at the
// North Market door. Stations open the bank panel (bank-panel.js); figures come only from the City Service.
const TRANSITION_COOLDOWN = 0.65, STATION_REACH = 1.35;
const hexCss = (h) => `#${h.toString(16).padStart(6, '0')}`;
export const BANK_STATION_LABEL = Object.freeze({
  teller: 'TELLER', wallet: 'WALLET KIOSK', market: 'MARKET INTELLIGENCE', board: 'CITY ECONOMY BOARD', restricted: 'FOUNDER EXECUTIVE SUITE · RESTRICTED',
});
const STATION_VERB = Object.freeze({ teller: 'TALK', wallet: 'OPEN WALLET', market: 'VIEW', board: 'VIEW', restricted: 'INFO' });

function dataTexture(w, h, paint, repeat = [1, 1]) {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = paint(x, y), i = (y * w + x) * 4; data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255; }
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t;
}
// black marble with faint grey-violet veins, in tiles with a gold joint
function marbleTexture(gold = true) {
  const vein = (x, y) => Math.abs(Math.sin(x * 0.09 + Math.sin(y * 0.05) * 2.4) + Math.sin((x + y) * 0.031) * 0.6);
  return dataTexture(128, 128, (x, y) => {
    if (gold && (x < 1 || y < 1)) return [176, 138, 62];
    const v = vein(x, y), n = ((x * 13 + y * 7) % 5) - 2;
    return v < 0.08 ? [70, 64, 80] : v < 0.2 ? [34, 31, 40] : [14 + n, 13 + n, 18 + n];
  });
}

export class BankInteriorSystem {
  constructor(scene, site, { addCollider, mobile = false, kit = null, cityService = null } = {}) {
    this.scene = scene; this.site = site; this.addCollider = addCollider; this.mobile = mobile; this.kit = kit; this.cityService = cityService;
    this.active = false; this.transitionReadyAt = 0; this.actionReadyAt = 0; this.ticker = null; this.emblem = null; this.boardMat = null; this.boardStamp = '';
    this.layout = bankInterior(site); this.space = bankSpace(site, this.layout);
    this.exterior = new THREE.Group(); this.exterior.name = 'bank-exterior'; // the facade is the showcase design
    this.interior = new THREE.Group(); this.interior.name = 'bank-interior'; this.interior.visible = false;
    scene.add(this.interior);
    this.buildInterior();
    this.interior.traverse((o) => o.layers.set(1));
    const v = (p) => new THREE.Vector3(p.x, p.y, p.z);
    this.entry = v(this.space.entry); this.insideSpawn = v(this.space.inside); this.exit = v(this.space.exit); this.outsideSpawn = v(this.space.outside);
  }

  buildInterior() {
    const L = this.layout, y = L.y, H = L.height, g = this.interior, kit = this.kit || { night: [], mobile: this.mobile, m: null }, b = new KitBatch(), mobile = this.mobile;
    const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.r ?? 0.6, metalness: o.metal ?? 0, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 0, map: o.map || null, transparent: !!o.opacity, opacity: o.opacity ?? 1, depthWrite: !o.opacity });
    const M = {
      floor: std(0x8a8494, { map: marbleTexture(true), r: 0.42 }), marble: std(0xb0aab8, { map: marbleTexture(false), r: 0.38 }), // polished, but black: not a mirror of the sky
      metal: std(0x1d1e24, { r: 0.35, metal: 0.8 }), dark: std(0x0e0f13, { r: 0.5, metal: 0.4 }), gold: std(PALETTE.gold, { r: 0.25, metal: 0.85 }),
      purple: std(0x2a0d4f, { e: 0x8a3dff, ei: 1.6, r: 0.4 }), goldGlow: std(0x3a2a08, { e: 0xffc463, ei: 1.3 }), white: std(0xe8e2d4, { e: 0xfff3dc, ei: 0.9 }),
      glass: std(0xbfd3ea, { r: 0.05, metal: 0.2, opacity: 0.16 }), leather: std(0x1b1420, { r: 0.55 }), leaf: std(0x2f5a3a, { r: 0.9 }), screen: std(0x07080c, { e: 0x5b3cff, ei: 0.35, r: 0.2 }),
    };
    M.floor.map.repeat.set((L.maxX - L.minX) / 2, (L.maxZ - L.minZ) / 2); M.glass.name = 'bank-glass';
    const bx = (mat, x0, x1, y0, y1, z0, z1) => b.box(mat, (x0 + x1) / 2, y + (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0);
    const plane = (mat, x, yy, z, pw, ph, rotY, name) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), mat); m.position.set(x, y + yy, z); m.rotation.y = rotY; m.name = name; g.add(m); return m; };
    const sign = (draw, opts) => signMaterial(kit, draw, { day: 1.0, night: 1.0, ...opts });
    const cx = (L.minX + L.maxX) / 2, cz = (L.minZ + L.maxZ) / 2, w = L.maxX - L.minX, d = L.maxZ - L.minZ, t = 0.3;
    addInteriorIsolationShell(g, [cx, y + 6, cz], [w + 8, 16, d + 8], 'bank-isolation-shell');
    // ---- floor: black marble with gold joints, a gold-ringed purple medallion, a gold runner from the door
    bx(M.floor, L.minX, L.maxX, -0.16, 0, L.minZ, L.maxZ);
    const Md = L.medallion;
    b.add(M.purple, new THREE.CylinderGeometry(Md.radius, Md.radius, 0.012, 48).translate(Md.x, y + 0.006, Md.z));
    for (const r of [Md.radius, Md.radius * 0.72, Md.radius * 0.3]) b.add(M.gold, new THREE.TorusGeometry(r, 0.05, 4, 64).rotateX(Math.PI / 2).translate(Md.x, y + 0.014, Md.z));
    for (let i = 0; i < 8; i++) b.add(M.gold, new THREE.BoxGeometry(Md.radius * 2, 0.012, 0.05).rotateY((i / 8) * Math.PI).translate(Md.x, y + 0.012, Md.z));
    bx(M.gold, L.doorX - 1.1, L.doorX - 1.0, 0, 0.01, Md.z + Md.radius, L.maxZ - 0.4); bx(M.gold, L.doorX + 1.0, L.doorX + 1.1, 0, 0.01, Md.z + Md.radius, L.maxZ - 0.4);
    // ---- walls: marble below, dark metal panels with gold fins above, purple coves at the top; the door gap on the north wall
    const wall = (x0, x1, z0, z1) => { bx(M.marble, x0, x1, 0, 3.4, z0, z1); bx(M.metal, x0, x1, 3.4, H, z0, z1); };
    wall(L.minX - t, L.maxX + t, L.minZ - t, L.minZ); wall(L.minX - t, L.minX, L.minZ, L.maxZ); wall(L.maxX, L.maxX + t, L.minZ, L.maxZ);
    const d0 = L.doorX - L.doorWidth / 2, d1 = L.doorX + L.doorWidth / 2;
    wall(L.minX - t, d0, L.maxZ, L.maxZ + t); wall(d1, L.maxX + t, L.maxZ, L.maxZ + t); bx(M.metal, d0, d1, 4.0, H, L.maxZ, L.maxZ + t);
    for (const [x0, x1, z0, z1] of [[L.minX, L.maxX, L.minZ, L.minZ + 0.04], [L.minX, L.maxX, L.maxZ - 0.04, L.maxZ], [L.minX, L.minX + 0.04, L.minZ, L.maxZ], [L.maxX - 0.04, L.maxX, L.minZ, L.maxZ]]) {
      bx(M.gold, x0, x1, 3.36, 3.44, z0, z1); bx(M.purple, x0, x1, H - 0.5, H - 0.42, z0, z1);
    }
    const fins = mobile ? 3 : 1.5;
    for (let x = L.minX + 1.5; x < L.maxX - 1; x += fins) for (const [z0, z1] of [[L.minZ, L.minZ + 0.12], [L.maxZ - 0.12, L.maxZ]]) if (z0 < cz ? Math.abs(x - L.board.x) > L.board.width / 2 + 0.4 : Math.abs(x - L.doorX) > L.doorWidth / 2 + 0.6) bx(M.gold, x - 0.03, x + 0.03, 3.5, H - 0.6, z0, z1); // none behind the board or the door
    for (let z = L.minZ + 1.5; z < L.maxZ - 1; z += fins) for (const [x0, x1] of [[L.minX, L.minX + 0.12], [L.maxX - 0.12, L.maxX]]) bx(M.gold, x0, x1, 3.5, H - 0.6, z - 0.03, z + 0.03);
    // ---- ceiling: coffers with purple and gold light strips
    bx(M.dark, L.minX - t, L.maxX + t, H, H + 0.2, L.minZ - t, L.maxZ + t);
    for (let x = L.minX + 3; x < L.maxX; x += 3) bx(M.metal, x - 0.12, x + 0.12, H - 0.5, H, L.minZ, L.maxZ);
    for (let z = L.minZ + 3; z < L.maxZ; z += 3) bx(M.metal, L.minX, L.maxX, H - 0.45, H - 0.05, z - 0.1, z + 0.1);
    for (let x = L.minX + 6; x < L.maxX - 1; x += 6) bx(M.goldGlow, x - 0.05, x + 0.05, H - 0.52, H - 0.5, L.minZ + 1, L.maxZ - 1);
    // ---- the door (inside face): tall gold-framed doors under the brand wall
    bx(M.gold, d0 - 0.25, d0, 0, 4.2, L.maxZ - 0.12, L.maxZ); bx(M.gold, d1, d1 + 0.25, 0, 4.2, L.maxZ - 0.12, L.maxZ); bx(M.gold, d0 - 0.25, d1 + 0.25, 4.0, 4.25, L.maxZ - 0.12, L.maxZ);
    bx(M.dark, d0, d1, 0, 4.0, L.maxZ - 0.06, L.maxZ - 0.02); bx(M.gold, L.doorX - 0.04, L.doorX + 0.04, 0, 4.0, L.maxZ - 0.1, L.maxZ - 0.05);
    const brand = sign((ctx, cw, ch) => {
      ctx.fillStyle = '#07060a'; ctx.fillRect(0, 0, cw, ch); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = '#a35cff'; ctx.shadowBlur = 40; ctx.fillStyle = '#f2d28b'; ctx.font = '700 170px Barlow, sans-serif'; ctx.fillText('NERDIE CITY BANK', cw / 2, ch * 0.45, cw * 0.92);
      ctx.shadowBlur = 0; ctx.fillStyle = '#c8b3ff'; ctx.font = '500 56px Barlow, sans-serif'; ctx.fillText('THE FINANCIAL HEADQUARTERS OF NERDIE CITY', cw / 2, ch * 0.8, cw * 0.9);
    }, { w: 2048, h: 400, preview: 0x07060a, day: 1.3, night: 1.3 });
    plane(brand, L.doorX, 6.4, L.maxZ - 0.14, 12, 2.35, Math.PI, 'bank-brand-wall');
    // vestibule: glass screens either side of a 4 m opening
    const V = L.vestibule, gap = V.screenGap / 2;
    for (const [x0, x1] of [[L.minX + 3, L.doorX - gap], [L.doorX + gap, L.maxX - 6]]) { bx(M.dark, x0, x1, 0, 0.5, V.minZ - 0.06, V.minZ + 0.06); bx(M.glass, x0, x1, 0.5, 2.6, V.minZ - 0.03, V.minZ + 0.03); bx(M.gold, x0, x1, 2.6, 2.66, V.minZ - 0.05, V.minZ + 0.05); }
    // ---- columns: black marble shafts, gold base and capital, a glowing purple band
    for (const c of L.columns) {
      b.cyl(M.marble, c.x, y + H / 2, c.z, c.radius, H, 20, c.radius * 0.92);
      b.cyl(M.gold, c.x, y + 0.2, c.z, c.radius + 0.12, 0.4, 20); b.cyl(M.gold, c.x, y + H - 0.8, c.z, c.radius + 0.18, 0.5, 20, c.radius + 0.05);
      b.cyl(M.purple, c.x, y + 3.1, c.z, c.radius + 0.02, 0.1, 20);
    }
    // ---- teller hall: a marble counter with a gold edge, glass between windows, a screen and number at each; the vault door behind
    const C = L.counter;
    bx(M.marble, C.x - C.depth / 2, C.x + C.depth / 2, 0, C.height, C.z0, C.z1); bx(M.gold, C.x - C.depth / 2 - 0.06, C.x + C.depth / 2 + 0.06, C.height, C.height + 0.05, C.z0, C.z1);
    bx(M.purple, C.x - C.depth / 2 - 0.02, C.x - C.depth / 2, 0.08, 0.12, C.z0, C.z1);
    for (let z = C.z0; z <= C.z1 + 0.01; z += 4) { bx(M.glass, C.x - 0.03, C.x + 0.03, C.height + 0.05, 2.5, z - 0.02 + (z === C.z0 ? 0.02 : 0), z + 0.02); bx(M.gold, C.x - 0.05, C.x + 0.05, 2.5, 2.56, z - 0.04, z + 0.04); }
    bx(M.gold, C.x - 0.05, C.x + 0.05, 2.5, 2.56, C.z0, C.z1);
    for (const st of L.stations.filter((s) => s.kind === 'teller' || s.kind === 'wallet')) {
      if (st.kind === 'wallet') { bx(M.marble, C.x - 0.4, C.x + 0.4, 0, 1.0, st.z - 0.4, st.z + 0.4); bx(M.gold, C.x - 0.42, C.x + 0.42, 1.0, 1.03, st.z - 0.42, st.z + 0.42); } // the kiosk pedestal
      const top = st.kind === 'wallet' ? 1.03 : C.height + 0.05;
      bx(M.dark, C.x - 0.1, C.x + 0.1, top, top + 0.5, st.z - 0.4, st.z + 0.4); bx(M.screen, C.x - 0.11, C.x - 0.1, top + 0.05, top + 0.45, st.z - 0.35, st.z + 0.35);
      const label = st.kind === 'wallet' ? 'WALLET' : `TELLER ${st.id.slice(-1)}`;
      plane(sign((ctx, cw, ch) => { ctx.fillStyle = '#0b0a10'; ctx.fillRect(0, 0, cw, ch); ctx.strokeStyle = hexCss(PALETTE.gold); ctx.lineWidth = 6; ctx.strokeRect(6, 6, cw - 12, ch - 12); ctx.fillStyle = '#f2d28b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 64px Barlow, sans-serif'; ctx.fillText(label, cw / 2, ch / 2); }, { w: 512, h: 128, preview: 0x0b0a10 }), C.x - 0.06, 2.9, st.z, 1.2, 0.3, -Math.PI / 2, `bank-sign-${st.id}`);
      b.add(M.goldGlow, new THREE.TorusGeometry(0.55, 0.025, 4, 32).rotateX(Math.PI / 2).translate(st.stand.x, y + 0.015, st.stand.z));
    }
    const Vt = L.vault;
    b.add(M.gold, new THREE.CylinderGeometry(Vt.radius, Vt.radius, 0.3, 48).rotateZ(Math.PI / 2).translate(Vt.x - 0.18, y + Vt.radius + 0.4, Vt.z));
    b.add(M.dark, new THREE.CylinderGeometry(Vt.radius * 0.82, Vt.radius * 0.82, 0.32, 48).rotateZ(Math.PI / 2).translate(Vt.x - 0.2, y + Vt.radius + 0.4, Vt.z));
    b.add(M.purple, new THREE.TorusGeometry(Vt.radius * 0.9, 0.04, 6, 48).rotateY(Math.PI / 2).translate(Vt.x - 0.36, y + Vt.radius + 0.4, Vt.z));
    for (let i = 0; i < 6; i++) b.add(M.gold, new THREE.BoxGeometry(0.08, 0.08, Vt.radius * 1.5).rotateX((i / 6) * Math.PI).translate(Vt.x - 0.4, y + Vt.radius + 0.4, Vt.z));
    b.add(M.gold, new THREE.CylinderGeometry(0.28, 0.28, 0.14, 24).rotateZ(Math.PI / 2).translate(Vt.x - 0.46, y + Vt.radius + 0.4, Vt.z)); // the wheel hub
    // ---- Market Intelligence Center: four terminals facing the market wall
    for (const st of L.stations.filter((s) => s.kind === 'market')) {
      bx(M.dark, st.x - 0.45, st.x + 0.45, 0.72, 0.78, st.z - 0.8, st.z + 0.8); bx(M.metal, st.x - 0.1, st.x + 0.1, 0, 0.72, st.z - 0.2, st.z + 0.2); bx(M.gold, st.x - 0.46, st.x + 0.46, 0.78, 0.8, st.z - 0.81, st.z + 0.81);
      bx(M.dark, st.x - 0.42, st.x - 0.36, 0.85, 1.5, st.z - 0.7, st.z + 0.7); bx(M.screen, st.x - 0.36, st.x - 0.35, 0.9, 1.45, st.z - 0.65, st.z + 0.65);
      b.add(M.goldGlow, new THREE.TorusGeometry(0.5, 0.025, 4, 32).rotateX(Math.PI / 2).translate(st.stand.x, y + 0.015, st.stand.z));
    }
    this.marketWallMat = sign((ctx, cw, ch) => this.paintMarketWall(ctx, cw, ch), { w: 1600, h: 600, preview: 0x0a0814, day: 1.1, night: 1.1 });
    plane(this.marketWallMat, L.minX + 0.14, 4.6, (L.market.minZ + L.market.maxZ) / 2, 12, 4.5, Math.PI / 2, 'bank-market-wall');
    bx(M.gold, L.minX + 0.04, L.minX + 0.12, 2.3, 6.9, L.market.minZ + 1.9, L.market.maxZ - 1.9);
    plane(sign((ctx, cw, ch) => { ctx.fillStyle = '#0b0a10'; ctx.fillRect(0, 0, cw, ch); ctx.fillStyle = '#c8b3ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 72px Barlow, sans-serif'; ctx.fillText('MARKET INTELLIGENCE CENTER', cw / 2, ch / 2, cw * 0.94); }, { w: 1024, h: 140, preview: 0x0b0a10 }), L.market.maxX + 0.2, 7.4, (L.market.minZ + L.market.maxZ) / 2, 5, 0.7, Math.PI / 2, 'bank-market-sign');
    // ---- the City Economy Board above its dais
    const B = L.board, Ds = L.dais;
    bx(M.marble, Ds.minX, Ds.maxX, 0, Ds.height, Ds.minZ, Ds.maxZ); bx(M.gold, Ds.minX, Ds.maxX, Ds.height, Ds.height + 0.02, Ds.maxZ - 0.06, Ds.maxZ);
    bx(M.gold, B.x - B.width / 2 - 0.15, B.x + B.width / 2 + 0.15, B.bottom - 0.15, B.bottom + B.height + 0.15, L.minZ + 0.02, L.minZ + 0.1);
    this.boardMat = sign((ctx, cw, ch) => this.paintBoard(ctx, cw, ch), { w: 1536, h: 640, preview: 0x0a0814, day: 1.15, night: 1.15 });
    plane(this.boardMat, B.x, B.bottom + B.height / 2, L.minZ + 0.11, B.width, B.height, 0, 'bank-economy-board');
    // ---- the market ticker: a scrolling band around the hall
    const tickerTex = (() => { const m = sign((ctx, cw, ch) => this.paintTicker(ctx, cw, ch), { w: 2048, h: 64, preview: 0x05040a, day: 1.2, night: 1.2 }); m.map.wrapS = THREE.RepeatWrapping; return m; })();
    tickerTex.map.repeat.set(3, 1); this.ticker = tickerTex;
    const band = 8.3;
    for (const [x, z, len, rot] of [[cx, L.minZ + 0.16, w - 0.4, 0], [cx, L.maxZ - 0.16, w - 0.4, Math.PI], [L.minX + 0.16, cz, d - 0.4, Math.PI / 2], [L.maxX - 0.16, cz, d - 0.4, -Math.PI / 2]]) plane(tickerTex, x, band, z, len, 0.5, rot, 'bank-ticker');
    // ---- Founder Executive Suite: glass walls on dark frames, a locked gold door, an executive desk and dark screens
    const S = L.suite, sd0 = S.doorX - S.doorWidth / 2, sd1 = S.doorX + S.doorWidth / 2;
    const glassWall = (x0, x1, z0, z1) => { bx(M.dark, x0, x1, 0, 0.6, z0, z1); bx(M.glass, x0, x1, 0.6, 3.2, z0, z1); bx(M.metal, x0, x1, 3.2, 3.4, z0, z1); };
    glassWall(S.minX, sd0, S.maxZ - S.wall, S.maxZ); glassWall(sd1, S.maxX, S.maxZ - S.wall, S.maxZ); glassWall(S.maxX - S.wall, S.maxX, S.minZ, S.maxZ);
    bx(M.gold, sd0, sd1, 0, 3.0, S.maxZ - 0.12, S.maxZ - 0.06); bx(M.metal, sd0, sd1, 3.0, 3.4, S.maxZ - S.wall, S.maxZ); bx(M.dark, S.minX, S.maxX, 3.4, 3.5, S.minZ, S.maxZ);
    bx(M.dark, S.minX + 2.5, S.minX + 5.5, 0.72, 0.8, S.minZ + 2.2, S.minZ + 3.2); bx(M.gold, S.minX + 2.5, S.minX + 5.5, 0.8, 0.82, S.minZ + 2.2, S.minZ + 3.2);
    bx(M.leather, S.minX + 3.6, S.minX + 4.4, 0.45, 1.3, S.minZ + 1.2, S.minZ + 1.7);
    for (let i = 0; i < 3; i++) bx(M.screen, S.minX + 1.2 + i * 2.4, S.minX + 3.2 + i * 2.4, 1.4, 2.6, S.minZ + 0.06, S.minZ + 0.08);
    plane(sign((ctx, cw, ch) => { ctx.fillStyle = '#0b0a10'; ctx.fillRect(0, 0, cw, ch); ctx.strokeStyle = hexCss(PALETTE.gold); ctx.lineWidth = 8; ctx.strokeRect(8, 8, cw - 16, ch - 16); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f2d28b'; ctx.font = '700 60px Barlow, sans-serif'; ctx.fillText('FOUNDER EXECUTIVE SUITE', cw / 2, ch * 0.38, cw * 0.92); ctx.fillStyle = '#ff8a8a'; ctx.font = '600 40px Barlow, sans-serif'; ctx.fillText('RESTRICTED · SECURE SIGN-IN REQUIRED', cw / 2, ch * 0.72, cw * 0.9); }, { w: 1024, h: 220, preview: 0x0b0a10 }), S.doorX, 3.9, S.maxZ + 0.02, 3.6, 0.78, 0, 'bank-suite-sign');
    // ---- lobby furniture: marble benches, planters
    for (const bn of L.benches) { bx(M.marble, bn.x - 0.3, bn.x + 0.3, 0, 0.45, bn.z - bn.length / 2, bn.z + bn.length / 2); bx(M.gold, bn.x - 0.32, bn.x + 0.32, 0.45, 0.47, bn.z - bn.length / 2, bn.z + bn.length / 2); }
    for (const [px, pz] of [[L.minX + 1.2, L.maxZ - 1.2], [L.maxX - 1.2, L.maxZ - 1.2], [L.market.maxX + 1.2, L.minZ + 9], [C.x - 2.4, C.z0 - 1]]) { b.cyl(M.marble, px, y + 0.45, pz, 0.45, 0.9, 16, 0.5); b.blob(M.leaf, px, y + 1.4, pz, 0.7, 1); }
    b.build(g, 'bank-interior', { castShadow: false });
    // the NB emblem ring, turning slowly above the medallion (a mesh of its own so it can rotate)
    const ring = new THREE.Group(); ring.position.set(Md.x, y + 6.4, Md.z); ring.name = 'bank-emblem';
    for (const [r, mat, tilt] of [[2.0, M.gold, 0], [1.6, M.purple, Math.PI / 2], [1.25, M.goldGlow, Math.PI / 4]]) { const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 8, 64), mat); m.rotation.x = tilt; ring.add(m); }
    const nb = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), sign((ctx, cw, ch) => { ctx.clearRect(0, 0, cw, ch); ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(0, 0, cw, ch); ctx.fillStyle = '#f2d28b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 300px Barlow, sans-serif'; ctx.fillText('NB', cw / 2, ch / 2); }, { w: 512, h: 512, preview: PALETTE.gold }));
    nb.material.transparent = true; nb.material.side = THREE.DoubleSide; ring.add(nb); g.add(ring); this.emblem = ring;
    // light: a warm key over the lobby and a purple fill (one on mobile); emissive strips do the rest
    const lights = mobile ? [[cx, H - 1.5, cz, 0xffe2b8, 110, 34]] : [[cx, H - 1.5, cz + 4, 0xffe2b8, 105, 34], [cx, 5, L.minZ + 7, 0xb07cff, 55, 22]];
    for (const [lx, ly, lz, c, i, r] of lights) { const light = new THREE.PointLight(c, i, r, 2); light.position.set(lx, y + ly, lz); light.name = 'bank-light'; g.add(light); }
    this.addColliders();
  }

  // ---- displays: drawn from the City Service's public figures only; an honest "not connected" state otherwise
  economy() { return this.cityService?.economy?.() || { status: 'offline' }; }
  paintBoard(ctx, cw, ch) {
    const e = this.economy();
    const grad = ctx.createLinearGradient(0, 0, 0, ch); grad.addColorStop?.(0, '#0d0820'); grad.addColorStop?.(1, '#05040a'); ctx.fillStyle = grad; ctx.fillRect(0, 0, cw, ch);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#f2d28b'; ctx.font = '700 64px Barlow, sans-serif'; ctx.fillText('CITY ECONOMY BOARD', 48, 86);
    ctx.fillStyle = '#9b8fb8'; ctx.font = '500 30px Barlow, sans-serif';
    if (e.status !== 'ok') {
      ctx.fillText('Simulated NERDIE (sNERDIE) · figures come only from the bank ledger', 48, 132);
      ctx.fillStyle = '#e7e0f4'; ctx.font = '600 54px Barlow, sans-serif'; ctx.fillText('CITY SERVICE NOT CONNECTED IN THIS BUILD', 48, 300);
      ctx.fillStyle = '#b7a9db'; ctx.font = '400 34px Barlow, sans-serif'; ctx.fillText('Live treasury, wages, rent and savings appear here once the bank goes online.', 48, 360);
      ctx.fillText('No figures are shown until they are real.', 48, 410);
      return;
    }
    const s = e.stats, rows = [['sNERDIE ISSUED', s.issued], ['TREASURY', s.treasury], ['RESIDENTS', s.population], ['EMPLOYED', s.employed], ['WAGES PAID', s.wagesPaid], ['RENT COLLECTED', s.rentCollected],
      ['BUSINESSES', s.activeBusinesses], ['BUSINESS REVENUE', s.businessRevenue], ['CITY SPENDING', s.citySpending], ['SAVINGS', s.savings]];
    ctx.fillText(`Simulated NERDIE · updated ${new Date(e.asOf).toUTCString().slice(5, 22)} UTC · ${s.entries} ledger entries`, 48, 132);
    rows.forEach(([label, value], i) => { const col = i % 2, row = Math.floor(i / 2), x = 48 + col * 740, yy = 220 + row * 84;
      ctx.fillStyle = '#9b8fb8'; ctx.font = '600 30px Barlow, sans-serif'; ctx.fillText(label, x, yy); ctx.fillStyle = '#ffffff'; ctx.font = '700 44px Barlow, sans-serif'; ctx.textAlign = 'right'; ctx.fillText(String(value), x + 660, yy); ctx.textAlign = 'left'; });
  }
  paintTicker(ctx, cw, ch) {
    ctx.fillStyle = '#05040a'; ctx.fillRect(0, 0, cw, ch); ctx.fillStyle = '#c8b3ff'; ctx.font = '600 34px Barlow, sans-serif'; ctx.textBaseline = 'middle';
    const m = this.cityService?.market?.(), text = m?.status === 'ok' ? m.ticker : 'NERDIE CITY BANK  ·  MARKET INTELLIGENCE CENTER  ·  HISTORICAL TRADING SIGNALS LOAD WHEN THE CITY SERVICE CONNECTS  ·  SIMULATED NERDIE (sNERDIE) IS NOT WITHDRAWABLE  ·  ';
    ctx.fillText(text, 10, ch / 2);
  }
  paintMarketWall(ctx, cw, ch) {
    ctx.fillStyle = '#0a0814'; ctx.fillRect(0, 0, cw, ch); ctx.fillStyle = '#f2d28b'; ctx.font = '700 60px Barlow, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('MARKET INTELLIGENCE', 40, 80);
    const m = this.cityService?.market?.();
    ctx.fillStyle = '#b7a9db'; ctx.font = '400 32px Barlow, sans-serif';
    if (m?.status !== 'ok') { ctx.fillText('Trading signals, outcomes and bot performance from the Nerdie Blaq bots.', 40, 140); ctx.fillText('Historical archive: last recorded 5 June 2026. Not live.', 40, 190); ctx.fillText('Loads when the City Service connects.', 40, 240); return; }
    ctx.fillText(`Historical · last recorded ${m.lastRecorded}`, 40, 140);
    (m.lines || []).slice(0, 8).forEach((line, i) => ctx.fillText(line, 40, 210 + i * 46));
  }
  refreshDisplays() {
    const e = this.economy(), stamp = `${e.status}:${e.asOf || ''}`;
    if (stamp !== this.boardStamp) { this.boardStamp = stamp; this.boardMat?.userData.repaint?.(); this.marketWallMat?.userData.repaint?.(); this.ticker?.userData.repaint?.(); }
  }

  addColliders() {
    const L = this.layout, y = L.y, H = L.height, t = 0.3, id = this.site.id, ac = this.addCollider;
    const cx = (L.minX + L.maxX) / 2, cz = (L.minZ + L.maxZ) / 2, w = L.maxX - L.minX, d = L.maxZ - L.minZ;
    const box = (x0, x1, y0, y1, z0, z1, extra = {}) => ac(x0, z0, x1, z1, y + y0, y + y1, { interior: id, ...extra });
    wallCollider(ac, cx, y - 0.05, cz, w + 0.6, 0.2, d + 0.6, { step: true, interior: id });
    box(L.minX - t, L.maxX + t, 0, H, L.minZ - t, L.minZ); box(L.minX - t, L.minX, 0, H, L.minZ, L.maxZ); box(L.maxX, L.maxX + t, 0, H, L.minZ, L.maxZ);
    const d0 = L.doorX - L.doorWidth / 2, d1 = L.doorX + L.doorWidth / 2;
    box(L.minX - t, d0, 0, H, L.maxZ, L.maxZ + t); box(d1, L.maxX + t, 0, H, L.maxZ, L.maxZ + t); box(d0, d1, 0, H, L.maxZ, L.maxZ + t, { door: 'bank-interior' });
    const V = L.vestibule, gap = V.screenGap / 2;
    box(L.minX + 3, L.doorX - gap, 0, 2.66, V.minZ - 0.06, V.minZ + 0.06, { furniture: 'vestibule' }); box(L.doorX + gap, L.maxX - 6, 0, 2.66, V.minZ - 0.06, V.minZ + 0.06, { furniture: 'vestibule' });
    for (const c of L.columns) box(c.x - c.radius, c.x + c.radius, 0, H, c.z - c.radius, c.z + c.radius, { furniture: 'column' });
    const C = L.counter; box(C.x - C.depth / 2, C.x + C.depth / 2, 0, 2.5, C.z0, C.z1, { furniture: 'counter' });
    box(C.x - 0.1, L.maxX, 0, 1.1, C.z0 - 0.1, C.z0, { furniture: 'staff-gate' }); box(C.x - 0.1, L.maxX, 0, 1.1, C.z1, C.z1 + 0.1, { furniture: 'staff-gate' });
    const S = L.suite, sd0 = S.doorX - S.doorWidth / 2, sd1 = S.doorX + S.doorWidth / 2;
    box(S.minX, sd0, 0, 3.4, S.maxZ - S.wall, S.maxZ, { furniture: 'glass' }); box(sd1, S.maxX, 0, 3.4, S.maxZ - S.wall, S.maxZ, { furniture: 'glass' }); box(S.maxX - S.wall, S.maxX, 0, 3.4, S.minZ, S.maxZ, { furniture: 'glass' });
    box(sd0, sd1, 0, 3.4, S.maxZ - S.wall, S.maxZ, { door: 'executive-suite', locked: true });
    for (const st of L.stations.filter((s) => s.kind === 'market')) box(st.x - 0.46, st.x + 0.46, 0, 1.5, st.z - 0.81, st.z + 0.81, { furniture: st.id });
    for (const bn of L.benches) box(bn.x - 0.3, bn.x + 0.3, 0, 0.47, bn.z - bn.length / 2, bn.z + bn.length / 2, { furniture: 'bench' });
    for (const [px, pz] of [[L.minX + 1.2, L.maxZ - 1.2], [L.maxX - 1.2, L.maxZ - 1.2], [L.market.maxX + 1.2, L.minZ + 9], [C.x - 2.4, C.z0 - 1]]) box(px - 0.5, px + 0.5, 0, 0.9, pz - 0.5, pz + 0.5, { furniture: 'planter' });
    const Ds = L.dais; box(Ds.minX, Ds.maxX, 0, Ds.height, Ds.minZ, Ds.maxZ, { step: true, furniture: 'dais' });
    const k = L.stations.find((s) => s.kind === 'wallet'); box(k.x - 0.42, k.x + 0.42, 0, 1.5, k.z - 0.42, k.z + 0.42, { furniture: 'wallet-kiosk' });
  }

  stationAt(pos) {
    let best = null;
    for (const st of this.layout.stations) {
      if (Math.abs(pos.y - st.stand.y) > 0.9) continue;
      const dist = Math.hypot(pos.x - st.stand.x, pos.z - st.stand.z);
      if (dist <= (st.kind === 'board' ? 3 : STATION_REACH) && (!best || dist < best.dist)) best = { st, dist };
    }
    return best?.st || null;
  }

  // { active, transitioned, prompt, name, mobileLabel, open: { id, kind } | null }
  update(player, input, now = 0, dt = 0) {
    if (this.active) { if (this.ticker) this.ticker.map.offset.x = (this.ticker.map.offset.x + dt * 0.035) % 1; if (this.emblem) this.emblem.rotation.y += dt * 0.25; this.refreshDisplays(); }
    const interact = !!input.interact, tap = this.mobile ? 'TAP' : '[E]';
    const idle = (prompt = '', mobileLabel = '', open = null) => ({ active: this.active, transitioned: false, prompt, name: this.site.name, mobileLabel, open });
    if (!this.active) {
      if (!insideInteractionRange(player.pos, this.entry, 2.8)) return idle();
      if (!interact || !interactionCooldownReady(now, this.transitionReadyAt)) return idle(`NERDIE CITY BANK · ${tap} ENTER`, 'ENTER BANK');
      return this.#transition(player, now, true);
    }
    if (insideInteractionRange(player.pos, this.exit, 2.2)) {
      if (!interact || !interactionCooldownReady(now, this.transitionReadyAt)) return idle(`EXIT TO NORTH MARKET · ${tap} EXIT`, 'EXIT BANK');
      return this.#transition(player, now, false);
    }
    const st = this.stationAt(player.pos);
    if (st) {
      const go = interact && interactionCooldownReady(now, this.actionReadyAt); if (go) this.actionReadyAt = now + 0.6;
      const label = st.kind === 'teller' ? `TELLER ${st.id.slice(-1)}` : BANK_STATION_LABEL[st.kind];
      return idle(`${label} · ${tap} ${STATION_VERB[st.kind]}`, STATION_VERB[st.kind], go ? { id: st.id, kind: st.kind } : null);
    }
    return idle();
  }

  #transition(player, now, inside) {
    this.active = inside; this.interior.visible = inside;
    player.pos.copy(inside ? this.insideSpawn : this.outsideSpawn); player.vel.set(0, 0, 0); player.onGround = true;
    player.yaw = inside ? 0 : Math.PI; // facing into the hall (south, -z) / back out onto North Market (north, +z)
    this.transitionReadyAt = now + TRANSITION_COOLDOWN;
    return { active: inside, transitioned: true, prompt: '', name: this.site.name, mobileLabel: '', open: null };
  }

  updateCameraVisibility() { return false; } // a 10 m hall: the camera stays under its ceiling
}
