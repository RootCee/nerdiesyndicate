// M7.1B: front steps for raised entrances. A landing level with the door sill and treads down to
// the ground, as axis-aligned world rects with a top height. world.js treats `step` colliders up to
// 0.85 m above the feet as climbable, so players walk up them. Pure (no Three.js): the showcase
// draws these rects, city-expansion adds their colliders, navigation keeps residents off the stairs.

const SIDES = { east: [1, 0], west: [-1, 0], north: [0, 1], south: [0, -1] };
// showcase houses stand on a 0.6 m foundation; City Hall on a 1.2 m plinth
export const HOUSE_STOOP = Object.freeze({ height: 0.6, width: 2.0, landing: 1.0, rise: 0.2, tread: 0.35 });
export const CIVIC_STAIRS = Object.freeze({ height: 1.2, width: 9, landing: 1.2, rise: 0.3, tread: 0.4, cheek: 0.5, cheekHeight: 1.5 });
// M7.2: the Academy Library's broad front stairs (a 1.2 m plinth like City Hall's, in 0.2 m steps)
export const LIBRARY_STAIRS = Object.freeze({ height: 1.2, width: 12, landing: 2.6, rise: 0.2, tread: 0.4, cheek: 0.6, cheekHeight: 1.4 });

// along-facade offset of a showcase house's door (beside the garage on houses with one)
export function houseDoorOffset(b) {
  const [nx] = SIDES[b.front], length = nx ? b.depth : b.width;
  return b.driveway && !b.enterableHouseId && nx ? length / 2 - 1.25 : 0;
}

// A landing then treads, centred `a` metres along the `side` facade of footprint b.
export function stairFlight(b, side, a, spec) {
  const [nx, nz] = SIDES[side], half = nx ? b.width / 2 : b.depth / 2, ux = nz, uz = -nx, w = spec.width / 2;
  const cx = b.x + nx * half + ux * a, cz = b.z + nz * half + uz * a;
  const rect = (o0, o1, top, part) => {
    const xs = [cx + nx * o0 - ux * w, cx + nx * o1 + ux * w], zs = [cz + nz * o0 - uz * w, cz + nz * o1 + uz * w];
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs), top, part };
  };
  const out = [rect(0, spec.landing, spec.height, 'landing')], n = Math.round(spec.height / spec.rise);
  for (let k = 1; k < n; k++) { const o0 = spec.landing + (k - 1) * spec.tread; out.push(rect(o0, o0 + spec.tread, +(spec.height - k * spec.rise).toFixed(3), 'step')); }
  if (spec.cheek) { // stone cheek walls either side of the flight
    const reach = spec.landing + (n - 1) * spec.tread;
    for (const sd of [-1, 1]) {
      const c0 = sd * (w + spec.cheek / 2), xs = [cx + ux * (c0 - spec.cheek / 2), cx + ux * (c0 + spec.cheek / 2) + nx * reach], zs = [cz + uz * (c0 - spec.cheek / 2), cz + uz * (c0 + spec.cheek / 2) + nz * reach];
      out.push({ minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs), top: spec.cheekHeight, part: 'cheek' });
    }
  }
  return out;
}
// how far the flight reaches out from the facade
export const flightDepth = (spec) => spec.landing + (Math.round(spec.height / spec.rise) - 1) * spec.tread;

// Front steps for a district building: showcase houses get a stoop, City Hall and the Library their stairs.
export function entrySteps(b) {
  const steps = b.kind === 'house' ? stairFlight(b, b.front, houseDoorOffset(b), HOUSE_STOOP)
    : b.kind === 'civic' ? stairFlight(b, b.front, 0, CIVIC_STAIRS) : b.kind === 'library' ? stairFlight(b, b.front, 0, LIBRARY_STAIRS) : [];
  return steps.map((s, i) => Object.freeze({ ...s, id: `${b.id}-steps-${i}` }));
}
