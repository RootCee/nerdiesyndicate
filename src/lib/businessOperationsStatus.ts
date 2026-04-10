import {
  buildBusinessEligibilitySubject,
  evaluateBusinessEligibility,
  getPhase1BusinessEligibilityDefinitions,
} from "./businessEligibility";
import { buildBusinessGameplayStakingSummary } from "./businessGameplayStaking";
import { getBusinessLotRegistryEntry } from "./businessLotRegistry";
import { getMockCertificationMissions } from "./missions";
import { buildBusinessOperationalStateSummary } from "./businessOperationalState";
import { buildBusinessDefenseStatusSummary } from "./businessDefenseSlots";
import { buildBusinessTeamStatusSummary } from "./businessTeamSlots";
import { buildBusinessTrustPermissionSummary } from "./businessTrust";
import { getBusinessNftClassDefinition } from "./businessNftBridge";
import { getLocalStarterBusinessKey } from "./localStarterBusinesses";
import type { LocalMissionSubjectState } from "./missionHarness";
import type { NFTGameplayProfile } from "./nftGameplayProfile";
import type {
  BusinessEligibilityCheck,
  BusinessEligibilityDefinition,
  BusinessEligibilityResult,
  BusinessGameplayStakingSummary,
  BusinessNftClassDefinition,
  BusinessOwnershipStatus,
  BusinessOperationalStateSummary,
  BusinessRoleFit,
  BusinessDefenseStatusSummary,
  BusinessTrustPermissionSummary,
  BusinessTeamStatusSummary,
  LocalStarterBusinessRecord,
} from "../types/business";

export type BusinessActivationStatus =
  | "activation_ready"
  | "awaiting_staking"
  | "opened_but_gated";

export interface OpenedBusinessOperationSummary {
  openedBusiness: LocalStarterBusinessRecord;
  definition: BusinessEligibilityDefinition;
  evaluation: BusinessEligibilityResult;
  businessNftClass: BusinessNftClassDefinition | null;
  lotContext: string;
  ownershipStatus: BusinessOwnershipStatus;
  activationStatus: BusinessActivationStatus;
  operatorStatus: BusinessRoleFit;
  staking: BusinessGameplayStakingSummary;
  team: BusinessTeamStatusSummary;
  defense: BusinessDefenseStatusSummary;
  trust: BusinessTrustPermissionSummary;
  operationalState: BusinessOperationalStateSummary;
  certificationNotes: string[];
  futureRequirementPlaceholders: string[];
  requiredChecks: BusinessEligibilityCheck[];
  missingChecks: BusinessEligibilityCheck[];
}

function getBusinessDefinition(
  businessTypeId: BusinessEligibilityDefinition["id"]
): BusinessEligibilityDefinition {
  const definition = getPhase1BusinessEligibilityDefinitions().find(
    (entry) => entry.id === businessTypeId
  );

  if (!definition) {
    throw new Error(`Unknown business definition: ${businessTypeId}`);
  }

  return definition;
}

function getOwnershipStatus(
  openedBusiness: LocalStarterBusinessRecord,
  evaluation: BusinessEligibilityResult
): BusinessOwnershipStatus {
  if (
    openedBusiness.openedViaBusinessNftClass &&
    evaluation.compatibleOwnedBusinessNftClasses.includes(openedBusiness.openedViaBusinessNftClass)
  ) {
    return "owner_ready";
  }

  if (evaluation.compatibleOwnedBusinessNftClasses.length > 0) {
    return "compatible_class_owned";
  }

  return "ownership_missing";
}

function getCertificationNotes(
  businessTypeId: BusinessEligibilityDefinition["id"]
): string[] {
  switch (businessTypeId) {
    case "market_shop":
      return [
        "No certification is required for the current starter-tier business opening flow.",
        "Future commerce or branding certification may be recommended for higher-trust retail variants.",
      ];
    case "garage":
      return [
        "No certification is required for the current starter-tier garage opening flow.",
        "Future systems, automation, or mechanical/logistics testing is expected for higher-trust garage operations.",
      ];
    case "data_hub":
      return [
        "Beginner DeFi Certification is a recommended knowledge signal for this business family.",
        "Advanced finance, data, or systems testing is expected for higher-trust technical operations later.",
      ];
    case "black_market_stall":
      return [
        "No certification is strictly required for the current local opening flow.",
        "Future underground-trade, security, or trust testing is expected for advanced operations later.",
      ];
    default:
      return ["No certification guidance has been defined for this business yet."];
  }
}

