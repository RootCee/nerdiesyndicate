// M6.9 dev3: location-based hits. Pure math shared by the server (which alone
// decides where a shot landed) and the client (whose crosshair converges on
// the same shapes). Bodies are sets of capsules in the body frame (x to the
// character's right, y up, z forward), measured from the player rig in its
// ready and aim poses (multiplayer/test/hit-regions.test.js checks them
// against the real animated mesh).

// Damage multiplier per region: rebalance here (firearms only; RPG splash and
// resident melee are unaffected).
export const HIT_MULTIPLIERS = Object.freeze({ head: 2.0, upperTorso: 1.0, lowerTorso: 0.9, arms: 0.75, legs: 0.7 });
export const HIT_REGIONS = Object.freeze(Object.keys(HIT_MULTIPLIERS));
// Founder request (dev3.1): a firearm headshot kills outright, players and residents alike. Set false
// to fall back to the head multiplier above.
export const HEADSHOT_KILLS = true;
// Damage for a firearm hit on `region` against a target with `health` left.
export const regionDamage = (base, region, health = Infinity) => (region === 'head' && HEADSHOT_KILLS && Number.isFinite(health) ? Math.max(health, Math.round(base * HIT_MULTIPLIERS.head)) : Math.round(base * (HIT_MULTIPLIERS[region] ?? 1)));
// Residents: the CC0 library models stand 1.86 m at height factor 1; unarmed, scaled to height and build.
export const NPC_BODY_HEIGHT = 1.86;
export const residentBodyOptions = (appearance, moving = false) => ({ stance: 'unarmed', height: NPC_BODY_HEIGHT * (appearance?.height || 1), girth: appearance?.build || 1, moving });

const cap = (region, a, b, r) => Object.freeze({ region, a: Object.freeze(a), b: Object.freeze(b), r });
// Head, torso and legs are the same in every pose; the arms depend on the stance.
const CORE = Object.freeze([
  cap('head', [-0.02, 1.51, 0.02], [-0.02, 1.66, 0.03], 0.115),
  cap('upperTorso', [0, 1.3, -0.01], [0, 1.36, -0.01], 0.19),
  cap('lowerTorso', [0, 1.1, 0.01], [0, 1.12, 0.01], 0.175),
  // thigh, shin, foot per leg (the rig's hip, knee, and ankle positions)
  cap('legs', [0.11, 0.97, 0.01], [0.08, 0.53, 0.06], 0.12), cap('legs', [0.08, 0.53, 0.06], [0.07, 0.12, -0.02], 0.088), cap('legs', [0.07, 0.06, -0.04], [0.08, 0.05, 0.12], 0.055),
  cap('legs', [-0.11, 0.97, 0.01], [-0.08, 0.52, 0.02], 0.12), cap('legs', [-0.08, 0.52, 0.02], [-0.06, 0.11, -0.02], 0.088), cap('legs', [-0.06, 0.06, -0.04], [-0.07, 0.05, 0.12], 0.055),
]);
const ARMS = Object.freeze({
  // weapon raised: both arms forward to the weapon at shoulder height
  aim: Object.freeze([
    cap('arms', [0.11, 1.41, -0.12], [0.27, 1.24, 0], 0.065), cap('arms', [0.27, 1.24, 0], [0.22, 1.35, 0.2], 0.055),
    cap('arms', [-0.15, 1.4, 0.08], [0, 1.27, 0.32], 0.065), cap('arms', [0, 1.27, 0.32], [0.17, 1.33, 0.44], 0.055),
  ]),
  // low ready: forearms in front of the waist carrying the weapon
  ready: Object.freeze([
    cap('arms', [0.14, 1.41, -0.1], [0.19, 1.17, 0.06], 0.065), cap('arms', [0.19, 1.17, 0.06], [0.09, 1.15, 0.26], 0.055),
    cap('arms', [-0.16, 1.39, 0.05], [-0.16, 1.13, 0.21], 0.065), cap('arms', [-0.16, 1.13, 0.21], [-0.09, 1.01, 0.37], 0.055),
  ]),
  // no weapon (residents): arms hang at the sides
  unarmed: Object.freeze([
    cap('arms', [0.19, 1.4, 0], [0.24, 1.12, 0.01], 0.065), cap('arms', [0.24, 1.12, 0.01], [0.26, 0.86, 0.04], 0.055),
    cap('arms', [-0.19, 1.4, 0], [-0.24, 1.12, 0.01], 0.065), cap('arms', [-0.24, 1.12, 0.01], [-0.26, 0.86, 0.04], 0.055),
  ]),
});
const PIVOT = 1.05; // aiming up or down tilts the upper body about the lower spine (the rig pitches the chest ~60%)
const UPPER = new Set(['head', 'upperTorso', 'arms']);

