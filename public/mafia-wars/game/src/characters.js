// Tripo hoodie characters: shared Mixamo clips, a third-person AK, and two-bone IK so both hands
// hold the rifle on top of any locomotion clip (idle / walk / run / hit / fall).
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { loadGLB, prep } from './assets.js';

export const ROSTER = {
  blue: ['blue_zip', 'navy'],
  red: ['red_hoodie', 'red_jersey'],
};
const HEIGHT = 1.8; // metres, top of head
const CLIP_MAP = { Idle_Gun: 'idle', Idle_Gun_Shoot: 'idle', Run: 'run', Run_Shoot: 'run', Walk: 'walk', Death: 'fall', HitRecieve: 'hit_to_body_01' };

const lib = { models: {}, clips: {}, gun: null, ready: false };

export async function loadCharacters(gunTemplate) {
  const names = [...ROSTER.blue, ...ROSTER.red];
  const glbs = await Promise.all(names.map((n) => loadGLB(`assets/chars/${n}.glb`).catch(() => null)));
  names.forEach((n, i) => { if (glbs[i]) lib.models[n] = glbs[i]; });
  // clips: take them from whichever model carries them (blue_zip was exported with all of them)
  for (const g of glbs) if (g) for (const c of g.animations) {
    const key = c.name.replace(/\.\d+$/, '');
    if (!lib.clips[key]) { c.name = key; lib.clips[key] = c; }
  }
  // strip horizontal root motion from the Hips track so "in place" really stays in place
  for (const c of Object.values(lib.clips)) for (const t of c.tracks) if (/Hips\.position$/.test(t.name)) {
    const v = t.values; const x0 = v[0], z0 = v[2]; for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; }
  }
  lib.gun = gunTemplate; lib.ready = Object.keys(lib.models).length > 0 && !!lib.clips.idle;
  return lib.ready;
}
export const charactersReady = () => lib.ready;

