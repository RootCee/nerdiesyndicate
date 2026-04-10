import { getMockMissions } from "./missions";
import type {
  BusinessEligibilityDefinition,
  BusinessEligibilitySubject,
  BusinessPermissionId,
  BusinessTrustPermissionSummary,
  CertificationProofSource,
  CertificationRequirementStatusSummary,
  DistrictTrustBand,
} from "../types/business";
import type { LocalMissionSubjectState } from "./missionHarness";
import type { NerdieCityDistrict } from "../config/gameplay";

const DISTRICT_TRUST_BAND_ORDER: DistrictTrustBand[] = [
  "unproven",
  "known",
  "trusted",
  "elevated",
];

function getDistrictTrustBand(score: number): DistrictTrustBand {
  if (score >= 220) {
    return "elevated";
  }

  if (score >= 140) {
    return "trusted";
  }

  if (score >= 60) {
    return "known";
  }

  return "unproven";
}

function compareDistrictTrustBands(
  current: DistrictTrustBand,
  required: DistrictTrustBand
): boolean {
  return (
    DISTRICT_TRUST_BAND_ORDER.indexOf(current) >=
    DISTRICT_TRUST_BAND_ORDER.indexOf(required)
  );
}

function buildCertificationRequirementStatus(
  requiredMissionIds: BusinessEligibilityDefinition["requiredCertificationMissionIds"],
  completedMissionIds: string[]
): CertificationRequirementStatusSummary {
  const completed = requiredMissionIds.filter((missionId) =>
    completedMissionIds.includes(missionId)
  );
  const missingMissionIds = requiredMissionIds.filter(
    (missionId) => !completedMissionIds.includes(missionId)
  );
  const proofSources: CertificationProofSource[] =
    completed.length > 0 ? ["local_mission_completion"] : [];

  return {
    requiredMissionIds,
    completedMissionIds: completed,
    missingMissionIds,
    proofSources,
    satisfied: missingMissionIds.length === 0,
  };
}

function getCompletedDistrictMissionCount(
  missionState: LocalMissionSubjectState,
  district: NerdieCityDistrict
): number {
  return getMockMissions().filter(
    (mission) =>
      mission.district === district &&
      missionState.completedMissionIds.includes(mission.id)
  ).length;
}

function getDistrictReputationScore(
  subject: BusinessEligibilitySubject,
  missionState: LocalMissionSubjectState,
  district: NerdieCityDistrict
): number {
  const completedDistrictMissionCount = getCompletedDistrictMissionCount(
    missionState,
    district
  );
  const affinityBonus = subject.districtAffinity === district ? 25 : 0;
  const localMissionSignal = completedDistrictMissionCount * 75 + affinityBonus;

  return Math.min(subject.reputationScore, localMissionSignal);
}

function getAdvancedPermissionLabels(
  definition: BusinessEligibilityDefinition
): {
  higherTrustOperations: BusinessPermissionId;
  defensePermissions: BusinessPermissionId;
  advancedOperatorAccess: BusinessPermissionId;
} {
  switch (definition.id) {
    case "market_shop":
    case "streetwear_boutique":
    case "supply_store":
      return {
        higherTrustOperations: "trusted_public_commerce_ops",
        defensePermissions: "trusted_defense_coordination",
        advancedOperatorAccess: "advanced_operator_access",
      };
    case "bot_lab":
    case "signal_center":
    case "security_office":
    case "data_hub":
      return {
        higherTrustOperations: "trusted_technical_ops",
        defensePermissions: "hardened_defense_access",
        advancedOperatorAccess: "advanced_operator_access",
      };
    case "garage":
    case "repair_shop":
    case "mod_shop":
    case "workshop":
      return {
        higherTrustOperations: "trusted_manufacturing_ops",
        defensePermissions: "hardened_defense_access",
        advancedOperatorAccess: "advanced_operator_access",
      };
    case "club":
    case "music_lounge":
    case "event_hall":
    case "streaming_studio":
      return {
        higherTrustOperations: "trusted_entertainment_ops",
        defensePermissions: "trusted_defense_coordination",
        advancedOperatorAccess: "advanced_operator_access",
      };
    case "bank_branch":
    case "exchange_desk":
    case "treasury_office":
    case "lending_hall":
      return {
        higherTrustOperations: "trusted_financial_ops",
        defensePermissions: "hardened_defense_access",
        advancedOperatorAccess: "advanced_operator_access",
      };
    case "black_market_stall":
      return {
        higherTrustOperations: "trusted_underground_ops",
        defensePermissions: "trusted_defense_coordination",
        advancedOperatorAccess: "advanced_operator_access",
      };
    default:
      return {
        higherTrustOperations: "advanced_operator_access",
        defensePermissions: "trusted_defense_coordination",
        advancedOperatorAccess: "advanced_operator_access",
      };
  }
}

