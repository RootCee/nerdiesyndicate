const PAINT = Object.freeze({ lane: 'lane', crosswalk: 'crosswalk' });
// M7.0A: lane dashes stop this far past a cross street, clear of its crosswalk (stripes reach ~4.1 m)
const CROSSWALK_CLEAR = 4.6;
const CROSSWALK_REACH = 4.2;

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

function addCrosswalk(rects, x, z, span, vertical, direction, group) {
  const approach = 0.85;
  const stripe = 0.34;
  const step = 0.78;
  for (let i = 0; i < 5; i++) {
    const shift = direction * (approach + i * step);
    rects.push(vertical
      ? { x, z: z + shift, width: Math.max(2, span - 1), depth: stripe, kind: PAINT.crosswalk, group }
      : { x: x + shift, z, width: stripe, depth: Math.max(2, span - 1), kind: PAINT.crosswalk, group });
  }
}

const extent = (road) => ({
  minX: road.x - road.width / 2, maxX: road.x + road.width / 2,
  minZ: road.z - road.depth / 2, maxZ: road.z + road.depth / 2,
});

// A junction owns only the approaches on which road surface actually continues
// beyond the crossing. This distinguishes a four-way crossing from a T junction
// and prevents endpoint-touching roads from producing fragments of a crosswalk.
export function classifyRoadJunctions(roads) {
  const vertical = roads.filter((road) => road.depth > road.width && road.width >= 8);
  const horizontal = roads.filter((road) => road.width > road.depth && road.depth >= 8);
  const junctions = [];
  for (const northSouth of vertical) for (const eastWest of horizontal) {
    const v = extent(northSouth), h = extent(eastWest);
    const minX = Math.max(v.minX, h.minX), maxX = Math.min(v.maxX, h.maxX);
    const minZ = Math.max(v.minZ, h.minZ), maxZ = Math.min(v.maxZ, h.maxZ);
    if (maxX - minX <= 0.01 || maxZ - minZ <= 0.01) continue;
    const approaches = Object.freeze({
      north: v.maxZ >= h.maxZ + CROSSWALK_REACH,
      south: v.minZ <= h.minZ - CROSSWALK_REACH,
      east: h.maxX >= v.maxX + CROSSWALK_REACH,
      west: h.minX <= v.minX - CROSSWALK_REACH,
    });
    const count = Object.values(approaches).filter(Boolean).length;
    if (count < 2) continue;
    junctions.push(Object.freeze({
      vertical: northSouth.id, horizontal: eastWest.id,
      x: northSouth.x, z: eastWest.z, minX, maxX, minZ, maxZ,
      approaches, type: count === 4 ? 'four-way' : count === 3 ? 't-junction' : 'corner',
    }));
  }
  return junctions;
}