// The capsules for one body. stance: 'aim' | 'ready' | 'unarmed'; pitch: aim pitch (rad, raised only);
// height/girth scale a 1.8 m body; moving widens the legs (stride).
export function bodyCapsules({ stance = 'ready', pitch = 0, height = 1.8, girth = 1, moving = false } = {}) {
  const s = height / 1.8, tilt = stance === 'aim' ? pitch * 0.6 : 0, c = Math.cos(tilt), sn = Math.sin(tilt);
  const place = (p, region) => {
    let [x, y, z] = p;
    if (UPPER.has(region) && tilt) { const dy = y - PIVOT; [y, z] = [PIVOT + dy * c + z * sn, -dy * sn + z * c]; }
    return [x * s * girth, y * s, z * s * girth];
  };
  return [...CORE, ...(ARMS[stance] || ARMS.ready)].map((k) => ({ region: k.region, a: place(k.a, k.region), b: place(k.b, k.region), r: k.r * s * girth * (moving && k.region === 'legs' ? 1.25 : 1) }));
}

// Smallest t >= 0 where the ray o + t d (|d| = 1) enters the capsule, or null.
export function rayCapsule(o, d, a, b, r) {
  const ba = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], oa = [o[0] - a[0], o[1] - a[1], o[2] - a[2]];
  const baba = ba[0] * ba[0] + ba[1] * ba[1] + ba[2] * ba[2], bard = ba[0] * d[0] + ba[1] * d[1] + ba[2] * d[2], baoa = ba[0] * oa[0] + ba[1] * oa[1] + ba[2] * oa[2];
  const rdoa = d[0] * oa[0] + d[1] * oa[1] + d[2] * oa[2], oaoa = oa[0] * oa[0] + oa[1] * oa[1] + oa[2] * oa[2];
  const A = baba - bard * bard, B = baba * rdoa - baoa * bard, C = baba * oaoa - baoa * baoa - r * r * baba;
  let best = null;
  const h = B * B - A * C;
  if (A > 1e-12 && h >= 0) {
    const t = (-B - Math.sqrt(h)) / A, y = baoa + t * bard;
    if (t >= 0 && y > 0 && y < baba) best = t;
  }
  for (const [cx, cy, cz] of [a, b]) { // end spheres
    const ox = o[0] - cx, oy = o[1] - cy, oz = o[2] - cz, bb = ox * d[0] + oy * d[1] + oz * d[2], cc = ox * ox + oy * oy + oz * oz - r * r, hh = bb * bb - cc;
    if (hh < 0) continue;
    const t = -bb - Math.sqrt(hh);
    if (t >= 0 && (best === null || t < best)) best = t;
  }
  return best;
}

// Where a shot (origin, unit direction, world space) first meets a body standing at `state`
// (x, y, z feet; facing yaw in the character convention: forward = (sin, 0, cos)).
// Returns { distance, region } or null.
export function bodyHit(origin, direction, state, facing, options) {
  const c = Math.cos(facing), s = Math.sin(facing);
  // world -> body frame: forward f = (s, 0, c), right r = f x up = (-c, 0, s)
  const toBody = (v, w0) => { const dx = v.x - (w0 ? w0.x : 0), dz = v.z - (w0 ? w0.z : 0); return [-c * dx + s * dz, v.y - (w0 ? w0.y : 0), s * dx + c * dz]; };
  const o = toBody(origin, state), d = toBody(direction, null);
  let best = null;
  for (const k of bodyCapsules(options)) {
    const t = rayCapsule(o, d, k.a, k.b, k.r);
    if (t !== null && (!best || t < best.distance)) best = { distance: t, region: k.region };
  }
  return best;
}

// A networked player state's body: facing = yaw + PI (the camera yaw convention), raised weapon -> aim stance.
export const playerFacing = (state) => (state.yaw || 0) + Math.PI;
export const playerBodyOptions = (state, holdsWeapon = true) => ({
  stance: !holdsWeapon ? 'unarmed' : (state.aim || 0) > 0.5 ? 'aim' : 'ready',
  pitch: state.pitch || 0, moving: state.state === 'walk' || state.state === 'run',
});
