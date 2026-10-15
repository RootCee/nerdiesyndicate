// Bots: grid A* navigation over the block, perception by line of sight, burst fire, team deathmatch roles.
import * as THREE from 'three';
import { Character, ROSTER } from './characters.js';
import { colliders, MAP, lineClear, raycastWorld } from './world.js';
import { sfx } from './audio.js';

// ---------- nav grid ----------
const CELL = 1.0;
export const nav = { w: 0, h: 0, blocked: null, cost: null };
export function buildNav() {
  nav.w = Math.ceil((MAP.maxX - MAP.minX) / CELL); nav.h = Math.ceil((MAP.maxZ - MAP.minZ) / CELL);
  nav.blocked = new Uint8Array(nav.w * nav.h); nav.cost = new Float32Array(nav.w * nav.h).fill(1);
  for (let j = 0; j < nav.h; j++) for (let i = 0; i < nav.w; i++) {
    const x = MAP.minX + (i + 0.5) * CELL, z = MAP.minZ + (j + 0.5) * CELL; let b = 0, near = 0;
    for (const c of colliders) {
      if (c.maxY < 0.4) continue;
      if (x > c.minX - 0.45 && x < c.maxX + 0.45 && z > c.minZ - 0.45 && z < c.maxZ + 0.45) { b = 1; break; }
      if (x > c.minX - 1.2 && x < c.maxX + 1.2 && z > c.minZ - 1.2 && z < c.maxZ + 1.2) near = 1;
    }
    nav.blocked[j * nav.w + i] = b; nav.cost[j * nav.w + i] = near ? 1.6 : 1;
  }
}
export const cellOf = (x, z) => [THREE.MathUtils.clamp(Math.floor((x - MAP.minX) / CELL), 0, nav.w - 1), THREE.MathUtils.clamp(Math.floor((z - MAP.minZ) / CELL), 0, nav.h - 1)];
const posOf = (i, j) => new THREE.Vector3(MAP.minX + (i + 0.5) * CELL, 0, MAP.minZ + (j + 0.5) * CELL);
export function freeCellNear(x, z, r = 4) {
  for (let k = 0; k < 40; k++) { const [i, j] = cellOf(x + (Math.random() - 0.5) * r * 2, z + (Math.random() - 0.5) * r * 2); if (!nav.blocked[j * nav.w + i]) return posOf(i, j); }
  return new THREE.Vector3(x, 0, z);
}
// A* with a binary heap
function astar(sx, sz, tx, tz, maxExpand = 6000) {
  const [si, sj] = cellOf(sx, sz), [ti, tj] = cellOf(tx, tz); const W = nav.w, H = nav.h, N = W * H;
  if (nav.blocked[tj * W + ti]) { // nudge target to a free neighbour
    let found = false; for (let r = 1; r <= 4 && !found; r++) for (let dj = -r; dj <= r && !found; dj++) for (let di = -r; di <= r && !found; di++) { const a = ti + di, b = tj + dj; if (a >= 0 && b >= 0 && a < W && b < H && !nav.blocked[b * W + a]) { return astar(sx, sz, MAP.minX + (a + 0.5) * CELL, MAP.minZ + (b + 0.5) * CELL, maxExpand); } }
    return null;
  }
  const g = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const heap = []; const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { let l = 2 * k + 1, r = l + 1, m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  const start = sj * W + si, goal = tj * W + ti; g[start] = 0; push(0, start); let expanded = 0;
  const hfn = (i) => { const a = i % W, b = (i / W) | 0; return Math.hypot(a - ti, b - tj); };
  while (heap.length && expanded++ < maxExpand) {
    const [, cur] = pop(); if (closed[cur]) continue; closed[cur] = 1;
    if (cur === goal) { const path = []; let c = cur; while (c !== -1) { path.push(posOf(c % W, (c / W) | 0)); c = from[c]; } return path.reverse(); }
    const ci = cur % W, cj = (cur / W) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue; const a = ci + di, b = cj + dj; if (a < 0 || b < 0 || a >= W || b >= H) continue; const n = b * W + a; if (nav.blocked[n] || closed[n]) continue;
      if (di && dj && (nav.blocked[cj * W + a] || nav.blocked[b * W + ci])) continue; // no corner cutting
      const ng = g[cur] + (di && dj ? 1.414 : 1) * nav.cost[n];
      if (ng < g[n]) { g[n] = ng; from[n] = cur; push(ng + hfn(n), n); }
    }
  }
  return null;
}

