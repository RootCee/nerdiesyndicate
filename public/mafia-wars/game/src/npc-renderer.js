// M6.7A NPC presentation (client). Keeps the residents the server says are
// near this player, interpolates their server positions, and draws only the
// nearest few (iPhone 10, Mac 16) with distance-based animation rates. No name
// labels, no minimap markers: residents are scenery until M6.7B gives them
// behaviour. Decoding and selection are pure so Node tests cover them.
import { interpolateSnapshots } from './multiplayer-protocol.js';
import { isNpcId, npcIdentityValid } from './npc-schema.js';
import { NPC_BEHAVIOR, personalityOf } from './npc-behavior.js';
import { applySeatedPose, findSeatBones } from './seated-pose.js';
const NPC_ANIM_SIT = 3; // npc-sim.js NPC_ANIM.sit (not imported: the simulation module is server-side)

export const NPC_RENDER_RULES = Object.freeze({
  drawRadius: 70, maxDrawnMobile: 10, maxDrawnDesktop: 16,
  interpolationMs: 350,          // 200 ms ticks + jitter
  combatDelayMs: 120,            // M6.9 sync: residents in a fight are drawn this far behind instead (extrapolating up to a tick)
  combatLiveMs: 2500,            // ...for this long after their last strike or hit
  strikeShowMs: 520, hurtShowMs: 450, knockdownShowMs: 2200, defeatShowMs: 1500,
  fullRateRadius: 25, halfRateRadius: 50, // animation updates: every frame / every 2nd / every 4th
  hiddenDisposeMs: 8000, walkClipSpeed: 1.3, playerRadius: 0.75,
  fleeClipSpeed: 3.4,
  buildsPerFrame: 2,             // spread first-appearance cost (one build is ~2-5 ms)
});

// [index, x*10, z*10, yaw/2π*255, anim, speed*10, behavior?, health?] -> plain state.
// The 7th (M6.7B1 behaviour) and 8th (M6.7B2 health) values are optional.
export function decodeNpcState(raw, at) {
  if (!Array.isArray(raw) || raw.length < 6 || !raw.every(Number.isFinite)) return null;
  const [index, x, z, yaw, anim, speed, behavior = NPC_BEHAVIOR.calm, health = 100] = raw;
  return { index, at, x: x / 10, y: 0, z: z / 10, yaw: (yaw / 255) * Math.PI * 2, state: anim, speed: speed / 10, behavior, health };
}

// Which clip a resident plays for its behaviour (pure, for tests).
export function npcClipFor(behavior, walking, speed, identity, { side = 0 } = {}) {
  if (behavior === NPC_BEHAVIOR.defeated || behavior === NPC_BEHAVIOR.knockdown) return { name: 'Death', once: true };
  if (behavior === NPC_BEHAVIOR.strike) return { name: side && personalityOf(identity) === 'aggressive' ? 'Kick_Right' : side ? 'Punch_Right' : 'Punch_Left', once: true };
  if (behavior === NPC_BEHAVIOR.hurt) return { name: 'HitRecieve_2', once: true };
  if (behavior === NPC_BEHAVIOR.warn) return { name: 'Interact' };
  if (behavior === NPC_BEHAVIOR.fight) return speed > 0.5 ? { name: 'Run', timeScale: Math.min(1.3, Math.max(0.7, speed / NPC_RENDER_RULES.fleeClipSpeed)) } : { name: 'Idle_Neutral' };
  if (behavior === NPC_BEHAVIOR.flee && speed > 0.5) return { name: 'Run', timeScale: Math.min(1.4, Math.max(0.7, speed / NPC_RENDER_RULES.fleeClipSpeed)) };
  if (behavior === NPC_BEHAVIOR.startled) return { name: 'HitRecieve', once: true };
  if (behavior === NPC_BEHAVIOR.greet) return { name: 'Wave' };
  if (behavior === NPC_BEHAVIOR.alert || behavior === NPC_BEHAVIOR.wary) return { name: 'Idle_Neutral' };
  if (walking) return { name: 'Walk', timeScale: Math.min(1.5, Math.max(0.6, speed / NPC_RENDER_RULES.walkClipSpeed)) };
  return { name: identity.traits.sociability > 0.5 ? 'Idle' : 'Idle_Neutral' };
}
export const npcIndexOf = (id) => (isNpcId(id) ? parseInt(id.slice(2), 36) : -1);

// Nearest residents within range, capped (pure).
export function selectDrawn(entries, viewer, maxDrawn, radius = NPC_RENDER_RULES.drawRadius) {
  return entries.filter((e) => e.render && e.identity).map((e) => [e, Math.hypot(e.render.x - viewer.x, e.render.z - viewer.z)])
    .filter(([, d]) => d <= radius).sort((a, b) => a[1] - b[1]).slice(0, maxDrawn).map(([e, d]) => { e.distance = d; return e; });
}

