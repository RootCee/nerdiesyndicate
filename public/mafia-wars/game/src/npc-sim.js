// M6.7A server-authoritative city pedestrians. Runs inside the room (Durable
// Object) beside — never inside — the Underground match: NPCs have their own
// list, ids, and messages, never count as players, and are never sent to
// players in the Underground or interiors. Pure JS (no Three.js or DOM), so the
// same code runs in Node tests.
//
// Per 200 ms tick: residents near city players are simulated (sidewalk routes
// from the M6.6 walk graph, local avoidance, idle pauses); the rest move
// cheaply along their route every few seconds; residents far from everyone are
// relocated to sidewalks out of sight of all players. Each player receives
// only the nearest residents within range, as compact changed-only states.
import { createCityPlan } from './city-layout.js';
import { cityPois } from './city-pois.js';
import { buildNavGraph, findRoute, insideObstacle, segmentClear } from './city-navigation.js';
import { NPC_POPULATION, seedPopulation, seededRandom } from './npc-population.js';
import { PROTOCOL_VERSION } from './multiplayer-protocol.js';
import { NPC_BEHAVIOR, NPC_BEHAVIOR_RULES, greetingFor, personalityOf, reactionTo, severityOf } from './npc-behavior.js';
import { NPC_COMBAT_RULES, assessThreat, strikeProfile, weaponClass } from './npc-combat.js';
import { isInsideSafeZone } from './multiplayer-spaces.js';
import { cityShotOccluded, publicCityShotOccluded, targetDistance } from './multiplayer-combat.js';
import { bodyHit } from './hit-regions.js';

export const NPC_SIM_RULES = Object.freeze({
  tickMs: 200,
  activeRadius: 120,      // simulate residents this close to any city player
  sendRadius: 70,         // send residents this close to a player...
  maxSendPerPlayer: 16,   // ...at most this many, nearest first
  relocateRadius: 160,    // residents farther than this from everyone are moved
  spawnMinDistance: 55,   // new positions are at least this far from every player
  spawnMaxDistance: 95,
  relocationsPerTick: 2,
  dormantStepMs: 4000,    // dormant residents advance along their route this often
  walkSpeed: 1.35,        // m/s at pace 1
  npcClearance: 0.8, playerClearance: 1.15,
  keyframeMs: 1000,       // every sent resident is refreshed at least this often
  idleMinMs: 2500, idleMaxMs: 9000, visitIdleMs: 7000,
  noticeRadius: 10, hearingRadius: 45, memoryMs: 60_000,
});
export const NPC_ANIM = Object.freeze({ idle: 0, walk: 1, notice: 2 });

