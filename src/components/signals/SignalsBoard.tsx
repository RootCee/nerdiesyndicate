import { useEffect, useState } from 'react';
import { fetchSignalsBoardData } from '../../lib/signals';
import { isSupabaseConfigured } from '../../lib/supabase';
import type { SignalCardData, SignalStatus, SignalsBoardData } from '../../types/signals';

const STATUS_STYLES: Record<SignalStatus, string> = {
  LONG: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  SHORT: 'border-red-500/40 bg-red-500/10 text-red-300',
  WATCH: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  NEUTRAL: 'border-zinc-500/40 bg-zinc-500/10 text-zinc-300',
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

function formatPercent(value: number | null, digits = 2) {
  if (value === null) return '--';
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatNumber(value, digits)}%`;
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-cyan-500/10 bg-zinc-950/80 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.04)]">
      <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-300/50">{label}</p>
      <p className="mt-1 text-base font-bold text-white">{value}</p>
    </div>
  );
}

function DataPill({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'positive' | 'negative' }) {
  const toneClass =
    tone === 'positive'
      ? 'text-emerald-300 border-emerald-500/20'
      : tone === 'negative'
      ? 'text-red-300 border-red-500/20'
      : 'text-neutral-300 border-zinc-800';

  return (
    <div className={`rounded-lg border bg-zinc-950/75 px-3 py-2 ${toneClass}`}>
      <p className="text-[9px] uppercase tracking-[0.24em] text-neutral-500">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function AssetRow({ card }: { card: SignalCardData }) {
  const status = card.latestSignal ?? 'NEUTRAL';
  const changeTone = card.change24h === null ? 'default' : card.change24h >= 0 ? 'positive' : 'negative';

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[linear-gradient(180deg,rgba(24,24,27,0.92),rgba(9,9,11,0.98))] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-2xl font-black tracking-[0.18em] text-white">{card.asset}</h3>
            <span className={`rounded-full border px-3 py-1 text-[11px] font-bold tracking-[0.24em] ${STATUS_STYLES[status]}`}>
              {status}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-2">
            <p className="text-3xl font-black text-white">{formatPrice(card.price)}</p>
            <p className={`text-sm font-semibold ${changeTone === 'positive' ? 'text-emerald-300' : changeTone === 'negative' ? 'text-red-300' : 'text-neutral-400'}`}>
              {formatPercent(card.change24h)}
            </p>
            <p className="text-sm text-cyan-300/70">{card.trend ?? 'Trend unavailable'}</p>
          </div>
        </div>

        <div className="min-w-[180px] rounded-xl border border-cyan-500/10 bg-zinc-950/90 px-4 py-3 text-left lg:text-right">
          <p className="text-[10px] uppercase tracking-[0.26em] text-cyan-300/50">Live Conditions</p>
          <p className="mt-1 font-mono text-sm text-neutral-200">{formatTime(card.updatedAt)}</p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-neutral-500">System Status</p>
          <p className="mt-1 text-sm font-semibold text-emerald-300">ONLINE</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-6">
        <DataPill label="Signal" value={status} />
        <DataPill label="Confidence" value={card.confidence === null ? '--' : `${formatNumber(card.confidence)}%`} />
        <DataPill label="RSI" value={formatNumber(card.rsi)} />
        <DataPill label="Support" value={formatPrice(card.support)} />
        <DataPill label="Resistance" value={formatPrice(card.resistance)} />
        <DataPill label="Funding" value={card.funding === null ? '--' : formatPercent(card.funding, 4)} />
      </div>

      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
        <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/50">Syndicate Readout</p>
        <p className="mt-2 text-sm leading-relaxed text-neutral-300">{card.note ?? 'No note available yet.'}</p>
      </div>
    </div>
  );
}

function ActivityRow({ card }: { card: SignalCardData }) {
  const status = card.latestSignal ?? 'NEUTRAL';

  return (
    <div className="grid grid-cols-[84px_88px_1fr_120px] gap-3 border-b border-zinc-800/70 py-2 text-xs text-neutral-300 last:border-b-0 max-md:grid-cols-1">
      <span className="font-bold tracking-[0.24em] text-cyan-300">{card.asset}</span>
      <span className={`${status === 'LONG' ? 'text-emerald-300' : status === 'SHORT' ? 'text-red-300' : status === 'WATCH' ? 'text-amber-300' : 'text-zinc-300'} font-semibold`}>
        {status}
      </span>
      <span className="truncate text-neutral-400">{card.note ?? card.trend ?? 'No feed note available.'}</span>
      <span className="font-mono text-neutral-500">{formatTime(card.updatedAt)}</span>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-10 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-neutral-400">
        <span className="text-lg font-bold">NB</span>
      </div>
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-neutral-500">{text}</p>
    </div>
  );
}

export default function SignalsBoard({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<SignalsBoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isSupabaseConfigured()) {
        setData(null);
        setError('Supabase environment variables are not configured.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextData = await fetchSignalsBoardData();
        if (!cancelled) setData(nextData);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load signals board.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-red-800 border-t-transparent animate-spin" />
        <p className="text-neutral-400">Loading live signal data...</p>
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

  return (
    <div className="rounded-[28px] border border-cyan-500/15 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_28%),linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,1))] p-3 shadow-[0_0_40px_rgba(8,145,178,0.08)]">
      <div className="relative overflow-hidden rounded-[22px] border border-zinc-800 bg-zinc-950/90 p-5 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.04)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(34,211,238,0.03),transparent_18%,transparent_82%,rgba(34,211,238,0.02))]" />
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:100%_4px]" />
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-cyan-500/10 pb-4">
          <div className="relative z-10">
            <p className="text-[11px] uppercase tracking-[0.34em] text-cyan-300/55">Market Status</p>
            <h2 className="mt-1 text-2xl font-black tracking-[0.18em] text-white md:text-3xl">SIGNALS CONSOLE</h2>
            <p className="mt-2 text-sm text-neutral-500">Nerdie Syndicate Market Intelligence</p>
          </div>
          <div className="relative z-10 flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold tracking-[0.24em] text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.14)]">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE
            </span>
            <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 font-mono text-xs text-neutral-400">
              SYNC {formatTime(data.summary.lastUpdateTime)}
            </span>
          </div>
        </div>

        <div className="relative z-10 mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryChip label="Market Bias" value={data.summary.marketBias} />
          <SummaryChip label="Strongest Asset" value={data.summary.strongestAsset} />
          <SummaryChip label="Weakest Asset" value={data.summary.weakestAsset} />
          <SummaryChip label="Active Signals" value={String(data.summary.activeSignals)} />
          <SummaryChip label="Last Update" value={formatTime(data.summary.lastUpdateTime)} />
        </div>

        <div className="relative z-10 mt-5 rounded-2xl border border-cyan-500/10 bg-[linear-gradient(180deg,rgba(9,9,11,0.94),rgba(15,23,42,0.4))] p-3 shadow-[0_0_24px_rgba(34,211,238,0.04)]">
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-300/55">Asset Feed</p>
              <p className="mt-1 text-sm text-neutral-500">Unified command view for BTC, ETH, SOL, XRP, and PAXG.</p>
            </div>
            <div className="hidden rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-neutral-500 md:block">
              Scroll Enabled
            </div>
          </div>

          <div className="max-h-[820px] space-y-4 overflow-y-auto pr-1">
            {data.cards.map((card) => (
              <AssetRow key={card.asset} card={card} />
            ))}
          </div>
        </div>

        <div className="relative z-10 mt-5 rounded-2xl border border-zinc-800 bg-zinc-950/85 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-300/55">Signal Intel</p>
              <p className="mt-1 text-sm text-neutral-500">Recent market intelligence entries in descending update order.</p>
            </div>
            <span className="font-mono text-xs text-neutral-500">DESC</span>
          </div>

          <div className="max-h-64 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/70 px-4">
            {[...data.cards]
              .sort((a, b) => {
                const left = a.updatedAt ? Date.parse(a.updatedAt) : 0;
                const right = b.updatedAt ? Date.parse(b.updatedAt) : 0;
                return right - left;
              })
              .map((card) => (
                <ActivityRow key={card.asset} card={card} />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
