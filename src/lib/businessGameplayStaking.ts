import { BUSINESS_STAKING_TIER_ORDER } from "../config/gameplay";
import { getPhase1BusinessStakingTierDefinition } from "./businessEligibility";
import { getBusinessNftClassDefinition } from "./businessNftBridge";
import type {
  BusinessGameplayStakingSource,
  BusinessGameplayStakingSummary,
  BusinessNftClassId,
  BusinessStakingTier,
} from "../types/business";

interface BuildBusinessGameplayStakingSummaryInput {
  source: BusinessGameplayStakingSource;
  entitlementTier: BusinessStakingTier;
  requiredTier: BusinessStakingTier;
  linkedBusinessNftClasses: BusinessNftClassId[];
}

function formatSourceLabel(source: BusinessGameplayStakingSource): string {
  return source === "wallet_contract" ? "Wallet / Contract Read" : "Local Mock Bridge";
}

export function buildBusinessGameplayStakingSummary({
  source,
  entitlementTier,
  requiredTier,
  linkedBusinessNftClasses,
}: BuildBusinessGameplayStakingSummaryInput): BusinessGameplayStakingSummary {
  const entitlement = getPhase1BusinessStakingTierDefinition(entitlementTier);
  const required = getPhase1BusinessStakingTierDefinition(requiredTier);
  const tierSatisfied =
    BUSINESS_STAKING_TIER_ORDER.indexOf(entitlementTier) >=
    BUSINESS_STAKING_TIER_ORDER.indexOf(requiredTier);
  const linkedBusinessTokenIds = linkedBusinessNftClasses.map(
    (businessNftClassId) => getBusinessNftClassDefinition(businessNftClassId).tokenId
  );
  const notes = [
    source === "local_mock"
      ? "Current gameplay activation uses a local/mock staking entitlement bridge and does not read the live staking contract yet."
      : "Current gameplay activation is using wallet and contract-derived staking data.",
    tierSatisfied
      ? `Current staking entitlement satisfies the ${required.label} requirement for this business.`
      : `This business remains gated until staking satisfies the ${required.label} requirement.`,
  ];

  if (linkedBusinessNftClasses.length > 0) {
    notes.push(
      `The current staking view is scoped to compatible Business NFT classes: ${linkedBusinessNftClasses
        .map((businessNftClassId) => getBusinessNftClassDefinition(businessNftClassId).name)
        .join(", ")}.`
    );
  } else {
    notes.push("No compatible Business NFT class is currently linked to this business for staking-aware activation.");
  }

  return {
    source,
    sourceLabel: formatSourceLabel(source),
    entitlementTier,
    entitlementLabel: entitlement.label,
    requiredTier,
    requiredTierLabel: required.label,
    tierSatisfied,
    linkedBusinessNftClasses,
    linkedBusinessTokenIds,
    statusLabel: tierSatisfied ? "Staking Ready" : "Awaiting Staking",
    notes,
  };
}
