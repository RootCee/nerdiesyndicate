// M7.0A2 shared city clock and the lighting it drives. Pure (no Three.js): the server, the
// client, and the tests all use it.
//
// The clock is a function of server time, so no clock messages are sent once a client has joined:
//   hour = ((serverNow - epochMs) / cycleMs * 24 + startHour) mod 24
// The server owns the parameters (CITY_DAYNIGHT, CITY_DAY_MINUTES) and sends them in `welcome`;
// every client derives the same hour from its server-time offset. A client can only change its
// own view (the development preview below); it has no way to change anyone else's.

export const CITY_CLOCK_DEFAULTS = Object.freeze({ cycleMinutes: 60, epochMs: 0, startHour: 0 });

export function cityClockConfig({ enabled = false, cycleMinutes = CITY_CLOCK_DEFAULTS.cycleMinutes } = {}) {
  const minutes = Number.isFinite(+cycleMinutes) ? Math.min(1440, Math.max(1, +cycleMinutes)) : CITY_CLOCK_DEFAULTS.cycleMinutes;
  return Object.freeze({ enabled: !!enabled, cycleMs: Math.round(minutes * 60_000), epochMs: CITY_CLOCK_DEFAULTS.epochMs, startHour: CITY_CLOCK_DEFAULTS.startHour });
}

// A clock received from the server, checked before use (null when absent or malformed).
export function readClock(message) {
  const c = message?.clock;
  if (!c || typeof c !== 'object' || !Number.isFinite(c.cycleMs) || c.cycleMs < 60_000 || !Number.isFinite(c.epochMs)) return null;
  return Object.freeze({ enabled: c.enabled === true, cycleMs: c.cycleMs, epochMs: c.epochMs, startHour: Number.isFinite(c.startHour) ? c.startHour : 0 });
}

export function hourAt(serverNowMs, clock) {
  const h = ((serverNowMs - clock.epochMs) / clock.cycleMs * 24 + clock.startHour) % 24;
  return h < 0 ? h + 24 : h;
}

// Development-only time preview: ?tod=sunrise|noon|sunset|midnight|<hour>. Honoured on local,
// LAN, and Vercel preview hosts only, never on the production site.
export const DEV_TIMES = Object.freeze({ sunrise: 6, noon: 12, sunset: 18, midnight: 0 });
export function devTimeAllowed(hostname = '') {
  const h = String(hostname).toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.endsWith('.vercel.app')) return true;
  const o = h.split('.').map(Number);
  return o.length === 4 && o.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) && (o[0] === 10 || (o[0] === 172 && o[1] >= 16 && o[1] <= 31) || (o[0] === 192 && o[1] === 168));
}
export function parseDevTime(value) {
  if (value == null || value === '') return null;
  if (value in DEV_TIMES) return DEV_TIMES[value];
  const n = Number(value);
  return Number.isFinite(n) ? ((n % 24) + 24) % 24 : null;
}

// ---- sun, moon, and the lighting keyframes ----
const DEG = Math.PI / 180;
// Sunrise at 6:00, sunset at 18:00, noon elevation 62 degrees; the sun rises in the east (+x)
// and sets in the west, passing to the south (-z).
export function sunAt(hour) {
  const t = (hour - 6) / 12; // 0 at sunrise, 1 at sunset
  const elevation = Math.sin(t * Math.PI) * 62 * DEG;
  const azimuth = Math.PI * t; // 0 = east, PI/2 = south, PI = west
  return { elevation, azimuth, dir: dirFrom(elevation, azimuth) };
}
// The moon is high overnight (opposite the sun), a little to the north.
export function moonAt(hour) {
  const t = ((hour + 6) % 24) / 12; // 0 at 18:00, 1 at 06:00
  const elevation = Math.max(0.12, Math.sin(Math.min(1, Math.max(0, t)) * Math.PI)) * 48 * DEG;
  return { elevation, dir: dirFrom(elevation, Math.PI * t + 0.5) };
}
function dirFrom(elevation, azimuth) {
  const c = Math.cos(elevation);
  return [Math.cos(azimuth) * c, Math.sin(elevation), -Math.sin(azimuth) * c];
}

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// Streetlights and shop signs: off in daylight, on from just before sunset to just after sunrise.
export function nightLevel(hour) { return smooth(5 * DEG, -3 * DEG, sunAt(hour).elevation); }

