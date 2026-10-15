// AK-47 viewmodel (CC0 Classic Weapons Pack), hitscan firing, and the shared FX pools (tracers, impacts, decals, blood, flashes).
import * as THREE from 'three';
import { loadGLB, prep } from './assets.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { raycastWorld } from './world.js';
import { sfx } from './audio.js';

function radialTex(inner = 'rgba(255,230,180,1)', outer = 'rgba(255,140,40,0)', size = 64) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); gr.addColorStop(0, inner); gr.addColorStop(0.35, inner.replace(',1)', ',0.6)')); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, size, size); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class FX {
  constructor(scene) {
    this.scene = scene; this.t = 0;
    const flashTex = radialTex();
    this.flashMat = new THREE.SpriteMaterial({ map: flashTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false });
    // tracers
    this.tracerMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const tg = new THREE.BoxGeometry(0.03, 0.03, 1); tg.translate(0, 0, -0.5);
    this.tracers = []; for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(tg, this.tracerMat.clone()); m.visible = false; m.frustumCulled = false; scene.add(m); this.tracers.push({ m, life: 0, max: 0 }); }
    // sparks / dust / blood sprites
    this.sparkMat = new THREE.SpriteMaterial({ map: radialTex('rgba(255,210,150,1)', 'rgba(255,150,60,0)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false });
    this.dustMat = new THREE.SpriteMaterial({ map: radialTex('rgba(190,180,165,1)', 'rgba(150,140,120,0)'), depthWrite: false, transparent: true, opacity: 0.55 });
    this.smokeMat = new THREE.SpriteMaterial({ map: radialTex('rgba(120,110,100,1)', 'rgba(90,80,70,0)'), depthWrite: false, transparent: true, opacity: 0.3 });
    this.bloodMat = new THREE.SpriteMaterial({ map: radialTex('rgba(150,10,14,1)', 'rgba(90,0,0,0)'), depthWrite: false, transparent: true, opacity: 0.85 });
    this.boomMat = new THREE.SpriteMaterial({ map: radialTex('rgba(255,235,200,1)', 'rgba(255,120,30,0)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false });
    this.parts = []; for (let i = 0; i < 160; i++) { const s = new THREE.Sprite(this.dustMat); s.visible = false; scene.add(s); this.parts.push({ s, v: new THREE.Vector3(), life: 0, max: 1, g: 0, grow: 0 }); }
    // decals
    const dg = new THREE.CircleGeometry(0.07, 10);
    this.decalMat = new THREE.MeshBasicMaterial({ color: 0x0a0806, transparent: true, opacity: 0.75, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false });
    this.decals = []; this.decalI = 0; for (let i = 0; i < 70; i++) { const m = new THREE.Mesh(dg, this.decalMat); m.visible = false; scene.add(m); this.decals.push(m); }
    // flashes (muzzle)
    this.flashes = []; for (let i = 0; i < 14; i++) { const s = new THREE.Sprite(this.flashMat); s.visible = false; scene.add(s); this.flashes.push({ s, life: 0 }); }
    this.flashLight = new THREE.PointLight(0xffb060, 0, 9, 2); scene.add(this.flashLight); this.flashLightT = 0;
    // ---- photographic particle atlases (Kenney Smoke Particles, CC0) ----
    const loader = new THREE.TextureLoader();
    const atlas = (url, cols, rows) => { const base = loader.load(url); base.colorSpace = THREE.SRGBColorSpace; const out = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const t = base.clone(); t.repeat.set(1 / cols, 1 / rows); t.offset.set(c / cols, 1 - (r + 1) / rows); out.push(t); } return out; };
    this.atl = { fire: atlas('assets/fx/explosion_3x3.webp', 3, 3), smoke: atlas('assets/fx/smoke_4x2.webp', 4, 2), puff: atlas('assets/fx/puff_4x2.webp', 4, 2), flash: atlas('assets/fx/flash_4x2.webp', 4, 2) };
    // muzzle flashes get their own material so each can pick a frame
    for (const f of this.flashes) { f.s.material = new THREE.SpriteMaterial({ map: this.atl.flash[0], color: new THREE.Color(2.4, 1.7, 1.05), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }); }
    // billows: fireball, smoke, dust, trail and muzzle smoke, each sprite owns its material
    this.billows = [];
    for (let i = 0; i < 180; i++) { const m = new THREE.SpriteMaterial({ map: this.atl.smoke[0], depthWrite: false, transparent: true, opacity: 0 }); const sp = new THREE.Sprite(m); sp.visible = false; sp.frustumCulled = false; sp.renderOrder = 2; scene.add(sp); this.billows.push({ s: sp, v: new THREE.Vector3(), life: 0, max: 1, kind: '', s0: 1, s1: 1, rv: 0, drag: 1, rise: 0, op: 1 }); }
    // brick and plaster debris thrown by blasts
    const dgeo = new THREE.BoxGeometry(0.2, 0.09, 0.1);
    this.debrisMesh = new THREE.InstancedMesh(dgeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }), 64);
    this.debrisMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.debrisMesh.castShadow = true; this.debrisMesh.frustumCulled = false; scene.add(this.debrisMesh);
    const col = new THREE.Color(); this.debris = [];
    for (let i = 0; i < 64; i++) { this.debrisMesh.setColorAt(i, col.set([0x7a3a2a, 0x8c4a34, 0x5a5550, 0x3a3532, 0x9a8f80][i % 5])); this.debris.push({ p: new THREE.Vector3(0, -50, 0), v: new THREE.Vector3(), q: new THREE.Quaternion(), w: new THREE.Vector3(), life: 0, s: 1 }); }
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._sv = new THREE.Vector3(); this._e = new THREE.Euler();
    this.flushDebris();
    // scorch marks on the ground
    const sc = document.createElement('canvas'); sc.width = sc.height = 128; const g2 = sc.getContext('2d'); const gr2 = g2.createRadialGradient(64, 64, 4, 64, 64, 64); gr2.addColorStop(0, 'rgba(8,6,5,0.92)'); gr2.addColorStop(0.55, 'rgba(14,11,9,0.6)'); gr2.addColorStop(1, 'rgba(20,16,12,0)'); g2.fillStyle = gr2; g2.fillRect(0, 0, 128, 128);
    const scTex = new THREE.CanvasTexture(sc); this.scorchMat = new THREE.MeshBasicMaterial({ map: scTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    this.scorches = []; this.scorchI = 0; for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.scorchMat); m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); this.scorches.push(m); }
    // bullet streaks: a short bright segment that travels from the muzzle, not a laser line
    this.streakN = 0; this.shake = 0; this.cam = null;
  }
  flushDebris() {
    for (let i = 0; i < this.debris.length; i++) { const d = this.debris[i]; this._sv.setScalar(d.life > 0 ? d.s : 0.0001); this._m.compose(d.p, d.q, this._sv); this.debrisMesh.setMatrixAt(i, this._m); }
    this.debrisMesh.instanceMatrix.needsUpdate = true; if (this.debrisMesh.instanceColor) this.debrisMesh.instanceColor.needsUpdate = true;
  }
  billow(kind, p, v, life, s0, s1, extra = {}) {
    const b = this.billows.find((x) => !x.s.visible) || this.billows[Math.floor(Math.random() * this.billows.length)];
    const set = kind === 'fire' ? this.atl.fire : kind === 'smoke' ? this.atl.smoke : this.atl.puff;
    const m = b.s.material; m.map = set[Math.floor(Math.random() * set.length)]; m.rotation = Math.random() * 6.28;
    m.blending = kind === 'fire' ? THREE.AdditiveBlending : THREE.NormalBlending; const tm = kind !== 'fire'; if (m.toneMapped !== tm) { m.toneMapped = tm; m.needsUpdate = true; }
    b.s.visible = true; b.s.position.copy(p); b.v.copy(v); b.life = b.max = life; b.kind = kind; b.s0 = s0; b.s1 = s1;
    b.rv = (Math.random() - 0.5) * (extra.spin ?? 0.6); b.drag = extra.drag ?? 1.6; b.rise = extra.rise ?? 0; b.op = extra.op ?? 1; b.tint = extra.tint ?? null; b.delay = extra.delay ?? 0;
    if (b.delay > 0) m.opacity = 0;
    b.s.scale.setScalar(s0); return b;
  }
  warm(on) { for (const k of ['fire', 'smoke', 'puff']) { const b = this.billows[k === 'fire' ? 0 : k === 'smoke' ? 1 : 2]; b.s.visible = on; if (on) { b.s.material.map = this.atl[k][0]; b.s.material.blending = k === 'fire' ? THREE.AdditiveBlending : THREE.NormalBlending; b.s.material.toneMapped = k !== 'fire'; b.s.material.needsUpdate = true; b.s.position.set(0, -20, 0); b.life = 0.01; } } this.scorches[0].visible = on; }
  tracer(a, b, color = 0xffd9a0, width = 1) {
    const t = this.tracers.find((x) => !x.m.visible) || this.tracers[0];
    const bright = (this.streakN++ % 3) === 0;
    t.a = a.clone(); t.dir = new THREE.Vector3().subVectors(b, a); t.len = t.dir.length(); t.dir.divideScalar(t.len || 1);
    t.s = 0; t.speed = 540; t.seg = bright ? 2.4 : 1.4;
    t.op = bright ? 1 : 0.22; t.w = (bright ? 0.65 : 0.4) * width;
    t.m.material.color.set(bright ? 0xffa24a : color); t.m.material.opacity = t.op; t.m.visible = true; t.life = t.max = 1;
    t.m.position.copy(a); t.m.lookAt(b); t.m.scale.set(t.w, t.w, 0.01);
  }
  flash(p, size = 0.45, light = true) {
    const f = this.flashes.find((x) => !x.s.visible) || this.flashes[0];
    f.s.visible = true; f.s.position.copy(p); f.s.scale.setScalar(size * 0.62 * (0.75 + Math.random() * 0.45)); f.s.material.map = this.atl.flash[Math.floor(Math.random() * 8)]; f.s.material.rotation = Math.random() * 6.28; f.life = 0.034;
    if (Math.random() < 0.5) this.billow('puff', p, new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.35, (Math.random() - 0.5) * 0.4), 0.7 + Math.random() * 0.4, 0.08, 0.45, { op: 0.14, tint: [0.12, 0.115, 0.11], drag: 2 });
    if (light) { this.flashLight.position.copy(p); this.flashLight.intensity = 12; this.flashLightT = 0.04; this.flashLightMax = 0; }
  }
  particle(mat, p, v, life, size, g = 0, grow = 0) {
    const q = this.parts.find((x) => !x.s.visible) || this.parts[Math.floor(Math.random() * this.parts.length)];
    q.s.visible = true; q.s.material = mat; q.s.position.copy(p); q.v.copy(v); q.life = q.max = life; q.s.scale.setScalar(size); q.size = size; q.g = g; q.grow = grow;
  }
  impact(p, n) {
    for (let i = 0; i < 4; i++) this.particle(this.sparkMat, p, new THREE.Vector3().copy(n).multiplyScalar(2 + Math.random() * 3).add(new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3)), 0.25 + Math.random() * 0.2, 0.06 + Math.random() * 0.05, 9);
    for (let i = 0; i < 2; i++) this.billow('puff', p.clone().addScaledVector(n, 0.05), new THREE.Vector3().copy(n).multiplyScalar(1.2 + Math.random()).add(new THREE.Vector3((Math.random() - 0.5) * 0.6, Math.random() * 0.6, (Math.random() - 0.5) * 0.6)), 0.6 + Math.random() * 0.5, 0.12, 0.7, { op: 0.5, tint: [0.09, 0.08, 0.07], drag: 3.5 });
    if (n.lengthSq() > 0) { const d = this.decals[this.decalI++ % this.decals.length]; d.visible = true; d.position.copy(p).addScaledVector(n, 0.01); d.lookAt(p.x + n.x, p.y + n.y, p.z + n.z); d.rotation.z = Math.random() * 6; }
  }
  blood(p, dir) {
    for (let i = 0; i < 6; i++) this.particle(this.bloodMat, p, new THREE.Vector3().copy(dir).multiplyScalar(1.5 + Math.random() * 2).add(new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.5, (Math.random() - 0.5) * 2)), 0.35 + Math.random() * 0.3, 0.12 + Math.random() * 0.1, 7, 0.3);
  }
  explosion(p) {
    const up = new THREE.Vector3(0, 1, 0), R = () => Math.random() - 0.5;
    const ground = p.y < 0.6;
    // 1 the flash: one huge bright core for a few frames
    this.billow('fire', p, new THREE.Vector3(), 0.12, 3.2, 5.5, { op: 1, tint: [2.2, 1.6, 1.1], drag: 0 });
    // 2 the fireball: billows boiling outward and up, burning out from yellow to deep orange
    for (let i = 0; i < 12; i++) { const v = new THREE.Vector3(R() * 7, 1.5 + Math.random() * 4.5, R() * 7); this.billow('fire', p.clone().add(new THREE.Vector3(R() * 0.8, Math.random() * 0.5, R() * 0.8)), v, 0.75 + Math.random() * 0.4, 1.8 + Math.random() * 0.8, 4.2 + Math.random() * 2.0, { drag: 3.2, op: 1, tint: [1.7, 1.15, 0.75], spin: 1.2 }); }
    // 3 the smoke column: dark, lit orange from inside at first, rolling up for seconds
    for (let i = 0; i < 20; i++) { const v = new THREE.Vector3(R() * 5, 1.2 + Math.random() * 3.2, R() * 5); this.billow('smoke', p.clone().add(new THREE.Vector3(R() * 1.2, Math.random() * 0.8, R() * 1.2)), v, 3.2 + Math.random() * 2.8, 1.4 + Math.random() * 0.9, 6 + Math.random() * 3.5, { drag: 1.4, rise: 0.9, op: 1, tint: 'smoke', delay: 0.04 + Math.random() * 0.18, spin: 0.35 }); }
    // 4 the dust ring rolling along the ground
    if (ground) for (let i = 0; i < 12; i++) { const a2 = (i / 12) * 6.28 + Math.random() * 0.4; this.billow('puff', p.clone().setY(0.35), new THREE.Vector3(Math.cos(a2) * (7 + Math.random() * 4), 0.4 + Math.random() * 0.6, Math.sin(a2) * (7 + Math.random() * 4)), 1.8 + Math.random() * 1.0, 0.8, 3.6 + Math.random() * 1.5, { drag: 2.6, op: 0.7, tint: [0.055, 0.05, 0.045] }); }
    else for (let i = 0; i < 8; i++) this.billow('puff', p, new THREE.Vector3(R() * 9, R() * 5 + 1, R() * 9), 1.6 + Math.random(), 0.7, 3.2, { drag: 2.8, op: 0.7, tint: [0.07, 0.055, 0.045] });
    // 5 debris: brick and plaster chunks on real arcs, bouncing and settling
    for (let i = 0; i < 26; i++) { const d = this.debris.find((x) => x.life <= 0) || this.debris[Math.floor(Math.random() * this.debris.length)]; d.p.copy(p).add(new THREE.Vector3(R() * 0.6, Math.random() * 0.4, R() * 0.6)); d.v.set(R() * 16, 3 + Math.random() * 11, R() * 16); d.w.set(R() * 22, R() * 22, R() * 22); d.q.setFromEuler(this._e.set(Math.random() * 6, Math.random() * 6, Math.random() * 6)); d.life = 3.5 + Math.random() * 2; d.s = 0.5 + Math.random() * 1.1; }
    // 6 embers: hot sparks thrown out under gravity
    for (let i = 0; i < 26; i++) this.particle(this.sparkMat, p, new THREE.Vector3(R() * 18, 2 + Math.random() * 12, R() * 18), 0.5 + Math.random() * 0.9, 0.05 + Math.random() * 0.05, 11);
    // 7 scorch on the ground
    if (ground) { const m = this.scorches[this.scorchI++ % this.scorches.length]; m.visible = true; m.position.set(p.x, 0.025, p.z); const sz = 3.2 + Math.random(); m.scale.set(sz, sz, 1); m.rotation.z = Math.random() * 6; }
    // 8 light and camera shake scaled by distance
    this.flashLight.position.copy(p).add(new THREE.Vector3(0, 1.2, 0)); this.flashLight.intensity = 180; this.flashLightT = 0.32; this.flashLight.distance = 24; this.flashLightMax = 0.32;
    if (this.cam) { const d = this.cam.position.distanceTo(p); this.shake = Math.max(this.shake, Math.max(0, 1 - d / 38) * 1.0); }
  }
  update(dt) {
    for (const t of this.tracers) if (t.m.visible) {
      if (!t.dir) { t.m.visible = false; continue; }
      t.s += t.speed * dt; const head = Math.min(t.len, t.s), tail = Math.max(0, t.s - t.seg);
      if (tail >= t.len) { t.m.visible = false; continue; }
      t.m.position.copy(t.a).addScaledVector(t.dir, tail); t.m.scale.set(t.w, t.w, Math.max(0.01, head - tail)); t.m.material.opacity = t.op;
    }
    for (const f of this.flashes) if (f.s.visible) { f.life -= dt; if (f.life <= 0) f.s.visible = false; }
    if (this.flashLightT > 0) { this.flashLightT -= dt; if (this.flashLightMax) this.flashLight.intensity = 180 * Math.pow(Math.max(0, this.flashLightT / this.flashLightMax), 1.6) * (0.85 + Math.random() * 0.3); if (this.flashLightT <= 0) { this.flashLight.intensity = 0; this.flashLight.distance = 9; this.flashLightMax = 0; } }
    this.shake = Math.max(0, this.shake - dt * 1.6);
    // billows
    for (const b of this.billows) if (b.s.visible) {
      const m = b.s.material;
      if (b.delay > 0) { b.delay -= dt; m.opacity = 0; continue; }
      b.life -= dt; if (b.life <= 0) { b.s.visible = false; m.opacity = 0; continue; }
      const k = 1 - b.life / b.max; // 0 → 1 over the life
      b.v.y += b.rise * dt; b.v.multiplyScalar(Math.max(0, 1 - dt * b.drag)); b.s.position.addScaledVector(b.v, dt);
      m.rotation += b.rv * dt; b.s.scale.setScalar(b.s0 + (b.s1 - b.s0) * (1 - Math.pow(1 - k, 2.2)));
      if (b.kind === 'fire') { const c = b.tint; const burn = 1 - k; m.color.setRGB(c[0] * (0.35 + 0.65 * burn), c[1] * Math.pow(burn, 1.5), c[2] * Math.pow(burn, 2.5)); m.opacity = b.op * (1 - k * k); }
      else if (b.tint === 'smoke') { const glow = Math.max(0, 1 - k * 7); m.color.setRGB(0.03 + glow * 1.1, 0.028 + glow * 0.45, 0.026 + glow * 0.15); m.opacity = b.op * Math.min(1, k * 14) * Math.pow(1 - k, 1.4); }
      else { const c = b.tint || [0.7, 0.66, 0.6]; m.color.setRGB(c[0], c[1], c[2]); m.opacity = b.op * Math.min(1, k * 10) * (1 - k); }
    }
    // debris
    let anyDebris = false;
    for (const d of this.debris) if (d.life > 0) {
      anyDebris = true; d.life -= dt; d.v.y -= 9.8 * dt; d.p.addScaledVector(d.v, dt);
      if (d.p.y < 0.05) { d.p.y = 0.05; if (d.v.y < 0) d.v.y *= -0.28; d.v.x *= 0.6; d.v.z *= 0.6; d.w.multiplyScalar(0.6); }
      this._q.setFromEuler(this._e.set(d.w.x * dt, d.w.y * dt, d.w.z * dt)); d.q.multiply(this._q);
      if (d.life < 0.6) d.s *= 1 - dt * 3;
    }
    if (anyDebris || this._debrisWas) this.flushDebris(); this._debrisWas = anyDebris;
    for (const q of this.parts) if (q.s.visible) {
      q.life -= dt; if (q.life <= 0) { q.s.visible = false; continue; }
      q.v.y -= q.g * dt; q.s.position.addScaledVector(q.v, dt); q.v.multiplyScalar(1 - dt * 2.5);
      const k = q.life / q.max; q.s.material.opacity = Math.min(1, k * 1.5) * (q.s.material === this.dustMat ? 0.55 : q.s.material === this.smokeMat ? 0.3 : 0.95); q.s.scale.setScalar(q.size * (1 + (1 - k) * q.grow));
    }
  }
}

