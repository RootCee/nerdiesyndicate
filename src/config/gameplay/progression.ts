import type {
  BotSlotUnlockMilestone,
  GameplayRarity,
  LevelXPThreshold,
  RankThreshold,
} from "./types";

export const PHASE1_LEVEL_CAP = 30;
export const PHASE1_BASE_XP_TO_NEXT_LEVEL = 100;
export const PHASE1_XP_STEP_PER_LEVEL = 25;
export const RANKED_QUEUE_UNLOCK_LEVEL = 5;

export const PHASE1_BOT_SLOT_UNLOCK_MILESTONES: BotSlotUnlockMilestone[] = [
  { level: 1, unlockedSlots: 1, minimumRarity: "common" },
  { level: 5, unlockedSlots: 2, minimumRarity: "common" },
  { level: 10, unlockedSlots: 3, minimumRarity: "uncommon" },
  { level: 15, unlockedSlots: 4, minimumRarity: "rare" },
  { level: 20, unlockedSlots: 5, minimumRarity: "epic" },
  { level: 25, unlockedSlots: 6, minimumRarity: "legendary" },
  { level: 30, unlockedSlots: 7, minimumRarity: "mythic" },
];

export const PHASE1_RANK_THRESHOLDS: RankThreshold[] = [
  { tier: "bronze", minRankPoints: 0, maxRankPoints: 299, minimumLevel: 5 },
  { tier: "silver", minRankPoints: 300, maxRankPoints: 699, minimumLevel: 8 },
  { tier: "gold", minRankPoints: 700, maxRankPoints: 1199, minimumLevel: 12 },
  { tier: "platinum", minRankPoints: 1200, maxRankPoints: 1699, minimumLevel: 16 },
  { tier: "diamond", minRankPoints: 1700, maxRankPoints: 2299, minimumLevel: 20 },
  { tier: "master", minRankPoints: 2300, maxRankPoints: 2999, minimumLevel: 25 },
  { tier: "city_elite", minRankPoints: 3000, maxRankPoints: null, minimumLevel: 30 },
];

export const PHASE1_PROGRESSION_UNLOCK_SEQUENCE = [
  { level: 1, unlocks: ["starter_tool", "first_bot_slot"] },
  { level: 3, unlocks: ["mission_tier_1"] },
  { level: 5, unlocks: ["ranked_queue", "bot_slot_2"] },
  { level: 8, unlocks: ["tool_tier_2", "silver_rank_eligibility"] },
  { level: 10, unlocks: ["uncommon_slot_cap_breakpoint"] },
  { level: 12, unlocks: ["gold_rank_eligibility", "advanced_mission_tier"] },
  { level: 15, unlocks: ["rare_slot_cap_breakpoint"] },
  { level: 20, unlocks: ["epic_slot_cap_breakpoint", "district_privilege_tier_1"] },
  { level: 25, unlocks: ["legendary_slot_cap_breakpoint", "business_eligibility_baseline"] },
  { level: 30, unlocks: ["mythic_slot_cap_breakpoint", "city_elite_eligibility", "district_privilege_tier_2"] },
];

function clampLevel(level: number) {
  if (Number.isNaN(level)) {
    return 1;
  }

  return Math.min(PHASE1_LEVEL_CAP, Math.max(1, Math.floor(level)));
}

export function getXPToNextLevel(level: number): number | null {
  const currentLevel = clampLevel(level);

  if (currentLevel >= PHASE1_LEVEL_CAP) {
    return null;
  }

  return PHASE1_BASE_XP_TO_NEXT_LEVEL + PHASE1_XP_STEP_PER_LEVEL * (currentLevel - 1);
}

export function getTotalXPForLevel(level: number): number {
  const currentLevel = clampLevel(level);
  const priorLevels = currentLevel - 1;

  return (
    PHASE1_BASE_XP_TO_NEXT_LEVEL * priorLevels +
    PHASE1_XP_STEP_PER_LEVEL * ((priorLevels * (priorLevels - 1)) / 2)
  );
}

export const PHASE1_LEVEL_XP_THRESHOLDS: LevelXPThreshold[] = Array.from(
  { length: PHASE1_LEVEL_CAP },
  (_, index) => {
    const level = index + 1;

    return {
      level,
      totalXPRequired: getTotalXPForLevel(level),
      xpToNextLevel: getXPToNextLevel(level),
    };
  }
);

export function getUnlockedBotSlotsForLevel(level: number): number {
  const currentLevel = clampLevel(level);
  return PHASE1_BOT_SLOT_UNLOCK_MILESTONES.filter(
    (milestone) => currentLevel >= milestone.level
  ).length;
}

export function getNextBotSlotUnlockLevel(level: number): number | null {
  const currentLevel = clampLevel(level);
  return (
    PHASE1_BOT_SLOT_UNLOCK_MILESTONES.find((milestone) => currentLevel < milestone.level)?.level ??
    null
  );
}

export function getMinimumRarityForBotSlotCount(slotCount: number): GameplayRarity | null {
  return (
    PHASE1_BOT_SLOT_UNLOCK_MILESTONES.find((milestone) => milestone.unlockedSlots === slotCount)
      ?.minimumRarity ?? null
  );
}
