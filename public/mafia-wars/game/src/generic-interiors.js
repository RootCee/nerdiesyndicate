import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { insideInteractionRange, interactionCooldownReady } from './city-layout.js';
import { addInteriorIsolationShell } from './apartment-system.js';
import { KitBatch, signMaterial } from './city-showcase-kit.js';
import { interiorCatalog, interiorLayout, interiorSpace, PROPERTY_TIERS } from './interior-catalog.js';
import { streetAddress } from './city-addresses.js';

// Stage 2: every building without a hand-built interior can be entered (interior-catalog.js). One system
// serves them all: at a street door it offers ENTER; inside, it builds that one interior (render layer 1,
// its own colliders) and removes all of it on the way out, so the city carries no cost for rooms nobody is
// in. A plaque by the door names the property, its tier, its value and its address.
const TRANSITION_COOLDOWN = 0.65, DOOR_REACH = 2.6, WALL = 0.25;
const NORMALS = Object.freeze({ north: [0, 1], south: [0, -1], east: [1, 0], west: [-1, 0] });

// Colours per palette: floor, walls, trim, accent, fabric, wood, metal, glow.
const PALETTES = Object.freeze({
  warm: [0x8a6a4e, 0xe9dccb, 0x5b4636, 0xc4703e, 0x6e3b3b, 0x9a6d45, 0x3a3a40, 0xffd7a0],
  oak: [0xa07b52, 0xece6da, 0x6b5440, 0x3f6e8c, 0x3c4a5e, 0xb08a5c, 0x34363c, 0xffe4b8],
  sage: [0x9b8a70, 0xdfe6d8, 0x55604d, 0x7a9a6a, 0x4f5f4a, 0x8f7556, 0x36383c, 0xfff0c8],
  city: [0x6f6a66, 0xd9d6d0, 0x3d3b3a, 0x8a3dff, 0x2e2a3a, 0x7a6450, 0x2a2c31, 0xe8dcff],
  loft: [0x5e4a3c, 0xa65a42, 0x2c2c30, 0xe0a040, 0x3a3a44, 0x7c5a3e, 0x26272b, 0xffd890],
  market: [0xb8b2a6, 0xf2efe6, 0x2f6b47, 0xd8432f, 0x2f6b47, 0x9c7c58, 0x8b9096, 0xffffff],
  industrial: [0x76716a, 0xa8a49c, 0x3b3d42, 0xe6b422, 0x4a4d52, 0x8a6a46, 0x55595f, 0xfff4d8],
  clean: [0xd8dde2, 0xeef3f6, 0x3c7fb8, 0x6cc6e8, 0x3c7fb8, 0xb7a58a, 0xc9ced3, 0xffffff],
  bright: [0x2b2b30, 0xf4f4f4, 0x111114, 0xff3b5c, 0x22222a, 0x9a7a58, 0x8c9096, 0xffffff],
  suit: [0x5a4434, 0x2a2730, 0xc19a49, 0x6b1f2c, 0x23202a, 0x6e4c34, 0x2a2a2e, 0xffe2a8],
  lounge: [0x1c1820, 0x2a1f33, 0xc19a49, 0x8a3dff, 0x4b1c3a, 0x5c3a28, 0x222228, 0xff6ad5],
  civic: [0xc9c2b4, 0xeae4d6, 0x7a6640, 0x1f3f6b, 0x6b1f2c, 0x7a5636, 0x5a5650, 0xfff2d8],
  academy: [0x8a6e52, 0xe6e0d2, 0x2a3a5c, 0xc19a49, 0x2a3a5c, 0x8d6a48, 0x3a3c42, 0xfff0d0],
  stone: [0x77736c, 0x9a958c, 0x4a4640, 0xc19a49, 0x4a4640, 0x6e5238, 0x6a6a6e, 0xffe0a0],
});

