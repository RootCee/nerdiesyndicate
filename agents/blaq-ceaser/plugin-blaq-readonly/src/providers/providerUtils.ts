import { isReadonlySupabaseConfigured } from '@nerdieblaq/shared-readonly';

const STALE_AFTER_MS = 15 * 60 * 1000;

function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function isStale(value: string | null | undefined, staleAfterMs = STALE_AFTER_MS) {
  const timestamp = parseTimestamp(value);
  if (!timestamp) return true;

  return Date.now() - timestamp > staleAfterMs;
}

export function formatFreshness(value: string | null | undefined) {
  const timestamp = parseTimestamp(value);
  if (!timestamp) return 'timestamp unavailable';

  const diffMs = Math.max(Date.now() - timestamp, 0);
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'updated less than a minute ago';
  if (diffMinutes === 1) return 'updated about 1 minute ago';
  if (diffMinutes < 60) return `updated about ${diffMinutes} minutes ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours === 1) return 'updated about 1 hour ago';
  if (diffHours < 24) return `updated about ${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? 'updated about 1 day ago' : `updated about ${diffDays} days ago`;
}

export function buildUnavailableProviderPayload(scope: string, reason: string) {
  const boundedReason = isReadonlySupabaseConfigured()
    ? `${scope} live data is unavailable right now: ${reason}`
    : `${scope} live data is unavailable because read-only Supabase env is not configured.`;

  return {
    text: boundedReason,
    values: {
      unavailable: true,
      reason: boundedReason,
    },
    data: {
      unavailable: true,
      reason: boundedReason,
    },
  };
}
