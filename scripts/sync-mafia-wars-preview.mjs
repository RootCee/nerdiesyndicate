import { cp, mkdir, readFile, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';

const sourceRoot = process.argv[2] ? path.resolve(process.argv[2]) : null;
const projectRoot = path.resolve(import.meta.dirname, '..');
const outputRoot = path.join(projectRoot, 'public', 'mafia-wars', 'game');

if (!sourceRoot) {
  throw new Error('Usage: node scripts/sync-mafia-wars-preview.mjs /absolute/path/to/game/source');
}

const expectedCommit = 'ee131160f2ab21a9409f37fb01ecdbb6339c2d92';
const runtimeFiles = ['index.html', 'version.txt'];
const characterFiles = ['blue_zip.glb', 'navy.glb', 'red_hoodie.glb', 'red_jersey.glb'];
const fontFiles = ['BarlowCondensed-Medium.ttf', 'BarlowCondensed-SemiBold.ttf', 'PermanentMarker-Regular.ttf'];
const soundNames = [
  'shot', 'shot_far', 'reload', 'impact', 'bodyhit', 'hitmarker', 'kill', 'step', 'hurt', 'death',
  'explode', 'ability', 'snitch', 'homies', 'victory', 'defeat', 'ambience', 'rocket', 'rocket_reload', 'rubble',
];
const effectFiles = ['explosion_3x3.webp', 'flash_4x2.webp', 'puff_4x2.webp', 'smoke_4x2.webp'];
const textureNames = [
  'asphalt_02', 'concrete_pavement', 'corrugated_iron', 'dirt', 'distressed_painted_planks',
  'grass_ground', 'grey_roof_tiles', 'red_brick', 'sparse_grass', 'weathered_plank_siding',
  'white_planks_clean', 'worn_asphalt',
];
const textureFiles = ['Diffuse.jpg', 'nor_gl.jpg', 'arm.jpg'];
const skyFiles = ['rooftop_night_2k.hdr', 'the_sky_is_on_fire_2k.hdr'];

async function copyFile(relativePath) {
  const source = path.join(sourceRoot, relativePath);
  const destination = path.join(outputRoot, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, { preserveTimestamps: true });
}

async function copyDirectory(relativePath) {
  const source = path.join(sourceRoot, relativePath);
  const destination = path.join(outputRoot, relativePath);
  await mkdir(destination, { recursive: true });
  await cp(source, destination, {
    recursive: true,
    preserveTimestamps: true,
    filter: (entry) => !path.basename(entry).startsWith('._') && path.basename(entry) !== '.DS_Store',
  });
}

function resolveAddonImport(importer, specifier) {
  if (specifier.startsWith('three/addons/')) return specifier.slice('three/addons/'.length);
  if (!specifier.startsWith('.')) return null;
  return path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
}

async function copyThreeAddonGraph() {
  const sourceTexts = [];
  for (const file of await readdir(path.join(sourceRoot, 'src'))) {
    if (file.endsWith('.js')) sourceTexts.push(await readFile(path.join(sourceRoot, 'src', file), 'utf8'));
  }

  const queue = [...new Set(sourceTexts.flatMap((text) =>
    [...text.matchAll(/three\/addons\/([A-Za-z0-9_./-]+\.js)/g)].map((match) => match[1])
  ))];
  const copied = new Set();

  while (queue.length) {
    const modulePath = queue.pop();
    if (!modulePath || copied.has(modulePath)) continue;
    copied.add(modulePath);

    const sourcePath = path.join(sourceRoot, 'vendor', 'three', 'jsm', modulePath);
    const text = await readFile(sourcePath, 'utf8');
    await copyFile(path.posix.join('vendor/three/jsm', modulePath));

    for (const match of text.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      const dependency = resolveAddonImport(modulePath, match[1]);
      if (dependency && dependency.endsWith('.js') && !copied.has(dependency)) queue.push(dependency);
    }
  }
}

await stat(path.join(sourceRoot, 'index.html'));
await rm(outputRoot, { recursive: true, force: true });

for (const file of runtimeFiles) await copyFile(file);
await copyDirectory('src');
await copyDirectory('vendor/three-avbd');
for (const file of ['three.module.js', 'three.core.js', 'LICENSE']) await copyFile(`vendor/three/${file}`);
await copyThreeAddonGraph();

for (const file of characterFiles) await copyFile(`assets/chars/${file}`);
for (const file of fontFiles) await copyFile(`assets/fonts/${file}`);
for (const name of soundNames) await copyFile(`assets/sfx/${name}.mp3`);
for (const file of effectFiles) await copyFile(`assets/fx/${file}`);
// World props are intentionally data-driven in world.js, including names stored
// in arrays. Copy the model directory as a unit so a valid runtime model cannot
// silently become an HTML SPA fallback at load time.
await copyDirectory('assets/models');
for (const name of textureNames) {
  for (const file of textureFiles) await copyFile(`assets/ph/textures/${name}/${file}`);
}
for (const file of skyFiles) await copyFile(`assets/ph/hdri/${file}`);

await mkdir(path.join(outputRoot, '_release'), { recursive: true });
await cp(
  new URL('./mafia-wars-release.json', import.meta.url),
  path.join(outputRoot, '_release', 'manifest.json')
);

console.log(`Synced Mafia Wars preview ${expectedCommit} to ${outputRoot}`);
