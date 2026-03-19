import { fetchSupabaseRows } from './supabase';
import type { BotStatus } from './types';

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

function getLatestTimestamp(...values: Array<string | null>): string | null {
  const timestamps = values
    .filter((value): value is string => Boolean(value))
    .map((value) => ({ value, time: Date.parse(value) }))
    .filter((entry) => !Number.isNaN(entry.time))
    .sort((a, b) => b.time - a.time);

  return timestamps[0]?.value ?? null;
}

function normalizeStatus(value: string | null): BotStatus['status'] {
  if (!value) return 'unknown';

  const lower = value.toLowerCase();
  if (lower.includes('online') || lower.includes('active') || lower.includes('healthy')) return 'online';
  if (lower.includes('degraded') || lower.includes('warning')) return 'degraded';
  if (lower.includes('offline') || lower.includes('down')) return 'offline';
  return 'unknown';
}

export async function getBotStatus(): Promise<BotStatus> {
  const [statusRows, signalRows] = await Promise.all([
    fetchSupabaseRows<RawRow>('bot_status', {
      select: '*',
      order: 'created_at.desc',
      limit: 1,
    }).catch(() => []),
    fetchSupabaseRows<RawRow>('bot_signals', {
      select: '*',
      order: 'created_at.desc',
      limit: 1,
    }).catch(() => []),
  ]);

  const statusRow = statusRows[0];
  const signalRow = signalRows[0];

  return {
    botName: getString(statusRow, ['bot_name', 'name']) ?? 'Ops Bot',
    mode: getString(statusRow, ['mode', 'run_mode', 'status_mode']) ?? 'review-confirm',
    executionAuthority: 'ops-bot',
    status: normalizeStatus(getString(statusRow, ['status', 'health', 'state'])),
    lastHeartbeat: getString(statusRow, ['last_heartbeat', 'heartbeat_at', 'updated_at', 'created_at']),
    lastSignalAt: getString(signalRow, ['updated_at', 'created_at', 'timestamp']),
    lastExecutionAt: getString(statusRow, ['last_execution_at', 'last_trade_at']),
    activeReviewCount: getNumber(statusRow, ['active_review_count', 'pending_reviews', 'review_queue_size']),
    notes: [
      'Execution remains owned by Ops bot.',
      'Blaq Ceaser is read-only and suggestion-only.',
      `Latest known activity: ${getLatestTimestamp(
        getString(statusRow, ['updated_at', 'created_at']),
        getString(signalRow, ['updated_at', 'created_at', 'timestamp'])
      ) ?? 'unknown'}.`,
    ],
  };
}
