// M6.7A NPC identity schema. NPCs are server-managed city residents with their
// own ids ('n_' prefix), their own CC0 model library (assets/npc, see
// LICENSES.md), and no player fields: no name label, ticket, avatar preset,
// team, or NFT data. Pure data shared by the server simulation and clients.
import { isAvatarPreset } from './avatar-schema.js';

export const NPC_SCHEMA_VERSION = 1;
export const NPC_ID_PATTERN = /^n_[0-9a-z]{1,4}$/;
export const npcIdFor = (index) => `n_${index.toString(36)}`;
export const isNpcId = (id) => typeof id === 'string' && NPC_ID_PATTERN.test(id);

// Roles are stored now so M6.7B/C behaviours (self-defense, shops, security)
// can build on stable identities; in M6.7A every role walks as a pedestrian.
export const NPC_ROLES = Object.freeze(['civilian', 'defensive', 'worker', 'guard']);
export const NPC_ROLE_LABELS = Object.freeze({ civilian: 'Civilian', defensive: 'Civilian', worker: 'Worker', guard: 'Security' });
export const NPC_TRAIT_KEYS = Object.freeze(['bravery', 'aggression', 'sociability', 'curiosity', 'pace']);

// Outfit parts in the built library (tools/npc/build_npc_library.py), named
// <part>__<outfit>; an accessory value names its outfit (accessory__<outfit>).
// Legs and feet always come from the same outfit (mixing them can leave a gap).
export const NPC_LIBRARY = Object.freeze({
  women: Object.freeze({ file: 'assets/npc/npc_women.glb', clips: 'assets/npc/npc_clips_women.glb', outfits: Object.freeze(['casual', 'formal', 'suit', 'worker', 'punk', 'adventurer']), accessories: Object.freeze({}) }),
  men: Object.freeze({ file: 'assets/npc/npc_men.glb', clips: 'assets/npc/npc_clips_men.glb', outfits: Object.freeze(['casual_2', 'beach', 'farmer', 'punk', 'suit', 'worker', 'adventurer']), accessories: Object.freeze({ adventurer: 'adventurer' }) }),
});

// sRGB palettes for recolouring (skin tones, hair, clothing).
export const NPC_PALETTES = Object.freeze({
  skin: Object.freeze([0xfbd3b4, 0xedc19c, 0xd9a47d, 0xb27e58, 0x8a5c3d, 0x5e3d29]),
  hair: Object.freeze([0x1b1714, 0x4a3018, 0x8c6a3a, 0xd6bf8c, 0x9a9a9a, 0x7a2a1f]),
  cloth: Object.freeze([0x2b2d33, 0xd4d4cf, 0x40598f, 0x8f2a2a, 0x3b6b48, 0xa08055, 0x7a7a80, 0xc49530, 0x5f4378, 0x5a95a8]),
  shoes: Object.freeze([0x1e1e22, 0x4a3524, 0xc9c9c4]),
});

// Which recolour slot a material region uses. Skin and hair always recolour;
// the dominant non-skin material of a body, legs, or feet part becomes the
// top, bottom, or shoes colour; everything else (eyes, trims, logos) keeps its
// authored colour. Slot numbers index the palette uniform in npc-library.js.
export const NPC_SLOTS = Object.freeze({ fixed: 0, skin: 1, hair: 2, top: 3, bottom: 4, shoes: 5 });
export function npcSlotFor(part, materialName, dominant) {
  const base = String(materialName).replace(/\.\d+$/, '');
  if (base === 'Skin') return NPC_SLOTS.skin;
  if (part === 'head') return /^Hair/.test(base) ? NPC_SLOTS.hair : NPC_SLOTS.fixed;
  if (!dominant) return NPC_SLOTS.fixed;
  return part === 'body' ? NPC_SLOTS.top : part === 'legs' ? NPC_SLOTS.bottom : part === 'feet' ? NPC_SLOTS.shoes : NPC_SLOTS.fixed;
}

const inRange = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi;
const index = (v, list) => Number.isInteger(v) && v >= 0 && v < list.length;

export function npcAppearanceValid(a) {
  const pack = NPC_LIBRARY[a?.pack];
  if (!pack) return false;
  const outfit = (o) => pack.outfits.includes(o) && !isAvatarPreset(o);
  return outfit(a.head) && outfit(a.body) && outfit(a.legs) && (a.accessory === null || Object.values(pack.accessories).includes(a.accessory))
    && index(a.skin, NPC_PALETTES.skin) && index(a.hair, NPC_PALETTES.hair) && index(a.top, NPC_PALETTES.cloth) && index(a.bottom, NPC_PALETTES.cloth)
    && index(a.shoes, NPC_PALETTES.shoes) && inRange(a.height, 0.9, 1.1) && inRange(a.build, 0.88, 1.14);
}

// Fields an NPC identity may carry. Anything player-like is rejected.
export const NPC_IDENTITY_KEYS = Object.freeze(['id', 'schemaVersion', 'role', 'label', 'appearance', 'traits', 'routine']);
export function npcIdentityValid(identity) {
  if (!identity || typeof identity !== 'object') return false;
  if (Object.keys(identity).some((key) => !NPC_IDENTITY_KEYS.includes(key))) return false;
  return isNpcId(identity.id) && identity.schemaVersion === NPC_SCHEMA_VERSION && NPC_ROLES.includes(identity.role)
    && identity.label === NPC_ROLE_LABELS[identity.role] && npcAppearanceValid(identity.appearance)
    && NPC_TRAIT_KEYS.every((key) => inRange(identity.traits?.[key], 0, key === 'pace' ? 1.2 : 1));
}
