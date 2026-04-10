import { getMockCertificationMissions } from "./missions";
import {
  buildBusinessEligibilitySubject,
  evaluateAllBusinessEligibilityOptions,
  evaluateBusinessEligibility,
  getPhase1BusinessEligibilityDefinitions,
  resolveSuggestedBusinessDistrict,
} from "./businessEligibility";
import {
  buildBusinessDistrictCapacitySummaries,
  buildLocalBusinessLotOptions,
  getStarterBusinessPlacementVariants,
  getStarterBusinessPlacementVariant,
} from "./businessLotRegistry";
import { getBusinessNftClassDefinition } from "./businessNftBridge";
import type { LocalMissionSubjectState } from "./missionHarness";
import type { NFTGameplayProfile } from "./nftGameplayProfile";
import type {
  BusinessDistrictCapacitySummary,
  BusinessEligibilityCheck,
  BusinessEligibilityDefinition,
  BusinessEligibilityResult,
  BusinessNftClassDefinition,
  BusinessNftClassId,
  LocalBusinessLotOption,
} from "../types/business";
import type { NerdieCityDistrict } from "../config/gameplay";

export interface BusinessQualificationSummary {
  definition: BusinessEligibilityDefinition;
  suggestedDistrict: NerdieCityDistrict;
  qualified: boolean;
  satisfiedChecks: BusinessEligibilityCheck[];
  missingChecks: BusinessEligibilityCheck[];
}

export interface BusinessSetupSummary {
  definition: BusinessEligibilityDefinition;
  businessNftClass: BusinessNftClassDefinition;
  evaluation: BusinessEligibilityResult;
  setupEligible: boolean;
  lotOptions: LocalBusinessLotOption[];
  placementVariantLabel: string | null;
  districtCapacity: BusinessDistrictCapacitySummary | null;
  totalLotsAcrossCity: number;
  lotSizes: LocalBusinessLotOption["size"][];
  availableLotsInDistrict: number;
  totalLotsInDistrict: number;
  requiredOperatorSlots: number;
  totalOperatorSlots: number;
  optionalSupportSlots: number;
  requiredCertificationLabels: string[];
  trustRequirement: string;
  defenseRequirement: string;
}

export interface BusinessClassVariantFlowSummary {
  definition: BusinessEligibilityDefinition;
  placementVariantLabel: string | null;
  supportedDistricts: NerdieCityDistrict[];
  preferredDistricts: NerdieCityDistrict[];
  lotSizes: LocalBusinessLotOption["size"][];
  totalLotsAcrossCity: number;
  requiredOperatorSlots: number;
  optionalSupportSlots: number;
  requiredCertifications: string[];
  requiredStakingTier: BusinessEligibilityDefinition["requiredStakingTier"];
  trustRequirement: string;
  defenseRequirement: string;
}

export interface BusinessClassFlowSummary {
  businessNftClass: BusinessNftClassDefinition;
  variantSummaries: BusinessClassVariantFlowSummary[];
  totalPlacementLotsAcrossCity: number;
}

function buildSubject(
  gameplayProfile: NFTGameplayProfile,
  missionState: LocalMissionSubjectState
) {
  const completedCertificationMissionIds = getMockCertificationMissions()
    .map((mission) => mission.id)
    .filter((missionId) => missionState.completedMissionIds.includes(missionId));

  return buildBusinessEligibilitySubject({
    progression: gameplayProfile.progression,
    stakingTier: missionState.stakingTier,
    ownedBusinessNftCount: missionState.ownedBusinessNftCount,
    ownedBusinessNftClasses: missionState.ownedBusinessNftClasses,
    completedCertificationMissionIds,
    districtAffinity: gameplayProfile.metadata.normalizedTraits.location,
    role: gameplayProfile.metadata.normalizedTraits.roleInNerdieCity,
  });
}

function isQualificationCheck(check: BusinessEligibilityCheck): boolean {
  return [
    "milestone",
    "level",
    "rank",
    "reputation",
    "heat",
    "certification",
  ].includes(check.type);
}

function isSetupBlockingCheck(check: BusinessEligibilityCheck): boolean {
  return check.type !== "staking_tier";
}

export function buildBusinessQualificationSummaries(
  gameplayProfile: NFTGameplayProfile,
  missionState: LocalMissionSubjectState
): BusinessQualificationSummary[] {
  const subject = buildSubject(gameplayProfile, missionState);

  return evaluateAllBusinessEligibilityOptions(subject).map((evaluation) => {
    const qualificationChecks = evaluation.checks.filter(isQualificationCheck);
    const missingChecks = qualificationChecks.filter((check) => !check.passed);

    return {
      definition: evaluation.definition,
      suggestedDistrict: evaluation.targetDistrict,
      qualified: missingChecks.length === 0,
      satisfiedChecks: qualificationChecks.filter((check) => check.passed),
      missingChecks,
    };
  });
}

