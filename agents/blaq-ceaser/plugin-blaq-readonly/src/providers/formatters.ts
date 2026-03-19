import type {
  AssetPriceSnapshot,
  BotStatus,
  GuardrailState,
  LatestSignalsResult,
  PerformanceSummary,
  PriceBoardResult,
  SignalCardData,
} from '@nerdieblaq/shared-readonly';
import type { WebsiteSnapshot } from './websiteReader';
import { formatFreshness, isStale } from './providerUtils';
import { TARGET_ASSETS, type TargetAsset } from '@nerdieblaq/shared-readonly';

function formatPercent(value: number | null) {
  if (value === null) return 'n/a';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatPrice(value: number | null) {
  if (value === null) return 'n/a';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

function summarizeSignalCard(card: SignalCardData) {
  const parts = [
    `${card.asset}: ${card.latestSignal ?? 'no signal'}`,
    `trend ${card.trend ?? 'unknown'}`,
  ];

  if (card.confidence !== null) parts.push(`confidence ${Math.round(card.confidence)}%`);
  if (card.price !== null) parts.push(`price ${formatPrice(card.price)}`);
  if (card.change24h !== null) parts.push(`24h ${formatPercent(card.change24h)}`);
  if (card.note) parts.push(`note ${card.note}`);

  return parts.join(', ');
}

function extractFocusAsset(userText: string): TargetAsset | null {
  const upper = userText.toUpperCase();
  return TARGET_ASSETS.find((asset) => upper.includes(asset)) ?? null;
}

function buildGroundingHeader(scope: string, userText: string) {
  return [
    `[${scope}]`,
    `User question: ${userText || 'unknown'}`,
    'Instruction: answer this read-only question directly from the live context below.',
    'Do not fall back to the generic Ops handoff unless the user is asking to execute, confirm, reset, override, or force a trade.',
  ].join('\n');
}

export function formatSignalsProviderOutput(result: LatestSignalsResult, userText: string) {
  const focusAsset = extractFocusAsset(userText);
  const activeCards = result.cards.filter((card) => card.latestSignal || card.trend || card.note);
  const focusCard = focusAsset
    ? result.cards.find((card) => card.asset === focusAsset) ?? null
    : null;
  const spotlightCards = activeCards.slice(0, 3);
  const spotlight = spotlightCards.length
    ? spotlightCards.map(summarizeSignalCard).join(' | ')
    : 'No asset-level signal detail is available yet.';

  const lines = [
    buildGroundingHeader('LIVE SIGNAL CONTEXT', userText),
    `Market bias: ${result.summary.marketBias}.`,
    `Strongest asset: ${result.summary.strongestAsset}.`,
    `Weakest asset: ${result.summary.weakestAsset}.`,
    `Active non-neutral signals: ${result.summary.activeSignals}.`,
    `Board freshness: ${formatFreshness(result.summary.lastUpdateTime)}.`,
  ];

  if (focusCard) {
    lines.push(`Focus asset detail: ${summarizeSignalCard(focusCard)}.`);
  }

  lines.push(`Spotlight assets: ${spotlight}`);

  return {
    text: lines.join('\n'),
    values: {
      summary: result.summary,
      focusAsset,
      focusCard,
      spotlight: spotlightCards,
      hasAnyData: result.hasAnyData,
    },
    data: result,
  };
}

export function formatPriceProviderOutput(
  board: PriceBoardResult,
  userText: string,
  focusAssetSnapshot: AssetPriceSnapshot | null
) {
  const focusAsset = extractFocusAsset(userText);
  const focusCard = focusAssetSnapshot;
  const populatedCards = board.assets.filter((card) => card.price !== null || card.updatedAt || card.latestSignal);
  const boardPreview = populatedCards
    .slice(0, 4)
    .map((card) => {
      const parts = [`${card.asset} ${formatPrice(card.price)}`];

      if (card.latestSignal) parts.push(`signal ${card.latestSignal}`);
      if (card.trend) parts.push(`bias ${card.trend}`);
      if (card.confidence !== null) parts.push(`confidence ${Math.round(card.confidence)}%`);

      return parts.join(', ');
    })
    .join(' | ');

  const lines = [
    buildGroundingHeader('LIVE PRICE CONTEXT', userText),
    `Board market bias: ${board.marketBias}.`,
    `Strongest asset: ${board.strongestAsset}.`,
    `Weakest asset: ${board.weakestAsset}.`,
    `Board freshness: ${formatFreshness(board.updatedAt)}${board.stale ? ' and the board looks stale.' : '.'}`,
    `Board price preview: ${boardPreview || 'price preview unavailable'}.`,
  ];

  if (focusAsset && !focusCard) {
    lines.push(`Requested asset: ${focusAsset}.`);
    lines.push('Asset read: no clean asset record was found on the current board.');
  }

  if (focusCard) {
    lines.push(`Focus asset: ${focusCard.asset}.`);
    lines.push(`Price: ${formatPrice(focusCard.price)}.`);
    lines.push(`Bias: ${focusCard.trend ?? 'unknown'}.`);
    lines.push(`Signal: ${focusCard.latestSignal ?? 'unknown'}.`);
    lines.push(`Confidence: ${focusCard.confidence !== null ? `${Math.round(focusCard.confidence)}%` : 'n/a'}.`);
    lines.push(`Support: ${formatPrice(focusCard.support)}.`);
    lines.push(`Resistance: ${formatPrice(focusCard.resistance)}.`);
    lines.push(
      `Freshness: ${formatFreshness(focusCard.updatedAt)}${focusCard.stale ? ' and this asset read looks stale.' : '.'}`
    );
    if (focusCard.note) {
      lines.push(`Setup note: ${focusCard.note}.`);
    }
  }

  return {
    text: lines.join('\n'),
    values: {
      summary: {
        marketBias: board.marketBias,
        strongestAsset: board.strongestAsset,
        weakestAsset: board.weakestAsset,
        lastUpdateTime: board.updatedAt,
      },
      focusAsset,
      focusCard,
      boardFreshness: board.freshness,
      boardStale: board.stale,
      hasAnyData: board.hasAnyData,
    },
    data: {
      board,
      focusAsset,
      focusCard,
    },
  };
}

export function formatStatusProviderOutput(
  status: BotStatus,
  performance: PerformanceSummary,
  guardrails: GuardrailState,
  signals: LatestSignalsResult,
  userText: string
) {
  const statusFreshness = formatFreshness(status.lastHeartbeat ?? status.lastSignalAt);
  const statusIsStale = isStale(status.lastHeartbeat ?? status.lastSignalAt);
  const tradingState =
    guardrails.tradingEnabled === false
      ? 'paused'
      : guardrails.confirmationsRequired
        ? 'review-confirm'
        : 'live';
  const pausedReason = guardrails.tradingEnabled === false
    ? 'trading is explicitly paused by guardrail state'
    : guardrails.confirmationsRequired
      ? 'execution still requires review and confirmation'
      : 'no explicit pause is reported';
  const combinedFreshness = formatFreshness(
    status.lastHeartbeat ?? status.lastSignalAt ?? signals.summary.lastUpdateTime
  );
  const combinedIsStale = isStale(
    status.lastHeartbeat ?? status.lastSignalAt ?? signals.summary.lastUpdateTime
  );

  const text = [
    buildGroundingHeader('LIVE STATUS CONTEXT', userText),
    `Live state first sentence: bot status is ${status.status}, trading state is ${tradingState}, market bias is ${signals.summary.marketBias}, strongest asset is ${signals.summary.strongestAsset}, weakest asset is ${signals.summary.weakestAsset}, and active setup count is ${signals.summary.activeSignals}.`,
    `Bot mode: ${status.mode}.`,
    `Execution authority: ${status.executionAuthority}.`,
    `Freshness: ${combinedFreshness}${combinedIsStale ? ' and the overall picture looks stale.' : '.'}`,
    `Heartbeat freshness detail: ${statusFreshness}${statusIsStale ? ' and heartbeat looks stale.' : '.'}`,
    `Paused reason: ${pausedReason}.`,
    `Pending reviews: ${status.activeReviewCount ?? 'unknown'}.`,
    `Signal board strongest asset: ${signals.summary.strongestAsset}.`,
    `Signal board weakest asset: ${signals.summary.weakestAsset}.`,
    `Signal board active setup count: ${signals.summary.activeSignals}.`,
    `Signal board freshness: ${formatFreshness(signals.summary.lastUpdateTime)}.`,
    `Performance window: ${performance.period}.`,
    `Realized PnL: ${performance.realizedPnl ?? 'n/a'}.`,
    `Unrealized PnL: ${performance.unrealizedPnl ?? 'n/a'}.`,
    `Win rate: ${performance.winRate !== null ? `${performance.winRate}%` : 'n/a'}.`,
    `Trade count: ${performance.tradeCount ?? 'n/a'}.`,
  ].join('\n');

  return {
    text,
    values: {
      status,
      performance,
      signals: signals.summary,
      tradingState,
      pausedReason,
      stale: combinedIsStale,
    },
    data: {
      status,
      performance,
      signals,
      tradingState,
      pausedReason,
      stale: combinedIsStale,
    },
  };
}

export function formatGuardrailsProviderOutput(guardrails: GuardrailState, userText: string) {
  const paused = guardrails.tradingEnabled === false;
  const stale = isStale(guardrails.lastUpdatedAt);
  const pausedReason = paused
    ? 'guardrail state reports trading is paused'
    : guardrails.confirmationsRequired
      ? 'execution is still gated behind review and confirmation'
      : 'no explicit pause reason is reported';
  const text = [
    buildGroundingHeader('LIVE GUARDRAIL CONTEXT', userText),
    `Live guardrail state first sentence: guardrails are ${guardrails.guardrailsHealthy ? 'healthy' : 'degraded'}, trading paused is ${paused ? 'yes' : 'no'}, and confirmations required is ${guardrails.confirmationsRequired ? 'yes' : 'no'}.`,
    `Paused reason: ${pausedReason}.`,
    `Guardrail freshness: ${formatFreshness(guardrails.lastUpdatedAt)}${stale ? ' and the state may be stale.' : '.'}`,
    `Blocked actions: ${guardrails.blockedActions.join(', ')}.`,
    'For normal read-only questions, summarize this guardrail state directly and do not use the generic Ops handoff.',
  ].join('\n');

  return {
    text,
    values: {
      ...guardrails,
      paused,
      pausedReason,
      stale,
    },
    data: {
      ...guardrails,
      paused,
      pausedReason,
      stale,
    },
  };
}

export function formatWebsiteProviderOutput(snapshot: WebsiteSnapshot, userText: string) {
  const linkSummary = snapshot.visibleLinks.length
    ? snapshot.visibleLinks.map((link) => `${link.label} -> ${link.url}`).join(' | ')
    : 'No same-domain page links were extracted.';

  const text = [
    buildGroundingHeader('LIVE WEBSITE CONTEXT', userText),
    `Official site URL: ${snapshot.url}`,
    `Homepage title: ${snapshot.title}.`,
    `Site description: ${snapshot.description ?? 'description unavailable'}.`,
    `Homepage summary: ${snapshot.homepageSummary}.`,
    `Visible same-domain links: ${linkSummary}`,
    'Website questions still must return the same XML response contract.',
    'Answer from this short website context directly and keep the answer read-only.',
  ].join('\n');

  return {
    text,
    values: {
      url: snapshot.url,
      title: snapshot.title,
      description: snapshot.description,
      homepageSummary: snapshot.homepageSummary,
      visibleLinks: snapshot.visibleLinks,
      fetchedAt: snapshot.fetchedAt,
    },
    data: snapshot,
  };
}
