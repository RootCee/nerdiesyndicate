import type { GameplayRarity } from "../config/gameplay";
import type {
  BusinessGameplayStakingState,
  BusinessPermissionId,
  LocalBusinessDefenseAssignmentState,
  LocalBusinessTeamAssignmentState,
  BusinessNftClassId,
  BusinessStakingTier,
  BusinessTypeId,
  DistrictTrustBand,
  LocalStarterBusinessRecord,
} from "./business";
import type {
  HeatBand,
  ProgressionSubjectType,
  RankTier,
  ReputationBand,
  XPSource,
} from "./progression";
import type {
  CertificationMissionAnswerState,
  MissionRequirementType,
  MissionStatus,
} from "./missions";

export const PERSISTENCE_MODEL_VERSION = 1 as const;

export interface PersistenceSubjectRef {
  subjectType: ProgressionSubjectType;
  subjectId: string;
  chainId?: number;
  contractAddress?: string | null;
  ownerAddress?: string | null;
  tokenId?: number | null;
}

export interface ProgressionCounterSnapshot {
  totalXP: number;
  rankPoints: number;
  reputationScore: number;
  heatScore: number;
}

export interface DerivedProgressionSnapshot {
  currentLevel: number;
  visibleRank?: RankTier;
  reputationBand?: ReputationBand;
  heatBand?: HeatBand;
  unlockedMilestones: string[];
  updatedAt: string;
}

export interface BotSlotPersistenceState {
  rarity: GameplayRarity;
  maxSlots: number;
  unlockedSlots: number;
  lockedSlots: number;
  nextUnlockLevel: number | null;
  nextUnlockMinimumRarity: GameplayRarity | null;
  updatedAt: string;
}

export interface NFTProgressionRecord {
  schemaVersion: typeof PERSISTENCE_MODEL_VERSION;
  recordId: string;
  subject: PersistenceSubjectRef;
  counters: ProgressionCounterSnapshot;
  derived: DerivedProgressionSnapshot;
  botSlots: BotSlotPersistenceState;
  createdAt: string;
  updatedAt: string;
}

export type MissionProgressCounterMap = Partial<Record<MissionRequirementType, number>>;

export interface MissionProgressRecord {
  schemaVersion: typeof PERSISTENCE_MODEL_VERSION;
  recordId: string;
  subject: PersistenceSubjectRef;
  missionId: string;
  status: MissionStatus;
  progress: MissionProgressCounterMap;
  completionEligible: boolean;
  completionCount: number;
  firstCompletedAt?: string | null;
  lastCompletedAt?: string | null;
  lastEvaluatedAt: string;
  lastRewardClaimAt?: string | null;
  updatedAt: string;
}

export interface RewardDeltaSnapshot {
  xp: number;
  xpSource?: XPSource;
  rankPoints?: number;
  reputation?: number;
  heat?: number;
}

export interface ProgressionRewardLedgerEntry {
  schemaVersion: typeof PERSISTENCE_MODEL_VERSION;
  eventId: string;
  subject: PersistenceSubjectRef;
  missionId?: string | null;
  sourceType: "mission" | "manual_adjustment" | "season_reset" | "system_grant";
  rewards: RewardDeltaSnapshot;
  before: ProgressionCounterSnapshot;
  after: ProgressionCounterSnapshot;
  createdAt: string;
  notes?: string | null;
}

export interface LocalBusinessOperationalCounterSnapshot {
  businessOperationsCompleted: number;
  districtMissionsCompleted: number;
  completedCertificationCount: number;
}

export interface LocalOpenedBusinessSnapshotRecord {
  businessKey: string;
  businessTypeId: BusinessTypeId;
  businessName: string;
  district: string;
  lotId?: string | null;
  lotLabel?: string | null;
  lotContext: string;
  businessNftClassId?: BusinessNftClassId | null;
  businessNftClassName?: string | null;
  ownershipStatus: string;
  activationStatus: string;
  operationalState: string;
  operationalStateLabel: string;
  operationalStateReason: string;
  operatorFit: string;
  stakingEntitlementTier: BusinessStakingTier;
  stakingRequiredTier: BusinessStakingTier;
  stakingTierSatisfied: boolean;
  teamFilledSlots: number;
  teamRequiredSlots: number;
  teamReadyForActivation: boolean;
  defenseFilledSlots: number;
  defenseRequiredSlots: number;
  defenseCoverageReady: boolean;
  trustBand: DistrictTrustBand;
  unlockedPermissions: BusinessPermissionId[];
  blockedPermissionLabels: string[];
  requiredCertificationMissionIds: string[];
  missingCertificationMissionIds: string[];
  missingRequirementMessages: string[];
  futureRequirementPlaceholders: string[];
  updatedAt: string;
}

export interface LocalVerticalSliceSubjectStateRecord {
  stakingTier: BusinessStakingTier;
  stakingState?: BusinessGameplayStakingState;
  ownedBusinessNftCount: number;
  ownedBusinessNftClasses: BusinessNftClassId[];
  lastSource?: XPSource;
  lastCompletedMissionId?: string | null;
  certificationAnswers: CertificationMissionAnswerState;
  completedMissionIds: string[];
  openedStarterBusinesses: LocalStarterBusinessRecord[];
  businessTeamAssignments?: Record<string, LocalBusinessTeamAssignmentState>;
  businessDefenseAssignments?: Record<string, LocalBusinessDefenseAssignmentState>;
  operationalCounters?: LocalBusinessOperationalCounterSnapshot;
  openedBusinessSnapshots?: LocalOpenedBusinessSnapshotRecord[];
  updatedAt: string;
}

export interface LocalVerticalSliceSubjectSnapshot {
  schemaVersion: typeof PERSISTENCE_MODEL_VERSION;
  subject: PersistenceSubjectRef;
  progression: NFTProgressionRecord;
  missions: MissionProgressRecord[];
  localState: LocalVerticalSliceSubjectStateRecord;
  rewardLedger: ProgressionRewardLedgerEntry[];
}

export interface LocalVerticalSliceSnapshot {
  schemaVersion: typeof PERSISTENCE_MODEL_VERSION;
  exportedAt: string;
  subjects: LocalVerticalSliceSubjectSnapshot[];
}
