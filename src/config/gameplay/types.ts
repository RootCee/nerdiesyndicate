export type GameplayRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary"
  | "mythic";

export type NerdieCityRole =
  | "hacker"
  | "trader"
  | "data_broker"
  | "code_warrior";

export type NerdieCityDistrict = "neon_market" | "dark_alley" | "cyber_hq";

export type StarterToolFamily = "hacking" | "business" | "intel" | "combat";

export type StarterToolScalingStat =
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

export interface StarterToolDefinition {
  id: string;
  family: StarterToolFamily;
  scalingStats: StarterToolScalingStat[];
}

export interface ToolSlotCap {
  toolSlots: number;
  utilitySlots: number;
  passiveSlots: number;
  payloadSlots: number;
}

export interface LevelXPThreshold {
  level: number;
  totalXPRequired: number;
  xpToNextLevel: number | null;
}

export interface BotSlotUnlockMilestone {
  level: number;
  unlockedSlots: number;
  minimumRarity: GameplayRarity;
}

export interface RankThreshold {
  tier: "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master" | "city_elite";
  minRankPoints: number;
  maxRankPoints: number | null;
  minimumLevel: number;
}
