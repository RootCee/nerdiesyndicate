import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { insideInteractionRange, interactionCooldownReady } from './city-layout.js';
import { addInteriorIsolationShell, wallCollider } from './apartment-system.js';
import { KitBatch, signMaterial, PALETTE } from './city-showcase-kit.js';
import { gunShopInterior, gunShopSpace, GUN_SHOP_RULES } from './gun-shop-layout.js';
import { economicMinuteOfDay } from './resident-schedule.js';
import { isStoreOpen } from './store-hours.js';

// Ammo (the gun shop) interior: like the other interiors it sits high above the city on render layer 1,
// with its own colliders. Customers come in from West Avenue, restock at the counter, and pick a
// weapon at the display cases. The server owns ammo (gun-shop-layout.js applyShopIntent).
const TRANSITION_COOLDOWN = 0.65;
export const WEAPON_LABELS = Object.freeze({ ak: 'AK-47', mac10: 'MAC-10', mp5: 'MP5', m700: 'M700 RIFLE', rpg: 'RPG-7' });

// Low-poly display models, built along +x (muzzle) in a local frame.
function weaponModel(batch, m, id, x, y, z, s = 1) {
  const b = (mat, cx, cy, cz, sx, sy, sz) => batch.box(mat, x + cx * s, y + cy * s, z + cz * s, sx * s, sy * s, sz * s);
  const metal = m.frame, wood = m.trunk;
  if (id === 'rpg') { batch.add(metal, new THREE.CylinderGeometry(0.05 * s, 0.05 * s, 1.0 * s, 10).rotateZ(Math.PI / 2).translate(x, y, z)); batch.add(m.green, new THREE.ConeGeometry(0.09 * s, 0.32 * s, 10).rotateZ(-Math.PI / 2).translate(x + 0.62 * s, y, z)); b(wood, -0.1, -0.08, 0, 0.08, 0.14, 0.04); return; }
  const len = id === 'm700' ? 1.1 : id === 'mac10' ? 0.42 : id === 'mp5' ? 0.7 : 0.88;
  b(metal, 0, 0, 0, len * 0.42, 0.08, 0.05);                                   // receiver
  b(metal, len * 0.36, 0.02, 0, len * 0.42, 0.025, 0.025);                     // barrel
  if (id !== 'mac10') b(id === 'ak' || id === 'm700' ? wood : metal, -len * 0.33, -0.01, 0, len * 0.26, 0.07, 0.04); // stock
  b(id === 'ak' ? wood : metal, len * 0.16, -0.005, 0, len * 0.16, 0.06, 0.055); // handguard
  b(metal, -0.02, -0.09, 0, 0.04, 0.1, 0.035);                                 // grip
  if (id === 'ak') batch.add(metal, new THREE.BoxGeometry(0.05 * s, 0.16 * s, 0.035 * s).rotateZ(0.35).translate(x + 0.07 * s, y - 0.1 * s, z));
  else if (id !== 'm700') b(metal, 0.06, -0.1, 0, 0.035, id === 'mac10' ? 0.2 : 0.14, 0.03);
  if (id === 'm700') batch.add(metal, new THREE.CylinderGeometry(0.025 * s, 0.025 * s, 0.32 * s, 8).rotateZ(Math.PI / 2).translate(x + 0.02 * s, y + 0.08 * s, z));
}

export class GunShopSystem {
  // storeMinute: the economic minute of day (Pacific) that store hours follow (store-hours.js).
  constructor(scene, site, { addCollider, mobile = false, kit = null, storeMinute = () => economicMinuteOfDay() } = {}) {
    this.scene = scene; this.site = site; this.addCollider = addCollider; this.mobile = mobile; this.kit = kit; this.storeMinute = storeMinute;
    this.active = false; this.prompt = ''; this.transitionReadyAt = 0; this.actionReadyAt = 0;
    this.layout = gunShopInterior(site); this.space = gunShopSpace(site);
    this.exterior = new THREE.Group(); this.exterior.name = `gun-shop-exterior-${site.id}`; // the facade is part of the showcase (city-showcase.js)
    this.interior = new THREE.Group(); this.interior.name = `gun-shop-interior-${site.id}`; this.interior.visible = false;
    scene.add(this.interior);
    this.buildInterior();
    this.interior.traverse((o) => o.layers.set(1));
    const v = (p) => new THREE.Vector3(p.x, p.y, p.z);
    this.entry = v(this.space.entry); this.insideSpawn = v(this.space.inside); this.exit = v(this.space.exit); this.outsideSpawn = v(this.space.outside);
  }