// ---------- bots ----------
const NAMES_RED = ['Merc', 'Alien11', 'Chaser', 'Connor8', 'alex.mercado2859', 'Vurt10', 'Kilo', 'Deebo', 'Lil Rook', 'Trigga'];
const NAMES_BLUE = ['Homie', 'Dre', 'Quan', 'Marcus', 'Tay', 'Smoke', 'Lil Dee', 'Rico', 'Jojo', 'Bam'];
let botId = 0;
const up = new THREE.Vector3(0, 1, 0);
export class Bot {
  constructor(ctx, template, team, pos, opts = {}) {
    this.ctx = ctx; this.team = team; this.id = botId++; this.kind = opts.kind || 'soldier'; this.expires = opts.expires || 0; this.owner = opts.owner || null;
    this.name = opts.name || (team === 'red' ? NAMES_RED[this.id % NAMES_RED.length] : NAMES_BLUE[this.id % NAMES_BLUE.length]);
    this.pos = pos.clone(); this.yaw = Math.random() * 6.28; this.hp = 100; this.dead = false; this.deadT = 0; this.respawnAt = 0; this.kills = 0;
    this.path = null; this.pathI = 0; this.repathT = 0; this.target = null; this.lastSeen = null; this.seeT = 0; this.perceiveT = Math.random() * 0.2; this.burst = 0; this.burstGap = 0; this.fireT = 0; this.reactT = 0;
    this.strafe = 0; this.strafeT = 0; this.wander = null; this.speed = opts.speed || 4.2; this.vel = new THREE.Vector3(); this.spotted = 0; this.lastAttacker = null;
    // model: a Tripo hoodie character for this team, with its own third-person AK
    const pool = ROSTER[team]; const model = opts.model || pool[this.id % pool.length];
    this.ch = new Character(ctx.scene, model, ctx.ghostMat); this.obj = this.ch.obj;
    this.play('Idle_Gun', 0); this.ch.update(0, this.pos, this.yaw, false, false);
  }
  play(name, fade = 0.15, once = false) { this.ch.play(name, fade, once); this.cur = this.ch.cur; }
  get eye() { return new THREE.Vector3(this.pos.x, this.pos.y + 1.55, this.pos.z); }
  get chest() { return new THREE.Vector3(this.pos.x, this.pos.y + 1.15, this.pos.z); }
  damage(n, from, time, point, dir) {
    if (this.dead) return false; this.hp -= n; this.lastAttacker = from;
    if (from && from.team !== this.team) { this.target = from; this.lastSeen = (from.pos || from.position).clone(); this.seeT = time; this.reactT = 0.1; }
    if (this.hp <= 0) { this.die(time); return true; }
    if (Math.random() < 0.25) { this.play('HitRecieve', 0.05, true); this.ch.cur = null; }
    return false;
  }
  die(time) {
    this.dead = true; this.deadT = time; this.respawnAt = time + 5; this.play('Death', 0.08, true); this.ch.ghostVisible = false; this.path = null; this.target = null;
    if (this.kind === 'bomber') this.ctx.explode(this.pos.clone(), this);
  }
  respawn(pos) { this.pos.copy(pos); this.hp = 100; this.dead = false; this.path = null; this.target = null; this.lastSeen = null; this.ch.cur = null; this.play('Idle_Gun', 0); this.ch.update(0, this.pos, this.yaw, false, false); }
  seek(target, time) { this.target = target; this.lastSeen = (target.pos || target.position).clone(); this.seeT = time; }
  // ---------- brain ----------
  update(dt, time) {
    const ctx = this.ctx;
    if (this.dead) { this.ch.update(dt, this.pos, this.yaw, false, true); return; }
    const enemies = ctx.enemiesOf(this.team);
    // perception
    this.perceiveT -= dt;
    if (this.perceiveT <= 0) {
      this.perceiveT = 0.22; let best = null, bd = this.kind === 'bomber' ? 80 : 48;
      const eye = this.eye;
      for (const e of enemies) {
        if (e.dead) continue; const ep = e.pos; const d = ep.distanceTo(this.pos); if (d > bd) continue;
        const tgt = new THREE.Vector3(ep.x, ep.y + 1.2, ep.z);
        if (lineClear(eye, tgt)) { best = e; bd = d; }
      }
      if (best) { if (this.target !== best) this.reactT = 0.3 + Math.random() * 0.3; this.target = best; this.lastSeen = best.pos.clone(); this.seeT = time; }
      else if (this.target && time - this.seeT > 4) this.target = null;
    }
    const seeing = this.target && time - this.seeT < 0.5;
    const tp = this.target ? this.target.pos : null;
    // ---- movement goal ----
    let goal = null, arriveR = 1.2;
    if (this.kind === 'bomber') { goal = tp || this.lastSeen || ctx.hotspot(this.team); arriveR = 0.8; if (tp && tp.distanceTo(this.pos) < 2.6) { this.die(time); return; } }
    else if (this.kind === 'homie' && this.owner && !this.owner.dead && (!seeing || this.owner.pos.distanceTo(this.pos) > 14)) { goal = this.owner.pos; arriveR = 4 + Math.random(); }
    else if (seeing) {
      const d = tp.distanceTo(this.pos);
      if (d > 16) goal = tp, arriveR = 12; else { this.strafeT -= dt; if (this.strafeT <= 0) { this.strafeT = 0.8 + Math.random() * 1.2; this.strafe = Math.random() < 0.5 ? -1 : 1; if (Math.random() < 0.35) this.strafe = 0; } }
    } else if (this.lastSeen && time - this.seeT < 8) { goal = this.lastSeen; arriveR = 2; }
    else { if (!this.wander || this.pos.distanceTo(this.wander) < 2.5 || this.wanderT < time) { this.wander = ctx.hotspot(this.team); this.wanderT = time + 14 + Math.random() * 10; } goal = this.wander; arriveR = 1.5; }
    // ---- pathing ----
    this.repathT -= dt;
    if (goal && (this.repathT <= 0 || !this.path)) {
      this.repathT = 1.2 + Math.random() * 0.8; const dist = goal.distanceTo(this.pos);
      if (dist > arriveR) { const p = astar(this.pos.x, this.pos.z, goal.x, goal.z); this.path = p && p.length > 1 ? p : null; this.pathI = 1; } else this.path = null;
    }
    let move = new THREE.Vector3(); let moving = false;
    if (this.path && goal && goal.distanceTo(this.pos) > arriveR) {
      while (this.pathI < this.path.length - 1 && this.pos.distanceTo(this.path[this.pathI]) < 0.7) this.pathI++;
      const wp = this.path[this.pathI]; move.subVectors(wp, this.pos); move.y = 0; if (move.lengthSq() > 0.01) { move.normalize(); moving = true; }
      if (this.pathI >= this.path.length - 1 && this.pos.distanceTo(wp) < 0.5) this.path = null;
    } else if (seeing && this.strafe) {
      const to = new THREE.Vector3().subVectors(tp, this.pos); to.y = 0; to.normalize(); move.crossVectors(up, to).multiplyScalar(this.strafe); moving = true;
    }
    const spd = this.speed * (this.kind === 'bomber' ? 1.5 : (seeing ? 0.85 : 1));
    this.vel.lerp(move.multiplyScalar(spd), Math.min(1, dt * 8));
    this.pos.addScaledVector(this.vel, dt);
    ctx.resolve(this.pos, 0.4, 0.3, 1.7, 0); this.pos.y = 0;
    // separation from other bots
    for (const o of ctx.bots) { if (o === this || o.dead) continue; const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z, d2 = dx * dx + dz * dz; if (d2 < 0.8 && d2 > 1e-4) { const d = Math.sqrt(d2); this.pos.x += dx / d * (0.9 - d) * 0.5; this.pos.z += dz / d * (0.9 - d) * 0.5; } }
    // facing
    let faceYaw = this.yaw;
    if (seeing) faceYaw = Math.atan2(tp.x - this.pos.x, tp.z - this.pos.z); else if (moving) faceYaw = Math.atan2(this.vel.x, this.vel.z);
    let dy = faceYaw - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.yaw += dy * Math.min(1, dt * 10);
    // ---- shooting ----
    this.reactT -= dt;
    if (seeing && this.kind !== 'bomber' && this.reactT <= 0) {
      this.fireT -= dt;
      if (this.burst > 0) { if (this.fireT <= 0) { this.shoot(time); this.burst--; this.fireT = 0.1; if (this.burst === 0) this.burstGap = 0.5 + Math.random() * 0.9; } }
      else { this.burstGap -= dt; if (this.burstGap <= 0) this.burst = 3 + Math.floor(Math.random() * 4); }
      this.play(this.vel.length() > 0.8 ? 'Run_Shoot' : 'Idle_Gun_Shoot', 0.12);
    } else this.play(this.vel.length() > 0.8 ? 'Run' : 'Idle_Gun', 0.15);
    // aim the rifle at the target's chest while engaging, low-ready otherwise
    const aiming = !!(seeing && this.kind !== 'bomber');
    if (aiming) { const e = this.eye; this.ch.aimPitch = Math.atan2(tp.y + 1.2 - e.y, Math.hypot(tp.x - e.x, tp.z - e.z)); } else this.ch.aimPitch = 0;
    this.ch.update(dt, this.pos, this.yaw, aiming, false);
    if (this.expires && time > this.expires) this.ctx.remove(this);
  }
  shoot(time) {
    const ctx = this.ctx, t = this.target; if (!t || t.dead) return;
    const from = this.ch.muzzleWorld();
    const aim = new THREE.Vector3(t.pos.x, t.pos.y + 1.1, t.pos.z); const d = from.distanceTo(aim);
    const tMoving = t.planar !== undefined ? t.planar : (t.vel ? t.vel.length() : 0);
    const pHit = THREE.MathUtils.clamp(0.52 - d * 0.009 - tMoving * 0.03 - (t.crouchT ? t.crouchT * 0.08 : 0), 0.08, 0.5) * ctx.difficulty;
    const hit = Math.random() < pHit;
    const dir = new THREE.Vector3().subVectors(aim, from).normalize();
    if (!hit) { const right = new THREE.Vector3().crossVectors(dir, up).normalize(); dir.addScaledVector(right, (Math.random() - 0.5) * 0.08).addScaledVector(up, (Math.random() - 0.5) * 0.06).normalize(); }
    const out = { t: 1, n: new THREE.Vector3() }; raycastWorld(from, dir.clone().multiplyScalar(d + 30), 1, true, out);
    const wallT = out.t * (d + 30);
    const end = from.clone().addScaledVector(dir, hit ? d : Math.min(wallT, d + 30));
    ctx.fx.tracer(from, end, this.team === 'red' ? 0xffb080 : 0xa0c8ff, 0.8); ctx.fx.flash(from.clone().addScaledVector(dir, 0.3), 0.32, false);
    sfx.shotAt(from);
    if (hit && wallT >= d - 0.3) { const dmg = 9 + Math.floor(Math.random() * 7); ctx.hurt(t, dmg, this, end, dir, time); }
    else if (!hit && out.t < 1) { ctx.fx.impact(end, out.n); sfx.impactAt(end); }
    if (hit && wallT < d - 0.3) { ctx.fx.impact(end, out.n); sfx.impactAt(end); }
  }
}

