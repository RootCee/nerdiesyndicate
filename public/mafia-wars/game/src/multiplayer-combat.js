import { isMultiplayerWeapon } from './multiplayer-equipment.js';
import { MULTIPLAYER_SPAWNS } from './multiplayer-protocol.js';
import { isInsideSafeZone, isProtectedSpace, MULTIPLAYER_SAFE_ZONES } from './multiplayer-spaces.js';
import { cityStructureOccluded } from './city-structures.js';

export const COMBAT_SCHEMA_VERSION = 1;
export const MULTIPLAYER_WEAPON_RULES = Object.freeze({
  ak: Object.freeze({ magazine: 30, reserve: 180, rpm: 620, reloadMs: 2300, damage: 24, range: 90 }),
  mac10: Object.freeze({ magazine: 32, reserve: 192, rpm: 1090, reloadMs: 1800, damage: 17, range: 55 }),
  mp5: Object.freeze({ magazine: 30, reserve: 180, rpm: 800, reloadMs: 2100, damage: 20, range: 70 }),
  m700: Object.freeze({ magazine: 5, reserve: 30, rpm: 52, reloadMs: 3000, damage: 80, range: 130 }),
  rpg: Object.freeze({ magazine: 1, reserve: 3, rpm: 30, reloadMs: 3000, damage: 125, range: 120, splash: 6.5 }),
});

export const MULTIPLAYER_COMBAT_RULES = Object.freeze({ maxHealth: 100, respawnMs: 4000, spawnProtectionMs: 3000 });
// Server shot origin above the player's feet; clients aim from here (src/aim.js).
export const MULTIPLAYER_SHOT_EYE_HEIGHT = 1.35;
export const UNDERGROUND_SPAWNS = Object.freeze({
  blue: Object.freeze([{ x: -2.8, y: 0, z: 36 }, { x: 0, y: 0, z: 36 }, { x: 2.8, y: 0, z: 36 }, { x: -2.8, y: 0, z: 42 }, { x: 0, y: 0, z: 42 }, { x: 2.8, y: 0, z: 42 }]),
  red: Object.freeze([{ x: -2.8, y: 0, z: -36 }, { x: 0, y: 0, z: -36 }, { x: 2.8, y: 0, z: -36 }, { x: -2.8, y: 0, z: -42 }, { x: 0, y: 0, z: -42 }, { x: 2.8, y: 0, z: -42 }]),
});

// Protocol 4 combat keeps the original arena geometry intact and local on each
// client. These thin server-side wall slabs mirror the 20 original house
// envelopes so authoritative hits cannot pass through a house even when two
// clients have different streaming/renderer state. Shared destruction is not
// enabled yet, therefore these slabs intentionally remain intact for the full
// multiplayer Underground session.
const UNDERGROUND_HOUSE_WALLS = Object.freeze(Array.from({ length: 10 }, (_, index) => -36 + index * 8).flatMap((z) => [-19, 19].flatMap((x) => [
  { minX: x - 5.1, maxX: x - 4.9, minY: 0.75, maxY: 10, minZ: z - 3.1, maxZ: z + 3.1 },
  { minX: x + 4.9, maxX: x + 5.1, minY: 0.75, maxY: 10, minZ: z - 3.1, maxZ: z + 3.1 },
  { minX: x - 5, maxX: x + 5, minY: 0.75, maxY: 10, minZ: z - 3.2, maxZ: z - 3.0 },
  { minX: x - 5, maxX: x + 5, minY: 0.75, maxY: 10, minZ: z + 3.0, maxZ: z + 3.2 },
])));

const FORBIDDEN = ['playerId', 'targetId', 'targetIds', 'targets', 'damage', 'hit', 'health', 'team', 'admin', 'origin', 'position', 'context', 'spaceId', 'instanceId'];
const finiteVector = (value) => value && ['x', 'y', 'z'].every((key) => Number.isFinite(value[key]));
const protectedPlayer = (player) => isProtectedSpace(player.context?.space?.id) || isInsideSafeZone(player.state);

