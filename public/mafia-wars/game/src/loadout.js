export const PRACTICE_LOADOUT = Object.freeze({
  ak: Object.freeze({ mag: 30, reserve: 180 }),
  mac10: Object.freeze({ mag: 32, reserve: 192 }),
  mp5: Object.freeze({ mag: 30, reserve: 180 }),
  m700: Object.freeze({ mag: 5, reserve: 30 }),
  rpg: Object.freeze({ mag: 1, reserve: 3 }),
});

export const PRACTICE_RESUPPLY = Object.freeze({
  ak: 90,
  mac10: 96,
  mp5: 90,
  m700: 15,
  rpg: 2,
});

export const PRACTICE_RESUPPLY_COOLDOWN = 15;

export function restorePracticeLoadout(guns, launcher) {
  for (const [id, gun] of Object.entries(guns)) {
    const loadout = PRACTICE_LOADOUT[id];
    if (!loadout) continue;
    gun.mag = loadout.mag;
    gun.reserve = loadout.reserve;
    gun.reloading = 0;
  }
  launcher.loaded = PRACTICE_LOADOUT.rpg.mag;
  launcher.reserve = PRACTICE_LOADOUT.rpg.reserve;
  launcher.reloading = 0;
}

export function resupplyPracticeAmmo(guns, launcher) {
  const supplied = {};
  for (const [id, gun] of Object.entries(guns)) {
    const before = gun.reserve;
    gun.reserve = Math.min(PRACTICE_LOADOUT[id].reserve, gun.reserve + PRACTICE_RESUPPLY[id]);
    supplied[id] = gun.reserve - before;
  }
  const beforeRpg = launcher.reserve;
  launcher.reserve = Math.min(PRACTICE_LOADOUT.rpg.reserve, launcher.reserve + PRACTICE_RESUPPLY.rpg);
  supplied.rpg = launcher.reserve - beforeRpg;
  return supplied;
}
