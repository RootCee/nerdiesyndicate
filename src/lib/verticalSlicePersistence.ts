import { getMockMissions, evaluateMissionCompletion } from "./missions";
import { buildOpenedBusinessOperationSummaries } from "./businessOperationsStatus";
import { getLocalStarterBusinessKey } from "./localStarterBusinesses";
import {
  buildMissionProgressRecord,
  buildNFTProgressionRecord,
} from "./progressionPersistenceModel";
import { PERSISTENCE_MODEL_VERSION, type LocalVerticalSliceSnapshot, type MissionProgressCounterMap, type PersistenceSubjectRef } from "../types/persistence";
import type { LocalMissionSubjectState } from "./missionHarness";
import type { NFTGameplayProfile } from "./nftGameplayProfile";
import type { MissionProgressInput } from "../types/missions";
import type { BusinessNftClassId } from "../types/business";

interface BuildVerticalSliceSubjectSnapshotInput {
  tokenId: number;
  gameplayProfile: NFTGameplayProfile;
  localState: LocalMissionSubjectState;
  ownerAddress?: string | null;
}

interface BuildVerticalSliceSnapshotInput {
  subjects: BuildVerticalSliceSubjectSnapshotInput[];
}

function getTimestamp(value?: string | null) {
  return value?.trim() || new Date().toISOString();
}

function buildSubjectRef(
  tokenId: number,
  ownerAddress?: string | null
): PersistenceSubjectRef {
  return {
    subjectType: "nft",
    subjectId: String(tokenId),
    tokenId,
    ownerAddress: ownerAddress ?? null,
  };
}

function buildMissionProgressInputFromCounters(
  counters: MissionProgressCounterMap[]
): MissionProgressInput {
  return counters.reduce<MissionProgressInput>(
    (progress, counterMap) => ({
      matchesCompleted: Math.max(progress.matchesCompleted ?? 0, counterMap.matches_completed ?? 0),
      matchesWon: Math.max(progress.matchesWon ?? 0, counterMap.matches_won ?? 0),
      objectivesCompleted: Math.max(progress.objectivesCompleted ?? 0, counterMap.objectives_completed ?? 0),
      districtMissionsCompleted: Math.max(
        progress.districtMissionsCompleted ?? 0,
        counterMap.district_missions_completed ?? 0
      ),
      businessOperationsCompleted: Math.max(
        progress.businessOperationsCompleted ?? 0,
        counterMap.business_operations_completed ?? 0
      ),
      botDeployments: Math.max(progress.botDeployments ?? 0, counterMap.bot_deployments ?? 0),
    }),
    {}
  );
}

function restoreOwnedBusinessNftClasses(
  ownedBusinessNftClasses: LocalVerticalSliceSnapshot["subjects"][number]["localState"]["ownedBusinessNftClasses"] | undefined,
  ownedBusinessNftCount: number | undefined
): BusinessNftClassId[] {
  if (Array.isArray(ownedBusinessNftClasses) && ownedBusinessNftClasses.length > 0) {
    return ownedBusinessNftClasses as BusinessNftClassId[];
  }

  // Preserve older local snapshots by treating a generic owned business as the
  // first phase starter class until wallet-derived class data is available.
  return (ownedBusinessNftCount ?? 0) > 0 ? ["retail_business"] : [];
}

function buildOperationalCounters(localState: LocalMissionSubjectState) {
  const completedCertificationCount = getMockMissions().filter(
    (mission) =>
      mission.missionClass === "certification" &&
      localState.completedMissionIds.includes(mission.id)
  ).length;

  return {
    businessOperationsCompleted:
      localState.missionProgress.businessOperationsCompleted ?? 0,
    districtMissionsCompleted:
      localState.missionProgress.districtMissionsCompleted ?? 0,
    completedCertificationCount,
  };
}

