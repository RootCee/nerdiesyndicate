import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { MAP, addCollider, mapRects } from './world.js';
import { createCityPlan, chunkVisible } from './city-layout.js';
import { HybridApartmentSystem } from './apartment-system.js';
import { HybridHouseSystem } from './house-system.js';
import { CombatVenueSystem } from './combat-venue.js';
import { buildCityRoadMarkings } from './city-road-markings.js';
import { BankSystem } from './city-bank.js';
import { BANK_BUILDING_ID, bankSite } from './city-pois.js';

const material = (color, roughness = 0.88, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYLINDER = new THREE.CylinderGeometry(1, 1, 1, 8);
const buildingMaterials = new Map();
const facadeTextures = new Map();
const facadeTexture = (tint) => {
  if (facadeTextures.has(tint)) return facadeTextures.get(tint);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d'), base = new THREE.Color(tint);
  ctx.fillStyle = base.getStyle(); ctx.fillRect(0, 0, 64, 64);
  for (let y = 5; y < 64; y += 7) { ctx.fillStyle = 'rgba(18,14,12,.12)'; ctx.fillRect(0, y, 64, 1); }
  for (let y = 5, row = 0; y < 64; y += 7, row++) for (let x = row % 2 ? 8 : 0; x < 64; x += 16) {
    ctx.fillStyle = 'rgba(255,245,225,.055)'; ctx.fillRect(x, y + 1, 1, 6);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(2, 2); texture.anisotropy = 2;
  facadeTextures.set(tint, texture); return texture;
};
const buildingMaterial = (tint) => {
  if (!buildingMaterials.has(tint)) buildingMaterials.set(tint, new THREE.MeshStandardMaterial({ color: 0xffffff, map: facadeTexture(tint), roughness: 0.9 }));
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
  const trimX = x + frontDirection * (width / 2 + 0.08);
  addBox(group, mats.trim, 0.16, 0.42, depth + 0.22, trimX, 0.28, z, `city-plinth-${spec.id}`);
  addBox(group, mats.trim, 0.19, 0.32, depth + 0.34, trimX, height - 0.22, z, `city-cornice-${spec.id}`);
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
  if (!spec.enterableHouseId && kind !== 'storefront') {
    addBox(group, mats.door, 0.14, 2.25, 1.12, frontX + frontDirection * 0.04, 1.13, z + depth * 0.24, `city-door-${spec.id}`);
    addBox(group, mats.trim, 0.48, 0.16, 1.55, frontX + frontDirection * 0.2, 2.42, z + depth * 0.24, `city-door-canopy-${spec.id}`);
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
  mapRects.push({ x: x - width / 2, z: z - depth / 2, w: width, h: depth, type: spec.id === BANK_BUILDING_ID ? 'bank' : kind === 'house' ? 'house' : 'apartment' });
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
  mapRects.push({ x: x - 0.15, z: z - 0.15, w: 0.3, h: 0.3, type: 'pole' });
  return lit ? { x, y: 4.5, z } : null;
}

export function buildCityExpansion(scene, Q = {}) {
  const plan = createCityPlan(Q.mobile || Q.lowMemory ? 'mobile' : 'desktop');
  Object.assign(MAP, plan.bounds);
  const mats = {
    road: material(0x252a31), sidewalk: material(0x777a78), ground: material(0x34452e),
    yard: material(0x3e5033), roof: material(0x34383d), metal: material(0x555b61, 0.55, 0.35),
    window: material(0x162536, 0.2, 0.35), awning: material(0x8b5b32), car: material(0x4d5966, 0.55, 0.25),
    trim: material(0x292b2d, 0.82), door: material(0x38261d, 0.72),
    tire: material(0x111214), driveway: material(0x888984), bulb: new THREE.MeshBasicMaterial({ color: 0xffd39a, toneMapped: false }),
  };
  const infrastructure = new THREE.Group(); infrastructure.name = 'city-infrastructure'; scene.add(infrastructure);
  const cityWidth = plan.bounds.maxX - plan.bounds.minX, cityCenterX = (plan.bounds.minX + plan.bounds.maxX) / 2;
  addBox(infrastructure, mats.ground, cityWidth, 0.12, 296, cityCenterX, -0.08, 0, 'city-ground');
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
  // Slop New York-inspired procedural road paint: all lane dashes and
  // crosswalks share one geometry and material, keeping the upgrade to one
  // lightweight draw call on both desktop and mobile.
  const roadPaint = Q.roadPaint === false ? null : buildCityRoadMarkings(infrastructure, plan.roads);

  const chunks = [], cityLightSites = [];
  let apartment = null, house = null, originalHouse = null, duplicatedHouse = null, combatVenue = null, bank = null;
  for (const district of plan.districts) {
    const group = new THREE.Group(); group.name = `city-chunk-${district.id}`; scene.add(group);
    for (const spec of district.buildings) addBuilding(group, spec, plan.profile, mats);
    for (const vehicle of district.vehicles || []) addParkedVehicle(group, vehicle, mats);
    const lightX = district.center.x + (district.center.x > 0 ? -14 : district.center.x < 0 ? 14 : 0);
    const lightSite = addStreetlight(group, lightX, district.center.z - 20, mats, plan.profile.streetLights);
    if (lightSite) cityLightSites.push({ ...lightSite, chunkId: district.id });
    addStreetlight(group, lightX, district.center.z + 20, mats, false);
    if (district.id === 'north') {
      apartment = new HybridApartmentSystem(scene, plan.apartment, { addCollider, mobile: plan.profile.key === 'mobile' });
      group.add(apartment.exterior);
      mapRects.push({ x: plan.apartment.x - plan.apartment.width / 2, z: plan.apartment.z - plan.apartment.depth / 2, w: plan.apartment.width, h: plan.apartment.depth, type: 'apartment' });
      const originalSite = plan.originalExpansionHouses.find((site) => site.enterable);
      originalHouse = new HybridHouseSystem(scene, { ...originalSite, width: 12, depth: 10, useExistingExterior: true }, { addCollider, mobile: plan.profile.key === 'mobile' });
      group.add(originalHouse.exterior);
    }
    if (district.id === plan.enterableHouse.districtId) {
      house = new HybridHouseSystem(scene, plan.enterableHouse, { addCollider, mobile: plan.profile.key === 'mobile' });
      group.add(house.exterior);
    }
    if (district.id === plan.duplicatedOriginalNeighborhood.id) {
      const duplicatedWorld = scene.getObjectByName('hood-duplicate-world');
      if (duplicatedWorld) group.add(duplicatedWorld);
      duplicatedHouse = new HybridHouseSystem(scene, plan.duplicatedEnterableHouse, { addCollider, mobile: plan.profile.key === 'mobile' });
      group.add(duplicatedHouse.exterior);
    }
    if (district.buildings.some((b) => b.id === BANK_BUILDING_ID)) bank = new BankSystem(group, bankSite(plan), { mobile: plan.profile.key === 'mobile' });
    if (district.id === 'west-industrial-south') {
      addBox(group, mats.sidewalk, 42, 0.08, 34, -112, 0.02, -72, 'underground-parking-lot');
      combatVenue = new CombatVenueSystem(scene, plan.combatVenue, { addCollider, mobile: plan.profile.key === 'mobile' });
      group.add(combatVenue.exterior);
      mapRects.push({ x: plan.combatVenue.x - plan.combatVenue.width / 2, z: plan.combatVenue.z - plan.combatVenue.depth / 2, w: plan.combatVenue.width, h: plan.combatVenue.depth, type: 'venue' });
    }
    chunks.push({ id: district.id, center: district.center, radius: district.radius || 48, group, visible: true });
  }

  // Keep a fixed number of live point lights while district meshes stream.
  // Three.js specializes shaders for the current light count, so parenting
  // lights under hidden chunks caused new programs to compile on every first
  // district visit. Three pooled lights cover the maximum simultaneous
  // desktop districts without adding paid infrastructure or changing art.
  const cityLightPool = [];
  if (plan.profile.streetLights) for (let i = 0; i < 3; i++) {
    const light = new THREE.PointLight(0xffc57a, 0, 13, 2);
    light.name = `city-stream-light-${i}`; infrastructure.add(light); cityLightPool.push(light);
  }
  function updateCityLights() {
    const visibleIds = new Set(chunks.filter((chunk) => chunk.visible).map((chunk) => chunk.id));
    const active = cityLightSites.filter((site) => visibleIds.has(site.chunkId));
    cityLightPool.forEach((light, index) => {
      const site = active[index];
      if (site) { light.position.set(site.x, site.y, site.z); light.intensity = 28; }
      else light.intensity = 0;
    });
  }

  // One outer boundary protects the expanded city; the Milestone 3 core no
  // longer adds its small-block boundary when expansion is enabled.
  addCollider(MAP.minX - 2, MAP.minZ - 2, MAP.minX, MAP.maxZ + 2, 0, 12, { boundary: true });
  addCollider(MAP.maxX, MAP.minZ - 2, MAP.maxX + 2, MAP.maxZ + 2, 0, 12, { boundary: true });
  addCollider(MAP.minX - 2, MAP.minZ - 2, MAP.maxX + 2, MAP.minZ, 0, 12, { boundary: true });
  addCollider(MAP.minX - 2, MAP.maxZ, MAP.maxX + 2, MAP.maxZ + 2, 0, 12, { boundary: true });

  const city = {
    plan, chunks, apartment, house, originalHouse, duplicatedHouse, combatVenue, bank, infrastructure, mode: 'free-roam',
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
      if (mode === 'combat') { for (const chunk of chunks) { chunk.visible = false; chunk.group.visible = false; } updateCityLights(); }
    },
    update(player) {
      if (this.mode === 'combat') return;
      for (const chunk of chunks) {
        const visible = apartment?.active && chunk.id === 'north'
          ? true
          : (house?.active && chunk.id === plan.enterableHouse.districtId) || (originalHouse?.active && chunk.id === 'north') || (duplicatedHouse?.active && chunk.id === plan.duplicatedOriginalNeighborhood.id)
            ? true
          : chunkVisible(chunk.center, player.pos, plan.profile.activeRadius + chunk.radius * 0.35);
        if (visible !== chunk.visible) { chunk.visible = visible; chunk.group.visible = visible; }
      }
      updateCityLights();
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
        originalEnterableHouse: originalHouse?.site.id || null,
        duplicatedEnterableHouse: duplicatedHouse?.site.id || null,
        duplicatedOriginalHouses: plan.duplicatedOriginalNeighborhood.houseCount,
        activeCityLights: cityLightPool.filter((light) => light.intensity > 0).length,
        roadPaintQuads: roadPaint?.quads || 0,
        roadPaintTriangles: roadPaint?.triangles || 0,
        combatVenue: combatVenue?.site.id || null,
        bank: bank?.site.id || null,
        bounds: { ...MAP },
      };
    },
  };
  city.update({ pos: new THREE.Vector3(0, 0, 28) });
  return city;
}
