import { writeFile } from 'node:fs/promises';

const SQUARE_STORE_URL = 'https://nerdie-blaq-merch.square.site';
const SITEMAP_URL = `${SQUARE_STORE_URL}/sitemap.xml`;
const OUTPUT_FILE = new URL('../src/data/squareMerchProducts.json', import.meta.url);

const fallbackByPath = {
  '/product/discipline-xccuses/NWEFH6HCXL4U5TAZD5INGCA2': {
    title: 'Discipline Xccuses',
    image:
      'https://152590411.cdn6.editmysite.com/uploads/1/5/2/5/152590411/EPM4ZJEQHO2XACCUJ3LU35HG.jpeg?width=2400&optimize=medium',
  },
  '/product/discipline-xccuses-tee/XOU43ZK3ZOYYVAYYWRBF2F2E': {
    title: 'Discipline Xccuses Tee',
    image: '/fit-discipline-excuses.png',
  },
  '/product/nerdie-blaq-classic-hoodie/1': {
    title: 'Nerdie Blaq Classic Hoodie',
    image:
      'https://152590411.cdn6.editmysite.com/uploads/1/5/2/5/152590411/OGYJAHWGSLKMBXUVIF5K2UP3.jpeg?width=2400&optimize=medium',
  },
  '/product/original-nerdie-blaq-tee/3': {
    title: 'Original Nerdie Blaq Tee',
    image:
      'https://152590411.cdn6.editmysite.com/uploads/1/5/2/5/152590411/IIUU6N4N3MMFOMZBN5SA75S3.jpeg?width=2400&optimize=medium',
  },
};

function getMetaContent(html, property) {
  const pattern = new RegExp(`<meta property="${property}" content="([^"]*)"`, 'i');
  return html.match(pattern)?.[1] ?? '';
}

function titleFromUrl(url) {
  const slug = new URL(url).pathname.split('/')[2] ?? 'Square merch';
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

async function fetchText(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function main() {
  const sitemap = await fetchText(SITEMAP_URL);
  const productUrls = [...sitemap.matchAll(/<loc>(https:\/\/nerdie-blaq-merch\.square\.site\/product\/[^<]+)<\/loc>/g)]
    .map((match) => match[1])
    .filter(Boolean);

  const products = await Promise.all(
    productUrls.map(async (href) => {
      const path = new URL(href).pathname;
      const fallback = fallbackByPath[path] ?? {};
      const html = await fetchText(href);
      const ogTitle = getMetaContent(html, 'og:title').replace(/\s*\|\s*Nerdie Blaq\s*$/, '');
      const ogImage = getMetaContent(html, 'og:image');

      return {
        image: ogImage || fallback.image || '/nerdie-token-logo.png',
        title: ogTitle && ogTitle !== 'Nerdie Blaq' ? ogTitle : fallback.title || titleFromUrl(href),
        price: 'Available on Square',
        href,
        badge: 'Square',
      };
    }),
  );

  await writeFile(OUTPUT_FILE, `${JSON.stringify(products, null, 2)}\n`);
  console.log(`Synced ${products.length} Square products to ${OUTPUT_FILE.pathname}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
