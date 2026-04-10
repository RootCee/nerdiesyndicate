import type { XPSource } from "./progression";
import type { NerdieCityRole } from "../config/gameplay";

export type MissionClass = "activity" | "certification";

export type MissionCategory =
  | "daily"
  | "district"
  | "business"
  | "combat"
  | "objective"
  | "certification";

export type MissionDistrict = "neon_market" | "dark_alley" | "cyber_hq";

export type MissionRequirementType =
  | "matches_completed"
  | "matches_won"
  | "objectives_completed"
  | "district_missions_completed"
  | "business_operations_completed"
  | "bot_deployments";

export type MissionStatus = "available" | "completed";

export interface MissionReward {
  xp: number;
  xpSource: XPSource;
  reputation?: number;
  heat?: number;
}

export interface MissionRequirement {
  type: MissionRequirementType;
  target: number;
}

export interface MissionDefinition {
  id: string;
  title: string;
  description: string;
  missionClass: MissionClass;
  category: MissionCategory;
  district?: MissionDistrict;
  minLevel?: number;
  recommendedRoles?: NerdieCityRole[];
  requirements: MissionRequirement[];
  rewards: MissionReward;
}

export interface CertificationQuestionOption {
  id: string;
  label: string;
}

export interface CertificationQuestionDefinition {
  id: string;
  prompt: string;
  options: CertificationQuestionOption[];
  correctOptionId: string;
  explanation: string;
}

export interface CertificationProofDefinition {
  proofType: "soulbound_badge";
  proofKey: string;
  label: string;
  description: string;
}

export interface CertificationMissionDefinition {
  id: string;
  title: string;
  description: string;
  missionClass: "certification";
  category: "certification";
  minLevel?: number;
  rewards: MissionReward;
  passThreshold: number;
  questions: CertificationQuestionDefinition[];
  proof?: CertificationProofDefinition;
}

export interface MissionProgressInput {
  matchesCompleted?: number;
  matchesWon?: number;
  objectivesCompleted?: number;
  districtMissionsCompleted?: number;
  businessOperationsCompleted?: number;
  botDeployments?: number;
}

export interface MissionProgress {
  requirementType: MissionRequirementType;
  current: number;
  target: number;
  complete: boolean;
}

export interface MissionEvaluation {
  missionId: string;
  status: MissionStatus;
  progress: MissionProgress[];
  completionEligible: boolean;
  rewards: MissionReward;
}

export type CertificationAnswerMap = Record<string, string>;
export type CertificationMissionAnswerState = Record<string, CertificationAnswerMap>;

export interface CertificationQuestionResult {
  questionId: string;
  selectedOptionId?: string;
  correctOptionId: string;
  answered: boolean;
  correct: boolean;
  explanation: string;
}

export interface CertificationMissionEvaluation {
  missionId: string;
  status: MissionStatus;
  completionEligible: boolean;
  rewards: MissionReward;
  answeredQuestions: number;
  correctAnswers: number;
  totalQuestions: number;
  passThreshold: number;
  questionResults: CertificationQuestionResult[];
}