// A gun group whose origin is the pistol grip and whose muzzle points down -Z (0.86 m long).
function makeGun() {
  const g = new THREE.Group(); const inner = SkeletonUtils.clone(lib.gun); g.add(inner);
  inner.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false; o.renderOrder = 0; } });
  // the template is normalised exactly like the viewmodel: centred, long axis on z, barrel toward -z
  inner.position.set(0, 0.05, -0.10);          // template is centred: grip is ~0.10 m behind centre, below the bore
  g.userData.muzzle = new THREE.Vector3(0, 0.07, -0.55);
  g.userData.fore = new THREE.Vector3(0, 0.02, -0.30);   // left hand on the handguard
  g.userData.grip = new THREE.Vector3(0, -0.02, 0.0);    // right hand on the pistol grip
  return g;
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _t = new THREE.Vector3(), _p = new THREE.Vector3();
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _pq = new THREE.Quaternion();
// rotate `bone` (in world space) so the direction from bone to child goes from `from` to `to`
function aimBone(bone, from, to) {
  _q.setFromUnitVectors(from, to);
  bone.getWorldQuaternion(_q2); _q2.premultiply(_q);
  bone.parent.getWorldQuaternion(_pq).invert(); bone.quaternion.copy(_pq.multiply(_q2));
  bone.updateMatrixWorld(true);
}
// analytic two-bone IK with a pole hint (world space)
function twoBoneIK(upper, lower, end, target, pole) {
  upper.getWorldPosition(_a); lower.getWorldPosition(_b); end.getWorldPosition(_c);
  const la = _a.distanceTo(_b), lb = _b.distanceTo(_c);
  _t.subVectors(target, _a); let d = _t.length(); if (d < 1e-4) return;
  d = Math.min(d, (la + lb) * 0.999); const dir = _t.normalize();
  const cosA = THREE.MathUtils.clamp((la * la + d * d - lb * lb) / (2 * la * d), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
  _p.subVectors(pole, _a); _p.addScaledVector(dir, -_p.dot(dir)); if (_p.lengthSq() < 1e-8) _p.set(0, -1, 0); _p.normalize();
  const elbow = new THREE.Vector3().copy(_a).addScaledVector(dir, la * cosA).addScaledVector(_p, la * sinA);
  aimBone(upper, new THREE.Vector3().subVectors(_b, _a).normalize(), new THREE.Vector3().subVectors(elbow, _a).normalize());
  lower.getWorldPosition(_b); end.getWorldPosition(_c);
  const goal = new THREE.Vector3().copy(_a).addScaledVector(dir, d);
  aimBone(lower, new THREE.Vector3().subVectors(_c, _b).normalize(), new THREE.Vector3().subVectors(goal, _b).normalize());
}

const UP = new THREE.Vector3(0, 1, 0);
export class Character {
  constructor(scene, modelName, ghostMat) {
    const src = lib.models[modelName]; this.name = modelName;
    const root = SkeletonUtils.clone(src.scene); prep(root, { cast: true, receive: false, env: 0.7 });
    root.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; o.material = o.material.clone(); } });
    // scale to HEIGHT using the bind-pose bounds
    const bb = new THREE.Box3().setFromObject(root); const s = HEIGHT / Math.max(0.1, bb.max.y - bb.min.y);
    this.inner = root; root.scale.setScalar(s); root.position.y = -bb.min.y * s;
    this.obj = new THREE.Group(); this.obj.add(root); scene.add(this.obj);
    const bone = (n) => { let b = null; root.traverse((o) => { if (!b && o.isBone && o.name.replace(/^mixamorig:?/, '') === n) b = o; }); return b; };
    this.b = { spine: bone('Spine2'), rArm: bone('RightArm'), rFore: bone('RightForeArm'), rHand: bone('RightHand'), lArm: bone('LeftArm'), lFore: bone('LeftForeArm'), lHand: bone('LeftHand'), head: bone('Head') };
    this.mixer = new THREE.AnimationMixer(root); this.actions = {};
    for (const [k, c] of Object.entries(lib.clips)) this.actions[k] = this.mixer.clipAction(c);
    this.gun = makeGun(); scene.add(this.gun);
    this.aimPitch = 0; this.ready = 1; this.dead = false;
    // x-ray ghost: extra skinned meshes bound to the same skeleton, drawn on top
    this.ghosts = [];
    root.traverse((o) => { if (o.isSkinnedMesh) { const g = new THREE.SkinnedMesh(o.geometry, ghostMat); g.bind(o.skeleton, o.bindMatrix); g.renderOrder = 50; g.visible = false; g.frustumCulled = false; o.parent.add(g); this.ghosts.push(g); } });
    this.play('Idle_Gun', 0);
  }
  set ghostVisible(v) { for (const g of this.ghosts) g.visible = v; }
  play(name, fade = 0.15, once = false) {
    const key = CLIP_MAP[name] || name; if (this.cur === key && !once) return;
    const a = this.actions[key]; if (!a) return;
    if (this.curA && this.curA !== a) this.curA.fadeOut(fade);
    a.reset().fadeIn(fade).play(); a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat); a.clampWhenFinished = once;
    if (key === 'run') a.timeScale = 1.05; if (key === 'walk') a.timeScale = 1.2;
    this.cur = key; this.curA = a;
  }
  // pos/yaw from the bot; aiming: 1 = shouldered, 0 = low ready
  update(dt, pos, yaw, aiming, dead) {
    this.obj.position.copy(pos); this.obj.rotation.y = yaw; this.mixer.update(dt);
    this.obj.updateMatrixWorld(true);
    this.ready += ((aiming ? 1 : 0) - this.ready) * Math.min(1, dt * 8);
    this.gun.visible = !dead;
    if (dead || !this.b.spine) return;
    // place the rifle relative to the chest, in the character's yaw frame
    const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), right = new THREE.Vector3().crossVectors(fwd, UP).normalize(); // character's right side
    this.b.spine.getWorldPosition(_a);
    const r = this.ready;
    const grip = _a.clone().addScaledVector(right, THREE.MathUtils.lerp(0.16, 0.12, r)).addScaledVector(UP, THREE.MathUtils.lerp(-0.16, 0.12, r)).addScaledVector(fwd, THREE.MathUtils.lerp(0.22, 0.3, r));
    this.gun.position.copy(grip);
    const pitch = THREE.MathUtils.lerp(-0.6, this.aimPitch, r), yawOff = THREE.MathUtils.lerp(-0.55, -0.04, r); // muzzle swings across the body at low ready
    this.gun.quaternion.setFromEuler(new THREE.Euler(pitch, yaw + Math.PI + yawOff, 0, 'YXZ'));
    this.gun.updateMatrixWorld(true);
    // IK both arms onto the gun
    const gr = this.gun.userData.grip.clone().applyMatrix4(this.gun.matrixWorld), fo = this.gun.userData.fore.clone().applyMatrix4(this.gun.matrixWorld);
    const b = this.b;
    if (b.rArm && b.rFore && b.rHand) { b.rArm.getWorldPosition(_b); twoBoneIK(b.rArm, b.rFore, b.rHand, gr, _b.clone().addScaledVector(right, 0.5).addScaledVector(UP, -0.6).addScaledVector(fwd, -0.2)); }
    if (b.lArm && b.lFore && b.lHand) { b.lArm.getWorldPosition(_b); twoBoneIK(b.lArm, b.lFore, b.lHand, fo, _b.clone().addScaledVector(right, -0.4).addScaledVector(UP, -0.7)); }
  }
  muzzleWorld(out = new THREE.Vector3()) { return out.copy(this.gun.userData.muzzle).applyMatrix4(this.gun.matrixWorld); }
  dispose(scene) { scene.remove(this.obj); scene.remove(this.gun); }
}
