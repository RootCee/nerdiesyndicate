// Tripo hoodie characters: shared Mixamo clips, a third-person AK, and two-bone IK so both hands
// hold the rifle on top of any locomotion clip (idle / walk / run / hit / fall).
// M6.9: procedural upper-body aiming on top of those clips (the rig has no aim
// clips): the spine and neck twist and pitch toward the aim, each weapon has
// its own hold (rifle shouldered, MAC-10 pushed out, RPG on the shoulder),
// firing raises the weapon with per-weapon recoil, and a weapon switch dips
// the old gun out of view before the new one comes up.
// M6.9 dev2: shouldered weapons are placed by where they touch the body: the
// stock's butt (measured from the weapon mesh) in the shoulder pocket, the
// RPG's tube on the shoulder top. Each character measures those surfaces once
// from its own skinned mesh (outfits differ by up to 8 cm) and keeps them
// relative to the upper chest, so they follow every twist, blade, and pitch.
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
  // In-place locomotion: hold the hips at the skeleton's bind x/z for every clip. (Holding each
  // clip at its own first frame left walk and run at different offsets, so a crossfade slid the
  // whole body, weapon included, ~0.8 m across the floor in 0.15 s.)
  let hips = null; glb.scene.traverse((o) => { if (!hips && o.isBone && /Hips$/.test(o.name)) hips = o; });
  for (const source of glb.animations || []) {
    const key = source.name.replace(/\.\d+$/, '');
    if (lib.clips[key]) continue;
    const clip = source.clone(); clip.name = key;
    for (const track of clip.tracks) if (/Hips\.position$/.test(track.name)) {
      const values = track.values, x0 = hips ? hips.position.x : values[0], z0 = hips ? hips.position.z : values[2];
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
// Palm centres in the gun group's frame (x right, y up, barrel toward -z), read off each
// weapon mesh's profile (multiplayer/test/aiming.test.js checks they lie on the mesh). The
// support hand takes `fore` when it reaches, else slides back toward `foreNear` (the
// magazine well on the AK and MP5, the front of the action on the M700).
const WEAPON_HANDS = Object.freeze({
  ak: Object.freeze({ grip: [0, 0.02, 0.1], fore: [0, 0.085, -0.32], foreNear: [0, 0.05, -0.15] }),
  mp5: Object.freeze({ grip: [0, 0.01, -0.01], fore: [0, 0.085, -0.38], foreNear: [0, 0.03, -0.22] }),
  m700: Object.freeze({ grip: [0, 0.035, 0.16], fore: [0, 0.065, -0.3], foreNear: [0, 0.07, -0.06] }),
  mac10: Object.freeze({ grip: [0, 0.03, -0.1], fore: [0, 0.1, -0.22], foreNear: [0, 0.1, -0.17] }),
  rpg: Object.freeze({ grip: [0, -0.02, -0.06], fore: [0, 0.055, -0.3], foreNear: [0, 0.055, -0.18] }),
});
function makeGun(id) {
  const entry = lib.weapons.get(id); if (!entry) return null;
  const g = new THREE.Group(); const inner = SkeletonUtils.clone(entry.template); g.add(inner);
  inner.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false; o.renderOrder = 0; } });
  // the template is normalised exactly like the viewmodel: centred, long axis on z, barrel toward -z
  const profile = entry.profile;
  inner.position.set(0, id === 'rpg' ? 0.08 : 0.05, id === 'rpg' ? -0.03 : -0.10);
  g.userData.weaponId = id;
  g.userData.muzzle = new THREE.Vector3(0, id === 'rpg' ? 0.09 : 0.07, profile.muzzle);
  // M6.9 dev2: palm centres on the weapon's own surfaces (pistol grip; underside of the
  // handguard, which the support hand may slide along from `foreNear` out to `fore`)
  const hands = WEAPON_HANDS[id] || WEAPON_HANDS.ak;
  g.userData.grip = new THREE.Vector3(...hands.grip);
  g.userData.fore = new THREE.Vector3(...hands.fore);
  g.userData.foreNear = new THREE.Vector3(...hands.foreNear);
  Object.assign(g.userData, weaponGeometry(id, g));
  return g;
}

