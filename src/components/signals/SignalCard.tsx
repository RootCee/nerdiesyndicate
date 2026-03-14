import type { SignalCardData, SignalStatus } from '../../types/signals';

const STATUS_STYLES: Record<SignalStatus, string> = {
  LONG: 'bg-emerald-950/60 text-emerald-300 border-emerald-700/40',
  SHORT: 'bg-red-950/60 text-red-300 border-red-700/40',
  WATCH: 'bg-amber-950/60 text-amber-300 border-amber-700/40',
  NEUTRAL: 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60',
};

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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

export default function SignalCard({ card }: { card: SignalCardData }) {
  const status = card.latestSignal ?? 'NEUTRAL';

  return (
    <div className="rounded-2xl border border-red-900/20 bg-zinc-900 p-5 shadow-[0_0_0_1px_rgba(127,29,29,0.08)]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-red-500/80">Asset Feed</p>
          <h3 className="mt-1 text-2xl font-black text-white">{card.asset}</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-bold tracking-wider ${STATUS_STYLES[status]}`}>
          {status}
        </span>
      </div>

      <div className="mb-5 rounded-2xl border border-zinc-800 bg-[linear-gradient(135deg,rgba(127,29,29,0.14),rgba(9,9,11,0.92))] p-4">
        <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-500">Price</p>
        <p className="mt-2 text-3xl font-black text-white">{formatPrice(card.price)}</p>
        <p className="mt-2 text-sm text-neutral-400">{card.trend ?? 'Trend unavailable'}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Confidence" value={card.confidence === null ? '--' : `${formatNumber(card.confidence)}%`} />
        <Stat label="RSI" value={formatNumber(card.rsi)} />
        <Stat label="Support" value={formatPrice(card.support)} />
        <Stat label="Resistance" value={formatPrice(card.resistance)} />
      </div>

      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Note</p>
        <p className="mt-2 text-sm leading-relaxed text-neutral-300">{card.note ?? 'No note available yet.'}</p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-neutral-500">
        <span>Updated</span>
        <span className="font-mono text-neutral-400">{formatTime(card.updatedAt)}</span>
      </div>
    </div>
  );
}
