// NC-INPUT-01 rc3: believable walking, jogging, sprinting and crouch-walking from the two locomotion clips the
// rigs have (walk.001, run.001: in place, no crouch or sprint clips). Measured on the player rig, the clips cover
// ground at about 0.85 m/s (walk) and 3.0 m/s (run) at timeScale 1. rc2 played walk at 1.2x for 4.4 m/s and run at
// 1.05x for 6.6 m/s, so the legs moved for ~1 m/s while the body glided at 4.4: the stiff, sliding look.
//   locomotionPlan(): which clip, at what playback rate (feet match the ground), stride and torso lean, per state.
//   scaleLegSwing(): shorter (crouch) or longer (sprint) strides, scaling each leg bone's swing around the clip's
//     own average pose (so the knee flex and timing of the clip are kept).
//   applyLean(): forward lean split down the spine with the head kept level.
// Pure apart from the bones it is given; vector and quaternion classes come from the bones (as seated-pose.js).

export const CLIP_SPEED = Object.freeze({ walk: 0.85, run: 3.0 }); // m/s at timeScale 1 (planted-foot speed)
const rad = (deg) => (deg * Math.PI) / 180;
export const CLIP_TORSO = Object.freeze({ walk: -4, idle: -2.5, run: 29.2 }); // degrees forward, measured (see below)
const LEAN_GAIN = 0.7;
export const GAIT = Object.freeze({
  moving: 0.25, runUp: 2.2, runDown: 1.7, sprint: 5.4,             // m/s thresholds (walk <-> jog with hysteresis)
  stride: { walk: 1, jog: 1, sprint: 1.18, crouch: 0.62 },          // leg swing scale
  // Torso lean, as a correction from each clip's own posture to a target posture (hips-to-neck, degrees forward).
  // Measured on the player rig: walk.001 leans 4 deg BACK (rc2's "too upright"), idle.001 2.5 deg back, run.001 a
  // low rifle run 29 deg FORWARD (too hunched for a jog). Targets: walk 6, jog 12, sprint 22, crouched 20 / 24. The
  // hips-to-neck line takes ~70% of a spine lean (the lowest spine joint sits above the hips), hence LEAN_GAIN.
  lean: {
    idle: 0,
    walk: rad((6 - CLIP_TORSO.walk) / LEAN_GAIN), jog: rad((12 - CLIP_TORSO.run) / LEAN_GAIN), sprint: rad((22 - CLIP_TORSO.run) / LEAN_GAIN),
    crouchIdle: rad((20 - CLIP_TORSO.idle) / LEAN_GAIN), crouchMove: rad((24 - CLIP_TORSO.run) / LEAN_GAIN),
  },
  crouchShin: 0.5, // crouch-walk: shin swing as a share of the stride scale (less knee tuck)
  crouchMoveBend: 0.45, // share of the full crouch knee bend while crouch-walking (the run clip's legs already flex):
                        // hips ~0.5 m, near the 1.17 m crouched collision height
  timeScale: [0.55, 2.3],
});

// speed: planar m/s; crouch 0..1; current: the clip key playing ('walk'|'run'|...); sprinting: the game's sprint flag.
export function locomotionPlan(speed, { crouch = 0, current = '', sprinting = false, armed = false } = {}) {
  const v = Number.isFinite(speed) ? Math.max(0, speed) : 0, crouched = crouch > 0.5;
  if (v < GAIT.moving) return { gait: crouched ? 'crouchIdle' : 'idle', clip: armed ? 'Idle_Gun' : 'Idle_Unarmed', timeScale: null, stride: 1, lean: crouched ? GAIT.lean.crouchIdle : GAIT.lean.idle };
  const clamp = (x) => Math.min(GAIT.timeScale[1], Math.max(GAIT.timeScale[0], x));
  if (crouched) { const stride = GAIT.stride.crouch; return { gait: 'crouchMove', clip: 'Run', timeScale: clamp(v / (CLIP_SPEED.run * stride)), stride, lean: GAIT.lean.crouchMove }; }
  const run = v > (current === 'run' ? GAIT.runDown : GAIT.runUp);
  if (!run) return { gait: 'walk', clip: 'Walk', timeScale: clamp(v / CLIP_SPEED.walk), stride: GAIT.stride.walk, lean: GAIT.lean.walk };
  const sprint = sprinting || v > GAIT.sprint, stride = sprint ? GAIT.stride.sprint : GAIT.stride.jog;
  return { gait: sprint ? 'sprint' : 'jog', clip: 'Run', timeScale: clamp(v / (CLIP_SPEED.run * stride)), stride, lean: sprint ? GAIT.lean.sprint : GAIT.lean.jog };
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
