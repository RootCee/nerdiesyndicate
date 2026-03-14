import { useEffect, useRef, useState } from 'react';
import { fetchSignalsBoardData } from '../../lib/signals';
import { fetchSupabaseRows, isSupabaseConfigured } from '../../lib/supabase';
import { TARGET_ASSETS, type SignalCardData, type SignalStatus, type SignalsBoardData, type TargetAsset } from '../../types/signals';

type RawRow = Record<string, unknown>;

type SignalLogEntry = {
  id: string;
  asset: TargetAsset;
  status: SignalStatus;
  confidence: number | null;
  timestamp: string | null;
};

const REFRESH_INTERVAL_MS = 5000;
const HIGHLIGHT_DURATION_MS = 2400;
const SIGNAL_LOG_LIMIT = 24;

const STATUS_STYLES: Record<SignalStatus, string> = {
  LONG: 'text-emerald-300',
  SHORT: 'text-rose-300',
  WATCH: 'text-amber-300',
  NEUTRAL: 'text-slate-300',
};

const STATUS_BADGE_STYLES: Record<SignalStatus, string> = {
  LONG: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.2)]',
  SHORT: 'border-rose-500/40 bg-rose-500/10 text-rose-300 shadow-[0_0_16px_rgba(244,63,94,0.18)]',
  WATCH: 'border-amber-500/40 bg-amber-500/10 text-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.16)]',
  NEUTRAL: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
};

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

function normalizeAsset(value: string | null): TargetAsset | null {
  if (!value) return null;

  const upper = value.toUpperCase();
  return TARGET_ASSETS.includes(upper as TargetAsset) ? (upper as TargetAsset) : null;
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

function formatTime(value: string | null) {
  if (!value) return '--';

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return '--';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function formatClockTime(value: string | null) {
  if (!value) return '--:--';

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return '--:--';

  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(timestamp));
}

function formatNumber(value: number | null, digits = 2) {
  if (value === null) return '--';
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: value < 10 ? digits : 0,
  }).format(value);
}

function formatPrice(value: number | null) {
  if (value === null) return '--';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

function formatConfidence(value: number | null) {
  if (value === null) return '--';
  return `${formatNumber(value)}%`;
}

function formatPercent(value: number | null, digits = 2) {
  if (value === null) return '--';
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatNumber(value, digits)}%`;
}

function formatTrend(value: string | null) {
  if (!value) return '--';
  return value;
}

function getSetupStrength(card: SignalCardData) {
  if (card.confidence === null) return 'Pending';
  if (card.confidence >= 80) return 'High';
  if (card.confidence >= 60) return 'Moderate';
  return 'Low';
}

function getBias(card: SignalCardData) {
  if (card.latestSignal === 'LONG') return 'Bullish';
  if (card.latestSignal === 'SHORT') return 'Bearish';
  if (card.latestSignal === 'WATCH') return 'Watch';
  return 'Neutral';
}

function getRiskState(card: SignalCardData) {
  if (card.rsi === null) return 'Normal';
  if (card.rsi >= 70) return 'Overbought';
  if (card.rsi <= 30) return 'Oversold';
  return 'Balanced';
}

function buildSignalLogEntry(row: RawRow, index: number): SignalLogEntry | null {
  const asset = normalizeAsset(getString(row, ['asset', 'symbol', 'ticker', 'coin', 'base_asset']));
  const status = normalizeSignalStatus(getString(row, ['signal', 'latest_signal', 'direction', 'status', 'signal_type']));

  if (!asset || !status) return null;

  const timestamp = getString(row, ['updated_at', 'created_at', 'timestamp']);
  const id =
    getString(row, ['id']) ??
    `${asset}-${status}-${timestamp ?? 'unknown'}-${index}`;

  return {
    id,
    asset,
    status,
    confidence: getNumber(row, ['confidence', 'confidence_score', 'score', 'probability']),
    timestamp,
  };
}

function StatusChip({ label, value, online = false }: { label: string; value: string; online?: boolean }) {
  return (
    <div className="flex min-w-[150px] items-center gap-3 border-r border-cyan-400/10 px-4 py-3 last:border-r-0 max-lg:border-r-0 max-lg:border-b max-lg:border-cyan-400/10">
      <div
        className={`h-2.5 w-2.5 rounded-full ${
          online ? 'bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.9)]' : 'bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.8)]'
        }`}
      />
      <div>
        <p className="text-[10px] uppercase tracking-[0.32em] text-cyan-200/45">{label}</p>
        <p className={`mt-1 text-sm font-semibold ${online ? 'text-emerald-300' : 'text-slate-100'}`}>{value}</p>
      </div>
    </div>
  );
}

function SignalFeedRow({ entry }: { entry: SignalLogEntry }) {
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 border-b border-cyan-400/10 px-4 py-3 font-mono text-sm last:border-b-0 md:grid-cols-[72px_74px_96px_minmax(0,1fr)] md:items-center">
      <span className="text-cyan-200/70">[{formatClockTime(entry.timestamp)}]</span>
      <span className="font-['Orbitron'] text-base tracking-[0.18em] text-cyan-300">{entry.asset}</span>
      <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.24em] ${STATUS_BADGE_STYLES[entry.status]}`}>
        {entry.status}
      </span>
      <div className="flex items-center justify-between gap-3 text-slate-300">
        <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Confidence</span>
        <span className="text-sm font-semibold text-slate-100">{formatConfidence(entry.confidence)}</span>
      </div>
    </div>
  );
}

function FocusStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-cyan-400/10 bg-slate-950/75 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.03)]">
      <p className="text-[10px] uppercase tracking-[0.26em] text-cyan-200/45">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function FocusFeedRow({ entry }: { entry: SignalLogEntry }) {
  return (
    <div className="grid grid-cols-[72px_92px_minmax(0,1fr)] items-center gap-3 border-b border-cyan-400/10 px-4 py-3 font-mono text-sm last:border-b-0">
      <span className="text-cyan-200/70">[{formatClockTime(entry.timestamp)}]</span>
      <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.24em] ${STATUS_BADGE_STYLES[entry.status]}`}>
        {entry.status}
      </span>
      <div className="flex items-center justify-between gap-4">
        <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Confidence</span>
        <span className="text-sm font-semibold text-slate-100">{formatConfidence(entry.confidence)}</span>
      </div>
    </div>
  );
}

function AssetFocusPanel({ card, entries }: { card: SignalCardData; entries: SignalLogEntry[] }) {
  const status = card.latestSignal ?? 'NEUTRAL';

  return (
    <div className="border-t border-cyan-400/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.9),rgba(2,6,23,0.98))] px-5 py-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-200/55">Asset Focus Mode</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h3 className="font-['Orbitron'] text-2xl font-black tracking-[0.22em] text-white">{card.asset}</h3>
            <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.28em] ${STATUS_BADGE_STYLES[status]}`}>
              {status}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">Deeper intelligence readout for the selected asset, kept live inside the console.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-400">
          <span className="rounded-full border border-cyan-400/10 bg-cyan-400/5 px-3 py-1">Setup Strength {getSetupStrength(card)}</span>
          <span className="rounded-full border border-cyan-400/10 bg-cyan-400/5 px-3 py-1">Bias {getBias(card)}</span>
          <span className="rounded-full border border-cyan-400/10 bg-cyan-400/5 px-3 py-1">Risk State {getRiskState(card)}</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-5">
        <FocusStat label="Trend" value={formatTrend(card.trend)} />
        <FocusStat label="Price" value={formatPrice(card.price)} />
        <FocusStat label="24H Change" value={formatPercent(card.change24h)} />
        <FocusStat label="Confidence" value={formatConfidence(card.confidence)} />
        <FocusStat label="RSI" value={formatNumber(card.rsi)} />
        <FocusStat label="Support" value={formatPrice(card.support)} />
        <FocusStat label="Resistance" value={formatPrice(card.resistance)} />
        <FocusStat label="Funding" value={card.funding === null ? '--' : formatPercent(card.funding, 4)} />
        <FocusStat label="Updated" value={formatTime(card.updatedAt)} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="rounded-2xl border border-cyan-400/10 bg-slate-950/70 p-4">
          <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-200/55">Operator Note</p>
          <p className="mt-3 text-sm leading-6 text-slate-300">{card.note ?? 'No note available for this asset yet.'}</p>
        </div>

        <div className="rounded-2xl border border-cyan-400/10 bg-slate-950/70">
          <div className="border-b border-cyan-400/10 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-200/55">Filtered Signal Log</p>
            <p className="mt-1 text-sm text-slate-400">Recent entries for {card.asset} only.</p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {entries.length > 0 ? (
              entries.map((entry) => <FocusFeedRow key={entry.id} entry={entry} />)
            ) : (
              <div className="px-4 py-6 text-sm text-slate-500">No recent signal feed entries for {card.asset}.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MarketRow({
  card,
  highlighted,
  selected,
  onSelect,
}: {
  card: SignalCardData;
  highlighted: boolean;
  selected: boolean;
  onSelect: (asset: TargetAsset) => void;
}) {
  const status = card.latestSignal ?? 'NEUTRAL';
  const trendText = formatTrend(card.trend);

  return (
    <button
      type="button"
      onClick={() => onSelect(card.asset)}
      className="block w-full text-left"
      aria-pressed={selected}
    >
    <div
      className={[
        'grid min-h-[96px] grid-cols-2 gap-x-4 gap-y-4 border-b border-cyan-400/10 px-4 py-4 transition duration-300 md:grid-cols-[88px_132px_minmax(140px,1fr)_120px_88px_120px_120px_108px]',
        highlighted
          ? 'border-cyan-300/40 bg-cyan-400/10 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.28),0_0_24px_rgba(34,211,238,0.14)] animate-pulse'
          : selected
          ? 'bg-cyan-400/8 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.2),0_0_18px_rgba(34,211,238,0.08)]'
          : 'bg-transparent hover:bg-cyan-400/5',
      ].join(' ')}
    >
      <div className="flex items-center">
        <span className="font-['Orbitron'] text-lg font-bold tracking-[0.22em] text-slate-50">{card.asset}</span>
      </div>
      <div className="flex items-center">
        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.28em] ${STATUS_BADGE_STYLES[status]}`}>
          {status}
        </span>
      </div>
      <div className="min-w-0 pr-3">
        <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-200/45">Trend</p>
        <p className="pt-1 text-sm leading-5 text-slate-200 break-words">{trendText}</p>
      </div>
      <div className="md:pl-1">
        <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-200/45">Price</p>
        <p className="pt-1 text-sm font-semibold text-slate-100">{formatPrice(card.price)}</p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-200/45">RSI</p>
        <p className="pt-1 text-sm text-slate-200">{formatNumber(card.rsi)}</p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-200/45">Support</p>
        <p className="pt-1 text-sm text-slate-200">{formatPrice(card.support)}</p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-200/45">Resistance</p>
        <p className="pt-1 text-sm text-slate-200">{formatPrice(card.resistance)}</p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-200/45">Updated</p>
        <p className="pt-1 text-sm font-mono text-slate-300">{formatClockTime(card.updatedAt)}</p>
      </div>
    </div>
    </button>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[28px] border border-cyan-400/15 bg-[linear-gradient(180deg,rgba(2,6,23,0.96),rgba(3,7,18,0.98))] p-8 shadow-[0_0_36px_rgba(34,211,238,0.08)]">
      <div className="rounded-[22px] border border-cyan-400/10 bg-slate-950/90 p-10 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/5 text-cyan-300">
          <span className="font-['Orbitron'] text-lg font-bold">NB</span>
        </div>
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">{text}</p>
      </div>
    </div>
  );
}

export default function SignalsBoard({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<SignalsBoardData | null>(null);
  const [signalLog, setSignalLog] = useState<SignalLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const [highlightedAssets, setHighlightedAssets] = useState<Record<string, boolean>>({});
  const [selectedAsset, setSelectedAsset] = useState<TargetAsset | null>(null);
  const seenSignalTimestampsRef = useRef<Partial<Record<TargetAsset, string>>>({});
  const highlightTimeoutsRef = useRef<Partial<Record<TargetAsset, number>>>({});

  useEffect(() => {
    return () => {
      Object.values(highlightTimeoutsRef.current).forEach((timeoutId) => {
        if (timeoutId) window.clearTimeout(timeoutId);
      });
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load(showSpinner: boolean) {
      if (!isSupabaseConfigured()) {
        setData(null);
        setSignalLog([]);
        setError('Supabase environment variables are not configured.');
        setLoading(false);
        return;
      }

      if (showSpinner) setLoading(true);
      setError(null);

      try {
        const [nextData, signalRows] = await Promise.all([
          fetchSignalsBoardData(),
          fetchSupabaseRows<RawRow>('bot_signals', {
            select: '*',
            order: 'created_at.desc',
            limit: String(SIGNAL_LOG_LIMIT),
          }),
        ]);

        if (cancelled) return;

        const nextLog = signalRows
          .map((row, index) => buildSignalLogEntry(row, index))
          .filter((entry): entry is SignalLogEntry => Boolean(entry));

        const nextHighlights: TargetAsset[] = [];
        for (const card of nextData.cards) {
          if (!card.signalUpdatedAt) continue;

          const previousTimestamp = seenSignalTimestampsRef.current[card.asset];
          if (previousTimestamp && previousTimestamp !== card.signalUpdatedAt) {
            nextHighlights.push(card.asset);
          }

          seenSignalTimestampsRef.current[card.asset] = card.signalUpdatedAt;
        }

        setData(nextData);
        setSignalLog(nextLog);
        setLastRefreshAt(new Date().toISOString());

        if (nextHighlights.length > 0) {
          setHighlightedAssets((current) => {
            const updated = { ...current };
            nextHighlights.forEach((asset) => {
              updated[asset] = true;

              const existingTimeout = highlightTimeoutsRef.current[asset];
              if (existingTimeout) window.clearTimeout(existingTimeout);

              highlightTimeoutsRef.current[asset] = window.setTimeout(() => {
                setHighlightedAssets((active) => {
                  const next = { ...active };
                  delete next[asset];
                  return next;
                });
              }, HIGHLIGHT_DURATION_MS);
            });
            return updated;
          });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load signals board.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load(true);
    const intervalId = window.setInterval(() => {
      void load(false);
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-cyan-500/40 border-t-transparent" />
        <p className="text-slate-400">Booting live trading console...</p>
      </div>
    );
  }

  if (error) {
    return <EmptyState title="Signals feed offline" text={error} />;
  }

  if (!data || !data.hasAnyData) {
    return (
      <EmptyState
        title="No live signals yet"
        text="Market updates and bot signals will appear here as soon as Supabase has data for the tracked assets."
      />
    );
  }

  const displayRefreshTime = lastRefreshAt ?? data.summary.lastUpdateTime;
  const signalCount = signalLog.length;
  const defaultAsset =
    data.cards.find((card) => card.asset === data.summary.strongestAsset)?.asset ??
    data.cards[0]?.asset ??
    null;
  const activeAsset = selectedAsset ?? defaultAsset;
  const focusedCard = data.cards.find((card) => card.asset === activeAsset) ?? data.cards[0];
  const focusedEntries = signalLog.filter((entry) => entry.asset === focusedCard.asset);

  return (
    <div className="rounded-[30px] border border-cyan-400/15 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_24%),linear-gradient(180deg,rgba(3,7,18,0.98),rgba(2,6,23,1))] p-3 shadow-[0_0_48px_rgba(34,211,238,0.08)]">
      <div className="relative overflow-hidden rounded-[24px] border border-cyan-400/10 bg-slate-950/95 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.05)]">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(34,211,238,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(to_bottom,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:100%_4px]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.08),transparent_22%)]" />

        <div className="relative border-b border-cyan-400/10 px-5 py-5 md:px-7">
          <p className="text-[11px] uppercase tracking-[0.36em] text-cyan-200/55">Signals Console</p>
          <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-['Orbitron'] text-3xl font-black tracking-[0.22em] text-white md:text-4xl">SIGNALS CONSOLE</h2>
              <p className="mt-2 text-sm text-slate-400">Nerdie Syndicate Market Intelligence</p>
            </div>
            <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300 shadow-[0_0_18px_rgba(74,222,128,0.18)]">
              Live Polling / 5s
            </div>
          </div>
        </div>

        <div className="relative border-b border-cyan-400/10 lg:flex lg:flex-wrap">
          <StatusChip label="System" value="ONLINE" online />
          <StatusChip label="Supabase" value="CONNECTED" online />
          <StatusChip label="Last Update" value={formatTime(displayRefreshTime)} />
          <StatusChip label="Signals" value={String(signalCount)} />
        </div>

        <div className="relative grid min-h-[780px] grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)]">
          <div className="border-b border-cyan-400/10 lg:border-b-0 lg:border-r">
            <div className="border-b border-cyan-400/10 px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-200/55">Signal Feed Log</p>
              <p className="mt-2 text-sm text-slate-400">Latest syndicate calls, refreshed in place as new setups arrive.</p>
            </div>
            <div className="border-b border-cyan-400/10 px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-cyan-200/45">
              <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 md:grid-cols-[72px_74px_96px_minmax(0,1fr)]">
                <span>Time</span>
                <span>Asset</span>
                <span className="hidden md:block">Signal</span>
                <span>Confidence</span>
              </div>
            </div>
            <div className="max-h-[680px] overflow-y-auto">
              {signalLog.length > 0 ? (
                signalLog.map((entry) => <SignalFeedRow key={entry.id} entry={entry} />)
              ) : (
                <div className="px-5 py-8 text-sm text-slate-500">No recent signal entries available.</div>
              )}
            </div>
          </div>

          <div>
            <div className="border-b border-cyan-400/10 px-5 py-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-200/55">Market Status Panel</p>
                  <p className="mt-2 text-sm text-slate-400">Live market levels for the core watchlist, paired with the latest signal state.</p>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  <span className="rounded-full border border-cyan-400/10 px-3 py-1">Market Bias {data.summary.marketBias}</span>
                  <span className="rounded-full border border-cyan-400/10 px-3 py-1">Strongest {data.summary.strongestAsset}</span>
                  <span className="rounded-full border border-cyan-400/10 px-3 py-1">Weakest {data.summary.weakestAsset}</span>
                  <span className="rounded-full border border-cyan-400/10 px-3 py-1">Active {data.summary.activeSignals}</span>
                </div>
              </div>
            </div>

            <div className="border-b border-cyan-400/10 bg-cyan-400/5 px-5 py-3">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-400">
                <span><span className="text-slate-100">LONG / SHORT / NEUTRAL:</span> Directional stance</span>
                <span><span className="text-slate-100">Confidence:</span> Setup strength from the latest signal</span>
                <span><span className="text-slate-100">RSI:</span> Relative Strength Index</span>
                <span><span className="text-slate-100">Support / Resistance:</span> Key reaction levels</span>
              </div>
            </div>

            <div className="hidden border-b border-cyan-400/10 px-4 py-3 text-[10px] uppercase tracking-[0.28em] text-cyan-200/45 md:grid md:grid-cols-[88px_132px_minmax(140px,1fr)_120px_88px_120px_120px_108px]">
              <span>Asset</span>
              <span>Signal</span>
              <span>Trend</span>
              <span>Price</span>
              <span>RSI</span>
              <span>Support</span>
              <span>Resistance</span>
              <span>Updated</span>
            </div>

            <div className="max-h-[680px] overflow-y-auto">
              {data.cards.map((card) => (
                <MarketRow
                  key={card.asset}
                  card={card}
                  highlighted={Boolean(highlightedAssets[card.asset])}
                  selected={card.asset === focusedCard.asset}
                  onSelect={setSelectedAsset}
                />
              ))}
            </div>

            <AssetFocusPanel card={focusedCard} entries={focusedEntries} />
          </div>
        </div>
      </div>
    </div>
  );
}
