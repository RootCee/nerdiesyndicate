import { useState } from 'react';
import {
  getStatsForToken,
  getClass,
  getRarity,
  getPowerRating,
  STAT_KEYS,
  STAT_LABELS,
  getStatColor,
} from '../lib/nftStats';

interface NFTCardProps {
  tokenId: number;
  image: string;
  name: string;
  tbaAddress?: string;
  ethBalance?: string;
  onClick: () => void;
}

export default function NFTCard({ tokenId, image, name, tbaAddress, ethBalance, onClick }: NFTCardProps) {
  const [imgError, setImgError] = useState(false);
  const stats = getStatsForToken(tokenId);
  const nftClass = getClass(stats);
  const rarity = getRarity(stats);
  const power = getPowerRating(stats);

  return (
    <button
      onClick={onClick}
      className="bg-zinc-900 border border-red-900/15 rounded-2xl overflow-hidden text-left w-full
                 hover:border-red-700/40 hover:shadow-lg hover:shadow-red-950/20
                 transition-all duration-200 group cursor-pointer"
    >
      {/* Image */}
      <div className="aspect-square bg-zinc-800 relative overflow-hidden">
        {image && !imgError ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-600">
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
        )}

        {/* Token ID badge */}
        <span className="absolute top-3 left-3 px-2.5 py-1 bg-zinc-950/80 text-white text-xs font-bold rounded-full">
          #{tokenId}
        </span>

        {/* Power rating badge */}
        <span className="absolute top-3 right-3 px-2 py-1 bg-zinc-950/80 text-xs font-bold rounded-full text-red-400">
          {power} PWR
        </span>

        {/* Class + Rarity banner */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/60 to-transparent pt-8 pb-2 px-3">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${nftClass.color}`}>{nftClass.name}</span>
            <span className={`text-[10px] font-semibold ${rarity.color}`}>{rarity.label}</span>
          </div>
        </div>
      </div>

      {/* Info + Stats */}
      <div className="p-3.5">
        <h3 className="text-white font-bold text-sm mb-2.5 truncate">{name}</h3>

        {/* Compact stat bars */}
        <div className="space-y-1.5 mb-3">
          {STAT_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-neutral-500 text-[10px] font-mono w-7 shrink-0">{STAT_LABELS[key]}</span>
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${getStatColor(stats[key])} transition-all`}
                  style={{ width: `${stats[key]}%` }}
                />
              </div>
              <span className="text-neutral-500 text-[10px] font-mono w-5 text-right">{stats[key]}</span>
            </div>
          ))}
        </div>

        {/* TBA info */}
        {tbaAddress && (
          <div className="pt-2.5 border-t border-zinc-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-neutral-600 text-[10px]">TBA</span>
              <span className="text-neutral-500 text-[10px] font-mono">
                {tbaAddress.slice(0, 6)}...{tbaAddress.slice(-4)}
              </span>
            </div>
            {ethBalance && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-600 text-[10px]">ETH</span>
                <span className="text-neutral-400 text-[10px] font-mono">
                  {parseFloat(ethBalance).toFixed(4)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
