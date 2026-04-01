import { useEffect, useMemo, useState } from 'react';
import { fetchSignalsActivityData } from '../../lib/signals';
import { isSupabaseConfigured } from '../../lib/supabase';
import type { SignalDirection, SignalOutcomeStatus, SignalRecord, SignalsActivityData } from '../../types/signals';
import SignalDetailModal from './SignalDetailModal';

const REFRESH_INTERVAL_MS = 10000;

const STATUS_BADGE_STYLES: Record<SignalOutcomeStatus, string> = {
  OPEN: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200',
  WIN: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  LOSS: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
  EXPIRED: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
};

const SIDE_BADGE_STYLES: Record<SignalDirection, string> = {
  LONG: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200',
  SHORT: 'border-rose-500/35 bg-rose-500/10 text-rose-200',
  UNKNOWN: 'border-zinc-700 bg-zinc-800/80 text-zinc-300',
};

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

function formatPercent(value: number | null) {
  if (value === null) return '--';
  const sign = value > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[28px] border border-red-900/20 bg-zinc-900/90 p-8 shadow-[0_0_36px_rgba(127,29,29,0.12)]">
      <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/90 p-10 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-red-900/30 bg-red-950/30 text-red-300">
          <span className="font-brand text-lg">NB</span>
        </div>
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-neutral-400">{text}</p>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-red-900/20 bg-zinc-900/90 p-4 shadow-[0_0_0_1px_rgba(127,29,29,0.08)]">
      <p className="text-[10px] uppercase tracking-[0.26em] text-neutral-500">{label}</p>
      <p className="mt-3 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{sub}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] uppercase tracking-[0.24em] text-neutral-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-red-800"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function SignalRow({ signal, onOpen }: { signal: SignalRecord; onOpen: (signal: SignalRecord) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(signal)}
      className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 text-left transition hover:border-red-900/40 hover:bg-zinc-900"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-white">{signal.pair}</h3>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${SIDE_BADGE_STYLES[signal.side]}`}>
              {signal.side}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_BADGE_STYLES[signal.status]}`}>
              {signal.status}
            </span>
          </div>
          <p className="mt-2 text-sm text-neutral-400">
            {signal.reason || signal.strategy || 'No strategy note available.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm lg:min-w-[360px] lg:grid-cols-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Entry</p>
            <p className="mt-1 text-white">{formatPrice(signal.entryPrice)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">TP / SL</p>
            <p className="mt-1 text-white">
              {formatPrice(signal.takeProfit)} / {formatPrice(signal.stopLoss)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Confidence</p>
            <p className="mt-1 text-white">{signal.confidence === null ? '--' : `${formatNumber(signal.confidence)}%`}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Created</p>
            <p className="mt-1 text-white">{formatTime(signal.createdAt)}</p>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function SignalsBoard({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<SignalsActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<SignalRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [pairFilter, setPairFilter] = useState('All Pairs');
  const [sideFilter, setSideFilter] = useState('All Sides');
  const [timeframeFilter, setTimeframeFilter] = useState('All Timeframes');

  useEffect(() => {
    let cancelled = false;

    async function load(showSpinner: boolean) {
      if (!isSupabaseConfigured()) {
        setData(null);
        setError('Supabase environment variables are not configured.');
        setLoading(false);
        return;
      }

      if (showSpinner) setLoading(true);
      setError(null);

      try {
        const nextData = await fetchSignalsActivityData();
        if (cancelled) return;
        setData(nextData);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load signals.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load(true);
    const intervalId = window.setInterval(() => {
      void load(false);
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [refreshKey]);

  const filteredSignals = useMemo(() => {
    if (!data) return [];

    return data.signals.filter((signal) => {
      if (statusFilter !== 'All Statuses' && signal.status !== statusFilter) return false;
      if (pairFilter !== 'All Pairs' && signal.pair !== pairFilter) return false;
      if (sideFilter !== 'All Sides' && signal.side !== sideFilter) return false;
      if (timeframeFilter !== 'All Timeframes' && (signal.timeframe ?? '--') !== timeframeFilter) return false;
      return true;
    });
  }, [data, pairFilter, sideFilter, statusFilter, timeframeFilter]);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-red-800/60 border-t-transparent" />
        <p className="text-neutral-400">Loading signal activity...</p>
      </div>
    );
  }

  if (error) {
    return <EmptyState title="Signals feed offline" text={error} />;
  }

  if (!data || data.signals.length === 0) {
    return (
      <EmptyState
        title="No signal activity yet"
        text="Signals will appear here once bot_signals or signal_outcomes has recent rows to display."
      />
    );
  }

  return (
    <>
      <div className="space-y-6 rounded-[28px] border border-red-900/20 bg-zinc-900/90 p-4 shadow-[0_0_40px_rgba(127,29,29,0.12)] md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.34em] text-red-400/70">Signals Desk</p>
            <h2 className="mt-2 text-3xl font-bold text-white">Signal Activity</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Live and historical signal activity with outcome tracking, filters, and detailed trade context.
            </p>
          </div>
          <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
            Live Refresh / 10s
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <SummaryCard
            label="Total Signals"
            value={String(data.summary.totalSignals)}
            sub="signal_outcomes + bot_signals"
          />
          <SummaryCard
            label="Open Signals"
            value={String(data.summary.openSignals)}
            sub="currently active setups"
          />
          <SummaryCard
            label="Win Rate"
            value={data.summary.winRate === null ? '--' : `${formatNumber(data.summary.winRate, 1)}%`}
            sub="wins / (wins + losses)"
          />
          <SummaryCard
            label="Total PnL"
            value={formatPercent(data.summary.totalPnl)}
            sub="sum of available pnl fields"
          />
        </div>

        <div className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/90 p-4 md:grid-cols-2 xl:grid-cols-4">
          <FilterSelect
            label="Status"
            value={statusFilter}
            options={['All Statuses', 'OPEN', 'WIN', 'LOSS', 'EXPIRED']}
            onChange={setStatusFilter}
          />
          <FilterSelect
            label="Pair"
            value={pairFilter}
            options={['All Pairs', ...data.pairs]}
            onChange={setPairFilter}
          />
          <FilterSelect
            label="Side"
            value={sideFilter}
            options={['All Sides', 'LONG', 'SHORT', 'UNKNOWN']}
            onChange={setSideFilter}
          />
          <FilterSelect
            label="Timeframe"
            value={timeframeFilter}
            options={['All Timeframes', ...data.timeframes.map((value) => value || '--')]}
            onChange={setTimeframeFilter}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>{filteredSignals.length} signals shown</span>
          <span>Tap a row for full trade detail</span>
        </div>

        <div className="space-y-3">
          {filteredSignals.length > 0 ? (
            filteredSignals.map((signal) => (
              <SignalRow key={`${signal.source}-${signal.id}`} signal={signal} onOpen={setSelectedSignal} />
            ))
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4 py-10 text-center text-sm text-neutral-500">
              No signals match the current filter combination.
            </div>
          )}
        </div>
      </div>

      <SignalDetailModal signal={selectedSignal} onClose={() => setSelectedSignal(null)} />
    </>
  );
}
