import { fetchSupabaseRows } from './supabase';
import type { GuardrailState } from './types';

type RawRow = Record<string, unknown>;

function getString(row: RawRow | undefined, keys: string[]): string | null {
  if (!row) return null;

  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return null;
}

function getBoolean(row: RawRow | undefined, keys: string[]): boolean | null {
  if (!row) return null;

  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
    }
  }

  return null;
}

export async function getGuardrailState(): Promise<GuardrailState> {
  const rows = await fetchSupabaseRows<RawRow>('guardrail_state', {
    select: '*',
    order: 'created_at.desc',
    limit: 1,
  }).catch(() => []);

  const row = rows[0];
  const tradingEnabled = getBoolean(row, ['trading_enabled', 'execution_enabled']);
  const confirmationsRequired = getBoolean(row, ['confirmations_required', 'review_required']) ?? true;
  const guardrailsHealthy = getBoolean(row, ['guardrails_healthy', 'healthy', 'enabled']) ?? true;

  return {
    executionAuthority: 'ops-bot',
    elizaReadOnly: true,
    tradingEnabled,
    confirmationsRequired,
    guardrailsHealthy,
    lastUpdatedAt: getString(row, ['updated_at', 'created_at', 'timestamp']),
    blockedActions: [
      'execute trades',
      'confirm actions',
      'reset stats',
      'override safeguards',
      'bypass review flow',
    ],
    notes: [
      'Execution requests must be routed to Ops.',
      'Guardrails are advisory to Eliza and authoritative in Ops.',
    ],
  };
}
