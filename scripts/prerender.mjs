import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const templatePath = path.join(distDir, 'index.html');
const serverEntryPath = path.join(distDir, 'server', 'entry-prerender.mjs');

const publicRoutes = ['/', '/clubhouse', '/ecosystem', '/music', '/merch', '/academy', '/businesses', '/privacy', '/terms', '/disclaimer', '/contact'];

function injectPrerenderedMarkup(template, appHtml, headHtml) {
  return template
    .replace(/<!--app-seo-start-->[\s\S]*?<!--app-seo-end-->/, headHtml)
    .replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
}

async function writeRouteHtml(route, html) {
  const outputPath =
    route === '/' ? path.join(distDir, 'index.html') : path.join(distDir, route.slice(1), 'index.html');

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, 'utf8');
}

async function run() {
  const template = await readFile(templatePath, 'utf8');
  const { render } = await import(pathToFileURL(serverEntryPath).href);
  const originalConsoleError = console.error;

  console.error = (...args) => {
    const [firstArg] = args;
    if (
      typeof firstArg === 'string' &&
      firstArg.includes('useLayoutEffect does nothing on the server')
    ) {
      return;
    }

    originalConsoleError(...args);
  };

  try {
    for (const route of publicRoutes) {
      const { html, head } = render(route);
      const pageHtml = injectPrerenderedMarkup(template, html, head);
      await writeRouteHtml(route, pageHtml);
    }
  } finally {
    console.error = originalConsoleError;
  }
}

await run();
