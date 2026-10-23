import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', 'public', 'mafia-wars', 'game');
const [manifestText, endpoint, audio, main, workerAudio] = await Promise.all([
  readFile(path.join(root, '_release', 'manifest.json'), 'utf8'),
  readFile(path.join(root, 'src', 'multiplayer-endpoint.js'), 'utf8'),
  readFile(path.join(root, 'src', 'audio.js'), 'utf8'),
  readFile(path.join(root, 'src', 'main.js'), 'utf8'),
  readFile(path.join(root, 'src', 'weapon-audio.js'), 'utf8'),
]);
const manifest = JSON.parse(manifestText);
assert.equal(manifest.sourceCommit, '26773bb21b55b344ea564b850af128b6bde825f0');
assert.equal(manifest.sourceBranch, 'codex/mafia-wars-protocol-4-1-audio');
assert.match(endpoint, /AVATAR_PREVIEW_MULTIPLAYER_SERVICE = 'https:\/\/nerdie-city-p4-1-audio-dev\.buddieroots\.workers\.dev'/);
assert.match(audio, /reloadWeaponAt\(weaponId, pos\)/);
assert.match(audio, /weaponShotAt\(weaponId, pos\)/);
assert.match(main, /message\.type === 'reload'/);
assert.match(main, /networkAudioEvents\.accept\('shot', message\)/);
assert.match(workerAudio, /rpg: Object\.freeze\([^\n]*rocket: true/);
console.log('Protocol 4.1 website preview verified: exact source, isolated Worker endpoint, local/nearby weapon audio, and event deduplication present.');
