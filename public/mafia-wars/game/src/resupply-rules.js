// Match-scoped ammunition station rules. The transition is pure so the same
// validation can later run atomically on an authoritative session server.
export const SOLO_PRACTICE_POLICY = Object.freeze({
  id: 'solo-practice',
  cycleSeconds: 15,
  teamSize: 1,
  teamUsesPerCycle: 1,
  playerUsesPerCycle: 1,
});

export const FUTURE_TEAM_POLICY = Object.freeze({
  id: 'team-match',
  cycleSeconds: 60,
  teamSize: 6,
  teamUsesPerCycle: 4,
  playerUsesPerCycle: 1,
});

export function createResupplyState({ matchId, teamId, stationId, now = 0 }) {
  return { matchId, teamId, stationId, cycleStartedAt: now, teamUses: 0, playerUses: {} };
}

function normalizedCycle(state, policy, now) {
  if (now < state.cycleStartedAt + policy.cycleSeconds) return state;
  const elapsed = Math.max(0, now - state.cycleStartedAt);
  const cycles = Math.max(1, Math.floor(elapsed / policy.cycleSeconds));
  return { ...state, cycleStartedAt: state.cycleStartedAt + cycles * policy.cycleSeconds, teamUses: 0, playerUses: {} };
}

export function inspectResupply(state, policy, playerId, now) {
  const current = normalizedCycle(state, policy, now);
  const playerUses = current.playerUses[playerId] || 0;
  const remainingUses = Math.max(0, policy.teamUsesPerCycle - current.teamUses);
  const remainingSeconds = Math.max(0, current.cycleStartedAt + policy.cycleSeconds - now);
  let reason = 'available';
  if (remainingUses <= 0) reason = 'station-depleted';
  else if (playerUses >= policy.playerUsesPerCycle) reason = 'player-used';
  return { state: current, allowed: reason === 'available', reason, remainingUses, remainingSeconds, playerUses };
}

// `added` is computed by the caller from capacity-capped inventory mutation.
// A failed/no-op transaction returns the normalized state without spending use.
export function commitResupply(state, policy, { playerId, now, added }) {
  const status = inspectResupply(state, policy, playerId, now);
  if (!status.allowed || added <= 0) return { ...status, consumed: false, reason: added <= 0 && status.allowed ? 'ammo-full' : status.reason };
  const next = {
    ...status.state,
    teamUses: status.state.teamUses + 1,
    playerUses: { ...status.state.playerUses, [playerId]: status.playerUses + 1 },
  };
  const after = inspectResupply(next, policy, playerId, now);
  return { ...after, state: next, consumed: true, reason: 'supplied' };
}

