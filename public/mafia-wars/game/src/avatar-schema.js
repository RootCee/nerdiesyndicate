export const AVATAR_SCHEMA_VERSION = 1;

export const AVATAR_PRESETS = Object.freeze([
  Object.freeze({ id: 'blue_zip', label: 'Blue Zip', accent: '#3b70c9' }),
  Object.freeze({ id: 'navy', label: 'Navy', accent: '#1e315b' }),
  Object.freeze({ id: 'red_hoodie', label: 'Red Hoodie', accent: '#9f2d32' }),
  Object.freeze({ id: 'red_jersey', label: 'Red Jersey', accent: '#c84138' }),
]);

const PRESET_IDS = new Set(AVATAR_PRESETS.map(({ id }) => id));
export const DEFAULT_AVATAR_APPEARANCE = Object.freeze({
  schemaVersion: AVATAR_SCHEMA_VERSION,
  preset: 'navy',
  team: Object.freeze({ color: null, emblem: null }),
  nft: Object.freeze({ collection: null, tokenId: null }),
});

// Team and NFT fields are intentionally server-owned reservations. Guest clients
// may select only an audited character preset and cannot assert team membership
// or NFT ownership through appearance messages.
export function normalizeAvatarAppearance(input) {
  return {
    schemaVersion: AVATAR_SCHEMA_VERSION,
    preset: PRESET_IDS.has(input?.preset) ? input.preset : DEFAULT_AVATAR_APPEARANCE.preset,
    team: { color: null, emblem: null },
    nft: { collection: null, tokenId: null },
  };
}

export const isAvatarPreset = (value) => PRESET_IDS.has(value);
export const sameAvatarAppearance = (a, b) => normalizeAvatarAppearance(a).preset === normalizeAvatarAppearance(b).preset;
