import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const gameRoot = path.join(projectRoot, 'public', 'mafia-wars', 'game');
const [manifestText, endpoint, protocol, combat, main] = await Promise.all([
  readFile(path.join(gameRoot, '_release', 'manifest.json'), 'utf8'),
  readFile(path.join(gameRoot, 'src', 'multiplayer-endpoint.js'), 'utf8'),
  readFile(path.join(gameRoot, 'src', 'multiplayer-protocol.js'), 'utf8'),
  readFile(path.join(gameRoot, 'src', 'multiplayer-combat.js'), 'utf8'),
  readFile(path.join(gameRoot, 'src', 'main.js'), 'utf8'),
]);
const manifest = JSON.parse(manifestText);

assert.equal(manifest.sourceCommit, 'fdb480604355f28f5c4124186ed984d5d88c4c33');
assert.equal(manifest.sourceBranch, 'codex/mafia-wars-protocol-4-underground-combat');
assert.match(endpoint, /PRODUCTION_MULTIPLAYER_SERVICE = 'https:\/\/nerdie-city-multiplayer-v4\.buddieroots\.workers\.dev'/);
assert.match(endpoint, /AVATAR_PREVIEW_MULTIPLAYER_SERVICE = 'https:\/\/nerdie-city-p4-underground-dev\.buddieroots\.workers\.dev'/);
assert.match(protocol, /^export const PROTOCOL_VERSION = 4;$/m);
assert.match(combat, /resolveAuthoritativeShot/);
assert.match(combat, /undergroundShotOccluded/);
assert.match(combat, /spawnProtectionMs: 3000/);
assert.match(main, /multiplayer\?\.updateSpace\('underground', 'enter'\)/);
assert.match(main, /multiplayer\?\.updateSpace\('underground', 'exit'\)/);

console.log('Protocol 4 website release verified: accepted game manifest, production/preview endpoint separation, protocol 4 combat and Underground transitions present.');
