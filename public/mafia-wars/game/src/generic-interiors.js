import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { insideInteractionRange, interactionCooldownReady } from './city-layout.js';
import { addInteriorIsolationShell } from './apartment-system.js';
import { KitBatch, signMaterial } from './city-showcase-kit.js';
import { interiorCatalog, interiorLayout, interiorSpace, apartmentUnit, apartmentUnitSpace, LOBBY_LIFT_Z, PROPERTY_TIERS } from './interior-catalog.js';
import { APARTMENT_FLOORS } from './apartment-building.js';
import { streetAddress } from './city-addresses.js';

// Stage 2: every building without a hand-built interior can be entered (interior-catalog.js). One system
// serves them all: at a street door it offers ENTER; inside, it builds that one interior (render layer 1,
// its own colliders) and removes all of it on the way out, so the city carries no cost for rooms nobody is
// in. A plaque by the door names the property, its tier, its value and its address.
const TRANSITION_COOLDOWN = 0.65, DOOR_REACH = 2.6, WALL = 0.25;
const NORMALS = Object.freeze({ north: [0, 1], south: [0, -1], east: [1, 0], west: [-1, 0] });

// Colours per palette: floor, walls, trim, accent, fabric, wood, metal, glow.
const PALETTES = Object.freeze({
  warm: [0x8a6a4e, 0xd9cbb8, 0x5b4636, 0xc4703e, 0x6e3b3b, 0x9a6d45, 0x3a3a40, 0xffd7a0],
  oak: [0xa07b52, 0xdcd5c8, 0x6b5440, 0x3f6e8c, 0x3c4a5e, 0xb08a5c, 0x34363c, 0xffe4b8],
  sage: [0x9b8a70, 0xcfd8c8, 0x55604d, 0x7a9a6a, 0x4f5f4a, 0x8f7556, 0x36383c, 0xfff0c8],
  city: [0x6f6a66, 0xcdcac3, 0x3d3b3a, 0x8a3dff, 0x2e2a3a, 0x7a6450, 0x2a2c31, 0xe8dcff],
  loft: [0x5e4a3c, 0xa65a42, 0x2c2c30, 0xe0a040, 0x3a3a44, 0x7c5a3e, 0x26272b, 0xffd890],
  market: [0xb8b2a6, 0xf2efe6, 0x2f6b47, 0xd8432f, 0x2f6b47, 0x9c7c58, 0x8b9096, 0xffffff],
  industrial: [0x76716a, 0xa8a49c, 0x3b3d42, 0xe6b422, 0x4a4d52, 0x8a6a46, 0x55595f, 0xfff4d8],
  clean: [0xd8dde2, 0xeef3f6, 0x3c7fb8, 0x6cc6e8, 0x3c7fb8, 0xb7a58a, 0xc9ced3, 0xffffff],
  bright: [0x2b2b30, 0xf4f4f4, 0x111114, 0xff3b5c, 0x22222a, 0x9a7a58, 0x8c9096, 0xffffff],
  suit: [0x6a5240, 0x4a4250, 0xc19a49, 0x6b1f2c, 0x23202a, 0x6e4c34, 0x2a2a2e, 0xffe2a8],
  lounge: [0x2e2834, 0x3e3050, 0xc19a49, 0x8a3dff, 0x4b1c3a, 0x5c3a28, 0x222228, 0xff6ad5],
  civic: [0xc9c2b4, 0xeae4d6, 0x7a6640, 0x1f3f6b, 0x6b1f2c, 0x7a5636, 0x5a5650, 0xfff2d8],
  academy: [0x8a6e52, 0xe6e0d2, 0x2a3a5c, 0xc19a49, 0x2a3a5c, 0x8d6a48, 0x3a3c42, 0xfff0d0],
  stone: [0x77736c, 0x9a958c, 0x4a4640, 0xc19a49, 0x4a4640, 0x6e5238, 0x6a6a6e, 0xffe0a0],
  // apartments: richer wood for the luxury floors; polished stone, cream and gold for the penthouse
  luxury: [0x8a6a4e, 0xe0d8ca, 0x3b2f27, 0x6b1f2c, 0x2e2a3a, 0x9a6d45, 0x34363c, 0xffe4b8],
  penthouse: [0xd8d2c6, 0xece6dc, 0xc19a49, 0x2a2a30, 0x3a3046, 0x6e4c34, 0x3a3a40, 0xfff0d0],
});

// Floors by palette: wood in homes, the lounge and the Academy; tile in shops and lobbies; stone in civic and
// tailoring rooms; concrete where things are stored.
const FLOOR_KIND = Object.freeze({ warm: 'wood', oak: 'wood', sage: 'wood', loft: 'wood', lounge: 'wood', academy: 'wood', city: 'tile', market: 'tile', clean: 'tile', bright: 'tile', civic: 'stone', suit: 'stone', luxury: 'wood', penthouse: 'stone', industrial: 'concrete', stone: 'concrete' });
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
// Light per room type, calibrated from measured renders (qa/stage2/interiors.html?measure=1) to an even,
// comfortable level: mean brightness about 0.48 (the lounge a moodier 0.36), nothing crushed or blown out.
const POINT_SHARE = 0.35, FILL = 2.3;
const LIGHT_SCALE = Object.freeze({ house: 0.92, apartments: 1.1, lofts: 3.4, grocery: 0.92, wholesale: 2, laundromat: 0.47, sneakers: 2, tailor: 5.6,
  'music-venue': 5.1, warehouse: 2, 'city-hall': 1.06, 'lecture-hall': 1.24, 'clock-tower': 1.33 });
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

// One room's materials from its palette (floor texture sized to the room).
function makeMaterials(palette, w, d) {
  const colors = PALETTES[palette] || PALETTES.oak, [cFloor, cWall, cTrim, cAccent, cFabric, cWood, cMetal, cGlow] = colors;
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.r ?? 0.75, metalness: o.metal ?? 0, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 0 });
  // (lofts and the lounge have a dark, exposed ceiling)
  const M = { floor: std(0xffffff, { r: 0.5 }), ceiling: std(palette === 'loft' ? 0x4a3f36 : palette === 'lounge' ? 0x2a2230 : 0xe6e2da, { r: 0.95 }), p1: std(0xd8432f, { r: 0.6 }), p2: std(0xf2c14e, { r: 0.6 }), p3: std(0x2f6b9a, { r: 0.6 }), p4: std(0x3f8f55, { r: 0.6 }), wall: std(cWall, { r: 0.9 }), trim: std(cTrim), accent: std(cAccent, { r: 0.6 }), fabric: std(cFabric, { r: 0.95 }), wood: std(cWood, { r: 0.6 }),
    metal: std(cMetal, { r: 0.4, metal: 0.6 }), glow: std(0x222222, { e: cGlow, ei: 0.5 }), pane: std(0x222222, { e: cGlow, ei: 0.42 }), white: std(0xf2f0ea, { r: 0.35 }), dark: std(0x141418, { r: 0.5 }), leaf: std(0x3b6b44, { r: 0.9 }), screen: std(0x0a0c12, { e: 0x3355aa, ei: 0.35 }) };
  M.floor.map = floorTexture(FLOOR_KIND[palette] || 'wood', cFloor); M.floor.map.repeat.set(w / 4, d / 4);
  return { M, colors };
}