  buildInterior() {
    const L = this.layout, y = L.y, h = L.height, g = this.interior, kit = this.kit;
    const m = kit?.m || null, batch = new KitBatch();
    const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.r ?? 0.8, metalness: o.metal ?? 0, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 0 });
    // with no showcase kit (?showcase=0) the interior still works, in plain materials
    const constantLamp = std(0x3a3328, { e: 0xffdcaa, ei: 1.1 }); // indoor light does not follow the city's night level
    const M = m ? { ...m, lamp: constantLamp } : { darkBrick: std(0x34363c), stucco: std(0xb5ada1), charcoal: std(PALETTE.charcoal, { r: 0.5, metal: 0.3 }), frame: std(0x24272d, { metal: 0.5 }), gold: std(PALETTE.gold, { r: 0.35, metal: 0.7 }), purple: std(PALETTE.purple), green: std(PALETTE.green), trunk: std(0x5d4434), concrete: std(0xb5ada1), glass: std(0x1b2a3a, { r: 0.1, metal: 0.6 }), lamp: std(0x3a3328, { e: 0xffd9a0, ei: 2 }), neonPurple: std(PALETTE.purple, { e: 0x9b4dff, ei: 2.5 }), pavers: std(0x5a5650) };
    const cx = (L.minX + L.maxX) / 2, cz = (L.minZ + L.maxZ) / 2, w = L.maxX - L.minX, d = L.maxZ - L.minZ, t = 0.2;
    const coverGlass = new THREE.MeshStandardMaterial({ color: 0xcfe0ee, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false }); coverGlass.name = 'gun-shop-case-glass';
    addInteriorIsolationShell(g, [cx, y + 5, cz], [30, 14, 28], 'gun-shop-isolation-shell');
    // floor: dark tiles; walls: charcoal brick below a purple stripe, painted concrete above
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x4a4744, map: m ? m.pavers.map : null, roughness: 0.75 });
    batch.add(floorMat, new THREE.BoxGeometry(w, 0.16, d).translate(cx, y - 0.08, cz));
    if (m) floorMat.userData.tile = [1.2, 1.2];
    const wallBox = (x0, x1, z0, z1) => { batch.box(M.darkBrick, (x0 + x1) / 2, y + 1.3, (z0 + z1) / 2, x1 - x0, 2.6, z1 - z0); batch.box(M.stucco, (x0 + x1) / 2, y + 2.6 + (h - 2.6) / 2, (z0 + z1) / 2, x1 - x0, h - 2.6, z1 - z0); };
    wallBox(L.minX - t, L.maxX + t, L.minZ - t, L.minZ); wallBox(L.minX - t, L.maxX + t, L.maxZ, L.maxZ + t); wallBox(L.maxX, L.maxX + t, L.minZ, L.maxZ);
    const door = L.doorWidth, wing0 = L.doorZ - door / 2, wing1 = L.doorZ + door / 2;
    wallBox(L.minX - t, L.minX, L.minZ, wing0); wallBox(L.minX - t, L.minX, wing1, L.maxZ);
    batch.box(M.stucco, L.minX - t / 2, y + 2.5 + (h - 2.5) / 2, L.doorZ, t, h - 2.5, door);
    for (const [x0, x1, z0, z1] of [[L.minX, L.maxX, L.minZ, L.minZ + 0.02], [L.minX, L.maxX, L.maxZ - 0.02, L.maxZ], [L.maxX - 0.02, L.maxX, L.minZ, L.maxZ]]) batch.box(M.purple, (x0 + x1) / 2, y + 2.62, (z0 + z1) / 2, Math.max(0.02, x1 - x0), 0.12, Math.max(0.02, z1 - z0));
    // door (inside face) with a gold push bar
    batch.box(M.charcoal, L.minX + 0.04, y + 1.2, L.doorZ, 0.08, 2.4, door - 0.1); batch.box(M.gold, L.minX + 0.1, y + 1.1, L.doorZ, 0.05, 0.06, door * 0.6);
    // counter with a gold edge, a register, ammo boxes; gates at both ends
    const C = L.counter, ch = C.height;
    batch.box(M.charcoal, C.x, y + ch / 2, (C.minZ + C.maxZ) / 2, C.depth, ch, C.maxZ - C.minZ); batch.box(M.trunk, C.x, y + ch + 0.03, (C.minZ + C.maxZ) / 2, C.depth + 0.12, 0.06, C.maxZ - C.minZ + 0.12);
    batch.box(M.gold, C.x - C.depth / 2 - 0.02, y + ch - 0.06, (C.minZ + C.maxZ) / 2, 0.03, 0.05, C.maxZ - C.minZ);
    batch.box(M.frame, C.x + 0.1, y + ch + 0.2, L.doorZ + 1.4, 0.4, 0.34, 0.45); batch.box(M.green, C.x + 0.1, y + ch + 0.42, L.doorZ + 1.4, 0.3, 0.08, 0.35);
    for (let i = 0; i < 6; i++) batch.box(i % 2 ? M.green : M.trunk, C.x - 0.1, y + ch + 0.1 + Math.floor(i / 3) * 0.17, L.doorZ - 0.6 - (i % 3) * 0.32, 0.26, 0.16, 0.28);
    for (const [z0, z1] of [[L.minZ, C.minZ], [C.maxZ, L.maxZ]]) { batch.box(M.trunk, C.x, y + 0.55, (z0 + z1) / 2, 0.08, 1.1, z1 - z0); batch.box(M.gold, C.x, y + 1.12, (z0 + z1) / 2, 0.1, 0.04, z1 - z0); }
    // the gun wall behind the counter: pegboard, rifles on hooks, a neon sign above
    batch.box(M.trunk, L.maxX - 0.06, y + 2.1, cz, 0.06, 2.2, d - 1.2);
    const rackIds = ['ak', 'mp5', 'm700', 'ak', 'mac10', 'mp5', 'm700', 'ak'];
    rackIds.forEach((id, i) => { const z = L.minZ + 1.2 + i * ((d - 2.4) / (rackIds.length - 1)); for (const yy of [1.6, 2.6]) { weaponModelRotated(batch, M, id, L.maxX - 0.16, y + yy, z); batch.box(M.gold, L.maxX - 0.12, y + yy + 0.12, z, 0.04, 0.04, 0.3); } });
    const neon = signMaterial(kit || { night: [], mobile: this.mobile }, (ctx, cw, chh) => { ctx.fillStyle = '#0d0b10'; ctx.fillRect(0, 0, cw, chh); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = '#a35cff'; ctx.shadowBlur = 30; ctx.fillStyle = '#ead8ff'; ctx.font = '700 150px Barlow, sans-serif'; ctx.fillText('AMMO', cw / 2, chh / 2 + 6); }, { w: 1024, h: 220, day: 1.4, night: 1.4, preview: PALETTE.purple });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.0), neon); sign.position.set(L.maxX - 0.11, y + 3.55, cz); sign.rotation.y = -Math.PI / 2; sign.name = 'gun-shop-neon'; g.add(sign);
    // display cases along the south wall, one per weapon, with a name card
    for (const st of L.stations) {
      batch.box(M.charcoal, st.x, y + 0.45, st.z, 1.15, 0.9, 0.9); batch.box(M.gold, st.x, y + 0.92, st.z, 1.18, 0.04, 0.93);
      batch.box(M.trunk, st.x, y + 0.95, st.z, 1.04, 0.02, 0.8); // felt-lined top
      weaponModel(batch, M, st.weaponId, st.x - (st.weaponId === 'm700' ? 0.05 : 0), y + 1.06, st.z, st.weaponId === 'm700' ? 0.82 : 0.95);
      batch.box(coverGlass, st.x, y + 1.13, st.z, 1.1, 0.34, 0.86); // a clear cover over it
      const card = signMaterial(kit || { night: [], mobile: this.mobile }, (ctx, cw, chh) => { ctx.fillStyle = hexCss(PALETTE.green); ctx.fillRect(0, 0, cw, chh); ctx.strokeStyle = hexCss(PALETTE.gold); ctx.lineWidth = 8; ctx.strokeRect(6, 6, cw - 12, chh - 12); ctx.fillStyle = '#f0d28a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 60px Barlow, sans-serif'; ctx.fillText(WEAPON_LABELS[st.weaponId], cw / 2, chh / 2); }, { w: 512, h: 128, day: 0.6, night: 0.6, preview: PALETTE.green });
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.22), card); plate.position.set(st.x, y + 0.7, st.z + 0.46); plate.name = `gun-shop-card-${st.weaponId}`; g.add(plate);
    }
    // ammo shelves on the north wall, posters, ceiling light bars
    const shelfX0 = L.minX + 1.4, shelfX1 = C.x - 1.4;
    for (const yy of [0.5, 1.2, 1.9]) { batch.box(M.frame, (shelfX0 + shelfX1) / 2, y + yy, L.maxZ - 0.3, shelfX1 - shelfX0, 0.05, 0.55); for (let x = shelfX0 + 0.3; x < shelfX1 - 0.2; x += 0.42) batch.box(Math.round(x * 7 + yy * 3) % 3 ? M.green : M.trunk, x, y + yy + 0.14, L.maxZ - 0.32, 0.32, 0.22, 0.4); }
    for (const x of [shelfX0, shelfX1]) batch.box(M.frame, x, y + 1.05, L.maxZ - 0.3, 0.05, 2.1, 0.55);
    for (const x of [L.minX + 3, cx + 1, L.maxX - 2.2]) { batch.box(M.frame, x, y + h - 0.3, cz, 0.04, 0.6, 0.04); batch.box(M.frame, x, y + h - 0.62, cz, 0.2, 0.06, d - 2.4); batch.box(M.lamp, x, y + h - 0.66, cz, 0.12, 0.02, d - 2.6); }
    // a dark ceiling (the camera stays below it inside the 4.2 m room)
    batch.box(M.charcoal, cx, y + h + 0.05, cz, w + 0.4, 0.1, d + 0.4);
    batch.build(g, 'gun-shop-interior', { castShadow: false });
    // two warm lights (one on mobile), on the interior layer like the other interiors
    const lights = this.mobile ? [[cx, cz]] : [[L.minX + 3.4, cz], [C.x + 1.6, cz]];
    for (const [lx, lz] of lights) { const light = new THREE.PointLight(0xffd6a0, this.mobile ? 38 : 42, 14, 2); light.position.set(lx, y + 3.1, lz); light.name = 'gun-shop-light'; g.add(light); }
    this.addColliders();
  }

  addColliders() {
    const L = this.layout, y = L.y, h = L.height, t = 0.3, id = this.site.id, C = L.counter, ac = this.addCollider;
    const cx = (L.minX + L.maxX) / 2, cz = (L.minZ + L.maxZ) / 2, w = L.maxX - L.minX, d = L.maxZ - L.minZ;
    wallCollider(ac, cx, y - 0.05, cz, w + 0.6, 0.2, d + 0.6, { step: true, interior: id });
    wallCollider(ac, cx, y + h / 2, L.minZ - t / 2, w + 0.6, h, t, { interior: id }); wallCollider(ac, cx, y + h / 2, L.maxZ + t / 2, w + 0.6, h, t, { interior: id });
    wallCollider(ac, L.maxX + t / 2, y + h / 2, cz, t, h, d, { interior: id });
    const door = L.doorWidth, wingS = L.doorZ - door / 2 - L.minZ, wingN = L.maxZ - (L.doorZ + door / 2);
    wallCollider(ac, L.minX - t / 2, y + h / 2, L.minZ + wingS / 2, t, h, wingS, { interior: id }); wallCollider(ac, L.minX - t / 2, y + h / 2, L.maxZ - wingN / 2, t, h, wingN, { interior: id });
    wallCollider(ac, L.minX - t / 2, y + h / 2, L.doorZ, t, h, door, { interior: id, door: 'nerdie-arms-interior' });
    wallCollider(ac, C.x, y + C.height / 2, (C.minZ + C.maxZ) / 2, C.depth, C.height, C.maxZ - C.minZ, { interior: id, furniture: 'counter' });
    wallCollider(ac, C.x, y + 0.55, (L.minZ + C.minZ) / 2, 0.12, 1.1, C.minZ - L.minZ, { interior: id, furniture: 'gate' });
    wallCollider(ac, C.x, y + 0.55, (C.maxZ + L.maxZ) / 2, 0.12, 1.1, L.maxZ - C.maxZ, { interior: id, furniture: 'gate' });
    const s0 = L.stations[0], s1 = L.stations[L.stations.length - 1];
    wallCollider(ac, (s0.x + s1.x) / 2, y + 0.6, s0.z, s1.x - s0.x + 1.2, 1.2, 0.95, { interior: id, furniture: 'display-cases' });
    wallCollider(ac, (L.minX + 1.4 + C.x - 1.4) / 2, y + 1.1, L.maxZ - 0.3, C.x - L.minX - 2.8, 2.2, 0.6, { interior: id, furniture: 'shelves' });
  }

  // Behind the counter, facing the customers (store-staff.js draws the clerk on shift there): along it from
  // the restock spot, so a customer can step up to talk.
  get staffStand() { const L = this.layout; return this.active ? { x: Math.min(L.maxX - 0.32, L.counter.x + 1.0), y: L.y, z: Math.min(this.site.z + 2.6, L.counter.maxZ - 0.6), yaw: -Math.PI / 2 } : null; }
  // { active, transitioned, prompt, name, mobileLabel, action: 'restock' | 'equip' | null, weaponId }
  update(player, input, now = 0) {
    const interact = !!input.interact, tap = this.mobile ? 'TAP' : '[E]';
    const idle = (prompt = '', mobileLabel = '', action = null, weaponId = null) => ({ active: this.active, transitioned: false, prompt, name: this.site.name, mobileLabel, action, weaponId });
    if (!this.active) {
      if (!insideInteractionRange(player.pos, this.entry, 2.8)) return idle();
      if (!isStoreOpen(this.storeMinute())) return idle('AMMO · CLOSED · OPENS 4 AM', 'CLOSED'); // after hours: locked (the room refuses it too)
      if (!interact || !interactionCooldownReady(now, this.transitionReadyAt)) return idle(`ENTER AMMO · GUN SHOP · ${tap} ENTER`, 'ENTER SHOP');
      return this.#transition(player, now, true);
    }
    if (insideInteractionRange(player.pos, this.exit, 2.2)) {
      if (!interact || !interactionCooldownReady(now, this.transitionReadyAt)) return idle(`EXIT AMMO · ${tap} EXIT`, 'EXIT SHOP');
      return this.#transition(player, now, false);
    }
    if (insideInteractionRange(player.pos, this.layout.counterStand, GUN_SHOP_RULES.counterReach - 0.3)) {
      const go = interact && interactionCooldownReady(now, this.actionReadyAt); if (go) this.actionReadyAt = now + 0.8;
      return idle(`RESTOCK ALL AMMO · FREE · ${tap} RESTOCK`, 'RESTOCK', go ? 'restock' : null);
    }
    // the nearest display case within reach (they stand 1.3 m apart)
    const station = this.layout.stations.filter((s) => insideInteractionRange(player.pos, s.stand, GUN_SHOP_RULES.stationReach)).sort((a, b) => Math.hypot(a.stand.x - player.pos.x, a.stand.z - player.pos.z) - Math.hypot(b.stand.x - player.pos.x, b.stand.z - player.pos.z))[0];
    if (station) {
      const go = interact && interactionCooldownReady(now, this.actionReadyAt); if (go) this.actionReadyAt = now + 0.6;
      return idle(`${WEAPON_LABELS[station.weaponId]} · ${tap} EQUIP`, 'EQUIP', go ? 'equip' : null, station.weaponId);
    }
    return idle();
  }

  #transition(player, now, inside) {
    this.active = inside; this.interior.visible = inside;
    player.pos.copy(inside ? this.insideSpawn : this.outsideSpawn); player.vel.set(0, 0, 0); player.onGround = true;
    player.yaw = inside ? -Math.PI / 2 : Math.PI / 2; // facing into the shop / out onto West Avenue
    this.transitionReadyAt = now + TRANSITION_COOLDOWN; this.prompt = '';
    return { active: inside, transitioned: true, prompt: '', name: this.site.name, mobileLabel: '', action: null, weaponId: null };
  }

  updateCameraVisibility() { return false; } // open-topped room: nothing to cut away
}

const hexCss = (h) => `#${h.toString(16).padStart(6, '0')}`;
// rack rifles hang along the east wall, muzzles pointing north
function weaponModelRotated(batch, M, id, x, y, z) {
  const tmp = new KitBatch(); weaponModel(tmp, M, id, 0, 0, 0, 1.15);
  for (const [mat, list] of tmp.parts) for (const geo of list) batch.add(mat, geo.rotateY(-Math.PI / 2).translate(x, y, z));
}
