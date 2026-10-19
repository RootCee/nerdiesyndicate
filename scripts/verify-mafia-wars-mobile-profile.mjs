import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', 'public', 'mafia-wars', 'game', 'src');
const [main, assets, audio, world, characters, cityExpansion, apartment] = await Promise.all(
  ['main.js', 'assets.js', 'audio.js', 'world.js', 'characters.js', 'city-expansion.js', 'apartment-system.js'].map((file) => readFile(path.join(root, file), 'utf8')),
);

assert.match(main, /Q\.lowMemory = Q\.mobile && qs\.get\('full'\) !== '1'/);
assert.match(main, /renderer\.shadowMap\.enabled = !Q\.lowMemory/);
assert.match(main, /if \(composer\) composer\.render\(\); else renderer\.render\(scene, camera\)/);
assert.match(main, /if \(Q\.lowMemory\) await weapon\.load\(\)/);
assert.match(main, /Q\.lowMemory \? \['blue_zip', 'navy'\]/);
assert.match(assets, /normalMap: LOW_MEMORY \? null/);
assert.match(assets, /roughnessMap: LOW_MEMORY \? null/);
assert.match(world, /if \(!Q\.lowMemory\) \{[\s\S]*jacaranda_tree/);
assert.match(characters, /loadCharacters\(gunTemplate, names =/);
assert.match(audio, /const AudioContextClass = window\.AudioContext \|\| window\.webkitAudioContext/);
assert.match(main, /addEventListener\('pointerdown', unlockAudio/);
assert.match(main, /buildCityExpansion\(scene, Q\)/);
assert.match(main, /apartmentState = city\.apartment\.update/);
assert.match(cityExpansion, /from '\/mafia-wars\/game\/vendor\/three\/three\.module\.js'/);
assert.match(cityExpansion, /chunkVisible\(chunk\.center, player\.pos, plan\.profile\.activeRadius\)/);
assert.match(apartment, /TAP ENTER/);

const { CITY_BOUNDS, createCityPlan, chunkVisible } = await import(
  new URL('../public/mafia-wars/game/src/city-layout.js', import.meta.url)
);
const desktop = createCityPlan('desktop');
const mobile = createCityPlan('mobile');
assert.deepEqual(desktop.bounds, CITY_BOUNDS);
assert.deepEqual(desktop.roads, mobile.roads);
assert.deepEqual(desktop.districts, mobile.districts);
assert.deepEqual(desktop.apartment, mobile.apartment);
assert.equal(desktop.districts.reduce((total, district) => total + district.buildings.length, 0) + 1, 20);
assert.equal(chunkVisible({ x: 0, z: 100 }, { x: 0, z: 20 }, mobile.profile.activeRadius), true);
assert.equal(chunkVisible({ x: 0, z: -100 }, { x: 0, z: 20 }, mobile.profile.activeRadius), false);

const mobileTransition = [20, 0, -12, -20].map((z) => ({
  z,
  visible: mobile.districts
    .filter((district) => chunkVisible(district.center, { x: 0, z }, mobile.profile.activeRadius))
    .map((district) => district.id),
}));
assert.deepEqual(mobileTransition, [
  { z: 20, visible: ['north'] },
  { z: 0, visible: [] },
  { z: -12, visible: ['south'] },
  { z: -20, visible: ['south'] },
]);
const southNearestBuildingEdge = Math.max(...mobile.districts[1].buildings.map((building) => building.z + building.depth / 2));
assert.ok(-12 - southNearestBuildingEdge > 45, 'south geometry must stream in well before the player can reach it');
assert.match(cityExpansion, /chunk\.group\.visible = visible/);

console.log('Mafia Wars Milestone 4 mobile and city profile verified');
