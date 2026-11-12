// NC-INPUT-01 crouch: a crouched body applied in code on top of whatever clip is playing (idle, walk, run), since
// neither character set has a crouch clip. Each frame, after the animation mixer has written the legs, the thighs
// swing forward, the shins back and the feet level again, all about the character's own sideways axis in world
// space (no assumptions about bone orientation), the spine leans in, and the whole body is lowered by the height
// the bent legs lost, so the feet stay on the ground and the walk cycle keeps stepping. `amount` is 0..1 (the
// player's crouchT). Like seated-pose.js it imports nothing: vector/quaternion classes come from the bones.
import { findSeatBones } from './seated-pose.js';

export const CROUCH_POSE = Object.freeze({ knee: 1.0, lean: 0.32 }); // radians at full crouch

// The leg and spine bones of a player rig (null when the rig lacks them).
export function findCrouchBones(root) {
  const legs = findSeatBones(root); if (!legs) return null;
  let spine = null; root.traverse((o) => { if (!spine && o.isBone && o.name.replace(/^mixamorig:?/, '') === 'Spine') spine = o; });
  return { lUp: legs.lUp, lLow: legs.lLow, lFoot: legs.lFoot, rUp: legs.rUp, rLow: legs.rLow, rFoot: legs.rFoot, spine, lengths: null };
}

let V3 = null, Q, _axis, _a, _b, _wq, _pq, _rq, _oq;
function ensureMath(bone) {
  if (V3) return;
  V3 = bone.position.constructor; Q = bone.quaternion.constructor;
  [_axis, _a, _b] = [new V3(), new V3(), new V3()]; [_wq, _pq, _rq, _oq] = [new Q(), new Q(), new Q(), new Q()];
}
// Rotate `bone` by `angle` about the world-space `axis`, keeping its parent as it is.
function rotateWorld(bone, axis, angle) {
  if (!bone || !angle) return;
  bone.getWorldQuaternion(_wq); bone.parent.getWorldQuaternion(_pq);
  _rq.setFromAxisAngle(axis, angle).multiply(_wq); bone.quaternion.copy(_pq.invert().multiply(_rq)); bone.updateMatrixWorld(true);
}

// How far the body drops when both knees bend by `knee` radians (thigh and shin swing ±knee from vertical).
export function crouchDrop(lengths, knee) { return (lengths.thigh + lengths.shin) * (1 - Math.cos(knee)); }

export function applyCrouchPose(obj, bones, amount) {
  if (!bones || !(amount > 0.001)) return 0;
  ensureMath(bones.lUp);
  obj.updateMatrixWorld(true);
  if (!bones.lengths) {
    const d = (x, y) => x.getWorldPosition(_a).distanceTo(y.getWorldPosition(_b));
    bones.lengths = { thigh: (d(bones.lUp, bones.lLow) + d(bones.rUp, bones.rLow)) / 2, shin: (d(bones.lLow, bones.lFoot) + d(bones.rLow, bones.rFoot)) / 2 };
  }
  const k = CROUCH_POSE.knee * Math.min(1, amount);
  _axis.set(1, 0, 0).applyQuaternion(obj.getWorldQuaternion(_oq)).normalize(); // the character's sideways axis
  // Mixamo characters face +Z: a negative turn about +X swings a hanging thigh forward (knee out front).
  for (const [up, low, foot] of [[bones.lUp, bones.lLow, bones.lFoot], [bones.rUp, bones.rLow, bones.rFoot]]) {
    rotateWorld(up, _axis, -k); rotateWorld(low, _axis, 2 * k); rotateWorld(foot, _axis, -k);
  }
  rotateWorld(bones.spine, _axis, CROUCH_POSE.lean * Math.min(1, amount));
  const drop = crouchDrop(bones.lengths, k);
  obj.position.y -= drop; obj.updateMatrixWorld(true);
  return drop;
}