// A rectangle minus axis-aligned holes inside it, as up to four rectangles per hole (for ceilings and roofs
// with a stair opening).
// Floor pieces overlap by this much: groundAt's strict edges would otherwise leave a seam with no floor.
const SEAM = 0.02;
function subtractRect(r, holes) {
  let parts = [r];
  for (const h of holes) parts = parts.flatMap((p) => {
    if (h.maxX <= p.minX || h.minX >= p.maxX || h.maxZ <= p.minZ || h.minZ >= p.maxZ) return [p];
    const out = [], x0 = Math.max(p.minX, h.minX), x1 = Math.min(p.maxX, h.maxX);
    if (h.minZ > p.minZ) out.push({ ...p, maxZ: h.minZ }); if (h.maxZ < p.maxZ) out.push({ ...p, minZ: h.maxZ });
    const z0 = Math.max(p.minZ, h.minZ), z1 = Math.min(p.maxZ, h.maxZ);
    if (x0 > p.minX) out.push({ minX: p.minX, maxX: x0, minZ: z0, maxZ: z1 }); if (x1 < p.maxX) out.push({ minX: x1, maxX: p.maxX, minZ: z0, maxZ: z1 });
    return out;
  });
  return parts;
}

export class GenericInteriorSystem {
  // The catalog is the server's (default plan), so doors and rooms match multiplayer-spaces.js exactly.
  // worldColliders: the city's collider list, so an apartment can set its building's solid box aside while
  // someone is inside it (and put it back on the way out).
  constructor(scene, { addCollider, removeColliders, worldColliders = null, mobile = false } = {}) {
    Object.assign(this, { scene, addCollider, removeColliders, worldColliders, mobile });
    this.entries = interiorCatalog().map((e) => ({ e, name: buildingName(e), door: new THREE.Vector3(e.door.x, 0, e.door.z), apartments: e.template === 'apartments' || e.template === 'lofts' }));
    this.active = null; this.unit = null; this.group = null; this.colliders = []; this.shelved = []; this.transitionReadyAt = 0; this.kit = { night: [], mobile };
  }
  get site() { return this.active ? { id: this.unit?.space.id || this.active.e.spaceId, name: this.unit ? `${this.active.name} · ${this.unit.U.title}` : this.active.name } : null; }
  // The floors a lift offers: the lobby and storeys 2-6, each with its tier, value and size (all open to visit for now).
  floorMenu() {
    if (!this.active?.apartments) return null;
    return { building: this.active.name, current: this.unit?.floor || 1, floors: [{ floor: 1, title: 'Lobby', open: true },
      ...APARTMENT_FLOORS.map(({ floor }) => { const U = apartmentUnit(this.active.e, floor); return { floor, title: U.title, tier: PROPERTY_TIERS[U.tier].label, value: PROPERTY_TIERS[U.tier].value, area: U.area, open: true }; })] };
  }

