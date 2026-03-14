import { fetchSupabaseRows } from './supabase';
import { TARGET_ASSETS, type SignalCardData, type SignalStatus, type SignalsBoardData, type SignalsSummary, type TargetAsset } from '../types/signals';

type RawRow = Record<string, unknown>;

function getString(row: RawRow | undefined, keys: string[]): string | null {
  if (!row) return null;

  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return null;
}

function getNumber(row: RawRow | undefined, keys: string[]): number | null {
  if (!row) return null;

  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return null;
}

function getDateString(row: RawRow | undefined, keys: string[]): string | null {
  const value = getString(row, keys);
  if (!value) return null;

  const time = Date.parse(value);
  return Number.isNaN(time) ? null : value;
}

function normalizeAsset(value: string | null): TargetAsset | null {
  if (!value) return null;

  const upper = value.toUpperCase();
  return TARGET_ASSETS.includes(upper as TargetAsset) ? (upper as TargetAsset) : null;
}

function extractAsset(row: RawRow): TargetAsset | null {
  return normalizeAsset(getString(row, ['asset', 'symbol', 'ticker', 'coin', 'base_asset']));
}

function normalizeSignalStatus(value: string | null): SignalStatus | null {
  if (!value) return null;

  const upper = value.toUpperCase();
  if (upper.includes('LONG') || upper.includes('BUY')) return 'LONG';
  if (upper.includes('SHORT') || upper.includes('SELL')) return 'SHORT';
  if (upper.includes('WATCH') || upper.includes('WAIT')) return 'WATCH';
  if (upper.includes('NEUTRAL') || upper.includes('HOLD')) return 'NEUTRAL';

  return null;
}

function pickLatestByAsset(rows: RawRow[]): Partial<Record<TargetAsset, RawRow>> {
  const latest: Partial<Record<TargetAsset, RawRow>> = {};

  for (const row of rows) {
    const asset = extractAsset(row);
    if (!asset || latest[asset]) continue;
    latest[asset] = row;
  }

  return latest;
}

function getLatestTimestamp(...values: Array<string | null>): string | null {
  const timestamps = values
    .filter((value): value is string => Boolean(value))
    .map((value) => ({ value, time: Date.parse(value) }))
    .filter((entry) => !Number.isNaN(entry.time))
    .sort((a, b) => b.time - a.time);

  return timestamps[0]?.value ?? null;
}

function deriveBias(cards: SignalCardData[]): string {
  const signalScore = cards.reduce((score, card) => {
    if (card.latestSignal === 'LONG') return score + 1;
    if (card.latestSignal === 'SHORT') return score - 1;
    return score;
  }, 0);

  const trendScore = cards.reduce((score, card) => {
    const trend = card.trend?.toLowerCase() ?? '';
    if (trend.includes('bull')) return score + 1;
    if (trend.includes('bear')) return score - 1;
    return score;
  }, 0);

  const totalScore = signalScore + trendScore;
  if (totalScore > 1) return 'Bullish';
  if (totalScore < -1) return 'Bearish';
  return 'Mixed';
}

function deriveStrength(card: SignalCardData): number {
  let score = 0;

  if (card.latestSignal === 'LONG') score += 3;
  if (card.latestSignal === 'SHORT') score -= 3;
  if (card.latestSignal === 'WATCH') score += 1;

  const trend = card.trend?.toLowerCase() ?? '';
  if (trend.includes('bull')) score += 2;
  if (trend.includes('bear')) score -= 2;

  if (typeof card.confidence === 'number') score += card.confidence / 100;
  if (typeof card.rsi === 'number') score += (card.rsi - 50) / 10;

  return score;
}

function formatAssetFallback(cards: SignalCardData[], mode: 'max' | 'min'): string {
  const populated = cards.filter((card) => card.updatedAt || card.price !== null || card.latestSignal);
  if (populated.length === 0) return '--';

  const ranked = [...populated].sort((a, b) => deriveStrength(a) - deriveStrength(b));
  return mode === 'max' ? ranked[ranked.length - 1].asset : ranked[0].asset;
}

function buildSummary(cards: SignalCardData[]): SignalsSummary {
  const populated = cards.filter((card) => card.updatedAt || card.price !== null || card.latestSignal);

  return {
    marketBias: populated.length ? deriveBias(populated) : '--',
    strongestAsset: formatAssetFallback(cards, 'max'),
    weakestAsset: formatAssetFallback(cards, 'min'),
    activeSignals: cards.filter((card) => card.latestSignal && card.latestSignal !== 'NEUTRAL').length,
    lastUpdateTime: getLatestTimestamp(...cards.map((card) => card.updatedAt)),
  };
}

export async function fetchSignalsBoardData(): Promise<SignalsBoardData> {
  const [marketRows, signalRows] = await Promise.all([
    fetchSupabaseRows<RawRow>('market_updates', {
      select: '*',
      order: 'created_at.desc',
      limit: '200',
    }),
    fetchSupabaseRows<RawRow>('bot_signals', {
      select: '*',
      order: 'created_at.desc',
      limit: '200',
    }),
  ]);

  const latestMarkets = pickLatestByAsset(marketRows);
  const latestSignals = pickLatestByAsset(signalRows);

  const cards = TARGET_ASSETS.map<SignalCardData>((asset) => {
    const marketRow = latestMarkets[asset];
    const signalRow = latestSignals[asset];
    const marketUpdatedAt = getDateString(marketRow, ['updated_at', 'created_at', 'timestamp']);
    const signalUpdatedAt = getDateString(signalRow, ['updated_at', 'created_at', 'timestamp']);

    return {
      asset,
      price: getNumber(marketRow, ['price', 'current_price', 'mark_price']),
      change24h: getNumber(marketRow, ['change_24h', 'price_change_24h', 'change24h']),
      latestSignal: normalizeSignalStatus(getString(signalRow, ['signal', 'latest_signal', 'direction', 'status', 'signal_type'])),
      trend: getString(marketRow, ['trend', 'market_bias', 'bias']),
      confidence: getNumber(signalRow, ['confidence', 'confidence_score', 'score', 'probability']),
      rsi: getNumber(marketRow, ['rsi', 'rsi_14']),
      support: getNumber(marketRow, ['support', 'support_level']),
      resistance: getNumber(marketRow, ['resistance', 'resistance_level']),
      funding: getNumber(signalRow, ['funding', 'funding_rate']) ?? getNumber(marketRow, ['funding', 'funding_rate']),
      note: getString(signalRow, ['note', 'reason', 'message', 'summary']) ?? getString(marketRow, ['note', 'summary', 'message']),
      updatedAt: getLatestTimestamp(signalUpdatedAt, marketUpdatedAt),
      marketUpdatedAt,
      signalUpdatedAt,
    };
  });

  return {
    cards,
    summary: buildSummary(cards),
    hasAnyData: cards.some((card) => card.updatedAt || card.price !== null || card.latestSignal || card.trend),
  };
}
