import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', 'public', 'mafia-wars', 'game', 'src');
const [main, assets, audio, world, characters, avatarSchema, cityExpansion, apartment, combatVenue, player, collision, weaponCycle, loadout, resupply, resupplyRules, respawnRules, startupFallback, endpoint, walletBridge, index] = await Promise.all(
  ['main.js', 'assets.js', 'audio.js', 'world.js', 'characters.js', 'avatar-schema.js', 'city-expansion.js', 'apartment-system.js', 'combat-venue.js', 'player.js', 'collision-math.js', 'weapon-cycle.js', 'loadout.js', 'practice-resupply.js', 'resupply-rules.js', 'respawn-rules.js', 'startup-fallback.js', 'multiplayer-endpoint.js', 'wallet-bridge.js'].map((file) => readFile(path.join(root, file), 'utf8')).concat([
    readFile(path.resolve(root, '..', 'index.html'), 'utf8'),
  ]),
);

assert.match(main, /Q\.lowMemory = Q\.mobile && qs\.get\('full'\) !== '1'/);
assert.match(main, /renderer\.shadowMap\.enabled = !Q\.lowMemory/);
assert.match(main, /if \(composer\) composer\.render\(\); else renderer\.render\(scene, camera\)/);
assert.match(main, /if \(Q\.lowMemory\) await Promise\.all\(\[weapon\.load\(\), guns\.mac10\.load\(\)\]\)/);
assert.match(weaponCycle, /DESKTOP_WEAPON_ORDER = Object\.freeze\(\['ak', 'mac10', 'mp5', 'm700', 'rpg'\]\)/);
assert.match(weaponCycle, /MOBILE_WEAPON_ORDER = DESKTOP_WEAPON_ORDER/);
assert.match(main, /LOW-MEMORY ON-DEMAND LOAD/);
assert.match(main, /await asset\.load\(\)/);
assert.match(loadout, /PRACTICE_LOADOUT/);
assert.match(loadout, /restorePracticeLoadout/);
assert.match(resupply, /SOLO_PRACTICE_POLICY/);
assert.match(resupply, /commitResupply/);
assert.match(resupplyRules, /teamUsesPerCycle: 4/);
assert.match(resupplyRules, /cycleSeconds: 60/);
assert.match(resupplyRules, /cycleSeconds: 15/);
assert.match(respawnRules, /enemyDangerRadius: 25/);
assert.match(respawnRules, /spawnProtectionSeconds: 3/);
assert.match(main, /protectedUntil = time \+ RESPAWN_CONFIG\.spawnProtectionSeconds/);
assert.doesNotMatch(main, /player\.respawn[^\n]+restorePracticeLoadout/);
assert.match(main, /loadCharacters\(weapon\.template3p, developerCombat \? undefined : \[localAppearance\.preset\]\)/);
assert.match(characters, /ensureCharacterModel/);
assert.match(characters, /lib\.loading\[name\]/);
assert.match(avatarSchema, /blue_zip/);
assert.match(avatarSchema, /red_jersey/);
assert.match(assets, /normalMap: LOW_MEMORY \? null/);
assert.match(assets, /roughnessMap: LOW_MEMORY \? null/);
assert.match(world, /if \(!Q\.lowMemory\) \{[\s\S]*jacaranda_tree/);
assert.match(characters, /loadCharacters\(gunTemplate, names =/);
assert.match(audio, /const AudioContextClass = window\.AudioContext \|\| window\.webkitAudioContext/);
assert.match(main, /addEventListener\('pointerdown', unlockAudio/);
assert.match(main, /buildCityExpansion\(scene, Q\)/);
assert.match(main, /apartmentState = [^;]*city\.apartment\.update/);
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
assert.match(index, /html\.menu-open, body\.menu-open \{ touch-action: pan-y; \}/);
assert.match(index, /#ov > div \{[^}]*overflow-y: auto;[^}]*touch-action: pan-y;/);
assert.match(index, /id="entryFeedback"[^>]*aria-live="polite"/);
assert.match(index, /src="src\/startup-fallback\.js"/);
assert.match(startupFallback, /window\.addEventListener\('error'/);
assert.match(startupFallback, /window\.addEventListener\('unhandledrejection'/);
assert.match(startupFallback, /Reload and retry/);
assert.match(main, /button\.textContent = 'Retry Public City'/);
assert.match(main, /Could not join the public city:/);
assert.match(main, /window\.__markGameReady\?\.\(\)/);
assert.match(index, /id="mpDiagnosticsToggle"/);
assert.match(index, /id="mpDiagBuild"/);
assert.match(index, /id="mpDiagWorker"/);
assert.match(index, /id="mpDiagProtocol"/);
assert.match(index, /id="mpDiagRoom"/);
assert.match(index, /id="mpDiagPlayers"/);
assert.match(index, /id="mpDiagStatus"/);
assert.match(index, /id="mpDiagMode"/);
assert.match(index, /id="cityBankButton"[^>]*aria-label="Open My Wallet without leaving the game"/);
assert.equal((index.match(/id="tFire"/g) || []).length, 1);
assert.doesNotMatch(index, /tFire2/);
assert.match(index, /@media \(pointer: coarse\) and \(orientation: portrait\)/);
assert.match(index, /id="mpDiagnosticsToggle"[^>]*hidden/);
assert.match(index, /src="src\/main\.js\?build=m7\.0b-dev2"/);
assert.match(main, /multiplayer-endpoint\.js\?build=m6\.3-cross-device-diagnostics-rc1/);
assert.match(main, /wallet-bridge\.js\?build=m7\.0b-dev2/);
assert.match(main, /const GAME_BUILD_ID = 'm7\.0b-dev2'/);
// M6.5 Underground 6v6: results panel and server match state handling.
assert.match(index, /id="ugResults"[^>]*role="dialog"/);
assert.match(index, /id="ugStay"/); assert.match(index, /id="ugLeave"/);
assert.match(main, /message\.type === 'underground-match'/);
assert.match(main, /message\.type === 'bot-states'/);
// M6.5.1 camera choice and crosshair-true multiplayer aim.
assert.match(index, /id="tCam"[^>]*aria-label="Switch first or third person camera"/);
assert.match(main, /multiplayer\.fireWeapon\(weaponId, crosshairAim\(rule\.range\)(?:, multiplayerViewTime\(\))?\)/);
assert.match(main, /nerdie-city-mafia-wars\.camera\.v1/);
// M6.6 city map, waypoints, and bank (client-only).
const [pois, mapView] = await Promise.all(['city-pois.js', 'city-map-view.js'].map((file) => readFile(path.join(root, file), 'utf8')));
assert.match(index, /id="cityMap" role="dialog" aria-modal="true"/);
assert.match(index, /id="tMap"[^>]*aria-label="Open city map"/);
assert.match(index, /id="waypointChip"/);
assert.match(main, /e\.code === 'KeyM' && e\.shiftKey\) \{ setMuted/, 'mute moved to Shift+M');
assert.match(main, /else if \(e\.code === 'KeyM' && !e\.repeat\) setCityMap/, 'M opens the map');
assert.match(mapView, /export const mapDotVisible = \(dot, snitch = false\) => dot\.team !== 'red' \|\| snitch \|\| !!dot\.spotted;/, 'shared minimap visibility rule');
assert.match(pois, /BANK_BUILDING_ID = 'west-mixed-north-1'/);
assert.doesNotMatch(pois.match(/BANK_COPY = Object\.freeze\(\{[\s\S]*?\}\);/)[0], /deposit|withdraw|loan|interest|savings|balance/i, 'bank copy implies no banking services');
// M6.7A city residents: opt-in client, diagnostics row, CC0 library shipped with its manifest.
const [npcClient, npcSchema] = await Promise.all(['multiplayer-client.js', 'npc-schema.js'].map((file) => readFile(path.join(root, file), 'utf8')));
assert.match(npcClient, /\$\{npc \? '&npc=1' : ''\}/, 'clients opt in to NPC traffic');
assert.match(main, /new MultiplayerClient\(\{[^)]*npc: true \}\)/);
assert.match(index, /id="mpDiagNpc"/);
assert.match(npcSchema, /NPC_IDENTITY_KEYS = Object\.freeze\(\['id', 'schemaVersion', 'role', 'label', 'appearance', 'traits', 'routine'\]\)/, 'NPC identities carry no player fields');
for (const file of ['npc_women.glb', 'npc_men.glb', 'npc_clips_women.glb', 'npc_clips_men.glb']) assert.ok((await readFile(path.join(root, '..', 'assets', 'npc', file))).length > 100_000, file);
assert.match(await readFile(path.join(root, '..', 'assets', 'npc', 'LICENSES.md'), 'utf8'), /CC0 1\.0 Universal/);
// M6.7B1 reactions: optional behaviour value, clip mapping, no attacks.
const [npcRenderer, npcBehavior] = await Promise.all(['npc-renderer.js', 'npc-behavior.js'].map((file) => readFile(path.join(root, file), 'utf8')));
assert.match(npcRenderer, /const \[index, x, z, yaw, anim, speed, behavior = NPC_BEHAVIOR\.calm, health = 100\] = raw;/, 'behaviour and health values are optional');
assert.match(npcBehavior, /NPC_BEHAVIOR = Object\.freeze\(\{ calm: 0, alert: 1, startled: 2, flee: 3, greet: 4, wary: 5, fight: 6, strike: 7, hurt: 8, knockdown: 9, defeated: 10, warn: 11 \}\)/, 'M6.7B1 codes unchanged; M6.7B2 codes appended');
assert.doesNotMatch(npcBehavior.replace(/\/\/.*$/gm, ''), /attack|damage/i, 'reactions code contains no attacks or damage');
// M6.7B2 self-defense: client events are feedback only; strikes and damage are server-side.
const npcCombat = await readFile(path.join(root, 'npc-combat.js'), 'utf8');
assert.match(npcCombat, /if \(distance > NPC_COMBAT_RULES\.engageRadius\) return flee;/, 'nobody charges from afar');
assert.match(npcCombat, /case 'peaceful': return flee;/, 'peaceful residents never fight');
assert.match(main, /message\.type === 'npc-hit'\) \{ (?:npcRenderer\.onEvent\(message\); )?if \(message\.shooterId === multiplayer\.credentials\?\.playerId\)/);
assert.doesNotMatch(main, /send\(\{[^}]*type: 'npc-/, 'the client never sends NPC events');
assert.match(main, /function renderMultiplayerDiagnostics\(\)/);
assert.match(walletBridge, /event\.origin !== targetOrigin \|\| event\.source !== windowObject\.parent/);
assert.match(walletBridge, /'connected', 'address', 'chainId', 'nerdieBalance'/);
assert.match(walletBridge, /windowObject\.location\.assign\('\/mafia-wars\/bank'\)/);
const walletPage = await readFile(path.resolve(root, '../../../../src/pages/MafiaWarsBank.tsx'), 'utf8');
assert.match(walletPage, /src=\{GAME_URL\}/);
assert.match(walletPage, /setWalletOpen\(true\)/);
assert.match(walletPage, /formatTokenAmount\(tokenBalance\.data, 18\)/);
assert.match(endpoint, /nerdie-city-multiplayer-v4\.buddieroots\.workers\.dev/);
assert.match(endpoint, /AVATAR_PREVIEW_MULTIPLAYER_SERVICE = 'https:\/\/nerdie-city-(?:m6-(?:3|7|7b|7b2|8a|8b|9)|m7-0a|m7-0b)-preview\.buddieroots\.workers\.dev'/);
assert.match(endpoint, /override && \(isLocal \|\| isPrivateLan\)/);

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

// M6.8A: the structure registry ships (pure, browser-safe) and network tracers stop at the first wall.
const structures = await readFile(path.join(root, 'city-structures.js'), 'utf8');
assert.doesNotMatch(structures, /from ['"](?:three|\/mafia-wars\/game\/vendor)/);
assert.match(structures, /export const CITY_STRUCTURES = buildCityStructures\(\)/);
assert.match(main, /raycastWorld\(origin, networkTracerRay\.copy\(direction\)\.multiplyScalar\(65\), 1, true, networkTracerHit\)/);

// M6.8B: server-decided destruction ships; clients only apply server messages, in lite mode, and keep the Underground arena intact.
const [damageRules, destructionEngine] = await Promise.all(['structure-damage.js', 'destruction.js'].map((file) => readFile(path.join(root, file), 'utf8')));
assert.match(damageRules, /export class StructureDamage/);
assert.match(destructionEngine, /export function openStructureFaces/);
assert.match(destructionEngine, /export function repairStructureFaces/);
assert.match(main, /message\.type === 'structure-damage'\) applyStructureDamage\(message\)/);
assert.match(main, /enabled: qs\.get\('phys'\) !== '0' && !multiplayerDev/);
assert.match(main, /streaming\?\.id !== ORIGINAL_NEIGHBORHOOD_LAYOUT\.id/);
assert.doesNotMatch(main, /type: 'structure-(?:damage|repair)'[^\n]*send/);
// dev2: exact kit-house geometry ships, and networked rockets burst at the server's point.
assert.match(await readFile(path.join(root, 'hood-geometry.js'), 'utf8'), /export const HOOD_GEOMETRY = /);
assert.match(await readFile(path.join(root, 'rocket.js'), 'utf8'), /if \(r\.target && time >= r\.arrive\)/);
assert.match(main, /cosmetic: true, target: impact/);

// M6.9: procedural aiming, per-weapon holds, aim on the wire, muzzle-true tracers, and the latched AIM toggle (no new touch buttons).
const [characterRig, remotePlayer, aimModule, mpClient] = await Promise.all(['characters.js', 'remote-player.js', 'aim.js', 'multiplayer-client.js'].map((file) => readFile(path.join(root, file), 'utf8')));
assert.match(characterRig, /export const WEAPON_HOLD = Object\.freeze\(\{ ak: 'rifle', mp5: 'rifle', m700: 'rifle', mac10: 'compact', rpg: 'launcher' \}\)/);
assert.match(characterRig, /supportHand\(matrixWorld\)/);
// dev2: weapons placed by measured body contacts; palms on weapon surfaces; in-place clips; smooth crossfade.
assert.match(characterRig, /calibrateContacts\(\)/);
assert.match(characterRig, /const WEAPON_HANDS = Object\.freeze/);
assert.match(characterRig, /export const LOCOMOTION_FADE = 0\.25/);
assert.match(characterRig, /hold\.anchor === 'shoulder' && c\.pocket/);
assert.match(remotePlayer, /LOCOMOTION_FADE\)/);
// dev3: shared hit regions ship; the crosshair converges on them; fire carries viewAt; confirmed headshots are gold.
const hitRegions = await readFile(path.join(root, 'hit-regions.js'), 'utf8');
assert.match(hitRegions, /export const HIT_MULTIPLIERS = Object\.freeze\(\{ head: 2\.0, upperTorso: 1\.0, lowerTorso: 0\.9, arms: 0\.75, legs: 0\.7 \}\)/);
assert.match(main, /bodyHit\(camera\.position, aimForward, seen/);
assert.match(main, /multiplayer\.fireWeapon\(weaponId, crosshairAim\(rule\.range\), multiplayerViewTime\(\)\)/);
assert.match(mpClient, /viewAt: Math\.round\(viewAt\)/);
assert.match(index, /#hit\.head svg \{ stroke: #f5c542/);
// dev4: one-shot headshots; the crosshair converges on residents too, with their render delay on fire.
assert.match(hitRegions, /export const HEADSHOT_KILLS = true/);
assert.match(main, /for \(const r of npcRenderer\.aimTargets\(\)\)/);
assert.match(main, /NPC_RENDER_RULES\.interpolationMs/);
// dev5: resident strikes and hits are shown from their events, at the event pose, the moment they arrive.
assert.match(npcRenderer, /onEvent\(message, now = performance\.now\(\)\)/);
assert.match(main, /message\.type === 'npc-strike'\) \{ npcRenderer\.onEvent\(message\)/);
assert.match(remotePlayer, /\(state\.aim \|\| 0\) > 0\.5/);
assert.match(aimModule, /export function aimRaised/);
assert.match(mpClient, /movement\.aim = aim\.raised \? 1 : 0/);
assert.match(main, /shooter\.muzzleWorld\(muzzle\)/);
assert.match(main, /aimButton\?\.classList\.toggle\('on', !!input\.ads\)/);
assert.match(index, /\.tb\.on \{/);
assert.equal((index.match(/class="tb" id="t\w+"/g) || []).length, 8);

console.log('Mafia Wars mobile, city, M6.3 network diagnostics, and M6.4 wallet bridge verified');
