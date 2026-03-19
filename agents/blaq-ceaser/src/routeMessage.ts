import { isExecutionIntent } from './executionIntent.js';

export type ConversationRoute =
  | 'social'
  | 'knowledge'
  | 'live_price'
  | 'live_website'
  | 'live_status'
  | 'execution';

export type RouteResult = {
  route: ConversationRoute;
  providers: string[];
  nonSocial: boolean;
  websiteMode: boolean;
  priceMode: boolean;
  knowledgeMode: boolean;
};

export const WEBSITE_MODE_PATTERN = /\b(site|website|homepage|page|pages|link|links|url)\b/i;
export const PRICE_MODE_PATTERN =
  /\b(price|token|btc|eth|sol|market|pair|chart|signal price|board|asset)\b/i;
export const KNOWLEDGE_MODE_PATTERN =
  /\b(rootcee|root cee|buddie roots|cornelius bowser|cornelius bowser jr|nerdie blaq|nerdie blaq clubhouse|clubhouse|nerdie blaq ops|blaq ceaser|gdex signal bot|ecosystem|mission|who is|what is|what bots|crypto|defi|decentralized finance|dex|amm|liquidity|liquidity pool|staking|yield|yield farming|impermanent loss|slippage|tvl|nft|nfts|mint|floor price|collection)\b/i;
export const STATUS_MODE_PATTERN =
  /\b(bot|signal|status|guardrails|performance|market|bias|review|confirm)\b/i;

export function routeMessage(rawText: string): RouteResult {
  const websiteMode = WEBSITE_MODE_PATTERN.test(rawText);
  const priceMode = PRICE_MODE_PATTERN.test(rawText);
  const knowledgeMode = KNOWLEDGE_MODE_PATTERN.test(rawText);
  const statusMode = STATUS_MODE_PATTERN.test(rawText);

  if (isExecutionIntent(rawText)) {
    return {
      route: 'execution',
      providers: [],
      nonSocial: true,
      websiteMode,
      priceMode,
      knowledgeMode,
    };
  }

  if (websiteMode) {
    return {
      route: 'live_website',
      providers: ['BLAQ_WEBSITE_CONTEXT'],
      nonSocial: true,
      websiteMode: true,
      priceMode,
      knowledgeMode,
    };
  }

  if (priceMode) {
    return {
      route: 'live_price',
      providers: ['BLAQ_PRICE_CONTEXT'],
      nonSocial: true,
      websiteMode,
      priceMode: true,
      knowledgeMode,
    };
  }

  if (statusMode) {
    return {
      route: 'live_status',
      providers: ['BLAQ_STATUS_CONTEXT', 'BLAQ_SIGNAL_CONTEXT', 'BLAQ_GUARDRAILS_CONTEXT'],
      nonSocial: true,
      websiteMode,
      priceMode,
      knowledgeMode,
    };
  }

  if (knowledgeMode) {
    return {
      route: 'knowledge',
      providers: ['BLAQ_KNOWLEDGE_CONTEXT'],
      nonSocial: true,
      websiteMode,
      priceMode,
      knowledgeMode: true,
    };
  }

  return {
    route: 'social',
    providers: [],
    nonSocial: false,
    websiteMode,
    priceMode,
    knowledgeMode,
  };
}

export function buildRouteInstruction(routeResult: RouteResult): string | null {
  if (routeResult.route === 'social') {
    return null;
  }

  const providerList = routeResult.providers.join(',');
  const routeLabel = routeResult.route.toUpperCase();
  const executionRule =
    routeResult.route === 'execution'
      ? [
          'Execution route rule: refuse briefly and route back to Ops.',
          'For execution requests, use <actions>REPLY</actions> only.',
          'Do not emit SUGGEST_OPS_COMMAND or USE_OPS_CHAT in <actions> for this route.',
        ]
      : [];

  return [
    '[ROUTE_INSTRUCTION]',
    `route=${routeLabel}`,
    `providers=${providerList}`,
    'Deterministic routing rule: follow this route before any social fallback.',
    providerList
      ? `Required providers for this message: ${providerList}.`
      : 'Required providers for this message: none.',
    providerList
      ? `Use only these providers in <providers>: ${providerList}. Do not add any other providers for this route.`
      : 'Keep <providers></providers> empty for this route.',
    'Do not substitute prompt memory when a routed provider is required.',
    'Answer from the routed provider facts first, then add a short in-character read.',
    ...executionRule,
    'Do not omit these required providers in <providers>.',
    'Keep the XML response contract unchanged.',
  ].join('\n');
}
