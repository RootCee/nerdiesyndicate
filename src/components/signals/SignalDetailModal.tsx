import type { SignalRecord } from '../../types/signals';

const STATUS_BADGE_STYLES = {
  OPEN: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200',
  WIN: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  LOSS: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
  EXPIRED: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
} as const;

const SIDE_BADGE_STYLES = {
  LONG: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200',
  SHORT: 'border-rose-500/35 bg-rose-500/10 text-rose-200',
  UNKNOWN: 'border-zinc-700 bg-zinc-800/80 text-zinc-300',
} as const;

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

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
      <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white break-words">{value}</p>
    </div>
  );
}

export default function SignalDetailModal({
  signal,
  onClose,
}: {
  signal: SignalRecord | null;
  onClose: () => void;
}) {
  if (!signal) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-red-900/20 bg-zinc-900 shadow-[0_0_50px_rgba(127,29,29,0.18)]">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-5 md:px-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-red-400/70">Signal Detail</p>
            <h3 className="mt-2 text-2xl font-bold text-white">{signal.pair}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${SIDE_BADGE_STYLES[signal.side]}`}>
                {signal.side}
              </span>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_BADGE_STYLES[signal.status]}`}>
                {signal.status}
              </span>
              <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-[11px] font-semibold text-neutral-300">
                {signal.timeframe ?? 'Timeframe unavailable'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-700 bg-zinc-950 p-2 text-neutral-400 transition hover:text-white"
            aria-label="Close signal detail"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 px-5 py-5 md:px-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <DetailStat label="Entry Price" value={formatPrice(signal.entryPrice)} />
            <DetailStat label="Stop Loss" value={formatPrice(signal.stopLoss)} />
            <DetailStat label="Take Profit" value={formatPrice(signal.takeProfit)} />
            <DetailStat label="Confidence" value={signal.confidence === null ? '--' : `${formatNumber(signal.confidence)}%`} />
            <DetailStat label="Created" value={formatTime(signal.createdAt)} />
            <DetailStat label="Closed" value={formatTime(signal.closedAt)} />
            <DetailStat label="P&L" value={formatPercent(signal.pnl)} />
            <DetailStat label="Source" value={signal.source} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
              <p className="text-[10px] uppercase tracking-[0.24em] text-neutral-500">Strategy</p>
              <p className="mt-3 text-sm leading-relaxed text-neutral-300">
                {signal.strategy || 'No strategy field was returned for this signal.'}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
              <p className="text-[10px] uppercase tracking-[0.24em] text-neutral-500">Reason</p>
              <p className="mt-3 text-sm leading-relaxed text-neutral-300">
                {signal.reason || 'No reason or note was returned for this signal.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