function getMissingCertificationMissionIds(
  summary: ReturnType<typeof buildOpenedBusinessOperationSummaries>[number]
) {
  const missingBaseCertifications = summary.missingChecks.some(
    (check) => check.type === "certification"
  )
    ? summary.definition.requiredCertificationMissionIds
    : [];

  return Array.from(
    new Set([
      ...missingBaseCertifications,
      ...summary.trust.higherTrustOperations.missingMissionIds,
      ...summary.trust.defensePermissions.missingMissionIds,
      ...summary.trust.advancedOperatorAccess.missingMissionIds,
    ])
  );
}

export function buildLocalVerticalSliceSnapshot({
  subjects,
}: BuildVerticalSliceSnapshotInput): LocalVerticalSliceSnapshot {
  const exportedAt = getTimestamp();

  return {
    schemaVersion: PERSISTENCE_MODEL_VERSION,
    exportedAt,
    subjects: subjects.map(({ tokenId, gameplayProfile, localState, ownerAddress }) => {
      const subject = buildSubjectRef(tokenId, ownerAddress);
      const openedBusinessSnapshots = buildOpenedBusinessOperationSummaries(
        gameplayProfile,
        localState
      ).map((summary) => ({
        businessKey: getLocalStarterBusinessKey(summary.openedBusiness),
        businessTypeId: summary.openedBusiness.businessTypeId,
        businessName: summary.definition.name,
        district: summary.openedBusiness.district,
        lotId: summary.openedBusiness.lotId ?? null,
        lotLabel: summary.openedBusiness.lotLabel ?? null,
        lotContext: summary.lotContext,
        businessNftClassId: summary.openedBusiness.openedViaBusinessNftClass ?? null,
        businessNftClassName: summary.businessNftClass?.name ?? null,
        ownershipStatus: summary.ownershipStatus,
        activationStatus: summary.activationStatus,
        operationalState: summary.operationalState.state,
        operationalStateLabel: summary.operationalState.label,
        operationalStateReason: summary.operationalState.reason,
        operatorFit: summary.operatorStatus,
        stakingEntitlementTier: summary.staking.entitlementTier,
        stakingRequiredTier: summary.staking.requiredTier,
        stakingTierSatisfied: summary.staking.tierSatisfied,
        teamFilledSlots: summary.team.filledSlots,
        teamRequiredSlots: summary.team.requiredSlots,
        teamReadyForActivation: summary.team.readyForActivation,
        defenseFilledSlots: summary.defense.filledSlots,
        defenseRequiredSlots: summary.defense.requiredSlots,
        defenseCoverageReady: summary.defense.recommendedCoverageMet,
        trustBand: summary.trust.districtReputation.trustBand,
        unlockedPermissions: summary.trust.unlockedPermissions,
        blockedPermissionLabels: summary.trust.blockedPermissionLabels,
        requiredCertificationMissionIds: summary.definition.requiredCertificationMissionIds,
        missingCertificationMissionIds: getMissingCertificationMissionIds(summary),
        missingRequirementMessages: summary.missingChecks.map((check) => check.message),
        futureRequirementPlaceholders: summary.futureRequirementPlaceholders,
        updatedAt: exportedAt,
      }));
      const missions = getMockMissions().map((mission) => {
        const evaluation = evaluateMissionCompletion(
          mission,
          localState.missionProgress,
          gameplayProfile.progression.profile.level.currentLevel
        );

        return buildMissionProgressRecord({
          recordId: `${tokenId}:${mission.id}`,
          subject,
          evaluation,
          evaluatedAt: exportedAt,
          rewardClaimedAt: localState.completedMissionIds.includes(mission.id) ? exportedAt : null,
        });
      });

      return {
        schemaVersion: PERSISTENCE_MODEL_VERSION,
        subject,
        progression: buildNFTProgressionRecord({
          recordId: `nft:${tokenId}`,
          subject,
          progression: gameplayProfile.progression,
          updatedAt: exportedAt,
        }),
        missions,
        localState: {
          stakingTier: localState.stakingTier,
          stakingState: localState.stakingState,
          ownedBusinessNftCount: localState.ownedBusinessNftCount,
          ownedBusinessNftClasses: localState.ownedBusinessNftClasses,
          lastSource: localState.lastSource,
          lastCompletedMissionId: localState.lastCompletedMissionId ?? null,
          certificationAnswers: localState.certificationAnswers,
          completedMissionIds: localState.completedMissionIds,
          openedStarterBusinesses: localState.openedStarterBusinesses,
          businessTeamAssignments: localState.businessTeamAssignments,
          businessDefenseAssignments: localState.businessDefenseAssignments,
          operationalCounters: buildOperationalCounters(localState),
          openedBusinessSnapshots,
          updatedAt: exportedAt,
        },
        rewardLedger: [],
      };
    }),
  };
}