// Floors by palette: wood in homes, the lounge and the Academy; tile in shops and lobbies; stone in civic and
// tailoring rooms; concrete where things are stored.
const FLOOR_KIND = Object.freeze({ warm: 'wood', oak: 'wood', sage: 'wood', loft: 'wood', lounge: 'wood', academy: 'wood', city: 'tile', market: 'tile', clean: 'tile', bright: 'tile', civic: 'stone', suit: 'stone', industrial: 'concrete', stone: 'concrete' });
function floorTexture(kind, color) {
  const [r, g, bl] = [(color >> 16) & 255, (color >> 8) & 255, color & 255], size = 64, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let k = 1;
    if (kind === 'wood') { const plank = Math.floor(y / 8), seam = y % 8 === 0 || (x + plank * 23) % 48 === 0; k = seam ? 0.62 : 0.9 + 0.1 * Math.sin(x * 0.35 + plank * 1.7) + ((plank * 37) % 7) * 0.012; }
    else if (kind === 'tile') k = x % 32 === 0 || y % 32 === 0 ? 0.7 : ((Math.floor(x / 32) + Math.floor(y / 32)) % 2 ? 1 : 0.93);
    else if (kind === 'stone') k = x % 32 === 0 || y % 32 === 0 ? 0.75 : 0.92 + 0.08 * Math.sin(x * 0.21 + Math.sin(y * 0.13) * 3);
    else k = 0.9 + ((x * 7 + y * 13) % 11) * 0.012 - (x % 64 === 0 ? 0.1 : 0);
    const i = (y * size + x) * 4; data[i] = Math.min(255, r * k); data[i + 1] = Math.min(255, g * k); data[i + 2] = Math.min(255, bl * k); data[i + 3] = 255;
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t;
}
// The name on a business's (or hall's, or lobby's) feature wall.
const FEATURE_LINE = Object.freeze({ grocery: 'GROCERIES · ESSENTIALS · FRESH DAILY', wholesale: 'WHOLESALE SUPPLY · TRADE ONLY', laundromat: 'WASH · DRY · FOLD', sneakers: 'KICKS · RELEASES · CUSTOMS',
  tailor: 'BESPOKE SUITS · TAILORING', 'music-venue': 'LIVE MUSIC · LOUNGE · BAR', 'city-hall': 'CITY OF NERDIE CITY · COUNCIL CHAMBER', 'lecture-hall': 'NERDIE BLAQ ACADEMY', warehouse: 'LOADING · STORAGE', 'clock-tower': 'THE CLOCK WORKS' });

// Homes, apartment buildings, lofts and warehouses are known by their address (like the hand-built
// "73 East Market House"); businesses, City Hall and the Academy halls by their own names.
const ADDRESS_SUFFIX = Object.freeze({ house: 'House', apartments: 'Apartments', lofts: 'Lofts', warehouse: 'Warehouse' });
let names = null;
// Two buildings on one frontage share a number; the second is "88B", the third "88C", like a real city.
function allNames() {
  if (names) return names;
  names = new Map(); const used = new Map();
  for (const e of interiorCatalog()) {
    const suffix = ADDRESS_SUFFIX[e.template], street = suffix ? streetAddress(e.door, e.facing) : null;
    if (!street) { names.set(e.spaceId, e.name); continue; }
    const key = street.text, n = (used.get(key) || 0) + 1; used.set(key, n);
    names.set(e.spaceId, `${street.number}${n > 1 ? String.fromCharCode(64 + n) : ''} ${street.street} ${suffix}`);
  }
  return names;
}
export const buildingName = (entry) => allNames().get(entry.spaceId) || entry.name;

export function residentialPlaque(entry) {
  const tier = entry.tier ? PROPERTY_TIERS[entry.tier] : null, address = streetAddress(entry.door, entry.facing)?.text || '';
  return { title: buildingName(entry), line: tier ? `${tier.label} · Value ${tier.value.toLocaleString('en-US')} sNERDIE · about ${tier.area} m²` : 'Nerdie City', address };
}

export class GenericInteriorSystem {
  // The catalog is the server's (default plan), so doors and rooms match multiplayer-spaces.js exactly.
  constructor(scene, { addCollider, removeColliders, mobile = false } = {}) {
    Object.assign(this, { scene, addCollider, removeColliders, mobile });
    this.entries = interiorCatalog().map((e) => ({ e, name: buildingName(e), door: new THREE.Vector3(e.door.x, 0, e.door.z) }));
    this.active = null; this.group = null; this.colliders = []; this.transitionReadyAt = 0; this.kit = { night: [], mobile };
  }
  get site() { return this.active ? { id: this.active.e.spaceId, name: this.active.name } : null; }