// Gun specs. All four meshes come from the CC0 Classic Weapons Pack (stein-indie).
// len = viewmodel length in metres; dmg = [body, head]; spread/bloom in radians; adsFov = fov multiplier when aiming.
export const GUN_SPECS = {
  ak:    { id: 'ak',    name: 'AK-47',  glb: 'ak47',  len: 0.86, mag: 30, reserve: 180, rpm: 620,  auto: true,  dmg: [24, 40],  spread: 0.004, bloom: 0.0022, adsTight: 0.6,  kick: 0.011, kickZ: 0.045, reload: 2.3, hip: [0.15, -0.2, -0.3],  ads: [0, -0.108, -0.24], adsFov: 0.66, snd: { rate: 1, vol: 0.85 },    flash: 0.5 },
  mac10: { id: 'mac10', name: 'MAC-10', glb: 'mac10', len: 0.36, mag: 32, reserve: 192, rpm: 1090, auto: true,  dmg: [15, 28],  spread: 0.009, bloom: 0.0026, adsTight: 0.45, kick: 0.008, kickZ: 0.03,  reload: 1.8, hip: [0.16, -0.19, -0.44], ads: [0, -0.09, -0.3],   adsFov: 0.8,  snd: { rate: 1.35, vol: 0.62 }, flash: 0.34 },
  mp5:   { id: 'mp5',   name: 'MP5',    glb: 'mp5',   len: 0.66, mag: 30, reserve: 180, rpm: 800,  auto: true,  dmg: [20, 36],  spread: 0.003, bloom: 0.0015, adsTight: 0.7,  kick: 0.0075, kickZ: 0.032, reload: 2.1, hip: [0.14, -0.19, -0.3], ads: [0, -0.1, -0.24],   adsFov: 0.7,  snd: { rate: 1.18, vol: 0.7 },  flash: 0.4 },
  m700:  { id: 'm700',  name: 'M700',   glb: 'm700',  len: 1.02, mag: 5,  reserve: 30,  rpm: 52,   auto: false, dmg: [110, 250], spread: 0.03, bloom: 0,     adsTight: 0.97, kick: 0.05,  kickZ: 0.09,  reload: 3.0, hip: [0.16, -0.21, -0.34], ads: [0, -0.1, -0.26],   adsFov: 0.25, snd: { rate: 0.78, vol: 1 },    flash: 0.6, scope: true },
};

