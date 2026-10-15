import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', 'public', 'mafia-wars', 'game', 'src');
const [main, assets, world, characters] = await Promise.all(
  ['main.js', 'assets.js', 'world.js', 'characters.js'].map((file) => readFile(path.join(root, file), 'utf8')),
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

console.log('Mafia Wars mobile memory profile verified');