export function buildBusinessTrustPermissionSummary(
  definition: BusinessEligibilityDefinition,
  subject: BusinessEligibilitySubject,
  missionState: LocalMissionSubjectState,
  district: NerdieCityDistrict
): BusinessTrustPermissionSummary {
  const completedDistrictMissionCount = getCompletedDistrictMissionCount(
    missionState,
    district
  );
  const districtAffinityMatch = subject.districtAffinity === district;
  const districtReputationScore = getDistrictReputationScore(
    subject,
    missionState,
    district
  );
  const trustBand = getDistrictTrustBand(districtReputationScore);
  const higherTrustCerts = buildCertificationRequirementStatus(
    definition.trustPolicy.certificationMissionIdsForHigherTrustOps,
    missionState.completedMissionIds
  );
  const defenseCerts = buildCertificationRequirementStatus(
    definition.trustPolicy.certificationMissionIdsForDefensePermissions,
    missionState.completedMissionIds
  );
  const advancedOperatorCerts = buildCertificationRequirementStatus(
    definition.trustPolicy.certificationMissionIdsForAdvancedOperatorAccess,
    missionState.completedMissionIds
  );
  const permissionLabels = getAdvancedPermissionLabels(definition);

  const higherTrustOperationsUnlocked =
    compareDistrictTrustBands(
      trustBand,
      definition.trustPolicy.minimumDistrictTrustBandForHigherTrustOps
    ) && higherTrustCerts.satisfied;
  const defensePermissionsUnlocked =
    compareDistrictTrustBands(
      trustBand,
      definition.trustPolicy.minimumDistrictTrustBandForDefensePermissions
    ) && defenseCerts.satisfied;
  const advancedOperatorAccessUnlocked =
    compareDistrictTrustBands(
      trustBand,
      definition.trustPolicy.minimumDistrictTrustBandForAdvancedOperatorAccess
    ) && advancedOperatorCerts.satisfied;

  const blockedPermissionLabels: string[] = [];
  const unlockedPermissions: BusinessPermissionId[] = [];

  if (higherTrustOperationsUnlocked) {
    unlockedPermissions.push(permissionLabels.higherTrustOperations);
  } else {
    blockedPermissionLabels.push("Higher-Trust Operations");
  }

  if (defensePermissionsUnlocked) {
    unlockedPermissions.push(permissionLabels.defensePermissions);
  } else {
    blockedPermissionLabels.push("Defense Permissions");
  }

  if (advancedOperatorAccessUnlocked) {
    unlockedPermissions.push(permissionLabels.advancedOperatorAccess);
  } else {
    blockedPermissionLabels.push("Advanced Operator Access");
  }

  const nextAction = higherTrustOperationsUnlocked &&
    defensePermissionsUnlocked &&
    advancedOperatorAccessUnlocked
    ? "Current certifications and district reputation support the full higher-trust operating profile for this business."
    : higherTrustCerts.missingMissionIds.length > 0 ||
      defenseCerts.missingMissionIds.length > 0 ||
      advancedOperatorCerts.missingMissionIds.length > 0
    ? "Complete the required certification path in Qualification. This structure is future-ready for soulbound certification proofs later."
    : `Improve ${district.replace(/_/g, " ")} standing through more district missions before higher-trust permissions unlock.`;

  return {
    districtReputation: {
      district,
      districtAffinityMatch,
      completedDistrictMissionCount,
      districtReputationScore,
      trustBand,
    },
    higherTrustOperations: {
      ...higherTrustCerts,
      unlocked: higherTrustOperationsUnlocked,
    },
    defensePermissions: {
      ...defenseCerts,
      unlocked: defensePermissionsUnlocked,
    },
    advancedOperatorAccess: {
      ...advancedOperatorCerts,
      unlocked: advancedOperatorAccessUnlocked,
    },
    unlockedPermissions,
    blockedPermissionLabels,
    nextAction,
    futureProofingNotes: [
      "Current certification proof sources come from local mission completion only.",
      "The trust model is ready for future soulbound certification NFT proofs without changing the business-permission layer.",
      "District reputation currently derives from local district mission completions plus district affinity, not from a shared world reputation service yet.",
    ],
  };
}
