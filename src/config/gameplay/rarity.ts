import type { GameplayRarity, ToolSlotCap } from "./types";

export const GAMEPLAY_RARITY_ORDER: GameplayRarity[] = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "mythic",
];

export const RARITY_BOT_SLOT_CAPS: Record<GameplayRarity, number> = {
  common: 2,
  uncommon: 3,
  rare: 4,
  epic: 5,
  legendary: 6,
  mythic: 7,
};

export const RARITY_TOOL_SLOT_CAPS: Record<GameplayRarity, ToolSlotCap> = {
  common: { toolSlots: 1, utilitySlots: 1, passiveSlots: 0, payloadSlots: 0 },
  uncommon: { toolSlots: 2, utilitySlots: 1, passiveSlots: 0, payloadSlots: 0 },
  rare: { toolSlots: 2, utilitySlots: 1, passiveSlots: 1, payloadSlots: 0 },
  epic: { toolSlots: 2, utilitySlots: 2, passiveSlots: 1, payloadSlots: 1 },
  legendary: { toolSlots: 3, utilitySlots: 2, passiveSlots: 1, payloadSlots: 1 },
  mythic: { toolSlots: 3, utilitySlots: 2, passiveSlots: 2, payloadSlots: 1 },
};

function normalizeGameplayRarity(value: string | number | undefined): GameplayRarity | null {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return GAMEPLAY_RARITY_ORDER.find((rarity) => rarity === normalized) ?? null;
}

export function getGameplayRarity(value: string | number | undefined): GameplayRarity {
  return normalizeGameplayRarity(value) ?? "common";
}

export function getMaxBotSlotsForRarity(value: string | number | undefined): number {
  return RARITY_BOT_SLOT_CAPS[getGameplayRarity(value)];
}

export function getToolSlotCapForRarity(value: string | number | undefined): ToolSlotCap {
  return RARITY_TOOL_SLOT_CAPS[getGameplayRarity(value)];
}
