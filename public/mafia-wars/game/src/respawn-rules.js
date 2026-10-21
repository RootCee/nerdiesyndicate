export const RESPAWN_CONFIG = Object.freeze({
  enemyDangerRadius: 25,
  recentDeathWindow: 15,
  recentCombatRadius: 12,
  recentUseWindow: 12,
  occupancyRadius: 1.6,
  spawnProtectionSeconds: 3,
});

const point = (id, x, z) => Object.freeze({ id, x, z });

// These points are on the original arena's north/south road and alley lanes.
// Runtime validation checks current bounds, ground and collision state before use.
export const UNDERGROUND_SPAWN_CANDIDATES = Object.freeze({
  blue: Object.freeze([
    point('blue-north-west', -2.8, 36), point('blue-north-center', 0, 36), point('blue-north-east', 2.8, 36),
    point('blue-back-west', -2.8, 42), point('blue-back-center', 0, 42), point('blue-back-east', 2.8, 42),
  ]),
  red: Object.freeze([
    point('red-south-west', -2.8, -36), point('red-south-center', 0, -36), point('red-south-east', 2.8, -36),
    point('red-back-west', -2.8, -42), point('red-back-center', 0, -42), point('red-back-east', 2.8, -42),
  ]),
});

const distance = (a, b) => Math.hypot(a.x - b.x, (a.z ?? a.y) - (b.z ?? b.y));
const recentNear = (events, candidate, now, window, radius) => events.filter((event) => now - event.time <= window && distance(event.position, candidate) < radius).length;

export function evaluateRespawnCandidate(candidate, context, config = RESPAWN_CONFIG) {
  if (!context.isValid(candidate)) return { candidate, valid: false, safe: false, score: -Infinity, reasons: ['invalid-collision'] };
  if ((context.occupied || []).some((entry) => distance(entry.position || entry, candidate) < config.occupancyRadius)) {
    return { candidate, valid: false, safe: false, score: -Infinity, reasons: ['occupied'] };
  }
  let score = 100;
  const reasons = [];
  let contested = false;
  for (const enemy of context.enemies || []) {
    if (enemy.dead) continue;
    const d = distance(enemy.position || enemy.pos || enemy, candidate);
    if (d < config.enemyDangerRadius) {
      score -= 35 + (config.enemyDangerRadius - d) * 3;
      contested = true; reasons.push('enemy-near');
    }
    if (context.hasLineOfSight(candidate, enemy.position || enemy.pos || enemy)) {
      score -= d < config.enemyDangerRadius * 1.5 ? 55 : 25;
      contested = true; reasons.push('enemy-los');
    }
  }
  const deaths = recentNear(context.recentDeaths || [], candidate, context.now, config.recentDeathWindow, config.recentCombatRadius);
  const damage = recentNear(context.recentDamage || [], candidate, context.now, config.recentDeathWindow, config.recentCombatRadius);
  const explosions = recentNear(context.recentExplosions || [], candidate, context.now, config.recentDeathWindow, config.recentCombatRadius + 3);
  if (deaths) { score -= deaths * 40; contested = true; reasons.push('recent-death'); }
  if (damage) { score -= damage * 16; contested = true; reasons.push('recent-damage'); }
  if (explosions) { score -= explosions * 28; contested = true; reasons.push('recent-explosion'); }
  const lastUse = (context.recentUses || []).find((entry) => entry.candidateId === candidate.id);
  if (lastUse && context.now - lastUse.time < config.recentUseWindow) { score -= 22; reasons.push('recently-used'); }
  return { candidate, valid: true, safe: !contested, score, reasons };
}

export function selectRespawnCandidate({ candidates, random = Math.random, config = RESPAWN_CONFIG, ...context }) {
  const evaluated = candidates.map((candidate) => evaluateRespawnCandidate(candidate, context, config)).filter((entry) => entry.valid);
  if (!evaluated.length) return { candidate: null, score: -Infinity, reason: 'no-valid-candidate', fallback: true, evaluated };
  const safe = evaluated.filter((entry) => entry.safe);
  const best = Math.max(...(safe.length ? safe : evaluated).map((entry) => entry.score));
  // When every point is contested, safety wins completely: randomize only
  // among equally least-dangerous candidates rather than risking a camped one.
  const pool = safe.length ? safe : evaluated.filter((entry) => Math.abs(entry.score - best) < 1e-9);
  const weighted = pool.map((entry) => ({ entry, weight: Math.max(1, Math.exp((entry.score - best) / 18) * 100) }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.min(0.999999999, Math.max(0, random())) * total;
  let chosen = weighted[weighted.length - 1].entry;
  for (const item of weighted) { roll -= item.weight; if (roll <= 0) { chosen = item.entry; break; } }
  return {
    candidate: chosen.candidate,
    score: chosen.score,
    reason: chosen.reasons.length ? chosen.reasons.join(',') : 'safe-weighted',
    fallback: safe.length === 0,
    protectionSeconds: config.spawnProtectionSeconds,
    evaluated,
  };
}

