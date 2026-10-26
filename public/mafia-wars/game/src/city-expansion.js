import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { MAP, addCollider, mapRects } from './world.js';
import { createCityPlan, chunkVisible, FRONT_NORMALS } from './city-layout.js';
import { HybridApartmentSystem } from './apartment-system.js';
import { HybridHouseSystem } from './house-system.js';
import { CombatVenueSystem } from './combat-venue.js';
import { buildCityRoadMarkings } from './city-road-markings.js';
import { cityGroundLayout, GROUND } from './city-ground-layout.js';
import { mergeGeometries } from '/mafia-wars/game/vendor/three/jsm/utils/BufferGeometryUtils.js';
import { BankSystem } from './city-bank.js';
import { BANK_BUILDING_ID, bankSite } from './city-pois.js';
import { createShowcaseMaterials, KitBatch, furniturePiece } from './city-showcase-kit.js';
import { showcaseBuilding } from './city-showcase.js';
import { SHOWCASE, inShowcase, showcaseFurniture, showcaseForecourts } from './city-showcase-layout.js';
import { GunShopSystem } from './gun-shop.js';
import { GUN_SHOP_BUILDING_ID, gunShopSite } from './gun-shop-layout.js';

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
  if (!buildingMaterials.has(tint)) { const m = new THREE.MeshStandardMaterial({ color: 0xffffff, map: facadeTexture(tint), roughness: 0.9 }); m.userData.previewColor = tint; buildingMaterials.set(tint, m); }
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
  // M7.0A: the facade faces the street the plan assigns (spec.front: east/west/north/south).
  // `facade(thick, h, length, out, y, along)` places a box `out` m proud of the front face and `along` m along it.
  const front = spec.front || (spec.facing === 'east' ? 'east' : spec.facing === 'west' ? 'west' : x > 0 ? 'west' : 'east');
  const [nx, nz] = FRONT_NORMALS[front], half = nx ? width / 2 : depth / 2, facadeLength = nx ? depth : width;
  const facade = (mat, thick, h, length, out, y, along, name) => addBox(group, mat, nx ? thick : length, h, nx ? length : thick, x + nx * (half + out) + (nx ? 0 : along), y, z + nz * (half + out) + (nx ? along : 0), name);
  const frontDirection = nx || 1;
  facade(mats.trim, 0.16, 0.42, facadeLength + 0.22, 0.08, 0.28, 0, `city-plinth-${spec.id}`);
  facade(mats.trim, 0.19, 0.32, facadeLength + 0.34, 0.08, height - 0.22, 0, `city-cornice-${spec.id}`);
  if (kind === 'house' && spec.driveway && nx) {
    const sidewalkEdge = frontDirection > 0 ? 82 : 94;
    const buildingEdge = x + frontDirection * width / 2;
    const length = Math.abs(sidewalkEdge - buildingEdge);
    const drivewayX = (sidewalkEdge + buildingEdge) / 2;
    addBox(group, mats.driveway, length, 0.06, 3.1, drivewayX, 0.035, z, `city-driveway-${spec.id}`);
    mapRects.push({ x: drivewayX - length / 2, z: z - 1.55, w: length, h: 3.1, type: 'garage' });
  }
  if (kind === 'storefront') {
    facade(mats.awning, 0.7, 0.24, facadeLength * 0.72, 0.31, 2.75, 0, `city-awning-${spec.id}`);
    facade(mats.window, 0.1, 1.55, facadeLength * 0.64, 0.09, 1.35, 0, `city-shopfront-${spec.id}`);
  }
  if (!spec.enterableHouseId && kind !== 'storefront') {
    facade(mats.door, 0.14, 2.25, 1.12, 0.07, 1.13, facadeLength * 0.24, `city-door-${spec.id}`);
    facade(mats.trim, 0.48, 0.16, 1.55, 0.23, 2.42, facadeLength * 0.24, `city-door-canopy-${spec.id}`);
  }
  const floors = Math.max(2, Math.floor(height / 2.7));
  const stride = profile.windowStride;
  for (let floor = 0; floor < floors; floor++) for (let i = -2; i <= 2; i += stride) {
    if (kind === 'storefront' && floor === 0) continue;
    if (spec.enterableHouseId && floor === 0 && i === 0) continue;
    facade(mats.window, 0.08, 0.85, 0.82, 0.03, 1.65 + floor * 2.55, i * Math.min(1.65, facadeLength / 6), `city-window-${spec.id}`);
  }
  registerBuilding(spec);
}
// One collider per building, 0.5 m above its height (the server's city-structures.js uses the same box).
function registerBuilding(spec) {
  const { x, z, width, depth, height, kind = 'apartment' } = spec;
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

// M7.0A: all streetlights as three instanced meshes (pole, arm over the road, lamp head). Each pole
// gets a slim collider marked `fence` so it blocks walking but, like the server's shot test, not bullets.
function buildStreetlights(parent, lights, mats) {
  const head = new THREE.MeshStandardMaterial({ color: 0x2a2c30, emissive: 0xffd39a, emissiveIntensity: 1.6, roughness: 0.5 });
  const meshes = [[new THREE.CylinderGeometry(0.09, 0.11, 4.8, 8), mats.metal, 'city-streetlight-poles'], [new THREE.BoxGeometry(0.08, 0.08, 1.4), mats.metal, 'city-streetlight-arms'], [new THREE.BoxGeometry(0.34, 0.14, 0.52), head, 'city-streetlight-heads']]
    .map(([geometry, material, name]) => { const m = new THREE.InstancedMesh(geometry, material, Math.max(1, lights.length)); m.name = name; m.count = lights.length; m.castShadow = name !== 'city-streetlight-heads'; m.receiveShadow = false; parent.add(m); return m; });
  const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
  lights.forEach((l, i) => {
    q.setFromAxisAngle(up, Math.atan2(l.armX, l.armZ));
    meshes[0].setMatrixAt(i, matrix.compose(new THREE.Vector3(l.x, 2.4, l.z), q, one));
    meshes[1].setMatrixAt(i, matrix.compose(new THREE.Vector3(l.x + l.armX * 0.7, 4.72, l.z + l.armZ * 0.7), q, one));
    meshes[2].setMatrixAt(i, matrix.compose(new THREE.Vector3(l.x + l.armX * 1.35, 4.62, l.z + l.armZ * 1.35), q, one));
    addCollider(l.x - 0.12, l.z - 0.12, l.x + 0.12, l.z + 0.12, 0, 4.8, { fence: true, streetlight: l.id });
    mapRects.push({ x: l.x - 0.15, z: l.z - 0.15, w: 0.3, h: 0.3, type: 'pole' });
  });
  for (const m of meshes) { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); }
  const api = { meshes, level: 1, setLevel(level) { api.level = Math.max(0, Math.min(1, level)); head.emissiveIntensity = 1.6 * api.level; } };
  return api;
}

