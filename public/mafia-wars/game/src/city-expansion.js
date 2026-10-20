import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { MAP, addCollider, mapRects } from './world.js';
import { createCityPlan, chunkVisible } from './city-layout.js';
import { HybridApartmentSystem } from './apartment-system.js';

const material = (color, roughness = 0.88, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });

function addBox(parent, mat, sx, sy, sz, x, y, z, name = '') {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = name;
  parent.add(mesh); return mesh;
}

function addBuilding(group, spec, profile, mats) {
  const { x, z, width, depth, height, tint } = spec;
  const shell = material(tint);
  addBox(group, shell, width, height, depth, x, height / 2, z, `city-building-${spec.id}`);
  addBox(group, mats.roof, width + 0.35, 0.35, depth + 0.35, x, height + 0.18, z, `city-roof-${spec.id}`);
  if (profile.roofDetails) addBox(group, mats.metal, 1.6, 1.1, 1.5, x + width * 0.2, height + 0.72, z - depth * 0.18, `city-roof-unit-${spec.id}`);
  const frontX = x > 0 ? x - width / 2 - 0.03 : x + width / 2 + 0.03;
  const floors = Math.max(2, Math.floor(height / 2.7));
  const stride = profile.windowStride;
  for (let floor = 0; floor < floors; floor++) for (let i = -2; i <= 2; i += stride) {
    const window = addBox(group, mats.window, 0.08, 0.85, 0.82, frontX, 1.65 + floor * 2.55, z + i * Math.min(1.65, depth / 6), `city-window-${spec.id}`);
    if (x < 0) window.rotation.y = Math.PI;
  }
  addCollider(x - width / 2, z - depth / 2, x + width / 2, z + depth / 2, 0, height + 0.5, { cityChunk: spec.id });
  mapRects.push({ x: x - width / 2, z: z - depth / 2, w: width, h: depth, type: 'apartment' });
}

export function buildCityExpansion(scene, Q = {}) {
  const plan = createCityPlan(Q.mobile || Q.lowMemory ? 'mobile' : 'desktop');
  Object.assign(MAP, plan.bounds);
  const mats = {
    road: material(0x252a31), sidewalk: material(0x777a78), ground: material(0x34452e),
    roof: material(0x34383d), metal: material(0x555b61, 0.55, 0.35), window: material(0x162536, 0.2, 0.35),
  };
  const infrastructure = new THREE.Group(); infrastructure.name = 'city-infrastructure'; scene.add(infrastructure);
  addBox(infrastructure, mats.ground, 136, 0.12, 296, 0, -0.08, 0, 'city-ground');
  for (const road of plan.roads) {
    addBox(infrastructure, mats.road, road.width, 0.08, road.depth, road.x, 0.01, road.z, `city-road-${road.id}`);
    mapRects.push({ x: road.x - road.width / 2, z: road.z - road.depth / 2, w: road.width, h: road.depth, type: 'road' });
  }
  for (const side of [-1, 1]) {
    const x = side * 5.5;
    addBox(infrastructure, mats.sidewalk, 2, 0.1, 296, x, 0.055, 0, `city-sidewalk-${side}`);
    mapRects.push({ x: x - 1, z: -148, w: 2, h: 296, type: 'walk' });
  }

  const chunks = [];
  let apartment = null;
  for (const district of plan.districts) {
    const group = new THREE.Group(); group.name = `city-chunk-${district.id}`; scene.add(group);
    for (const spec of district.buildings) addBuilding(group, spec, plan.profile, mats);
    if (district.id === 'north') {
      apartment = new HybridApartmentSystem(scene, plan.apartment, { addCollider, mobile: plan.profile.key === 'mobile' });
      group.add(apartment.exterior);
      mapRects.push({ x: plan.apartment.x - plan.apartment.width / 2, z: plan.apartment.z - plan.apartment.depth / 2, w: plan.apartment.width, h: plan.apartment.depth, type: 'apartment' });
    }
    chunks.push({ id: district.id, center: district.center, group, visible: true });
  }

  // One outer boundary protects the expanded city; the Milestone 3 core no
  // longer adds its small-block boundary when expansion is enabled.
  addCollider(MAP.minX - 2, MAP.minZ - 2, MAP.minX, MAP.maxZ + 2, 0, 12, { boundary: true });
  addCollider(MAP.maxX, MAP.minZ - 2, MAP.maxX + 2, MAP.maxZ + 2, 0, 12, { boundary: true });
  addCollider(MAP.minX - 2, MAP.minZ - 2, MAP.maxX + 2, MAP.minZ, 0, 12, { boundary: true });
  addCollider(MAP.minX - 2, MAP.maxZ, MAP.maxX + 2, MAP.maxZ + 2, 0, 12, { boundary: true });

  const city = {
    plan, chunks, apartment, infrastructure,
    update(player) {
      for (const chunk of chunks) {
        const visible = apartment?.active && chunk.id === 'north'
          ? true
          : chunkVisible(chunk.center, player.pos, plan.profile.activeRadius);
        if (visible !== chunk.visible) { chunk.visible = visible; chunk.group.visible = visible; }
      }
    },
    stats() {
      return {
        profile: plan.profile.key,
        chunks: chunks.length,
        visibleChunks: chunks.filter((chunk) => chunk.visible).map((chunk) => chunk.id),
        buildings: plan.districts.reduce((total, district) => total + district.buildings.length, 0) + 1,
        apartment: apartment?.site.id || null,
        bounds: { ...MAP },
      };
    },
  };
  city.update({ pos: new THREE.Vector3(0, 0, 28) });
  return city;
}
