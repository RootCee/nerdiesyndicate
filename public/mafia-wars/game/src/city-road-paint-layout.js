const PAINT = Object.freeze({ lane: 'lane', crosswalk: 'crosswalk' });

function overlap(a0, a1, b0, b1) {
  return Math.max(a0, b0) <= Math.min(a1, b1);
}

function subtractIntervals(start, end, blockers) {
  const clipped = blockers
    .map(([a, b]) => [Math.max(start, a), Math.min(end, b)])
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0]);
  const segments = [];
  let cursor = start;
  for (const [a, b] of clipped) {
    if (a > cursor) segments.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < end) segments.push([cursor, end]);
  return segments;
}

function addDashes(rects, start, end, fixed, vertical, offset) {
  const dash = 3.2;
  const period = 7;
  const inset = 1.1;
  for (let cursor = start + inset; cursor < end - inset; cursor += period) {
    const length = Math.min(dash, end - inset - cursor);
    if (length < 0.35) continue;
    for (const side of [-1, 1]) {
      rects.push(vertical
        ? { x: fixed + side * offset, z: cursor + length / 2, width: 0.11, depth: length, kind: PAINT.lane }
        : { x: cursor + length / 2, z: fixed + side * offset, width: length, depth: 0.11, kind: PAINT.lane });
    }
  }
}

function addCrosswalk(rects, x, z, span, vertical, direction) {
  const approach = 0.85;
  const stripe = 0.34;
  const step = 0.78;
  for (let i = 0; i < 5; i++) {
    const shift = direction * (approach + i * step);
    rects.push(vertical
      ? { x, z: z + shift, width: Math.max(2, span - 1), depth: stripe, kind: PAINT.crosswalk }
      : { x: x + shift, z, width: stripe, depth: Math.max(2, span - 1), kind: PAINT.crosswalk });
  }
}

export function createRoadPaintLayout(roads) {
  const vertical = roads.filter((road) => road.depth > road.width && road.width >= 8);
  const horizontal = roads.filter((road) => road.width > road.depth && road.depth >= 8);
  const rects = [];

  for (const road of vertical) {
    const start = road.z - road.depth / 2;
    const end = road.z + road.depth / 2;
    const blockers = horizontal
      .filter((cross) => overlap(road.x, road.x, cross.x - cross.width / 2, cross.x + cross.width / 2))
      .map((cross) => [cross.z - cross.depth / 2 - 0.45, cross.z + cross.depth / 2 + 0.45]);
    for (const [a, b] of subtractIntervals(start, end, blockers)) addDashes(rects, a, b, road.x, true, 0.14);
  }

  for (const road of horizontal) {
    const start = road.x - road.width / 2;
    const end = road.x + road.width / 2;
    const blockers = vertical
      .filter((cross) => overlap(road.z, road.z, cross.z - cross.depth / 2, cross.z + cross.depth / 2))
      .map((cross) => [cross.x - cross.width / 2 - 0.45, cross.x + cross.width / 2 + 0.45]);
    for (const [a, b] of subtractIntervals(start, end, blockers)) addDashes(rects, a, b, road.z, false, 0.14);
  }

  for (const northSouth of vertical) for (const eastWest of horizontal) {
    const intersects = overlap(northSouth.x, northSouth.x, eastWest.x - eastWest.width / 2, eastWest.x + eastWest.width / 2)
      && overlap(eastWest.z, eastWest.z, northSouth.z - northSouth.depth / 2, northSouth.z + northSouth.depth / 2);
    if (!intersects) continue;
    addCrosswalk(rects, northSouth.x, eastWest.z + eastWest.depth / 2, northSouth.width, true, 1);
    addCrosswalk(rects, northSouth.x, eastWest.z - eastWest.depth / 2, northSouth.width, true, -1);
    addCrosswalk(rects, northSouth.x + northSouth.width / 2, eastWest.z, eastWest.depth, false, 1);
    addCrosswalk(rects, northSouth.x - northSouth.width / 2, eastWest.z, eastWest.depth, false, -1);
  }

  // Intersections near road endpoints used to leave paint floating on grass or
  // sidewalk. Keep only rectangles whose full footprint belongs to a road and
  // remove duplicates created by overlapping road definitions.
  const onRoad = (rect) => roads.some((road) =>
    rect.x - rect.width / 2 >= road.x - road.width / 2 - 0.01
    && rect.x + rect.width / 2 <= road.x + road.width / 2 + 0.01
    && rect.z - rect.depth / 2 >= road.z - road.depth / 2 - 0.01
    && rect.z + rect.depth / 2 <= road.z + road.depth / 2 + 0.01);
  const seen = new Set();
  return rects.filter(onRoad).filter((rect) => {
    const key = `${rect.kind}:${rect.x.toFixed(3)}:${rect.z.toFixed(3)}:${rect.width.toFixed(3)}:${rect.depth.toFixed(3)}`;
    if (seen.has(key)) return false; seen.add(key); return true;
  });
}

export { PAINT };