function getFutureRequirementPlaceholders(
  definition: BusinessEligibilityDefinition
): string[] {
  const placeholders = [
    "The staking bridge is still local/mock and has not been replaced with live wallet-derived staking reads yet.",
    "The metaverse lot registry is now modeled locally, but lot occupancy and placement still live inside the local slice rather than a shared city service.",
    "Defense slots are still planned and are not active yet.",
  ];

  if (definition.requiredStakingTier !== "starter_business") {
    placeholders.push(
      `This business family will need stronger staking-aware activation handling for ${definition.requiredStakingTier}.`
    );
  }

  if (definition.recommendedRoles.length > 1) {
    placeholders.push("Future role-based staffing should map specific operator NFTs into the current slot requirements.");
  }

  return placeholders;
}

function getActivationStatus(
  evaluation: BusinessEligibilityResult
): BusinessActivationStatus {
  if (evaluation.eligible) {
    return "activation_ready";
  }

  if (
    evaluation.missingRequirements.length > 0 &&
    evaluation.missingRequirements.every((check) => check.type === "staking_tier")
  ) {
    return "awaiting_staking";
  }

  return "opened_but_gated";
}

export function buildOpenedBusinessOperationSummaries(
  gameplayProfile: NFTGameplayProfile,
  missionState: LocalMissionSubjectState
): OpenedBusinessOperationSummary[] {
  const districtAffinity = gameplayProfile.metadata.normalizedTraits.location;
  const role = gameplayProfile.metadata.normalizedTraits.roleInNerdieCity;
  const subject = buildBusinessEligibilitySubject({
    progression: gameplayProfile.progression,
    stakingTier: missionState.stakingTier,
    ownedBusinessNftCount: missionState.ownedBusinessNftCount,
    ownedBusinessNftClasses: missionState.ownedBusinessNftClasses,
    completedCertificationMissionIds: getMockCertificationMissions()
      .map((mission) => mission.id)
      .filter((missionId) => missionState.completedMissionIds.includes(missionId)),
    districtAffinity,
    role,
  });

  return missionState.openedStarterBusinesses.map((openedBusiness) => {
    const definition = getBusinessDefinition(openedBusiness.businessTypeId);
    const evaluation = evaluateBusinessEligibility({
      subject,
      businessTypeId: openedBusiness.businessTypeId,
      district: openedBusiness.district,
    });
    const businessNftClass = openedBusiness.openedViaBusinessNftClass
      ? getBusinessNftClassDefinition(openedBusiness.openedViaBusinessNftClass)
      : null;
    const ownershipStatus = getOwnershipStatus(openedBusiness, evaluation);
    const lotEntry = openedBusiness.lotId
      ? getBusinessLotRegistryEntry(missionState, openedBusiness.lotId)
      : null;
    const lotContext = lotEntry
      ? `District selected: ${openedBusiness.district}. Registry lot: ${lotEntry.label} (${lotEntry.territorySubtype}, ${lotEntry.lotSize}). Occupancy: ${lotEntry.occupancyStatus}.`
      : openedBusiness.lotLabel
      ? `District selected: ${openedBusiness.district}. Lot placeholder: ${openedBusiness.lotLabel}.`
      : `District selected: ${openedBusiness.district}. Physical lot assignment has not been chosen yet.`;
    const linkedBusinessNftClasses = openedBusiness.openedViaBusinessNftClass
      ? [openedBusiness.openedViaBusinessNftClass]
      : evaluation.compatibleOwnedBusinessNftClasses;
    const staking = buildBusinessGameplayStakingSummary({
      source: missionState.stakingState.source,
      entitlementTier: missionState.stakingState.entitlementTier,
      requiredTier: definition.requiredStakingTier,
      linkedBusinessNftClasses,
    });
    const team = buildBusinessTeamStatusSummary({
      definition,
      assignment:
        missionState.businessTeamAssignments[
          getLocalStarterBusinessKey(openedBusiness)
        ],
      ownershipStatus,
    });
    const defense = buildBusinessDefenseStatusSummary({
      definition,
      assignment:
        missionState.businessDefenseAssignments[
          getLocalStarterBusinessKey(openedBusiness)
        ],
      district: openedBusiness.district,
    });
    const trust = buildBusinessTrustPermissionSummary(
      definition,
      subject,
      missionState,
      openedBusiness.district
    );
    const operationalState = buildBusinessOperationalStateSummary({
      ownershipStatus,
      evaluation,
      staking,
      team,
      defense,
      trust,
      heatScore: subject.heatScore,
    });

    return {
      openedBusiness,
      definition,
      evaluation,
      businessNftClass,
      lotContext,
      ownershipStatus,
      activationStatus: getActivationStatus(evaluation),
      operatorStatus: evaluation.roleFit,
      staking,
      team,
      defense,
      trust,
      operationalState,
      certificationNotes: getCertificationNotes(openedBusiness.businessTypeId),
      futureRequirementPlaceholders: getFutureRequirementPlaceholders(definition),
      requiredChecks: evaluation.checks.filter((check) => check.passed),
      missingChecks: evaluation.missingRequirements,
    };
  });
}