// Contact points from the weapon's own mesh, in the gun group's frame (barrel toward -z):
// `butt` the centre of the stock's end face, `rest` the underside of the tube a little
// behind its middle (where an RPG sits on the shoulder), `muzzlePoint` the barrel's end.
const weaponGeometryCache = new Map();
function weaponGeometry(id, g) {
  const entry = lib.weapons.get(id), cached = weaponGeometryCache.get(id);
  if (cached?.template === entry.template) return cached.geometry;
  g.updateMatrixWorld(true);
  const pts = []; const v = new THREE.Vector3();
  g.traverse((o) => { if (!o.isMesh) return; const pos = o.geometry.attributes.position; for (let i = 0; i < pos.count; i += 2) pts.push(v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).clone()); });
  if (!pts.length) return {};
  let zMax = -Infinity, zMin = Infinity; for (const p of pts) { zMax = Math.max(zMax, p.z); zMin = Math.min(zMin, p.z); }
  const zRest = (zMin + zMax) / 2 + 0.24;
  const mean = (list, k) => list.reduce((sum, p) => sum + p[k], 0) / Math.max(1, list.length);
  const end = pts.filter((p) => p.z > zMax - 0.03), tip = pts.filter((p) => p.z < zMin + 0.03), mid = pts.filter((p) => Math.abs(p.z - zRest) < 0.04);
  const geometry = {
    butt: new THREE.Vector3(mean(end, 'x'), mean(end, 'y'), zMax),
    rest: new THREE.Vector3(mean(mid, 'x'), mid.reduce((m, p) => Math.min(m, p.y), Infinity), zRest),
    muzzlePoint: new THREE.Vector3(mean(tip, 'x'), mean(tip, 'y'), zMin),
  };
  weaponGeometryCache.set(id, { template: entry.template, geometry });
  return geometry;
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

// Hand IK that lands the PALM (midway from the wrist to the middle knuckle) on a weapon
// surface with the hand pointing along `dir` (how a hand wraps that grip): the wrist goes
// to target - dir * palm length, then the hand is turned to point along dir. When the
// target is out of reach, the collarbone (if given) protracts up to 0.3 rad toward it.
const _palm = new THREE.Vector3(), _goal = new THREE.Vector3(), _knuckle = new THREE.Vector3(), _hq = new THREE.Quaternion();
export function palmCentre(hand, knuckle, out = new THREE.Vector3()) {
  hand.getWorldPosition(out); if (knuckle) out.lerp(knuckle.getWorldPosition(_knuckle), 0.5); return out;
}
function handIK(clavicle, upper, lower, hand, knuckle, target, dir, pole) {
  const palmLength = knuckle ? hand.getWorldPosition(_goal).distanceTo(palmCentre(hand, knuckle, _palm)) : 0;
  const wrist = _goal.copy(target).addScaledVector(dir, -palmLength);
  if (clavicle) {
    upper.getWorldPosition(_a); lower.getWorldPosition(_b); hand.getWorldPosition(_c);
    const reach = (_a.distanceTo(_b) + _b.distanceTo(_c)) * 0.98, short = _a.distanceTo(wrist) - reach;
    if (short > 0) {
      clavicle.getWorldPosition(_p);
      _hq.setFromUnitVectors(_t.subVectors(_a, _p).normalize(), _c.subVectors(wrist, _p).normalize());
      const angle = 2 * Math.acos(Math.min(1, Math.abs(_hq.w)));
      if (angle > 1e-4) rotateBoneWorld(clavicle, new THREE.Quaternion().slerp(_hq, Math.min(1, 0.3 / angle)));
    }
  }
  twoBoneIK(upper, lower, hand, wrist, pole);
  if (knuckle) aimBone(hand, palmCentre(hand, knuckle, _palm).sub(hand.getWorldPosition(_c)).normalize(), dir);
}
// Hand pointing directions in the gun's frame: the shooting hand runs forward-down-in along
// the pistol grip; the support hand comes from the left, under the handguard, fingers forward-right.
const GRIP_HAND_DIR = Object.freeze(new THREE.Vector3(-0.25, -0.45, -0.85).normalize());
const SUPPORT_HAND_DIR = Object.freeze(new THREE.Vector3(0.5, 0.15, -0.85).normalize());