export function buildCityExpansion(scene, Q = {}) {
  const plan = createCityPlan(Q.mobile || Q.lowMemory ? 'mobile' : 'desktop');
  Object.assign(MAP, plan.bounds);
  const mats = {
    road: material(0x252a31), alley: material(0x2c3036), sidewalk: material(0x777a78), ground: material(0x34452e),
    yard: material(0x3e5033), roof: material(0x34383d), metal: material(0x555b61, 0.55, 0.35),
    window: material(0x162536, 0.2, 0.35), awning: material(0x8b5b32), car: material(0x4d5966, 0.55, 0.25),
    trim: material(0x292b2d, 0.82), door: material(0x38261d, 0.72),
    tire: material(0x111214), driveway: material(0x888984), bulb: new THREE.MeshBasicMaterial({ color: 0xffd39a, toneMapped: false }),
  };
  const infrastructure = new THREE.Group(); infrastructure.name = 'city-infrastructure'; scene.add(infrastructure);
  const cityWidth = plan.bounds.maxX - plan.bounds.minX, cityCenterX = (plan.bounds.minX + plan.bounds.maxX) / 2;
  addBox(infrastructure, mats.ground, cityWidth, 0.12, 296, cityCenterX, -0.08, 0, 'city-ground');
  // M7.0A: the shared ground layout (city-ground-layout.js): road surfaces that never overlap,
  // sidewalks that stop at cross streets, alleys without sidewalks. One merged mesh per material.
  const ground = cityGroundLayout(plan);
  const merged = (rects, mat, y0, y1, name) => {
    if (!rects.length) return null;
    const geometry = mergeGeometries(rects.map((r) => new THREE.BoxGeometry(r.maxX - r.minX, y1 - y0, r.maxZ - r.minZ).translate((r.minX + r.maxX) / 2, (y0 + y1) / 2, (r.minZ + r.maxZ) / 2)));
    const mesh = new THREE.Mesh(geometry, mat); mesh.name = name; mesh.receiveShadow = true; mesh.castShadow = false; infrastructure.add(mesh); return mesh;
  };
  merged(ground.surfaces, mats.road, -0.03, GROUND.roadTop, 'city-roads');
  merged(ground.alleys, mats.alley, -0.03, GROUND.roadTop, 'city-alleys');
  // M7.0B1: the North Market showcase (city-showcase*.js); ?showcase=0 shows the city without it.
  const kit = Q.showcase === false ? null : createShowcaseMaterials({ mobile: plan.profile.key === 'mobile' });
  kit?.setNight(1); // lit, matching the city's shipped dusk look until the clock says otherwise
  const showcaseWalk = (w) => kit && inShowcase((w.minX + w.maxX) / 2, (w.minZ + w.maxZ) / 2);
  merged(ground.sidewalks.filter((w) => !showcaseWalk(w)), mats.sidewalk, 0.005, GROUND.sidewalkTop, 'city-sidewalks');
  const showcaseStats = { buildings: 0, triangles: 0, furniture: 0 };
  if (kit) {
    // paved sidewalks with a raised curb, paved forecourts, and street furniture
    const walks = ground.sidewalks.filter(showcaseWalk), batch = new KitBatch();
    for (const w of walks) {
      batch.box(kit.m.pavers, (w.minX + w.maxX) / 2, (0.005 + GROUND.sidewalkTop) / 2, (w.minZ + w.maxZ) / 2, w.maxX - w.minX, GROUND.sidewalkTop - 0.005, w.maxZ - w.minZ);
      const c = 0.18, edge = w.vertical ? (w.side < 0 ? w.maxX - c / 2 : w.minX + c / 2) : (w.side < 0 ? w.maxZ - c / 2 : w.minZ + c / 2);
      if (w.vertical) batch.box(kit.m.curb, edge, 0.065, (w.minZ + w.maxZ) / 2, c, 0.13, w.maxZ - w.minZ); else batch.box(kit.m.curb, (w.minX + w.maxX) / 2, 0.065, edge, w.maxX - w.minX, 0.13, c);
    }
    // painted lawn over the showcase's open ground (below roads and sidewalks)
    batch.box(kit.m.grass, (SHOWCASE.minX + SHOWCASE.maxX) / 2, -0.015, (SHOWCASE.minZ + SHOWCASE.maxZ) / 2, SHOWCASE.maxX - SHOWCASE.minX, 0.02, SHOWCASE.maxZ - SHOWCASE.minZ);
    for (const r of showcaseForecourts(plan, ground)) batch.box(kit.m.forecourt, (r.minX + r.maxX) / 2, 0.05, (r.minZ + r.maxZ) / 2, r.maxX - r.minX, 0.1, r.maxZ - r.minZ);
    for (const f of showcaseFurniture(plan, ground)) {
      furniturePiece(batch, kit, f); showcaseStats.furniture++;
      // furniture blocks walking but not bullets, like the streetlight poles (the server has no furniture)
      const r = f.kind === 'tree' ? 0.14 : 0;
      addCollider(f.x - (r || f.width / 2), f.z - (r || f.depth / 2), f.x + (r || f.width / 2), f.z + (r || f.depth / 2), 0, Math.min(f.height, 1.2), { fence: true, furniture: f.id });
      mapRects.push({ x: f.x - f.width / 2, z: f.z - f.depth / 2, w: f.width, h: f.depth, type: 'pole' });
    }
    batch.build(infrastructure, 'showcase-ground');
    showcaseStats.triangles += batch.triangles;
  }
  for (const road of plan.roads) mapRects.push({ x: road.x - road.width / 2, z: road.z - road.depth / 2, w: road.width, h: road.depth, type: 'road' });
  for (const a of ground.alleys) mapRects.push({ x: a.minX, z: a.minZ, w: a.maxX - a.minX, h: a.maxZ - a.minZ, type: 'alley' });
  for (const w of ground.sidewalks) mapRects.push({ x: w.minX, z: w.minZ, w: w.maxX - w.minX, h: w.maxZ - w.minZ, type: 'walk' });
  // Slop New York-inspired procedural road paint: all lane dashes and
  // crosswalks share one geometry and material, keeping the upgrade to one
  // lightweight draw call on both desktop and mobile.
  const roadPaint = Q.roadPaint === false ? null : buildCityRoadMarkings(infrastructure, plan.roads.filter((r) => Math.min(r.width, r.depth) >= GROUND.alleyMaxWidth));
  // M7.0A: streetlights from the shared layout, on the sidewalks at the curb (instanced: three draw calls).
  const streetlights = buildStreetlights(infrastructure, ground.streetlights, mats);

  const chunks = [];
  let apartment = null, house = null, originalHouse = null, duplicatedHouse = null, combatVenue = null, bank = null, gunShop = null;
  for (const district of plan.districts) {
    const group = new THREE.Group(); group.name = `city-chunk-${district.id}`; scene.add(group);
    const batch = kit ? new KitBatch() : null;
    for (const spec of district.buildings) {
      if (kit && inShowcase(spec.x, spec.z)) { showcaseBuilding(batch, kit, spec, group, { mobile: plan.profile.key === 'mobile' }); registerBuilding(spec); showcaseStats.buildings++; }
      else addBuilding(group, spec, plan.profile, mats);
    }
    if (batch?.parts.size) { batch.build(group, `showcase-${district.id}`); showcaseStats.triangles += batch.triangles; }
    for (const vehicle of district.vehicles || []) addParkedVehicle(group, vehicle, mats);
    if (district.id === 'north') {
      apartment = new HybridApartmentSystem(scene, plan.apartment, { addCollider, mobile: plan.profile.key === 'mobile', kit });
      if (kit) { showcaseStats.buildings++; showcaseStats.triangles += apartment.exteriorTriangles || 0; }
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
    if (district.buildings.some((b) => b.id === GUN_SHOP_BUILDING_ID)) gunShop = new GunShopSystem(scene, gunShopSite(plan), { addCollider, mobile: plan.profile.key === 'mobile', kit });
    if (district.buildings.some((b) => b.id === BANK_BUILDING_ID)) bank = new BankSystem(group, bankSite(plan), { mobile: plan.profile.key === 'mobile', visuals: !kit || !inShowcase(bankSite(plan).x, bankSite(plan).z) });
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
  // The pooled lights follow the lamps nearest the player. Re-picked only after the player moves a
  // metre (or on a mode/level change), without allocating, so walking makes no per-frame garbage.
  const lightFocus = { x: 0, z: 28, picked: false }, nearest = [];
  const lightSites = ground.streetlights.map((l) => ({ x: l.x, z: l.z, lx: l.x + l.armX * 1.35, ly: 4.4, lz: l.z + l.armZ * 1.35, color: 0xffc57a, intensity: 28 }));
  // M7.0B1: the showcase's entrances (bank, Nerdie Threads, The Blaq Note, North Court) join the pool at night
  if (kit) for (const [x, y, z] of [[-65, 3.6, 85.2], [-65, 3.2, 107.2], [-65, 2.9, 54.6], [18.2, 2.7, 112]]) lightSites.push({ x, z, lx: x, ly: y, lz: z, color: 0xffd2a0, intensity: 22 });
  function updateCityLights(focus = null) {
    if (focus) {
      if (lightFocus.picked && (focus.x - lightFocus.x) ** 2 + (focus.z - lightFocus.z) ** 2 < 1) return;
      lightFocus.x = focus.x; lightFocus.z = focus.z;
    }
    lightFocus.picked = true;
    nearest.length = 0;
    if (cityLightPool.length && city?.mode !== 'combat') for (const l of lightSites) {
      const d = (l.x - lightFocus.x) ** 2 + (l.z - lightFocus.z) ** 2;
      if (nearest.length < cityLightPool.length) nearest.push([d, l]);
      else if (d < nearest[nearest.length - 1][0]) { nearest[nearest.length - 1][0] = d; nearest[nearest.length - 1][1] = l; }
      else continue;
      for (let i = nearest.length - 1; i > 0 && nearest[i][0] < nearest[i - 1][0]; i--) [nearest[i], nearest[i - 1]] = [nearest[i - 1], nearest[i]];
    }
    cityLightPool.forEach((light, index) => {
      const site = nearest[index]?.[1];
      if (site) { light.position.set(site.lx, site.ly, site.lz); light.color.setHex(site.color); light.intensity = site.intensity * streetlights.level; }
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
    plan, ground, chunks, apartment, house, originalHouse, duplicatedHouse, combatVenue, bank, gunShop, infrastructure, mode: 'free-roam',
    // M7.0A2: the shared clock's night level (1 = lit, the original dusk look; 0 = daylight, all off)
    nightLevel: 1,
    setStreetlightLevel(level) { streetlights.setLevel(level); updateCityLights(); },
    setNightLevel(level) {
      const l = Math.max(0, Math.min(1, level)); if (Math.abs(l - city.nightLevel) < 0.002) return;
      city.nightLevel = l; streetlights.setLevel(l); kit?.setNight(l); updateCityLights();
    },
    showcase: kit ? { zone: SHOWCASE, ...showcaseStats } : null,
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
      if (mode === 'combat') { for (const chunk of chunks) { chunk.visible = false; chunk.group.visible = false; } }
      updateCityLights(); // off in combat; re-picked at once on return
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
      updateCityLights(player.pos);
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
        streetlights: ground.streetlights.length,
        showcase: kit ? { zone: SHOWCASE.id, ...showcaseStats } : null,
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
