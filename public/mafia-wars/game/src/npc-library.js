// M6.7A NPC model library (client). Loads the CC0 civilian packs built by
// tools/npc/build_npc_library.py, turns each outfit part into one geometry
// with per-vertex colour + recolour slot, and assembles a resident as ONE
// skinned mesh (head + body + legs/feet [+ accessory]) on its own lightweight
// rig. Geometry is cached per look and shared; each resident only owns a
// skeleton, a small material (palette uniforms), and an animation mixer.
// Never touches the player character system (characters.js).
import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { mergeGeometries } from '/mafia-wars/game/vendor/three/jsm/utils/BufferGeometryUtils.js';
import { loadGLB } from './assets.js';
import { NPC_LIBRARY, NPC_PALETTES, npcSlotFor } from './npc-schema.js';

const packs = new Map(), loading = new Map(), looks = new Map();
const PART_KINDS = ['head', 'body', 'legs', 'feet', 'accessory'];
const MAX_CACHED_LOOKS = 32;
const _inv = new THREE.Matrix4(), _rel = new THREE.Matrix4();

function areaOf(geometry) {
  const pos = geometry.attributes.position, idx = geometry.index, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let area = 0; const count = idx ? idx.count : pos.count;
  for (let i = 0; i < count; i += 3) {
    a.fromBufferAttribute(pos, idx ? idx.getX(i) : i); b.fromBufferAttribute(pos, idx ? idx.getX(i + 1) : i + 1); c.fromBufferAttribute(pos, idx ? idx.getX(i + 2) : i + 2);
    area += b.sub(a).cross(c.sub(a)).length() / 2;
  }
  return area;
}

// Walks up from a primitive mesh to the node named <part>__<outfit>.
function partNameOf(mesh, valid) {
  for (let node = mesh; node; node = node.parent) {
    const name = node.userData?.name || node.name;
    if (valid.has(name)) return name;
  }
  return null;
}

async function loadPack(name) {
  const def = NPC_LIBRARY[name];
  const [model, clipsGltf] = await Promise.all([loadGLB(def.file), loadGLB(def.clips)]);
  model.scene.updateMatrixWorld(true);
  const valid = new Set([...def.outfits.flatMap((o) => ['head', 'body', 'legs', 'feet'].map((k) => `${k}__${o}`)), ...Object.values(def.accessories).map((o) => `accessory__${o}`)]);
  const primitives = new Map(); let template = null;
  model.scene.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    const part = partNameOf(o, valid); if (!part) return;
    (primitives.get(part) || primitives.set(part, []).get(part)).push(o); template ||= o;
  });
  if (!template) throw new Error(`NPC pack ${name} has no parts`);
  // Rig template: the bone hierarchy only, positioned like the armature node.
  let rootBone = template.skeleton.bones[0]; while (rootBone.parent?.isBone) rootBone = rootBone.parent;
  const armature = rootBone.parent, armatureMatrix = armature.matrixWorld.clone();
  const meshMatrix = _rel.copy(armatureMatrix).invert().multiply(template.matrixWorld).clone();
  _inv.copy(template.bindMatrix).invert();
  const parts = new Map();
  for (const [part, meshes] of primitives) {
    const kind = part.split('__')[0], areas = meshes.map((m) => areaOf(m.geometry));
    const dominant = meshes.reduce((best, m, i) => (!/^Skin/.test(m.material.name) && (best < 0 || areas[i] > areas[best]) ? i : best), -1);
    const pieces = meshes.map((mesh, i) => {
      const src = mesh.geometry, g = new THREE.BufferGeometry();
      for (const key of ['position', 'skinIndex', 'skinWeight']) g.setAttribute(key, src.attributes[key].clone());
      g.setIndex(src.index ? src.index.clone() : null);
      // Bring every part into the template's bind space before merging.
      if (!mesh.bindMatrix.equals(template.bindMatrix)) g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(_inv, mesh.bindMatrix));
      const n = g.attributes.position.count, color = new Float32Array(n * 3), slot = new Float32Array(n);
      const c = mesh.material.color, s = npcSlotFor(kind, mesh.material.name, i === dominant);
      for (let v = 0; v < n; v++) { color[v * 3] = c.r; color[v * 3 + 1] = c.g; color[v * 3 + 2] = c.b; slot[v] = s; }
      g.setAttribute('color', new THREE.BufferAttribute(color, 3)); g.setAttribute('npcSlot', new THREE.BufferAttribute(slot, 1));
      return g;
    });
    parts.set(part, mergeGeometries(pieces, false)); pieces.forEach((g) => g.dispose());
  }
  // Clips: strip horizontal hip drift so residents walk in place (the server moves them).
  const clips = {};
  for (const source of clipsGltf.animations) {
    const clip = source.clone();
    for (const track of clip.tracks) if (/Hips\.position$/.test(track.name)) {
      const v = track.values, x0 = v[0], z0 = v[2];
      for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; }
    }
    clips[clip.name] = clip;
  }
  return { name, parts, clips, rootBone, armatureMatrix, meshMatrix, bindMatrix: template.bindMatrix.clone(), boneNames: template.skeleton.bones.map((b) => b.name), boneInverses: template.skeleton.boneInverses };
}

