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
  activationCertification: {
    requiredMissionIds: string[];
    completedMissionIds: string[];
    missingMissionIds: string[];
    requiredLabels: string[];
    missingLabels: string[];
    proofLabels: string[];
    satisfied: boolean;
  };
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

function buildCertificationLabelLookup() {
  return new Map(
    getMockCertificationMissions().map((mission) => [
      mission.id,
      {
        title: mission.title,
        proofLabel: mission.proof?.label ?? null,
      },
    ])
  );
}

function formatMissionIdLabel(value: string): string {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
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
  definition: BusinessEligibilityDefinition,
  activationCertification: OpenedBusinessOperationSummary["activationCertification"]
): string[] {
  const activationNotes =
    definition.requiredActivationCertificationMissionIds.length > 0
      ? [
          activationCertification.satisfied
            ? `Activation certification satisfied: ${activationCertification.requiredLabels.join(", ")}.`
            : `Activation currently requires: ${activationCertification.requiredLabels.join(", ")}.`,
          activationCertification.proofLabels.length > 0
            ? `Future proof path: ${activationCertification.proofLabels.join(", ")}.`
            : "Future proof path for activation certification has not been named yet.",
        ]
      : [];

  switch (definition.id) {
    case "market_shop":
    case "streetwear_boutique":
    case "supply_store":
      return [
        ...activationNotes,
        "No certification is required for the current starter-tier business opening flow.",
        "Future commerce, branding, or supply-chain certification may be recommended for higher-trust retail variants.",
      ];
    case "club":
    case "music_lounge":
    case "event_hall":
    case "streaming_studio":
      return [
        ...activationNotes,
        "No certification is required for the current starter entertainment opening flow.",
        "Future venue, creator, or event-operations certification is expected for higher-trust entertainment variants later.",
      ];
    case "garage":
    case "repair_shop":
    case "mod_shop":
    case "workshop":
      return [
        ...activationNotes,
        "No certification is required for the current starter manufacturing opening flow.",
        "Future systems, automation, mechanical, or logistics testing is expected for higher-trust manufacturing variants.",
      ];
    case "bot_lab":
    case "signal_center":
    case "security_office":
    case "data_hub":
      return [
        ...activationNotes,
        "Current certification rules vary by technical variant, but systems and operator trust remain central to this business family.",
        "Where Beginner DeFi Certification is already required, it should be treated as a starter proof and not the final trust gate.",
      ];
    case "bank_branch":
    case "exchange_desk":
    case "treasury_office":
    case "lending_hall":
      return [
        ...activationNotes,
        "Beginner DeFi Certification is the current finance-aligned proof path for these variants.",
        "Future treasury, lending, exchange, or compliance certification is expected for higher-trust financial operations later.",
      ];
    case "black_market_stall":
      return [
        ...activationNotes,
        "No certification is strictly required for the current local opening flow.",
        "Future underground-trade, security, or trust testing is expected for advanced operations later.",
      ];
    default:
      return [
        ...activationNotes,
        "No certification guidance has been defined for this business yet.",
      ];
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

function buildActivationCertificationChecks(
  definition: BusinessEligibilityDefinition,
  completedMissionIds: string[],
  certificationLabelLookup: Map<string, { title: string; proofLabel: string | null }>
) {
  const requiredMissionIds = definition.requiredActivationCertificationMissionIds;
  const completedForRequirement = requiredMissionIds.filter((missionId) =>
    completedMissionIds.includes(missionId)
  );
  const missingMissionIds = requiredMissionIds.filter(
    (missionId) => !completedMissionIds.includes(missionId)
  );
  const requiredLabels = requiredMissionIds.map(
    (missionId) => certificationLabelLookup.get(missionId)?.title ?? formatMissionIdLabel(missionId)
  );
  const missingLabels = missingMissionIds.map(
    (missionId) => certificationLabelLookup.get(missionId)?.title ?? formatMissionIdLabel(missionId)
  );
  const proofLabels = requiredMissionIds
    .map((missionId) => certificationLabelLookup.get(missionId)?.proofLabel ?? null)
    .filter((value): value is string => Boolean(value));

  return {
    summary: {
      requiredMissionIds,
      completedMissionIds: completedForRequirement,
      missingMissionIds,
      requiredLabels,
      missingLabels,
      proofLabels,
      satisfied: missingMissionIds.length === 0,
    },
    checks: missingMissionIds.map((missionId) => {
      const label =
        certificationLabelLookup.get(missionId)?.title ?? formatMissionIdLabel(missionId);

      return {
        type: "certification" as const,
        passed: false,
        blocking: true,
        message: `Activation requires certification: ${label}.`,
        currentValue: completedForRequirement.join(", ") || null,
        requiredValue: requiredLabels.join(", ") || null,
      };
    }),
  };
}

export function buildOpenedBusinessOperationSummaries(
  gameplayProfile: NFTGameplayProfile,
  missionState: LocalMissionSubjectState
): OpenedBusinessOperationSummary[] {
  const districtAffinity = gameplayProfile.metadata.normalizedTraits.location;
  const role = gameplayProfile.metadata.normalizedTraits.roleInNerdieCity;
  const completedCertificationMissionIds = getMockCertificationMissions()
    .map((mission) => mission.id)
    .filter((missionId) => missionState.completedMissionIds.includes(missionId));
  const certificationLabelLookup = buildCertificationLabelLookup();
  const subject = buildBusinessEligibilitySubject({
    progression: gameplayProfile.progression,
    stakingTier: missionState.stakingTier,
    ownedBusinessNftCount: missionState.ownedBusinessNftCount,
    ownedBusinessNftClasses: missionState.ownedBusinessNftClasses,
    completedCertificationMissionIds,
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
    const activationCertification = buildActivationCertificationChecks(
      definition,
      completedCertificationMissionIds,
      certificationLabelLookup
    );
    const activationEvaluation: BusinessEligibilityResult = {
      ...evaluation,
      eligible: evaluation.eligible && activationCertification.summary.satisfied,
      checks: [...evaluation.checks, ...activationCertification.checks],
      missingRequirements: [
        ...evaluation.missingRequirements,
        ...activationCertification.checks,
      ],
      advisoryNotes: activationCertification.summary.satisfied
        ? evaluation.advisoryNotes
        : [
            ...evaluation.advisoryNotes,
            `Activation still requires ${activationCertification.summary.missingLabels.join(", ")}.`,
          ],
    };
    const businessNftClass = openedBusiness.openedViaBusinessNftClass
      ? getBusinessNftClassDefinition(openedBusiness.openedViaBusinessNftClass)
      : null;
    const ownershipStatus = getOwnershipStatus(openedBusiness, activationEvaluation);
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
      evaluation: activationEvaluation,
      staking,
      team,
      defense,
      trust,
      heatScore: subject.heatScore,
    });

    return {
      openedBusiness,
      definition,
      evaluation: activationEvaluation,
      businessNftClass,
      lotContext,
      ownershipStatus,
      activationStatus: getActivationStatus(activationEvaluation),
      activationCertification: activationCertification.summary,
      operatorStatus: evaluation.roleFit,
      staking,
      team,
      defense,
      trust,
      operationalState,
      certificationNotes: getCertificationNotes(
        definition,
        activationCertification.summary
      ),
      futureRequirementPlaceholders: getFutureRequirementPlaceholders(definition),
      requiredChecks: activationEvaluation.checks.filter((check) => check.passed),
      missingChecks: activationEvaluation.missingRequirements,
    };
  });
}