export function buildBusinessSetupSummaries(
  gameplayProfile: NFTGameplayProfile,
  missionState: LocalMissionSubjectState,
  selectedBusinessNftClassId: BusinessNftClassId | null,
  districtSelections: Record<string, NerdieCityDistrict>
): BusinessSetupSummary[] {
  if (!selectedBusinessNftClassId) {
    return [];
  }

  const subject = buildSubject(gameplayProfile, missionState);
  const businessNftClass = getBusinessNftClassDefinition(selectedBusinessNftClassId);
  const districtCapacities = buildBusinessDistrictCapacitySummaries(missionState);

  return getPhase1BusinessEligibilityDefinitions()
    .filter((definition) => businessNftClass.opensBusinessTypes.includes(definition.id))
    .map((definition) => {
      const district =
        districtSelections[definition.id] ??
        resolveSuggestedBusinessDistrict(definition, subject.districtAffinity);
      const evaluation = evaluateBusinessEligibility({
        subject,
        businessTypeId: definition.id,
        district,
      });
      const districtCapacity =
        districtCapacities.find((entry) => entry.district === district) ?? null;
      const placementVariant = getStarterBusinessPlacementVariant(
        definition.id,
        selectedBusinessNftClassId
      );
      const matchingVariants = getStarterBusinessPlacementVariants().filter(
        (variant) =>
          variant.businessTypeId === definition.id &&
          variant.businessNftClassId === selectedBusinessNftClassId
      );
      const totalLotsAcrossCity = matchingVariants.reduce(
        (sum, variant) => sum + variant.totalAllocation,
        0
      );
      const lotSizes = Array.from(new Set(matchingVariants.map((variant) => variant.lotSize)));
      const availableLotsInDistrict =
        districtCapacity?.byPlacementVariant.find(
          (entry) => entry.placementVariantId === placementVariant?.id
        )?.availableLots ?? 0;
      const totalLotsInDistrict =
        districtCapacity?.byPlacementVariant.find(
          (entry) => entry.placementVariantId === placementVariant?.id
        )?.totalLots ?? 0;

      return {
        definition,
        businessNftClass,
        evaluation,
        setupEligible: evaluation.missingRequirements.every(
          (check) => !isSetupBlockingCheck(check)
        ),
        lotOptions: buildLocalBusinessLotOptions(
          missionState,
          definition.id,
          selectedBusinessNftClassId,
          district
        ),
        placementVariantLabel: placementVariant?.label ?? null,
        districtCapacity,
        totalLotsAcrossCity,
        lotSizes,
        availableLotsInDistrict,
        totalLotsInDistrict,
        requiredOperatorSlots: definition.teamSlots.operators.requiredSlots,
        totalOperatorSlots: definition.teamSlots.operators.totalSlots,
        optionalSupportSlots: definition.teamSlots.support.totalSlots,
        requiredCertificationLabels: definition.requiredCertificationMissionIds.map((value) =>
          value
            .split("_")
            .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
            .join(" ")
        ),
        trustRequirement:
          definition.trustPolicy.minimumDistrictTrustBandForHigherTrustOps,
        defenseRequirement:
          definition.trustPolicy.minimumDistrictTrustBandForDefensePermissions,
      };
    });
}

export function buildBusinessClassFlowSummary(
  selectedBusinessNftClassId: BusinessNftClassId | null
): BusinessClassFlowSummary | null {
  if (!selectedBusinessNftClassId) {
    return null;
  }

  const businessNftClass = getBusinessNftClassDefinition(selectedBusinessNftClassId);
  const placementVariants = getStarterBusinessPlacementVariants().filter(
    (variant) => variant.businessNftClassId === selectedBusinessNftClassId
  );
  const variantSummaries = getPhase1BusinessEligibilityDefinitions()
    .filter((definition) => businessNftClass.opensBusinessTypes.includes(definition.id))
    .map((definition) => {
      const matchingVariants = placementVariants.filter(
        (variant) => variant.businessTypeId === definition.id
      );
      const lotSizes = Array.from(new Set(matchingVariants.map((variant) => variant.lotSize)));
      const totalLotsAcrossCity = matchingVariants.reduce(
        (sum, variant) => sum + variant.totalAllocation,
        0
      );

      return {
        definition,
        placementVariantLabel:
          matchingVariants.map((variant) => variant.label).join(", ") || null,
        supportedDistricts: Array.from(
          new Set(matchingVariants.flatMap((variant) => variant.allowedDistricts))
        ),
        preferredDistricts: Array.from(
          new Set(matchingVariants.flatMap((variant) => variant.preferredDistricts))
        ),
        lotSizes,
        totalLotsAcrossCity,
        requiredOperatorSlots: definition.teamSlots.operators.requiredSlots,
        optionalSupportSlots: definition.teamSlots.support.totalSlots,
        requiredCertifications: definition.requiredCertificationMissionIds,
        requiredStakingTier: definition.requiredStakingTier,
        trustRequirement:
          definition.trustPolicy.minimumDistrictTrustBandForHigherTrustOps,
        defenseRequirement:
          definition.trustPolicy.minimumDistrictTrustBandForDefensePermissions,
      } satisfies BusinessClassVariantFlowSummary;
    });

  return {
    businessNftClass,
    variantSummaries,
    totalPlacementLotsAcrossCity: variantSummaries.reduce(
      (sum, summary) => sum + summary.totalLotsAcrossCity,
      0
    ),
  };
}
