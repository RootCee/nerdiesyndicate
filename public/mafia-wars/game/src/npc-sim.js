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
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export class CityNpcSimulation {
  // reactions: M6.7B1 awareness and reactions (off = exactly M6.7A behaviour).
  constructor({ seed = 'room', maxActive = NPC_POPULATION.startActive, population = NPC_POPULATION.max, plan = createCityPlan(), rules = NPC_SIM_RULES, reactions = false } = {}) {
    this.reactions = reactions === true; this.panicQueue = [];
    this.rules = rules; this.plan = plan; this.random = seededRandom(`sim:${seed}`);
    this.maxActive = Math.max(0, Math.min(NPC_POPULATION.maxActive, maxActive | 0));
    this.identities = seedPopulation(seed, population);
    this.graph = null; this.hard = null; this.pois = cityPois(plan).filter((p) => !p.spaceId || p.kind === 'apartment');
    this.residents = this.identities.map((identity, index) => ({ index, identity, x: 0, z: 0, yaw: 0, speed: 0, anim: NPC_ANIM.idle, route: null, step: 0, waitUntil: 0, stuckFor: 0, active: false, lastDormantAt: 0, placed: false, memory: [], aware: null,
      personality: personalityOf(identity), behavior: NPC_BEHAVIOR.calm, behaviorUntil: 0, threat: null, reaction: null, pending: null, threats: [], greeted: new Map(), greetTarget: null, fleeing: false }));
    this.viewers = new Map(); // playerId -> Map(index -> { at, sig })
    this.metrics = { ticks: 0, active: 0, relocations: 0, routes: 0, routeFailures: 0, failureReasons: {}, walkBacks: 0, replans: 0, bytes: 0, messages: 0,
      reactions: { startled: 0, alert: 0, flee: 0, fleeRouteFailures: 0, panicked: 0, remembered: 0, greet: 0, wary: 0 } };
  }

  #ensureGraph() {
    if (!this.graph) { this.graph = buildNavGraph(this.plan); this.hard = hard(this.graph.obstacles); }
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
  #reset(r, p) { Object.assign(r, { x: p.x, z: p.z, route: null, step: 0, speed: 0, anim: NPC_ANIM.idle, waitUntil: 0, stuckFor: 0, placed: true, behavior: NPC_BEHAVIOR.calm, threat: null, pending: null, fleeing: false }); }

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
    const g = this.#ensureGraph(), R = NPC_BEHAVIOR_RULES, t = r.threat;
    const ax = r.x - t.x, az = r.z - t.z, alen = Math.hypot(ax, az) || 1, here = dist(r, t);
    const candidates = g.nodes.filter((n) => {
      const d = dist(n, r); if (d < R.fleeMin || d > R.fleeMax) return false;
      return ((n.x - r.x) * ax + (n.z - r.z) * az) / (d * alen) > 0.35 && dist(n, t) > here + 20;
    });
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

  // One resident's awareness and reactions for this tick. Returns true when a
  // reaction (not the walking routine) controls the resident.
  #behave(r, players, active, dt, now) {
    const B = NPC_BEHAVIOR, R = NPC_BEHAVIOR_RULES;
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
    if (!players.length) { for (const r of this.residents) { r.active = false; r.aware = null; } this.metrics.active = 0; return out; }
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
        Object.assign(r, { speed: 0, anim: NPC_ANIM.idle, aware: null, pending: null, behavior: NPC_BEHAVIOR.calm, fleeing: false, threat: null });
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
        const sig = state.slice(1).join(','), entry = known.get(r.index);
        if (!entry) { roster.push(r.identity); known.set(r.index, { at: now, sig }); states.push(state); continue; }
        if (entry.sig !== sig || now - entry.at >= rules.keyframeMs) { entry.at = now; entry.sig = sig; states.push(state); }
      }
      if (roster.length) out.push({ to: viewer.id, message: { v: PROTOCOL_VERSION, type: 'npc-roster', npcs: roster } });
      if (states.length || removed.length) out.push({ to: viewer.id, message: { v: PROTOCOL_VERSION, type: 'npc-states', serverTime: now, s: states, r: removed } });
    }
    for (const { message } of out) { this.metrics.bytes += JSON.stringify(message).length; this.metrics.messages++; }
    return out;
  }

  // Test and diagnostics view (never sent to clients).
  snapshot() { return this.residents.map((r) => ({ id: r.identity.id, x: r.x, z: r.z, active: r.active, anim: r.anim, speed: r.speed, memory: r.memory.length, aware: r.aware?.playerId || null, personality: r.personality, behavior: r.behavior, threats: r.threats.length })); }
}