export class NpcRenderer {
  constructor(scene, { mobile = false, library, groundAt = () => 0, castShadow = false } = {}) {
    this.scene = scene; this.library = library; this.groundAt = groundAt; this.castShadow = castShadow;
    this.maxDrawn = mobile ? NPC_RENDER_RULES.maxDrawnMobile : NPC_RENDER_RULES.maxDrawnDesktop;
    this.entries = new Map(); this.frame = 0;
    this.stats = { known: 0, drawn: 0, visuals: 0, mixerUpdates: 0, updateMs: 0, bytes: 0, bytesPerSec: 0, rejected: 0, alert: 0, fleeing: 0, fighting: 0, down: 0 };
    this.bytesWindow = { start: 0, bytes: 0 };
  }
  countBytes(n, now) {
    this.stats.bytes += n; this.bytesWindow.bytes += n;
    if (now - this.bytesWindow.start >= 2000) { this.stats.bytesPerSec = Math.round(this.bytesWindow.bytes * 1000 / Math.max(1, now - this.bytesWindow.start)); this.bytesWindow = { start: now, bytes: 0 }; }
  }
  applyRoster(npcs = []) {
    for (const identity of npcs) {
      if (!npcIdentityValid(identity)) { this.stats.rejected++; continue; }
      const index = npcIndexOf(identity.id), entry = this.entries.get(index) || { snapshots: [], render: null, visual: null, hiddenAt: 0 };
      entry.identity = identity; this.entries.set(index, entry);
      this.library.ensureNpcPack(identity.appearance.pack).catch(() => {});
    }
  }
  applyStates(message) {
    for (const raw of message.s || []) {
      const state = decodeNpcState(raw, message.serverTime); if (!state) continue;
      const entry = this.entries.get(state.index) || { snapshots: [], render: null, visual: null, hiddenAt: 0 };
      entry.snapshots.push(state); if (entry.snapshots.length > 8) entry.snapshots.shift();
      this.entries.set(state.index, entry);
    }
    for (const index of message.r || []) this.#remove(index);
  }
  // M6.9 dev3.1: residents as drawn right now, for the crosshair to converge on
  aimTargets() {
    const out = [];
    for (const e of this.entries.values()) if (e.visual?.root.visible && e.render && e.render.behavior !== NPC_BEHAVIOR.defeated) out.push({ x: e.render.x, y: e.visual.root.position.y, z: e.render.z, yaw: e.render.yaw, speed: e.render.speed || 0, appearance: e.identity.appearance });
    return out;
  }
  // M6.9 sync: a strike or hit is shown the moment its message arrives (every client gets it at the same
  // time), at the resident's real position (the event's pose), instead of 350-900 ms later from states.
  onEvent(message, now = performance.now()) {
    if (message?.type !== 'npc-strike' && message?.type !== 'npc-hit') return false;
    const e = this.entries.get(message.npc); if (!e) return false;
    const B = NPC_BEHAVIOR, R = NPC_RENDER_RULES, strike = message.type === 'npc-strike';
    const behavior = strike ? B.strike : message.defeated ? B.defeated : message.knockdown ? B.knockdown : B.hurt;
    e.action = { behavior, until: now + (strike ? R.strikeShowMs : message.defeated ? R.defeatShowMs : message.knockdown ? R.knockdownShowMs : R.hurtShowMs) };
    if (strike) e.strikeSide = (e.strikeSide || 0) ^ 1; // alternate hands
    const pose = Array.isArray(message.pose) && message.pose.length === 3 ? decodeNpcState([message.npc, ...message.pose, 1, 0, behavior], message.serverTime) : null;
    if (pose) { e.snapshots = e.snapshots.filter((s) => s.at !== pose.at).concat(pose).sort((a, b) => a.at - b.at).slice(-8); }
    e.liveUntil = now + R.combatLiveMs;
    return true;
  }
  #remove(index) { const e = this.entries.get(index); if (e?.visual) e.visual.dispose(); this.entries.delete(index); }
  clear() { for (const index of [...this.entries.keys()]) this.#remove(index); this.stats.drawn = 0; this.stats.visuals = 0; }

  update(dt, serverNow, viewer, now = performance.now()) {
    const started = performance.now(); this.frame++;
    const R = NPC_RENDER_RULES, renderAt = serverNow - R.interpolationMs;
    for (const e of this.entries.values()) if (e.snapshots.length) {
      // a resident in a fight blends to a near-live position (copy: the slow path still needs the older states)
      const liveTarget = (e.liveUntil || 0) > now ? 1 : 0;
      e.liveBlend = Math.max(0, Math.min(1, (e.liveBlend || 0) + Math.sign(liveTarget - (e.liveBlend || 0)) * Math.min(Math.abs(liveTarget - (e.liveBlend || 0)), dt * (liveTarget ? 10 : 2.5))));
      const live = e.liveBlend > 0 ? interpolateSnapshots(e.snapshots.slice(), serverNow - R.combatDelayMs, e.live || (e.live = {}), 200) : null;
      e.render = interpolateSnapshots(e.snapshots, renderAt, e.render || {}, 0);
      const [a, b] = e.snapshots, latest = b && b.at <= renderAt ? b : a; e.render.behavior = latest.behavior; e.render.health = latest.health; // discrete: no blending
      if (live) {
        const k = e.liveBlend, dy = Math.atan2(Math.sin(live.yaw - e.render.yaw), Math.cos(live.yaw - e.render.yaw));
        e.render.x += (live.x - e.render.x) * k; e.render.z += (live.z - e.render.z) * k; e.render.yaw += dy * k;
        if (k > 0.5) { const recent = e.snapshots.filter((s) => s.at <= serverNow - R.combatDelayMs).pop(); if (recent) { e.render.behavior = recent.behavior; e.render.health = recent.health; } }
      }
      e.render.forcedBehavior = e.action && now < e.action.until ? e.action.behavior : undefined;
    }
    const drawn = new Set(selectDrawn([...this.entries.values()], viewer, this.maxDrawn));
    let visuals = 0, mixerUpdates = 0, builds = 0, alert = 0, fleeing = 0, fighting = 0, down = 0;
    for (const e of this.entries.values()) {
      if (!drawn.has(e)) {
        if (e.visual) { e.visual.root.visible = false; e.hiddenAt ||= now; if (now - e.hiddenAt > NPC_RENDER_RULES.hiddenDisposeMs) { e.visual.dispose(); e.visual = null; } }
        if (e.visual) visuals++;
        continue;
      }
      e.hiddenAt = 0;
      if (!e.visual && builds < NPC_RENDER_RULES.buildsPerFrame && this.library.npcPackReady(e.identity.appearance.pack)) {
        builds++;
        e.visual = this.library.buildNpcVisual(e.identity, { castShadow: this.castShadow });
        if (e.visual) { this.scene.add(e.visual.root); e.animAccum = 0; }
      }
      if (!e.visual) continue;
      visuals++;
      const v = e.visual, r = e.render;
      v.root.visible = true;
      v.root.position.set(r.x, this.groundAt(r.x, r.z), r.z); v.root.rotation.y = r.yaw;
      const behavior = r.forcedBehavior ?? r.behavior; // a strike/hit event wins over the (delayed) state
      if (behavior === NPC_BEHAVIOR.strike && e.lastBehavior !== NPC_BEHAVIOR.strike && r.forcedBehavior === undefined) e.strikeSide = (e.strikeSide || 0) ^ 1; // alternate hands
      const clip = npcClipFor(behavior, r.state === 1 && r.speed > 0.2, r.speed, e.identity, { side: e.strikeSide || 0 });
      const gettingUp = (e.lastBehavior === NPC_BEHAVIOR.knockdown || e.lastBehavior === NPC_BEHAVIOR.defeated) && clip.name !== 'Death';
      v.play(clip.name, gettingUp ? 0.7 : clip.once ? 0.1 : 0.25, clip.once); // slow blend from the fall pose = getting up
      e.lastBehavior = behavior;
      if (clip.timeScale && v.current) v.current.timeScale = clip.timeScale;
      if (behavior === NPC_BEHAVIOR.flee) fleeing++;
      else if (behavior === NPC_BEHAVIOR.fight || behavior === NPC_BEHAVIOR.strike) fighting++;
      else if (behavior === NPC_BEHAVIOR.knockdown || behavior === NPC_BEHAVIOR.defeated) down++;
      else if (behavior !== NPC_BEHAVIOR.calm) alert++;
      // Distance-based animation rate.
      const every = e.distance < NPC_RENDER_RULES.fullRateRadius ? 1 : e.distance < NPC_RENDER_RULES.halfRateRadius ? 2 : 4;
      e.animAccum = (e.animAccum || 0) + dt;
      if (this.frame % every === 0) { v.mixer.update(e.animAccum); e.animAccum = 0; mixerUpdates++; }
      // M7.1D: a resident playing chess (anim 3, npc-sim's NPC_ANIM.sit) sits on the stool facing the board
      if (r.state === NPC_ANIM_SIT && (v.seatBones ||= findSeatBones(v.root))) applySeatedPose(v.root, v.seatBones, { x: r.x, z: r.z, yaw: r.yaw });
    }
    const ms = performance.now() - started;
    Object.assign(this.stats, { known: this.entries.size, drawn: drawn.size, visuals, mixerUpdates, alert, fleeing, fighting, down, updateMs: this.stats.updateMs * 0.9 + ms * 0.1 });
  }

  // Keeps the local player out of drawn residents (soft push, client side).
  pushOut(position) {
    for (const e of this.entries.values()) {
      if (!e.visual?.root.visible || !e.render) continue;
      const dx = position.x - e.render.x, dz = position.z - e.render.z, d = Math.hypot(dx, dz), min = NPC_RENDER_RULES.playerRadius;
      if (d > 0.001 && d < min) { position.x += (dx / d) * (min - d); position.z += (dz / d) * (min - d); }
    }
  }
}
