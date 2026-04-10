import { PHASE1_DISTRICT_BUSINESS_RULES } from "../config/gameplay";
import type {
  BusinessDefenseStatusSummary,
  BusinessEligibilityDefinition,
  LocalBusinessDefenseAssignmentState,
} from "../types/business";

interface BuildBusinessDefenseStatusSummaryInput {
  definition: BusinessEligibilityDefinition;
  assignment?: LocalBusinessDefenseAssignmentState | null;
  district: BusinessEligibilityDefinition["allowedDistricts"][number];
}

function clampFilled(value: number | undefined, max: number): number {
  return Math.max(0, Math.min(max, value ?? 0));
}

function getRecommendedMinimumCoverage(
  district: BuildBusinessDefenseStatusSummaryInput["district"]
): number {
  const riskProfile = PHASE1_DISTRICT_BUSINESS_RULES[district].riskProfile;

  switch (riskProfile) {
    case "high":
      return 3;
    case "strategic":
      return 2;
    default:
      return 1;
  }
}

export function buildBusinessDefenseStatusSummary({
  definition,
  assignment,
  district,
}: BuildBusinessDefenseStatusSummaryInput): BusinessDefenseStatusSummary {
  const guardBotSlotsFilled = clampFilled(
    assignment?.guardBotSlotsFilled,
    definition.defenseSlots.guardBots.totalSlots
  );
  const securityModuleSlotsFilled = clampFilled(
    assignment?.securityModuleSlotsFilled,
    definition.defenseSlots.securityModules.totalSlots
  );
  const protectionRoleSlotsFilled = clampFilled(
    assignment?.protectionRoleSlotsFilled,
    definition.defenseSlots.protectionRoles.totalSlots
  );
  const totalSlots =
    definition.defenseSlots.guardBots.totalSlots +
    definition.defenseSlots.securityModules.totalSlots +
    definition.defenseSlots.protectionRoles.totalSlots;
  const requiredSlots =
    definition.defenseSlots.guardBots.requiredSlots +
    definition.defenseSlots.securityModules.requiredSlots +
    definition.defenseSlots.protectionRoles.requiredSlots;
  const requiredFilledSlots =
    Math.min(guardBotSlotsFilled, definition.defenseSlots.guardBots.requiredSlots) +
    Math.min(
      securityModuleSlotsFilled,
      definition.defenseSlots.securityModules.requiredSlots
    ) +
    Math.min(
      protectionRoleSlotsFilled,
      definition.defenseSlots.protectionRoles.requiredSlots
    );
  const filledSlots =
    guardBotSlotsFilled + securityModuleSlotsFilled + protectionRoleSlotsFilled;
  const recommendedMinimumCoverage = Math.min(
    totalSlots,
    getRecommendedMinimumCoverage(district)
  );
  const recommendedCoverageMet = filledSlots >= recommendedMinimumCoverage;
  const readinessLabel = recommendedCoverageMet
    ? "Defense Scaffold Covered"
    : "Defense Scaffold Pending";
  const readinessImpact = recommendedCoverageMet
    ? "Current local defense placeholder coverage meets the district-risk recommendation for this business."
    : `Current defense placeholders are below the recommended ${recommendedMinimumCoverage}-slot coverage for this district. This does not block activation yet, but future protection systems should hook into it.`;

  return {
    definition: definition.defenseSlots,
    totalSlots,
    requiredSlots,
    filledSlots,
    requiredFilledSlots,
    guardBotSlotsFilled,
    securityModuleSlotsFilled,
    protectionRoleSlotsFilled,
    recommendedMinimumCoverage,
    recommendedCoverageMet,
    readinessLabel,
    readinessImpact,
    futureAssignmentNotes: [
      "Guard bot slots are placeholders for future bot-defense deployment rather than live bot assignment today.",
      "Security module slots are placeholders for future building security systems such as alarms, scans, or hardened access control.",
      "Protection role slots are placeholders for future team-based defense operators or allied protection roles.",
    ],
  };
}
