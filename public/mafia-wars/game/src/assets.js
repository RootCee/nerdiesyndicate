// Loaders + material helpers. Every texture/model here is a real downloaded asset (Poly Haven CC0, itch CC0).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

export const manager = new THREE.LoadingManager();
const gltfLoader = new GLTFLoader(manager);
const texLoader = new THREE.TextureLoader(manager);
const rgbeLoader = new HDRLoader(manager);

export let ANISO = 4;
export function setAniso(n) { ANISO = n; }

export const loadGLB = (url) => gltfLoader.loadAsync(url);
export const loadHDR = (url) => rgbeLoader.loadAsync(url);

const texCache = new Map();
export function tex(url, { srgb = false } = {}) {
  if (texCache.has(url)) return texCache.get(url);
  const t = texLoader.load(url);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = ANISO;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(url, t);
  return t;
}

// Poly Haven texture set -> MeshStandardMaterial. `size` = real-world metres covered by one tile (set per use).
export function pbr(slug, opts = {}) {
  const base = `assets/ph/textures/${slug}/`;
  const m = new THREE.MeshStandardMaterial({
    map: tex(base + 'Diffuse.jpg', { srgb: true }),
    normalMap: tex(base + 'nor_gl.jpg'),
    roughnessMap: tex(base + 'arm.jpg'),
    metalnessMap: tex(base + 'arm.jpg'),
    aoMap: tex(base + 'arm.jpg'),
    metalness: 1, roughness: 1,
    color: opts.color ?? 0xffffff,
    vertexColors: !!opts.vertexColors,
    side: opts.side ?? THREE.FrontSide,
    envMapIntensity: opts.envMapIntensity ?? 1,
  });
  if (opts.normalScale !== undefined) m.normalScale.setScalar(opts.normalScale);
  if (opts.roughness !== undefined) { m.roughnessMap = null; m.roughness = opts.roughness; }
  if (opts.emissive) { m.emissive = new THREE.Color(opts.emissive); m.emissiveIntensity = opts.emissiveIntensity ?? 1; }
  m.name = slug;
  return m;
}

// Stillwater trick: a little shader-side grime so flat walls don't read as clean boxes.
export function weather(material, strength = 0.08) {
  material.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWeatherW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWeatherW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWeatherW;
        float wHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float wNoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(wHash(i), wHash(i+vec2(1,0)), f.x), mix(wHash(i+vec2(0,1)), wHash(i+1.0), f.x), f.y); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float wPatch = wNoise(vWeatherW.xz * 0.9 + vWeatherW.y * 0.3) * 0.6 + wNoise(vWeatherW.xy * 2.1 + vWeatherW.z) * 0.4;
        float wRise = 1.0 - smoothstep(0.0, 1.6, vWeatherW.y);   // dirt creeps up from the ground
        diffuseColor.rgb *= (1.0 - ${strength.toFixed(3)}) + wPatch * ${(strength * 2).toFixed(3)};
        diffuseColor.rgb *= 1.0 - wRise * 0.22;`);
  };
  material.customProgramCacheKey = () => 'weather' + strength;
  return material;
}

// Make a GLB mesh-ready: shadows, anisotropy, env intensity.
export function prep(root, { cast = true, receive = true, env = 1 } = {}) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = cast; o.receiveShadow = receive;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m) continue;
      m.envMapIntensity = env;
      for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap']) if (m[k]) m[k].anisotropy = ANISO;
      if (m.transparent && m.opacity === 1) { m.transparent = false; m.alphaTest = m.alphaTest || 0.5; }
      if (m.alphaMap || (m.map && m.alphaTest)) m.side = THREE.DoubleSide;
    }
  });
  return root;
}

export function bbox(obj) { return new THREE.Box3().setFromObject(obj); }
