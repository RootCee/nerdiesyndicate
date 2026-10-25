import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const gameRoot = path.join(projectRoot, 'public', 'mafia-wars', 'game');
const [manifestText, endpoint, protocol, combat, spaces, main] = await Promise.all([
  readFile(path.join(gameRoot, '_release', 'manifest.json'), 'utf8'),
  readFile(path.join(gameRoot, 'src', 'multiplayer-endpoint.js'), 'utf8'),
  readFile(path.join(gameRoot, 'src', 'multiplayer-protocol.js'), 'utf8'),
  readFile(path.join(gameRoot, 'src', 'multiplayer-combat.js'), 'utf8'),
  readFile(path.join(gameRoot, 'src', 'multiplayer-spaces.js'), 'utf8'),
  readFile(path.join(gameRoot, 'src', 'main.js'), 'utf8'),
]);
const manifest = JSON.parse(manifestText);

const syncScript = await readFile(path.join(import.meta.dirname, 'sync-mafia-wars-preview.mjs'), 'utf8');
const expectedCommit = syncScript.match(/const expectedCommit = '([0-9a-f]{40})'/)?.[1];
assert.ok(expectedCommit, 'sync script pins a source commit');
assert.equal(manifest.sourceCommit, expectedCommit, 'release manifest matches the synced source commit');
assert.match(manifest.sourceBranch, /^codex\//);
assert.match(endpoint, /PRODUCTION_MULTIPLAYER_SERVICE = 'https:\/\/nerdie-city-multiplayer-v4\.buddieroots\.workers\.dev'/);
assert.match(endpoint, /AVATAR_PREVIEW_MULTIPLAYER_SERVICE = 'https:\/\/nerdie-city-m6-3-preview\.buddieroots\.workers\.dev'/);
assert.match(protocol, /^export const PROTOCOL_VERSION = 4;$/m);
assert.match(protocol, /^export const PUBLIC_CITY_MAX_PLAYERS = 20;$/m);
assert.match(protocol, /^export const UNDERGROUND_TEAM_SIZE = 6;$/m);
assert.match(combat, /resolveAuthoritativeShot/);
assert.match(combat, /publicCityShotOccluded/);
assert.match(combat, /spawnProtectionMs: 3000/);
assert.match(spaces, /MULTIPLAYER_SAFE_ZONES/);
assert.match(spaces, /north-court/);
assert.match(spaces, /east-73/);
assert.match(spaces, /hood-cross-west/);
assert.match(spaces, /hood-duplicate-west-5/);
assert.match(main, /multiplayer\?\.updateSpace\('underground', 'enter'\)/);
assert.match(main, /multiplayer\?\.updateSpace\('underground', 'exit'\)/);
assert.match(main, /if \(qs\.get\('devLoadTest'\) === '1' && isPrivateLanIPv4\) \{\s*import\('\.\.\/qa\/dev-multiplayer-load-test\.js'\)/);
assert.doesNotMatch(main, /DEV_LOAD_TEST_TOKEN/);
await assert.rejects(access(path.join(gameRoot, 'qa')));

console.log('M6.3 website release verified: 20-player Protocol 4 client, public-city PvP, residential safe zones, Underground support, and production/dev endpoint separation present.');
