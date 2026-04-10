import type { NFTAttribute } from "../hooks/useNFTs";
import {
  getGameplayRarity,
  getMaxBotSlotsForRarity as getConfiguredMaxBotSlotsForRarity,
  getNextBotSlotUnlockLevel,
  getUnlockedBotSlotsForLevel,
} from "../config/gameplay";

export interface BotSlotStatus {
  rarity: string;
  level: number;
  maxSlots: number;
  unlockedSlots: number;
  lockedSlots: number;
  nextUnlockLevel: number | null;
}

function getTraitValue(attributes: NFTAttribute[], traitNames: string[]): string | number | undefined {
  return attributes.find((attribute) =>
    traitNames.some((traitName) => attribute.trait_type.toLowerCase() === traitName.toLowerCase())
  )?.value;
}

export function getMaxBotSlotsForRarity(rarityValue: string | number | undefined): number {
  return getConfiguredMaxBotSlotsForRarity(rarityValue);
}

export function getLevelFromAttributes(attributes: NFTAttribute[]): number {
  const levelValue = getTraitValue(attributes, ["Level", "NFT Level", "Bot Level"]);
  const parsedLevel =
    typeof levelValue === "number" ? levelValue : Number.parseInt(String(levelValue ?? ""), 10);

  if (Number.isNaN(parsedLevel)) {
    return 1;
  }

  return Math.max(1, parsedLevel);
}

export function getBotSlotStatusFromAttributes(attributes: NFTAttribute[]): BotSlotStatus {
  const rarityValue = getTraitValue(attributes, ["Rarity"]);
  const rarity = getGameplayRarity(rarityValue);
  const level = getLevelFromAttributes(attributes);
  const maxSlots = getConfiguredMaxBotSlotsForRarity(rarity);
  const unlockedSlots = Math.min(maxSlots, getUnlockedBotSlotsForLevel(level));
  const nextUnlockLevel = unlockedSlots < maxSlots ? getNextBotSlotUnlockLevel(level) : null;

  return {
    rarity,
    level,
    maxSlots,
    unlockedSlots,
    lockedSlots: Math.max(0, maxSlots - unlockedSlots),
    nextUnlockLevel,
  };
}