// Keyframes by hour. Colours are sRGB hex; intensities are the renderer's (physically based) units.
// zenith/horizon/ground: sky dome; fog: colour, near, far; key: the sun or moon; hemi: sky, ground, intensity.
const K = [
  { h: 0, zenith: 0x0a1330, horizon: 0x1f2d52, ground: 0x0d111c, fog: [0x1a2440, 24, 150], key: [0xa3b6e6, 0.75], hemi: [0x51628c, 0x17171d, 0.62], rim: [0x6f5cb0, 0.18], exposure: 1.08, env: 0.32, stars: 1, bloom: 0.42, clouds: 0x1c2747 },
  { h: 4.6, zenith: 0x0e1838, horizon: 0x283358, ground: 0x10131e, fog: [0x1f2846, 24, 150], key: [0xa3b6e6, 0.7], hemi: [0x56668e, 0x17171d, 0.6], rim: [0x6f5cb0, 0.18], exposure: 1.08, env: 0.32, stars: 0.9, bloom: 0.42, clouds: 0x222c4e },
  { h: 5.6, zenith: 0x24315f, horizon: 0x8a6a86, ground: 0x2a2630, fog: [0x5a4d66, 26, 160], key: [0xffa88a, 0.55], hemi: [0x7a7aa8, 0x2a2228, 0.6], rim: [0xff8a6a, 0.3], exposure: 1.04, env: 0.36, stars: 0.35, bloom: 0.38, clouds: 0x7a5c78 },
  { h: 6.4, zenith: 0x3e5d98, horizon: 0xf2a676, ground: 0x4e4650, fog: [0xb08c84, 30, 180], key: [0xffb27a, 1.5], hemi: [0x8f98c0, 0x3c302a, 0.64], rim: [0xff9a66, 0.4], exposure: 1.0, env: 0.4, stars: 0.05, bloom: 0.32, clouds: 0xf3b38c },
  { h: 8, zenith: 0x5a8fd2, horizon: 0xbcd3ea, ground: 0x6a6458, fog: [0xa9bdcf, 40, 220], key: [0xfff0d8, 2.3], hemi: [0x9fc0e8, 0x4c4238, 0.66], rim: [0xffe2b8, 0.25], exposure: 0.93, env: 0.5, stars: 0, bloom: 0.24, clouds: 0xf4f1ec },
  { h: 12, zenith: 0x4e8ce0, horizon: 0xc6dcf0, ground: 0x6e6858, fog: [0xb6c9da, 45, 240], key: [0xfff6e8, 2.5], hemi: [0xa8c8ee, 0x504638, 0.68], rim: [0xfff0d8, 0.2], exposure: 0.9, env: 0.5, stars: 0, bloom: 0.22, clouds: 0xffffff },
  { h: 16, zenith: 0x4f86d2, horizon: 0xcfd8e6, ground: 0x6c6456, fog: [0xb8c4d2, 42, 230], key: [0xffe8c4, 2.4], hemi: [0xa6c0e6, 0x524636, 0.68], rim: [0xffd8a8, 0.25], exposure: 0.92, env: 0.5, stars: 0, bloom: 0.24, clouds: 0xfbf1e2 },
  { h: 17.4, zenith: 0x4a5fa8, horizon: 0xf3b47e, ground: 0x5a4c48, fog: [0xc29a86, 34, 200], key: [0xffbf80, 2.0], hemi: [0x9a96c4, 0x463428, 0.66], rim: [0xff9a66, 0.38], exposure: 0.98, env: 0.45, stars: 0, bloom: 0.3, clouds: 0xffc796 },
  // sunset: warm horizon under a purple sky
  { h: 18.1, zenith: 0x2f2b72, horizon: 0xf08a5e, ground: 0x3e3040, fog: [0x8c5c70, 28, 175], key: [0xff9a5a, 1.2], hemi: [0x8a70b0, 0x2c2028, 0.62], rim: [0xc070d8, 0.42], exposure: 1.0, env: 0.4, stars: 0.05, bloom: 0.36, clouds: 0xe0789a },
  // dusk: the look the city shipped with (rooftop_night), then night
  { h: 19, zenith: 0x1d2650, horizon: 0x5e4672, ground: 0x1d1a22, fog: [0x4d4258, 22, 150], key: [0xb8b0d8, 1.0], hemi: [0x7a6c9c, 0x1d1a17, 0.58], rim: [0xffb28a, 0.3], exposure: 1.04, env: 0.5, stars: 0.5, bloom: 0.4, clouds: 0x4a3c66 },
  { h: 20.4, zenith: 0x0c1534, horizon: 0x223058, ground: 0x0e121d, fog: [0x1c2642, 24, 150], key: [0xa3b6e6, 0.75], hemi: [0x51628c, 0x17171d, 0.62], rim: [0x6f5cb0, 0.18], exposure: 1.08, env: 0.32, stars: 1, bloom: 0.42, clouds: 0x1c2747 },
  { h: 24, zenith: 0x0a1330, horizon: 0x1f2d52, ground: 0x0d111c, fog: [0x1a2440, 24, 150], key: [0xa3b6e6, 0.75], hemi: [0x51628c, 0x17171d, 0.62], rim: [0x6f5cb0, 0.18], exposure: 1.08, env: 0.32, stars: 1, bloom: 0.42, clouds: 0x1c2747 },
];
const toRgb = (hex) => [(hex >> 16 & 255) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255];
const mixHex = (a, b, t) => { const x = toRgb(a), y = toRgb(b); return x.map((v, i) => v + (y[i] - v) * t); };
const mix = (a, b, t) => a + (b - a) * t;

