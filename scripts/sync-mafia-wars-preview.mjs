import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const sourceRoot = process.argv[2] ? path.resolve(process.argv[2]) : null;
const projectRoot = path.resolve(import.meta.dirname, '..');
const outputRoot = path.join(projectRoot, 'public', 'mafia-wars', 'game');
const productionMultiplayerService = 'https://nerdie-city-multiplayer-v4.buddieroots.workers.dev';

if (!sourceRoot) {
  throw new Error('Usage: node scripts/sync-mafia-wars-preview.mjs /absolute/path/to/game/source');
}

const expectedCommit = '38b1475fa8cfc7fdd06b92e738bc854b3f432127';
const previewMultiplayerService = 'https://nerdie-city-m6-3-preview.buddieroots.workers.dev';
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

function rewriteModuleSpecifiers(text) {
  return text
    .replaceAll("'three/addons/", "'/mafia-wars/game/vendor/three/jsm/")
    .replaceAll('"three/addons/', '"/mafia-wars/game/vendor/three/jsm/')
    .replaceAll("'three/webgpu'", "'/mafia-wars/game/vendor/three-avbd/webgpu-shim.js'")
    .replaceAll('"three/webgpu"', '"/mafia-wars/game/vendor/three-avbd/webgpu-shim.js"')
    .replaceAll("'three'", "'/mafia-wars/game/vendor/three/three.module.js'")
    .replaceAll('"three"', '"/mafia-wars/game/vendor/three/three.module.js"');
}

async function rewriteJavaScriptDirectory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await rewriteJavaScriptDirectory(filePath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      const source = await readFile(filePath, 'utf8');
      const rewritten = rewriteModuleSpecifiers(source);
      if (rewritten !== source) await writeFile(filePath, rewritten);
    }
  }
}

async function applyMobileAudioUnlock() {
  const audioPath = path.join(outputRoot, 'src', 'audio.js');
  const audioSource = await readFile(audioPath, 'utf8');
  if (!audioSource.includes('const AudioContextClass = window.AudioContext || window.webkitAudioContext;')) {
    const audioPatched = audioSource.replace(
      /  if \(ctx\) \{ if \(ctx\.state === 'suspended'\) ctx\.resume\(\); return; \}\r?\n  ctx = new \(window\.AudioContext \|\| window\.webkitAudioContext\)\(\);/,
      "  if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return; }\n  const AudioContextClass = window.AudioContext || window.webkitAudioContext;\n  if (!AudioContextClass) return;\n  ctx = new AudioContextClass();\n  if (ctx.state === 'suspended') ctx.resume().catch(() => {});"
    );
    if (audioPatched === audioSource) throw new Error('Expected a supported Mafia Wars audio unlock block');
    await writeFile(audioPath, audioPatched);
  }

  const mainPath = path.join(outputRoot, 'src', 'main.js');
  const mainSource = await readFile(mainPath, 'utf8');
  if (!mainSource.includes("$('go').addEventListener('pointerdown', unlockAudio")) {
    const mainPatched = mainSource.replace(
      "  $('go').addEventListener('click', () => { startGame(selectedMode); });",
      "  // Mobile browsers require audio to be unlocked during the earliest user\n  // gesture; waiting until click can leave Safari's AudioContext suspended.\n  $('go').addEventListener('pointerdown', unlockAudio, { passive: true });\n  $('go').addEventListener('click', () => { startGame(selectedMode); });"
    );
    if (mainPatched === mainSource) throw new Error('Expected the Mafia Wars start button listener');
    await writeFile(mainPath, mainPatched);
  }
}

async function ensureMobileMemoryProfile() {
  const [main, assets, world] = await Promise.all(
    ['main.js', 'assets.js', 'world.js'].map((file) => readFile(path.join(outputRoot, 'src', file), 'utf8')),
  );
  if (main.includes('Q.lowMemory') && assets.includes('setLowMemoryAssets') && world.includes('if (!Q.lowMemory)')) return;
  execFileSync('git', ['apply', '--ignore-whitespace', '--whitespace=nowarn', path.join(projectRoot, 'scripts', 'mafia-wars-mobile-memory.patch')], {
    cwd: projectRoot,
    stdio: 'pipe',
  });
}

async function applyPreviewMultiplayerEndpoint() {
  const endpointPath = path.join(outputRoot, 'src', 'multiplayer-endpoint.js');
  const endpointSource = await readFile(endpointPath, 'utf8');
  const endpointPatched = endpointSource.replace(
    /export const AVATAR_PREVIEW_MULTIPLAYER_SERVICE = '[^']+';/,
    `export const AVATAR_PREVIEW_MULTIPLAYER_SERVICE = '${previewMultiplayerService}';`,
  );
  if (endpointPatched === endpointSource && !endpointSource.includes(previewMultiplayerService)) {
    throw new Error('Expected the Mafia Wars preview multiplayer endpoint declaration');
  }
  await writeFile(endpointPath, endpointPatched);
}

async function applyProductionMultiplayerEndpoint() {
  const endpointPath = path.join(outputRoot, 'src', 'multiplayer-endpoint.js');
  const endpointSource = await readFile(endpointPath, 'utf8');
  const endpointPatched = endpointSource.replace(
    /export const PRODUCTION_MULTIPLAYER_SERVICE = '[^']+';/,
    `export const PRODUCTION_MULTIPLAYER_SERVICE = '${productionMultiplayerService}';`,
  );
  if (endpointPatched === endpointSource && !endpointSource.includes(productionMultiplayerService)) {
    throw new Error('Expected the Mafia Wars production multiplayer endpoint declaration');
  }
  await writeFile(endpointPath, endpointPatched);
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
const actualCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot, encoding: 'utf8' }).trim();
if (actualCommit !== expectedCommit) {
  throw new Error(`Expected Mafia Wars source ${expectedCommit}, received ${actualCommit}`);
}
await rm(outputRoot, { recursive: true, force: true });

for (const file of runtimeFiles) await copyFile(file);
const gameIndexPath = path.join(outputRoot, 'index.html');
const gameIndex = await readFile(gameIndexPath, 'utf8');
const productionIndex = gameIndex.replace(/<script type="importmap">.*?<\/script>\s*/s, '');
if (productionIndex === gameIndex) {
  throw new Error('Expected the Mafia Wars Three.js import map in index.html');
}
await writeFile(gameIndexPath, productionIndex);
await copyDirectory('src');
await copyDirectory('vendor/three-avbd');
for (const file of ['three.module.js', 'three.core.js', 'LICENSE']) await copyFile(`vendor/three/${file}`);
await copyThreeAddonGraph();
await rewriteJavaScriptDirectory(path.join(outputRoot, 'src'));
await rewriteJavaScriptDirectory(path.join(outputRoot, 'vendor', 'three', 'jsm'));
await applyMobileAudioUnlock();
// Milestone 4 carries the proven iOS safeguards in source. The legacy patch
// remains as a fallback so older approved sources cannot silently lose them.
await ensureMobileMemoryProfile();
await applyPreviewMultiplayerEndpoint();
await applyProductionMultiplayerEndpoint();
const avbdWorldPath = path.join(outputRoot, 'vendor', 'three-avbd', 'lib', 'world.js');
await writeFile(
  avbdWorldPath,
  rewriteModuleSpecifiers(await readFile(avbdWorldPath, 'utf8'))
);

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
