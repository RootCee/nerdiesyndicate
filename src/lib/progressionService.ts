import {
  PHASE1_LEVEL_CAP,
  PHASE1_LEVEL_XP_THRESHOLDS,
  PHASE1_PROGRESSION_UNLOCK_SEQUENCE,
  PHASE1_RANK_THRESHOLDS,
  RANKED_QUEUE_UNLOCK_LEVEL,
  getGameplayRarity,
  getMaxBotSlotsForRarity,
  getMinimumRarityForBotSlotCount,
  getNextBotSlotUnlockLevel,
  getTotalXPForLevel,
  getUnlockedBotSlotsForLevel,
  getXPToNextLevel,
  type GameplayRarity,
  type RankThreshold,
} from "../config/gameplay";
import type {
  HeatBand,
  HeatState,
  LevelState,
  ProgressionProfile,
  ProgressionSubjectType,
  RankState,
  RankTier,
  ReputationBand,
  ReputationState,
  XPSource,
  XPState,
} from "../types/progression";

export interface ProgressionServiceInput {
  subjectType: ProgressionSubjectType;
  subjectId: string;
  totalXP: number;
  rarity?: string | number | null;
  lastSource?: XPSource;
  updatedAt?: string;
  createdAt?: string;
  prestigeLevel?: number;
  lastLeveledAt?: string | null;
  rankPoints?: number;
  hiddenMMR?: number;
  seasonId?: string;
  wins?: number;
  losses?: number;
  draws?: number;
  reputationScore?: number;
  reputationFaction?: string | null;
  reputationDistrict?: string | null;
  reputationTrustFlags?: string[];
  heatScore?: number;
  heatSourceTags?: string[];
  heatCooldownEndsAt?: string | null;
}

export interface BotSlotProgressState {
  rarity: GameplayRarity;
  currentLevel: number;
  maxSlots: number;
  unlockedSlots: number;
  lockedSlots: number;
  nextUnlockLevel: number | null;
  nextUnlockMinimumRarity: GameplayRarity | null;
}

export interface RankProgressSummary {
  state: RankState;
  rankedQueueUnlocked: boolean;
  nextTier: RankTier | null;
  nextTierMinRankPoints: number | null;
  nextTierMinimumLevel: number | null;
}

export interface ResolvedProgressionProfile {
  profile: ProgressionProfile;
  botSlots: BotSlotProgressState;
  rankSummary?: RankProgressSummary;
}

type ReputationBandThreshold = {
  band: ReputationBand;
  minScore: number;
};

type HeatBandThreshold = {
  band: HeatBand;
  minScore: number;
};

const REPUTATION_BAND_THRESHOLDS: ReputationBandThreshold[] = [
  { band: "unknown", minScore: 0 },
  { band: "watched", minScore: 25 },
  { band: "trusted", minScore: 100 },
  { band: "connected", minScore: 250 },
  { band: "influential", minScore: 500 },
  { band: "elite", minScore: 1000 },
];

const HEAT_BAND_THRESHOLDS: HeatBandThreshold[] = [
  { band: "cold", minScore: 0 },
  { band: "warm", minScore: 25 },
  { band: "hot", minScore: 50 },
  { band: "critical", minScore: 75 },
  { band: "manhunt", minScore: 100 },
];

function clampNonNegative(value: number | undefined | null) {
  const normalized = Number(value ?? 0);

  if (Number.isNaN(normalized)) {
    return 0;
  }

  return Math.max(0, Math.floor(normalized));
}

function getTimestamp(value?: string) {
  return value?.trim() || new Date().toISOString();
}

export function getLevelForTotalXP(totalXP: number): number {
  const normalizedXP = clampNonNegative(totalXP);
  let currentLevel = 1;

  for (const threshold of PHASE1_LEVEL_XP_THRESHOLDS) {
    if (normalizedXP >= threshold.totalXPRequired) {
      currentLevel = threshold.level;
    }
  }

  return currentLevel;
}

export function getUnlockedMilestonesForLevel(level: number): string[] {
  const currentLevel = Math.min(PHASE1_LEVEL_CAP, Math.max(1, Math.floor(level)));

  return PHASE1_PROGRESSION_UNLOCK_SEQUENCE.flatMap((entry) =>
    currentLevel >= entry.level ? entry.unlocks : []
  );
}

export function buildXPState(
  totalXP: number,
  lastSource?: XPSource,
  updatedAt?: string
): XPState {
  const lifetimeXP = clampNonNegative(totalXP);
  const currentLevel = getLevelForTotalXP(lifetimeXP);
  const levelFloorXP = getTotalXPForLevel(currentLevel);
  const xpToNextLevel = getXPToNextLevel(currentLevel);

  return {
    currentXP: lifetimeXP,
    lifetimeXP,
    levelXP: lifetimeXP - levelFloorXP,
    nextLevelXP: xpToNextLevel ?? 0,
    lastSource,
    updatedAt: getTimestamp(updatedAt),
  };
}

export function buildLevelState(
  totalXP: number,
  prestigeLevel?: number,
  lastLeveledAt?: string | null
): LevelState {
  const currentLevel = getLevelForTotalXP(totalXP);

  return {
    currentLevel,
    maxLevel: PHASE1_LEVEL_CAP,
    prestigeLevel,
    unlockedMilestones: getUnlockedMilestonesForLevel(currentLevel),
    lastLeveledAt: lastLeveledAt ?? null,
  };
}

function getThresholdBand<TBand extends string>(
  score: number,
  thresholds: Array<{ band: TBand; minScore: number }>
): TBand {
  const normalizedScore = clampNonNegative(score);
  let currentBand = thresholds[0].band;

  for (const threshold of thresholds) {
    if (normalizedScore >= threshold.minScore) {
      currentBand = threshold.band;
    }
  }

  return currentBand;
}

