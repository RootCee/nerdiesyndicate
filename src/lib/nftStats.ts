/**
 * Deterministic stat generation for Nerdie Syndicate NFTs.
 *
 * Stats are derived from tokenId via a simple hash so they're
 * consistent across sessions without on-chain reads. Later these
 * can be replaced with real on-chain attributes or metadata traits.
 *
 * This module is the single place to extend when attaching
 * abilities / bot loadouts to NFTs based on their stats.
 */

export interface NFTStats {
  signal: number;    // Signal strength (trading accuracy)
  stealth: number;   // Stealth (bot evasion / privacy)
  intel: number;     // Intelligence (market analysis depth)
  speed: number;     // Speed (execution / alert latency)
  luck: number;      // Luck (rare opportunity detection)
}

export interface NFTClass {
  name: string;
  color: string;     // tailwind text color class
  bgColor: string;   // tailwind bg color class
}

// Seeded pseudo-random from tokenId — deterministic, no external deps
function seededRandom(seed: number, offset: number): number {
  const x = Math.sin(seed * 9301 + offset * 49297) * 49297;
  return x - Math.floor(x);
}

function statFromSeed(seed: number, offset: number, min: number, max: number): number {
  return Math.floor(seededRandom(seed, offset) * (max - min + 1)) + min;
}

/** Generate deterministic stats for any tokenId */
export function getStatsForToken(tokenId: number): NFTStats {
  return {
    signal:  statFromSeed(tokenId, 1, 40, 99),
    stealth: statFromSeed(tokenId, 2, 30, 95),
    intel:   statFromSeed(tokenId, 3, 35, 99),
    speed:   statFromSeed(tokenId, 4, 25, 99),
    luck:    statFromSeed(tokenId, 5, 10, 99),
  };
}

/** Total power rating (sum of all stats) */
export function getPowerRating(stats: NFTStats): number {
  return stats.signal + stats.stealth + stats.intel + stats.speed + stats.luck;
}

/** Classify the NFT based on its dominant stat */
export function getClass(stats: NFTStats): NFTClass {
  const entries: [string, number][] = [
    ['signal', stats.signal],
    ['stealth', stats.stealth],
    ['intel', stats.intel],
    ['speed', stats.speed],
    ['luck', stats.luck],
  ];
  const [dominant] = entries.sort((a, b) => b[1] - a[1])[0];

  const classes: Record<string, NFTClass> = {
    signal:  { name: 'Analyst',   color: 'text-emerald-400', bgColor: 'bg-emerald-900/30' },
    stealth: { name: 'Phantom',   color: 'text-violet-400',  bgColor: 'bg-violet-900/30' },
    intel:   { name: 'Strategist', color: 'text-cyan-400',   bgColor: 'bg-cyan-900/30' },
    speed:   { name: 'Runner',    color: 'text-amber-400',   bgColor: 'bg-amber-900/30' },
    luck:    { name: 'Wildcard',  color: 'text-pink-400',    bgColor: 'bg-pink-900/30' },
  };

  return classes[dominant];
}

/** Rarity tier based on power rating */
export function getRarity(stats: NFTStats): { label: string; color: string } {
  const power = getPowerRating(stats);
  if (power >= 400) return { label: 'Legendary', color: 'text-amber-400' };
  if (power >= 340) return { label: 'Epic',      color: 'text-violet-400' };
  if (power >= 280) return { label: 'Rare',      color: 'text-cyan-400' };
  if (power >= 220) return { label: 'Uncommon',  color: 'text-emerald-400' };
  return { label: 'Common', color: 'text-neutral-400' };
}

/** All stat keys for iteration */
export const STAT_KEYS: (keyof NFTStats)[] = ['signal', 'stealth', 'intel', 'speed', 'luck'];

/** Display labels for stats */
export const STAT_LABELS: Record<keyof NFTStats, string> = {
  signal: 'SIG',
  stealth: 'STL',
  intel: 'INT',
  speed: 'SPD',
  luck: 'LCK',
};

/** Stat bar color based on value */
export function getStatColor(value: number): string {
  if (value >= 80) return 'bg-emerald-500';
  if (value >= 60) return 'bg-cyan-500';
  if (value >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}
