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
const syncScript = await readFile(path.join(import.meta.dirname, 'sync-mafia-wars-preview.mjs'), 'utf8');
const expectedCommit = syncScript.match(/const expectedCommit = '([0-9a-f]{40})'/)?.[1];
assert.ok(expectedCommit, 'sync script pins a source commit');
assert.equal(manifest.sourceCommit, expectedCommit, 'release manifest matches the synced source commit');
assert.match(manifest.sourceBranch, /^codex\//);
assert.match(endpoint, /PREVIEW_MULTIPLAYER_SERVICES = Object\.freeze/);
assert.match(endpoint, /This preview build has no isolated multiplayer Worker configured/);
assert.match(audio, /reloadWeaponAt\(weaponId, pos\)/);
assert.match(audio, /weaponShotAt\(weaponId, pos\)/);
assert.match(main, /message\.type === 'reload'/);
assert.match(main, /networkAudioEvents\.accept\('shot', message\)/);
assert.match(workerAudio, /rpg: Object\.freeze\([^\n]*rocket: true/);
console.log('Protocol 4.1 audio verified: pinned source, protected preview endpoint mapping, local/nearby weapon audio, and event deduplication present.');