  // { active, transitioned, prompt, name, mobileLabel, spaceId, isolated, transitions?, floorMenu? }
  update(player, input, now = 0) {
    const interact = !!input.interact, tap = this.mobile ? 'TAP' : '[E]';
    const idle = (prompt = '', mobileLabel = '', extra = {}) => ({ active: !!this.active, transitioned: false, prompt, name: this.active?.name || '', mobileLabel, spaceId: this.unit?.space.id || this.active?.e.spaceId || null, isolated: !!this.active && !this.unit, ...extra });
    if (!this.active) {
      if (player.pos.y > 3) return idle();
      let best = null, bestD = DOOR_REACH;
      for (const it of this.entries) { const dd = Math.hypot(player.pos.x - it.door.x, player.pos.z - it.door.z); if (dd < bestD) { bestD = dd; best = it; } }
      if (!best) return idle();
      if (!interact || !interactionCooldownReady(now, this.transitionReadyAt)) return idle(`${best.name.toUpperCase()} · ${tap} ENTER`, 'ENTER');
      return this.#enter(best, player, now);
    }
    // the lift: in the lobby, and in each apartment
    const lift = this.unit ? { x: this.unit.U.lift.x, y: this.unit.U.level, z: this.unit.U.lift.z } : this.active.apartments ? this.space.liftLobby : null;
    if (lift && Math.hypot(player.pos.x - lift.x, player.pos.z - lift.z) < 1.6 && Math.abs(player.pos.y - lift.y) < 1) {
      const open = interact && interactionCooldownReady(now, this.transitionReadyAt);
      return idle(`ELEVATOR · ${tap} CHOOSE FLOOR`, 'ELEVATOR', open ? { floorMenu: this.floorMenu() } : {});
    }
    if (!this.unit && insideInteractionRange(player.pos, this.exit, 2.2)) {
      if (!interact || !interactionCooldownReady(now, this.transitionReadyAt)) return idle(`EXIT TO THE STREET · ${tap} EXIT`, 'EXIT');
      return this.#leave(player, now);
    }
    return idle();
  }
  // Ride the lift: 1 is the lobby, 2-6 the apartments. Returns the same shape as update(), with the space
  // messages the server needs (leave the current apartment, then enter the next).
  goToFloor(floor, player, now = 0) {
    if (!this.active?.apartments || floor === (this.unit?.floor || 1)) return null;
    const it = this.active, transitions = [];
    if (this.unit) transitions.push({ spaceId: this.unit.space.id, action: 'exit' });
    this.#dispose();
    if (floor === 1) {
      this.#buildLobby(it); const l = this.space.liftLobby;
      player.pos.set(l.x, l.y, l.z + 0.6); player.yaw = Math.PI; // facing out of the lift, toward the street door
    } else {
      this.#buildUnit(it, floor); transitions.push({ spaceId: this.unit.space.id, action: 'enter' });
      const sp = this.unit.space.inside, [nx, nz] = NORMALS[it.e.facing];
      player.pos.set(sp.x, sp.y, sp.z); player.yaw = Math.atan2(-nx, -nz); // facing the street side, the windows and the balcony
    }
    player.vel.set(0, 0, 0); player.onGround = true; this.transitionReadyAt = now + TRANSITION_COOLDOWN;
    return { active: true, transitioned: true, prompt: '', name: it.name, mobileLabel: '', spaceId: this.unit?.space.id || it.e.spaceId, isolated: !this.unit, transitions,
      subtitle: this.unit ? `FLOOR ${floor} · ${PROPERTY_TIERS[this.unit.U.tier].label.toUpperCase()} · VALUE ${PROPERTY_TIERS[this.unit.U.tier].value.toLocaleString('en-US')} SNERDIE` : 'LOBBY · SAFE ZONE' };
  }
  // Leave without a door (mode change, respawn): drop the interior.
  reset() { this.#dispose(); this.active = null; }
  // The server placed this client in a building or an apartment (its confirmation, or a reconnect): make sure
  // that is the one built. The server's state sets the position.
  enterSpace(spaceId) {
    if ((this.unit?.space.id || this.active?.e.spaceId) === spaceId) return true;
    const m = /^(.*)-f(\d)$/.exec(spaceId), base = m && this.entries.some((x) => x.e.spaceId === m[1]) ? m[1] : spaceId;
    const it = this.entries.find((x) => x.e.spaceId === base); if (!it) return false;
    this.#dispose(); this.active = it;
    if (m && base !== spaceId) this.#buildUnit(it, Number(m[2])); else this.#buildLobby(it);
    return true;
  }
  get inApartment() { return !!this.unit; }

  #buildLobby(it) {
    this.layout = interiorLayout(it.e); this.space = { ...interiorSpace(it.e, this.layout), liftLobby: { x: this.layout.doorX, y: this.layout.y, z: this.layout.minZ + LOBBY_LIFT_Z } };
    this.group = this.build(it.e, this.layout); this.scene.add(this.group);
    this.exit = new THREE.Vector3(this.space.exit.x, this.space.exit.y, this.space.exit.z);
  }
  #buildUnit(it, floor) {
    const U = apartmentUnit(it.e, floor);
    this.unit = { floor, U, space: apartmentUnitSpace(it.e, floor, U) };
    // the building's own solid box would hold everyone out of it: set it aside while inside
    if (this.worldColliders && this.removeColliders) { this.shelved = this.worldColliders.filter((c) => c.cityChunk === it.e.buildingId && !c.entrySteps && !c.vehicle); this.removeColliders(this.shelved); }
    this.group = this.buildUnit(it.e, U); this.scene.add(this.group);
  }
  #enter(it, player, now) {
    this.#dispose(); this.active = it; this.#buildLobby(it);
    const s = this.space;
    player.pos.set(s.inside.x, s.inside.y, s.inside.z); player.vel.set(0, 0, 0); player.onGround = true; player.yaw = 0; // facing into the room (south)
    this.transitionReadyAt = now + TRANSITION_COOLDOWN;
    return { active: true, transitioned: true, prompt: '', name: it.name, mobileLabel: '', spaceId: it.e.spaceId, isolated: true, transitions: [{ spaceId: it.e.spaceId, action: 'enter' }],
      subtitle: it.apartments ? 'LOBBY · TAKE THE ELEVATOR TO THE APARTMENTS · SAFE ZONE' : `${residentialPlaque(it.e).line.toUpperCase()} · SAFE ZONE` };
  }
  #leave(player, now) {
    const it = this.active, s = this.space, [nx, nz] = NORMALS[it.e.facing] || NORMALS.east;
    this.#dispose(); this.active = null;
    player.pos.set(s.outside.x, 0, s.outside.z); player.vel.set(0, 0, 0); player.onGround = true; player.yaw = Math.atan2(-nx, -nz); // facing away from the door
    this.transitionReadyAt = now + TRANSITION_COOLDOWN;
    return { active: false, transitioned: true, prompt: '', name: it.name, mobileLabel: '', spaceId: it.e.spaceId, isolated: false, transitions: [{ spaceId: it.e.spaceId, action: 'exit' }] };
  }
  #dispose() {
    if (this.colliders.length) { this.removeColliders?.(this.colliders); this.colliders = []; }
    if (this.shelved.length && this.worldColliders) { this.worldColliders.push(...this.shelved); this.shelved = []; }
    this.unit = null;
    if (!this.group) return;
    this.scene.remove(this.group);
    this.group.traverse((o) => { o.geometry?.dispose?.(); const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; for (const m of mats) { m.map?.dispose?.(); m.dispose?.(); } });
    this.group = null; this.kit.night.length = 0;
  }

  // The interior's meshes, lights and (through addCollider) colliders. Public so the tests can measure it.
  build(e, L) {
    const g = new THREE.Group(); g.name = `interior-${e.spaceId}`;
    const y = L.y, H = L.height, b = new KitBatch(), { M, colors: [cFloor, cWall, cTrim, cAccent, cFabric, cWood, cMetal, cGlow] } = makeMaterials(L.palette, L.maxX - L.minX, L.maxZ - L.minZ);
    const bx = (mat, x0, x1, y0, y1, z0, z1) => b.box(mat, (x0 + x1) / 2, y + (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0);
    const box = (x0, x1, y0, y1, z0, z1, extra = {}) => { const c = this.addCollider?.(x0, z0, x1, z1, y + y0, y + y1, { interior: e.spaceId, ...extra }); if (c) this.colliders.push(c); };
    const cx = (L.minX + L.maxX) / 2, cz = (L.minZ + L.maxZ) / 2, w = L.maxX - L.minX, d = L.maxZ - L.minZ, t = WALL;
    addInteriorIsolationShell(g, [cx, y + H / 2, cz], [w + 8, H + 8, d + 8], `${e.spaceId}-shell`);
    // floor, ceiling, and a skirting trim
    bx(M.floor, L.minX, L.maxX, -0.16, 0, L.minZ, L.maxZ); box(L.minX - 0.3, L.maxX + 0.3, -0.2, 0, L.minZ - 0.3, L.maxZ + 0.3, { step: true });
    bx(M.ceiling, L.minX - t, L.maxX + t, H, H + 0.15, L.minZ - t, L.maxZ + t);
    // outer walls, the door gap in the north wall
    // walls: paint above a panelled dado (accent below a trim rail), a skirting board and a crown moulding
    const wallRun = (x0, x1, z0, z1, solid = true, y0 = 0, y1 = H) => { bx(M.wall, x0, x1, y0 + 1.0, y1, z0, z1); bx(M.accent, x0, x1, y0, y0 + 1.0, z0, z1); bx(M.trim, x0 - 0.01, x1 + 0.01, y0 + 0.96, y0 + 1.04, z0 - 0.02, z1 + 0.02); bx(M.trim, x0 - 0.01, x1 + 0.01, y0, y0 + 0.12, z0 - 0.02, z1 + 0.02); bx(M.trim, x0 - 0.01, x1 + 0.01, y1 - 0.1, y1, z0 - 0.03, z1 + 0.03); if (solid) box(x0, x1, y0, y1, z0, z1); };
    const G = L.upper ? L.upper.y - 0.2 : H; // a two-storey interior's ground-floor ceiling (the upper floor's underside)
    const d0 = L.doorX - L.doorWidth / 2, d1 = L.doorX + L.doorWidth / 2;
    wallRun(L.minX - t, L.maxX + t, L.minZ - t, L.minZ); wallRun(L.minX - t, L.minX, L.minZ, L.maxZ); wallRun(L.maxX, L.maxX + t, L.minZ, L.maxZ);
    wallRun(L.minX - t, d0, L.maxZ, L.maxZ + t); wallRun(d1, L.maxX + t, L.maxZ, L.maxZ + t);
    bx(M.wall, d0, d1, 2.8, H, L.maxZ, L.maxZ + t); box(d0, d1, 0, H, L.maxZ, L.maxZ + t, { door: e.spaceId });
    bx(M.trim, d0 - 0.14, d0, 0, 2.9, L.maxZ - 0.06, L.maxZ); bx(M.trim, d1, d1 + 0.14, 0, 2.9, L.maxZ - 0.06, L.maxZ); bx(M.trim, d0 - 0.14, d1 + 0.14, 2.8, 2.94, L.maxZ - 0.06, L.maxZ); bx(M.trim, d0 - 0.02, d1 + 0.02, 2.36, 2.44, L.maxZ - 0.07, L.maxZ);
    // the street door, seen from inside: panelled double doors with glass lights, handles, a threshold and a transom
    for (const [a0, a1] of [[d0, L.doorX - 0.01], [L.doorX + 0.01, d1]]) {
      bx(M.wood, a0, a1, 0.02, 2.36, L.maxZ - 0.07, L.maxZ - 0.02);
      bx(M.screen, a0 + 0.14, a1 - 0.14, 1.25, 2.2, L.maxZ - 0.08, L.maxZ - 0.07); bx(M.trim, a0 + 0.12, a1 - 0.12, 0.25, 1.05, L.maxZ - 0.085, L.maxZ - 0.07);
    }
    for (const hx of [L.doorX - 0.12, L.doorX + 0.12]) bx(M.metal, hx - 0.02, hx + 0.02, 0.95, 1.2, L.maxZ - 0.12, L.maxZ - 0.07);
    bx(M.metal, d0, d1, 0, 0.02, L.maxZ - 0.12, L.maxZ); bx(M.pane, d0 + 0.05, d1 - 0.05, 2.45, 2.75, L.maxZ - 0.04, L.maxZ - 0.02);
    // windows: glowing panes along the side walls (daylight in, without a view of the sky)
    const step = this.mobile ? 6 : 4;
    for (const base of L.upper ? [0, L.upper.y] : [0]) { const top = L.upper ? (base ? H : G) : H; for (let z = L.minZ + 2.5; z < L.maxZ - 2; z += step) for (const x of [L.minX + 0.02, L.maxX - 0.02]) { bx(M.pane, x - 0.02, x + 0.02, base + Math.min(1.0, top - base - 2), base + Math.min(top - base - 0.5, 2.5), z - 0.75, z + 0.75); bx(M.trim, x - 0.04, x + 0.04, base + Math.min(1.0, top - base - 2) - 0.06, base + Math.min(1.0, top - base - 2), z - 0.85, z + 0.85); } }
    // partitions with doorways
    for (const p of L.partitions) {
      const py = p.y || 0, ph = p.h ? py + p.h : G, cuts = [...p.gaps].sort((a, c) => a[0] - c[0]); let from = p.from;
      const seg = (a, c) => { if (c - a < 0.05) return; if (p.axis === 'x') wallRun(a, c, p.at - 0.08, p.at + 0.08, true, py, ph); else wallRun(p.at - 0.08, p.at + 0.08, a, c, true, py, ph); };
      for (const [c, half] of cuts) {
        seg(from, c - half);
        const along = (a0, a1, y0, y1, out, mat) => (p.axis === 'x' ? bx(mat, a0, a1, py + y0, py + y1, p.at - out, p.at + out) : bx(mat, p.at - out, p.at + out, a0, a1, py + y0, py + y1));
        along(c - half, c + half, 2.3, ph - py, 0.08, M.wall);                                              // the wall over the doorway
        along(c - half - 0.1, c - half, 0, 2.4, 0.11, M.trim); along(c + half, c + half + 0.1, 0, 2.4, 0.11, M.trim); along(c - half - 0.1, c + half + 0.1, 2.3, 2.42, 0.11, M.trim); // the casing
        // a pair of door leaves folded back flat against the wall either side (they never stand in the way)
        for (const sd of [-1, 1]) { const a0 = sd < 0 ? c - half - 0.12 - half : c + half + 0.12, a1 = a0 + half; if (p.axis === 'x') bx(M.wood, a0, a1, py + 0.02, py + 2.2, p.at + 0.09, p.at + 0.13); else bx(M.wood, p.at + 0.09, p.at + 0.13, py + 0.02, py + 2.2, a0, a1); }
        from = c + half;
      }
      seg(from, p.to);
    }
    // the upper floor: its slab (open over the stairs), the stairs themselves, and the landing railing
    if (L.upper) {
      const U2 = L.upper, full = { minX: L.minX, maxX: L.maxX, minZ: L.minZ, maxZ: L.maxZ };
      for (const r of subtractRect(full, [U2.opening])) { bx(M.floor, r.minX, r.maxX, U2.y - 0.04, U2.y, r.minZ, r.maxZ); bx(M.ceiling, r.minX, r.maxX, U2.y - 0.22, U2.y - 0.04, r.minZ, r.maxZ); box(r.minX - SEAM, r.maxX + SEAM, U2.y - 0.22, U2.y, r.minZ - SEAM, r.maxZ + SEAM, { step: true }); } // pieces overlap: no gap at a seam
      const S = L.stairs, st0 = S.steps[0], rise = st0.top, tread = st0.maxZ - st0.minZ, open = st0.maxX; // the open side faces the room
      for (const st of S.steps) {
        bx(M.wood, st.minX, st.maxX, st.top - 0.05, st.top, st.minZ - 0.03, st.maxZ);           // tread (a small nosing)
        bx(M.white, st.minX, st.maxX, st.top - rise, st.top - 0.05, st.maxZ - 0.03, st.maxZ);     // riser
        box(st.minX, st.maxX, 0, st.top, st.minZ, st.maxZ, { step: true, furniture: 'stairs' });
        bx(M.trim, open - 0.04, open + 0.04, st.top, st.top + 0.92, (st.minZ + st.maxZ) / 2 - 0.02, (st.minZ + st.maxZ) / 2 + 0.02); // a baluster
      }
      const run = S.steps.length * tread, slope = Math.atan2(U2.y, run), zMid = (S.steps[0].maxZ + S.steps.at(-1).minZ) / 2, len = Math.hypot(run, U2.y);
      b.add(M.wall, new THREE.BoxGeometry(0.12, 0.45, len).rotateX(-slope).translate(open + 0.06, y + U2.y / 2 - 0.3, zMid));   // the stringer
      b.add(M.wood, new THREE.BoxGeometry(0.08, 0.06, len).rotateX(-slope).translate(open, y + U2.y / 2 + 0.95, zMid));         // the handrail
      for (const zz of [S.steps[0].maxZ, S.steps.at(-1).minZ]) bx(M.wood, open - 0.07, open + 0.07, zz === S.steps[0].maxZ ? 0 : U2.y - 0.2, (zz === S.steps[0].maxZ ? 0 : U2.y) + 1.05, zz - 0.07, zz + 0.07); // newel posts
      for (const r of S.rails) {
        box(r.minX, r.maxX, U2.y, U2.y + 1.05, r.minZ, r.maxZ, { furniture: 'railing' });
        const alongX = r.maxX - r.minX > r.maxZ - r.minZ;
        bx(M.wood, r.minX - 0.02, r.maxX + 0.02, U2.y + 0.98, U2.y + 1.05, r.minZ - 0.02, r.maxZ + 0.02);
        for (let a = (alongX ? r.minX : r.minZ) + 0.1; a < (alongX ? r.maxX : r.maxZ); a += 0.14) alongX ? bx(M.trim, a - 0.015, a + 0.015, U2.y, U2.y + 0.98, r.minZ, r.maxZ) : bx(M.trim, r.minX, r.maxX, U2.y, U2.y + 0.98, a - 0.015, a + 0.015);
      }
    }
    // furniture
    for (const o of L.furniture) {
      const x0 = o.x - o.w / 2, x1 = o.x + o.w / 2, z0 = o.z - o.d / 2, z1 = o.z + o.d / 2, h = o.h, oy = o.y || 0;
      this.#piece(o, { bx, b, M, y, x0, x1, z0, z1, h, oy, bounds: L });
      if (o.collide) box(x0, x1, oy, oy + Math.max(h, 0.05), z0, z1, o.step ? { step: true, furniture: o.type } : { furniture: o.type });
    }
    // ceiling lights: a panel every few metres
    const lightStep = this.mobile ? 6 : 4.5;
    for (const ceil of L.upper ? [G, H] : [H]) for (let lx = L.minX + lightStep / 2; lx < L.maxX; lx += lightStep) for (let lz = L.minZ + lightStep / 2; lz < L.maxZ; lz += lightStep) {
      if (L.upper && ceil === G && lx > L.upper.opening.minX - 0.5 && lx < L.upper.opening.maxX + 0.5 && lz > L.upper.opening.minZ - 0.5 && lz < L.upper.opening.maxZ + 0.5) continue;
      bx(M.glow, lx - 0.45, lx + 0.45, ceil - 0.05, ceil - 0.01, lz - 0.45, lz + 0.45);
    }
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
    }, { w: 1024, h: 260, preview: 0x100e14, day: 0.8, night: 0.8 });
    // the feature wall: a business's name (or the hall's, or the building directory in a lobby)
    const isHome = e.template === 'house', isLobby = e.template === 'apartments' || e.template === 'lofts';
    if (!isHome) {
      const title = buildingName(e).toUpperCase(), line = isLobby ? `MODEL APARTMENT · ${PROPERTY_TIERS[e.tier]?.label.toUpperCase() || ''} · AVAILABLE` : FEATURE_LINE[e.template] || 'NERDIE CITY';
      const feature = signMaterial(this.kit, (ctx, cw, ch) => {
        ctx.fillStyle = '#0d0b12'; ctx.fillRect(0, 0, cw, ch); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = `#${cGlow.toString(16).padStart(6, '0')}`; ctx.shadowBlur = 30; ctx.fillStyle = '#f2d28b'; ctx.font = '700 150px Barlow, sans-serif'; ctx.fillText(title, cw / 2, ch * 0.42, cw * 0.92);
        ctx.shadowBlur = 0; ctx.fillStyle = '#e7e0f4'; ctx.font = '500 52px Barlow, sans-serif'; ctx.fillText(line, cw / 2, ch * 0.8, cw * 0.9);
      }, { w: 1600, h: 320, preview: 0x0d0b12, day: 0.7, night: 0.7 });
      const fw = Math.min(w - 2, isLobby ? 6 : 9), fh = fw * 0.2, fz = L.minZ + 0.05; // a lobby's sign is above the lifts
      const fm = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), feature); fm.position.set(cx, y + Math.min(H - 0.4 - fh / 2, isLobby ? 3.05 : H * 0.62), fz); fm.name = `${e.spaceId}-feature`; g.add(fm);
    }
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.61), sign); plaque.position.set(d1 + 1.8, y + 1.75, L.maxZ - 0.04); plaque.rotation.y = Math.PI; plaque.name = `${e.spaceId}-plaque`; g.add(plaque);
    // lights hang no higher than 4.2 m (tall halls get pendants), and reach the whole room
    const ly = Math.min(H * 0.62, 4.2), reach = Math.hypot(w, d); // well below the ceiling: no scorched spot overhead
    const lights = L.upper ? (this.mobile ? [[cx, G * 0.62, cz, 0xfff0d8, 70, reach]] : [[cx, G * 0.62, cz, 0xfff0d8, 70, reach], [cx, L.upper.y + L.upper.h * 0.62, cz, 0xfff0d8, 60, reach]])
      : this.mobile ? [[cx, ly, cz, 0xfff0d8, 70, reach]] : [[cx, ly, cz + d / 4, 0xfff0d8, 60, reach], [cx, ly, cz - d / 4, 0xfff0d8, 50, reach]];
    const scale = LIGHT_SCALE[e.template] ?? 1;
    // mostly soft, even fill (no hot spots on walls as you walk past); the point lights only add shape
    for (const [lx, ly, lz, c, i, r] of lights) { const light = new THREE.PointLight(c, i * POINT_SHARE * scale, r, 2); light.position.set(lx, y + ly, lz); g.add(light); }
    // a soft fill so no corner goes black (interiors are lit only by their own lights)
    const fill = new THREE.HemisphereLight(0xfff4e6, 0x4a4036, FILL * Math.sqrt(scale)); fill.position.set(cx, y + H, cz); g.add(fill);
    g.traverse((o) => o.layers.set(1));
    return g;
  }

  // An apartment at its real height inside its building (render layer 0: the city is outside its windows).
  // Walls fill the space between the rooms and the facade, with holes exactly where the facade's windows and
  // balcony doors are; the balcony and, for the penthouse, the stairs and the roof terrace are walkable.
  buildUnit(e, U) {
    const g = new THREE.Group(); g.name = `apartment-${e.spaceId}-f${U.floor}`;
    const y = U.level, H = U.height, b = new KitBatch(), I = U.inner, Bd = U.building;
    const palette = U.tier === 'penthouse' ? 'penthouse' : U.tier === 'luxury' ? 'luxury' : (interiorLayout(e).palette);
    const { M, colors } = makeMaterials(palette, I.maxX - I.minX, I.maxZ - I.minZ);
    const glass = new THREE.MeshStandardMaterial({ color: 0xbfd3ea, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.14, depthWrite: false });
    const bx = (mat, x0, x1, y0, y1, z0, z1) => b.box(mat, (x0 + x1) / 2, y + (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0);
    const box = (x0, x1, y0, y1, z0, z1, extra = {}) => { const c = this.addCollider?.(x0, z0, x1, z1, y + y0, y + y1, { interior: e.spaceId, ...extra }); if (c) this.colliders.push(c); };
    // floor and ceiling (the penthouse's ceiling is open above its stairs)
    bx(M.floor, I.minX, I.maxX, -0.16, 0, I.minZ, I.maxZ); box(Bd.minX, Bd.maxX, -0.25, 0, Bd.minZ, Bd.maxZ, { step: true });
    const holes = U.stairs ? [U.stairs.opening] : [];
    for (const r of subtractRect({ minX: Bd.minX, maxX: Bd.maxX, minZ: Bd.minZ, maxZ: Bd.maxZ }, holes)) bx(M.ceiling, r.minX, r.maxX, H, H + 0.12, r.minZ, r.maxZ);
    // the outer walls, from the rooms to the facade, with the facade's openings cut through
    for (const side of ['north', 'south', 'east', 'west']) {
      const ns = NORMALS[side], alongX = !ns[0], ops = U.openings.filter((o) => o.side === side).sort((a, c) => (alongX ? a.x - c.x : a.z - c.z));
      const w0 = ns[0] > 0 ? I.maxX : ns[0] < 0 ? Bd.minX : null, w1 = ns[0] > 0 ? Bd.maxX : ns[0] < 0 ? I.minX : null, d0 = ns[1] > 0 ? I.maxZ : ns[1] < 0 ? Bd.minZ : null, d1 = ns[1] > 0 ? Bd.maxZ : ns[1] < 0 ? I.minZ : null;
      const piece = (a0, a1, y0, y1, solid, mat = M.wall) => {
        if (a1 - a0 < 0.01 || y1 - y0 < 0.01) return;
        if (alongX) { bx(mat, a0, a1, y0, y1, d0, d1); if (solid) box(a0, a1, y0, y1, d0, d1); } else { bx(mat, w0, w1, y0, y1, a0, a1); if (solid) box(w0, w1, y0, y1, a0, a1); }
      };
      const start = alongX ? Bd.minX : Bd.minZ, end = alongX ? Bd.maxX : Bd.maxZ; let at = start;
      for (const o of ops) {
        const c = alongX ? o.x : o.z, a0 = c - o.width / 2, a1 = c + o.width / 2;
        piece(at, a0, 0, H, true);
        piece(a0, a1, 0, o.sill, true, M.accent); piece(a0, a1, o.head, H, false);
        if (!o.door) piece(a0, a1, o.sill, o.head, true, glass); // a window's pane (a balcony doorway stays open: the facade draws its door)
        at = a1;
      }
      piece(at, end, 0, H, true);
      // a dado rail inside, like the other rooms
      if (alongX) bx(M.trim, Bd.minX, Bd.maxX, 0.96, 1.02, ns[1] > 0 ? d0 - 0.02 : d1, ns[1] > 0 ? d0 : d1 + 0.02); else bx(M.trim, ns[0] > 0 ? w0 - 0.02 : w1, ns[0] > 0 ? w0 : w1 + 0.02, 0.96, 1.02, Bd.minZ, Bd.maxZ);
    }
    // rooms: walls with doorways
    for (const r of U.runs) {
      const alongX = r.maxX - r.minX >= r.maxZ - r.minZ, cuts = r.gaps.map((gp) => [alongX ? gp.x : gp.z, gp.half]).sort((a, c) => a[0] - c[0]);
      let at = alongX ? r.minX : r.minZ; const end = alongX ? r.maxX : r.maxZ;
      const seg = (a0, a1) => { if (a1 - a0 < 0.05) return; if (alongX) { bx(M.wall, a0, a1, 0, H, r.minZ, r.maxZ); box(a0, a1, 0, H, r.minZ, r.maxZ); } else { bx(M.wall, r.minX, r.maxX, 0, H, a0, a1); box(r.minX, r.maxX, 0, H, a0, a1); } };
      for (const [c, half] of cuts) { seg(at, c - half); if (alongX) bx(M.wall, c - half, c + half, 2.2, H, r.minZ, r.maxZ); else bx(M.wall, r.minX, r.maxX, 2.2, H, c - half, c + half); at = c + half; }
      seg(at, end);
    }
    const draw = (o, oy = 0) => {
      const x0 = o.x - o.w / 2, x1 = o.x + o.w / 2, z0 = o.z - o.d / 2, z1 = o.z + o.d / 2;
      this.#piece({ ...o, y: oy }, { bx, b, M, y, x0, x1, z0, z1, h: o.h, oy, bounds: U.inner });
      if (o.collide) box(x0, x1, oy, oy + Math.max(o.h, 0.05), z0, z1, { furniture: o.type });
    };
    for (const o of U.furniture) draw(o);
    // the balcony: its floor and rails (the facade draws the slab and the glass)
    if (U.balcony) {
      const B = U.balcony, [fx, fz] = NORMALS[B.front];
      box(B.minX - SEAM, B.maxX + SEAM, -0.25, 0, B.minZ - SEAM, B.maxZ + SEAM, { step: true }); // overlapping the room's floor: no seam at the door
      if (fx) { const xo = fx > 0 ? B.maxX : B.minX; box(Math.min(xo, xo - fx * 0.08), Math.max(xo, xo - fx * 0.08), 0, 1.1, B.minZ, B.maxZ); box(B.minX, B.maxX, 0, 1.1, B.minZ - 0.08, B.minZ); box(B.minX, B.maxX, 0, 1.1, B.maxZ, B.maxZ + 0.08); }
      else { const zo = fz > 0 ? B.maxZ : B.minZ; box(B.minX, B.maxX, 0, 1.1, Math.min(zo, zo - fz * 0.08), Math.max(zo, zo - fz * 0.08)); box(B.minX - 0.08, B.minX, 0, 1.1, B.minZ, B.maxZ); box(B.maxX, B.maxX + 0.08, 0, 1.1, B.minZ, B.maxZ); }
      // (kept clear: a balcony is for standing out over the street)
    }
    // the penthouse: stairs up through the ceiling, and the roof terrace behind the parapet
    if (U.stairs) {
      // a closed stair: each step solid (white risers) under a wooden tread with a small nosing
      for (const st of U.stairs.steps) { bx(M.white, st.minX + 0.02, st.maxX - 0.02, 0, st.top - y - 0.05, st.minZ, st.maxZ); bx(M.wood, st.minX, st.maxX, st.top - y - 0.05, st.top - y, st.minZ - 0.02, st.maxZ + 0.02); box(st.minX, st.maxX, -0.1, st.top - y, st.minZ, st.maxZ, { step: true }); }
    }
    if (U.roof) {
      const R = U.roof, ry = R.y - y, inset = 0.35;
      for (const r of subtractRect(R.rect, [U.stairs.opening])) box(r.minX - SEAM, r.maxX + SEAM, ry - 0.2, ry, r.minZ - SEAM, r.maxZ + SEAM, { step: true }); // overlapping: no gap at a seam
      for (const [x0, x1, z0, z1] of [[R.rect.minX, R.rect.maxX, R.rect.minZ, R.rect.minZ + inset], [R.rect.minX, R.rect.maxX, R.rect.maxZ - inset, R.rect.maxZ], [R.rect.minX, R.rect.minX + inset, R.rect.minZ, R.rect.maxZ], [R.rect.maxX - inset, R.rect.maxX, R.rect.minZ, R.rect.maxZ]]) box(x0, x1, ry, ry + 1.15, z0, z1); // the parapet (kept high enough that nobody falls)
      // a deck over the roof, open over the stairwell (so the stairs below see the sky), with a railing round the opening
      for (const r of subtractRect({ minX: R.rect.minX + inset, maxX: R.rect.maxX - inset, minZ: R.rect.minZ + inset, maxZ: R.rect.maxZ - inset }, [U.stairs.opening])) bx(M.floor, r.minX, r.maxX, ry, ry + 0.03, r.minZ, r.maxZ);
      for (const rail of U.stairs.rails || []) {
        box(rail.minX, rail.maxX, ry, ry + 1.05, rail.minZ, rail.maxZ, { furniture: 'railing' });
        const alongX = rail.maxX - rail.minX > rail.maxZ - rail.minZ;
        bx(M.metal, rail.minX - 0.02, rail.maxX + 0.02, ry + 0.98, ry + 1.05, rail.minZ - 0.02, rail.maxZ + 0.02);
        for (let a = (alongX ? rail.minX : rail.minZ) + 0.1; a < (alongX ? rail.maxX : rail.maxZ); a += 0.14) alongX ? bx(M.metal, a - 0.015, a + 0.015, ry, ry + 0.98, rail.minZ, rail.maxZ) : bx(M.metal, rail.minX, rail.maxX, ry, ry + 0.98, a - 0.015, a + 0.015);
      }
      for (const o of R.furniture) draw(o, ry + 0.03);
      for (const [x, z] of [[R.rect.minX + 0.6, R.rect.minZ + 0.6], [R.rect.maxX - 0.6, R.rect.minZ + 0.6], [R.rect.minX + 0.6, R.rect.maxZ - 0.6], [R.rect.maxX - 0.6, R.rect.maxZ - 0.6]]) { bx(M.metal, x - 0.04, x + 0.04, ry, ry + 2.2, z - 0.04, z + 0.04); bx(M.glow, x - 0.12, x + 0.12, ry + 2.2, ry + 2.36, z - 0.12, z + 0.12); } // terrace lanterns
    }
    // ceiling lights and a plaque by the lift
    const cx = (I.minX + I.maxX) / 2, cz = (I.minZ + I.maxZ) / 2;
    for (let lx = I.minX + 2.2; lx < I.maxX - 1; lx += 4.2) for (let lz = I.minZ + 2.2; lz < I.maxZ - 1; lz += 4.2) bx(M.glow, lx - 0.4, lx + 0.4, H - 0.04, H - 0.005, lz - 0.4, lz + 0.4);
    b.build(g, `${e.spaceId}-f${U.floor}`, { castShadow: false });
    const tier = PROPERTY_TIERS[U.tier], sign = signMaterial(this.kit, (ctx, cw, ch) => {
      ctx.fillStyle = '#100e14'; ctx.fillRect(0, 0, cw, ch); ctx.strokeStyle = '#c19a49'; ctx.lineWidth = 8; ctx.strokeRect(8, 8, cw - 16, ch - 16); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f2d28b'; ctx.font = '700 60px Barlow, sans-serif'; ctx.fillText(`FLOOR ${U.floor} · ${U.title.toUpperCase()}`, cw / 2, ch * 0.32, cw * 0.92);
      ctx.fillStyle = '#e7e0f4'; ctx.font = '500 34px Barlow, sans-serif'; ctx.fillText(`Value ${tier.value.toLocaleString('en-US')} sNERDIE · about ${U.area} m²`, cw / 2, ch * 0.6, cw * 0.9);
      ctx.fillStyle = '#b7a9db'; ctx.font = '400 30px Barlow, sans-serif'; ctx.fillText(buildingName(e), cw / 2, ch * 0.82, cw * 0.9);
    }, { w: 1024, h: 260, preview: 0x100e14, day: 0.8, night: 0.8 });
    const [nx, nz] = NORMALS[e.facing], plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.48), sign);
    plaque.position.set(U.lift.x + nx * -0.55 + nz * 1.9, y + 1.75, U.lift.z + nz * -0.55 - nx * 1.9); plaque.rotation.y = Math.atan2(nx, nz); g.add(plaque);
    // light: one or two warm lights well below the ceiling and a soft fill (the city's sky light comes in too)
    const ly = H * 0.62, reach = Math.hypot(I.maxX - I.minX, I.maxZ - I.minZ), scale = U.tier === 'penthouse' ? 0.62 : 1.0; // measured in the city: lower floors a touch brighter, the pale penthouse softer
    const lights = this.mobile ? [[cx, cz, 60]] : [[cx, cz - (I.maxZ - I.minZ) / 4, 50], [cx, cz + (I.maxZ - I.minZ) / 4, 45]];
    for (const [lx, lz, i] of lights) { const light = new THREE.PointLight(colors[7], i * POINT_SHARE * scale, reach, 2); light.position.set(lx, y + ly, lz); g.add(light); }
    const fill = new THREE.HemisphereLight(0xfff4e6, 0x4a4036, 0.9); fill.position.set(cx, y + H, cz); g.add(fill);
    if (U.roof) { const lamp = new THREE.PointLight(0xffd9a0, 25, 16, 2); lamp.position.set(cx, U.roof.y + 2.4, cz); g.add(lamp); }
    return g;
  }

  // Furniture with real shape: a piece's back is the side nearer a wall (bounds), its front faces the room.
  // Returns false for anything drawn the simple way (#piece).
  #detail(o, { bx, b, M, y, x0, x1, z0, z1, h, oy, bounds }) {
    const xs = x1 - x0, zs = z1 - z0, alongX = xs >= zs, B = bounds || { minX: -1e9, maxX: 1e9, minZ: -1e9, maxZ: 1e9 };
    // o.back: which side the piece's back is on ('minX'|'maxX'|'minZ'|'maxZ'); otherwise the side nearer a wall
    const backMin = o.back ? o.back === 'minX' || o.back === 'minZ' : alongX ? z0 - B.minZ <= B.maxZ - z1 : x0 - B.minX <= B.maxX - x1;
    const A0 = alongX ? x0 : z0, A1 = alongX ? x1 : z1, len = A1 - A0, D = alongX ? zs : xs;
    // a box spanning a0..a1 along the piece, d0..d1 measured from its back, y0..y1 up from its base
    const part = (mat, a0, a1, d0, d1, y0, y1) => {
      if (alongX) { const za = backMin ? z0 + d0 : z1 - d1, zb = backMin ? z0 + d1 : z1 - d0; bx(mat, a0, a1, oy + y0, oy + y1, za, zb); }
      else { const xa = backMin ? x0 + d0 : x1 - d1, xb = backMin ? x0 + d1 : x1 - d0; bx(mat, xa, xb, oy + y0, oy + y1, a0, a1); }
    };
    const feet = (y1, inset = 0.06, r = 0.03, mat = M.metal) => { for (const a of [A0 + inset, A1 - inset]) for (const dd of [inset, D - inset]) part(mat, a - r, a + r, dd - r, dd + r, 0, y1); };
    const cyl = (mat, a, dd, y0, hh, r, seg = 18) => { const px = alongX ? a : backMin ? x0 + dd : x1 - dd, pz = alongX ? (backMin ? z0 + dd : z1 - dd) : a; b.cyl(mat, px, y + oy + y0 + hh / 2, pz, r, hh, seg); };
    switch (o.type) {
      case 'sofa': case 'armchair': {
        const arm = o.type === 'armchair' ? 0.16 : 0.2, seat = 0.44, n = o.type === 'armchair' ? 1 : Math.max(2, Math.round((len - 2 * arm) / 0.95)), seg = (len - 2 * arm) / n;
        feet(0.1); part(M.fabric, A0, A1, 0, D, 0.1, seat - 0.12);
        for (let i = 0; i < n; i++) { const a = A0 + arm + seg * i; part(M.fabric, a + 0.02, a + seg - 0.02, 0.24, D - 0.03, seat - 0.12, seat + 0.04); part(M.fabric, a + 0.03, a + seg - 0.03, 0.04, 0.26, seat - 0.05, h); }
        part(M.accent, A0, A1, 0, 0.06, 0.1, h + 0.02);
        for (const [a0, a1] of [[A0, A0 + arm], [A1 - arm, A1]]) part(M.fabric, a0, a1, 0, D, 0.1, seat + 0.2);
        return true;
      }
      case 'bed': {
        // long axis along the bed's length; the headboard on the end nearer a wall
        const lx = o.back ? o.back.endsWith('Z') : zs >= xs, a0 = lx ? x0 : z0, a1 = lx ? x1 : z1, l0 = lx ? z0 : x0, l1 = lx ? z1 : x1, headMin = o.back ? o.back.startsWith('min') : lx ? z0 - B.minZ <= B.maxZ - z1 : x0 - B.minX <= B.maxX - x1;
        const seg = (mat, w0, w1, d0, d1, y0, y1) => { const p0 = headMin ? l0 + d0 : l1 - d1, p1 = headMin ? l0 + d1 : l1 - d0; lx ? bx(mat, w0, w1, oy + y0, oy + y1, p0, p1) : bx(mat, p0, p1, oy + y0, oy + y1, w0, w1); };
        const L2 = l1 - l0, W2 = a1 - a0;
        seg(M.wood, a0, a1, 0.08, L2, 0.12, 0.34); seg(M.accent, a0 - 0.04, a1 + 0.04, 0, 0.08, 0, 1.15); seg(M.wood, a0, a1, L2 - 0.05, L2, 0, 0.42); // frame, headboard, footboard
        for (const w of [a0 + 0.05, a1 - 0.1]) for (const dd of [0.12, L2 - 0.1]) seg(M.wood, w, w + 0.05, dd - 0.03, dd + 0.03, 0, 0.12);
        seg(M.white, a0 + 0.04, a1 - 0.04, 0.1, L2 - 0.06, 0.34, h - 0.02);                                       // mattress
        seg(M.fabric, a0 + 0.02, a1 - 0.02, 0.62, L2 - 0.04, h - 0.04, h + 0.03); seg(M.fabric, a0, a1, L2 - 0.08, L2 - 0.04, 0.3, h); // duvet, its fall at the foot
        for (const pw of W2 > 1.7 ? [[a0 + 0.12, (a0 + a1) / 2 - 0.06], [(a0 + a1) / 2 + 0.06, a1 - 0.12]] : [[a0 + 0.12, a1 - 0.12]]) seg(M.white, pw[0], pw[1], 0.14, 0.52, h - 0.02, h + 0.14); // pillows
        return true;
      }
      case 'counter': case 'island': {
        if (o.type === 'counter' && o.h > 0.95) return false; // shop counters stay plain
        const top = o.h, plinth = 0.1, doors = Math.max(1, Math.round(len / 0.6)), dw = len / doors;
        part(M.dark, A0 + 0.02, A1 - 0.02, 0.04, D - 0.06, 0, plinth); part(M.wood, A0, A1, 0, D - 0.02, plinth, top - 0.04);
        for (let i = 0; i < doors; i++) { const a = A0 + dw * i; part(M.wood, a + 0.015, a + dw - 0.015, D - 0.02, D, plinth + 0.02, top - 0.08); part(M.metal, a + dw / 2 - 0.08, a + dw / 2 + 0.08, D, D + 0.02, top - 0.2, top - 0.17); }
        part(M.white, A0 - 0.02, A1 + 0.02, -0.0, D + (o.type === 'island' ? 0.25 : 0.03), top - 0.04, top);             // stone top (an island's overhangs for stools)
        if (o.type === 'counter') {
          const sinkA = A0 + len * 0.3, hob = A0 + len * 0.72;
          part(M.dark, sinkA - 0.32, sinkA + 0.32, 0.12, D - 0.12, top - 0.02, top + 0.003); part(M.metal, sinkA - 0.02, sinkA + 0.02, 0.06, 0.1, top, top + 0.32);  // basin and tap
          part(M.dark, hob - 0.3, hob + 0.3, 0.1, D - 0.1, top, top + 0.012); for (const [da, dd] of [[-0.15, 0.22], [0.15, 0.22], [-0.15, D - 0.24], [0.15, D - 0.24]]) part(M.metal, hob + da - 0.08, hob + da + 0.08, dd - 0.08, dd + 0.08, top + 0.012, top + 0.02);
          part(M.white, A0, A1, 0, 0.02, top, top + 0.6);                                                            // tiled splashback
          part(M.wood, A0, A1, 0, 0.36, top + 0.62, top + 1.4); for (let i = 0; i < doors; i++) { const a = A0 + dw * i; part(M.wood, a + 0.015, a + dw - 0.015, 0.36, 0.38, top + 0.64, top + 1.38); part(M.metal, a + dw / 2 - 0.06, a + dw / 2 + 0.06, 0.38, 0.4, top + 0.68, top + 0.71); } // wall cupboards
        } else for (let i = 0; i < Math.max(2, Math.floor(len / 0.7)); i++) { const a = A0 + 0.35 + i * ((len - 0.7) / Math.max(1, Math.max(2, Math.floor(len / 0.7)) - 1)); cyl(M.metal, a, D + 0.42, 0, 0.62, 0.03, 8); cyl(M.fabric, a, D + 0.42, 0.62, 0.06, 0.2, 14); } // stools
        return true;
      }
      case 'fridge': {
        part(M.metal, A0, A1, 0, D, 0, h); part(M.dark, A0 + 0.01, A1 - 0.01, D, D + 0.005, h * 0.62, h * 0.625);
        for (const [y0, y1] of [[h * 0.66, h * 0.95], [0.15, h * 0.58]]) part(M.white, A0 + 0.03, A0 + 0.06, D, D + 0.04, y0, y1);
        return true;
      }
      case 'wardrobe': {
        part(M.wood, A0, A1, 0, D, 0, h); const n = Math.max(2, Math.round(len / 0.55)), dw = len / n;
        for (let i = 0; i < n; i++) { const a = A0 + dw * i; part(M.wood, a + 0.01, a + dw - 0.01, D, D + 0.02, 0.06, h - 0.06); part(M.metal, a + (i % 2 ? 0.05 : dw - 0.07), a + (i % 2 ? 0.07 : dw - 0.05), D + 0.02, D + 0.04, h * 0.42, h * 0.58); }
        return true;
      }
      case 'toilet': {
        part(M.white, A0 + 0.05, A1 - 0.05, 0, 0.18, 0.35, 0.78);                                  // cistern
        cyl(M.white, (A0 + A1) / 2, D * 0.58, 0, 0.36, Math.min(len, D) * 0.34); cyl(M.white, (A0 + A1) / 2, D * 0.58, 0.36, 0.06, Math.min(len, D) * 0.4); // pan and seat
        return true;
      }
      case 'sink': {
        part(M.wood, A0, A1, 0, D, 0.12, 0.82); part(M.white, A0 - 0.02, A1 + 0.02, 0, D + 0.02, 0.82, 0.86);
        const n = len > 1.1 ? 2 : 1; for (let i = 0; i < n; i++) { const a = A0 + (len / n) * (i + 0.5); part(M.dark, a - 0.22, a + 0.22, 0.12, D - 0.1, 0.84, 0.865); part(M.metal, a - 0.02, a + 0.02, 0.04, 0.1, 0.86, 1.1); }
        part(M.screen, A0 + 0.05, A1 - 0.05, -0.02, 0, 1.15, 1.95);                                 // the mirror on the wall
        return true;
      }
      case 'tub': {
        part(M.white, A0, A1, 0, D, 0, h); part(M.screen, A0 + 0.08, A1 - 0.08, 0.08, D - 0.08, h - 0.06, h - 0.01);
        part(M.metal, A0 + 0.12, A0 + 0.16, 0.02, 0.06, h, h + 0.3); return true;
      }
      case 'lamp': {
        const cx = (A0 + A1) / 2, dd = D / 2; cyl(M.metal, cx, dd, 0, 0.03, 0.18); cyl(M.metal, cx, dd, 0.03, h - 0.35, 0.02, 8); cyl(M.glow, cx, dd, h - 0.36, 0.34, 0.2, 16); return true;
      }
      case 'table': {
        if (!o.chairs) return false;
        part(M.wood, A0, A1, 0, D, h - 0.05, h); feet(h - 0.05, 0.08, 0.035, M.wood);
        // chairs: down both long sides, one at each end
        const per = Math.max(1, Math.floor((o.chairs - 2) / 2)), chair = (a, dd, faceBack) => { part(M.wood, a - 0.22, a + 0.22, dd - 0.22, dd + 0.22, 0.44, 0.48); feet; part(M.wood, a - 0.22, a + 0.22, faceBack ? dd + 0.18 : dd - 0.22, faceBack ? dd + 0.22 : dd - 0.18, 0.48, 0.95); for (const [la, ld] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) part(M.wood, a + la - 0.02, a + la + 0.02, dd + ld - 0.02, dd + ld + 0.02, 0, 0.44); };
        for (let i = 0; i < per; i++) { const a = A0 + (len / per) * (i + 0.5); chair(a, -0.35, false); chair(a, D + 0.35, true); }
        return true;
      }
      case 'lift': {
        // a lift landing: a stainless frame, two brushed doors with a centre seam, a lit call button and a floor indicator
        if (D > 0.6) { part(M.wall, A0, A1, 0, D - 0.07, 0, 3.0); part(M.trim, A0, A1, 0, D - 0.07, 0, 0.1); } // an apartment's lift shaft is a clad core, the doors on its face
        part(M.trim, A0 - 0.12, A0, 0, D + 0.06, 0, 2.5); part(M.trim, A1, A1 + 0.12, 0, D + 0.06, 0, 2.5); part(M.trim, A0 - 0.12, A1 + 0.12, 0, D + 0.06, 2.38, 2.55);
        const da0 = (A0 + A1) / 2 - Math.min(0.75, len / 2 - 0.1), da1 = (A0 + A1) / 2 + Math.min(0.75, len / 2 - 0.1); // a 1.5 m pair of doors
        part(M.dark, da0, da1, D - 0.07, D - 0.04, 0, 2.3);
        part(M.metal, da0 + 0.02, (da0 + da1) / 2 - 0.005, D - 0.05, D - 0.01, 0.02, 2.28); part(M.metal, (da0 + da1) / 2 + 0.005, da1 - 0.02, D - 0.05, D - 0.01, 0.02, 2.28);
        part(M.trim, da0 - 0.1, da0, D - 0.07, D + 0.04, 0, 2.38); part(M.trim, da1, da1 + 0.1, D - 0.07, D + 0.04, 0, 2.38); part(M.trim, da0 - 0.1, da1 + 0.1, D - 0.07, D + 0.04, 2.3, 2.42);
        part(M.glow, (A0 + A1) / 2 - 0.25, (A0 + A1) / 2 + 0.25, D, D + 0.04, 2.62, 2.74);               // the floor indicator
        part(M.metal, A1 + 0.2, A1 + 0.34, D - 0.02, D + 0.02, 1.0, 1.3); part(M.glow, A1 + 0.24, A1 + 0.3, D + 0.02, D + 0.035, 1.12, 1.18); // call button
        return true;
      }
      default: return false;
    }
  }

  // One piece of furniture, as a few boxes in the room's palette.
  #piece(o, ctx) {
    if (this.#detail(o, ctx)) return;
    const { bx, b, M, y, x0, x1, z0, z1, h, oy } = ctx;
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
