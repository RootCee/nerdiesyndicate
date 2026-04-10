import type { MissionEvaluation } from "../types/missions";
import type {
  MissionProgressCounterMap,
  MissionProgressRecord,
  NFTProgressionRecord,
  PersistenceSubjectRef,
  ProgressionCounterSnapshot,
  ProgressionRewardLedgerEntry,
} from "../types/persistence";
import { PERSISTENCE_MODEL_VERSION } from "../types/persistence";
import type { ResolvedProgressionProfile } from "./progressionService";

interface BuildNFTProgressionRecordInput {
  recordId: string;
  subject: PersistenceSubjectRef;
  progression: ResolvedProgressionProfile;
  createdAt?: string;
  updatedAt?: string;
}

interface BuildMissionProgressRecordInput {
  recordId: string;
  subject: PersistenceSubjectRef;
  evaluation: MissionEvaluation;
  existing?: MissionProgressRecord;
  evaluatedAt?: string;
  rewardClaimedAt?: string | null;
}

interface BuildRewardLedgerEntryInput {
  eventId: string;
  subject: PersistenceSubjectRef;
  missionId?: string | null;
  sourceType: ProgressionRewardLedgerEntry["sourceType"];
  rewards: ProgressionRewardLedgerEntry["rewards"];
  before: ProgressionCounterSnapshot;
  after: ProgressionCounterSnapshot;
  createdAt?: string;
  notes?: string | null;
}

function getTimestamp(value?: string | null) {
  return value?.trim() || new Date().toISOString();
}

function buildCounterSnapshot(
  progression: ResolvedProgressionProfile
): ProgressionCounterSnapshot {
  return {
    totalXP: progression.profile.xp.lifetimeXP,
    rankPoints: progression.profile.rank?.rankPoints ?? 0,
    reputationScore: progression.profile.reputation?.score ?? 0,
    heatScore: progression.profile.heat?.score ?? 0,
  };
}

function buildMissionProgressMap(evaluation: MissionEvaluation): MissionProgressCounterMap {
  return Object.fromEntries(
    evaluation.progress.map((entry) => [entry.requirementType, entry.current])
  );
}

export function buildNFTProgressionRecord({
  recordId,
  subject,
  progression,
  createdAt,
  updatedAt,
}: BuildNFTProgressionRecordInput): NFTProgressionRecord {
  const recordedAt = getTimestamp(updatedAt ?? progression.profile.updatedAt);

  return {
    schemaVersion: PERSISTENCE_MODEL_VERSION,
    recordId,
    subject,
    counters: buildCounterSnapshot(progression),
    derived: {
      currentLevel: progression.profile.level.currentLevel,
      visibleRank: progression.profile.rank?.visibleRank,
      reputationBand: progression.profile.reputation?.band,
      heatBand: progression.profile.heat?.band,
      unlockedMilestones: progression.profile.level.unlockedMilestones,
      updatedAt: recordedAt,
    },
    botSlots: {
      rarity: progression.botSlots.rarity,
      maxSlots: progression.botSlots.maxSlots,
      unlockedSlots: progression.botSlots.unlockedSlots,
      lockedSlots: progression.botSlots.lockedSlots,
      nextUnlockLevel: progression.botSlots.nextUnlockLevel,
      nextUnlockMinimumRarity: progression.botSlots.nextUnlockMinimumRarity,
      updatedAt: recordedAt,
    },
    createdAt: getTimestamp(createdAt ?? progression.profile.createdAt),
    updatedAt: recordedAt,
  };
}

export function buildMissionProgressRecord({
  recordId,
  subject,
  evaluation,
  existing,
  evaluatedAt,
  rewardClaimedAt,
}: BuildMissionProgressRecordInput): MissionProgressRecord {
  const timestamp = getTimestamp(evaluatedAt);
  const completedAt = evaluation.status === "completed" ? timestamp : null;
  const priorCompletionCount = existing?.completionCount ?? 0;
  const alreadyCompleted = existing?.status === "completed";

  return {
    schemaVersion: PERSISTENCE_MODEL_VERSION,
    recordId,
    subject,
    missionId: evaluation.missionId,
    status: evaluation.status,
    progress: buildMissionProgressMap(evaluation),
    completionEligible: evaluation.completionEligible,
    completionCount:
      evaluation.status === "completed" && !alreadyCompleted
        ? priorCompletionCount + 1
        : priorCompletionCount,
    firstCompletedAt:
      existing?.firstCompletedAt ??
      (evaluation.status === "completed" ? completedAt : null),
    lastCompletedAt: evaluation.status === "completed" ? completedAt : existing?.lastCompletedAt ?? null,
    lastEvaluatedAt: timestamp,
    lastRewardClaimAt: rewardClaimedAt ?? existing?.lastRewardClaimAt ?? null,
    updatedAt: timestamp,
  };
}

export function buildRewardLedgerEntry({
  eventId,
  subject,
  missionId,
  sourceType,
  rewards,
  before,
  after,
  createdAt,
  notes,
}: BuildRewardLedgerEntryInput): ProgressionRewardLedgerEntry {
  return {
    schemaVersion: PERSISTENCE_MODEL_VERSION,
    eventId,
    subject,
    missionId: missionId ?? null,
    sourceType,
    rewards,
    before,
    after,
    createdAt: getTimestamp(createdAt),
    notes: notes ?? null,
  };
}