const UP = new THREE.Vector3(0, 1, 0);
// M6.9 weapon holds. Offsets are metres from the upper chest (Spine2) in the aim
// frame (x the character's right, y up, z along the aim): `ready` is the low
// carry, `raised` the aimed hold. Raised, the muzzle points down the aim; at
// ready it dips by readyPitch and swings across the body by readyYaw. Recoil
// pushes the weapon back by `kick` and climbs the muzzle by `kickPitch`. `blade`
// turns the torso (left shoulder forward, head kept on the aim) so the support
// hand reaches the fore grip, as a real shooter stands.
// `anchor`: 'shoulder' (the butt sits in the shoulder pocket when raised and against the
// lower chest at ready), 'shoulderTop' (the tube rests on the shoulder), or 'chest' (no
// stock: the weapon held out from the measured chest front, offsets `ready`/`raised`).
// readyYaw > 0 swings the muzzle across the body to the left, toward the support hand. Shouldered weapons recoil by
// climbing about the contact point and leaning the torso, never by sliding into the body.
const HOLDS = Object.freeze({
  rifle: Object.freeze({ anchor: 'shoulder', readyPitch: -0.55, readyYaw: 0.75, blade: 0.8, kick: 0, kickPitch: 0.09, recover: 18, fireRecoil: 0.9 }),
  compact: Object.freeze({ anchor: 'chest', ready: [0.1, -0.1, 0.12], raised: [0.03, 0.0, 0.16], readyPitch: -0.5, readyYaw: 0.4, blade: 0.2, kick: 0.05, kickPitch: 0.16, recover: 22, fireRecoil: 0.8 }),
  launcher: Object.freeze({ anchor: 'shoulderTop', readyPitch: -0.12, readyYaw: 0, blade: 0.3, kick: 0, kickPitch: 0.2, recover: 5, fireRecoil: 1.2 }),
});
export const WEAPON_HOLD = Object.freeze({ ak: 'rifle', mp5: 'rifle', m700: 'rifle', mac10: 'compact', rpg: 'launcher' });
// Locomotion crossfade (idle/walk/run). 0.12 s read as a lurch: the clips' spines differ enough
// that a shouldered weapon visibly jumped; 0.25 s blends them smoothly.
export const LOCOMOTION_FADE = 0.25;
export const holdFor = (weaponId) => HOLDS[WEAPON_HOLD[weaponId] || 'rifle'];
export const AIM_RULES = Object.freeze({
  fireRaiseS: 1.2,   // a shot keeps the weapon up this long
  shotAimS: 0.35,    // a remote player's upper body follows the exact shot direction this long
  maxTwist: 1.15,    // upper-body twist limit (rad); beyond it the feet turn
  turnStart: 0.9, turnStop: 0.12, turnRate: 9, moveTurnRate: 14,
  raiseRate: 4,      // ready <-> aimed in 0.25 s, eased (no jump at the start or end)
  fireRaiseRate: 10, // a shot brings the weapon up in 0.1 s
  switchDipS: 0.3,
});
const smooth = (t) => t * t * (3 - 2 * t);
// [bone, share of twist, share of pitch when raised]: the chest leads, the neck finishes
const CONTACT_GAP = 0.02;       // weapon contact points sit this far off the measured body surface
const SHOULDER_TOP_OUT = 0.02;  // the RPG rests this far outboard of the shoulder joint
const SPINE_SHARE = Object.freeze([['spine0', 0.3, 0.2], ['spine1', 0.3, 0.2], ['spine', 0.25, 0.2], ['neck', 0.15, 0.25]]);
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const LOCOMOTION = new Set(['walk', 'run']);
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
    this.b = { rPalm: bone('RightHandMiddle1'), lPalm: bone('LeftHandMiddle1'), lClav: bone('LeftShoulder'), spine0: bone('Spine'), spine1: bone('Spine1'), neck: bone('Neck'), spine: bone('Spine2'), rArm: bone('RightArm'), rFore: bone('RightForeArm'), rHand: bone('RightHand'), lArm: bone('LeftArm'), lFore: bone('LeftForeArm'), lHand: bone('LeftHand'), head: bone('Head') };
    this.mixer = new THREE.AnimationMixer(root); this.actions = {};
    for (const [k, c] of Object.entries(lib.clips)) this.actions[k] = this.mixer.clipAction(c);
    this.gun = null; this.weaponId = null; this.holstered = true; this.setWeapon(weaponId, holstered);
    this.aimPitch = 0; this.ready = 0; this.raise = 0; this.fastRaise = false; this.dead = false; this.recoil = 0;
    this.bodyYaw = null; this.turning = false; this.fireHold = 0; this.switchDip = 0; this.shotAim = { yaw: 0, pitch: 0, t: 0 };
    this.contacts = null; // body contact points, measured from this character's mesh on the first posed update
    this.visualOffset = new THREE.Vector3();
    // x-ray ghost: extra skinned meshes bound to the same skeleton, drawn on top
    this.ghosts = [];
    if (!presenceOnly) root.traverse((o) => { if (o.isSkinnedMesh) { const g = new THREE.SkinnedMesh(o.geometry, ghostMat); g.bind(o.skeleton, o.bindMatrix); g.renderOrder = 50; g.visible = false; g.frustumCulled = false; o.parent.add(g); this.ghosts.push(g); } });
    this.play('Idle_Gun', 0);
  }
  set ghostVisible(v) { for (const g of this.ghosts) g.visible = v; }
  setWeapon(weaponId, holstered = false) {
    if (this.weaponId === weaponId && this.gun) { this.holstered = !!holstered; this.gun.visible = this.obj.visible && !this.holstered && !this.dead; return true; }
    if (this.gun) { this.scene.remove(this.gun); disposeWeaponClone(this.gun); this.gun = null; if (weaponId) { this.switchDip = AIM_RULES.switchDipS; this.ready = this.raise = 0; } }
    this.weaponId = weaponId || null; this.holstered = weaponId ? !!holstered : true;
    if (!weaponId) return true;
    this.gun = makeGun(weaponId); if (!this.gun) return false;
    this.scene.add(this.gun); this.gun.visible = this.obj.visible && !this.holstered && !this.dead; return true;
  }
  setHolstered(holstered) { this.holstered = !!holstered || !this.weaponId; if (this.gun) this.gun.visible = this.obj.visible && !this.holstered && !this.dead; }
  play(name, fade = 0.15, once = false) {
    const key = CLIP_MAP[name] || name; if (this.cur === key && !once) return;
    const a = this.actions[key]; if (!a) return;
    const prev = this.curA;
    if (prev && prev !== a) prev.fadeOut(fade);
    a.reset().fadeIn(fade).play();
    // walk <-> run keep the stride's phase instead of restarting it (the restart read as a stutter)
    if (prev && prev !== a && LOCOMOTION.has(key) && LOCOMOTION.has(this.cur)) a.time = (prev.time / prev.getClip().duration) * a.getClip().duration;
    a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat); a.clampWhenFinished = once;
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
    const want = (aiming || this.fireHold > 0) && this.switchDip <= 0 ? 1 : 0, rate = this.fastRaise && want ? AIM_RULES.fireRaiseRate : AIM_RULES.raiseRate;
    this.raise = THREE.MathUtils.clamp(this.raise + Math.sign(want - this.raise) * Math.min(Math.abs(want - this.raise), rate * dt), 0, 1);
    if (this.raise >= 1 || !want) this.fastRaise = false;
    this.ready = smooth(this.raise);
    this.gun.visible = this.obj.visible && !dead && !this.holstered;
    if (dead || !this.b.spine) return;
    if (!this.contacts) this.contacts = this.calibrateContacts() || {};
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
      const turn = twist * twistShare - (key === 'neck' ? -blade : blade * bladeShare); // -yaw brings the left shoulder forward, the neck turns the head back onto the aim
      _q3.setFromAxisAngle(UP, turn); _q4.setFromAxisAngle(right, pitch);
      rotateBoneWorld(bone, _q4.multiply(_q3));
    }
    // the weapon: orientation first (low carry blended into the aim), then placed by its contact with the body
    const dip = this.switchDip / AIM_RULES.switchDipS;
    const pitch = THREE.MathUtils.lerp(hold.readyPitch, aimPitch, r) + hold.kickPitch * this.recoil - 0.45 * dip, yawOff = THREE.MathUtils.lerp(hold.readyYaw, 0, r); // muzzle swings across the body at low ready
    this.gun.quaternion.setFromEuler(new THREE.Euler(pitch, facing + Math.PI + yawOff, 0, 'YXZ'));
    const c = this.contacts, g = this.gun.userData, s2 = this.b.spine;
    if (hold.anchor === 'shoulder' && c.pocket && c.rib && g.butt) {
      // butt: against the lower chest at ready, in the shoulder pocket when raised; dipping, it comes away from the body
      const contact = s2.localToWorld(_b.copy(c.rib)).lerp(s2.localToWorld(_c.copy(c.pocket)), r).addScaledVector(fwd, 0.25 * dip).addScaledVector(UP, -0.05 * dip);
      this.gun.position.copy(contact).sub(_a.copy(g.butt).applyQuaternion(this.gun.quaternion));
    } else if (hold.anchor === 'shoulderTop' && c.top && g.rest) {
      // tilted up, the tube's rear would sink behind the shoulder, tilted down its grip into the chest: lift it as it tilts; dipping, lift it off forward
      const contact = s2.localToWorld(_b.copy(c.top)).addScaledVector(UP, (pitch < 0 ? 1.1 : 0.62) * (1 - Math.cos(pitch))) /* smooth through level aim */.addScaledVector(fwd, 0.3 * dip);
      this.gun.position.copy(contact).sub(_a.copy(g.rest).applyQuaternion(this.gun.quaternion));
    } else if (hold.anchor === 'chest' && c.chestFront) {
      s2.localToWorld(_a.copy(c.chestFront));
      const R = hold.ready, A = hold.raised;
      const readyPos = _b.copy(_a).addScaledVector(right, R[0]).addScaledVector(UP, R[1]).addScaledVector(fwd, R[2]);
      const raisedPos = _c.copy(_a).addScaledVector(right, A[0]).addScaledVector(upP, A[1]).addScaledVector(fwdP, A[2]);
      this.gun.position.copy(readyPos.lerp(raisedPos, r)).addScaledVector(fwdP, -hold.kick * this.recoil).addScaledVector(fwd, 0.15 * dip).addScaledVector(UP, -0.1 * dip);
    } else {
      s2.getWorldPosition(_a);
      const R = hold.ready || [0.1, -0.1, 0.2], A = hold.raised || [0.05, 0.05, 0.3];
      const readyPos = _b.copy(_a).addScaledVector(right, R[0]).addScaledVector(UP, R[1]).addScaledVector(fwd, R[2]);
      const raisedPos = _c.copy(_a).addScaledVector(right, A[0]).addScaledVector(upP, A[1]).addScaledVector(fwdP, A[2]);
      this.gun.position.copy(readyPos.lerp(raisedPos, r)).addScaledVector(fwdP, -hold.kick * this.recoil).addScaledVector(UP, -0.28 * dip);
    }
    this.gun.updateMatrixWorld(true);
    // IK both arms onto the gun
    const gr = this.gun.userData.grip.clone().applyMatrix4(this.gun.matrixWorld), fo = this.supportHand(this.gun.matrixWorld);
    const b = this.b;
    const q = this.gun.quaternion, gripDir = GRIP_HAND_DIR.clone().applyQuaternion(q), supportDir = SUPPORT_HAND_DIR.clone().applyQuaternion(q);
    if (b.rArm && b.rFore && b.rHand) { const pole = b.rArm.getWorldPosition(new THREE.Vector3()).addScaledVector(right, 0.5).addScaledVector(UP, -0.6).addScaledVector(fwd, -0.2); handIK(null, b.rArm, b.rFore, b.rHand, b.rPalm, gr, gripDir, pole); }
    if (b.lArm && b.lFore && b.lHand) {
      // the support hand lets go while the weapon is switched and takes hold again as the new one comes up
      const arm = [b.lClav, b.lArm, b.lFore, b.lHand].filter(Boolean), clip = arm.map((bone) => bone.quaternion.clone());
      const pole = b.lArm.getWorldPosition(new THREE.Vector3()).addScaledVector(right, -0.4).addScaledVector(UP, -0.7);
      handIK(b.lClav, b.lArm, b.lFore, b.lHand, b.lPalm, this.supportHand(this.gun.matrixWorld), supportDir, pole);
      if (dip > 0) { arm.forEach((bone, i) => bone.quaternion.slerp(clip[i], dip)); arm[0].updateMatrixWorld(true); }
    }
  }
  // Measure where weapons touch this body: CPU-skin the torso vertices once, in the current
  // (idle) pose, and keep the points relative to the upper chest (Spine2).
  calibrateContacts() {
    const s2 = this.b.spine, rArm = this.b.rArm; if (!s2 || !rArm) return null;
    this.obj.updateMatrixWorld(true);
    const fwd = new THREE.Vector3(Math.sin(this.bodyYaw), 0, Math.cos(this.bodyYaw)), right = new THREE.Vector3().crossVectors(fwd, UP).normalize();
    const joint = rArm.getWorldPosition(new THREE.Vector3()), chest = s2.getWorldPosition(new THREE.Vector3());
    const torso = /^(mixamorig:?)?(Spine|Spine1|Spine2|RightShoulder|LeftShoulder|Neck)$/;
    const pts = []; const v = new THREE.Vector3();
    this.inner.traverse((mesh) => {
      if (!mesh.isSkinnedMesh || mesh.renderOrder === 50) return;
      const pos = mesh.geometry.attributes.position, si = mesh.geometry.attributes.skinIndex, sw = mesh.geometry.attributes.skinWeight;
      for (let i = 0; i < pos.count; i++) {
        let best = 0; for (let k = 1; k < 4; k++) if (sw.getComponent(i, k) > sw.getComponent(i, best)) best = k;
        if (!torso.test(mesh.skeleton.bones[si.getComponent(i, best)].name)) continue;
        v.fromBufferAttribute(pos, i); mesh.applyBoneTransform(i, v); v.applyMatrix4(mesh.matrixWorld);
        const d = v.clone().sub(chest); pts.push({ p: v.clone(), x: d.dot(right), y: d.y, z: d.dot(fwd) });
      }
    });
    if (!pts.length) return null;
    const jx = joint.clone().sub(chest).dot(right), jy = joint.y - chest.y, jz = joint.clone().sub(chest).dot(fwd);
    // A contact point at (x, y) in the body frame, as far forward as the surface reaches over the
    // whole patch the weapon presses on (a butt plate is ~12 cm tall; the chest bulges lower down).
    const point = (x, y, z) => chest.clone().addScaledVector(right, x).addScaledVector(UP, y).addScaledVector(fwd, z);
    // The contact centres on the bulge itself (half way between the target height and the bulge),
    // so the plate neither digs in below it nor stands off above it.
    const frontmost = (x, y, halfWidth, below, above, gap = CONTACT_GAP) => {
      const patch = pts.filter((q) => Math.abs(q.x - x) < halfWidth && q.y > y - below && q.y < y + above);
      if (!patch.length) return null;
      const bulge = patch.reduce((a, b) => (b.z > a.z ? b : a));
      return point(x, (y + bulge.y) / 2, bulge.z + gap);
    };
    const pocket = frontmost(jx - 0.05, jy, 0.035, 0.11, 0.04, 0.012), rib = frontmost(jx - 0.07, jy - 0.16, 0.04, 0.11, 0.05), chestFront = frontmost(0, 0, 0.12, 0.12, 0.08);
    // the tube sits over the shoulder joint (further in, its left-side sight meets the hood), on the
    // highest point of the shoulder along the tube's length
    const shoulder = pts.filter((q) => Math.abs(q.x - (jx + SHOULDER_TOP_OUT)) < 0.04 && Math.abs(q.z - jz) < 0.14);
    const top = shoulder.length ? point(jx + SHOULDER_TOP_OUT, Math.max(...shoulder.map((q) => q.y)) + CONTACT_GAP, jz) : null;
    const local = (p) => (p ? s2.worldToLocal(p.clone()) : null);
    return { pocket: local(pocket), rib: local(rib), top: local(top), chestFront: local(chestFront) };
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
  // A shot: the weapon comes up fast (0.1 s), recoils, and stays up for a moment.
  // `direction` (a network shot's) points the upper body exactly along it briefly.
  triggerFire(direction = null) {
    const hold = holdFor(this.weaponId);
    this.recoil = Math.min(1.4, this.recoil + hold.fireRecoil); this.fireHold = AIM_RULES.fireRaiseS;
    if (this.raise < 1) this.fastRaise = true; // up in 0.1 s, eased: quick, never a jump
    if (direction && Number.isFinite(direction.x) && Number.isFinite(direction.y) && Number.isFinite(direction.z)) {
      this.shotAim.yaw = Math.atan2(direction.x, direction.z); this.shotAim.pitch = Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1)); this.shotAim.t = AIM_RULES.shotAimS;
    }
  }
  muzzleWorld(out = new THREE.Vector3()) { return this.gun ? out.copy(this.gun.userData.muzzlePoint || this.gun.userData.muzzle).applyMatrix4(this.gun.matrixWorld) : out.copy(this.obj.position); }
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
