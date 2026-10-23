export const EQUIPMENT_SCHEMA_VERSION = 1;

export const MULTIPLAYER_WEAPONS = Object.freeze([
  Object.freeze({ id: 'ak', label: 'AK-47' }),
  Object.freeze({ id: 'mac10', label: 'MAC-10' }),
  Object.freeze({ id: 'mp5', label: 'MP5' }),
  Object.freeze({ id: 'm700', label: 'M700' }),
  Object.freeze({ id: 'rpg', label: 'RPG-7' }),
]);

const WEAPON_IDS = new Set(MULTIPLAYER_WEAPONS.map(({ id }) => id));
const FORBIDDEN_CLIENT_FIELDS = ['playerId', 'team', 'teamId', 'teamColor', 'teamEmblem', 'space', 'spaceId', 'spaceInstanceId', 'context'];

export const DEFAULT_EQUIPMENT = Object.freeze({
  schemaVersion: EQUIPMENT_SCHEMA_VERSION,
  weaponId: 'ak',
  holstered: false,
});

export const DEFAULT_PLAYER_CONTEXT = Object.freeze({
  schemaVersion: 1,
  team: Object.freeze({ id: null, color: null, emblem: null }),
  space: Object.freeze({ id: 'city', instanceId: null }),
});

export const isMultiplayerWeapon = (value) => WEAPON_IDS.has(value);

export function normalizeEquipment(input) {
  const weaponId = input?.weaponId === null ? null : isMultiplayerWeapon(input?.weaponId) ? input.weaponId : DEFAULT_EQUIPMENT.weaponId;
  return {
    schemaVersion: EQUIPMENT_SCHEMA_VERSION,
    weaponId,
    holstered: weaponId === null ? true : input?.holstered === true,
  };
}

export function normalizePlayerContext() {
  return {
    schemaVersion: DEFAULT_PLAYER_CONTEXT.schemaVersion,
    team: { ...DEFAULT_PLAYER_CONTEXT.team },
    space: { ...DEFAULT_PLAYER_CONTEXT.space },
  };
}

export function validateEquipmentIntent(message, protocolVersion) {
  if (!message || message.v !== protocolVersion || message.type !== 'equipment') return { ok: false, reason: 'invalid_equipment' };
  if (!Number.isSafeInteger(message.seq) || message.seq < 0) return { ok: false, reason: 'invalid_equipment' };
  if (FORBIDDEN_CLIENT_FIELDS.some((field) => Object.hasOwn(message, field))) return { ok: false, reason: 'unauthorized_equipment_field' };
  if (message.weaponId !== null && !isMultiplayerWeapon(message.weaponId)) return { ok: false, reason: 'invalid_weapon' };
  if (typeof message.holstered !== 'boolean') return { ok: false, reason: 'invalid_equipment' };
  if (message.weaponId === null && !message.holstered) return { ok: false, reason: 'invalid_equipment' };
  return { ok: true };
}

export function sameEquipment(a, b) {
  const left = normalizeEquipment(a), right = normalizeEquipment(b);
  return left.weaponId === right.weaponId && left.holstered === right.holstered;
}
