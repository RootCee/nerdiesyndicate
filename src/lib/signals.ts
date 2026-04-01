import { fetchSupabaseRows } from './supabase';
import {
  TARGET_ASSETS,
  type SignalCardData,
  type SignalDirection,
  type SignalOutcomeStatus,
  type SignalRecord,
  type SignalStatus,
  type SignalsActivityData,
  type SignalsBoardData,
  type SignalsSummary,
  type TargetAsset,
} from '../types/signals';

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

function normalizeOutcomeStatus(value: string | null): SignalOutcomeStatus | null {
  if (!value) return null;

  const upper = value.trim().toUpperCase();
  if (upper.includes('WIN') || upper.includes('TP') || upper.includes('TAKE_PROFIT')) return 'WIN';
  if (upper.includes('LOSS') || upper.includes('LOSE') || upper.includes('SL') || upper.includes('STOP')) return 'LOSS';
  if (upper.includes('EXPIRED') || upper.includes('CANCEL') || upper.includes('TIMEOUT')) return 'EXPIRED';
  if (upper.includes('OPEN') || upper.includes('ACTIVE') || upper.includes('PENDING')) return 'OPEN';

  return null;
}

function normalizeDirection(value: string | null): SignalDirection {
  const normalized = normalizeSignalStatus(value);
  if (normalized === 'LONG' || normalized === 'SHORT') return normalized;
  return 'UNKNOWN';
}

function formatPair(row: RawRow | undefined): string | null {
  const directPair = getString(row, ['pair', 'symbol', 'ticker', 'market', 'instrument']);
  if (directPair) return directPair.toUpperCase();

  const base = getString(row, ['asset', 'base_asset', 'coin']);
  const quote = getString(row, ['quote_asset', 'quote']);
  if (base && quote) return `${base.toUpperCase()}/${quote.toUpperCase()}`;
  if (base) return `${base.toUpperCase()}/USD`;

  return null;
}

function getTimestamp(row: RawRow | undefined): string | null {
  return getDateString(row, ['created_at', 'timestamp', 'updated_at']);
}

function getClosedTimestamp(row: RawRow | undefined): string | null {
  return getDateString(row, ['closed_at', 'resolved_at', 'updated_at']);
}

function buildSignalRecord(row: RawRow, index: number, source: SignalRecord['source']): SignalRecord {
  const pair = formatPair(row) ?? `SIGNAL-${index + 1}`;
  const createdAt = getTimestamp(row);
  const rawStatus = getString(row, ['status', 'outcome', 'result']);
  const rawSide = getString(row, ['side', 'signal', 'direction', 'latest_signal', 'signal_type']);
  const closedAt = getClosedTimestamp(row);

  return {
    id:
      getString(row, ['id', 'signal_id', 'uuid']) ??
      `${source}-${pair}-${createdAt ?? 'unknown'}-${index}`,
    pair,
    asset: getString(row, ['asset', 'base_asset', 'coin', 'symbol'])?.toUpperCase() ?? null,
    side: normalizeDirection(rawSide),
    status: normalizeOutcomeStatus(rawStatus) ?? (source === 'bot_signals' ? 'OPEN' : 'EXPIRED'),
    entryPrice: getNumber(row, ['entry_price', 'entry', 'price', 'entryPrice']),
    stopLoss: getNumber(row, ['stop_loss', 'stop', 'sl', 'stopLoss']),
    takeProfit: getNumber(row, ['take_profit', 'tp', 'target', 'takeProfit']),
    confidence: getNumber(row, ['confidence', 'confidence_score', 'score', 'probability']),
    timeframe: getString(row, ['timeframe', 'interval', 'tf']),
    createdAt,
    closedAt: normalizeOutcomeStatus(rawStatus) === 'OPEN' ? null : closedAt,
    strategy: getString(row, ['strategy', 'setup', 'model', 'playbook']),
    reason: getString(row, ['reason', 'note', 'message', 'summary']),
    pnl: getNumber(row, ['pnl', 'realized_pnl', 'return_pct', 'roi']),
    source,
  };
}

function mergeSignalRecords(outcomeRows: RawRow[], botSignalRows: RawRow[]) {
  const merged = new Map<string, SignalRecord>();

  outcomeRows.forEach((row, index) => {
    const record = buildSignalRecord(row, index, 'signal_outcomes');
    const key = record.id !== `signal_outcomes-${record.pair}-${record.createdAt ?? 'unknown'}-${index}`
      ? record.id
      : `${record.pair}-${record.createdAt ?? 'unknown'}-${record.side}`;
    merged.set(key, record);
  });

  botSignalRows.forEach((row, index) => {
    const record = buildSignalRecord(row, index, 'bot_signals');
    const fallbackKey = `${record.pair}-${record.createdAt ?? 'unknown'}-${record.side}`;
    const key = merged.has(record.id) ? record.id : fallbackKey;

    if (merged.has(key)) {
      const existing = merged.get(key)!;
      if (existing.status === 'OPEN') {
        merged.set(key, {
          ...existing,
          ...record,
          status: existing.status,
          closedAt: existing.closedAt,
          source: existing.source,
        });
      }
      return;
    }

    merged.set(key, record);
  });

  return [...merged.values()].sort((a, b) => {
    const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
    return bTime - aTime;
  });
}

function buildActivitySummary(signals: SignalRecord[]) {
  const wins = signals.filter((signal) => signal.status === 'WIN').length;
  const losses = signals.filter((signal) => signal.status === 'LOSS').length;
  const decided = wins + losses;
  const pnlValues = signals.map((signal) => signal.pnl).filter((value): value is number => value !== null);

  return {
    totalSignals: signals.length,
    openSignals: signals.filter((signal) => signal.status === 'OPEN').length,
    winRate: decided > 0 ? (wins / decided) * 100 : null,
    totalPnl: pnlValues.length > 0 ? pnlValues.reduce((sum, value) => sum + value, 0) : null,
  };
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

export async function fetchSignalsActivityData(): Promise<SignalsActivityData> {
  const [outcomeRows, botSignalRows] = await Promise.all([
    fetchSupabaseRows<RawRow>('signal_outcomes', {
      select: '*',
      order: 'created_at.desc',
      limit: '250',
    }),
    fetchSupabaseRows<RawRow>('bot_signals', {
      select: '*',
      order: 'created_at.desc',
      limit: '250',
    }),
  ]);

  const signals = mergeSignalRecords(outcomeRows, botSignalRows);
  const pairs = [...new Set(signals.map((signal) => signal.pair).filter(Boolean))].sort();
  const timeframes = [...new Set(signals.map((signal) => signal.timeframe).filter((value): value is string => Boolean(value)))].sort();

  return {
    signals,
    summary: buildActivitySummary(signals),
    pairs,
    timeframes,
  };
}
