import { useState, useEffect } from 'react';
import {
  getStatsForToken,
  getClass,
  getRarity,
  getPowerRating,
  STAT_KEYS,
  STAT_LABELS,
  getStatColor,
  type NFTStats,
} from '../lib/nftStats';

interface NFTDetailModalProps {
  tokenId: number;
  image: string;
  name: string;
  tbaAddress?: string;
  ethBalance?: string;
  onClose: () => void;
}

function StatBar({ label, value, maxValue = 99 }: { label: string; value: number; maxValue?: number }) {
  const pct = Math.min((value / maxValue) * 100, 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-neutral-400 text-xs font-mono w-8 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${getStatColor(value)} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-white text-xs font-mono w-6 text-right font-bold">{value}</span>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-neutral-400 hover:text-white
                 text-xs rounded-lg transition flex items-center gap-1.5"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

export default function NFTDetailModal({ tokenId, image, name, tbaAddress, ethBalance, onClose }: NFTDetailModalProps) {
  const [imgError, setImgError] = useState(false);
  const stats = getStatsForToken(tokenId);
  const nftClass = getClass(stats);
  const rarity = getRarity(stats);
  const power = getPowerRating(stats);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const basescanUrl = tbaAddress
    ? `https://basescan.org/address/${tbaAddress}`
    : `https://basescan.org/token/0x4d410D24fAcd00EB9470d4261db855b57c9CDc0e?a=${tokenId}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-red-900/20 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-red-950/30">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center transition"
        >
          <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Left: Image */}
          <div className="relative">
            <div className="aspect-square bg-zinc-800">
              {image && !imgError ? (
                <img
                  src={image}
                  alt={name}
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-600">
                  <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
              )}
            </div>
            {/* Overlay badges */}
            <div className="absolute top-3 left-3 flex gap-2">
              <span className="px-2.5 py-1 bg-zinc-950/80 text-white text-xs font-bold rounded-full">
                #{tokenId}
              </span>
              <span className={`px-2.5 py-1 ${nftClass.bgColor} ${nftClass.color} text-xs font-bold rounded-full`}>
                {nftClass.name}
              </span>
            </div>
            <div className="absolute bottom-3 left-3">
              <span className={`px-2.5 py-1 bg-zinc-950/80 text-xs font-bold rounded-full ${rarity.color}`}>
                {rarity.label}
              </span>
            </div>
          </div>

          {/* Right: Details */}
          <div className="p-6 flex flex-col">
            {/* Header */}
            <div className="mb-5">
              <h2 className="text-xl font-black text-white mb-1">{name}</h2>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold ${nftClass.color}`}>{nftClass.name}</span>
                <span className="text-neutral-600">|</span>
                <span className="text-sm text-red-400 font-bold">{power} PWR</span>
              </div>
            </div>

            {/* Stats */}
            <div className="mb-5">
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Character Stats</h3>
              <div className="space-y-2.5">
                {STAT_KEYS.map((key) => (
                  <StatBar key={key} label={STAT_LABELS[key]} value={stats[key]} />
                ))}
              </div>
            </div>

            {/* TBA Section */}
            <div className="mb-5">
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Token-Bound Account</h3>
              {tbaAddress ? (
                <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400 text-xs font-mono">
                      {tbaAddress.slice(0, 10)}...{tbaAddress.slice(-8)}
                    </span>
                    <CopyButton text={tbaAddress} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500 text-xs">ETH Balance</span>
                    <span className="text-white text-sm font-mono font-bold">
                      {ethBalance ? parseFloat(ethBalance).toFixed(4) : '0.0000'} ETH
                    </span>
                  </div>
                  {/* Placeholder: future token balances */}
                  <div className="flex items-center justify-between opacity-50">
                    <span className="text-neutral-500 text-xs">$NERDIE Balance</span>
                    <span className="text-neutral-500 text-xs font-mono">Coming soon</span>
                  </div>
                </div>
              ) : (
                <p className="text-neutral-600 text-sm">TBA not yet created for this NFT.</p>
              )}
            </div>

            {/* Actions */}
            <div className="mt-auto space-y-2.5">
              <a
                href={basescanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-neutral-300 text-sm font-medium rounded-xl transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                View on BaseScan
              </a>
              {/* Placeholder: Send tokens from TBA */}
              <button
                disabled
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-900/20 border border-red-800/30 text-red-400/50 text-sm font-medium rounded-xl cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
                Send from TBA (Coming Soon)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
