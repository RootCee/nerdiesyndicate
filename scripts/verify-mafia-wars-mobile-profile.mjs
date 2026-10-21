import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', 'public', 'mafia-wars', 'game', 'src');
const [main, assets, audio, world, characters, cityExpansion, apartment, combatVenue, player, collision, weaponCycle] = await Promise.all(
  ['main.js', 'assets.js', 'audio.js', 'world.js', 'characters.js', 'city-expansion.js', 'apartment-system.js', 'combat-venue.js', 'player.js', 'collision-math.js', 'weapon-cycle.js'].map((file) => readFile(path.join(root, file), 'utf8')),
);

assert.match(main, /Q\.lowMemory = Q\.mobile && qs\.get\('full'\) !== '1'/);
assert.match(main, /renderer\.shadowMap\.enabled = !Q\.lowMemory/);
assert.match(main, /if \(composer\) composer\.render\(\); else renderer\.render\(scene, camera\)/);
assert.match(main, /if \(Q\.lowMemory\) await Promise\.all\(\[weapon\.load\(\), guns\.mac10\.load\(\)\]\)/);
assert.match(weaponCycle, /MOBILE_WEAPON_ORDER = Object\.freeze\(\['ak', 'mac10'\]\)/);
assert.doesNotMatch(weaponCycle, /MOBILE_WEAPON_ORDER[^\n]*mp5|MOBILE_WEAPON_ORDER[^\n]*m700/);
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
assert.match(cityExpansion, /chunkVisible\(chunk\.center, player\.pos, plan\.profile\.activeRadius \+ chunk\.radius \* 0\.35\)/);
assert.match(apartment, /TAP ENTER/);
assert.match(apartment, /north-court-exterior-door/);
assert.match(apartment, /north-court-interior-exit-door/);
assert.match(combatVenue, /TAP ENTER COMBAT/);
assert.match(combatVenue, /underground-closed-door/);
assert.match(world, /'hood-duplicate-covered-car'/);
assert.match(world, /'covered-car'/);
assert.match(player, /moveAndSlide\(this\.pos, moveX, moveZ/);
assert.match(collision, /PLAYER_COLLISION_RADIUS = 0\.62/);
assert.match(collision, /resolveCircleAabbs/);

const { CITY_BOUNDS, createCityPlan, chunkVisible } = await import(
  new URL('../public/mafia-wars/game/src/city-layout.js', import.meta.url)
);
const desktop = createCityPlan('desktop');
const mobile = createCityPlan('mobile');
assert.deepEqual(desktop.bounds, CITY_BOUNDS);
assert.deepEqual(desktop.roads, mobile.roads);
assert.deepEqual(desktop.districts, mobile.districts);
assert.deepEqual(desktop.apartment, mobile.apartment);
assert.deepEqual(desktop.combatVenue, mobile.combatVenue);
assert.equal(desktop.districts.length, 7);
assert.equal(desktop.districts.reduce((total, district) => total + district.buildings.length, 0) + 2, 65);
assert.equal(desktop.districts.reduce((total, district) => total + district.vehicles.length, 0), 12);
assert.deepEqual(CITY_BOUNDS, { minX: -140, maxX: 244, minZ: -148, maxZ: 148 });
const mobileChunkRadius = (district) => mobile.profile.activeRadius + district.radius * 0.35;
assert.equal(chunkVisible(mobile.districts[0].center, { x: 0, z: 28 }, mobileChunkRadius(mobile.districts[0])), true);
assert.equal(chunkVisible(mobile.districts[1].center, { x: 0, z: 28 }, mobileChunkRadius(mobile.districts[1])), false);

const mobileTransition = [28, 20, -20, -24].map((z) => ({
  z,
  visible: mobile.districts
    .filter((district) => chunkVisible(district.center, { x: 0, z }, mobileChunkRadius(district)))
    .map((district) => district.id),
}));
assert.deepEqual(mobileTransition, [
  { z: 28, visible: ['north'] },
  { z: 20, visible: [] },
  { z: -20, visible: [] },
  { z: -24, visible: ['south'] },
]);
const southNearestBuildingEdge = Math.max(...mobile.districts[1].buildings.map((building) => building.z + building.depth / 2));
assert.ok(-24 - southNearestBuildingEdge > 40, 'south geometry must stream in well before the player can reach it');
assert.match(cityExpansion, /chunk\.group\.visible = visible/);

console.log('Mafia Wars Milestone 5 mobile and city profile verified');
