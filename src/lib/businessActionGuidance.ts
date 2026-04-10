import { buildBusinessQualificationSummaries } from "./businessJourney";
import { buildOpenedBusinessOperationSummaries } from "./businessOperationsStatus";
import {
  getBusinessNftClassDefinitionByTokenId,
  getPhase1BusinessNftClasses,
} from "./businessNftBridge";
import type { LocalMissionSubjectState } from "./missionHarness";
import type { NFTGameplayProfile } from "./nftGameplayProfile";
import type {
  BusinessEligibilityCheck,
  BusinessEligibilityDefinition,
  BusinessNftClassId,
} from "../types/business";

interface BusinessActionLockSummary {
  locked: boolean;
  label: string;
  missingRequirements: string[];
  nextAction: string;
}

export interface BusinessClassActionGuidance {
  businessNftClassId: BusinessNftClassId;
  tokenId: number;
  className: string;
  mint: BusinessActionLockSummary;
  stake: BusinessActionLockSummary;
}

export interface BusinessSurfaceActionGuidance {
  activeOperatorLabel: string;
  certificationsImplemented: string[];
  approval: BusinessActionLockSummary;
  byTokenId: Record<number, BusinessClassActionGuidance>;
}

function toRequirementMessage(check: BusinessEligibilityCheck): string {
  return check.message;
}

function getNextActionForCheck(
  definition: BusinessEligibilityDefinition,
  check: BusinessEligibilityCheck | undefined
): string {
  if (!check) {
    return `Use ${definition.name} in Operations to continue setup.`;
  }

  switch (check.type) {
    case "level":
    case "rank":
    case "reputation":
    case "heat":
    case "milestone":
      return "Complete missions in Operations to improve progression and qualification.";
    case "certification":
      return "Complete the required certification in Operations before this business path unlocks.";
    case "district":
      return "Choose a valid district during Ownership / Setup in Operations.";
    case "business_nft":
      return "Acquire a compatible Business NFT sector/class in Assets to continue setup.";
    case "staking_tier":
      return "Use the Activation / Operations stage to satisfy the staking activation requirement.";
    default:
      return `Continue the ${definition.name} business path in Operations.`;
  }
}

export function buildBusinessSurfaceActionGuidance(
  gameplayProfile: NFTGameplayProfile,
  missionState: LocalMissionSubjectState
): BusinessSurfaceActionGuidance {
  const qualificationSummaries = buildBusinessQualificationSummaries(
    gameplayProfile,
    missionState
  );
  const openedBusinessSummaries = buildOpenedBusinessOperationSummaries(
    gameplayProfile,
    missionState
  );

  const byTokenId = Object.fromEntries(
    getPhase1BusinessNftClasses().map((businessNftClass) => {
      const qualificationCandidates = qualificationSummaries.filter((summary) =>
        businessNftClass.opensBusinessTypes.includes(summary.definition.id)
      );
      const mintReadyCandidate =
        qualificationCandidates.find((summary) => summary.qualified) ??
        qualificationCandidates
          .slice()
          .sort((left, right) => left.missingChecks.length - right.missingChecks.length)[0];
      const mintBlockingChecks =
        mintReadyCandidate?.missingChecks.filter(
          (check) => check.type !== "business_nft" && check.type !== "staking_tier"
        ) ?? [];

      const openedForClass = openedBusinessSummaries.filter(
        (summary) => summary.openedBusiness.openedViaBusinessNftClass === businessNftClass.id
      );
      const stakeReadyCandidate = openedForClass[0] ?? null;
      const stakeMissingRequirements =
        stakeReadyCandidate == null
          ? [
              "No opened starter business is currently using this Business NFT class.",
            ]
          : stakeReadyCandidate.missingChecks
              .filter((check) => check.type !== "staking_tier")
              .map(toRequirementMessage);

      const classGuidance: BusinessClassActionGuidance = {
        businessNftClassId: businessNftClass.id,
        tokenId: businessNftClass.tokenId,
        className: businessNftClass.name,
        mint: {
          locked: mintBlockingChecks.length > 0,
          label: mintBlockingChecks.length > 0 ? "Qualification Locked" : "Ready To Acquire",
          missingRequirements: mintBlockingChecks.map(toRequirementMessage),
          nextAction:
            mintBlockingChecks.length > 0
              ? getNextActionForCheck(mintReadyCandidate.definition, mintBlockingChecks[0])
              : `Acquire ${businessNftClass.name} in Assets, then continue setup in Operations.`,
        },
        stake: {
          locked: stakeReadyCandidate == null || stakeMissingRequirements.length > 0,
          label:
            stakeReadyCandidate == null || stakeMissingRequirements.length > 0
              ? "Activation Locked"
              : "Ready To Stake",
          missingRequirements: stakeMissingRequirements,
          nextAction:
            stakeReadyCandidate == null
              ? "Complete Ownership / Setup in Operations for a business that uses this class first."
              : stakeMissingRequirements.length > 0
              ? getNextActionForCheck(
                  stakeReadyCandidate.definition,
                  stakeReadyCandidate.missingChecks.find(
                    (check) => check.type !== "staking_tier"
                  )
                )
              : "Use staking to activate this opened business path without changing the reward lane.",
        },
      };

      return [businessNftClass.tokenId, classGuidance];
    })
  ) as Record<number, BusinessClassActionGuidance>;

  const approvalLocked = !openedBusinessSummaries.some(
    (summary) => summary.openedBusiness.openedViaBusinessNftClass
  );

  return {
    activeOperatorLabel: `NFT #${gameplayProfile.progression.profile.subjectId}`,
    certificationsImplemented: [
      ...qualificationSummaries.flatMap(
        (summary) => summary.definition.requiredCertificationMissionIds
      ),
      ...openedBusinessSummaries.flatMap(
        (summary) => summary.definition.requiredActivationCertificationMissionIds
      ),
    ]
      .filter((value, index, array) => array.indexOf(value) === index),
    approval: {
      locked: approvalLocked,
      label: approvalLocked ? "Activation Locked" : "Approval Available",
      missingRequirements: approvalLocked
        ? ["No opened starter business is ready to move from setup into staking activation yet."]
        : [],
      nextAction: approvalLocked
        ? "Complete Ownership / Setup in Operations before approving staking for gameplay activation."
        : "Approve staking when you are ready to activate an opened business path.",
    },
    byTokenId,
  };
}

export function getBusinessClassActionGuidanceByTokenId(
  guidance: BusinessSurfaceActionGuidance,
  tokenId: number
): BusinessClassActionGuidance | null {
  const businessClass = getBusinessNftClassDefinitionByTokenId(tokenId);

  if (!businessClass) {
    return null;
  }

  return guidance.byTokenId[tokenId] ?? null;
}