export function getReputationBandForScore(score: number): ReputationBand {
  return getThresholdBand(score, REPUTATION_BAND_THRESHOLDS);
}

export function getHeatBandForScore(score: number): HeatBand {
  return getThresholdBand(score, HEAT_BAND_THRESHOLDS);
}

export function buildReputationState(
  score: number,
  updatedAt?: string,
  faction?: string | null,
  district?: string | null,
  trustFlags?: string[]
): ReputationState {
  const normalizedScore = clampNonNegative(score);

  return {
    score: normalizedScore,
    band: getReputationBandForScore(normalizedScore),
    faction: faction ?? null,
    district: district ?? null,
    trustFlags,
    updatedAt: getTimestamp(updatedAt),
  };
}

export function buildHeatState(
  score: number,
  updatedAt?: string,
  sourceTags: string[] = [],
  cooldownEndsAt?: string | null
): HeatState {
  const normalizedScore = clampNonNegative(score);

  return {
    score: normalizedScore,
    band: getHeatBandForScore(normalizedScore),
    sourceTags,
    cooldownEndsAt: cooldownEndsAt ?? null,
    updatedAt: getTimestamp(updatedAt),
  };
}

function getCurrentRankThreshold(level: number, rankPoints: number): RankThreshold {
  const normalizedPoints = clampNonNegative(rankPoints);
  const eligibleThresholds = PHASE1_RANK_THRESHOLDS.filter(
    (threshold) =>
      level >= threshold.minimumLevel && normalizedPoints >= threshold.minRankPoints
  );

  return eligibleThresholds[eligibleThresholds.length - 1] ?? PHASE1_RANK_THRESHOLDS[0];
}

function getNextRankThreshold(level: number, rankPoints: number): RankThreshold | null {
  const currentThreshold = getCurrentRankThreshold(level, rankPoints);
  const currentIndex = PHASE1_RANK_THRESHOLDS.findIndex(
    (threshold) => threshold.tier === currentThreshold.tier
  );

  return PHASE1_RANK_THRESHOLDS[currentIndex + 1] ?? null;
}

export function buildRankSummary(
  level: number,
  rankPoints: number,
  updatedAt?: string,
  wins = 0,
  losses = 0,
  draws = 0,
  hiddenMMR?: number,
  seasonId?: string
): RankProgressSummary {
  const normalizedPoints = clampNonNegative(rankPoints);
  const rankedQueueUnlocked = level >= RANKED_QUEUE_UNLOCK_LEVEL;
  const currentThreshold = getCurrentRankThreshold(level, normalizedPoints);
  const nextThreshold = rankedQueueUnlocked ? getNextRankThreshold(level, normalizedPoints) : PHASE1_RANK_THRESHOLDS[0];

  return {
    state: {
      visibleRank: currentThreshold.tier,
      rankPoints: normalizedPoints,
      hiddenMMR,
      seasonId,
      wins,
      losses,
      draws,
      updatedAt: getTimestamp(updatedAt),
    },
    rankedQueueUnlocked,
    nextTier: nextThreshold?.tier ?? null,
    nextTierMinRankPoints: nextThreshold?.minRankPoints ?? null,
    nextTierMinimumLevel: nextThreshold?.minimumLevel ?? null,
  };
}

export function buildBotSlotProgress(
  rarityValue: string | number | null | undefined,
  totalXP: number
): BotSlotProgressState {
  const currentLevel = getLevelForTotalXP(totalXP);
  const rarity = getGameplayRarity(rarityValue ?? undefined);
  const maxSlots = getMaxBotSlotsForRarity(rarity);
  const unlockedSlots = Math.min(maxSlots, getUnlockedBotSlotsForLevel(currentLevel));
  const nextUnlockLevel = unlockedSlots < maxSlots ? getNextBotSlotUnlockLevel(currentLevel) : null;
  const nextUnlockMinimumRarity =
    unlockedSlots < maxSlots ? getMinimumRarityForBotSlotCount(unlockedSlots + 1) : null;

  return {
    rarity,
    currentLevel,
    maxSlots,
    unlockedSlots,
    lockedSlots: Math.max(0, maxSlots - unlockedSlots),
    nextUnlockLevel,
    nextUnlockMinimumRarity,
  };
}

export function resolveProgressionProfile(
  input: ProgressionServiceInput
): ResolvedProgressionProfile {
  const updatedAt = getTimestamp(input.updatedAt);
  const createdAt = getTimestamp(input.createdAt ?? updatedAt);
  const xp = buildXPState(input.totalXP, input.lastSource, updatedAt);
  const level = buildLevelState(input.totalXP, input.prestigeLevel, input.lastLeveledAt);
  const botSlots = buildBotSlotProgress(input.rarity, input.totalXP);

  const rankSummary =
    input.rankPoints != null
      ? buildRankSummary(
          level.currentLevel,
          input.rankPoints,
          updatedAt,
          input.wins ?? 0,
          input.losses ?? 0,
          input.draws ?? 0,
          input.hiddenMMR,
          input.seasonId
        )
      : undefined;

  const reputation =
    input.reputationScore != null
      ? buildReputationState(
          input.reputationScore,
          updatedAt,
          input.reputationFaction,
          input.reputationDistrict,
          input.reputationTrustFlags
        )
      : undefined;

  const heat =
    input.heatScore != null
      ? buildHeatState(
          input.heatScore,
          updatedAt,
          input.heatSourceTags ?? [],
          input.heatCooldownEndsAt
        )
      : undefined;

  return {
    profile: {
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      xp,
      level,
      rank: rankSummary?.state,
      reputation,
      heat,
      createdAt,
      updatedAt,
    },
    botSlots,
    rankSummary,
  };
}