const hard = (obstacles) => obstacles.filter((r) => !r.soft);
// The resident models stand 1.86 m at height factor 1 (measured from the CC0 library meshes).
const NPC_BODY_HEIGHT = 1.86;
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export class CityNpcSimulation {
  // reactions: M6.7B1 awareness and reactions (off = exactly M6.7A behaviour).
  // combat: M6.7B2 self-defense (requires reactions).
  // structureOcclusion: M6.8A, shots at residents use the same city structures as player shots.
  constructor({ seed = 'room', maxActive = NPC_POPULATION.startActive, population = NPC_POPULATION.max, plan = createCityPlan(), rules = NPC_SIM_RULES, reactions = false, combat = false, structureOcclusion = false } = {}) {
    this.reactions = reactions === true; this.combat = this.reactions && combat === true; this.panicQueue = []; this.strikes = [];
    // true: the static structures; a function: the room's live test (M6.8B open faces included).
    this.structureOcclusion = typeof structureOcclusion === 'function' ? structureOcclusion : structureOcclusion === true ? cityShotOccluded : null;
    this.rules = rules; this.plan = plan; this.random = seededRandom(`sim:${seed}`);
    this.maxActive = Math.max(0, Math.min(NPC_POPULATION.maxActive, maxActive | 0));
    this.identities = seedPopulation(seed, population);
    this.graph = null; this.hard = null; this.pois = cityPois(plan).filter((p) => !p.spaceId || p.kind === 'apartment');
    this.residents = this.identities.map((identity, index) => ({ index, identity, x: 0, z: 0, yaw: 0, speed: 0, anim: NPC_ANIM.idle, route: null, step: 0, waitUntil: 0, stuckFor: 0, active: false, lastDormantAt: 0, placed: false, memory: [], aware: null,
      personality: personalityOf(identity), behavior: NPC_BEHAVIOR.calm, behaviorUntil: 0, threat: null, reaction: null, pending: null, threats: [], greeted: new Map(), greetTarget: null, fleeing: false,
      health: NPC_COMBAT_RULES.maxHealth, lastDamageAt: 0, downUntil: 0, defeatedAt: 0, protectionUntil: 0, fight: null, lastAttack: null, allyAttack: null, strikeUntil: 0 }));
    this.viewers = new Map(); // playerId -> Map(index -> { at, sig })
    this.metrics = { ticks: 0, active: 0, relocations: 0, routes: 0, routeFailures: 0, failureReasons: {}, walkBacks: 0, replans: 0, bytes: 0, messages: 0,
      reactions: { startled: 0, alert: 0, flee: 0, fleeRouteFailures: 0, panicked: 0, remembered: 0, greet: 0, wary: 0 },
      combat: { hits: 0, strikes: 0, knockdowns: 0, defeats: 0, respawns: 0, disengaged: 0, retreats: 0, fight: 0, flee: 0, warn: 0, cower: 0 } };
  }

  #ensureGraph() {
    if (!this.graph) {
      this.graph = buildNavGraph(this.plan); this.hard = hard(this.graph.obstacles);
      // Shots at residents stop at buildings, houses, and fences (not at thin lamp posts).
      this.shotBlockers = this.hard.filter((o) => (o.maxX - o.minX) * (o.maxZ - o.minZ) > 0.25);
    }
    return this.graph;
  }
  // A random point on a walk-graph edge (a sidewalk, lane, crossing, or alley).
  #streetPoint() {
    const g = this.#ensureGraph();
    for (let tries = 0; tries < 20; tries++) {
      const [a, b] = g.edges[Math.floor(this.random() * g.edges.length)], t = this.random();
      const p = { x: g.nodes[a].x + (g.nodes[b].x - g.nodes[a].x) * t, z: g.nodes[a].z + (g.nodes[b].z - g.nodes[a].z) * t };
      if (!insideObstacle(p, g.obstacles, 0.3)) return p;
    }
    return { ...g.nodes[0] };
  }
  #outOfSight(p, players) { return players.every((pl) => dist(p, pl) >= this.rules.spawnMinDistance); }
  #placeNear(r, players) {
    for (let tries = 0; tries < 40; tries++) {
      const p = this.#streetPoint(), nearest = Math.min(...players.map((pl) => dist(p, pl)));
      if (nearest >= this.rules.spawnMinDistance && nearest <= this.rules.spawnMaxDistance) { this.#reset(r, p); this.metrics.relocations++; return true; }
    }
    return false;
  }
  #reset(r, p) { Object.assign(r, { x: p.x, z: p.z, route: null, step: 0, speed: 0, anim: NPC_ANIM.idle, waitUntil: 0, stuckFor: 0, placed: true, behavior: NPC_BEHAVIOR.calm, threat: null, pending: null, fleeing: false, health: NPC_COMBAT_RULES.maxHealth, downUntil: 0, defeatedAt: 0, fight: null, lastAttack: null, allyAttack: null }); }

  // Next destination: a business, bank, or apartment door for 'visit'
  // residents sometimes, otherwise a sidewalk point 30-120 m away.
  #plan(r, now) {
    const g = this.#ensureGraph();
    let goal = null, approach = [], visit = false;
    if (r.identity.routine === 'visit' && this.random() < 0.5) {
      const near = this.pois.filter((p) => dist(p.entry, r) < 150);
      if (near.length) { const poi = near[Math.floor(this.random() * near.length)]; goal = poi.entry; approach = poi.approach || []; visit = true; }
    }
    for (let tries = 0; !goal && tries < 8; tries++) {
      const p = this.#streetPoint(), d = dist(p, r);
      if (d >= 30 && d <= 120) goal = p;
    }
    if (!goal) { r.waitUntil = now + 1000; return; }
    const route = findRoute(g, r, goal, { approach });
    this.metrics.routes++;
    if (!route.ok) {
      this.metrics.routeFailures++; this.metrics.failureReasons[route.reason] = (this.metrics.failureReasons[route.reason] || 0) + 1;
      // A door (storefront, apartment) may have no square-on way back to the
      // street; leave the way the resident came, which is known to be valid.
      if (r.lastRoute?.length > 1) { r.route = [...r.lastRoute].reverse(); r.step = 1; r.visit = false; r.lastRoute = null; this.metrics.walkBacks++; return; }
      r.waitUntil = now + 1000; return;
    }
    r.route = route.points; r.step = 1; r.visit = visit;
  }

  #steer(r, active, players, dt, now, speedOverride = 0) {
    const rules = this.rules, target = r.route[r.step];
    if (!target) { r.route = null; return 0; } // already at the goal
    let dx = target.x - r.x, dz = target.z - r.z, d = Math.hypot(dx, dz);
    if (d < 0.45) {
      r.step++;
      if (r.step >= r.route.length && r.fleeing) { r.route = null; r.speed = 0; return 0; }
      if (r.step >= r.route.length) { r.lastRoute = r.route; r.route = null; r.speed = 0; r.waitUntil = now + (r.visit ? rules.visitIdleMs : rules.idleMinMs + this.random() * (rules.idleMaxMs - rules.idleMinMs)); }
      return 0;
    }
    let speed = speedOverride || rules.walkSpeed * r.identity.traits.pace;
    let vx = (dx / d) * speed, vz = (dz / d) * speed;
    // Local avoidance: push apart from nearby residents and players; slow and
    // sidestep when a player stands right in the way.
    for (const other of active) {
      if (other === r) continue;
      const ox = r.x - other.x, oz = r.z - other.z, od = Math.hypot(ox, oz);
      if (od > 0.01 && od < rules.npcClearance) { vx += (ox / od) * (rules.npcClearance - od) * 2.5; vz += (oz / od) * (rules.npcClearance - od) * 2.5; }
    }
    for (const p of players) {
      const ox = r.x - p.x, oz = r.z - p.z, od = Math.hypot(ox, oz);
      if (od > 0.01 && od < rules.playerClearance) { vx += (ox / od) * (rules.playerClearance - od) * 3; vz += (oz / od) * (rules.playerClearance - od) * 3; }
      if (od < 2 && (ox * dx + oz * dz) < 0) { vx *= 0.55; vz *= 0.55; vx += (-dz / d) * 0.5; vz += (dx / d) * 0.5; }
    }
    const len = Math.hypot(vx, vz), cap = speed * 1.15;
    if (len > cap) { vx *= cap / len; vz *= cap / len; }
    const from = { x: r.x, z: r.z };
    for (const [mx, mz] of [[vx, vz], [vx, 0], [0, vz]]) {
      const to = { x: r.x + mx * dt, z: r.z + mz * dt };
      if (!insideObstacle(to, this.hard, 0.2) && segmentClear(from, to, this.hard, { pad: 0.2 })) {
        r.x = to.x; r.z = to.z; if (Math.hypot(mx, mz) > 0.05) r.yaw = Math.atan2(mx, mz);
        return Math.hypot(mx, mz);
      }
    }
    return 0;
  }

  #dormantStep(r, now) {
    if (now - r.lastDormantAt < this.rules.dormantStepMs) return;
    const elapsed = r.lastDormantAt ? (now - r.lastDormantAt) / 1000 : 0; r.lastDormantAt = now;
    if (!r.route || now < r.waitUntil) return;
    let budget = this.rules.walkSpeed * r.identity.traits.pace * elapsed;
    while (budget > 0 && r.route && r.step < r.route.length) {
      const t = r.route[r.step], d = dist(t, r);
      if (d <= budget) { r.x = t.x; r.z = t.z; budget -= d; r.step++; } else { r.x += ((t.x - r.x) / d) * budget; r.z += ((t.z - r.z) / d) * budget; budget = 0; }
    }
    if (r.route && r.step >= r.route.length) r.route = null;
  }

  // Server-validated events only (accepted gunshots, hits, eliminations in the
  // city; see RoomCore). Every resident in earshot remembers the event; with
  // reactions on, residents also queue a reaction to the strongest event they
  // heard and remember who caused it.
  stimulus({ type, x, z, sourceId = null, at }) {
    for (const r of this.residents) {
      if (!r.placed) continue;
      const d = dist(r, { x, z });
      if (d <= this.rules.hearingRadius) { r.memory.push({ type, x, z, sourceId, at }); if (r.memory.length > 8) r.memory.shift(); }
      if (!this.reactions) continue;
      const severity = severityOf(type, d);
      if (severity <= 0) continue;
      if (!r.pending || severity > severityOf(r.pending.type, dist(r, r.pending))) r.pending = { type, x, z, sourceId, at, depth: 0 };
      if (sourceId) { r.threats = r.threats.filter((t) => t.sourceId !== sourceId); r.threats.push({ sourceId, at }); }
    }
  }

  #face(r, target) { if (target) r.yaw = Math.atan2(target.x - r.x, target.z - r.z); }

  // A sidewalk destination away from the threat, reached by a walk-graph route
  // (so fleeing never cuts through buildings, cars, fences, or lots).
  #startFlee(r, now) {
    const g = this.#ensureGraph(), candidates = this.#fleeCandidates(r, r.threat);
    for (let tries = 0; tries < 6 && candidates.length; tries++) {
      const goal = candidates.splice(Math.floor(this.random() * candidates.length), 1)[0];
      const route = findRoute(g, r, goal); this.metrics.routes++;
      if (!route.ok || route.points.length < 2) continue;
      Object.assign(r, { route: route.points, step: 1, visit: false, fleeing: true, behavior: NPC_BEHAVIOR.flee, stuckFor: 0 });
      this.metrics.reactions.flee++;
      return true;
    }
    this.metrics.reactions.fleeRouteFailures++;
    return false;
  }

  #fleeCandidates(r, t) {
    const g = this.#ensureGraph(), R = NPC_BEHAVIOR_RULES;
    const ax = r.x - t.x, az = r.z - t.z, alen = Math.hypot(ax, az) || 1, here = dist(r, t);
    return g.nodes.filter((n) => {
      const d = dist(n, r); if (d < R.fleeMin || d > R.fleeMax) return false;
      return ((n.x - r.x) * ax + (n.z - r.z) * az) / (d * alen) > 0.35 && dist(n, t) > here + 20;
    });
  }

  // ---- M6.7B2 self-defense ------------------------------------------------
  // A server-validated hit on a resident (RoomCore resolves player shots).
  damageResident(index, { damage, sourceId, weaponId, from, at }) {
    const B = NPC_BEHAVIOR, C = NPC_COMBAT_RULES, r = this.residents[index];
    if (!this.combat || !r?.placed || r.behavior === B.defeated || at < r.protectionUntil || !(damage > 0)) return null;
    r.health = Math.max(0, r.health - damage); r.lastDamageAt = at; this.metrics.combat.hits++;
    r.lastAttack = { sourceId, weapon: weaponClass(weaponId), x: from?.x ?? r.x, z: from?.z ?? r.z, at };
    if (sourceId) { r.threats = r.threats.filter((t) => t.sourceId !== sourceId); r.threats.push({ sourceId, at }); }
    Object.assign(r, { route: null, fleeing: false, fight: null, speed: 0, pending: null });
    let knockdown = false;
    if (r.health === 0) { Object.assign(r, { behavior: B.defeated, defeatedAt: at, threat: null }); this.metrics.combat.defeats++; }
    else if (damage >= C.knockdownDamage) { Object.assign(r, { behavior: B.knockdown, downUntil: at + C.knockdownMs }); knockdown = true; this.metrics.combat.knockdowns++; }
    else Object.assign(r, { behavior: B.hurt, behaviorUntil: at + C.hurtMs });
    // Aggressive residents right beside the victim may step in; everyone else
    // nearby hears it as violence (M6.7B1 reactions).
    for (const other of this.residents) if (other !== r && other.active && other.personality === 'aggressive' && dist(other, r) <= C.allyRadius) other.allyAttack = { ...r.lastAttack };
    this.stimulus({ type: 'violence', x: r.x, z: r.z, sourceId, at });
    r.pending = null;
    return { health: Math.round(r.health), knockdown, defeated: r.behavior === B.defeated };
  }

  // Where a resident was at `time` (M6.9 dev3): from the last second of ticks, interpolated.
  #residentAt(r, time) {
    const trail = r.trail; if (!trail?.length || time >= trail[trail.length - 1].t) return r;
    let i = trail.length - 1; while (i > 0 && trail[i].t > time) i--;
    const a = trail[i], b = trail[i + 1]; if (!b || a.t > time) return a;
    const k = (time - a.t) / Math.max(1, b.t - a.t), dy = Math.atan2(Math.sin(b.yaw - a.yaw), Math.cos(b.yaw - a.yaw));
    return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, yaw: a.yaw + dy * k };
  }
  // Nearest resident a shot would hit before `limit` metres. Interior walls
  // (publicCityShotOccluded) and city buildings, houses, and fences block it;
  // with structureOcclusion, the 3D city structures block it instead, exactly
  // as they block shots at players.
  // regions (M6.9 dev3): judge the shot against each resident's body regions where it stood at `at`
  // (unarmed stance, scaled to its height and build), and report the region hit.
  shotHit(origin, direction, limit, { at = null, regions = false } = {}) {
    if (!this.combat) return null;
    this.#ensureGraph();
    let best = null;
    for (const r of this.residents) {
      if (!r.active || r.behavior === NPC_BEHAVIOR.defeated || isInsideSafeZone({ x: r.x, y: 0, z: r.z })) continue;
      let d, region = null;
      if (regions) {
        const p = at === null ? r : this.#residentAt(r, at), look = r.identity.appearance;
        const hit = bodyHit(origin, direction, { x: p.x, y: 0, z: p.z }, p.yaw || 0, { stance: 'unarmed', height: NPC_BODY_HEIGHT * (look?.height || 1), girth: look?.build || 1, moving: (r.speed || 0) > 0.3 });
        d = hit?.distance ?? null; region = hit?.region ?? null;
      } else d = targetDistance(origin, direction, { x: r.x, y: 0, z: r.z });
      if (d === null || d > limit) continue;
      if (this.structureOcclusion ? this.structureOcclusion(origin, direction, d) : publicCityShotOccluded(origin, direction, d) || !segmentClear(origin, r, this.shotBlockers, { pad: 0 })) continue;
      if (!best || d < best.distance) best = { index: r.index, distance: d, ...(region ? { region } : {}) };
    }
    return best;
  }

  drainStrikes() { const strikes = this.strikes; this.strikes = []; return strikes; }

  #targetable(p) { return p && !p.dead && !p.safe && !p.protected; }
  // Reach, line of sight through the city (buildings, walls, fences), and target state.
  canStrike(r, p) {
    const d = dist(r, p);
    if (!this.#targetable(p) || d > NPC_COMBAT_RULES.strikeReach) return false;
    if (!segmentClear(r, p, this.hard, { pad: 0 })) return false;
    const origin = { x: r.x, y: 1.35, z: r.z }, dir = { x: (p.x - r.x) / (d || 1), y: 0, z: (p.z - r.z) / (d || 1) };
    return d < 0.05 || !publicCityShotOccluded(origin, dir, d);
  }

  #assess(r, players, now, attack, ally = false) {
    const B = NPC_BEHAVIOR, C = NPC_COMBAT_RULES;
    if (!attack) { Object.assign(r, { behavior: B.alert, behaviorUntil: now + NPC_BEHAVIOR_RULES.alertMs }); return; }
    const attacker = players.find((p) => p.id === attack.sourceId);
    const at = attacker || attack, distance = attacker ? dist(attacker, r) : Infinity;
    const attackers = new Set(r.threats.filter((t) => now - t.at < 10_000 && players.some((p) => p.id === t.sourceId && dist(p, r) < C.engageRadius)).map((t) => t.sourceId)).size || 1;
    const escape = this.#fleeCandidates(r, at).length > 0;
    const decision = assessThreat({ personality: r.personality, health: r.health, distance, weapon: attack.weapon, attackers, escape, attacked: !ally, allyAttacked: ally });
    this.metrics.combat[decision]++;
    r.threat = { x: at.x, z: at.z, sourceId: attack.sourceId };
    const profile = decision === 'fight' && this.#targetable(attacker) ? strikeProfile(r.personality, !escape) : null;
    if (profile) { Object.assign(r, { behavior: B.fight, fight: { targetId: attacker.id, profile, since: now, nextStrikeAt: now + 400, repathAt: 0 }, route: null, fleeing: false }); return; }
    if (decision === 'warn') { Object.assign(r, { behavior: B.warn, behaviorUntil: now + C.warnMs }); return; }
    if (decision === 'flee' && this.#startFlee(r, now)) return;
    Object.assign(r, { behavior: B.alert, behaviorUntil: now + NPC_BEHAVIOR_RULES.alertMs }); // cower in place
  }

  #fightStep(r, players, active, dt, now) {
    const B = NPC_BEHAVIOR, C = NPC_COMBAT_RULES, f = r.fight;
    const target = players.find((p) => p.id === f.targetId);
    const remembered = r.threats.some((t) => t.sourceId === f.targetId);
    if (!this.#targetable(target) || !remembered || dist(target, r) > C.engageRadius || now - f.since > C.fightTimeoutMs) {
      Object.assign(r, { fight: null, route: null, behavior: B.alert, behaviorUntil: now + 4000 }); this.metrics.combat.disengaged++; return;
    }
    if (r.health < f.profile.retreatAt) {
      Object.assign(r, { fight: null, route: null, threat: { x: target.x, z: target.z, sourceId: target.id } }); this.metrics.combat.retreats++;
      if (!this.#startFlee(r, now)) Object.assign(r, { behavior: B.alert, behaviorUntil: now + NPC_BEHAVIOR_RULES.alertMs });
      return;
    }
    const d = dist(target, r); this.#face(r, target);
    if (d > C.strikeRange) {
      r.behavior = B.fight;
      if (!r.route || now >= f.repathAt) {
        if (segmentClear(r, target, this.hard, { pad: 0.2 })) r.route = [{ x: r.x, z: r.z }, { x: target.x, z: target.z }];
        else { const route = findRoute(this.#ensureGraph(), r, target); this.metrics.routes++; r.route = route.ok ? route.points : null; }
        r.step = 1; f.repathAt = now + 600;
      }
      const speed = r.route ? this.#steer(r, active, players.filter((p) => p.id !== target.id), dt, now, C.approachSpeed) : 0;
      r.speed = speed; r.anim = speed > 0.2 ? NPC_ANIM.walk : NPC_ANIM.notice;
      if (!r.route) r.route = null;
      return;
    }
    Object.assign(r, { route: null, speed: 0, anim: NPC_ANIM.notice });
    if (now >= f.nextStrikeAt) {
      if (this.canStrike(r, target)) { this.strikes.push({ npcIndex: r.index, targetId: target.id, damage: f.profile.damage, at: now }); Object.assign(r, { behavior: B.strike, strikeUntil: now + 500 }); this.metrics.combat.strikes++; }
      f.nextStrikeAt = now + f.profile.cooldownMs;
    } else if (r.behavior === B.strike && now >= r.strikeUntil) r.behavior = B.fight;
  }

  // Combat states for one resident; true when combat controls it this tick.
  #combatStep(r, players, active, dt, now) {
    const B = NPC_BEHAVIOR, C = NPC_COMBAT_RULES;
    if (r.behavior !== B.defeated && r.health < C.maxHealth && now - r.lastDamageAt > C.regenDelayMs) r.health = Math.min(C.maxHealth, r.health + C.regenPerSecond * (this.rules.tickMs / 1000));
    switch (r.behavior) {
      case B.defeated:
        Object.assign(r, { speed: 0, anim: NPC_ANIM.idle });
        if (now - r.defeatedAt >= C.defeatedMinMs && (this.#outOfSight(r, players) || now - r.defeatedAt >= C.defeatedMaxMs) && this.#placeNear(r, players)) { r.protectionUntil = now + C.respawnProtectionMs; this.metrics.combat.respawns++; }
        return true;
      case B.knockdown:
        Object.assign(r, { speed: 0, anim: NPC_ANIM.idle });
        if (now >= r.downUntil) this.#assess(r, players, now, r.lastAttack);
        return true;
      case B.hurt:
        Object.assign(r, { speed: 0, anim: NPC_ANIM.notice });
        if (now >= r.behaviorUntil) this.#assess(r, players, now, r.lastAttack);
        return true;
      case B.warn: {
        Object.assign(r, { speed: 0, anim: NPC_ANIM.notice }); this.#face(r, r.threat);
        if (now >= r.behaviorUntil && !this.#startFlee(r, now)) Object.assign(r, { behavior: B.alert, behaviorUntil: now + NPC_BEHAVIOR_RULES.alertMs });
        return true;
      }
      case B.fight: case B.strike:
        this.#fightStep(r, players, active, dt, now);
        return true;
    }
    if (r.allyAttack) {
      const a = r.allyAttack; r.allyAttack = null;
      if (now - a.at < 3000 && r.behavior !== B.flee) { this.#assess(r, players, now, a, true); return r.behavior !== B.calm; }
    }
    return false;
  }

  // One resident's awareness and reactions for this tick. Returns true when a
  // reaction (not the walking routine) controls the resident.
  #behave(r, players, active, dt, now) {
    const B = NPC_BEHAVIOR, R = NPC_BEHAVIOR_RULES;
    if (this.combat && this.#combatStep(r, players, active, dt, now)) return true;
    const react = (behavior, ms, reaction, threat) => {
      Object.assign(r, { behavior, behaviorUntil: now + ms, reaction, threat, fleeing: false, speed: 0 });
      if (behavior !== B.greet && behavior !== B.wary) r.route = null; // stop and reassess; greetings keep the walk
    };
    if (r.pending) {
      const p = r.pending; r.pending = null;
      const reaction = now - p.at < 3000 ? reactionTo(r.personality, p.type, dist(r, p)) : 'ignore';
      if (r.behavior === B.flee && reaction !== 'ignore') r.threat = { x: p.x, z: p.z, sourceId: p.sourceId }; // keep running; note the new danger
      else if (reaction !== 'ignore') {
        const startle = p.type !== 'panic' || reaction === 'flee';
        react(startle ? B.startled : B.alert, startle ? R.startleMs : R.alertMs, reaction, { x: p.x, z: p.z, sourceId: p.sourceId });
        this.metrics.reactions[startle ? 'startled' : 'alert']++;
        if (p.depth < R.panicDepth) this.panicQueue.push({ x: r.x, z: r.z, sourceId: p.sourceId, depth: p.depth + 1, from: r.index });
      }
    }
    // Someone who caused trouble recently comes close again.
    if (r.behavior === B.calm && r.threats.length) {
      for (const t of r.threats) {
        const player = players.find((p) => p.id === t.sourceId);
        if (!player || dist(player, r) >= R.wariness) continue;
        const flee = r.personality === 'cautious' || r.personality === 'peaceful';
        react(flee ? B.startled : B.wary, flee ? R.startleMs : R.alertMs, flee ? 'flee' : 'alert', { x: player.x, z: player.z, sourceId: player.id });
        this.metrics.reactions.remembered++;
        break;
      }
    }
    const target = r.greetTarget ? players.find((p) => p.id === r.greetTarget) : r.threat?.sourceId && r.behavior !== B.flee ? players.find((p) => p.id === r.threat.sourceId) || r.threat : r.threat;
    switch (r.behavior) {
      case B.startled:
        r.speed = 0; r.anim = NPC_ANIM.notice; this.#face(r, r.threat);
        if (now >= r.behaviorUntil && !(r.reaction === 'flee' && this.#startFlee(r, now))) Object.assign(r, { behavior: B.alert, behaviorUntil: now + R.alertMs });
        return true;
      case B.flee: {
        const speed = r.route ? this.#steer(r, active, players, dt, now, R.fleeSpeed * r.identity.traits.pace) : 0;
        r.speed = speed; r.anim = speed > 0.2 ? NPC_ANIM.walk : NPC_ANIM.notice;
        if (!r.route) Object.assign(r, { fleeing: false, behavior: B.alert, behaviorUntil: now + R.recoverMs });
        else if (speed < 0.05 && (r.stuckFor += dt) > 2) { r.stuckFor = 0; if (!this.#startFlee(r, now)) Object.assign(r, { route: null, fleeing: false, behavior: B.alert, behaviorUntil: now + R.recoverMs }); }
        else if (speed >= 0.05) r.stuckFor = 0;
        return true;
      }
      case B.alert: case B.wary: case B.greet:
        r.speed = 0; r.anim = NPC_ANIM.notice; this.#face(r, target);
        if (now >= r.behaviorUntil) { Object.assign(r, { behavior: B.calm, threat: null, greetTarget: null, reaction: null }); if (!r.route) r.waitUntil = Math.max(r.waitUntil, now + 800); }
        return true;
    }
    // Calm: greet, or watch, a player who steps close (once a minute each).
    if (r.aware && r.aware.distance <= R.greetRadius && now - (r.greeted.get(r.aware.playerId) || -Infinity) >= R.greetCooldownMs) {
      r.greeted.set(r.aware.playerId, now);
      const response = greetingFor(r.personality, r.identity.traits.sociability);
      if (response) {
        react(response === 'greet' ? B.greet : B.wary, R.greetMs, null, null);
        r.greetTarget = r.aware.playerId; r.anim = NPC_ANIM.notice; this.#face(r, r.aware);
        this.metrics.reactions[response]++;
        return true;
      }
    }
    return false;
  }

  // Secondhand panic: residents near a startled or fleeing one react too
  // (one hop only, so it cannot cascade across the city).
  #spreadPanic(now) {
    for (const p of this.panicQueue) for (const r of this.residents) {
      if (!r.active || r.index === p.from || r.behavior !== NPC_BEHAVIOR.calm) continue;
      const severity = severityOf('panic', dist(r, p));
      if (severity <= 0 || (r.pending && severity <= severityOf(r.pending.type, dist(r, r.pending)))) continue;
      r.pending = { type: 'panic', x: p.x, z: p.z, sourceId: p.sourceId, at: now, depth: p.depth };
      this.metrics.reactions.panicked++;
    }
    this.panicQueue = [];
  }

  // players: [{ id, x, z, receives }] for every connected human in the city.
  // Returns [{ to, message }] for players that receive NPC traffic.
  tick(now, players) {
    const rules = this.rules, out = [];
    for (const id of this.viewers.keys()) if (!players.some((p) => p.id === id && p.receives)) this.viewers.delete(id);
    if (!players.length) {
      for (const r of this.residents) {
        Object.assign(r, { active: false, aware: null, fight: null, allyAttack: null });
        if ([NPC_BEHAVIOR.fight, NPC_BEHAVIOR.strike, NPC_BEHAVIOR.warn, NPC_BEHAVIOR.hurt].includes(r.behavior)) r.behavior = NPC_BEHAVIOR.alert; // nobody left to fight
      }
      this.metrics.active = 0; return out;
    }
    this.#ensureGraph(); this.metrics.ticks++;
    const dt = rules.tickMs / 1000;
    // Place on first use, then relocate residents nobody is near (out of sight).
    let relocations = 0;
    for (const r of this.residents) {
      if (!r.placed) { this.#reset(r, this.#streetPoint()); r.lastDormantAt = now; }
      const nearest = Math.min(...players.map((p) => dist(p, r)));
      r.nearest = nearest;
      if (nearest > rules.relocateRadius && relocations < rules.relocationsPerTick && this.#placeNear(r, players)) { relocations++; r.nearest = Math.min(...players.map((p) => dist(p, r))); }
    }
    // Activate the residents nearest to players.
    const ranked = this.residents.filter((r) => r.nearest <= rules.activeRadius).sort((a, b) => a.nearest - b.nearest);
    const active = ranked.slice(0, this.maxActive);
    for (const r of this.residents) r.active = false;
    for (const r of active) r.active = true;
    this.metrics.active = active.length;
    for (const r of this.residents) {
      r.memory = r.memory.filter((m) => now - m.at < rules.memoryMs);
      if (r.threats.length) r.threats = r.threats.filter((t) => now - t.at < NPC_BEHAVIOR_RULES.threatMemoryMs); // forget on time, active or not
      if (!r.active) {
        // A defeated resident stays down until it can respawn out of sight.
        if (r.behavior === NPC_BEHAVIOR.defeated && !this.#outOfSight(r, players)) { r.speed = 0; continue; }
        if (r.behavior === NPC_BEHAVIOR.defeated) Object.assign(r, { health: NPC_COMBAT_RULES.maxHealth, defeatedAt: 0, protectionUntil: now + NPC_COMBAT_RULES.respawnProtectionMs });
        Object.assign(r, { speed: 0, anim: NPC_ANIM.idle, aware: null, pending: null, behavior: NPC_BEHAVIOR.calm, fleeing: false, threat: null, fight: null, allyAttack: null });
        if (r.route && r.fleeing === false && r.reaction === 'flee') r.route = null;
        this.#dormantStep(r, now); continue;
      }
      r.lastDormantAt = now;
      // Notice the nearest player within range (awareness hook; facing only).
      let aware = null;
      for (const p of players) { const d = dist(p, r); if (d <= rules.noticeRadius && (!aware || d < aware.distance)) aware = { playerId: p.id, distance: d, x: p.x, z: p.z }; }
      r.aware = aware;
      if (this.reactions && this.#behave(r, players, active, dt, now)) continue;
      if (now < r.waitUntil) {
        r.speed = 0; r.anim = aware && aware.distance < 4 ? NPC_ANIM.notice : NPC_ANIM.idle;
        if (r.anim === NPC_ANIM.notice) r.yaw = Math.atan2(aware.x - r.x, aware.z - r.z);
        continue;
      }
      if (!r.route) { this.#plan(r, now); if (!r.route) { r.speed = 0; r.anim = NPC_ANIM.idle; continue; } }
      const speed = this.#steer(r, active, players, dt, now);
      r.speed = speed; r.anim = speed > 0.2 ? NPC_ANIM.walk : NPC_ANIM.idle;
      if (r.route && speed < 0.05) {
        r.stuckFor += dt;
        if (r.stuckFor > 3) { r.route = null; r.stuckFor = 0; this.metrics.replans++; if (r.nearest >= rules.spawnMinDistance) this.#placeNear(r, players); }
      } else r.stuckFor = 0;
    }
    if (this.reactions) this.#spreadPanic(now);
    // Per-player interest: nearest residents within range, changed-only states,
    // a roster entry the first time a resident becomes relevant.
    for (const viewer of players) {
      if (!viewer.receives) continue;
      const known = this.viewers.get(viewer.id) || new Map(); this.viewers.set(viewer.id, known);
      const relevant = active.map((r) => [r, dist(r, viewer)]).filter(([, d]) => d <= rules.sendRadius).sort((a, b) => a[1] - b[1]).slice(0, rules.maxSendPerPlayer).map(([r]) => r);
      const roster = [], states = [], removed = [];
      const keep = new Set(relevant.map((r) => r.index));
      for (const index of known.keys()) if (!keep.has(index)) { removed.push(index); known.delete(index); }
      for (const r of relevant) {
        const state = [r.index, Math.round(r.x * 10), Math.round(r.z * 10), Math.round(((r.yaw % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / (2 * Math.PI) * 255), r.anim, Math.round(r.speed * 10)];
        if (this.reactions) state.push(r.behavior); // optional 7th value; M6.7A clients ignore it
        if (this.combat) state.push(Math.round(r.health)); // optional 8th value (M6.7B2)
        const sig = state.slice(1).join(','), entry = known.get(r.index);
        if (!entry) { roster.push(r.identity); known.set(r.index, { at: now, sig }); states.push(state); continue; }
        if (entry.sig !== sig || now - entry.at >= rules.keyframeMs) { entry.at = now; entry.sig = sig; states.push(state); }
      }
      if (roster.length) out.push({ to: viewer.id, message: { v: PROTOCOL_VERSION, type: 'npc-roster', npcs: roster } });
      if (states.length || removed.length) out.push({ to: viewer.id, message: { v: PROTOCOL_VERSION, type: 'npc-states', serverTime: now, s: states, r: removed } });
    }
    for (const { message } of out) { this.metrics.bytes += JSON.stringify(message).length; this.metrics.messages++; }
    // M6.9 dev3: the last second of positions, so shots are judged where residents were when aimed at
    for (const r of this.residents) if (r.active) { (r.trail ||= []).push({ t: now, x: r.x, z: r.z, yaw: r.yaw }); if (r.trail.length > 7) r.trail.shift(); }
    return out;
  }

  // Test and diagnostics view (never sent to clients).
  snapshot() { return this.residents.map((r) => ({ id: r.identity.id, x: r.x, z: r.z, active: r.active, anim: r.anim, speed: r.speed, memory: r.memory.length, aware: r.aware?.playerId || null, personality: r.personality, behavior: r.behavior, threats: r.threats.length, health: r.health, fightTarget: r.fight?.targetId || null })); }
}
