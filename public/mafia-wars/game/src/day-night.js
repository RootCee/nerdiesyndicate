import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { environmentAt, hourAt, nightLevel } from './city-clock.js';

// M7.0A2 client day/night. One sky dome (a single draw call, no textures) and the existing
// lights, fog, exposure, and bloom, all driven by environmentAt(hour) from the shared clock.
// Disabled (no clock), the city keeps the fixed dusk look it shipped with.
const SKY_VERTEX = `varying vec3 vDir;
void main() { vDir = position; vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; }`;
const SKY_FRAGMENT = `uniform vec3 zenith, horizon, ground, cloudTint, sunDir, sunColor, moonDir;
uniform float stars, sunUp, time;
varying vec3 vDir;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < OCTAVES; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
void main() {
  vec3 d = normalize(vDir); float y = d.y;
  vec3 col = y > 0.0 ? mix(horizon, zenith, pow(clamp(y, 0.0, 1.0), 0.55)) : mix(horizon, ground, smoothstep(0.0, 0.22, -y));
  float s = max(dot(d, sunDir), 0.0);
  col += sunColor * (pow(s, 6.0) * 0.28 + pow(s, 48.0) * 0.5) * (0.35 + 0.65 * sunUp);
  col += sunColor * smoothstep(0.99935, 0.99965, s) * 3.0 * step(0.0, sunDir.y + 0.03);
  float m = max(dot(d, moonDir), 0.0);
  col += vec3(0.85, 0.9, 1.0) * smoothstep(0.99955, 0.9998, m) * 1.4 * (1.0 - sunUp) + vec3(0.25, 0.3, 0.45) * pow(m, 24.0) * 0.25 * (1.0 - sunUp);
  if (y > 0.0) {
    // soft cloud banks, painted rather than photographic; they drift slowly
    vec2 uv = d.xz / (y + 0.18) * 1.6 + vec2(time * 0.004, time * 0.0015);
    float c = smoothstep(0.52, 0.86, fbm(uv)) * smoothstep(0.0, 0.18, y);
    vec3 lit = cloudTint * (0.82 + 0.3 * pow(s, 3.0));
    col = mix(col, lit, c * 0.62);
    // stars, fading out behind cloud and at the horizon
    vec2 g = floor(d.xz / (y + 0.35) * 210.0);
    float st = step(0.9975, hash(g)) * stars * (1.0 - c) * smoothstep(0.05, 0.35, y);
    col += vec3(st) * (0.6 + 0.4 * sin(time * 1.7 + hash(g + 3.1) * 40.0));
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const linear = (rgb, out) => out.setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);
const SHADOW_MIN_ELEVATION = Math.sin(22 * Math.PI / 180); // long low-sun shadows would smear and flicker

export function createDayNight({ scene, renderer, camera, key, rim, hemi, keyDir, mobile = false }) {
  const uniforms = {
    zenith: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, ground: { value: new THREE.Color() }, cloudTint: { value: new THREE.Color() },
    sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunColor: { value: new THREE.Color() }, moonDir: { value: new THREE.Vector3(0, 1, 0) },
    stars: { value: 0 }, sunUp: { value: 1 }, time: { value: 0 },
  };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(300, mobile ? 24 : 32, mobile ? 12 : 16), new THREE.ShaderMaterial({
    uniforms, vertexShader: SKY_VERTEX, fragmentShader: SKY_FRAGMENT, defines: { OCTAVES: mobile ? 3 : 4 },
    side: THREE.BackSide, depthWrite: false, depthTest: false, // drawn first (renderOrder), everything else covers it
    fog: false, toneMapped: true,
  }));
  dome.name = 'city-sky-dome'; dome.renderOrder = -1000; dome.frustumCulled = false; dome.visible = false; dome.raycast = () => {};
  dome.castShadow = false; dome.receiveShadow = false;
  scene.add(dome);
  const classic = { background: null };
  let clock = null, devHour = null, last = null, bloomPass = null;
  const api = {
    dome, get enabled() { return !!clock || devHour !== null; }, get clock() { return clock; }, get devHour() { return devHour; },
    setBloom(pass) { bloomPass = pass; },
    setClock(next) { clock = next && next.enabled ? next : null; },
    setDevHour(hour) { devHour = Number.isFinite(hour) ? ((hour % 24) + 24) % 24 : null; },
    hour(serverNow) { return devHour !== null ? devHour : clock ? hourAt(serverNow, clock) : null; },
    // Applies the lighting for this frame; returns { hour, night } (night = 1 when disabled: the shipped dusk look).
    update(serverNow, { interior = false, seconds = 0 } = {}) {
      const hour = api.hour(serverNow);
      if (hour === null) {
        if (dome.visible) { dome.visible = false; if (classic.background) scene.background = classic.background; }
        return { hour: null, night: 1, enabled: false };
      }
      if (!dome.visible) { dome.visible = true; classic.background = scene.background; scene.background = new THREE.Color(0x0b1020); }
      uniforms.time.value = seconds;
      dome.position.copy(camera.position);
      // the lighting changes slowly: recompute a few times a second of game time, not every frame
      if (last && Math.abs(hour - last.hour) < 0.01 && last.interior === interior) return last.result;
      const e = environmentAt(hour);
      linear(e.zenith, uniforms.zenith.value); linear(e.horizon, uniforms.horizon.value); linear(e.ground, uniforms.ground.value); linear(e.clouds, uniforms.cloudTint.value);
      uniforms.sunDir.value.set(...e.sun.dir); uniforms.moonDir.value.set(...e.moon.dir);
      linear(e.key.color, uniforms.sunColor.value); uniforms.stars.value = e.stars; uniforms.sunUp.value = e.sunUp;
      if (scene.fog && !interior) { linear(e.fog.color, scene.fog.color); scene.fog.near = e.fog.near; scene.fog.far = e.fog.far; }
      linear(e.key.color, key.color); key.intensity = e.key.intensity;
      // shadow and key direction: the sun (or moon), kept above a minimum elevation
      keyDir.set(...e.keyDir); if (keyDir.y < SHADOW_MIN_ELEVATION) { const h = Math.hypot(keyDir.x, keyDir.z) || 1, c = Math.sqrt(1 - SHADOW_MIN_ELEVATION ** 2); keyDir.set(keyDir.x / h * c, SHADOW_MIN_ELEVATION, keyDir.z / h * c); }
      linear(e.rim.color, rim.color); rim.intensity = e.rim.intensity;
      linear(e.hemi.sky, hemi.color); linear(e.hemi.ground, hemi.groundColor); hemi.intensity = e.hemi.intensity;
      renderer.toneMappingExposure = e.exposure;
      if (!interior && scene.environment) scene.environmentIntensity = e.env;
      if (bloomPass) bloomPass.strength = (mobile ? 0.82 : 1) * e.bloom;
      last = { hour, interior, result: { hour, night: e.night, enabled: true, env: e } };
      return last.result;
    },
  };
  return api;
}

export { nightLevel };
