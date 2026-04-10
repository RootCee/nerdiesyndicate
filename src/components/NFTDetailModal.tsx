import { useState, useEffect } from 'react';
import type { NFTAttribute } from '../hooks/useNFTs';
import type { NFTGameplayProfile } from '../lib/nftGameplayProfile';

interface NFTDetailModalProps {
  tokenId: number;
  image: string;
  name: string;
  description?: string;
  attributes: NFTAttribute[];
  gameplayProfile: NFTGameplayProfile;
  tbaAddress?: string;
  ethBalance?: string;
  nerdieBalance?: string;
  nerdieName?: string;
  nerdieSymbol?: string;
  nerdieLogoUri?: string;
  onClose: () => void;
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

function pickTrait(
  attributes: NFTAttribute[],
  traitName: string
): NFTAttribute | undefined {
  return attributes.find(
    (attribute) => attribute.trait_type.toLowerCase() === traitName.toLowerCase()
  );
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

function formatToolLabel(value: string) {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export default function NFTDetailModal({
  tokenId,
  image,
  name,
  description,
  attributes,
  gameplayProfile,
  tbaAddress,
  ethBalance,
  nerdieBalance,
  nerdieName,
  nerdieSymbol,
  nerdieLogoUri,
  onClose,
}: NFTDetailModalProps) {
  const [imgError, setImgError] = useState(false);
  const rarity = pickTrait(attributes, 'Rarity');
  const faction = pickTrait(attributes, 'Faction');
  const rarityTone = getRarityTone(rarity?.value);
  const slotStatus = gameplayProfile.progression.botSlots;
  const progressionProfile = gameplayProfile.progression.profile;
  const starterTool = gameplayProfile.metadata.starterTool;
  const derivedStats = Object.entries(gameplayProfile.metadata.stats);

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
              {faction && (
                <span className="px-2.5 py-1 bg-red-950/70 text-red-300 text-xs font-bold rounded-full">
                  {String(faction.value)}
                </span>
              )}
            </div>
            {rarity && (
              <div className="absolute bottom-3 left-3">
                <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${rarityTone.badge}`}>
                  {String(rarity.value)}
                </span>
              </div>
            )}
          </div>

          {/* Right: Details */}
          <div className="p-6 flex flex-col">
            {/* Header */}
            <div className="mb-5">
              <h2 className="text-xl font-black text-white mb-1">{name}</h2>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold ${rarityTone.text}`}>
                  {rarity ? String(rarity.value) : 'Nerdie Blaq'}
                </span>
                {faction && (
                  <>
                    <span className="text-neutral-600">|</span>
                    <span className="text-sm text-neutral-400 font-medium">{String(faction.value)}</span>
                  </>
                )}
              </div>
              {description && <p className="text-neutral-400 text-sm mt-3 leading-relaxed">{description}</p>}
            </div>

            {/* Traits */}
            <div className="mb-5">
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Metadata Traits</h3>
              {attributes.length > 0 ? (
                <div className="grid grid-cols-1 gap-2.5">
                  {attributes.map((attribute) => (
                    <div
                      key={`${attribute.trait_type}-${String(attribute.value)}`}
                      className={`flex items-start justify-between gap-4 rounded-xl p-3 ${
                        attribute.trait_type.toLowerCase() === 'rarity'
                          ? rarityTone.badge
                          : 'border border-zinc-800 bg-zinc-800/40'
                      }`}
                    >
                      <span
                        className={`text-xs ${
                          attribute.trait_type.toLowerCase() === 'rarity'
                            ? 'text-current/80'
                            : 'text-neutral-500'
                        }`}
                      >
                        {attribute.trait_type}
                      </span>
                      <span
                        className={`text-sm text-right max-w-[60%] ${
                          attribute.trait_type.toLowerCase() === 'rarity'
                            ? 'text-current font-semibold'
                            : 'text-white'
                        }`}
                      >
                        {String(attribute.value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-600 text-sm">No metadata traits available for this NFT.</p>
              )}
            </div>

            <div className="mb-5">
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Bot Slot Capacity</h3>
              <div className="rounded-xl border border-zinc-800 bg-zinc-800/40 p-3.5">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <span className="block text-[10px] uppercase tracking-[0.18em] text-neutral-500">Unlocked</span>
                    <span className="mt-1 block text-lg font-bold text-white">{slotStatus.unlockedSlots}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-[0.18em] text-neutral-500">Max</span>
                    <span className="mt-1 block text-lg font-bold text-white">{slotStatus.maxSlots}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-[0.18em] text-neutral-500">Level</span>
                    <span className="mt-1 block text-lg font-bold text-white">{slotStatus.currentLevel}</span>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  {Array.from({ length: slotStatus.maxSlots }, (_, index) => (
                    <span
                      key={index}
                      className={`h-2 flex-1 rounded-full ${
                        index < slotStatus.unlockedSlots ? 'bg-red-600' : 'bg-zinc-700'
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-3 text-xs text-neutral-400">
                  {slotStatus.nextUnlockLevel
                    ? `This NFT can unlock another bot slot at level ${slotStatus.nextUnlockLevel}.`
                    : 'This NFT has reached its rarity-based bot slot cap.'}
                </p>
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
                  <div className="flex items-center justify-between">
                    <span
                      className="flex items-center gap-1.5 text-neutral-500 text-xs"
                      title={nerdieName || nerdieSymbol || 'NERDIE'}
                    >
                      {nerdieLogoUri && (
                        <img
                          src={nerdieLogoUri}
                          alt={`${nerdieName || nerdieSymbol || 'NERDIE'} logo`}
                          className="h-4 w-4 rounded-full object-cover"
                        />
                      )}
                      <span>{nerdieName || '$NERDIE Balance'}</span>
                    </span>
                    <span className="text-white text-sm font-mono font-bold">
                      {nerdieBalance ? parseFloat(nerdieBalance).toFixed(2) : '0.00'} {nerdieSymbol || 'NERDIE'}
                    </span>
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

          <div className="border-t border-zinc-800/80 p-6 md:col-span-2">
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Gameplay Profile</h3>
            <div className="rounded-xl border border-zinc-800 bg-zinc-800/40 p-3.5">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <span className="block text-[10px] uppercase tracking-[0.18em] text-neutral-500">Starter Tool</span>
                  <span className="mt-1 block text-sm font-semibold text-white">
                    {formatToolLabel(starterTool.id)}
                  </span>
                  <span className="mt-1 block text-xs text-neutral-400">
                    {starterTool.family} • scales with {starterTool.scalingStats.join(', ')}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-[0.18em] text-neutral-500">Progression</span>
                  <span className="mt-1 block text-sm font-semibold text-white">
                    Level {progressionProfile.level.currentLevel}
                  </span>
                  <span className="mt-1 block text-xs text-neutral-400">
                    XP {progressionProfile.xp.levelXP}
                    {progressionProfile.xp.nextLevelXP > 0
                      ? ` / ${progressionProfile.xp.nextLevelXP} to next level`
                      : ' / max level reached'}
                  </span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
                {derivedStats.map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-zinc-700 bg-zinc-950/60 p-2.5">
                    <span className="block text-[10px] uppercase tracking-[0.08em] text-neutral-500 break-words">
                      {key.replace(/([a-z])([A-Z])/g, '$1 $2')}
                    </span>
                    <span className="mt-1 block text-sm font-semibold text-white">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
