import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { MAP, addCollider, mapRects } from './world.js';
import { createCityPlan, chunkVisible } from './city-layout.js';
import { HybridApartmentSystem } from './apartment-system.js';
import { HybridHouseSystem } from './house-system.js';
import { CombatVenueSystem } from './combat-venue.js';

const material = (color, roughness = 0.88, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYLINDER = new THREE.CylinderGeometry(1, 1, 1, 8);
const buildingMaterials = new Map();
const buildingMaterial = (tint) => {
  if (!buildingMaterials.has(tint)) buildingMaterials.set(tint, material(tint));
  return buildingMaterials.get(tint);
};

function addBox(parent, mat, sx, sy, sz, x, y, z, name = '') {
  const mesh = new THREE.Mesh(UNIT_BOX, mat); mesh.scale.set(sx, sy, sz);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = name;
  parent.add(mesh); return mesh;
}

function addCylinder(parent, mat, radius, height, x, y, z, name = '') {
  const mesh = new THREE.Mesh(UNIT_CYLINDER, mat); mesh.scale.set(radius, height, radius);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = name;
  parent.add(mesh); return mesh;
}

function addBuilding(group, spec, profile, mats) {
  const { x, z, width, depth, height, tint, kind = 'apartment' } = spec;
  const shell = buildingMaterial(tint);
  if (kind === 'house') addBox(group, mats.yard, width + 5, 0.08, depth + 4, x, -0.02, z, `city-yard-${spec.id}`);
  addBox(group, shell, width, height, depth, x, height / 2, z, `city-building-${spec.id}`);
  const roofHeight = kind === 'house' ? 0.65 : 0.35;
  addBox(group, mats.roof, width + 0.35, roofHeight, depth + 0.35, x, height + roofHeight / 2, z, `city-roof-${spec.id}`);
  if (profile.roofDetails) addBox(group, mats.metal, 1.6, 1.1, 1.5, x + width * 0.2, height + 0.72, z - depth * 0.18, `city-roof-unit-${spec.id}`);
  const frontDirection = spec.facing === 'east' ? 1 : spec.facing === 'west' ? -1 : x > 0 ? -1 : 1;
  const frontX = x + frontDirection * (width / 2 + 0.03);
  if (kind === 'house' && spec.driveway) {
    const sidewalkEdge = frontDirection > 0 ? 82 : 94;
    const buildingEdge = x + frontDirection * width / 2;
    const length = Math.abs(sidewalkEdge - buildingEdge);
    const drivewayX = (sidewalkEdge + buildingEdge) / 2;
    addBox(group, mats.driveway, length, 0.06, 3.1, drivewayX, 0.035, z, `city-driveway-${spec.id}`);
    mapRects.push({ x: drivewayX - length / 2, z: z - 1.55, w: length, h: 3.1, type: 'garage' });
  }
  if (kind === 'storefront') {
    addBox(group, mats.awning, 0.7, 0.24, depth * 0.72, frontX + (x > 0 ? -0.28 : 0.28), 2.75, z, `city-awning-${spec.id}`);
    addBox(group, mats.window, 0.1, 1.55, depth * 0.64, frontX + (x > 0 ? -0.06 : 0.06), 1.35, z, `city-shopfront-${spec.id}`);
  }
  const floors = Math.max(2, Math.floor(height / 2.7));
  const stride = profile.windowStride;
  for (let floor = 0; floor < floors; floor++) for (let i = -2; i <= 2; i += stride) {
    if (kind === 'storefront' && floor === 0) continue;
    if (spec.enterableHouseId && floor === 0 && i === 0) continue;
    const window = addBox(group, mats.window, 0.08, 0.85, 0.82, frontX, 1.65 + floor * 2.55, z + i * Math.min(1.65, depth / 6), `city-window-${spec.id}`);
    if (frontDirection > 0) window.rotation.y = Math.PI;
  }
  addCollider(x - width / 2, z - depth / 2, x + width / 2, z + depth / 2, 0, height + 0.5, { cityChunk: spec.id });
  mapRects.push({ x: x - width / 2, z: z - depth / 2, w: width, h: depth, type: kind === 'house' ? 'house' : 'apartment' });
}

function addParkedVehicle(group, spec, mats) {
  addBox(group, mats.car, 1.85, 0.78, 4.2, spec.x, 0.48, spec.z, `city-vehicle-${spec.id}`);
  addBox(group, mats.window, 1.55, 0.56, 2.05, spec.x, 1.04, spec.z - 0.15, `city-vehicle-cabin-${spec.id}`);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const wheel = addCylinder(group, mats.tire, 0.34, 0.22, spec.x + sx * 0.9, 0.35, spec.z + sz * 1.35, `city-vehicle-wheel-${spec.id}`);
    wheel.rotation.z = Math.PI / 2;
  }
  addCollider(spec.x - 0.95, spec.z - 2.1, spec.x + 0.95, spec.z + 2.1, 0, 1.45, { cityChunk: spec.id, vehicle: true });
  mapRects.push({ x: spec.x - 0.95, z: spec.z - 2.1, w: 1.9, h: 4.2, type: 'garage' });
}

