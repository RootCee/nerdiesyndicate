// Tripo hoodie characters: shared Mixamo clips, a third-person AK, and two-bone IK so both hands
// hold the rifle on top of any locomotion clip (idle / walk / run / hit / fall).
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { loadGLB, prep } from './assets.js';
import { AVATAR_PRESETS, isAvatarPreset } from './avatar-schema.js';

export const ROSTER = {
  blue: ['blue_zip', 'navy'],
  red: ['red_hoodie', 'red_jersey'],
};
const HEIGHT = 1.8; // metres, top of head
const CLIP_MAP = { Idle_Gun: 'idle', Idle_Gun_Shoot: 'idle', Run: 'run', Run_Shoot: 'run', Walk: 'walk', Death: 'fall', HitRecieve: 'hit_to_body_01' };

const lib = { models: {}, loading: {}, clips: {}, weapons: new Map(), ready: false };

const WEAPON_PROFILES = Object.freeze({
  ak: Object.freeze({ length: 0.86, muzzle: -0.55, fore: -0.30, grip: 0 }),
  mac10: Object.freeze({ length: 0.36, muzzle: -0.25, fore: -0.12, grip: 0.02 }),
  mp5: Object.freeze({ length: 0.66, muzzle: -0.43, fore: -0.23, grip: 0.01 }),
  m700: Object.freeze({ length: 1.02, muzzle: -0.64, fore: -0.38, grip: 0.02 }),
  rpg: Object.freeze({ length: 1.10, muzzle: -0.68, fore: -0.34, grip: 0.04 }),
});

export function registerCharacterWeaponTemplate(id, template) {
  if (!id || !template) return false;
  lib.weapons.set(id, { template, profile: WEAPON_PROFILES[id] || WEAPON_PROFILES.ak });
  return true;
}

function registerClips(glb) {
  for (const source of glb.animations || []) {
    const key = source.name.replace(/\.\d+$/, '');
    if (lib.clips[key]) continue;
    const clip = source.clone(); clip.name = key;
    for (const track of clip.tracks) if (/Hips\.position$/.test(track.name)) {
      const values = track.values, x0 = values[0], z0 = values[2];
      for (let i = 0; i < values.length; i += 3) { values[i] = x0; values[i + 2] = z0; }
    }
    lib.clips[key] = clip;
  }
}

export async function ensureCharacterModel(name) {
  if (!isAvatarPreset(name)) throw new Error(`Unsupported character preset: ${name}`);
  if (lib.models[name]) return lib.models[name];
  if (!lib.loading[name]) lib.loading[name] = loadGLB(`assets/chars/${name}.glb`)
    .then((glb) => { lib.models[name] = glb; registerClips(glb); return glb; })
    .finally(() => { delete lib.loading[name]; });
  return lib.loading[name];
}

export async function loadCharacters(gunTemplate, names = [...ROSTER.blue, ...ROSTER.red]) {
  // blue_zip carries the shared Mixamo clips; every other preset is loaded only
  // when selected or required by combat.
  const requested = [...new Set(['blue_zip', ...names])];
  await Promise.all(requested.map((name) => ensureCharacterModel(name).catch(() => null)));
  registerCharacterWeaponTemplate('ak', gunTemplate); lib.ready = Object.keys(lib.models).length > 0 && !!lib.clips.idle;
  return lib.ready;
}
export const charactersReady = () => lib.ready;
export const characterAssetStats = () => ({ loaded: Object.keys(lib.models), pending: Object.keys(lib.loading), available: AVATAR_PRESETS.map(({ id }) => id), weaponTemplates: [...lib.weapons.keys()] });

// A gun group whose origin is the pistol grip and whose muzzle points down -Z (0.86 m long).
function makeGun(id) {
  const entry = lib.weapons.get(id); if (!entry) return null;
  const g = new THREE.Group(); const inner = SkeletonUtils.clone(entry.template); g.add(inner);
  inner.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false; o.renderOrder = 0; } });
  // the template is normalised exactly like the viewmodel: centred, long axis on z, barrel toward -z
  const profile = entry.profile;
  inner.position.set(0, id === 'rpg' ? 0.08 : 0.05, id === 'rpg' ? -0.03 : -0.10);
  g.userData.weaponId = id;
  g.userData.muzzle = new THREE.Vector3(0, id === 'rpg' ? 0.09 : 0.07, profile.muzzle);
  g.userData.fore = new THREE.Vector3(0, id === 'rpg' ? 0.05 : 0.02, profile.fore);
  g.userData.grip = new THREE.Vector3(0, -0.02, profile.grip);
  return g;
}

