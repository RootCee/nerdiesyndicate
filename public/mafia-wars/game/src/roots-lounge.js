import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { insideInteractionRange, interactionCooldownReady } from './city-layout.js';
import { addInteriorIsolationShell, wallCollider } from './apartment-system.js';
import { KitBatch, PALETTE } from './city-showcase-kit.js';
import { RootsAudio } from './roots-audio.js';
import { rootsLoungeInterior, rootsLoungeSpace } from './roots-lounge-layout.js';
import { RootsResidentRenderer } from './roots-residents.js';

const TRANSITION_COOLDOWN = 0.65, STATION_RANGE = 1.7;
export const ROOTS_EXIT_RANGE = 2.5;
export class RootsLoungeSystem {
  constructor(scene, site, { addCollider, mobile = false, npcLibrary = null } = {}) {
    this.scene = scene; this.site = site; this.addCollider = addCollider; this.mobile = mobile; this.active = false; this.transitionReadyAt = 0; this.actionReadyAt = 0; this.targetId = null;
    this.layout = rootsLoungeInterior(site); this.space = rootsLoungeSpace(site); this.audio = new RootsAudio();
    this.interior = new THREE.Group(); this.interior.name = 'roots-lounge-interior'; this.interior.visible = false; scene.add(this.interior); this.#build(); this.interior.traverse((o) => o.layers.set(1));
    this.residentGroup = new THREE.Group(); this.residentGroup.name = 'roots-economic-residents'; this.interior.add(this.residentGroup); this.residents = npcLibrary ? new RootsResidentRenderer(this.residentGroup, this.layout, npcLibrary, { mobile, door: this.space.exit }) : null; this.economy = null;
    const v = (p) => new THREE.Vector3(p.x, p.y, p.z); this.entry = v(this.space.entry); this.insideSpawn = v(this.space.inside); this.exit = v(this.space.exit); this.outsideSpawn = v(this.space.outside);
  }
  setEconomy(snapshot) { if (!snapshot || snapshot === this.economy) return; this.economy = snapshot; this.residents?.setResidents(snapshot.roots?.residents || []); }
  updateResidents(dt) { this.residents?.setActive(this.active); this.residents?.update(dt); }
  #build() {
    const L = this.layout, y = L.y, g = this.interior, batch = new KitBatch(), mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: opts.roughness ?? 0.72, metalness: opts.metalness ?? 0, emissive: opts.emissive ?? 0, emissiveIntensity: opts.intensity ?? 0 });
    const M = { wall: mat(0x6a5480), floor: mat(0x3e3746), gold: mat(PALETTE.gold, { roughness: 0.3, metalness: 0.65 }), purple: mat(PALETTE.purple, { emissive: 0x54208c, intensity: 1.1 }), green: mat(PALETTE.green, { emissive: 0x0b3b26, intensity: 0.55 }), wood: mat(0x533a2a), dark: mat(0x0b0a0e), seat: mat(0x3c2855), light: mat(0xffe1aa, { emissive: 0xffc46e, intensity: 2.2 }) };
    const cx = (L.minX + L.maxX) / 2, cz = (L.minZ + L.maxZ) / 2, w = L.maxX - L.minX, d = L.maxZ - L.minZ, t = 0.2;
    addInteriorIsolationShell(g, [cx, y + 5, cz], [32, 15, 28], 'roots-lounge-isolation-shell');
    batch.box(M.floor, cx, y - 0.08, cz, w, 0.16, d); batch.box(M.dark, cx, y + L.height + 0.05, cz, w + 0.4, 0.1, d + 0.4);
    batch.box(M.wall, cx, y + L.height / 2, L.maxZ, w, L.height, t); batch.box(M.wall, L.minX, y + L.height / 2, cz, t, L.height, d); batch.box(M.wall, L.maxX, y + L.height / 2, cz, t, L.height, d);
    const wing = (w - L.doorWidth) / 2; batch.box(M.wall, L.minX + wing / 2, y + L.height / 2, L.minZ, wing, L.height, t); batch.box(M.wall, L.maxX - wing / 2, y + L.height / 2, L.minZ, wing, L.height, t); batch.box(M.wall, L.doorX, y + 3.55, L.minZ, L.doorWidth, 1.9, t);
    // Dance floor: emissive tiles, bounded to one merged batch for mobile.
    const D = L.danceFloor, tile = 0.72; for (let ix = -3; ix <= 3; ix++) for (let iz = -2; iz <= 2; iz++) batch.box((ix + iz) % 3 === 0 ? M.purple : (ix + iz) % 3 === 1 ? M.green : M.gold, D.x + ix * tile, y + 0.025, D.z + iz * tile, tile - 0.04, 0.05, tile - 0.04);
    // Stage and backline.
    const S = L.stage; batch.box(M.dark, S.x, y + S.height / 2, S.z, S.width, S.height, S.depth); batch.box(M.gold, S.x, y + S.height + 0.03, S.z, S.width, 0.06, S.depth); batch.box(M.purple, S.x, y + 2.8, L.maxZ - 0.05, S.width - 0.6, 0.14, 0.08);
    for (const x of [S.x - 2.4, S.x + 2.4]) { batch.box(M.dark, x, y + S.height + 0.75, S.z + 0.45, 0.75, 1.5, 0.55); batch.box(M.gold, x, y + S.height + 0.75, S.z + 0.16, 0.45, 0.45, 0.04); }
    batch.box(M.gold, S.x, y + S.height + 1.0, S.z + 0.15, 0.06, 2.0, 0.06); batch.box(M.gold, S.x, y + S.height + 2.0, S.z + 0.15, 0.75, 0.05, 0.05);
    // Bar, stools, bottle wall.
    const B = L.bar; batch.box(M.wood, B.x, y + B.height / 2, B.z, B.width, B.height, B.depth); batch.box(M.gold, B.x - 0.05, y + B.height + 0.04, B.z, B.width + 0.2, 0.08, B.depth + 0.2);
    for (let i = -2; i <= 2; i++) { const z = B.z + i * 0.95; batch.box(M.dark, B.x - 1.05, y + 0.38, z, 0.12, 0.76, 0.12); batch.add(M.seat, new THREE.CylinderGeometry(0.28, 0.28, 0.12, 10).translate(B.x - 1.05, y + 0.78, z)); }
    for (let i = 0; i < 12; i++) batch.box(i % 3 ? M.gold : M.green, L.maxX - 0.13, y + 1.45 + (i % 2) * 0.46, B.z - 2.0 + Math.floor(i / 2) * 0.75, 0.1, 0.32, 0.18);
    // Seating and a roped VIP corner.
    for (const seat of L.seats) { batch.add(M.wood, new THREE.CylinderGeometry(0.42, 0.42, 0.08, 12).translate(seat.x, y + 0.52, seat.z)); batch.box(M.seat, seat.x, y + 0.27, seat.z, 1.15, 0.5, 0.62); }
    const V = L.vip; batch.box(M.seat, V.x, y + 0.32, V.z + 0.65, V.width, 0.64, 0.75); for (const x of [V.x - V.width / 2, V.x + V.width / 2]) { batch.box(M.gold, x, y + 0.5, V.z - 0.75, 0.08, 1.0, 0.08); } batch.box(M.gold, V.x, y + 0.75, V.z - 0.75, V.width, 0.05, 0.05);
    // Demand board and ceiling strips.
    batch.box(M.green, L.minX + 0.08, y + 2.1, this.site.z, 0.08, 2.3, 2.8); batch.box(M.gold, L.minX + 0.13, y + 2.1, this.site.z, 0.04, 2.5, 3.0);
    for (const x of [cx - 4, cx, cx + 4]) { batch.box(M.dark, x, y + L.height - 0.32, cz, 0.08, 0.55, 0.08); batch.box(M.light, x, y + L.height - 0.62, cz, 0.18, 0.06, d - 2); }
    batch.build(g, 'roots-lounge-merged', { castShadow: false });
    const lights = this.mobile ? [[cx, cz, 55]] : [[D.x, D.z, 34], [B.x - 1.8, B.z, 26], [S.x, S.z, 30]]; for (const [x, z, intensity] of lights) { const light = new THREE.PointLight(x === D.x ? 0xa25cff : 0xffc980, intensity, this.mobile ? 18 : 12, 2); light.position.set(x, y + 3.4, z); g.add(light); }
    // NC-LIFE-01A: indoors the outdoor lighting is removed, so a warm fill (as the other interiors have) keeps
    // residents and furniture visible on a phone while the point lights keep the club's colour.
    const fill = new THREE.HemisphereLight(0xffe7c8, 0x4a3a58, this.mobile ? 1.7 : 1.1); fill.position.set(cx, y + L.height, cz); fill.name = 'roots-lounge-fill'; g.add(fill);
    this.#colliders();
  }
  #colliders() {
    const L = this.layout, y = L.y, t = 0.3, ac = this.addCollider, w = L.maxX - L.minX, d = L.maxZ - L.minZ, cx = (L.minX + L.maxX) / 2, cz = (L.minZ + L.maxZ) / 2;
    wallCollider(ac, cx, y - 0.05, cz, w + 0.6, 0.2, d + 0.6, { step: true, interior: this.site.id });
    wallCollider(ac, cx, y + L.height / 2, L.maxZ + t / 2, w, L.height, t, { interior: this.site.id }); wallCollider(ac, L.minX - t / 2, y + L.height / 2, cz, t, L.height, d, { interior: this.site.id }); wallCollider(ac, L.maxX + t / 2, y + L.height / 2, cz, t, L.height, d, { interior: this.site.id });
    const wing = (w - L.doorWidth) / 2; wallCollider(ac, L.minX + wing / 2, y + L.height / 2, L.minZ - t / 2, wing, L.height, t, { interior: this.site.id }); wallCollider(ac, L.maxX - wing / 2, y + L.height / 2, L.minZ - t / 2, wing, L.height, t, { interior: this.site.id }); wallCollider(ac, L.doorX, y + L.height / 2, L.minZ - t / 2, L.doorWidth, L.height, t, { interior: this.site.id, door: 'roots-lounge-interior' });
    const S = L.stage, B = L.bar; wallCollider(ac, S.x, y + S.height / 2, S.z, S.width, S.height, S.depth, { interior: this.site.id, furniture: 'stage', step: true }); wallCollider(ac, B.x, y + B.height / 2, B.z, B.width, B.height, B.depth, { interior: this.site.id, furniture: 'bar' });
  }
  update(player, input, now = 0) {
    const interact = !!input.interact, tap = this.mobile ? 'TAP' : '[E]', idle = (prompt = '', mobileLabel = '', action = null, station = null) => ({ active: this.active, transitioned: false, prompt, mobileLabel, action, station, name: this.site.name });
    if (!this.active) { if (!insideInteractionRange(player.pos, this.entry, 2.8)) return idle(); const roots = this.economy?.roots, fee = roots?.playerAdmissionFee ?? roots?.admissionFee, free = !(fee > 0); // NC-ECO-01D: players enter free (and offline nothing is charged)
      if (!interact || !interactionCooldownReady(now, this.transitionReadyAt)) return idle(free ? `ROOTS LOUNGE · FREE ENTRY · ${tap} ENTER` : `ROOTS LOUNGE · SIMULATED ADMISSION ${Number.isFinite(fee) ? `$${(fee / 100).toFixed(2)}` : ''} · ${tap} ENTER`, free ? 'ENTER ROOTS' : 'PAY & ENTER'); return this.#transition(player, now, true); }
    if (insideInteractionRange(player.pos, this.exit, ROOTS_EXIT_RANGE)) { this.targetId = null; if (!interact || !interactionCooldownReady(now, this.transitionReadyAt)) return idle(`EXIT ROOTS LOUNGE · ${tap} EXIT`, 'EXIT ROOTS'); return this.#transition(player, now, false); }
    const resident = this.residents?.nearest(player.pos, this.targetId);
    const station = this.layout.interactions.map((s) => ({ ...s, distance: Math.hypot(player.pos.x - s.x, player.pos.y - s.y, player.pos.z - s.z) })).filter((s) => s.distance <= STATION_RANGE).sort((a, b) => a.distance - b.distance)[0];
    const go = interact && interactionCooldownReady(now, this.actionReadyAt) && interactionCooldownReady(now, this.transitionReadyAt); if (go) this.actionReadyAt = now + 0.7;
    if (resident && (!station || resident.distance <= station.distance)) { this.targetId = resident.id; return idle(`${resident.name.toUpperCase()} · ${resident.occupation.replaceAll('-', ' ').toUpperCase()} · ${tap} TALK`, 'TALK', go ? 'resident-conversation' : null, resident.id); }
    this.targetId = null;
    if (!station) return idle();
    if (go && station.kind === 'volume') this.audio.setVolume(this.audio.volume >= 0.75 ? 0.25 : this.audio.volume + 0.25);
    return idle(`${station.label}${station.kind === 'volume' ? ` · ${Math.round(this.audio.volume * 100)}%` : ''} · ${tap}`, station.kind === 'demand' ? 'SUGGEST' : station.kind === 'treasury' ? 'TREASURY' : 'INTERACT', go ? station.kind : null, station.id);
  }
  #transition(player, now, inside) {
    this.active = inside; this.interior.visible = inside; player.pos.copy(inside ? this.insideSpawn : this.outsideSpawn); player.vel.set(0, 0, 0); player.onGround = true; player.yaw = Math.PI; this.transitionReadyAt = now + TRANSITION_COOLDOWN;
    if (inside) { this.audio.unlock(); this.audio.enter(); } else this.audio.exit();
    return { active: inside, transitioned: true, prompt: '', mobileLabel: '', action: null, station: null, name: this.site.name };
  }
}
