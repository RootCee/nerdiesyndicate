import { PROTOCOL_VERSION, UNDERGROUND_TEAM_SIZE } from './multiplayer-protocol.js';
import { MULTIPLAYER_SPACES } from './multiplayer-spaces.js';
import { MULTIPLAYER_COMBAT_RULES, MULTIPLAYER_WEAPON_RULES, UNDERGROUND_SPAWNS, createCombatState, normalizeCombatState, undergroundShotOccluded } from './multiplayer-combat.js';
import { DEFAULT_PLAYER_CONTEXT } from './multiplayer-equipment.js';

// M6.5 Underground 6v6. The room server owns the match lifecycle and the AI
// roster: humans always take priority, bots only occupy slots no connected
// human holds, and bots act exclusively through the same validated fire/reload
// path as humans. Match teams are temporary and never touch player gangs.
export const UNDERGROUND_MATCH_RULES = Object.freeze({
  durationMs: 600_000, // mirrors the original practice match (10:00, first to 100)
  scoreLimit: 100,
  pointsPerElimination: 2,
  resultsMs: 12_000,
  tickMs: 100,
  botSpeed: 4.2,
  botWeaponId: 'ak',
  botSightRange: 70,
});

const TEAMS = ['blue', 'red'];
const BOT_NAMES = ['Viper', 'Nines', 'Smoke', 'Deuce', 'Lefty', 'Rook', 'Static', 'Ghost', 'Tank', 'Blaze', 'Shadow', 'Ace'];
const BOT_PRESETS = { blue: ['blue_zip', 'navy'], red: ['red_hoodie', 'red_jersey'] };
const BOUNDS = MULTIPLAYER_SPACES.underground.bounds;
const EYE = 1.35, CHEST = 1.05, CLEARANCE = 0.35;

// Solid footprints of the 20 original Hood Warfare houses; the same envelopes
// the server wall slabs in multiplayer-combat.js mirror for shot occlusion.
export const UNDERGROUND_HOUSES = Object.freeze(Array.from({ length: 10 }, (_, index) => -36 + index * 8)
  .flatMap((z) => [-19, 19].map((x) => Object.freeze({ minX: x - 5.1, maxX: x + 5.1, minZ: z - 3.2, maxZ: z + 3.2 }))));

function segmentHitsBox(ax, az, bx, bz, box, pad) {
  const minX = box.minX - pad, maxX = box.maxX + pad, minZ = box.minZ - pad, maxZ = box.maxZ + pad;
  const dx = bx - ax, dz = bz - az; let near = 0, far = 1;
  for (const [origin, delta, min, max] of [[ax, dx, minX, maxX], [az, dz, minZ, maxZ]]) {
    if (Math.abs(delta) < 1e-9) { if (origin < min || origin > max) return false; continue; }
    let t1 = (min - origin) / delta, t2 = (max - origin) / delta; if (t1 > t2) [t1, t2] = [t2, t1];
    near = Math.max(near, t1); far = Math.min(far, t2); if (near > far) return false;
  }
  return true;
}
export const pathBlocked = (a, b, pad = CLEARANCE) => UNDERGROUND_HOUSES.some((box) => segmentHitsBox(a.x, a.z, b.x, b.z, box, pad));
export const insideHouse = (p, pad = CLEARANCE) => UNDERGROUND_HOUSES.some((box) => p.x > box.minX - pad && p.x < box.maxX + pad && p.z > box.minZ - pad && p.z < box.maxZ + pad);

export function hasLineOfSight(from, to) {
  const origin = { x: from.x, y: (from.y || 0) + EYE, z: from.z }, target = { x: to.x, y: (to.y || 0) + CHEST, z: to.z };
  const dx = target.x - origin.x, dy = target.y - origin.y, dz = target.z - origin.z, distance = Math.hypot(dx, dy, dz);
  if (distance < 0.01) return true;
  return !undergroundShotOccluded(origin, { x: dx / distance, y: dy / distance, z: dz / distance }, distance);
}