function addStreetlight(group, x, z, mats, lit) {
  addCylinder(group, mats.metal, 0.1, 4.8, x, 2.4, z, 'city-streetlight');
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), mats.bulb); bulb.position.set(x, 4.76, z); group.add(bulb);
  if (lit) { const light = new THREE.PointLight(0xffc57a, 28, 13, 2); light.position.set(x, 4.5, z); group.add(light); }
  mapRects.push({ x: x - 0.15, z: z - 0.15, w: 0.3, h: 0.3, type: 'pole' });
}

export function buildCityExpansion(scene, Q = {}) {
  const plan = createCityPlan(Q.mobile || Q.lowMemory ? 'mobile' : 'desktop');
  Object.assign(MAP, plan.bounds);
  const mats = {
    road: material(0x252a31), sidewalk: material(0x777a78), ground: material(0x34452e),
    yard: material(0x3e5033), roof: material(0x34383d), metal: material(0x555b61, 0.55, 0.35),
    window: material(0x162536, 0.2, 0.35), awning: material(0x8b5b32), car: material(0x4d5966, 0.55, 0.25),
    tire: material(0x111214), driveway: material(0x888984), bulb: new THREE.MeshBasicMaterial({ color: 0xffd39a, toneMapped: false }),
  };
  const infrastructure = new THREE.Group(); infrastructure.name = 'city-infrastructure'; scene.add(infrastructure);
  addBox(infrastructure, mats.ground, 280, 0.12, 296, 0, -0.08, 0, 'city-ground');
  for (const road of plan.roads) {
    addBox(infrastructure, mats.road, road.width, 0.08, road.depth, road.x, 0.01, road.z, `city-road-${road.id}`);
    mapRects.push({ x: road.x - road.width / 2, z: road.z - road.depth / 2, w: road.width, h: road.depth, type: 'road' });
    if (road.depth > road.width) {
      for (const side of [-1, 1]) {
        const x = road.x + side * (road.width / 2 + 1);
        addBox(infrastructure, mats.sidewalk, 2, 0.1, road.depth, x, 0.055, road.z, `city-sidewalk-${road.id}-${side}`);
        mapRects.push({ x: x - 1, z: road.z - road.depth / 2, w: 2, h: road.depth, type: 'walk' });
      }
    } else {
      for (const side of [-1, 1]) {
        const z = road.z + side * (road.depth / 2 + 1);
        addBox(infrastructure, mats.sidewalk, road.width, 0.1, 2, road.x, 0.055, z, `city-sidewalk-${road.id}-${side}`);
        mapRects.push({ x: road.x - road.width / 2, z: z - 1, w: road.width, h: 2, type: 'walk' });
      }
    }
  }

  const chunks = [];
  let apartment = null, house = null, combatVenue = null;
  for (const district of plan.districts) {
    const group = new THREE.Group(); group.name = `city-chunk-${district.id}`; scene.add(group);
    for (const spec of district.buildings) addBuilding(group, spec, plan.profile, mats);
    for (const vehicle of district.vehicles || []) addParkedVehicle(group, vehicle, mats);
    const lightX = district.center.x + (district.center.x > 0 ? -14 : district.center.x < 0 ? 14 : 0);
    addStreetlight(group, lightX, district.center.z - 20, mats, plan.profile.streetLights);
    addStreetlight(group, lightX, district.center.z + 20, mats, false);
    if (district.id === 'north') {
      apartment = new HybridApartmentSystem(scene, plan.apartment, { addCollider, mobile: plan.profile.key === 'mobile' });
      group.add(apartment.exterior);
      mapRects.push({ x: plan.apartment.x - plan.apartment.width / 2, z: plan.apartment.z - plan.apartment.depth / 2, w: plan.apartment.width, h: plan.apartment.depth, type: 'apartment' });
    }
    if (district.id === plan.enterableHouse.districtId) {
      house = new HybridHouseSystem(scene, plan.enterableHouse, { addCollider, mobile: plan.profile.key === 'mobile' });
      group.add(house.exterior);
    }
    if (district.id === 'west-industrial-south') {
      addBox(group, mats.sidewalk, 42, 0.08, 34, -112, 0.02, -72, 'underground-parking-lot');
      combatVenue = new CombatVenueSystem(scene, plan.combatVenue, { addCollider, mobile: plan.profile.key === 'mobile' });
      group.add(combatVenue.exterior);
      mapRects.push({ x: plan.combatVenue.x - plan.combatVenue.width / 2, z: plan.combatVenue.z - plan.combatVenue.depth / 2, w: plan.combatVenue.width, h: plan.combatVenue.depth, type: 'venue' });
    }
    chunks.push({ id: district.id, center: district.center, radius: district.radius || 48, group, visible: true });
  }

  // One outer boundary protects the expanded city; the Milestone 3 core no
  // longer adds its small-block boundary when expansion is enabled.
  addCollider(MAP.minX - 2, MAP.minZ - 2, MAP.minX, MAP.maxZ + 2, 0, 12, { boundary: true });
  addCollider(MAP.maxX, MAP.minZ - 2, MAP.maxX + 2, MAP.maxZ + 2, 0, 12, { boundary: true });
  addCollider(MAP.minX - 2, MAP.minZ - 2, MAP.maxX + 2, MAP.minZ, 0, 12, { boundary: true });
  addCollider(MAP.minX - 2, MAP.maxZ, MAP.maxX + 2, MAP.maxZ + 2, 0, 12, { boundary: true });

  const city = {
    plan, chunks, apartment, house, combatVenue, infrastructure, mode: 'free-roam',
    beginPrewarm() {
      const state = chunks.map((chunk) => chunk.group.visible);
      const culling = [];
      for (const chunk of chunks) {
        chunk.group.visible = true;
        chunk.group.traverse((object) => {
          if (!object.isMesh && !object.isSprite) return;
          culling.push([object, object.frustumCulled]); object.frustumCulled = false;
        });
      }
      return () => {
        chunks.forEach((chunk, index) => { chunk.group.visible = state[index]; });
        for (const [object, frustumCulled] of culling) object.frustumCulled = frustumCulled;
      };
    },
    setMode(mode) {
      this.mode = mode;
      if (mode === 'combat') for (const chunk of chunks) { chunk.visible = false; chunk.group.visible = false; }
    },
    update(player) {
      if (this.mode === 'combat') return;
      for (const chunk of chunks) {
        const visible = apartment?.active && chunk.id === 'north'
          ? true
          : house?.active && chunk.id === plan.enterableHouse.districtId
            ? true
          : chunkVisible(chunk.center, player.pos, plan.profile.activeRadius + chunk.radius * 0.35);
        if (visible !== chunk.visible) { chunk.visible = visible; chunk.group.visible = visible; }
      }
    },
    stats() {
      return {
        profile: plan.profile.key,
        chunks: chunks.length,
        visibleChunks: chunks.filter((chunk) => chunk.visible).map((chunk) => chunk.id),
        buildings: plan.districts.reduce((total, district) => total + district.buildings.length, 0) + 2,
        vehicles: plan.districts.reduce((total, district) => total + (district.vehicles?.length || 0), 0),
        apartment: apartment?.site.id || null,
        enterableHouse: house?.site.id || null,
        combatVenue: combatVenue?.site.id || null,
        bounds: { ...MAP },
      };
    },
  };
  city.update({ pos: new THREE.Vector3(0, 0, 28) });
  return city;
}
