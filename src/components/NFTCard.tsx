import { useState } from 'react';
import type { NFTAttribute } from '../hooks/useNFTs';

interface NFTCardProps {
  tokenId: number;
  image: string;
  name: string;
  attributes: NFTAttribute[];
  tbaAddress?: string;
  ethBalance?: string;
  nerdieBalance?: string;
  nerdieSymbol?: string;
  onClick: () => void;
}

function pickTrait(
  attributes: NFTAttribute[],
  keys: string[]
): NFTAttribute | undefined {
  return attributes.find((attribute) =>
    keys.some((key) => attribute.trait_type.toLowerCase() === key.toLowerCase())
  );
}

function getTraitBadgeClass(traitType: string) {
  switch (traitType.toLowerCase()) {
    case 'rarity':
      return 'bg-red-950/70 text-red-300 border border-red-800/40';
    case 'faction':
      return 'bg-amber-950/60 text-amber-300 border border-amber-800/40';
    case 'role in nerdie city':
      return 'bg-sky-950/60 text-sky-300 border border-sky-800/40';
    default:
      return 'bg-zinc-800 text-neutral-300 border border-zinc-700';
  }
}

function getRarityTone(value: string | number | undefined) {
  const rarity = String(value ?? '').toLowerCase();

  if (rarity.includes('legendary')) {
    return {
      badge: 'bg-yellow-950/75 text-yellow-300 border border-yellow-700/40',
      text: 'text-yellow-300',
    };
  }

  if (rarity.includes('epic')) {
    return {
      badge: 'bg-fuchsia-950/75 text-fuchsia-300 border border-fuchsia-700/40',
      text: 'text-fuchsia-300',
    };
  }

  if (rarity.includes('rare')) {
    return {
      badge: 'bg-sky-950/75 text-sky-300 border border-sky-700/40',
      text: 'text-sky-300',
    };
  }

  if (rarity.includes('uncommon')) {
    return {
      badge: 'bg-emerald-950/75 text-emerald-300 border border-emerald-700/40',
      text: 'text-emerald-300',
    };
  }

  return {
    badge: 'bg-zinc-950/80 text-neutral-200 border border-zinc-700/60',
    text: 'text-neutral-200',
  };
}

function formatCompactBalance(value: string | undefined, digits: number) {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) return value;
  return parsed.toFixed(digits);
}

export default function NFTCard({
  tokenId,
  image,
  name,
  attributes,
  tbaAddress,
  ethBalance,
  nerdieBalance,
  nerdieSymbol,
  onClick,
}: NFTCardProps) {
  const [imgError, setImgError] = useState(false);
  const rarity = pickTrait(attributes, ['Rarity']);
  const faction = pickTrait(attributes, ['Faction']);
  const role = pickTrait(attributes, ['Role in Nerdie City']);
  const location = pickTrait(attributes, ['Location']);
  const previewTraits: NFTAttribute[] = [rarity, faction, role, location].filter(
    (trait): trait is NFTAttribute => Boolean(trait)
  ).slice(0, 3);
  const rarityTone = getRarityTone(rarity?.value);
  const compactEthBalance = formatCompactBalance(ethBalance, 4);
  const compactNerdieBalance = formatCompactBalance(nerdieBalance, 2);

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

        <span
          className={`absolute left-3 top-12 px-2.5 py-1 text-[10px] font-bold rounded-full ${
            tbaAddress
              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40'
              : 'bg-zinc-950/80 text-neutral-400 border border-zinc-700/50'
          }`}
        >
          {tbaAddress ? 'TBA Active' : 'TBA Pending'}
        </span>

        {tbaAddress && (
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
            {compactEthBalance && (
              <span className="px-2.5 py-1 bg-zinc-950/85 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-900/30">
                {compactEthBalance} ETH
              </span>
            )}
            {compactNerdieBalance && compactNerdieBalance !== '0.00' && (
              <span className="px-2.5 py-1 bg-zinc-950/85 text-amber-300 text-[10px] font-bold rounded-full border border-amber-900/30">
                {compactNerdieBalance} {nerdieSymbol || 'NERDIE'}
              </span>
            )}
          </div>
        )}

        {/* Trait banner */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/60 to-transparent pt-8 pb-2 px-3">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${rarityTone.text}`}>
              {rarity ? rarity.value : 'Nerdie Blaq'}
            </span>
            <span className="text-[10px] font-semibold text-neutral-400">
              {faction ? faction.value : 'Metadata NFT'}
            </span>
          </div>
        </div>
      </div>

      {/* Info + Traits */}
      <div className="p-3.5">
        <h3 className="text-white font-bold text-sm mb-2.5 truncate">{name}</h3>

        <div className="flex flex-wrap gap-2 mb-3 min-h-[74px] content-start">
          {previewTraits.length > 0 ? (
            previewTraits.map((trait) => (
              <div
                key={trait.trait_type}
                className={`rounded-full px-2.5 py-1.5 max-w-full ${getTraitBadgeClass(trait.trait_type)}`}
              >
                <span className="block text-[9px] uppercase tracking-[0.18em] opacity-75">
                  {trait.trait_type}
                </span>
                <span className="block text-[11px] font-medium truncate max-w-[140px]">
                  {String(trait.value)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-neutral-500 text-xs">No metadata traits available.</p>
          )}
        </div>

        {/* TBA info */}
        {tbaAddress && (
          <div className="pt-2.5 border-t border-zinc-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-neutral-600 text-[10px]">Token-Bound Account</span>
              <span className="text-neutral-500 text-[10px] font-mono">
                {tbaAddress.slice(0, 6)}...{tbaAddress.slice(-4)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-zinc-950/70 p-2">
                <span className="block text-neutral-600 text-[10px]">ETH</span>
                <span className="block text-neutral-300 text-[11px] font-mono mt-0.5">
                  {compactEthBalance || '0.0000'}
                </span>
              </div>
              <div className="rounded-lg bg-zinc-950/70 p-2">
                <span className="block text-neutral-600 text-[10px]">{nerdieSymbol || 'NERDIE'}</span>
                <span className="block text-neutral-300 text-[11px] font-mono mt-0.5">
                  {compactNerdieBalance || '0.00'}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-neutral-600">
              Open the NFT to copy the full TBA address and view detailed balances.
            </p>
          </div>
        )}
      </div>
    </button>
  );
}