function disposeWeaponClone(gun) {
  if (!gun) return;
  const skeletons = new Set(); gun.traverse((object) => { if (object.isSkinnedMesh && object.skeleton) skeletons.add(object.skeleton); });
  for (const skeleton of skeletons) skeleton.dispose();
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
  constructor(scene, modelName, ghostMat, { presenceOnly = false, weaponId = presenceOnly ? null : 'ak', holstered = false } = {}) {
    const src = lib.models[modelName]; if (!src) throw new Error(`Character preset not loaded: ${modelName}`);
    this.name = modelName; this.ghostMat = ghostMat; this.scene = scene;
    this.presenceOnly = presenceOnly; this.ownsMaterials = !presenceOnly;
    const root = SkeletonUtils.clone(src.scene); prep(root, { cast: !presenceOnly, receive: false, env: 0.7 });
    root.traverse((o) => { if (o.isMesh) { o.frustumCulled = presenceOnly; if (this.ownsMaterials) o.material = o.material.clone(); } });
    // scale to HEIGHT using the bind-pose bounds
    const bb = new THREE.Box3().setFromObject(root); const s = HEIGHT / Math.max(0.1, bb.max.y - bb.min.y);
    this.inner = root; root.scale.setScalar(s); root.position.y = -bb.min.y * s;
    this.obj = new THREE.Group(); this.obj.add(root); scene.add(this.obj);
    const bone = (n) => { let b = null; root.traverse((o) => { if (!b && o.isBone && o.name.replace(/^mixamorig:?/, '') === n) b = o; }); return b; };
    this.b = { spine: bone('Spine2'), rArm: bone('RightArm'), rFore: bone('RightForeArm'), rHand: bone('RightHand'), lArm: bone('LeftArm'), lFore: bone('LeftForeArm'), lHand: bone('LeftHand'), head: bone('Head') };
    this.mixer = new THREE.AnimationMixer(root); this.actions = {};
    for (const [k, c] of Object.entries(lib.clips)) this.actions[k] = this.mixer.clipAction(c);
    this.gun = null; this.weaponId = null; this.holstered = true; this.setWeapon(weaponId, holstered);
    this.aimPitch = 0; this.ready = 1; this.dead = false;
    this.visualOffset = new THREE.Vector3();
    // x-ray ghost: extra skinned meshes bound to the same skeleton, drawn on top
    this.ghosts = [];
    if (!presenceOnly) root.traverse((o) => { if (o.isSkinnedMesh) { const g = new THREE.SkinnedMesh(o.geometry, ghostMat); g.bind(o.skeleton, o.bindMatrix); g.renderOrder = 50; g.visible = false; g.frustumCulled = false; o.parent.add(g); this.ghosts.push(g); } });
    this.play('Idle_Gun', 0);
  }
  set ghostVisible(v) { for (const g of this.ghosts) g.visible = v; }
  setWeapon(weaponId, holstered = false) {
    if (this.weaponId === weaponId && this.gun) { this.holstered = !!holstered; this.gun.visible = this.obj.visible && !this.holstered && !this.dead; return true; }
    if (this.gun) { this.scene.remove(this.gun); disposeWeaponClone(this.gun); this.gun = null; }
    this.weaponId = weaponId || null; this.holstered = weaponId ? !!holstered : true;
    if (!weaponId) return true;
    this.gun = makeGun(weaponId); if (!this.gun) return false;
    this.scene.add(this.gun); this.gun.visible = this.obj.visible && !this.holstered && !this.dead; return true;
  }
  setHolstered(holstered) { this.holstered = !!holstered || !this.weaponId; if (this.gun) this.gun.visible = this.obj.visible && !this.holstered && !this.dead; }
  play(name, fade = 0.15, once = false) {
    const key = CLIP_MAP[name] || name; if (this.cur === key && !once) return;
    const a = this.actions[key]; if (!a) return;
    if (this.curA && this.curA !== a) this.curA.fadeOut(fade);
    a.reset().fadeIn(fade).play(); a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat); a.clampWhenFinished = once;
    if (key === 'run') a.timeScale = 1.05; if (key === 'walk') a.timeScale = 1.2;
    this.cur = key; this.curA = a;
  }
  // pos/yaw from the bot; aiming: 1 = shouldered, 0 = low ready
  update(dt, pos, yaw, aiming, dead, contactOffset = null) {
    const targetOffset = contactOffset || _t.set(0, 0, 0);
    this.visualOffset.lerp(targetOffset, 1 - Math.exp(-18 * Math.max(0, dt)));
    this.obj.position.copy(pos).add(this.visualOffset); this.obj.rotation.y = yaw; this.mixer.update(dt);
    if (!this.gun) return;
    this.obj.updateMatrixWorld(true);
    this.ready += ((aiming ? 1 : 0) - this.ready) * Math.min(1, dt * 8);
    this.gun.visible = this.obj.visible && !dead && !this.holstered;
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
  muzzleWorld(out = new THREE.Vector3()) { return this.gun ? out.copy(this.gun.userData.muzzle).applyMatrix4(this.gun.matrixWorld) : out.copy(this.obj.position); }
  dispose(scene) {
    scene.remove(this.obj); if (this.gun) { scene.remove(this.gun); disposeWeaponClone(this.gun); }
    this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.inner);
    // SkeletonUtils gives each character independent skeletons. WebGL creates
    // one bone texture per skeleton, so dispose those on mode cleanup or every
    // Combat -> Free Roam -> Combat cycle retains another GPU allocation set.
    const skeletons = new Set(), materials = new Set();
    this.inner.traverse((object) => {
      if (object.isSkinnedMesh && object.skeleton) skeletons.add(object.skeleton);
      if (this.ownsMaterials && object.isMesh) {
        const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of objectMaterials) if (material && material !== this.ghostMat) materials.add(material);
      }
    });
    // The third-person rifle template is also cloned with SkeletonUtils and
    // can carry its own skinned submeshes. Its materials/textures are shared,
    // but its per-clone skeleton textures are not.
    for (const skeleton of skeletons) skeleton.dispose();
    for (const material of materials) material.dispose();
  }
}