export function classifyRoadEndpoints(roads, sidewalkWidth = 2) {
  const streets = roads.filter((road) => road.width >= 8 && road.depth >= 8);
  const endpoints = [];
  for (const road of streets) {
    const vertical = road.depth > road.width;
    for (const direction of [-1, 1]) {
      const cap = vertical
        ? {
          minX: road.x - road.width / 2 - sidewalkWidth,
          maxX: road.x + road.width / 2 + sidewalkWidth,
          minZ: direction < 0 ? road.z - road.depth / 2 - sidewalkWidth : road.z + road.depth / 2,
          maxZ: direction < 0 ? road.z - road.depth / 2 : road.z + road.depth / 2 + sidewalkWidth,
        }
        : {
          minX: direction < 0 ? road.x - road.width / 2 - sidewalkWidth : road.x + road.width / 2,
          maxX: direction < 0 ? road.x - road.width / 2 : road.x + road.width / 2 + sidewalkWidth,
          minZ: road.z - road.depth / 2 - sidewalkWidth,
          maxZ: road.z + road.depth / 2 + sidewalkWidth,
        };
      const connectedBy = streets
        .filter((other) => other.id !== road.id)
        .filter((other) => {
          const box = extent(other);
          return Math.min(cap.maxX, box.maxX) - Math.max(cap.minX, box.minX) > 0.01
            && Math.min(cap.maxZ, box.maxZ) - Math.max(cap.minZ, box.minZ) > 0.01;
        })
        .map((other) => other.id);
      endpoints.push(Object.freeze({
        id: `${road.id}:${vertical ? (direction < 0 ? 'south' : 'north') : (direction < 0 ? 'west' : 'east')}`,
        road: road.id,
        direction: vertical ? (direction < 0 ? 'south' : 'north') : (direction < 0 ? 'west' : 'east'),
        type: connectedBy.length ? 'junction' : 'endpoint',
        connectedBy: Object.freeze(connectedBy),
        ...cap,
      }));
    }
  }
  return endpoints;
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
      .map((cross) => [cross.z - cross.depth / 2 - CROSSWALK_CLEAR, cross.z + cross.depth / 2 + CROSSWALK_CLEAR]);
    for (const [a, b] of subtractIntervals(start, end, blockers)) addDashes(rects, a, b, road.x, true, 0.14);
  }

  for (const road of horizontal) {
    const start = road.x - road.width / 2;
    const end = road.x + road.width / 2;
    const blockers = vertical
      .filter((cross) => overlap(road.z, road.z, cross.z - cross.depth / 2, cross.z + cross.depth / 2))
      .map((cross) => [cross.x - cross.width / 2 - CROSSWALK_CLEAR, cross.x + cross.width / 2 + CROSSWALK_CLEAR]);
    for (const [a, b] of subtractIntervals(start, end, blockers)) addDashes(rects, a, b, road.z, false, 0.14);
  }

  const byId = new Map(roads.map((road) => [road.id, road]));
  for (const junction of classifyRoadJunctions(roads)) {
    const northSouth = byId.get(junction.vertical), eastWest = byId.get(junction.horizontal);
    const id = `${junction.vertical}:${junction.horizontal}`;
    if (junction.approaches.north) addCrosswalk(rects, northSouth.x, eastWest.z + eastWest.depth / 2, northSouth.width, true, 1, `${id}:north`);
    if (junction.approaches.south) addCrosswalk(rects, northSouth.x, eastWest.z - eastWest.depth / 2, northSouth.width, true, -1, `${id}:south`);
    if (junction.approaches.east) addCrosswalk(rects, northSouth.x + northSouth.width / 2, eastWest.z, eastWest.depth, false, 1, `${id}:east`);
    if (junction.approaches.west) addCrosswalk(rects, northSouth.x - northSouth.width / 2, eastWest.z, eastWest.depth, false, -1, `${id}:west`);
  }

  // Intersections near road endpoints used to leave paint floating on grass or
  // sidewalk. Keep only rectangles whose full footprint belongs to a road and
  // remove duplicates created by overlapping road definitions.
  const onRoad = (rect) => roads.some((road) =>
    rect.x - rect.width / 2 >= road.x - road.width / 2 - 0.01
    && rect.x + rect.width / 2 <= road.x + road.width / 2 + 0.01
    && rect.z - rect.depth / 2 >= road.z - road.depth / 2 - 0.01
    && rect.z + rect.depth / 2 <= road.z + road.depth / 2 + 0.01);
  // Keep or reject a five-stripe crosswalk as one unit. Individual clipping was
  // the source of the broken two- and three-stripe crossings seen on iPhone.
  const grouped = new Map();
  rects.forEach((rect, index) => {
    if (rect.kind !== PAINT.crosswalk) return;
    (grouped.get(rect.group) || grouped.set(rect.group, []).get(rect.group)).push(index);
  });
  const invalidCrosswalk = new Set();
  for (const indices of grouped.values()) if (indices.length !== 5 || indices.some((index) => !onRoad(rects[index]))) indices.forEach((index) => invalidCrosswalk.add(index));
  const completeRects = rects.filter((rect, index) => rect.kind !== PAINT.crosswalk || !invalidCrosswalk.has(index));
  const crosswalks = completeRects.filter((rect) => rect.kind === PAINT.crosswalk);
  const clearOfCrosswalks = (rect) => rect.kind === PAINT.crosswalk || !crosswalks.some((crosswalk) =>
    rect.x - rect.width / 2 < crosswalk.x + crosswalk.width / 2
    && rect.x + rect.width / 2 > crosswalk.x - crosswalk.width / 2
    && rect.z - rect.depth / 2 < crosswalk.z + crosswalk.depth / 2
    && rect.z + rect.depth / 2 > crosswalk.z - crosswalk.depth / 2);
  const seen = new Set();
  return completeRects.filter(onRoad).filter(clearOfCrosswalks).filter((rect) => {
    const key = `${rect.kind}:${rect.x.toFixed(3)}:${rect.z.toFixed(3)}:${rect.width.toFixed(3)}:${rect.depth.toFixed(3)}`;
    if (seen.has(key)) return false; seen.add(key); return true;
  });
}

export { PAINT };