  // { active, transitioned, prompt, name, mobileLabel, spaceId }
  update(player, input, now = 0) {
    const interact = !!input.interact, tap = this.mobile ? 'TAP' : '[E]';
    const idle = (prompt = '', mobileLabel = '') => ({ active: !!this.active, transitioned: false, prompt, name: this.active?.name || '', mobileLabel, spaceId: this.active?.e.spaceId || null });
    if (!this.active) {
      if (player.pos.y > 3) return idle();
      let best = null, bestD = DOOR_REACH;
      for (const it of this.entries) { const dd = Math.hypot(player.pos.x - it.door.x, player.pos.z - it.door.z); if (dd < bestD) { bestD = dd; best = it; } }
      if (!best) return idle();
      if (!interact || !interactionCooldownReady(now, this.transitionReadyAt)) return idle(`${best.name.toUpperCase()} · ${tap} ENTER`, 'ENTER');
      return this.#enter(best, player, now);
    }
    if (insideInteractionRange(player.pos, this.exit, 2.2)) {
      if (!interact || !interactionCooldownReady(now, this.transitionReadyAt)) return idle(`EXIT TO THE STREET · ${tap} EXIT`, 'EXIT');
      return this.#leave(player, now);
    }
    return idle();
  }
  // Leave without a door (mode change, respawn): drop the interior.
  reset() { if (this.active) this.#dispose(); this.active = null; }
  // The server placed this client in a building (its confirmation, or a reconnect): make sure that interior
  // is the one built. The server's state sets the position.
  enterSpace(spaceId) {
    if (this.active?.e.spaceId === spaceId) return true;
    const it = this.entries.find((x) => x.e.spaceId === spaceId); if (!it) return false;
    this.#dispose(); this.active = it; this.layout = interiorLayout(it.e); this.space = interiorSpace(it.e, this.layout);
    this.group = this.build(it.e, this.layout); this.scene.add(this.group);
    this.exit = new THREE.Vector3(this.space.exit.x, this.space.exit.y, this.space.exit.z);
    return true;
  }

  #enter(it, player, now) {
    this.#dispose(); this.active = it;
    this.layout = interiorLayout(it.e); this.space = interiorSpace(it.e, this.layout);
    this.group = this.build(it.e, this.layout); this.scene.add(this.group);
    const s = this.space; this.exit = new THREE.Vector3(s.exit.x, s.exit.y, s.exit.z);
    player.pos.set(s.inside.x, s.inside.y, s.inside.z); player.vel.set(0, 0, 0); player.onGround = true; player.yaw = 0; // facing into the room (south)
    this.transitionReadyAt = now + TRANSITION_COOLDOWN;
    return { active: true, transitioned: true, prompt: '', name: it.name, mobileLabel: '', spaceId: it.e.spaceId, subtitle: `${residentialPlaque(it.e).line.toUpperCase()} · SAFE ZONE` };
  }
  #leave(player, now) {
    const it = this.active, s = this.space, [nx, nz] = NORMALS[it.e.facing] || NORMALS.east;
    this.#dispose(); this.active = null;
    player.pos.set(s.outside.x, 0, s.outside.z); player.vel.set(0, 0, 0); player.onGround = true; player.yaw = Math.atan2(-nx, -nz); // facing away from the door
    this.transitionReadyAt = now + TRANSITION_COOLDOWN;
    return { active: false, transitioned: true, prompt: '', name: it.name, mobileLabel: '', spaceId: it.e.spaceId };
  }
  #dispose() {
    if (this.colliders.length) { this.removeColliders?.(this.colliders); this.colliders = []; }
    if (!this.group) return;
    this.scene.remove(this.group);
    this.group.traverse((o) => { o.geometry?.dispose?.(); const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; for (const m of mats) { m.map?.dispose?.(); m.dispose?.(); } });
    this.group = null; this.kit.night.length = 0;
  }

  // The interior's meshes, lights and (through addCollider) colliders. Public so the tests can measure it.
  build(e, L) {
    const g = new THREE.Group(); g.name = `interior-${e.spaceId}`;
    const y = L.y, H = L.height, b = new KitBatch(), [cFloor, cWall, cTrim, cAccent, cFabric, cWood, cMetal, cGlow] = PALETTES[L.palette] || PALETTES.oak;
    const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.r ?? 0.75, metalness: o.metal ?? 0, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 0 });
    const M = { floor: std(0xffffff, { r: 0.5 }), ceiling: std(0xf4f1ea, { r: 0.95 }), p1: std(0xd8432f, { r: 0.6 }), p2: std(0xf2c14e, { r: 0.6 }), p3: std(0x2f6b9a, { r: 0.6 }), p4: std(0x3f8f55, { r: 0.6 }), wall: std(cWall, { r: 0.9 }), trim: std(cTrim), accent: std(cAccent, { r: 0.6 }), fabric: std(cFabric, { r: 0.95 }), wood: std(cWood, { r: 0.6 }),
      metal: std(cMetal, { r: 0.4, metal: 0.6 }), glow: std(0x222222, { e: cGlow, ei: 1.2 }), white: std(0xf2f0ea, { r: 0.35 }), dark: std(0x141418, { r: 0.5 }), leaf: std(0x3b6b44, { r: 0.9 }), screen: std(0x0a0c12, { e: 0x3355aa, ei: 0.35 }) };
    M.floor.map = floorTexture(FLOOR_KIND[L.palette] || 'wood', cFloor); M.floor.map.repeat.set((L.maxX - L.minX) / 4, (L.maxZ - L.minZ) / 4);
    const bx = (mat, x0, x1, y0, y1, z0, z1) => b.box(mat, (x0 + x1) / 2, y + (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0);
    const box = (x0, x1, y0, y1, z0, z1, extra = {}) => { const c = this.addCollider?.(x0, z0, x1, z1, y + y0, y + y1, { interior: e.spaceId, ...extra }); if (c) this.colliders.push(c); };
    const cx = (L.minX + L.maxX) / 2, cz = (L.minZ + L.maxZ) / 2, w = L.maxX - L.minX, d = L.maxZ - L.minZ, t = WALL;
    addInteriorIsolationShell(g, [cx, y + H / 2, cz], [w + 8, H + 8, d + 8], `${e.spaceId}-shell`);
    // floor, ceiling, and a skirting trim
    bx(M.floor, L.minX, L.maxX, -0.16, 0, L.minZ, L.maxZ); box(L.minX - 0.3, L.maxX + 0.3, -0.2, 0, L.minZ - 0.3, L.maxZ + 0.3, { step: true });
    bx(M.ceiling, L.minX - t, L.maxX + t, H, H + 0.15, L.minZ - t, L.maxZ + t);
    // outer walls, the door gap in the north wall
    // walls: paint above a panelled dado (accent below a trim rail), a skirting board and a crown moulding
    const wallRun = (x0, x1, z0, z1, solid = true) => { bx(M.wall, x0, x1, 1.0, H, z0, z1); bx(M.accent, x0, x1, 0, 1.0, z0, z1); bx(M.trim, x0 - 0.01, x1 + 0.01, 0.96, 1.04, z0 - 0.02, z1 + 0.02); bx(M.trim, x0 - 0.01, x1 + 0.01, 0, 0.12, z0 - 0.02, z1 + 0.02); bx(M.trim, x0 - 0.01, x1 + 0.01, H - 0.1, H, z0 - 0.03, z1 + 0.03); if (solid) box(x0, x1, 0, H, z0, z1); };
    const d0 = L.doorX - L.doorWidth / 2, d1 = L.doorX + L.doorWidth / 2;
    wallRun(L.minX - t, L.maxX + t, L.minZ - t, L.minZ); wallRun(L.minX - t, L.minX, L.minZ, L.maxZ); wallRun(L.maxX, L.maxX + t, L.minZ, L.maxZ);
    wallRun(L.minX - t, d0, L.maxZ, L.maxZ + t); wallRun(d1, L.maxX + t, L.maxZ, L.maxZ + t);
    bx(M.wall, d0, d1, 2.4, H, L.maxZ, L.maxZ + t); box(d0, d1, 0, H, L.maxZ, L.maxZ + t, { door: e.spaceId });
    bx(M.trim, d0 - 0.12, d0, 0, 2.5, L.maxZ - 0.05, L.maxZ); bx(M.trim, d1, d1 + 0.12, 0, 2.5, L.maxZ - 0.05, L.maxZ); bx(M.trim, d0 - 0.12, d1 + 0.12, 2.4, 2.52, L.maxZ - 0.05, L.maxZ);
    bx(M.dark, d0, d1, 0, 2.4, L.maxZ - 0.02, L.maxZ);
    // windows: glowing panes along the side walls (daylight in, without a view of the sky)
    const step = this.mobile ? 6 : 4;
    for (let z = L.minZ + 2.5; z < L.maxZ - 2; z += step) for (const x of [L.minX + 0.02, L.maxX - 0.02]) bx(M.glow, x - 0.02, x + 0.02, Math.min(1.1, H - 2), Math.min(H - 0.5, 2.6), z - 0.8, z + 0.8);
    // partitions with doorways
    for (const p of L.partitions) {
      const cuts = [...p.gaps].sort((a, c) => a[0] - c[0]); let from = p.from;
      const seg = (a, c) => { if (c - a < 0.05) return; if (p.axis === 'x') wallRun(a, c, p.at - 0.08, p.at + 0.08); else wallRun(p.at - 0.08, p.at + 0.08, a, c); };
      for (const [c, half] of cuts) { seg(from, c - half); if (p.axis === 'x') bx(M.wall, c - half, c + half, 2.3, H, p.at - 0.08, p.at + 0.08); else bx(M.wall, p.at - 0.08, p.at + 0.08, 2.3, H, c - half, c + half); from = c + half; }
      seg(from, p.to);
    }
    // furniture
    for (const o of L.furniture) {
      const x0 = o.x - o.w / 2, x1 = o.x + o.w / 2, z0 = o.z - o.d / 2, z1 = o.z + o.d / 2, h = o.h, oy = o.y || 0;
      this.#piece(o, { bx, b, M, y, x0, x1, z0, z1, h, oy });
      if (o.collide) box(x0, x1, oy, oy + Math.max(h, 0.05), z0, z1, o.step ? { step: true, furniture: o.type } : { furniture: o.type });
    }
    // ceiling lights: a panel every few metres
    const lightStep = this.mobile ? 6 : 4.5;
    for (let lx = L.minX + lightStep / 2; lx < L.maxX; lx += lightStep) for (let lz = L.minZ + lightStep / 2; lz < L.maxZ; lz += lightStep) bx(M.glow, lx - 0.45, lx + 0.45, H - 0.05, H - 0.01, lz - 0.45, lz + 0.45);
    // framed art along the side walls of homes and lobbies
    if (FLOOR_KIND[L.palette] === 'wood' || L.palette === 'city') {
      const arts = [M.p1, M.p3, M.p4, M.p2];
      let n = 0; for (let z = L.minZ + 3.2; z < L.maxZ - 2.5; z += 5) for (const [x, side] of [[L.minX, 1], [L.maxX, -1]]) {
        const a = arts[(n++ + L.variant) % arts.length], xi = x + side * 0.02, xo = x + side * 0.06;
        bx(M.trim, Math.min(xi, xo), Math.max(xi, xo), 1.55, 2.45, z - 0.6, z + 0.6); bx(a, Math.min(xi, xo) + (side > 0 ? 0.03 : -0.03), Math.max(xi, xo) + (side > 0 ? 0.03 : -0.03), 1.62, 2.38, z - 0.52, z + 0.52);
      }
    }
    b.build(g, e.spaceId, { castShadow: false });
    // the plaque by the door: name, tier and value, address
    const P = residentialPlaque(e), sign = signMaterial(this.kit, (ctx, cw, ch) => {
      ctx.fillStyle = '#100e14'; ctx.fillRect(0, 0, cw, ch); ctx.strokeStyle = '#c19a49'; ctx.lineWidth = 8; ctx.strokeRect(8, 8, cw - 16, ch - 16);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f2d28b'; ctx.font = '700 64px Barlow, sans-serif'; ctx.fillText(P.title.toUpperCase(), cw / 2, ch * 0.3, cw * 0.9);
      ctx.fillStyle = '#e7e0f4'; ctx.font = '500 34px Barlow, sans-serif'; ctx.fillText(P.line, cw / 2, ch * 0.58, cw * 0.92);
      ctx.fillStyle = '#b7a9db'; ctx.font = '400 32px Barlow, sans-serif'; ctx.fillText(P.address, cw / 2, ch * 0.8, cw * 0.9);
    }, { w: 1024, h: 260, preview: 0x100e14, day: 1, night: 1 });
    // the feature wall: a business's name (or the hall's, or the building directory in a lobby)
    const isHome = e.template === 'house', isLobby = e.template === 'apartments' || e.template === 'lofts';
    if (!isHome) {
      const title = buildingName(e).toUpperCase(), line = isLobby ? `MODEL APARTMENT · ${PROPERTY_TIERS[e.tier]?.label.toUpperCase() || ''} · AVAILABLE` : FEATURE_LINE[e.template] || 'NERDIE CITY';
      const feature = signMaterial(this.kit, (ctx, cw, ch) => {
        ctx.fillStyle = '#0d0b12'; ctx.fillRect(0, 0, cw, ch); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = `#${cGlow.toString(16).padStart(6, '0')}`; ctx.shadowBlur = 30; ctx.fillStyle = '#f2d28b'; ctx.font = '700 150px Barlow, sans-serif'; ctx.fillText(title, cw / 2, ch * 0.42, cw * 0.92);
        ctx.shadowBlur = 0; ctx.fillStyle = '#e7e0f4'; ctx.font = '500 52px Barlow, sans-serif'; ctx.fillText(line, cw / 2, ch * 0.8, cw * 0.9);
      }, { w: 1600, h: 320, preview: 0x0d0b12, day: 1.2, night: 1.2 });
      const fw = Math.min(w - 2, isLobby ? 6 : 9), fh = fw * 0.2, fz = isLobby ? cz + (L.maxZ - cz) * 0.25 - 0.1 : L.minZ + 0.05; // a lobby's sign is over the doorway into the apartment
      const fm = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), feature); fm.position.set(cx, y + Math.min(H - 0.4 - fh / 2, isLobby ? 2.9 : H * 0.62), isLobby ? L.partitions[0].at + 0.1 : fz); fm.name = `${e.spaceId}-feature`; g.add(fm);
    }
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.61), sign); plaque.position.set(d1 + 1.8, y + 1.75, L.maxZ - 0.04); plaque.rotation.y = Math.PI; plaque.name = `${e.spaceId}-plaque`; g.add(plaque);
    const lights = this.mobile ? [[cx, H - 0.6, cz, 0xfff0d8, 70, Math.max(w, d) * 1.3]] : [[cx, H - 0.6, cz + d / 4, 0xfff0d8, 60, Math.max(w, d) * 1.2], [cx, H - 0.6, cz - d / 4, 0xfff0d8, 50, Math.max(w, d) * 1.2]];
    for (const [lx, ly, lz, c, i, r] of lights) { const light = new THREE.PointLight(c, i * (L.palette === 'lounge' ? 1.6 : 1.25), r, 2); light.position.set(lx, y + ly, lz); g.add(light); }
    // a soft fill so no corner goes black (interiors are lit only by their own lights)
    const fill = new THREE.HemisphereLight(0xfff4e6, 0x3a3026, L.palette === 'lounge' ? 0.55 : 0.7); fill.position.set(cx, y + H, cz); g.add(fill);
    g.traverse((o) => o.layers.set(1));
    return g;
  }

  // One piece of furniture, as a few boxes in the room's palette.
  #piece(o, { bx, b, M, y, x0, x1, z0, z1, h, oy }) {
    const xs = x1 - x0, zs = z1 - z0, alongX = xs >= zs, mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    const back = (thick) => alongX ? [z0, z0 + thick] : [x0, x0 + thick];
    const L_VARIANT = (p) => Math.round((p.x * 13 + p.z * 7) * 10) % 9;
    switch (o.type) {
      case 'sofa': case 'pew': case 'bench': {
        const seat = o.type === 'bench' ? h : 0.45;
        bx(o.type === 'sofa' ? M.fabric : M.wood, x0, x1, oy, oy + seat, z0, z1);
        if (o.type === 'sofa') { const cushions = 3; for (let i = 0; i < cushions; i++) { const c = (alongX ? x0 : z0) + ((alongX ? xs : zs) / cushions) * (i + 0.5), hw = (alongX ? xs : zs) / cushions * 0.44; if (alongX) bx(M.white, c - hw, c + hw, oy + seat, oy + seat + 0.12, z0 + 0.25, z1 - 0.05); else bx(M.white, x0 + 0.25, x1 - 0.05, oy + seat, oy + seat + 0.12, c - hw, c + hw); } }
        if (o.type !== 'bench') { const [a, c] = back(0.22); if (alongX) bx(o.type === 'sofa' ? M.fabric : M.wood, x0, x1, oy, oy + h, a, c); else bx(M.fabric, a, c, oy, oy + h, z0, z1); }
        break;
      }
      case 'bed': bx(M.wood, x0, x1, oy, oy + 0.35, z0, z1); bx(M.white, x0 + 0.05, x1 - 0.05, oy + 0.35, oy + h, z0 + 0.05, z1 - 0.05); bx(M.fabric, x0 + 0.05, x1 - 0.05, oy + h, oy + h + 0.04, z0 + zs * 0.3, z1 - 0.05); bx(M.accent, x0 - 0.05, x1 + 0.05, oy, oy + 1.25, z0 - 0.02, z0 + 0.1); bx(M.white, x0 + 0.15, x0 + xs * 0.45, oy + h, oy + h + 0.14, z0 + 0.15, z0 + 0.55); bx(M.white, x1 - xs * 0.45, x1 - 0.15, oy + h, oy + h + 0.14, z0 + 0.15, z0 + 0.55); break;
      case 'table': case 'desk': case 'round-table': case 'island': case 'counter': case 'bar': case 'council-desk': case 'podium': case 'register': case 'desk-row': {
        const top = o.type === 'counter' || o.type === 'bar' || o.type === 'island' || o.type === 'council-desk' ? M.accent : M.wood;
        if (o.type === 'table' || o.type === 'desk' || o.type === 'round-table' || o.type === 'desk-row') { bx(top, x0, x1, oy + h - 0.05, oy + h, z0, z1); for (const [lx, lz] of [[x0 + 0.06, z0 + 0.06], [x1 - 0.06, z0 + 0.06], [x0 + 0.06, z1 - 0.06], [x1 - 0.06, z1 - 0.06]]) bx(M.metal, lx - 0.03, lx + 0.03, oy, oy + h - 0.05, lz - 0.03, lz + 0.03); }
        else {
          bx(o.type === 'register' ? M.dark : M.wood, x0, x1, oy, oy + h - 0.05, z0, z1); bx(top, x0 - 0.03, x1 + 0.03, oy + h - 0.05, oy + h, z0 - 0.03, z1 + 0.03);
          // a home kitchen's counter gets wall cabinets above it; a bar gets its glowing bottle shelf
          if (o.type === 'counter' && o.h < 0.95) { if (alongX) bx(M.wood, x0, x1, oy + 1.5, oy + 2.3, z0, z0 + 0.35); else { const wx = o.x > 0 ? x1 - 0.35 : x0; bx(M.wood, wx, wx + 0.35, oy + 1.5, oy + 2.3, z0, z1); } }
          if (o.type === 'bar') { const bx0 = o.x > 0 ? x1 + 0.2 : x0 - 0.5; for (const ly of [1.3, 1.8]) { bx(M.wood, bx0, bx0 + 0.3, ly - 0.03, ly, z0, z1); for (let zz = z0 + 0.2; zz < z1 - 0.1; zz += 0.25) bx(M.glow, bx0 + 0.08, bx0 + 0.18, ly, ly + 0.3, zz - 0.04, zz + 0.04); } }
        }
        break;
      }
      case 'tv': bx(M.wood, x0, x1, oy, oy + 0.5, z0, z1); if (alongX) bx(M.screen, mx - xs * 0.42, mx + xs * 0.42, oy + 0.6, oy + h, mz - 0.03, mz + 0.03); else bx(M.screen, mx - 0.03, mx + 0.03, oy + 0.6, oy + h, mz - zs * 0.42, mz + zs * 0.42); break;
      case 'fridge': case 'fridge-row': bx(M.white, x0, x1, oy, oy + h, z0, z1); bx(M.glow, alongX ? x0 : x1 - 0.02, alongX ? x1 : x1, oy + 0.3, oy + h - 0.2, alongX ? z1 - 0.02 : z0 + 0.1, alongX ? z1 : z1 - 0.1); break;
      case 'shelf': case 'rack': case 'wall-shelf': case 'mailboxes': {
        bx(M.metal, x0, x1, oy, oy + 0.08, z0, z1); bx(M.metal, x0, x1, oy + h - 0.06, oy + h, z0, z1);
        const levels = Math.max(2, Math.round(h / 0.55)), len = alongX ? xs : zs, n = Math.max(2, Math.floor(len / (o.type === 'rack' ? 1.1 : 0.32))), goods = [M.p1, M.p2, M.p3, M.p4];
        for (let i = 0; i < levels; i++) {
          const ly = oy + 0.08 + (h / levels) * i; if (i) bx(M.wood, x0, x1, ly - 0.03, ly, z0, z1);
          if (o.type === 'mailboxes') { for (let j = 0; j < n; j++) { const c = (alongX ? x0 : z0) + (len / n) * (j + 0.5); if (alongX) bx(M.dark, c - 0.1, c + 0.1, ly + 0.08, ly + 0.2, z1, z1 + 0.01); else bx(M.dark, x1, x1 + 0.01, ly + 0.08, ly + 0.2, c - 0.1, c + 0.1); } continue; }
          // stock: individual boxes, cartons or pallets with gaps between them
          for (let j = 0; j < n; j++) {
            if ((j * 7 + i * 3 + L_VARIANT(o)) % 9 === 0) continue;
            const c = (alongX ? x0 : z0) + (len / n) * (j + 0.5), half = (len / n) * 0.38, ph = (h / levels) * (0.45 + ((j * 5 + i) % 4) * 0.1);
            const mat = goods[(j + i) % goods.length];
            if (alongX) bx(mat, c - half, c + half, ly, ly + ph, z0 + 0.06, z1 - 0.06); else bx(mat, x0 + 0.06, x1 - 0.06, ly, ly + ph, c - half, c + half);
          }
        }
        break;
      }
      case 'wardrobe': case 'booth': case 'lift': case 'speaker': case 'gears': case 'forklift': case 'dryers': case 'washers': case 'display': case 'mannequin': {
        if (o.type === 'lift') { bx(M.trim, x0, x1, oy, oy + h + 0.2, z0, z1); const face = o.x > 0 ? x0 - 0.01 : x1; bx(M.metal, face, face + 0.01, oy, oy + h, z0 + 0.1, (z0 + z1) / 2 - 0.02); bx(M.metal, face, face + 0.01, oy, oy + h, (z0 + z1) / 2 + 0.02, z1 - 0.1); bx(M.glow, face, face + 0.01, oy + h + 0.05, oy + h + 0.15, (z0 + z1) / 2 - 0.2, (z0 + z1) / 2 + 0.2); break; }
        const mat = o.type === 'lift' || o.type === 'gears' || o.type === 'forklift' ? M.metal : o.type === 'speaker' ? M.dark : o.type === 'washers' || o.type === 'dryers' ? M.white : o.type === 'display' ? M.white : o.type === 'mannequin' ? M.fabric : M.wood;
        bx(mat, x0, x1, oy, oy + h, z0, z1);
        if (o.type === 'washers' || o.type === 'dryers') { const n = Math.max(1, Math.round((alongX ? xs : zs) / 0.8)); for (let i = 0; i < n; i++) { const c = (alongX ? x0 : z0) + ((alongX ? xs : zs) / n) * (i + 0.5); if (alongX) bx(M.dark, c - 0.22, c + 0.22, oy + h * 0.35, oy + h * 0.8, z1, z1 + 0.02); else { bx(M.dark, x1, x1 + 0.02, oy + h * 0.35, oy + h * 0.8, c - 0.22, c + 0.22); bx(M.dark, x0 - 0.02, x0, oy + h * 0.35, oy + h * 0.8, c - 0.22, c + 0.22); } } }
        if (o.type === 'gears') { b.cyl(M.accent, mx, y + oy + h * 0.6, mz, xs * 0.45, 0.2, 24); b.cyl(M.accent, mx, y + oy + h * 0.35, mz, xs * 0.3, 0.2, 18); }
        if (o.type === 'display') bx(M.accent, x0 + 0.2, x1 - 0.2, oy + h, oy + h + 0.25, z0 + 0.2, z1 - 0.2);
        break;
      }
      case 'tub': case 'sink': case 'toilet': bx(M.white, x0, x1, oy, oy + h, z0, z1); if (o.type === 'tub') bx(M.screen, x0 + 0.08, x1 - 0.08, oy + h - 0.06, oy + h - 0.02, z0 + 0.08, z1 - 0.08); break;
      case 'plant': b.cyl(M.trim, mx, y + oy + 0.25, mz, xs * 0.4, 0.5, 12); b.blob(M.leaf, mx, y + oy + 0.5 + h * 0.35, mz, Math.max(xs, 0.5) * 0.6, 1); break;
      case 'nightstand': case 'pallet': case 'crates': bx(M.wood, x0, x1, oy, oy + h, z0, z1); break;
      case 'stage': case 'dais': case 'tier': bx(M.wood, x0, x1, oy, oy + h, z0, z1); bx(M.trim, x0, x1, oy + h - 0.03, oy + h, alongX ? z1 - 0.06 : z0, z1); break;
      case 'mic': case 'flag': bx(M.metal, mx - 0.03, mx + 0.03, oy, oy + h, mz - 0.03, mz + 0.03); if (o.type === 'flag') bx(M.accent, mx + 0.03, mx + 0.9, oy + h - 1.0, oy + h - 0.2, mz - 0.01, mz + 0.01); break;
      case 'mirror': bx(M.trim, x0, x1, oy, oy + h, z0, z1); bx(M.screen, x0 + 0.08, x1 - 0.08, oy + 0.1, oy + h - 0.1, z1, z1 + 0.01); break;
      case 'rug': case 'seal': case 'lines': bx(o.type === 'seal' ? M.accent : o.type === 'lines' ? M.accent : M.fabric, x0, x1, 0, 0.012, z0, z1); if (o.type === 'seal') bx(M.trim, x0 + 0.6, x1 - 0.6, 0.012, 0.02, z0 + 0.6, z1 - 0.6); break;
      case 'screen': bx(M.screen, x0, x1, oy, oy + h, z0, z1); break;
      case 'stair': bx(M.wood, x0, x1, 0, h, z0, z1); break;
      default: bx(M.wood, x0, x1, oy, oy + h, z0, z1);
    }
  }
}
