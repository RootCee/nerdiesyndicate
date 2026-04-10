import type {
  BusinessEligibilityDefinition,
  BusinessOwnershipStatus,
  BusinessTeamStatusSummary,
  LocalBusinessTeamAssignmentState,
} from "../types/business";

interface BuildBusinessTeamStatusSummaryInput {
  definition: BusinessEligibilityDefinition;
  assignment?: LocalBusinessTeamAssignmentState | null;
  ownershipStatus: BusinessOwnershipStatus;
}

function clampFilled(value: number | undefined, max: number): number {
  return Math.max(0, Math.min(max, value ?? 0));
}

export function buildBusinessTeamStatusSummary({
  definition,
  assignment,
  ownershipStatus,
}: BuildBusinessTeamStatusSummaryInput): BusinessTeamStatusSummary {
  const ownerFilled = (assignment?.ownerAssigned ?? true) && ownershipStatus !== "ownership_missing";
  const operatorSlotsFilled = clampFilled(
    assignment?.operatorSlotsFilled,
    definition.teamSlots.operators.totalSlots
  );
  const supportSlotsFilled = clampFilled(
    assignment?.supportSlotsFilled,
    definition.teamSlots.support.totalSlots
  );
  const totalSlots =
    definition.teamSlots.owner.totalSlots +
    definition.teamSlots.operators.totalSlots +
    definition.teamSlots.support.totalSlots;
  const requiredSlots =
    definition.teamSlots.owner.requiredSlots +
    definition.teamSlots.operators.requiredSlots +
    definition.teamSlots.support.requiredSlots;
  const requiredFilledSlots =
    (ownerFilled ? definition.teamSlots.owner.requiredSlots : 0) +
    Math.min(operatorSlotsFilled, definition.teamSlots.operators.requiredSlots) +
    Math.min(supportSlotsFilled, definition.teamSlots.support.requiredSlots);
  const filledSlots = (ownerFilled ? 1 : 0) + operatorSlotsFilled + supportSlotsFilled;
  const missingRequiredSlots = Math.max(0, requiredSlots - requiredFilledSlots);
  const readyForActivation = missingRequiredSlots === 0;
  const readinessLabel = readyForActivation ? "Team Ready" : "Team Incomplete";
  const readinessImpact = readyForActivation
    ? "Required owner and operator coverage is in place for current activation rules."
    : `This business still needs ${missingRequiredSlots} required team slot${missingRequiredSlots === 1 ? "" : "s"} before it can move from staking-ready into full active operation.`;

  return {
    definition: definition.teamSlots,
    totalSlots,
    requiredSlots,
    filledSlots,
    requiredFilledSlots,
    ownerFilled,
    operatorSlotsFilled,
    supportSlotsFilled,
    missingRequiredSlots,
    readyForActivation,
    readinessLabel,
    readinessImpact,
    futureAssignmentNotes: [
      "Current staffing uses local/mock slot counts only and does not assign specific NFTs or wallets to roles yet.",
      "Preferred roles are planning guidance today so future staffing systems can map role-qualified NFTs into these slots cleanly.",
    ],
  };
}
