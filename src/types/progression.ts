export type ProgressionSubjectType = "account" | "nft" | "bot";

export type XPSource =
  | "match_completion"
  | "match_win"
  | "objective_contribution"
  | "daily_contract"
  | "bot_usage"
  | "event_participation"
  | "district_mission"
  | "business_operation";

export type RankTier =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "master"
  | "city_elite";

export type ReputationBand =
  | "unknown"
  | "watched"
  | "trusted"
  | "connected"
  | "influential"
  | "elite";

export type HeatBand =
  | "cold"
  | "warm"
  | "hot"
  | "critical"
  | "manhunt";

export interface XPState {
  currentXP: number;
  lifetimeXP: number;
  levelXP: number;
  nextLevelXP: number;
  lastSource?: XPSource;
  updatedAt: string;
}

export interface LevelState {
  currentLevel: number;
  maxLevel?: number | null;
  prestigeLevel?: number;
  unlockedMilestones: string[];
  lastLeveledAt?: string | null;
}

export interface RankState {
  visibleRank: RankTier;
  rankPoints: number;
  hiddenMMR?: number;
  seasonId?: string;
  wins: number;
  losses: number;
  draws?: number;
  updatedAt: string;
}

export interface ReputationState {
  score: number;
  band: ReputationBand;
  faction?: string | null;
  district?: string | null;
  trustFlags?: string[];
  updatedAt: string;
}

export interface HeatState {
  score: number;
  band: HeatBand;
  sourceTags: string[];
  cooldownEndsAt?: string | null;
  updatedAt: string;
}

export interface ProgressionProfile {
  subjectType: ProgressionSubjectType;
  subjectId: string;
  xp: XPState;
  level: LevelState;
  rank?: RankState;
  reputation?: ReputationState;
  heat?: HeatState;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressionSnapshot {
  profileId: string;
  subjectType: ProgressionSubjectType;
  subjectId: string;
  xp: XPState;
  level: LevelState;
  rank?: RankState;
  reputation?: ReputationState;
  heat?: HeatState;
  recordedAt: string;
}
