import { getTotalXPForLevel } from "../config/gameplay";
import type { NFTAttribute } from "../hooks/useNFTs";
import {
  resolveNFTMetadataProfile,
  type NFTMetadataInput,
  type ResolvedNFTProfile,
} from "./nftTraitResolver";
import {
  resolveProgressionProfile,
  type ResolvedProgressionProfile,
} from "./progressionService";
import type { XPSource } from "../types/progression";

export interface NFTGameplayProfile {
  metadata: ResolvedNFTProfile;
  progression: ResolvedProgressionProfile;
}

export interface NFTGameplayProfileOverrides {
  totalXP?: number;
  rankPoints?: number;
  reputationScore?: number;
  heatScore?: number;
  lastSource?: XPSource;
}

function getAttributeValue(
  attributes: NFTAttribute[],
  traitNames: string[]
): string | number | undefined {
  return attributes.find((attribute) =>
    traitNames.some((traitName) => attribute.trait_type.toLowerCase() === traitName.toLowerCase())
  )?.value;
}

function getNumericAttributeValue(
  attributes: NFTAttribute[],
  traitNames: string[]
): number | undefined {
  const value = getAttributeValue(attributes, traitNames);
  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value ?? "").trim(), 10);

  return Number.isNaN(parsed) ? undefined : parsed;
}

function buildMetadataInput(attributes: NFTAttribute[]): NFTMetadataInput {
  return {
    traits: attributes.map((attribute) => ({
      trait_type: attribute.trait_type,
      value: attribute.value,
    })),
  };
}

function getTotalXPFromAttributes(attributes: NFTAttribute[]): number {
  const explicitXP = getNumericAttributeValue(attributes, [
    "XP",
    "Total XP",
    "Experience",
    "Experience Points",
  ]);

  if (explicitXP != null) {
    return Math.max(0, explicitXP);
  }

  const level = getNumericAttributeValue(attributes, ["Level", "NFT Level", "Bot Level"]);

  if (level != null) {
    return getTotalXPForLevel(Math.max(1, level));
  }

  return 0;
}

export function resolveNFTGameplayProfile(
  tokenId: number,
  attributes: NFTAttribute[],
  overrides: NFTGameplayProfileOverrides = {}
): NFTGameplayProfile {
  const metadataInput = buildMetadataInput(attributes);
  const metadata = resolveNFTMetadataProfile(metadataInput);
  const progression = resolveProgressionProfile({
    subjectType: "nft",
    subjectId: String(tokenId),
    totalXP: overrides.totalXP ?? getTotalXPFromAttributes(attributes),
    rarity: metadata.normalizedTraits.rarity,
    lastSource: overrides.lastSource,
    rankPoints:
      overrides.rankPoints ?? getNumericAttributeValue(attributes, ["Rank Points", "Rank Score"]),
    reputationScore:
      overrides.reputationScore ??
      getNumericAttributeValue(attributes, ["Reputation", "Reputation Score", "Rep"]),
    heatScore:
      overrides.heatScore ?? getNumericAttributeValue(attributes, ["Heat", "Heat Score", "Heat Level"]),
  });

  return {
    metadata,
    progression,
  };
}
