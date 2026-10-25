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
  noticeRadius: 10, hearingRadius: 45, memoryMs: 30_000,
});
export const NPC_ANIM = Object.freeze({ idle: 0, walk: 1, notice: 2 });

const hard = (obstacles) => obstacles.filter((r) => !r.soft);
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export class CityNpcSimulation {
  constructor({ seed = 'room', maxActive = NPC_POPULATION.startActive, population = NPC_POPULATION.max, plan = createCityPlan(), rules = NPC_SIM_RULES } = {}) {
    this.rules = rules; this.plan = plan; this.random = seededRandom(`sim:${seed}`);
    this.maxActive = Math.max(0, Math.min(NPC_POPULATION.maxActive, maxActive | 0));
    this.identities = seedPopulation(seed, population);
    this.graph = null; this.hard = null; this.pois = cityPois(plan).filter((p) => !p.spaceId || p.kind === 'apartment');
    this.residents = this.identities.map((identity, index) => ({ index, identity, x: 0, z: 0, yaw: 0, speed: 0, anim: NPC_ANIM.idle, route: null, step: 0, waitUntil: 0, stuckFor: 0, active: false, lastDormantAt: 0, placed: false, memory: [], aware: null }));
    this.viewers = new Map(); // playerId -> Map(index -> { at, sig })
    this.metrics = { ticks: 0, active: 0, relocations: 0, routes: 0, routeFailures: 0, failureReasons: {}, walkBacks: 0, replans: 0, bytes: 0, messages: 0 };
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
  #reset(r, p) { Object.assign(r, { x: p.x, z: p.z, route: null, step: 0, speed: 0, anim: NPC_ANIM.idle, waitUntil: 0, stuckFor: 0, placed: true }); }

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

  #steer(r, active, players, dt, now) {
    const rules = this.rules, target = r.route[r.step];
    if (!target) { r.route = null; return 0; } // already at the goal
    let dx = target.x - r.x, dz = target.z - r.z, d = Math.hypot(dx, dz);
    if (d < 0.45) {
      r.step++;
      if (r.step >= r.route.length) { r.lastRoute = r.route; r.route = null; r.speed = 0; r.waitUntil = now + (r.visit ? rules.visitIdleMs : rules.idleMinMs + this.random() * (rules.idleMaxMs - rules.idleMinMs)); }
      return 0;
    }
    let speed = rules.walkSpeed * r.identity.traits.pace;
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

  // Awareness hook for M6.7B: remembers stimuli (e.g. gunshots) heard nearby.
  // M6.7A records them only; it never changes behaviour toward players.
  stimulus({ type, x, z, sourceId = null, at }) {
    for (const r of this.residents) {
      if (!r.placed || dist(r, { x, z }) > this.rules.hearingRadius) continue;
      r.memory.push({ type, x, z, sourceId, at });
      if (r.memory.length > 8) r.memory.shift();
    }
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
      if (!r.active) { r.speed = 0; r.anim = NPC_ANIM.idle; r.aware = null; this.#dormantStep(r, now); continue; }
      r.lastDormantAt = now;
      // Notice the nearest player within range (awareness hook; facing only).
      let aware = null;
      for (const p of players) { const d = dist(p, r); if (d <= rules.noticeRadius && (!aware || d < aware.distance)) aware = { playerId: p.id, distance: d, x: p.x, z: p.z }; }
      r.aware = aware;
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
  snapshot() { return this.residents.map((r) => ({ id: r.identity.id, x: r.x, z: r.z, active: r.active, anim: r.anim, speed: r.speed, memory: r.memory.length, aware: r.aware?.playerId || null })); }
}
