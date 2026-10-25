// Tripo hoodie characters: shared Mixamo clips, a third-person AK, and two-bone IK so both hands
// hold the rifle on top of any locomotion clip (idle / walk / run / hit / fall).
// M6.9: procedural upper-body aiming on top of those clips (the rig has no aim
// clips): the spine and neck twist and pitch toward the aim, each weapon has
// its own hold (rifle shouldered, MAC-10 pushed out, RPG on the shoulder),
// firing raises the weapon with per-weapon recoil, and a weapon switch dips
// the old gun out of view before the new one comes up.
import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import * as SkeletonUtils from '/mafia-wars/game/vendor/three/jsm/utils/SkeletonUtils.js';
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
  // the handguard: the support hand may take any point from here out to `fore` (M6.9)
  g.userData.foreNear = new THREE.Vector3(0, id === 'rpg' ? 0.05 : 0.02, profile.fore * 0.55);
  g.userData.grip = new THREE.Vector3(0, -0.02, profile.grip);
  return g;
}

function disposeWeaponClone(gun) {
  if (!gun) return;
  const skeletons = new Set(); gun.traverse((object) => { if (object.isSkinnedMesh && object.skeleton) skeletons.add(object.skeleton); });
  for (const skeleton of skeletons) skeleton.dispose();
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _t = new THREE.Vector3(), _p = new THREE.Vector3();
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _q4 = new THREE.Quaternion();
// rotate `bone` (in world space) so the direction from bone to child goes from `from` to `to`
function aimBone(bone, from, to) {
  _q.setFromUnitVectors(from, to);
  bone.getWorldQuaternion(_q2); _q2.premultiply(_q);
  bone.parent.getWorldQuaternion(_pq).invert(); bone.quaternion.copy(_pq.multiply(_q2));
  bone.updateMatrixWorld(true);
}
// rotate `bone` by the world-space rotation `q` about its own origin
function rotateBoneWorld(bone, q) {
  bone.getWorldQuaternion(_q2); _q2.premultiply(q);
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
// M6.9 weapon holds. Offsets are metres from the upper chest (Spine2) in the aim
// frame (x the character's right, y up, z along the aim): `ready` is the low
// carry, `raised` the aimed hold. Raised, the muzzle points down the aim; at
// ready it dips by readyPitch and swings across the body by readyYaw. Recoil
// pushes the weapon back by `kick` and climbs the muzzle by `kickPitch`. `blade`
// turns the torso (left shoulder forward, head kept on the aim) so the support
// hand reaches the fore grip, as a real shooter stands.
const HOLDS = Object.freeze({
  rifle: Object.freeze({ ready: [0.06, -0.08, 0.12], raised: [0.07, 0.04, 0.12], readyPitch: -0.45, readyYaw: -0.62, blade: 0.4, kick: 0.06, kickPitch: 0.07, recover: 18, fireRecoil: 0.9 }),
  compact: Object.freeze({ ready: [0.1, -0.1, 0.2], raised: [0.05, 0.05, 0.3], readyPitch: -0.5, readyYaw: -0.4, blade: 0.2, kick: 0.05, kickPitch: 0.16, recover: 22, fireRecoil: 0.8 }),
  launcher: Object.freeze({ ready: [0.14, -0.04, 0.06], raised: [0.14, 0.24, 0.0], readyPitch: -0.3, readyYaw: -0.2, blade: 0.3, kick: 0.14, kickPitch: 0.2, recover: 5, fireRecoil: 1.2 }),
});
export const WEAPON_HOLD = Object.freeze({ ak: 'rifle', mp5: 'rifle', m700: 'rifle', mac10: 'compact', rpg: 'launcher' });
export const holdFor = (weaponId) => HOLDS[WEAPON_HOLD[weaponId] || 'rifle'];
export const AIM_RULES = Object.freeze({
  fireRaiseS: 1.2,   // a shot keeps the weapon up this long
  shotAimS: 0.35,    // a remote player's upper body follows the exact shot direction this long
  maxTwist: 1.15,    // upper-body twist limit (rad); beyond it the feet turn
  turnStart: 0.9, turnStop: 0.12, turnRate: 9, moveTurnRate: 14,
  raiseRate: 9, switchDipS: 0.3,
});
// [bone, share of twist, share of pitch when raised]: the chest leads, the neck finishes
const SPINE_SHARE = Object.freeze([['spine0', 0.3, 0.2], ['spine1', 0.3, 0.2], ['spine', 0.25, 0.2], ['neck', 0.15, 0.25]]);
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
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
    this.b = { spine0: bone('Spine'), spine1: bone('Spine1'), neck: bone('Neck'), spine: bone('Spine2'), rArm: bone('RightArm'), rFore: bone('RightForeArm'), rHand: bone('RightHand'), lArm: bone('LeftArm'), lFore: bone('LeftForeArm'), lHand: bone('LeftHand'), head: bone('Head') };
    this.mixer = new THREE.AnimationMixer(root); this.actions = {};
    for (const [k, c] of Object.entries(lib.clips)) this.actions[k] = this.mixer.clipAction(c);
    this.gun = null; this.weaponId = null; this.holstered = true; this.setWeapon(weaponId, holstered);
    this.aimPitch = 0; this.ready = 1; this.dead = false; this.recoil = 0;
    this.bodyYaw = null; this.turning = false; this.fireHold = 0; this.switchDip = 0; this.shotAim = { yaw: 0, pitch: 0, t: 0 };
    this.visualOffset = new THREE.Vector3();
    // x-ray ghost: extra skinned meshes bound to the same skeleton, drawn on top
    this.ghosts = [];
    if (!presenceOnly) root.traverse((o) => { if (o.isSkinnedMesh) { const g = new THREE.SkinnedMesh(o.geometry, ghostMat); g.bind(o.skeleton, o.bindMatrix); g.renderOrder = 50; g.visible = false; g.frustumCulled = false; o.parent.add(g); this.ghosts.push(g); } });
    this.play('Idle_Gun', 0);
  }
  set ghostVisible(v) { for (const g of this.ghosts) g.visible = v; }
  setWeapon(weaponId, holstered = false) {
    if (this.weaponId === weaponId && this.gun) { this.holstered = !!holstered; this.gun.visible = this.obj.visible && !this.holstered && !this.dead; return true; }
    if (this.gun) { this.scene.remove(this.gun); disposeWeaponClone(this.gun); this.gun = null; if (weaponId) { this.switchDip = AIM_RULES.switchDipS; this.ready = 0; } }
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
  // pos, yaw = where the character aims (its facing convention); aiming: raise the weapon.
  // `moving`: the feet follow the aim at once (default, as bots and older callers expect);
  // standing, the upper body twists first and the feet turn only past AIM_RULES.turnStart.
  update(dt, pos, yaw, aiming, dead, contactOffset = null, { moving = true } = {}) {
    const targetOffset = contactOffset || _t.set(0, 0, 0);
    this.visualOffset.lerp(targetOffset, 1 - Math.exp(-18 * Math.max(0, dt)));
    let aimYaw = yaw, aimPitch = this.aimPitch;
    if (this.shotAim.t > 0) { this.shotAim.t -= dt; aimYaw = this.shotAim.yaw; aimPitch = this.shotAim.pitch; }
    if (this.bodyYaw === null) this.bodyYaw = aimYaw;
    let diff = wrapAngle(aimYaw - this.bodyYaw);
    if (moving || dead || Math.abs(diff) > AIM_RULES.turnStart) this.turning = true;
    else if (Math.abs(diff) < AIM_RULES.turnStop) this.turning = false;
    if (this.turning) { this.bodyYaw = wrapAngle(this.bodyYaw + diff * Math.min(1, dt * (moving ? AIM_RULES.moveTurnRate : AIM_RULES.turnRate))); diff = wrapAngle(aimYaw - this.bodyYaw); }
    this.obj.position.copy(pos).add(this.visualOffset); this.obj.rotation.y = this.bodyYaw; this.mixer.update(dt);
    const hold = holdFor(this.weaponId);
    this.recoil *= Math.exp(-dt * hold.recover);
    this.fireHold = Math.max(0, this.fireHold - dt); this.switchDip = Math.max(0, this.switchDip - dt);
    if (!this.gun) return;
    this.obj.updateMatrixWorld(true);
    const want = (aiming || this.fireHold > 0) && this.switchDip <= 0 ? 1 : 0;
    this.ready += (want - this.ready) * Math.min(1, dt * AIM_RULES.raiseRate);
    this.gun.visible = this.obj.visible && !dead && !this.holstered;
    if (dead || !this.b.spine) return;
    const r = this.ready, twist = THREE.MathUtils.clamp(diff, -AIM_RULES.maxTwist, AIM_RULES.maxTwist), facing = this.bodyYaw + twist;
    // the aim frame: forward along the (twisted) aim, right, and both pitched with the aim
    const fwd = new THREE.Vector3(Math.sin(facing), 0, Math.cos(facing)), right = new THREE.Vector3().crossVectors(fwd, UP).normalize(); // character's right side
    const cp = Math.cos(aimPitch), sp = Math.sin(aimPitch);
    const fwdP = fwd.clone().multiplyScalar(cp).addScaledVector(UP, sp), upP = UP.clone().multiplyScalar(cp).addScaledVector(fwd, -sp);
    // upper body: twist toward the aim; pitch with it once the weapon is up (the neck always follows), leaning back a touch under recoil
    const blade = hold.blade * (0.5 + 0.5 * r), bladeShare = 1 / (SPINE_SHARE.length - 1);
    for (const [key, twistShare, pitchShare] of SPINE_SHARE) {
      const bone = this.b[key]; if (!bone) continue;
      const pitch = key === 'neck' ? aimPitch * pitchShare : (aimPitch * r + this.recoil * hold.kickPitch * 0.5) * pitchShare;
      const turn = twist * twistShare + (key === 'neck' ? -blade : blade * bladeShare); // +yaw brings the left shoulder forward
      _q3.setFromAxisAngle(UP, turn); _q4.setFromAxisAngle(right, pitch);
      rotateBoneWorld(bone, _q4.multiply(_q3));
    }
    // the weapon, relative to the chest: low carry blended into the aimed hold
    this.b.spine.getWorldPosition(_a);
    const dip = this.switchDip / AIM_RULES.switchDipS, R = hold.ready, A = hold.raised;
    const readyPos = _b.copy(_a).addScaledVector(right, R[0]).addScaledVector(UP, R[1]).addScaledVector(fwd, R[2]);
    const raisedPos = _c.copy(_a).addScaledVector(right, A[0]).addScaledVector(upP, A[1]).addScaledVector(fwdP, A[2]);
    this.gun.position.copy(readyPos.lerp(raisedPos, r)).addScaledVector(fwdP, -hold.kick * this.recoil).addScaledVector(UP, -0.28 * dip);
    const pitch = THREE.MathUtils.lerp(hold.readyPitch, aimPitch, r) + hold.kickPitch * this.recoil - 0.5 * dip, yawOff = THREE.MathUtils.lerp(hold.readyYaw, 0, r); // muzzle swings across the body at low ready
    this.gun.quaternion.setFromEuler(new THREE.Euler(pitch, facing + Math.PI + yawOff, 0, 'YXZ'));
    this.gun.updateMatrixWorld(true);
    // IK both arms onto the gun
    const gr = this.gun.userData.grip.clone().applyMatrix4(this.gun.matrixWorld), fo = this.supportHand(this.gun.matrixWorld);
    const b = this.b;
    if (b.rArm && b.rFore && b.rHand) { b.rArm.getWorldPosition(_b); twoBoneIK(b.rArm, b.rFore, b.rHand, gr, _b.clone().addScaledVector(right, 0.5).addScaledVector(UP, -0.6).addScaledVector(fwd, -0.2)); }
    if (b.lArm && b.lFore && b.lHand) { b.lArm.getWorldPosition(_b); twoBoneIK(b.lArm, b.lFore, b.lHand, fo, _b.clone().addScaledVector(right, -0.4).addScaledVector(UP, -0.7)); }
  }
  // Support-hand target: the point on the handguard nearest the left shoulder, as far out as the arm allows.
  supportHand(matrixWorld) {
    const near = this.gun.userData.foreNear?.clone().applyMatrix4(matrixWorld), far = this.gun.userData.fore.clone().applyMatrix4(matrixWorld);
    if (!near || !this.b.lArm || !this.b.lFore || !this.b.lHand) return far;
    const shoulder = this.b.lArm.getWorldPosition(new THREE.Vector3());
    const reach = (shoulder.distanceTo(this.b.lFore.getWorldPosition(_p)) + _p.distanceTo(this.b.lHand.getWorldPosition(_t))) * 0.97;
    if (shoulder.distanceTo(far) <= reach) return far;
    // walk in from the far end until it is reachable (the handguard is short: a few steps suffice)
    for (let k = 1; k <= 8; k++) { const point = far.clone().lerp(near, k / 8); if (shoulder.distanceTo(point) <= reach) return point; }
    return near;
  }
  // A shot: the weapon comes (most of the way) up at once, recoils, and stays up for a moment.
  // `direction` (a network shot's) points the upper body exactly along it briefly.
  triggerFire(direction = null) {
    const hold = holdFor(this.weaponId);
    this.recoil = Math.min(1.4, this.recoil + hold.fireRecoil); this.fireHold = AIM_RULES.fireRaiseS;
    if (this.switchDip <= 0) this.ready = Math.max(this.ready, 0.85);
    if (direction && Number.isFinite(direction.x) && Number.isFinite(direction.y) && Number.isFinite(direction.z)) {
      this.shotAim.yaw = Math.atan2(direction.x, direction.z); this.shotAim.pitch = Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1)); this.shotAim.t = AIM_RULES.shotAimS;
    }
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
