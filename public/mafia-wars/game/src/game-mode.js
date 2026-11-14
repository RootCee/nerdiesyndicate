export const GAME_MODES = Object.freeze({
  COMBAT: 'ORIGINAL_COMBAT',
  FREE_ROAM: 'FREE_ROAM',
});

export function normalizeGameMode(value) {
  return value === GAME_MODES.FREE_ROAM || String(value).toLowerCase() === 'free_roam'
    ? GAME_MODES.FREE_ROAM
    : GAME_MODES.COMBAT;
}

export function isCombatMode(mode) {
  return normalizeGameMode(mode) === GAME_MODES.COMBAT;
}