// Waypoints: the open centre lane, both outer lanes, the 1.6 m alleys between
// houses, and both open arena ends.
const LANE_X = [-34, -9, 0, 9, 34], ALLEY_Z = [-32, -24, -16, -8, 0, 8, 16, 24, 32], END_Z = [-43, 43];
export const UNDERGROUND_NAV_NODES = Object.freeze([
  ...LANE_X.flatMap((x) => [...END_Z, ...ALLEY_Z].map((z) => ({ x, z }))),
  ...[-19, 19].flatMap((x) => [...END_Z, ...ALLEY_Z].map((z) => ({ x, z }))),
].map((node, id) => Object.freeze({ id, ...node })));
const NAV_EDGES = UNDERGROUND_NAV_NODES.map((a) => UNDERGROUND_NAV_NODES
  .filter((b) => b !== a && Math.hypot(a.x - b.x, a.z - b.z) <= 18 && !pathBlocked(a, b))
  .map((b) => b.id));

const nearestReachableNode = (p) => {
  let best = null, bestDistance = Infinity;
  for (const node of UNDERGROUND_NAV_NODES) {
    const distance = Math.hypot(node.x - p.x, node.z - p.z);
    if (distance < bestDistance && !pathBlocked(p, node)) { best = node; bestDistance = distance; }
  }
  return best;
};

export function findPath(from, to) {
  if (!pathBlocked(from, to)) return [{ x: to.x, z: to.z }];
  const start = nearestReachableNode(from), goal = nearestReachableNode(to);
  if (!start || !goal) return [];
  const cost = new Map([[start.id, 0]]), prev = new Map(), open = new Set([start.id]);
  const h = (id) => Math.hypot(UNDERGROUND_NAV_NODES[id].x - goal.x, UNDERGROUND_NAV_NODES[id].z - goal.z);
  while (open.size) {
    let current = null; for (const id of open) if (current === null || cost.get(id) + h(id) < cost.get(current) + h(current)) current = id;
    if (current === goal.id) break; open.delete(current);
    for (const next of NAV_EDGES[current]) {
      const a = UNDERGROUND_NAV_NODES[current], b = UNDERGROUND_NAV_NODES[next], score = cost.get(current) + Math.hypot(a.x - b.x, a.z - b.z);
      if (score < (cost.get(next) ?? Infinity)) { cost.set(next, score); prev.set(next, current); open.add(next); }
    }
  }
  if (!cost.has(goal.id)) return [];
  const route = []; for (let id = goal.id; id !== undefined; id = prev.get(id)) route.unshift({ x: UNDERGROUND_NAV_NODES[id].x, z: UNDERGROUND_NAV_NODES[id].z });
  route.push({ x: to.x, z: to.z });
  return route;
}

export const isBot = (player) => player?.bot != null;
export const createBotAmmo = () => createCombatState().ammo;
export const inUnderground = (player) => player?.context?.space?.id === 'underground';
const teamOf = (player) => player?.combat?.team;
const yawToward = (dx, dz) => Math.atan2(-dx, -dz);
const clampToArena = (p) => ({ x: Math.max(BOUNDS.minX + 1, Math.min(BOUNDS.maxX - 1, p.x)), z: Math.max(BOUNDS.minZ + 1, Math.min(BOUNDS.maxZ - 1, p.z)) });

function freshMatch(phase = 'idle') {
  return { matchId: '', phase, startedAt: 0, endsAt: 0, endedAt: 0, nextMatchAt: 0, winner: null, score: { blue: 0, red: 0 }, stats: {}, serial: 0, revision: 0 };
}

export class UndergroundMatch {
  constructor({ random = Math.random, rules = UNDERGROUND_MATCH_RULES, makeId } = {}) {
    this.random = random; this.rules = rules; this.state = freshMatch();
    this.makeId = makeId || (() => `b_${Math.floor(random() * 36 ** 8).toString(36).padStart(8, '0')}`);
  }
  toJSON() { return this.state; }
  restore(saved) { if (saved && typeof saved === 'object' && saved.score) this.state = { ...freshMatch(), ...saved, score: { blue: saved.score.blue | 0, red: saved.score.red | 0 }, stats: { ...saved.stats } }; }

  // Humans holding an Underground seat, including players inside the reconnect
  // grace window so a dropped player always gets their own team back.
  humans(players, team) { return [...players.values()].filter((p) => !isBot(p) && inUnderground(p) && (!team || teamOf(p) === team)); }
  connectedHumans(players, team) { return this.humans(players, team).filter((p) => p.connected); }
  bots(players, team) { return [...players.values()].filter((p) => isBot(p) && (!team || teamOf(p) === team)); }