// ray vs living bots (capsule + head sphere). Returns {bot, t, head} or null.
const _ab = new THREE.Vector3(), _ao = new THREE.Vector3();
export function rayVsBots(o, d, maxT, bots) {
  let best = null;
  for (const b of bots) {
    if (b.dead) continue;
    // closest approach between ray o+d*t and the vertical segment feet+0.1..feet+1.75
    for (const [y0, y1, r, head] of [[0.1, 1.5, 0.38, false], [1.48, 1.82, 0.2, true]]) {
      _ab.set(b.pos.x, b.pos.y + y0, b.pos.z); const seg = new THREE.Vector3(0, y1 - y0, 0);
      _ao.subVectors(o, _ab);
      const a = d.dot(d), bq = d.dot(seg), c = seg.dot(seg), dd = d.dot(_ao), e = seg.dot(_ao);
      const den = a * c - bq * bq; let s = den > 1e-6 ? (bq * e - c * dd) / den : 0; s = Math.max(0, s);
      let u = (bq * s + e) / c; u = THREE.MathUtils.clamp(u, 0, 1); s = (bq * u - dd) / a; if (s < 0) continue;
      const pr = o.clone().addScaledVector(d, s), ps = _ab.clone().addScaledVector(seg, u);
      if (pr.distanceTo(ps) < r && s < maxT && (!best || s < best.t)) best = { bot: b, t: s, head };
    }
  }
  return best;
}
