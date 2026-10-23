import { isMultiplayerWeapon } from './multiplayer-equipment.js';

export const COMBAT_SCHEMA_VERSION = 1;
export const MULTIPLAYER_WEAPON_RULES = Object.freeze({
  ak: Object.freeze({ magazine: 30, reserve: 180, rpm: 620, reloadMs: 2300 }),
  mac10: Object.freeze({ magazine: 32, reserve: 192, rpm: 1090, reloadMs: 1800 }),
  mp5: Object.freeze({ magazine: 30, reserve: 180, rpm: 800, reloadMs: 2100 }),
  m700: Object.freeze({ magazine: 5, reserve: 30, rpm: 52, reloadMs: 3000 }),
  rpg: Object.freeze({ magazine: 1, reserve: 3, rpm: 30, reloadMs: 3000 }),
});

const FORBIDDEN = ['playerId', 'targetId', 'damage', 'hit', 'health', 'team', 'admin'];
const finiteVector = (value) => value && ['x', 'y', 'z'].every((key) => Number.isFinite(value[key]));

export function createCombatState() {
  return {
    schemaVersion: COMBAT_SCHEMA_VERSION,
    ammo: Object.fromEntries(Object.entries(MULTIPLAYER_WEAPON_RULES).map(([id, rule]) => [id, { magazine: rule.magazine, reserve: rule.reserve }])),
    reloadUntil: 0,
    reloadWeaponId: null,
    lastShotAt: 0,
    lastCombatSeq: -1,
  };
}

export function normalizeCombatState(input) {
  const fallback = createCombatState(), ammo = {};
  for (const [id, rule] of Object.entries(MULTIPLAYER_WEAPON_RULES)) {
    const current = input?.ammo?.[id];
    ammo[id] = {
      magazine: Number.isSafeInteger(current?.magazine) ? Math.max(0, Math.min(rule.magazine, current.magazine)) : fallback.ammo[id].magazine,
      reserve: Number.isSafeInteger(current?.reserve) ? Math.max(0, Math.min(rule.reserve, current.reserve)) : fallback.ammo[id].reserve,
    };
  }
  return {
    schemaVersion: COMBAT_SCHEMA_VERSION,
    ammo,
    reloadUntil: Number.isFinite(input?.reloadUntil) ? Math.max(0, input.reloadUntil) : 0,
    reloadWeaponId: isMultiplayerWeapon(input?.reloadWeaponId) ? input.reloadWeaponId : null,
    lastShotAt: Number.isFinite(input?.lastShotAt) ? Math.max(0, input.lastShotAt) : 0,
    lastCombatSeq: Number.isSafeInteger(input?.lastCombatSeq) ? input.lastCombatSeq : -1,
  };
}

export function combatView(state, now = Date.now()) {
  const canonical = normalizeCombatState(state);
  return {
    schemaVersion: COMBAT_SCHEMA_VERSION,
    ammo: canonical.ammo,
    reloading: canonical.reloadUntil > now,
    reloadUntil: canonical.reloadUntil,
    reloadWeaponId: canonical.reloadWeaponId,
  };
}

export function validateFireIntent(message, protocolVersion) {
  if (!message || message.v !== protocolVersion || message.type !== 'fire') return { ok: false, reason: 'invalid_fire' };
  if (!Number.isSafeInteger(message.seq) || message.seq < 0 || !isMultiplayerWeapon(message.weaponId)) return { ok: false, reason: 'invalid_fire' };
  if (!finiteVector(message.direction) || FORBIDDEN.some((field) => Object.hasOwn(message, field))) return { ok: false, reason: 'unauthorized_fire_field' };
  const length = Math.hypot(message.direction.x, message.direction.y, message.direction.z);
  if (length < 0.8 || length > 1.2) return { ok: false, reason: 'invalid_direction' };
  return { ok: true };
}

export function validateReloadIntent(message, protocolVersion) {
  if (!message || message.v !== protocolVersion || message.type !== 'reload') return { ok: false, reason: 'invalid_reload' };
  if (!Number.isSafeInteger(message.seq) || message.seq < 0 || !isMultiplayerWeapon(message.weaponId)) return { ok: false, reason: 'invalid_reload' };
  if (FORBIDDEN.some((field) => Object.hasOwn(message, field))) return { ok: false, reason: 'unauthorized_reload_field' };
  return { ok: true };
}

export function applyFireIntent(player, message, now, protocolVersion) {
  const validation = validateFireIntent(message, protocolVersion); if (!validation.ok) return validation;
  if (!player.state) return { ok: false, reason: 'movement_state_required' };
  player.combat = normalizeCombatState(player.combat);
  if (message.seq <= player.combat.lastCombatSeq) return { ok: false, reason: 'stale_combat_sequence' };
  player.combat.lastCombatSeq = message.seq;
  if (player.equipment?.weaponId !== message.weaponId || player.equipment?.holstered) return { ok: false, reason: 'weapon_not_equipped' };
  if (player.combat.reloadUntil > now) return { ok: false, reason: 'reloading' };
  const rule = MULTIPLAYER_WEAPON_RULES[message.weaponId], ammo = player.combat.ammo[message.weaponId];
  const interval = 60_000 / rule.rpm;
  if (now + 2 < player.combat.lastShotAt + interval) return { ok: false, reason: 'fire_rate_limited' };
  if (ammo.magazine <= 0) return { ok: false, reason: 'empty_magazine' };
  ammo.magazine--; player.combat.lastShotAt = now;
  const length = Math.hypot(message.direction.x, message.direction.y, message.direction.z) || 1;
  const direction = { x: message.direction.x / length, y: message.direction.y / length, z: message.direction.z / length };
  const origin = { x: player.state?.x || 0, y: (player.state?.y || 0) + 1.35, z: player.state?.z || 0 };
  return { ok: true, shot: { playerId: player.id, weaponId: message.weaponId, origin, direction, serverTime: now }, combat: combatView(player.combat, now) };
}

export function applyReloadIntent(player, message, now, protocolVersion) {
  const validation = validateReloadIntent(message, protocolVersion); if (!validation.ok) return validation;
  player.combat = normalizeCombatState(player.combat);
  if (message.seq <= player.combat.lastCombatSeq) return { ok: false, reason: 'stale_combat_sequence' };
  player.combat.lastCombatSeq = message.seq;
  if (player.equipment?.weaponId !== message.weaponId || player.equipment?.holstered) return { ok: false, reason: 'weapon_not_equipped' };
  if (player.combat.reloadUntil > now) return { ok: false, reason: 'reloading' };
  const rule = MULTIPLAYER_WEAPON_RULES[message.weaponId], ammo = player.combat.ammo[message.weaponId];
  const need = rule.magazine - ammo.magazine, transfer = Math.min(need, ammo.reserve);
  if (transfer <= 0) return { ok: false, reason: ammo.reserve <= 0 ? 'no_reserve' : 'magazine_full' };
  ammo.magazine += transfer; ammo.reserve -= transfer;
  player.combat.reloadUntil = now + rule.reloadMs; player.combat.reloadWeaponId = message.weaponId;
  return { ok: true, combat: combatView(player.combat, now), reloadMs: rule.reloadMs };
}