export function ensureNpcPack(name) {
  if (packs.has(name)) return Promise.resolve(packs.get(name));
  if (!loading.has(name)) loading.set(name, loadPack(name).then((pack) => { packs.set(name, pack); return pack; }).finally(() => loading.delete(name)));
  return loading.get(name);
}
export const npcPackReady = (name) => packs.has(name);
export const npcLibraryStats = () => ({ packs: [...packs.keys()], loading: [...loading.keys()], cachedLooks: looks.size });

function lookGeometry(pack, a) {
  const key = `${pack.name}|${a.head}|${a.body}|${a.legs}|${a.accessory || ''}`;
  if (looks.has(key)) return looks.get(key);
  const names = [`head__${a.head}`, `body__${a.body}`, `legs__${a.legs}`, `feet__${a.legs}`, a.accessory ? `accessory__${a.accessory}` : null].filter(Boolean);
  const geometry = mergeGeometries(names.map((n) => pack.parts.get(n)).filter(Boolean), false);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0), 1.3);
  if (looks.size >= MAX_CACHED_LOOKS) { const [oldest, g] = looks.entries().next().value; g.dispose(); looks.delete(oldest); }
  looks.set(key, geometry);
  return geometry;
}

// One material per resident (same shader program for all): slot 0 keeps the
// authored colour, slots 1-5 take skin / hair / top / bottom / shoes colours.
function paletteMaterial(a) {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, metalness: 0 });
  const palette = { value: [new THREE.Color(1, 1, 1), new THREE.Color(NPC_PALETTES.skin[a.skin]), new THREE.Color(NPC_PALETTES.hair[a.hair]), new THREE.Color(NPC_PALETTES.cloth[a.top]), new THREE.Color(NPC_PALETTES.cloth[a.bottom]), new THREE.Color(NPC_PALETTES.shoes[a.shoes])] };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.npcPalette = palette;
    shader.vertexShader = `attribute float npcSlot;\nvarying float vNpcSlot;\n${shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvNpcSlot = npcSlot;')}`;
    shader.fragmentShader = `uniform vec3 npcPalette[6];\nvarying float vNpcSlot;\n${shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n\t{ int npcS = int(vNpcSlot + 0.5); if (npcS > 0) diffuseColor.rgb = npcPalette[npcS]; }')}`;
  };
  material.customProgramCacheKey = () => 'npc-palette-1';
  return material;
}

// Builds a resident visual: { root, mesh, mixer, actions, dispose() }.
export function buildNpcVisual(identity, { castShadow = false } = {}) {
  const a = identity.appearance, pack = packs.get(a.pack); if (!pack) return null;
  const root = new THREE.Group(); root.name = `npc-${identity.id}`;
  const armature = new THREE.Object3D(); pack.armatureMatrix.decompose(armature.position, armature.quaternion, armature.scale);
  const bones = pack.rootBone.clone(true); armature.add(bones); root.add(armature);
  const skeleton = new THREE.Skeleton(pack.boneNames.map((n) => bones.getObjectByName(n)), pack.boneInverses);
  const material = paletteMaterial(a), mesh = new THREE.SkinnedMesh(lookGeometry(pack, a), material);
  pack.meshMatrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
  armature.add(mesh); mesh.bind(skeleton, pack.bindMatrix);
  mesh.boundingSphere = mesh.geometry.boundingSphere.clone(); mesh.castShadow = castShadow; mesh.receiveShadow = false;
  root.scale.set(a.build, a.height, a.build);
  const mixer = new THREE.AnimationMixer(root), actions = {};
  for (const [name, clip] of Object.entries(pack.clips)) actions[name] = mixer.clipAction(clip);
  return {
    root, mesh, mixer, actions, current: null,
    // once: play a single time and hold the last frame (a flinch, for example).
    play(name, fade = 0.25, once = false) {
      const next = actions[name]; if (!next || this.current === next) return;
      next.reset(); next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); next.clampWhenFinished = once;
      next.fadeIn(fade).play(); if (this.current) this.current.fadeOut(fade); this.current = next;
    },
    dispose() { root.removeFromParent(); mixer.stopAllAction(); mixer.uncacheRoot(root); skeleton.dispose(); material.dispose(); },
  };
}
