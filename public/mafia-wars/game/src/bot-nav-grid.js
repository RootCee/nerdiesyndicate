// The practice bots' navigation grid (bots.js): 1 m cells over the map, a cell blocked when its centre is within
// BLOCK_PAD of a collider that rises above ankle height, and costlier (1.6) near one. Pure, no Three.js.
//
// RC1 hotfix: the original built it by testing every cell against every collider (~3.3 million cells × ~2,000
// colliders on the expanded city: 40+ s of the main thread at every page load, more on a phone). This version
// visits each collider's own cells instead and gives byte-identical results, including the original's
// first-collider-wins detail: a cell's cost counts "near" only from colliders listed before the first one that
// blocks it (the original loop stopped there). multiplayer/test/rc1-hotfix-loading.test.js checks it against
// the original loop.
export const BOT_NAV_CELL = 1.0, BLOCK_PAD = 0.45, NEAR_PAD = 1.2, MIN_HEIGHT = 0.4;

export function buildBotNavGrid(bounds, colliders, cell = BOT_NAV_CELL) {
  const w = Math.ceil((bounds.maxX - bounds.minX) / cell), h = Math.ceil((bounds.maxZ - bounds.minZ) / cell), n = w * h;
  const blocked = new Uint8Array(n), cost = new Float32Array(n).fill(1);
  const NONE = 0x7fffffff, firstBlock = new Int32Array(n).fill(NONE), firstNear = new Int32Array(n).fill(NONE);
  // cell centres exactly as the original computed them
  const cx = (i) => bounds.minX + (i + 0.5) * cell, cz = (j) => bounds.minZ + (j + 0.5) * cell;
  // the cells whose centre lies strictly inside (lo, hi) on one axis, by the same comparisons
  const span = (lo, hi, origin, count, at) => {
    let a = Math.max(0, Math.floor((lo - origin) / cell - 0.5) - 1), b = Math.min(count - 1, Math.ceil((hi - origin) / cell - 0.5) + 1);
    while (a <= b && !(at(a) > lo)) a++;
    while (b >= a && !(at(b) < hi)) b--;
    return [a, b];
  };
  for (let k = 0; k < colliders.length; k++) {
    const c = colliders[k]; if (c.maxY < MIN_HEIGHT) continue;
    const [ni0, ni1] = span(c.minX - NEAR_PAD, c.maxX + NEAR_PAD, bounds.minX, w, cx), [nj0, nj1] = span(c.minZ - NEAR_PAD, c.maxZ + NEAR_PAD, bounds.minZ, h, cz);
    for (let j = nj0; j <= nj1; j++) for (let i = ni0; i <= ni1; i++) { const q = j * w + i; if (firstNear[q] === NONE) firstNear[q] = k; }
    const [bi0, bi1] = span(c.minX - BLOCK_PAD, c.maxX + BLOCK_PAD, bounds.minX, w, cx), [bj0, bj1] = span(c.minZ - BLOCK_PAD, c.maxZ + BLOCK_PAD, bounds.minZ, h, cz);
    for (let j = bj0; j <= bj1; j++) for (let i = bi0; i <= bi1; i++) { const q = j * w + i; if (firstBlock[q] === NONE) firstBlock[q] = k; }
  }
  for (let q = 0; q < n; q++) {
    const b = firstBlock[q] !== NONE; blocked[q] = b ? 1 : 0;
    // the original set `near` only from colliders it looked at before breaking on the first blocker; a collider
    // before that one cannot block this cell, so it counted exactly when its near box held the centre
    if (b ? firstNear[q] < firstBlock[q] : firstNear[q] !== NONE) cost[q] = 1.6;
  }
  return { w, h, blocked, cost };
}

// The original loop, kept for the equivalence tests.
export function buildBotNavGridReference(bounds, colliders, cell = BOT_NAV_CELL) {
  const w = Math.ceil((bounds.maxX - bounds.minX) / cell), h = Math.ceil((bounds.maxZ - bounds.minZ) / cell);
  const blocked = new Uint8Array(w * h), cost = new Float32Array(w * h).fill(1);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = bounds.minX + (i + 0.5) * cell, z = bounds.minZ + (j + 0.5) * cell; let b = 0, near = 0;
    for (const c of colliders) {
      if (c.maxY < 0.4) continue;
      if (x > c.minX - 0.45 && x < c.maxX + 0.45 && z > c.minZ - 0.45 && z < c.maxZ + 0.45) { b = 1; break; }
      if (x > c.minX - 1.2 && x < c.maxX + 1.2 && z > c.minZ - 1.2 && z < c.maxZ + 1.2) near = 1;
    }
    blocked[j * w + i] = b; cost[j * w + i] = near ? 1.6 : 1;
  }
  return { w, h, blocked, cost };
}
