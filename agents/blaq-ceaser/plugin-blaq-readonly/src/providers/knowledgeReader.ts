import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

type KnowledgeDoc = {
  slug: string;
  title: string;
  relativePath: string;
  keywords: string[];
};

export type KnowledgeMatch = {
  title: string;
  slug: string;
  body: string;
};

const KNOWLEDGE_DOCS: KnowledgeDoc[] = [
  {
    slug: 'rootcee',
    title: 'RootCee',
    relativePath: '../../../knowledge/people/rootcee.md',
    keywords: ['rootcee', 'root cee'],
  },
  {
    slug: 'buddie-roots',
    title: 'Buddie Roots',
    relativePath: '../../../knowledge/people/buddie-roots.md',
    keywords: ['buddie roots'],
  },
  {
    slug: 'cornelius-bowser-jr',
    title: 'Cornelius Bowser Jr.',
    relativePath: '../../../knowledge/people/cornelius-bowser-jr.md',
    keywords: ['cornelius bowser jr', 'cornelius bowser'],
  },
  {
    slug: 'nerdie-blaq',
    title: 'Nerdie Blaq',
    relativePath: '../../../knowledge/project/nerdie-blaq.md',
    keywords: ['nerdie blaq'],
  },
  {
    slug: 'nerdie-blaq-clubhouse',
    title: 'Nerdie Blaq Clubhouse',
    relativePath: '../../../knowledge/project/nerdie-blaq-clubhouse.md',
    keywords: ['nerdie blaq clubhouse', 'clubhouse'],
  },
  {
    slug: 'nerdie-blaq-ops',
    title: 'Nerdie Blaq Ops',
    relativePath: '../../../knowledge/project/nerdie-blaq-ops.md',
    keywords: ['nerdie blaq ops', 'ops'],
  },
  {
    slug: 'blaq-ceaser',
    title: 'Blaq Ceaser',
    relativePath: '../../../knowledge/project/blaq-ceaser.md',
    keywords: ['blaq ceaser'],
  },
  {
    slug: 'gdex-signal-bot',
    title: 'GDEX Signal Bot',
    relativePath: '../../../knowledge/project/gdex-signal-bot.md',
    keywords: ['gdex signal bot', 'gdex', 'signal bot'],
  },
  {
    slug: 'crypto-basics',
    title: 'Crypto Basics',
    relativePath: '../../../knowledge/topics/crypto-basics.md',
    keywords: ['crypto', 'bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'sol', 'stablecoin'],
  },
  {
    slug: 'defi-basics',
    title: 'DeFi Basics',
    relativePath: '../../../knowledge/topics/defi-basics.md',
    keywords: [
      'defi',
      'dex',
      'amm',
      'liquidity',
      'liquidity pool',
      'lp',
      'staking',
      'yield',
      'yield farming',
      'impermanent loss',
      'slippage',
      'tvl',
    ],
  },
  {
    slug: 'nft-basics',
    title: 'NFT Basics',
    relativePath: '../../../knowledge/topics/nft-basics.md',
    keywords: ['nft', 'nfts', 'mint', 'floor price', 'collection', 'collectible'],
  },
];

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function loadDoc(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8').trim();
}

export function findKnowledgeMatches(userText: string): KnowledgeMatch[] {
  const normalized = normalizeText(userText);

  const matches = KNOWLEDGE_DOCS.filter((doc) =>
    doc.keywords.some((keyword) => normalized.includes(keyword))
  );

  if (matches.length > 0) {
    return matches.slice(0, 3).map((doc) => ({
      title: doc.title,
      slug: doc.slug,
      body: loadDoc(doc.relativePath),
    }));
  }

  if (normalized.includes('what bots') || normalized.includes('ecosystem')) {
    return KNOWLEDGE_DOCS.filter((doc) =>
      ['nerdie-blaq', 'blaq-ceaser', 'gdex-signal-bot', 'nerdie-blaq-ops'].includes(doc.slug)
    ).map((doc) => ({
      title: doc.title,
      slug: doc.slug,
      body: loadDoc(doc.relativePath),
    }));
  }

  if (
    normalized.includes('defi') ||
    normalized.includes('crypto') ||
    normalized.includes('bitcoin') ||
    normalized.includes('ethereum') ||
    normalized.includes('solana') ||
    normalized.includes('nft')
  ) {
    return KNOWLEDGE_DOCS.filter((doc) =>
      ['crypto-basics', 'defi-basics', 'nft-basics'].includes(doc.slug)
    ).map((doc) => ({
      title: doc.title,
      slug: doc.slug,
      body: loadDoc(doc.relativePath),
    }));
  }

  return [];
}
