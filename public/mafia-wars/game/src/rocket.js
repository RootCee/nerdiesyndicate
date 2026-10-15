// RPG-7 rocket launcher: viewmodel, rockets in flight, blast damage, and the wall destruction hook.
import * as THREE from 'three';
import { loadGLB, prep } from './assets.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { raycastWorld } from './world.js';
import { rayVsBots } from './bots.js';
import { blast } from './destruction.js';
import { sfx } from './audio.js';

export class Launcher {
  constructor(scene, camera, player, fx) {
    this.scene = scene; this.camera = camera; this.player = player; this.fx = fx;
    this.rig = new THREE.Group(); camera.add(this.rig); this.rig.visible = false;
    this.loaded = 1; this.reserve = 3; this.reloading = 0; this.cool = 0; this.kickZ = 0; this.sway = new THREE.Vector2();
    this.hipPos = new THREE.Vector3(0.2, -0.24, -0.5); this.model = null; this.muzzleLocal = new THREE.Vector3(0, 0.08, -0.9);
    this.rockets = []; this.onExplode = null; this.rayTargets = null; this.raise = 0;
    // pooled lights + sprites: adding a PointLight to a live scene recompiles every shader (a 4 s freeze on the first shot)
    this.pool = [];
    for (let i = 0; i < 3; i++) {
      const obj = new THREE.Sprite(fx.flashMat.clone()); obj.material.color.set(0xffc080); obj.scale.setScalar(0.55); obj.visible = false; scene.add(obj);
      const light = new THREE.PointLight(0xffa050, 0, 9, 2); scene.add(light);
      this.pool.push({ obj, light, busy: false });
    }
  }
  async load() {
    try {
      const g = await loadGLB('assets/models/rpg7.glb'); const vm = prep(g.scene, { cast: false, receive: false, env: 1.2 });
      vm.traverse((o) => { if (!o.isMesh) return; const mats = Array.isArray(o.material) ? o.material : [o.material]; for (const m of mats) { m.transparent = false; m.alphaTest = 0; m.opacity = 1; m.depthWrite = true; } o.frustumCulled = false; o.renderOrder = 5; });
      const bb = new THREE.Box3().setFromObject(vm); const size = bb.getSize(new THREE.Vector3());
      const axis = size.x > size.y && size.x > size.z ? 'x' : size.z > size.y ? 'z' : 'y';
      const len = size[axis]; const sc = 1.1 / len; // an RPG-7 with its rocket is ~1.1 m
      const inner = new THREE.Group(); inner.add(vm); inner.scale.setScalar(sc);
      if (axis === 'x') inner.rotation.y = Math.PI / 2; else if (axis === 'y') inner.rotation.x = Math.PI / 2;
      const c = bb.getCenter(new THREE.Vector3()); vm.position.sub(c);
      inner.rotation.y += Math.PI; // the model's +axis end (warhead, per the reference image) forward
      this.model = inner; this.rig.add(inner);
      const far = Math.max(bb.max[axis] - c[axis], c[axis] - bb.min[axis]);
      this.muzzleLocal = new THREE.Vector3(0, 0.03, -far * sc - 0.05);
      inner.position.set(0, 0, -0.12);
    } catch (e) { console.warn('rpg7.glb missing, launcher has no viewmodel yet', e.message); }
  }
  get ammoText() { return { mag: this.loaded, res: this.reserve }; }
  update(dt, input, look, time, active) {
    const p = this.player; this.cool -= dt;
    this.raise += ((active ? 1 : 0) - this.raise) * Math.min(1, dt * 9); this.rig.visible = this.raise > 0.02;
    if (active) {
      if (input.reload && this.reloading <= 0 && this.loaded === 0 && this.reserve > 0 && !p.dead) { this.reloading = 3.0; sfx.rocketReload(); }
      if (this.reloading > 0) { this.reloading -= dt; if (this.reloading <= 0) { this.loaded = 1; this.reserve--; } }
      if (input.fire && !p.dead && this.reloading <= 0 && this.cool <= 0) {
        if (this.loaded > 0) { this.fire(time); this.cool = 0.5; input.fire = false; if (this.reserve > 0) input.reload = true; }
        else { this.cool = 0.3; sfx.dry(); if (this.reserve > 0) input.reload = true; }
      }
      input.reload = false;
    }
    const sx = THREE.MathUtils.clamp(look.dx * 0.0008, -0.04, 0.04), sy = THREE.MathUtils.clamp(look.dy * 0.0008, -0.04, 0.04);
    this.sway.x += (sx - this.sway.x) * Math.min(1, dt * 10); this.sway.y += (sy - this.sway.y) * Math.min(1, dt * 10);
    this.kickZ *= Math.exp(-dt * 10);
    const bobX = Math.sin(p.bob) * 0.012 * p.bobAmp, bobY = Math.abs(Math.cos(p.bob)) * 0.012 * p.bobAmp;
    const drop = (1 - this.raise) * 0.35 + (this.reloading > 0 ? 0.22 : 0) + (p.sprinting ? 0.06 : 0);
    const pos = this.hipPos; if (this.portrait) { this.rig.position.set(pos.x * 0.5 - this.sway.x + bobX, pos.y - 0.02 - drop, pos.z + this.kickZ); } else this.rig.position.set(pos.x - this.sway.x + bobX, pos.y - this.sway.y * 0.6 + bobY - drop, pos.z + this.kickZ);
    this.rig.rotation.set(this.sway.y * 0.8 + (p.sprinting ? -0.3 : 0) + this.kickZ * 1.5 + (1 - this.raise) * 0.5, -this.sway.x * 1.2 + (p.sprinting ? 0.3 : 0), this.reloading > 0 ? 0.45 : 0 + this.sway.x * 0.4);
    if (this.model) { // the loaded rocket shows only when there is one
      this.model.visible = true;
    }
    // rockets in flight
    for (let i = this.rockets.length - 1; i >= 0; i--) { const r = this.rockets[i]; if (!this.stepRocket(r, dt, time)) { r.obj.visible = false; r.light.intensity = 0; r.slot.busy = false; this.rockets.splice(i, 1); } }
  }
  fire(time) {
    const p = this.player; this.loaded = 0;
    const dir = this.camera.getWorldDirection(new THREE.Vector3());
    const origin = this.camera.position.clone().addScaledVector(dir, 1.1);
    let m = origin.clone(); if (this.model) { this.model.updateWorldMatrix(true, false); m.copy(this.muzzleLocal).applyMatrix4(this.model.matrixWorld); }
    this.fx.flash(m, 0.6, false); for (let i = 0; i < 9; i++) this.fx.billow('puff', m, new THREE.Vector3().copy(dir).multiplyScalar(-3 - Math.random() * 4).add(new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.2, (Math.random() - 0.5) * 2)), 1.2 + Math.random() * 0.8, 0.3, 2.2, { op: 0.5, tint: [0.1, 0.095, 0.09], drag: 2.4 });
    this.launch(origin, dir, p, time);
    p.kick += 0.05; p.kickYaw += (Math.random() - 0.5) * 0.01; this.kickZ += 0.12; sfx.rocket();
  }
  // a rocket that anyone can launch (bots later): glowing head + smoke trail + a point light
  launch(origin, dir, owner, time) {
    const slot = this.pool.find((s) => !s.busy) || this.pool[0]; slot.busy = true;
    const { obj, light } = slot; obj.visible = true; obj.position.copy(origin); light.intensity = 14; light.position.copy(origin);
    this.rockets.push({ obj, light, slot, pos: origin.clone(), vel: dir.clone().multiplyScalar(38), owner, born: time, trail: 0 });
  }
  stepRocket(r, dt, time) {
    const prev = r.pos.clone(); r.vel.y -= 2.5 * dt; r.pos.addScaledVector(r.vel, dt);
    const seg = new THREE.Vector3().subVectors(r.pos, prev); const len = seg.length(); const dir = seg.clone().normalize();
    // world (houses, props, standing walls) then bots
    const hitW = { t: 1, n: new THREE.Vector3() }; raycastWorld(prev, seg, 1, true, hitW);
    const bot = this.rayTargets ? this.rayTargets(prev, dir, len * hitW.t, r.owner) : null;
    let hit = null;
    if (bot) hit = prev.clone().addScaledVector(dir, bot.t);
    else if (hitW.t < 1) hit = prev.clone().addScaledVector(dir, len * hitW.t - 0.05);
    else if (r.pos.y <= 0.05) { hit = r.pos.clone(); hit.y = 0.05; }
    if (hit) { this.explode(hit, r.owner, time, dir); return false; }
    if (time - r.born > 5) return false;
    r.obj.position.copy(r.pos); r.light.position.copy(r.pos);
    r.trail += dt; if (r.trail > 0.014) { r.trail = 0; this.fx.billow('puff', r.pos.clone().addScaledVector(dir, -0.35), new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.25 + Math.random() * 0.3, (Math.random() - 0.5) * 0.5), 1.1 + Math.random() * 0.6, 0.16, 1.2 + Math.random() * 0.5, { op: 0.4, tint: [0.045, 0.043, 0.04], drag: 1.2, spin: 0.8 }); if (Math.random() < 0.35) this.fx.billow('fire', r.pos.clone().addScaledVector(dir, -0.25), new THREE.Vector3(), 0.08, 0.25, 0.45, { op: 0.9, tint: [1.6, 1.1, 0.7], drag: 0 }); }
    return true;
  }
  explode(p, owner, time, dir) {
    // the fireball sits in front of the surface it hit, so the wall doesn't swallow it
    this.fx.explosion(dir ? p.clone().addScaledVector(dir, -1.0) : p); sfx.explode(p);
    blast(p, 3.6, 7.5);
    this.onExplode?.(p, owner, time);
  }
}
