// M7.1D: a seated pose for chess players, applied in code on top of the idle animation (neither
// character set has a sitting clip). It works on both rigs, the players' Mixamo skeleton and the
// residents' Quaternius one, by aiming each limb in world space (thighs forward, shins down, arms
// toward the board) instead of assuming how a rig's bones are oriented, then setting the body down
// so the thighs rest on the stool. It imports nothing: the vector and quaternion classes come from
// the bones themselves, so modules loaded without Three.js (npc-renderer in the pure tests) still load.

export const STOOL_TOP = 0.46;   // city-park.js stool height
const THIGH_CLEARANCE = 0.09;    // hip joint above the stool top (half a thigh's thickness)
export const SEAT_RIGS = Object.freeze({
  mixamo: Object.freeze({ lUp: 'LeftUpLeg', lLow: 'LeftLeg', lFoot: 'LeftFoot', rUp: 'RightUpLeg', rLow: 'RightLeg', rFoot: 'RightFoot', lArm: 'LeftArm', lFore: 'LeftForeArm', lHand: 'LeftHand', rArm: 'RightArm', rFore: 'RightForeArm', rHand: 'RightHand' }),
  quaternius: Object.freeze({ lUp: 'UpperLeg.L', lLow: 'LowerLeg.L', lFoot: 'Foot.L', rUp: 'UpperLeg.R', rLow: 'LowerLeg.R', rFoot: 'Foot.R', lArm: 'UpperArm.L', lFore: 'LowerArm.L', lHand: 'Wrist.L', rArm: 'UpperArm.R', rFore: 'LowerArm.R', rHand: 'Wrist.R' }),
});

// The bones the pose needs, from whichever rig `root` carries (null when neither matches).
export function findSeatBones(root) {
  // (three's glTF loader strips '.' and ':' from node names: 'Foot.L' -> 'FootL', 'mixamorig:LeftLeg' -> 'mixamorigLeftLeg')
  const key = (name) => name.replace(/^mixamorig:?/, '').replace(/[.:]/g, ''), byName = new Map();
  root.traverse((o) => { if (o.isBone) byName.set(key(o.name), o); });
  for (const rig of Object.values(SEAT_RIGS)) {
    const bones = {}; let ok = true;
    for (const [part, name] of Object.entries(rig)) { bones[part] = byName.get(key(name)); if (!bones[part]) ok = false; }
    if (ok) return bones;
  }
  return null;
}

let V3 = null, UP, DOWN, _p, _c, _cur, _q, _wq, _pq, _fwd, _right, _dir, _mid, _a, _b;
function ensureMath(bone) {
  if (V3) return;
  V3 = bone.position.constructor; const Q = bone.quaternion.constructor;
  UP = new V3(0, 1, 0); DOWN = new V3(0, -1, 0);
  [_p, _c, _cur, _fwd, _right, _dir, _mid, _a, _b] = Array.from({ length: 9 }, () => new V3());
  [_q, _wq, _pq] = [new Q(), new Q(), new Q()];
}

// Turn `bone` (in world space) so the segment to `child` (a bone, or a point fixed in the bone's
// own space) points along `dir`.
function aim(bone, child, dir) {
  bone.getWorldPosition(_p); if (child.isObject3D) child.getWorldPosition(_c); else bone.localToWorld(_c.copy(child));
  _cur.subVectors(_c, _p); if (_cur.lengthSq() < 1e-8) return;
  _q.setFromUnitVectors(_cur.normalize(), dir);
  bone.getWorldQuaternion(_wq).premultiply(_q);
  bone.parent.getWorldQuaternion(_pq).invert();
  bone.quaternion.copy(_pq.multiply(_wq));
  bone.updateMatrixWorld(true);
}
const blend = (out, ...terms) => { out.set(0, 0, 0); for (const [v, k] of terms) out.addScaledVector(v, k); return out.normalize(); };

