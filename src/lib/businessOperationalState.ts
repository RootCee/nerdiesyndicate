import { PHASE1_DISTRICT_BUSINESS_RULES } from "../config/gameplay";
import { getHeatBandForScore } from "./progressionService";
import type {
  BusinessDefenseStatusSummary,
  BusinessEligibilityCheck,
  BusinessEligibilityResult,
  BusinessOperationalStateSummary,
  BusinessGameplayStakingSummary,
  BusinessOwnershipStatus,
  BusinessTrustPermissionSummary,
  BusinessTeamStatusSummary,
} from "../types/business";

interface BuildBusinessOperationalStateSummaryInput {
  ownershipStatus: BusinessOwnershipStatus;
  evaluation: BusinessEligibilityResult;
  staking: BusinessGameplayStakingSummary;
  team: BusinessTeamStatusSummary;
  defense: BusinessDefenseStatusSummary;
  trust: BusinessTrustPermissionSummary;
  heatScore: number;
}

function hasBlockingGap(
  missingChecks: BusinessEligibilityCheck[],
  checkType: BusinessEligibilityCheck["type"]
): boolean {
  return missingChecks.some((check) => check.type === checkType && check.blocking);
}

function hasNonStakingBlockingGap(
  missingChecks: BusinessEligibilityCheck[]
): boolean {
  return missingChecks.some((check) => check.blocking && check.type !== "staking_tier");
}

function getStateLabel(state: BusinessOperationalStateSummary["state"]): string {
  switch (state) {
    case "inactive":
      return "Inactive";
    case "open":
      return "Open";
    case "staked":
      return "Staked";
    case "active":
      return "Active";
    case "at_risk":
      return "At-Risk";
    default:
      return "Unknown";
  }
}

export function buildBusinessOperationalStateSummary({
  ownershipStatus,
  evaluation,
  staking,
  team,
  defense,
  trust,
  heatScore,
}: BuildBusinessOperationalStateSummaryInput): BusinessOperationalStateSummary {
  const districtRule = PHASE1_DISTRICT_BUSINESS_RULES[evaluation.targetDistrict];
  const heatBand = getHeatBandForScore(heatScore);
  const futureHooks = [
    "Future role-based staffing should replace the current local/mock slot-count bridge.",
    "Future defense systems should consume at-risk state before forcing downtime or contest pressure.",
    defense.recommendedCoverageMet
      ? "Current local defense placeholder coverage meets the first-pass district recommendation."
      : "Defense placeholders are visible now, but future protection systems still need to hook into this business before coverage affects outcomes.",
    trust.unlockedPermissions.length > 0
      ? "Higher-trust permissions are now surfaced separately so future advanced operator and defense systems can hook into them without changing staking or reward logic."
      : "Higher-trust permissions remain gated by certification and district reputation, and future systems should read those gates from the trust layer.",
  ];

  if (
    ownershipStatus === "ownership_missing" ||
    hasBlockingGap(evaluation.missingRequirements, "business_nft") ||
    hasNonStakingBlockingGap(evaluation.missingRequirements)
  ) {
    return {
      state: "inactive",
      label: getStateLabel("inactive"),
      reason:
        ownershipStatus === "ownership_missing"
          ? "This business instance no longer has a compatible Business NFT ownership bridge."
          : "This business is blocked by progression, district, reputation, rank, or heat requirements.",
      districtRiskProfile: districtRule.riskProfile,
      heatBand,
      futureHooks,
    };
  }

  if (!staking.tierSatisfied) {
    return {
      state: "open",
      label: getStateLabel("open"),
      reason: "The business has been opened locally, but staking-backed activation is not satisfied yet.",
      districtRiskProfile: districtRule.riskProfile,
      heatBand,
      futureHooks,
    };
  }

  if (!evaluation.eligible || !team.readyForActivation) {
    return {
      state: "staked",
      label: getStateLabel("staked"),
      reason: !team.readyForActivation
        ? "Staking is present, but required owner/operator slots are not filled yet."
        : "Staking is present, but another requirement must recover before the business can become active.",
      districtRiskProfile: districtRule.riskProfile,
      heatBand,
      futureHooks,
    };
  }

  const severeHeat = ["critical", "manhunt"].includes(heatBand);
  const riskyDistrictHeat =
    districtRule.riskProfile === "high"
      ? ["hot", "critical", "manhunt"].includes(heatBand)
      : districtRule.riskProfile === "strategic"
      ? ["critical", "manhunt"].includes(heatBand)
      : false;
  const entersAtRiskState = severeHeat || riskyDistrictHeat;

  if (entersAtRiskState) {
    return {
      state: "at_risk",
      label: getStateLabel("at_risk"),
      reason:
        districtRule.riskProfile === "high"
          ? "The business is active, but its district risk and current heat put it into an at-risk operating state."
          : "The business is active, but current heat is high enough to mark it as at-risk.",
      districtRiskProfile: districtRule.riskProfile,
      heatBand,
      futureHooks,
    };
  }

  return {
    state: "active",
    label: getStateLabel("active"),
    reason: "Current ownership, staking, and business eligibility rules all support active operation.",
    districtRiskProfile: districtRule.riskProfile,
    heatBand,
    futureHooks,
  };
}