  assignTeam(players, joiningId) {
    const counts = Object.fromEntries(TEAMS.map((team) => [team, this.humans(players, team).filter((p) => p.id !== joiningId).length]));
    if (counts.blue >= UNDERGROUND_TEAM_SIZE) return 'red';
    if (counts.red >= UNDERGROUND_TEAM_SIZE) return 'blue';
    return counts.blue <= counts.red ? 'blue' : 'red';
  }

  #spawnFor(team, players) {
    const enemies = [...players.values()].filter((p) => inUnderground(p) && p.connected && teamOf(p) && teamOf(p) !== team && !p.combat.dead && p.state);
    const allies = [...players.values()].filter((p) => inUnderground(p) && teamOf(p) === team && p.state);
    const scored = UNDERGROUND_SPAWNS[team].map((spawn) => ({
      spawn,
      enemy: enemies.reduce((best, e) => Math.min(best, Math.hypot(spawn.x - e.state.x, spawn.z - e.state.z)), Infinity),
      crowd: allies.filter((a) => Math.hypot(spawn.x - a.state.x, spawn.z - a.state.z) < 1.4).length,
    }));
    scored.sort((a, b) => (a.crowd - b.crowd) || (b.enemy - a.enemy) || (this.random() - 0.5));
    return scored[0].spawn;
  }

  createBot(team, players, now) {
    const used = new Set(this.bots(players).map((b) => b.name));
    const name = `AI ${BOT_NAMES.find((n) => !used.has(`AI ${n}`)) || 'Grunt'}`;
    const id = this.makeId(), spawn = this.#spawnFor(team, players), presets = BOT_PRESETS[team];
    const combat = createCombatState();
    Object.assign(combat, { team, protectionUntil: now + MULTIPLAYER_COMBAT_RULES.spawnProtectionMs });
    const bot = {
      id, name, bot: { targetId: null, reactAt: 0, nextFireAt: 0, burstLeft: 0, path: [], repathAt: 0, coverUntil: 0, goal: null, strafe: this.random() < 0.5 ? -1 : 1, strafeAt: 0 },
      ticket: '', spawnIndex: -1, appearance: { schemaVersion: 1, preset: presets[Math.floor(this.random() * presets.length)] }, appearanceRevision: 1,
      equipment: { schemaVersion: 1, weaponId: this.rules.botWeaponId, holstered: false }, equipmentRevision: 1,
      context: { ...DEFAULT_PLAYER_CONTEXT, team: { ...DEFAULT_PLAYER_CONTEXT.team }, space: { id: 'underground', instanceId: 'underground' } }, contextRevision: 1,
      combat, combatRateAt: 0, combatRateCount: 0, connected: true, graceUntil: 0, socketId: 'server-bot', lastSeq: 0, lastAt: now, velocity: 0, seq: 0,
      state: null,
    };
    bot.state = { v: PROTOCOL_VERSION, type: 'state', playerId: id, name, seq: 0, serverTime: now, x: spawn.x, y: 0, z: spawn.z, yaw: team === 'blue' ? 0 : Math.PI, speed: 0, state: 'idle', safeZone: false };
    return bot;
  }

  // Keeps each team at exactly six combatants while any human is connected in
  // the Underground. Returns the bots that joined and the ids that left so the
  // room can announce them; never touches humans.
  rebalance(players, now) {
    const added = [], removed = [];
    const anyHuman = this.connectedHumans(players).length > 0;
    for (const team of TEAMS) {
      const wanted = anyHuman ? Math.max(0, UNDERGROUND_TEAM_SIZE - this.connectedHumans(players, team).length) : 0;
      const bots = this.bots(players, team);
      // Prefer removing dead or protected bots so a human never "inherits" a kill mid-fight.
      bots.sort((a, b) => Number(b.combat.dead) - Number(a.combat.dead));
      while (bots.length > wanted) { const bot = bots.shift(); players.delete(bot.id); removed.push(bot.id); }
      for (let i = bots.length; i < wanted; i++) { const bot = this.createBot(team, players, now); players.set(bot.id, bot); added.push(bot); }
    }
    if (!anyHuman && this.state.phase !== 'idle') { this.state = { ...freshMatch(), serial: this.state.serial, revision: this.state.revision + 1 }; }
    else if (anyHuman && this.state.phase === 'idle') this.#startMatch(players, now, false);
    return { added, removed };
  }

  #startMatch(players, now, resetCombatants) {
    const serial = this.state.serial + 1;
    this.state = { ...freshMatch('live'), matchId: `ug-${now.toString(36)}-${serial}`, startedAt: now, endsAt: now + this.rules.durationMs, serial, revision: this.state.revision + 1 };
    const teleported = [];
    if (resetCombatants) {
      this.#balanceHumans(players);
      for (const p of players.values()) if (inUnderground(p) && teamOf(p)) teleported.push(this.resetCombatant(p, players, now));
    }
    return teleported;
  }

  // Requeue keeps players in the arena; only fixes a lopsided human split.
  #balanceHumans(players) {
    const humans = this.humans(players).sort((a, b) => a.id.localeCompare(b.id));
    const count = (team) => humans.filter((p) => teamOf(p) === team).length;
    while (Math.abs(count('blue') - count('red')) > 1) {
      const from = count('blue') > count('red') ? 'blue' : 'red', mover = humans.find((p) => teamOf(p) === from);
      mover.combat.team = from === 'blue' ? 'red' : 'blue';
    }
  }

  resetCombatant(p, players, now) {
    const fresh = createCombatState();
    p.combat = normalizeCombatState(p.combat);
    Object.assign(p.combat, { ammo: fresh.ammo, reloadUntil: 0, reloadWeaponId: null, health: MULTIPLAYER_COMBAT_RULES.maxHealth, dead: false, respawnAt: 0, protectionUntil: now + MULTIPLAYER_COMBAT_RULES.spawnProtectionMs });
    const spawn = this.#spawnFor(p.combat.team, players), seq = Number.isSafeInteger(p.lastSeq) ? ++p.lastSeq : 1;
    p.state = { ...(p.state || {}), v: PROTOCOL_VERSION, type: 'state', playerId: p.id, name: p.name, seq, x: spawn.x, y: 0, z: spawn.z, serverTime: now, safeZone: false };
    if (isBot(p)) Object.assign(p.bot, { targetId: null, path: [], goal: null, coverUntil: 0 });
    return p;
  }

  stat(id) { return (this.state.stats[id] ||= { kills: 0, deaths: 0 }); }

  // Called by the room after an authoritative elimination in the Underground.
  recordElimination(killer, victim, now) {
    if (this.state.phase !== 'live' || !killer || !victim || teamOf(killer) === teamOf(victim) || !teamOf(killer)) return false;
    this.stat(killer.id).kills++; this.stat(victim.id).deaths++;
    this.state.score[teamOf(killer)] += this.rules.pointsPerElimination; this.state.revision++;
    if (this.state.score[teamOf(killer)] >= this.rules.scoreLimit) this.#endMatch(now);
    return true;
  }

  #endMatch(now) {
    const { blue, red } = this.state.score;
    Object.assign(this.state, { phase: 'ended', endedAt: now, nextMatchAt: now + this.rules.resultsMs, winner: blue > red ? 'blue' : red > blue ? 'red' : 'draw' });
    this.state.revision++;
  }

  // Advances timers. Returns combatants teleported by a requeue.
  advance(players, now) {
    if (this.state.phase === 'live' && now >= this.state.endsAt) this.#endMatch(now);
    if (this.state.phase === 'ended' && now >= this.state.nextMatchAt && this.connectedHumans(players).length) return this.#startMatch(players, now, true);
    return [];
  }

  view(players, now) {
    const roster = [...players.values()].filter((p) => inUnderground(p) && teamOf(p) && (p.connected || !isBot(p))).map((p) => ({
      id: p.id, name: p.name, team: teamOf(p), bot: isBot(p), connected: p.connected === true, ...(this.state.stats[p.id] || { kills: 0, deaths: 0 }),
    }));
    const { matchId, phase, startedAt, endsAt, endedAt, nextMatchAt, winner, score, revision } = this.state;
    return { v: PROTOCOL_VERSION, type: 'underground-match', matchId, phase, startedAt, endsAt, endedAt, nextMatchAt, winner, score: { ...score }, scoreLimit: this.rules.scoreLimit, teamSize: UNDERGROUND_TEAM_SIZE, revision, roster, serverTime: now };
  }

  // ---- AI ----------------------------------------------------------------
  #enemiesOf(bot, players) {
    return [...players.values()].filter((p) => p !== bot && p.connected && inUnderground(p) && teamOf(p) && teamOf(p) !== teamOf(bot) && !p.combat?.dead && p.state);
  }

  #pickTarget(bot, players, now) {
    let best = null, bestScore = Infinity;
    for (const enemy of this.#enemiesOf(bot, players)) {
      const distance = Math.hypot(enemy.state.x - bot.state.x, enemy.state.z - bot.state.z);
      if (distance > this.rules.botSightRange || !hasLineOfSight(bot.state, enemy.state)) continue;
      const score = distance + (enemy.combat.protectionUntil > now ? 40 : 0) + (enemy.id === bot.bot.targetId ? -8 : 0);
      if (score < bestScore) { best = enemy; bestScore = score; }
    }
    return best;
  }

  #coverPoint(bot, threat) {
    let best = null, bestDistance = Infinity;
    for (const node of UNDERGROUND_NAV_NODES) {
      const distance = Math.hypot(node.x - bot.state.x, node.z - bot.state.z);
      if (distance > 16 || distance >= bestDistance || hasLineOfSight(threat.state, { x: node.x, y: 0, z: node.z })) continue;
      best = node; bestDistance = distance;
    }
    return best;
  }

  #patrolGoal(bot, players) {
    const enemies = this.#enemiesOf(bot, players);
    if (enemies.length && this.random() < 0.7) { const e = enemies[Math.floor(this.random() * enemies.length)]; return { x: e.state.x, z: e.state.z }; }
    const node = UNDERGROUND_NAV_NODES[Math.floor(this.random() * UNDERGROUND_NAV_NODES.length)];
    return { x: node.x, z: node.z };
  }

  #moveToward(bot, goal, dt, players) {
    if (!bot.bot.path.length || bot.bot.repathAt <= 0) { bot.bot.path = findPath(bot.state, goal); bot.bot.repathAt = 1.2; }
    const next = bot.bot.path[0]; if (!next) return 0;
    const dx = next.x - bot.state.x, dz = next.z - bot.state.z, distance = Math.hypot(dx, dz);
    if (distance < 0.6) { bot.bot.path.shift(); return 0; }
    const step = Math.min(distance, this.rules.botSpeed * dt);
    let nx = bot.state.x + (dx / distance) * step, nz = bot.state.z + (dz / distance) * step;
    // Light separation so bots do not stack on one another.
    for (const other of players.values()) {
      if (other === bot || !inUnderground(other) || !other.state || other.combat?.dead) continue;
      const ox = nx - other.state.x, oz = nz - other.state.z, d = Math.hypot(ox, oz);
      if (d > 0.01 && d < 0.9) { nx += (ox / d) * (0.9 - d) * 0.5; nz += (oz / d) * (0.9 - d) * 0.5; }
    }
    const clamped = clampToArena({ x: nx, z: nz });
    if (insideHouse(clamped, CLEARANCE * 0.5)) { bot.bot.path = []; return 0; }
    const moved = Math.hypot(clamped.x - bot.state.x, clamped.z - bot.state.z);
    bot.state.x = clamped.x; bot.state.z = clamped.z;
    return moved / dt;
  }

  // Produces this tick's intents for one bot. Movement is applied directly
  // (server-owned positions); fire/reload are returned so the room can run
  // them through its normal authoritative validation.
  thinkBot(bot, players, now, dt) {
    if (bot.combat.dead || this.state.phase !== 'live') { bot.state.speed = 0; bot.state.state = 'idle'; return { moved: false, intents: [] }; }
    const brain = bot.bot, intents = [];
    brain.repathAt -= dt;
    const before = { x: bot.state.x, z: bot.state.z, yaw: bot.state.yaw };
    const target = this.#pickTarget(bot, players, now);
    if (target?.id !== brain.targetId) { brain.targetId = target?.id || null; brain.reactAt = now + 380 + this.random() * 320; brain.burstLeft = 0; }
    let speed = 0;
    if (target) {
      const dx = target.state.x - bot.state.x, dz = target.state.z - bot.state.z, distance = Math.hypot(dx, dz);
      bot.state.yaw = yawToward(dx, dz);
      if (bot.combat.health < 45 && brain.coverUntil < now) { const cover = this.#coverPoint(bot, target); if (cover) { brain.goal = cover; brain.path = []; brain.coverUntil = now + 3200; } }
      if (brain.coverUntil > now && brain.goal) speed = this.#moveToward(bot, brain.goal, dt, players);
      else if (distance > 28) { brain.goal = { x: target.state.x, z: target.state.z }; if (brain.repathAt <= 0) brain.path = []; speed = this.#moveToward(bot, brain.goal, dt, players); }
      else {
        if (now >= brain.strafeAt) { brain.strafe = this.random() < 0.5 ? -1 : 1; brain.strafeAt = now + 900 + this.random() * 900; }
        const side = { x: bot.state.x + (dz / distance) * brain.strafe * 2, z: bot.state.z - (dx / distance) * brain.strafe * 2 };
        if (!pathBlocked(bot.state, side)) { brain.path = [side]; speed = this.#moveToward(bot, side, dt, players) * 0.6; }
      }
      bot.state.yaw = yawToward(dx, dz);
      const ammo = bot.combat.ammo[this.rules.botWeaponId], rule = MULTIPLAYER_WEAPON_RULES[this.rules.botWeaponId];
      if (ammo.magazine <= 0 && bot.combat.reloadUntil <= now) {
        if (ammo.reserve <= 0) ammo.reserve = rule.reserve; // server bots never run dry
        intents.push({ v: PROTOCOL_VERSION, type: 'reload', seq: ++bot.seq, weaponId: this.rules.botWeaponId });
      } else if (now >= brain.reactAt && now >= brain.nextFireAt && distance <= rule.range && bot.combat.reloadUntil <= now) {
        if (brain.burstLeft <= 0) brain.burstLeft = 3 + Math.floor(this.random() * 4);
        const origin = { x: bot.state.x, y: EYE, z: bot.state.z }, aim = { x: target.state.x, y: (target.state.y || 0) + CHEST, z: target.state.z };
        const spread = 0.025 + Math.min(0.09, distance * 0.0011);
        let ax = aim.x - origin.x, ay = aim.y - origin.y, az = aim.z - origin.z; const len = Math.hypot(ax, ay, az) || 1;
        ax = ax / len + (this.random() - 0.5) * 2 * spread; ay = ay / len + (this.random() - 0.5) * spread; az = az / len + (this.random() - 0.5) * 2 * spread;
        const norm = Math.hypot(ax, ay, az) || 1;
        intents.push({ v: PROTOCOL_VERSION, type: 'fire', seq: ++bot.seq, weaponId: this.rules.botWeaponId, direction: { x: ax / norm, y: ay / norm, z: az / norm } });
        brain.burstLeft--;
        brain.nextFireAt = brain.burstLeft > 0 ? now + 60_000 / rule.rpm + 5 : now + 450 + this.random() * 450;
      }
    } else {
      brain.coverUntil = 0;
      if (!brain.goal || Math.hypot(brain.goal.x - bot.state.x, brain.goal.z - bot.state.z) < 1.5 || brain.repathAt < -6) { brain.goal = this.#patrolGoal(bot, players); brain.path = []; }
      speed = this.#moveToward(bot, brain.goal, dt, players);
      const next = brain.path[0];
      if (next && speed > 0) bot.state.yaw = yawToward(next.x - bot.state.x, next.z - bot.state.z);
    }
    const moved = before.x !== bot.state.x || before.z !== bot.state.z || before.yaw !== bot.state.yaw;
    bot.state.speed = Math.min(this.rules.botSpeed, speed); bot.state.state = speed > 3 ? 'run' : speed > 0.2 ? 'walk' : 'idle';
    if (moved) { bot.state.seq = ++bot.lastSeq; bot.state.serverTime = now; }
    return { moved, intents };
  }
}