// Poses the character in `obj` (the group placed in the world; its skeleton is inside) seated on a
// stool at (x, z), facing `yaw` (the game's facing convention: forward = (sin yaw, 0, cos yaw)).
export function applySeatedPose(obj, bones, { x, z, yaw, seatTop = STOOL_TOP }) {
  ensureMath(bones.lUp);
  obj.position.set(x, 0, z); obj.rotation.y = yaw; obj.updateMatrixWorld(true);
  _fwd.set(Math.sin(yaw), 0, Math.cos(yaw)); _right.crossVectors(_fwd, UP).normalize(); // the character's right
  // square the pelvis to the board (idle animations stand with the hips turned a little)
  bones.lUp.getWorldPosition(_a); bones.rUp.getWorldPosition(_b); _cur.subVectors(_b, _a).setY(0);
  if (_cur.lengthSq() > 1e-6) {
    _cur.normalize(); _dir.copy(_right).multiplyScalar(Math.sign(_cur.dot(_right)) || 1);
    const pelvis = bones.lUp.parent; _q.setFromUnitVectors(_cur, _dir);
    pelvis.getWorldQuaternion(_wq).premultiply(_q); pelvis.parent.getWorldQuaternion(_pq).invert(); pelvis.quaternion.copy(_pq.multiply(_wq)); pelvis.updateMatrixWorld(true);
  }
  // rigs whose feet are IK bones (not children of the shin): remember the ankle in the shin's space;
  // and every rig: the ankle's standing height, which a seated foot must not go below
  const ankles = {}, restY = {};
  for (const side of ['l', 'r']) {
    const low = bones[`${side}Low`], foot = bones[`${side}Foot`]; let k = foot.parent; while (k && k !== low) k = k.parent;
    const at = foot.getWorldPosition(new V3()); restY[side] = at.y;
    if (!k) ankles[side] = low.worldToLocal(at);
  }
  restY.l = restY.r = Math.min(restY.l, restY.r); // (an idle stance can hold one foot a little higher)
  const ankleAt = (side) => (ankles[side] ? bones[`${side}Low`].localToWorld(_c.copy(ankles[side])) : bones[`${side}Foot`].getWorldPosition(_c));
  const placeFoot = (side) => { if (!ankles[side]) return; const foot = bones[`${side}Foot`]; foot.position.copy(foot.parent.worldToLocal(ankleAt(side).clone())); foot.updateMatrixWorld(true); };
  for (const side of ['l', 'r']) {
    // which way this side lies, measured on the rig (so a mirrored rig still splays outward)
    bones[`${side}Up`].getWorldPosition(_a); obj.getWorldPosition(_b);
    const out = Math.sign(_a.sub(_b).dot(_right)) || (side === 'l' ? -1 : 1);
    aim(bones[`${side}Up`], bones[`${side}Low`], blend(_dir, [_fwd, 1], [_right, 0.1 * out], [DOWN, 0.06]));     // thigh along the stool
    aim(bones[`${side}Low`], ankles[side] || bones[`${side}Foot`], blend(_dir, [DOWN, 1], [_fwd, 0.12], [_right, 0.04 * out]));  // shin down to the floor
    placeFoot(side);
    aim(bones[`${side}Arm`], bones[`${side}Fore`], blend(_dir, [DOWN, 0.55], [_fwd, 0.75], [_right, 0.12 * out])); // upper arm forward, elbow by the body
    aim(bones[`${side}Fore`], bones[`${side}Hand`], blend(_dir, [_fwd, 1], [DOWN, 0.35], [_right, -0.25 * out])); // forearm out to the board's edge
  }
  // set the body down: hip joints at stool height, centred over the stool, a touch back
  bones.lUp.getWorldPosition(_a); bones.rUp.getWorldPosition(_b); _mid.addVectors(_a, _b).multiplyScalar(0.5);
  obj.position.x += x - _mid.x - _fwd.x * 0.04; obj.position.z += z - _mid.z - _fwd.z * 0.04;
  obj.position.y += seatTop + THIGH_CLEARANCE - _mid.y;
  obj.updateMatrixWorld(true);
  // long shins: angle them forward just enough that the feet stay on the floor
  for (const side of ['l', 'r']) {
    const low = bones[`${side}Low`], knee = low.getWorldPosition(new V3()), ankle = ankleAt(side).clone(), length = knee.distanceTo(ankle);
    if (ankle.y >= restY[side] - 0.005 || length < 1e-3) continue;
    const drop = Math.min(1, Math.max(0, (knee.y - restY[side]) / length));
    aim(low, ankles[side] || bones[`${side}Foot`], blend(_dir, [DOWN, drop], [_fwd, Math.sqrt(1 - drop * drop)])); placeFoot(side);
  }
}

// World positions of the joints that matter (tests and diagnostics).
export function seatedJoints(bones) {
  ensureMath(bones.lUp); const at = (b) => b.getWorldPosition(new V3());
  return { hips: [at(bones.lUp), at(bones.rUp)], knees: [at(bones.lLow), at(bones.rLow)], feet: [at(bones.lFoot), at(bones.rFoot)], hands: [at(bones.lHand), at(bones.rHand)], elbows: [at(bones.lFore), at(bones.rFore)] };
}