export function serializeLocalVerticalSliceSnapshot(
  input: BuildVerticalSliceSnapshotInput
): string {
  return JSON.stringify(buildLocalVerticalSliceSnapshot(input), null, 2);
}

export function restoreLocalMissionStateByTokenId(
  snapshot: LocalVerticalSliceSnapshot
): Record<number, LocalMissionSubjectState> {
  return Object.fromEntries(
    snapshot.subjects
      .filter((subjectSnapshot) => subjectSnapshot.subject.tokenId != null)
      .map((subjectSnapshot) => {
        const tokenId = subjectSnapshot.subject.tokenId as number;
        const missionProgress = buildMissionProgressInputFromCounters(
          subjectSnapshot.missions.map((record) => record.progress)
        );
        const ownedBusinessNftClasses = restoreOwnedBusinessNftClasses(
          subjectSnapshot.localState.ownedBusinessNftClasses,
          subjectSnapshot.localState.ownedBusinessNftCount
        );

        return [
          tokenId,
          {
            totalXP: subjectSnapshot.progression.counters.totalXP,
            reputationScore: subjectSnapshot.progression.counters.reputationScore,
            heatScore: subjectSnapshot.progression.counters.heatScore,
            rankPoints: subjectSnapshot.progression.counters.rankPoints,
            lastSource: subjectSnapshot.localState.lastSource,
            stakingTier: subjectSnapshot.localState.stakingTier,
            stakingState: subjectSnapshot.localState.stakingState ?? {
              source: "local_mock",
              entitlementTier: subjectSnapshot.localState.stakingTier,
            },
            ownedBusinessNftCount:
              subjectSnapshot.localState.ownedBusinessNftCount ?? ownedBusinessNftClasses.length,
            ownedBusinessNftClasses,
            lastCompletedMissionId: subjectSnapshot.localState.lastCompletedMissionId ?? null,
            openedStarterBusinesses: subjectSnapshot.localState.openedStarterBusinesses.map(
              (business) => ({
                ...business,
                openedViaBusinessNftClass: business.openedViaBusinessNftClass ?? null,
              })
            ),
            businessTeamAssignments:
              subjectSnapshot.localState.businessTeamAssignments ?? {},
            businessDefenseAssignments:
              subjectSnapshot.localState.businessDefenseAssignments ?? {},
            missionProgress,
            certificationAnswers: subjectSnapshot.localState.certificationAnswers ?? {},
            completedMissionIds: subjectSnapshot.localState.completedMissionIds,
          } satisfies LocalMissionSubjectState,
        ];
      })
  );
}

export function parseLocalVerticalSliceSnapshot(
  value: string
): LocalVerticalSliceSnapshot {
  const parsed = JSON.parse(value) as Partial<LocalVerticalSliceSnapshot>;

  if (
    parsed.schemaVersion !== PERSISTENCE_MODEL_VERSION ||
    !Array.isArray(parsed.subjects)
  ) {
    throw new Error("Invalid vertical slice snapshot.");
  }

  return parsed as LocalVerticalSliceSnapshot;
}

export function restoreLocalMissionStateByTokenIdFromJson(
  value: string
): Record<number, LocalMissionSubjectState> {
  return restoreLocalMissionStateByTokenId(parseLocalVerticalSliceSnapshot(value));
}
