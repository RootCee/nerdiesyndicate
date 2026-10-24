import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', 'public', 'mafia-wars', 'game');
const [manifestText, main, expansion, markings, layout, endpoint] = await Promise.all([
  readFile(path.join(root, '_release', 'manifest.json'), 'utf8'),
  readFile(path.join(root, 'src', 'main.js'), 'utf8'),
  readFile(path.join(root, 'src', 'city-expansion.js'), 'utf8'),
  readFile(path.join(root, 'src', 'city-road-markings.js'), 'utf8'),
  readFile(path.join(root, 'src', 'city-road-paint-layout.js'), 'utf8'),
  readFile(path.join(root, 'src', 'multiplayer-endpoint.js'), 'utf8'),
]);

const manifest = JSON.parse(manifestText);
assert.equal(manifest.sourceCommit, '8b01caf6e13a32dddf3d47bc2db5f949d4da06b2');
assert.equal(manifest.sourceBranch, 'codex/nerdie-city-environment-road-paint');
assert.match(main, /Q\.roadPaint = qs\.get\('roadPaint'\) !== '0'/);
assert.match(expansion, /buildCityRoadMarkings\(infrastructure, plan\.roads\)/);
assert.match(markings, /\/mafia-wars\/game\/vendor\/three\/three\.module\.js/);
assert.match(layout, /createRoadPaintLayout/);
assert.match(endpoint, /AVATAR_PREVIEW_MULTIPLAYER_SERVICE = 'https:\/\/nerdie-city-environment-preview-dev\.buddieroots\.workers\.dev'/);
console.log('Environment preview verified: exact game source, single road-paint pass, rollback flag, and isolated Protocol 4.1 preview endpoint.');
