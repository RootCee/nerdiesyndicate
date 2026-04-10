import {
  DEFAULT_STARTER_TOOL,
  STARTER_TOOL_BY_ROLE,
  type StarterToolDefinition,
} from "../config/gameplay";

export type DerivedStatKey =
  | "speed"
  | "power"
  | "defense"
  | "hack"
  | "stealth"
  | "luck"
  | "energy"
  | "capacity"
  | "influence"
  | "prestige";

export interface DerivedStats {
  speed: number;
  power: number;
  defense: number;
  hack: number;
  stealth: number;
  luck: number;
  energy: number;
  capacity: number;
  influence: number;
  prestige: number;
}

export interface NFTMetadataInput {
  rarity?: string | null;
  faction?: string | null;
  reputation?: string | number | null;
  role_in_nerdie_city?: string | null;
  location?: string | null;
  catchphrase?: string | null;
  ai_driven_crypto_portfolio?: string | null;
  scene?: string | null;
  detected_objects?: string[] | string | null;
  dominant_color?: string | null;
  traits?: Array<{
    trait_type?: string | null;
    type?: string | null;
    value?: string | number | null;
  }>;
}

export interface StarterTool extends StarterToolDefinition {}

export interface ResolvedNFTProfile {
  normalizedTraits: {
    rarity: string | null;
    faction: string | null;
    roleInNerdieCity: string | null;
    location: string | null;
    reputation: string | number | null;
  };
  stats: DerivedStats;
  starterTool: StarterTool;
}

const BASELINE_STATS: DerivedStats = {
  speed: 10,
  power: 10,
  defense: 10,
  hack: 10,
  stealth: 10,
  luck: 10,
  energy: 10,
  capacity: 1,
  influence: 10,
  prestige: 10,
};

type StatDelta = Partial<Record<DerivedStatKey, number>>;

const RARITY_MODIFIERS: Record<string, StatDelta> = {
  common: {},
  uncommon: { prestige: 4 },
  rare: { prestige: 8 },
  epic: { prestige: 12 },
  legendary: { prestige: 20, capacity: 1 },
  mythic: { prestige: 28, capacity: 2 },
};

const FACTION_MODIFIERS: Record<string, StatDelta> = {
  crypto_nomads: { speed: 4, luck: 4 },
  byte_rebels: { hack: 8, stealth: 4 },
  blockchain_syndicate: { influence: 8, defense: 4 },
};

const ROLE_MODIFIERS: Record<string, StatDelta> = {
  hacker: { hack: 12, stealth: 4 },
  trader: { influence: 10, luck: 5 },
  data_broker: { hack: 8, luck: 6 },
  code_warrior: { power: 8, defense: 8 },
};

const LOCATION_MODIFIERS: Record<string, StatDelta> = {
  dark_alley: { stealth: 6, luck: 2 },
  neon_market: { influence: 6, luck: 4 },
  cyber_hq: { hack: 6, energy: 3 },
};

function normalizeKey(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || null;
}

function extractTraitMap(metadata: NFTMetadataInput): Record<string, string | number | null> {
  const traitMap: Record<string, string | number | null> = {
    rarity: metadata.rarity ?? null,
    faction: metadata.faction ?? null,
    reputation: metadata.reputation ?? null,
    role_in_nerdie_city: metadata.role_in_nerdie_city ?? null,
    location: metadata.location ?? null,
    catchphrase: metadata.catchphrase ?? null,
    ai_driven_crypto_portfolio: metadata.ai_driven_crypto_portfolio ?? null,
    scene: metadata.scene ?? null,
    dominant_color: metadata.dominant_color ?? null,
  };

  for (const trait of metadata.traits ?? []) {
    const rawKey = trait.trait_type ?? trait.type;
    const normalizedKey = normalizeKey(rawKey);

    if (!normalizedKey) {
      continue;
    }

    traitMap[normalizedKey] = trait.value ?? null;
  }

  return traitMap;
}

function applyModifiers(stats: DerivedStats, modifiers?: StatDelta): DerivedStats {
  if (!modifiers) {
    return stats;
  }

  const nextStats = { ...stats };

  for (const [key, value] of Object.entries(modifiers) as Array<[DerivedStatKey, number]>) {
    nextStats[key] += value;
  }

  return nextStats;
}

function clampStats(stats: DerivedStats): DerivedStats {
  const nextStats = { ...stats };

  for (const key of Object.keys(nextStats) as DerivedStatKey[]) {
    nextStats[key] = Math.max(0, nextStats[key]);
  }

  return nextStats;
}

function normalizeMetadataTraits(metadata: NFTMetadataInput): ResolvedNFTProfile["normalizedTraits"] {
  const traits = extractTraitMap(metadata);

  return {
    rarity: normalizeKey(traits.rarity),
    faction: normalizeKey(traits.faction),
    roleInNerdieCity: normalizeKey(traits.role_in_nerdie_city),
    location: normalizeKey(traits.location),
    reputation: traits.reputation ?? null,
  };
}

export function deriveNFTStatsFromMetadata(metadata: NFTMetadataInput): DerivedStats {
  const normalizedTraits = normalizeMetadataTraits(metadata);

  let stats = { ...BASELINE_STATS };

  stats = applyModifiers(stats, RARITY_MODIFIERS[normalizedTraits.rarity ?? ""]);
  stats = applyModifiers(stats, FACTION_MODIFIERS[normalizedTraits.faction ?? ""]);
  stats = applyModifiers(stats, ROLE_MODIFIERS[normalizedTraits.roleInNerdieCity ?? ""]);
  stats = applyModifiers(stats, LOCATION_MODIFIERS[normalizedTraits.location ?? ""]);
  return clampStats(stats);
}

export function assignStarterToolFromMetadata(metadata: NFTMetadataInput): StarterTool {
  const normalizedTraits = normalizeMetadataTraits(metadata);

  return STARTER_TOOL_BY_ROLE[normalizedTraits.roleInNerdieCity as keyof typeof STARTER_TOOL_BY_ROLE] ?? DEFAULT_STARTER_TOOL;
}

export function resolveNFTMetadataProfile(metadata: NFTMetadataInput): ResolvedNFTProfile {
  const normalizedTraits = normalizeMetadataTraits(metadata);
  const stats = deriveNFTStatsFromMetadata(metadata);
  const starterTool = assignStarterToolFromMetadata(metadata);

  return {
    normalizedTraits,
    stats,
    starterTool,
  };
}