// The full lighting state at an hour. Colours come back as [r, g, b] in 0..1 (sRGB).
export function environmentAt(hour) {
  const h = ((hour % 24) + 24) % 24;
  let i = 0; while (i < K.length - 2 && K[i + 1].h <= h) i++;
  const a = K[i], b = K[i + 1], raw = (h - a.h) / (b.h - a.h), t = raw * raw * (3 - 2 * raw);
  const sun = sunAt(h), moon = moonAt(h), night = nightLevel(h);
  // the key light follows the sun by day and the moon by night, with a dip through twilight
  const sunUp = smooth(-4 * DEG, 6 * DEG, sun.elevation);
  const keyDir = sunUp > 0.5 ? sun.dir : moon.dir;
  return {
    hour: h, night, sunUp,
    sun, moon, keyDir,
    zenith: mixHex(a.zenith, b.zenith, t), horizon: mixHex(a.horizon, b.horizon, t), ground: mixHex(a.ground, b.ground, t), clouds: mixHex(a.clouds, b.clouds, t),
    fog: { color: mixHex(a.fog[0], b.fog[0], t), near: mix(a.fog[1], b.fog[1], t), far: mix(a.fog[2], b.fog[2], t) },
    key: { color: mixHex(a.key[0], b.key[0], t), intensity: mix(a.key[1], b.key[1], t) },
    hemi: { sky: mixHex(a.hemi[0], b.hemi[0], t), ground: mixHex(a.hemi[1], b.hemi[1], t), intensity: mix(a.hemi[2], b.hemi[2], t) },
    rim: { color: mixHex(a.rim[0], b.rim[0], t), intensity: mix(a.rim[1], b.rim[1], t) },
    exposure: mix(a.exposure, b.exposure, t), env: mix(a.env, b.env, t), stars: mix(a.stars, b.stars, t), bloom: mix(a.bloom, b.bloom, t),
  };
}