export function createCombatState() {
  return {
    schemaVersion: COMBAT_SCHEMA_VERSION,
    ammo: Object.fromEntries(Object.entries(MULTIPLAYER_WEAPON_RULES).map(([id, rule]) => [id, { magazine: rule.magazine, reserve: rule.reserve }])),
    reloadUntil: 0,
    reloadWeaponId: null,
    lastShotAt: 0,
    lastCombatSeq: -1,
    health: MULTIPLAYER_COMBAT_RULES.maxHealth,
    dead: false,
    team: null,
    kills: 0,
    deaths: 0,
    respawnAt: 0,
    protectionUntil: 0,
    spawnCursor: 0,
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
    health: Number.isFinite(input?.health) ? Math.max(0, Math.min(MULTIPLAYER_COMBAT_RULES.maxHealth, input.health)) : MULTIPLAYER_COMBAT_RULES.maxHealth,
    dead: input?.dead === true,
    team: input?.team === 'blue' || input?.team === 'red' ? input.team : null,
    kills: Number.isSafeInteger(input?.kills) ? Math.max(0, input.kills) : 0,
    deaths: Number.isSafeInteger(input?.deaths) ? Math.max(0, input.deaths) : 0,
    respawnAt: Number.isFinite(input?.respawnAt) ? Math.max(0, input.respawnAt) : 0,
    protectionUntil: Number.isFinite(input?.protectionUntil) ? Math.max(0, input.protectionUntil) : 0,
    spawnCursor: Number.isSafeInteger(input?.spawnCursor) ? Math.max(0, input.spawnCursor) : 0,
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
    health: canonical.health,
    maxHealth: MULTIPLAYER_COMBAT_RULES.maxHealth,
    dead: canonical.dead,
    team: canonical.team,
    kills: canonical.kills,
    deaths: canonical.deaths,
    respawnAt: canonical.respawnAt,
    protectionUntil: canonical.protectionUntil,
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
  if (player.combat.dead) return { ok: false, reason: 'player_dead' };
  if (player.combat.protectionUntil > now) { player.combat.protectionUntil = 0; return { ok: false, reason: 'protection_cancelled', combat: combatView(player.combat, now) }; }
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
  const origin = { x: player.state?.x || 0, y: (player.state?.y || 0) + MULTIPLAYER_SHOT_EYE_HEIGHT, z: player.state?.z || 0 };
  return { ok: true, shot: { playerId: player.id, weaponId: message.weaponId, origin, direction, sequence: message.seq, spaceId: player.context?.space?.id || 'city', serverTime: now }, combat: combatView(player.combat, now) };
}

export function publicCombatView(state, now = Date.now()) {
  const view = combatView(state, now);
  return { health: view.health, maxHealth: view.maxHealth, dead: view.dead, team: view.team, kills: view.kills, deaths: view.deaths, respawnAt: view.respawnAt, protectionUntil: view.protectionUntil };
}

export function beginUndergroundCombat(player, team, now, spawn) {
  player.combat = normalizeCombatState(player.combat);
  Object.assign(player.combat, { health: MULTIPLAYER_COMBAT_RULES.maxHealth, dead: false, team, respawnAt: 0, protectionUntil: now + MULTIPLAYER_COMBAT_RULES.spawnProtectionMs });
  if (spawn && player.state) player.state = { ...player.state, ...spawn, serverTime: now };
  return combatView(player.combat, now);
}

export function leaveUndergroundCombat(player) {
  player.combat = normalizeCombatState(player.combat);
  Object.assign(player.combat, { health: MULTIPLAYER_COMBAT_RULES.maxHealth, dead: false, team: null, respawnAt: 0, protectionUntil: 0 });
}

// Distance along a shot to a body standing at `target` (chest line, 0.72 m radius), or null on a miss.
export const targetDistance = (origin, direction, target) => {
  const center = { x: target.x, y: target.y + 1.05, z: target.z };
  const vx = center.x - origin.x, vy = center.y - origin.y, vz = center.z - origin.z;
  const along = vx * direction.x + vy * direction.y + vz * direction.z;
  if (along <= 0) return null;
  const dx = vx - direction.x * along, dy = vy - direction.y * along, dz = vz - direction.z * along;
  return dx * dx + dy * dy + dz * dz <= 0.72 * 0.72 ? along : null;
};

function rayAabbDistance(origin, direction, box) {
  let near = 0, far = Infinity;
  for (const axis of ['x', 'y', 'z']) {
    const value = direction[axis];
    if (Math.abs(value) < 1e-8) {
      if (origin[axis] < box[`min${axis.toUpperCase()}`] || origin[axis] > box[`max${axis.toUpperCase()}`]) return null;
      continue;
    }
    let a = (box[`min${axis.toUpperCase()}`] - origin[axis]) / value;
    let b = (box[`max${axis.toUpperCase()}`] - origin[axis]) / value;
    if (a > b) [a, b] = [b, a];
    near = Math.max(near, a); far = Math.min(far, b);
    if (near > far) return null;
  }
  return far >= 0 ? near : null;
}

export function undergroundShotOccluded(origin, direction, distance) {
  return UNDERGROUND_HOUSE_WALLS.some((box) => {
    const hit = rayAabbDistance(origin, direction, box);
    return hit !== null && hit > 0.03 && hit < distance - 0.05;
  });
}

export function publicCityShotOccluded(origin, direction, distance) {
  return MULTIPLAYER_SAFE_ZONES.some(({ bounds }) => {
    const hit = rayAabbDistance(origin, direction, bounds);
    return hit !== null && hit > 0.03 && hit < distance - 0.05;
  });
}

// M6.8A: interior shells plus the city's outdoor structures (city-structures.js).
export const cityShotOccluded = (origin, direction, distance) => publicCityShotOccluded(origin, direction, distance) || cityStructureOccluded(origin, direction, distance);

function segmentOccluded(start, end, occluded) {
  const dx = end.x - start.x, dy = end.y - start.y, dz = end.z - start.z;
  const distance = Math.hypot(dx, dy, dz);
  if (distance < 0.01) return false;
  return occluded(start, { x: dx / distance, y: dy / distance, z: dz / distance }, distance);
}

export function resolveAuthoritativeShot(shooter, shot, players, now, { occluded } = {}) {
  const spaceId = shooter.context?.space?.id || 'city';
  const underground = spaceId === 'underground';
  if ((!underground && spaceId !== 'city') || (underground && !shooter.combat?.team) || (spaceId === 'city' && protectedPlayer(shooter))) return { impacts: [], elimination: null };
  const blocked = occluded === undefined ? (underground ? undergroundShotOccluded : publicCityShotOccluded) : occluded;
  const roster = [...players], rule = MULTIPLAYER_WEAPON_RULES[shot.weaponId], candidates = [];
  for (const target of roster) {
    if (target.id === shooter.id || !target.connected || target.context?.space?.id !== spaceId) continue;
    target.combat = normalizeCombatState(target.combat);
    if (target.combat.dead || (underground && target.combat.team === shooter.combat.team) || (spaceId === 'city' && protectedPlayer(target)) || !target.state) continue;
    const distance = targetDistance(shot.origin, shot.direction, target.state);
    if (distance !== null && distance <= rule.range && !blocked(shot.origin, shot.direction, distance)) candidates.push({ target, distance });
  }
  candidates.sort((a, b) => a.distance - b.distance);
  const primary = candidates[0]; if (!primary) return { impacts: [], elimination: null };
  const impacted = shot.weaponId === 'rpg'
    ? roster.filter((target) => target.connected && target.context?.space?.id === spaceId && (!underground || target.combat?.team !== shooter.combat.team) && !target.combat?.dead && (spaceId !== 'city' || !protectedPlayer(target)) && target.state && Math.hypot(target.state.x - primary.target.state.x, target.state.y - primary.target.state.y, target.state.z - primary.target.state.z) <= rule.splash)
    : [primary.target];
  const impacts = []; let elimination = null;
  for (const target of impacted) {
    const distanceFromShot = targetDistance(shot.origin, shot.direction, target.state);
    const primaryCenter = { x: primary.target.state.x, y: primary.target.state.y + 1.05, z: primary.target.state.z };
    const targetCenter = { x: target.state.x, y: target.state.y + 1.05, z: target.state.z };
    const targetBlocked = target === primary.target
      ? distanceFromShot !== null && (occluded === undefined ? (underground ? undergroundShotOccluded : publicCityShotOccluded) : occluded)(shot.origin, shot.direction, distanceFromShot)
      : segmentOccluded(primaryCenter, targetCenter, occluded === undefined ? (underground ? undergroundShotOccluded : publicCityShotOccluded) : occluded);
    if (target.combat.protectionUntil > now || targetBlocked) continue;
    const damage = shot.weaponId === 'rpg' ? Math.max(20, Math.round(rule.damage * (1 - Math.min(rule.splash, Math.hypot(target.state.x - primary.target.state.x, target.state.z - primary.target.state.z)) / rule.splash))) : rule.damage;
    target.combat.health = Math.max(0, target.combat.health - damage);
    if (target.combat.health === 0) { target.combat.dead = true; target.combat.deaths++; target.combat.respawnAt = now + MULTIPLAYER_COMBAT_RULES.respawnMs; shooter.combat.kills++; elimination = { killerId: shooter.id, victimId: target.id }; }
    impacts.push({ targetId: target.id, damage, health: target.combat.health, dead: target.combat.dead });
  }
  return { impacts, elimination };
}

export function respawnPublicPlayer(player, players, now, random = Math.random) {
  player.combat = normalizeCombatState(player.combat);
  if (!player.combat.dead || now < player.combat.respawnAt || (player.context?.space?.id || 'city') !== 'city') return null;
  const enemies = [...players].filter((other) => other.id !== player.id && other.connected
    && (other.context?.space?.id || 'city') === 'city' && !other.combat?.dead && other.state);
  const candidates = MULTIPLAYER_SPAWNS
    .map((spawn, index) => ({ spawn, index, nearest: enemies.reduce((best, enemy) => Math.min(best, Math.hypot(spawn.x - enemy.state.x, spawn.z - enemy.state.z)), Infinity), recent: index === player.combat.spawnCursor }))
    .filter(({ spawn }) => !isInsideSafeZone({ x: spawn.x, y: 0, z: spawn.z }));
  candidates.sort((a, b) => (b.nearest - a.nearest) || (Number(a.recent) - Number(b.recent)) || (random() - 0.5));
  const chosen = candidates[0];
  if (!chosen) return null;
  player.combat.spawnCursor = chosen.index; player.combat.health = MULTIPLAYER_COMBAT_RULES.maxHealth; player.combat.dead = false; player.combat.respawnAt = 0; player.combat.protectionUntil = now + MULTIPLAYER_COMBAT_RULES.spawnProtectionMs;
  const seq = Number.isSafeInteger(player.lastSeq) ? ++player.lastSeq : (player.state?.seq || 0) + 1;
  player.state = { ...player.state, seq, x: chosen.spawn.x, y: 0, z: chosen.spawn.z, serverTime: now };
  return { playerId: player.id, state: player.state, combat: combatView(player.combat, now), reason: 'safest-city-candidate' };
}

export function respawnUndergroundPlayer(player, players, now, random = Math.random) {
  player.combat = normalizeCombatState(player.combat);
  if (!player.combat.dead || now < player.combat.respawnAt || !player.combat.team) return null;
  const candidates = UNDERGROUND_SPAWNS[player.combat.team], enemies = [...players].filter((other) => other.id !== player.id && other.connected && other.combat?.team !== player.combat.team && !other.combat?.dead && other.state);
  const scored = candidates.map((spawn, index) => ({ spawn, index, nearest: enemies.reduce((best, enemy) => Math.min(best, Math.hypot(spawn.x - enemy.state.x, spawn.z - enemy.state.z)), Infinity), recent: index === player.combat.spawnCursor }));
  scored.sort((a, b) => (b.nearest - a.nearest) || (Number(a.recent) - Number(b.recent)) || (random() - 0.5));
  const chosen = scored[0]; player.combat.spawnCursor = chosen.index; player.combat.health = MULTIPLAYER_COMBAT_RULES.maxHealth; player.combat.dead = false; player.combat.respawnAt = 0; player.combat.protectionUntil = now + MULTIPLAYER_COMBAT_RULES.spawnProtectionMs;
  const seq = Number.isSafeInteger(player.lastSeq) ? ++player.lastSeq : (player.state?.seq || 0) + 1;
  player.state = { ...player.state, ...chosen.spawn, seq, serverTime: now };
  return { playerId: player.id, state: player.state, combat: combatView(player.combat, now), reason: 'safest-candidate' };
}

export function applyReloadIntent(player, message, now, protocolVersion) {
  const validation = validateReloadIntent(message, protocolVersion); if (!validation.ok) return validation;
  player.combat = normalizeCombatState(player.combat);
  if (player.combat.dead) return { ok: false, reason: 'player_dead' };
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
