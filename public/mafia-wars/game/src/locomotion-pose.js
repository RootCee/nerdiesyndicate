// NC-INPUT-01 rc4: the crouch-walk, built from the rig's own walk clip (the rigs have walk.001 and run.001, in place;
// no crouch, sprint or strafe clips). Standing movement is the founder-approved rc2 behaviour, unchanged.
//   locomotionPlan(): clip and playback rate per state (standing: rc2; crouch-walk: walk clip, stick-proportional pace).
//   clipMeanPose() + scaleLegSwing(): shorter crouch steps, scaling each leg bone's swing around the clip's own
//     average pose (the clip's knee flex and timing are kept).
// Pure apart from the bones it is given; vector and quaternion classes come from the bones (as seated-pose.js).

export const CLIP_SPEED = Object.freeze({ walk: 0.85, run: 3.0 }); // m/s at timeScale 1 (planted-foot speed), measured
export const CLIP_STEPS_PER_SECOND = Object.freeze({ walk: 1.68, run: 3.1 }); // at timeScale 1 (4 steps per clip)
// RC4 (founder clarification): standing movement is exactly the approved rc2 behaviour: the walk clip at 1.2x whenever
// moving, the run clip at 1.05x only while sprinting, no lean or stride change. Only crouch-walking is reworked.
export const RC2_TIMESCALE = Object.freeze({ walk: 1.2, run: 1.05 });
const rad = (deg) => (deg * Math.PI) / 180;
// Crouch-walk on the upright walk clip (no flight phase, so it never reads as running): at full stick (the original
// 2.42 m/s) about 2.9 steps a second with 15% shorter steps, slower in proportion to the stick. Locking the feet
// exactly at 2.42 m/s would need ~5.8 steps a second (scurrying), so some slide remains (less than rc2's).
export const CROUCH_WALK = Object.freeze({ fullSpeed: 2.42, timeScale: 1.75, minTimeScale: 0.6, stride: 0.85, lean: rad(12), bend: 0.85 }); // bend: share of the crouched-still knee bend while walking
export const GAIT = Object.freeze({ moving: 0.25 });

// speed: planar m/s; crouch 0..1; sprinting: the game's sprint flag (remote: their run state).
export function locomotionPlan(speed, { crouch = 0, sprinting = false, armed = false } = {}) {
  const v = Number.isFinite(speed) ? Math.max(0, speed) : 0, crouched = crouch > 0.5;
  if (v < GAIT.moving) return { gait: crouched ? 'crouchIdle' : 'idle', clip: armed ? 'Idle_Gun' : 'Idle_Unarmed', timeScale: null, stride: 1, lean: 0 };
  if (crouched) {
    const ts = Math.min(CROUCH_WALK.timeScale * 1.1, Math.max(CROUCH_WALK.minTimeScale, (v / CROUCH_WALK.fullSpeed) * CROUCH_WALK.timeScale));
    return { gait: 'crouchMove', clip: 'Walk', timeScale: ts, stride: CROUCH_WALK.stride, lean: CROUCH_WALK.lean };
  }
  return sprinting ? { gait: 'sprint', clip: 'Run', timeScale: RC2_TIMESCALE.run, stride: 1, lean: 0 } : { gait: 'walk', clip: 'Walk', timeScale: RC2_TIMESCALE.walk, stride: 1, lean: 0 };
}

let Q = null, _d, _m;
const ensure = (bone) => { if (!Q) { Q = bone.quaternion.constructor; _d = new Q(); _m = new Q(); } };

// Average local rotation of each bone over a clip, sampled on a scratch mixer (call before the real mixer runs
// this frame: the bones are left in the last sampled pose and the real mixer then rewrites them).
export function clipMeanPose(Mixer, root, clip, bones, samples = 24) {
  const mixer = new Mixer(root), action = mixer.clipAction(clip); action.play();
  const sums = bones.map(() => [0, 0, 0, 0]), first = [];
  for (let i = 0; i < samples; i++) {
    action.time = (i / samples) * clip.duration; mixer.update(0);
    bones.forEach((b, k) => { const q = b.quaternion; if (i === 0) first[k] = q.clone(); const s = q.dot(first[k]) < 0 ? -1 : 1; sums[k][0] += q.x * s; sums[k][1] += q.y * s; sums[k][2] += q.z * s; sums[k][3] += q.w * s; });
  }
  action.stop(); mixer.uncacheRoot(root);
  return bones.map((b, k) => new b.quaternion.constructor(...sums[k]).normalize());
}

// Scale each bone's swing (its rotation away from the clip's mean pose) by `scale`.
// `scale` is one number or one per bone (crouching scales the shins' swing further: less knee tuck, so the feet
// barely leave the ground at the run clip's flight phase).
export function scaleLegSwing(bones, means, scale) {
  const per = Array.isArray(scale) ? scale : null;
  if (!bones?.length || !means || (!per && Math.abs(scale - 1) < 1e-3)) return;
  ensure(bones[0]);
  bones.forEach((b, k) => {
    const sc = per ? per[k] ?? 1 : scale; if (Math.abs(sc - 1) < 1e-3) return;
    const mean = means[k]; if (!mean) return;
    _d.copy(mean).invert().multiply(b.quaternion); if (_d.w < 0) { _d.x = -_d.x; _d.y = -_d.y; _d.z = -_d.z; _d.w = -_d.w; }
    const angle = 2 * Math.acos(Math.min(1, _d.w)), s = Math.sin(angle / 2);
    if (s < 1e-6) return;
    _m.setFromAxisAngle({ x: _d.x / s, y: _d.y / s, z: _d.z / s }, angle * sc);
    b.quaternion.copy(mean).multiply(_m);
  });
}