export class Weapon {
  constructor(scene, camera, player, fx, spec = GUN_SPECS.ak) {
    this.scene = scene; this.camera = camera; this.player = player; this.fx = fx; this.spec = spec; this.name = spec.name;
    this.rig = new THREE.Group(); camera.add(this.rig);
    this.mag = spec.mag, this.magSize = spec.mag; this.reserve = spec.reserve; this.rpm = spec.rpm; this.cool = 0; this.reloading = 0; this.ads = 0; this.sway = new THREE.Vector2(); this.kickZ = 0; this.loaded = false;
    this.hipPos = new THREE.Vector3(...spec.hip); this.adsPos = new THREE.Vector3(...spec.ads); this.shots = 0; this.muzzle = new THREE.Object3D();
    this.holstered = spec.id !== 'ak'; this.holster = this.holstered ? 1 : 0; this.fovOwner = spec.id === 'ak'; this.trigger = false;
    this.onHit = null; this.rayTargets = null; this.lastFire = 0; this.baseFov = 72; this.portrait = false;
  }
  async load() {
    const g = await loadGLB(`assets/models/${this.spec.glb}.glb`); const vm = prep(g.scene, { cast: false, receive: false, env: 1.3 });
    vm.traverse((o) => { if (!o.isMesh) return; const mats = Array.isArray(o.material) ? o.material : [o.material]; for (const m of mats) { m.transparent = false; m.alphaTest = 0; m.opacity = 1; m.depthWrite = true; m.side = THREE.FrontSide; m.needsUpdate = true; } });
    const bb = new THREE.Box3().setFromObject(vm); const size = bb.getSize(new THREE.Vector3());
    const axis = size.x > size.y && size.x > size.z ? 'x' : size.z > size.y ? 'z' : 'y';
    const len = size[axis]; const sc = this.spec.len / len;
    const inner = new THREE.Group(); inner.add(vm); inner.scale.setScalar(sc);
    // rotate the long axis onto -Z; the far end (+extent) becomes the muzzle after the flip below
    if (axis === 'x') inner.rotation.y = Math.PI / 2; else if (axis === 'y') inner.rotation.x = Math.PI / 2;
    // centre the grip around the origin: shift so the model spans from +0.33 (stock) to -0.53 (muzzle) along z
    const c = bb.getCenter(new THREE.Vector3()); vm.position.sub(c);
    inner.rotation.y += Math.PI; // flip: the longer end (barrel) forward
    this.vmInner = inner; this.rig.add(inner); this.loaded = true;
    // third-person template: same normalised gun, centred at the origin, barrel toward -z
    this.template3p = SkeletonUtils.clone(inner); this.template3p.position.set(0, 0, 0);
    const far = bb.max[axis] - c[axis], near = c[axis] - bb.min[axis];
    this.muzzleLocal = new THREE.Vector3(0, 0.035, -Math.max(far, near) * sc - 0.02);
    inner.position.set(0, 0, 0.12);
    // aim height from the model itself: put the top of the gun just under the eye line so aiming looks over the sights
    this.rig.remove(inner); inner.updateMatrixWorld(true); const ib = new THREE.Box3().setFromObject(inner); this.rig.add(inner);
    this.adsPos.set(0, -ib.max.y - (this.spec.adsDrop ?? 0.012), this.adsPos.z);
    vm.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; o.renderOrder = 5; } });
  }
  flip() { this.vmInner.rotation.y += Math.PI; }
  update(dt, input, look, time) {
    const p = this.player; this.cool -= dt;
    // ADS blend
    const wantAds = input.ads && !p.dead && this.reloading <= 0; this.ads += ((wantAds ? 1 : 0) - this.ads) * Math.min(1, dt * 10);
    // reload
    if (input.reload && this.reloading <= 0 && this.mag < this.magSize && this.reserve > 0 && !p.dead) { this.reloading = this.spec.reload; sfx.reload(); }
    input.reload = false;
    if (this.reloading > 0) { this.reloading -= dt; if (this.reloading <= 0) { const need = this.magSize - this.mag, take = Math.min(need, this.reserve); this.mag += take; this.reserve -= take; } }
    // fire
    const pull = input.fire && (this.spec.auto || !this.trigger); this.trigger = !!input.fire;
    if (pull && !p.dead && this.reloading <= 0 && this.cool <= 0) {
      if (this.mag > 0) { this.fire(time); this.cool = 60 / this.rpm; }
      else { this.cool = 0.25; sfx.dry(); if (this.reserve > 0) input.reload = true; }
    }
    if (!input.fire) this.shots = Math.max(0, this.shots - dt * 6);
    // viewmodel motion
    const sx = THREE.MathUtils.clamp(look.dx * 0.0008, -0.04, 0.04), sy = THREE.MathUtils.clamp(look.dy * 0.0008, -0.04, 0.04);
    this.sway.x += (sx - this.sway.x) * Math.min(1, dt * 10); this.sway.y += (sy - this.sway.y) * Math.min(1, dt * 10);
    this.kickZ *= Math.exp(-dt * 12);
    const bobX = Math.sin(p.bob) * 0.012 * p.bobAmp * (1 - this.ads * 0.8), bobY = Math.abs(Math.cos(p.bob)) * 0.012 * p.bobAmp * (1 - this.ads * 0.8);
    this.holster = (this.holster ?? 0) + ((this.holstered ? 1 : 0) - (this.holster ?? 0)) * Math.min(1, dt * 9); this.rig.visible = this.holster < 0.98 && !(this.spec.scope && this.ads > 0.85);
    const pos = this.hipPos.clone().lerp(this.adsPos, this.ads); if (this.portrait) { pos.x *= 0.5; pos.y -= 0.02; } pos.y -= this.holster * 0.4;
    this.rig.position.set(pos.x - this.sway.x + bobX, pos.y - this.sway.y * 0.6 + bobY - (this.reloading > 0 ? 0.18 : 0) - (p.sprinting ? 0.06 : 0), pos.z + this.kickZ);
    const rz = this.reloading > 0 ? 0.6 : 0, rx = p.sprinting ? -0.35 : 0;
    this.rig.rotation.set(this.sway.y * 0.8 + rx + this.kickZ * 2, -this.sway.x * 1.2 + (p.sprinting ? 0.35 : 0), rz + this.sway.x * 0.5);
    if (this.fovOwner) { this.camera.fov += ((this.ads > 0.5 ? this.baseFov * this.spec.adsFov : this.baseFov) - this.camera.fov) * Math.min(1, dt * (this.spec.scope ? 14 : 10)); this.camera.updateProjectionMatrix(); }
  }
  muzzleWorld(out) { return out.copy(this.muzzleLocal).applyMatrix4(this.vmInner.matrixWorld.clone().multiply(new THREE.Matrix4().makeRotationY(0))); }
  fire(time) {
    const p = this.player; this.mag--; this.shots++; this.lastFire = time;
    const S = this.spec; const spread = (S.spread + Math.min(this.shots, 8) * S.bloom + p.planar * 0.0012) * (1 - this.ads * S.adsTight);
    const dir = this.camera.getWorldDirection(new THREE.Vector3());
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(right, dir);
    dir.addScaledVector(right, (Math.random() - 0.5) * 2 * spread).addScaledVector(up, (Math.random() - 0.5) * 2 * spread).normalize();
    const origin = this.camera.position.clone();
    const hitW = { t: 1, n: new THREE.Vector3() }; const range = 160;
    raycastWorld(origin, dir.clone().multiplyScalar(range), 1, true, hitW); let t = hitW.t * range;
    let bot = this.rayTargets ? this.rayTargets(origin, dir, t) : null;
    const end = origin.clone().addScaledVector(dir, bot ? bot.t : t);
    const m = new THREE.Vector3(); this.vmInner.updateWorldMatrix(true, false); m.copy(this.muzzleLocal).applyMatrix4(this.vmInner.matrixWorld);
    this.fx.flash(m, S.flash); this.fx.tracer(m.clone().addScaledVector(dir, 0.6), end);
    if (bot) { this.fx.blood(end, dir); this.onHit?.(bot.bot, bot.head ? S.dmg[1] : S.dmg[0], end, dir); }
    else if (hitW.t < 1) { this.fx.impact(end, hitW.n); sfx.impactAt(end); }
    p.kick += S.kick * (1 - this.ads * 0.4); p.kickYaw += (Math.random() - 0.5) * 0.006 * (S.kick / 0.011); this.kickZ += S.kickZ;
    sfx.shot(S.snd);
    if (S.scope && this.mag > 0) setTimeout(() => sfx.reload?.({ rate: 1.7, vol: 0.35 }), 420);
  }
}
