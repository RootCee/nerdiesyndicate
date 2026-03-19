import { fetchSupabaseRows } from './supabase.js';
import type { PerformanceSummary } from './types.js';

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

export async function getPerformanceSummary(): Promise<PerformanceSummary> {
  const rows = await fetchSupabaseRows<RawRow>('bot_performance', {
    select: '*',
    order: 'created_at.desc',
    limit: 1,
  }).catch(() => []);

  const row = rows[0];

  return {
    period: getString(row, ['period', 'window']) ?? 'latest',
    realizedPnl: getNumber(row, ['realized_pnl', 'realizedPnl', 'pnl_realized']),
    unrealizedPnl: getNumber(row, ['unrealized_pnl', 'unrealizedPnl', 'pnl_unrealized']),
    winRate: getNumber(row, ['win_rate', 'winRate']),
    tradeCount: getNumber(row, ['trade_count', 'tradeCount']),
    lastUpdatedAt: getString(row, ['updated_at', 'created_at', 'timestamp']),
  };
}
