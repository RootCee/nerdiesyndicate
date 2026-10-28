// Stage 2: the business-lot neighbourhoods (Neon Market, Cyber HQ, ...) share one way of lining their blocks
// with lots: a row of shopfronts along each chosen side of a block, exactly one lot per license (extra lots
// merge into wider anchors), and license classes handed out by frontage. Pure.

// The license classes: the token ids on the Business NFT contract (0x57e2…c695).
export const LICENSE_CLASSES = Object.freeze({
  retail: Object.freeze({ tokenId: 1, label: 'Retail Business' }),
  tech: Object.freeze({ tokenId: 2, label: 'Tech Startup' }),
  entertainment: Object.freeze({ tokenId: 3, label: 'Entertainment Venue' }),
  manufacturing: Object.freeze({ tokenId: 4, label: 'Manufacturing Unit' }),
  financial: Object.freeze({ tokenId: 5, label: 'Financial Institution' }),
});
export const SHOP_DEPTH = 12;

// One side of a block ('s' faces the street south of it, and so on) as a row of lots `lot` metres wide.
// block: { x: [x0, x1], z: [z0, z1], lot? }; sides: every side of the block that has a row.
export function shopRow(blockId, block, side, sides, lot = 11) {
  const [x0, x1] = block.x, [z0, z1] = block.z, horizontal = side === 's' || side === 'n';
  // vertical rows run between the horizontal rows at either end (the corners belong to those)
  const a0 = horizontal ? x0 : z0 + (sides.includes('s') ? SHOP_DEPTH : 0), a1 = horizontal ? x1 : z1 - (sides.includes('n') ? SHOP_DEPTH : 0);
  const n = Math.max(1, Math.round((a1 - a0) / (block.lot || lot))), w = (a1 - a0) / n, front = { s: 'south', n: 'north', e: 'east', w: 'west' }[side];
  // edges on a 1/16 m grid (exact in binary, so centre +/- half width lands exactly), 1/32 m between neighbours
  const edge = (i) => (i === n ? a1 : a0 + Math.round(w * i * 16) / 16), GAP = 1 / 32;
  return Array.from({ length: n }, (_, i) => {
    const c = (edge(i) + edge(i + 1)) / 2, len = edge(i + 1) - edge(i) - GAP, deep = SHOP_DEPTH - GAP;
    const x = horizontal ? c : side === 'w' ? x0 + SHOP_DEPTH / 2 : x1 - SHOP_DEPTH / 2, z = horizontal ? (side === 's' ? z0 + SHOP_DEPTH / 2 : z1 - SHOP_DEPTH / 2) : c;
    return { id: `${blockId}-${side}${i}`, x, z, width: horizontal ? len : deep, depth: horizontal ? deep : len, front };
  });
}

// Exactly `target` lots: extra lots merge, two at a time, into wider anchor shopfronts (the longest rows first).
// spread: merge the narrowest neighbouring pair of the row (so no lot grows past two widths); otherwise the
// row's last two (Neon Market's layout, kept as it shipped).
const frontage = (l) => (l.front === 'south' || l.front === 'north' ? l.width : l.depth);
export function mergeToCount(lots, target, { spread = false } = {}) {
  while (lots.length > target) {
    const rows = new Map(); for (const l of lots) { const k = `${l.blockId}:${l.front}`; rows.set(k, [...(rows.get(k) || []), l]); }
    const row = [...rows.values()].sort((p, q) => q.length - p.length)[0];
    let k = row.length - 2;
    if (spread) for (let i = 0; i + 1 < row.length; i++) if (frontage(row[i]) + frontage(row[i + 1]) < frontage(row[k]) + frontage(row[k + 1])) k = i;
    const [a, b] = [row[k], row[k + 1]];
    const horizontal = a.front === 'south' || a.front === 'north', merged = horizontal
      ? { ...a, x: (a.x - a.width / 2 + b.x + b.width / 2) / 2, width: b.x + b.width / 2 - (a.x - a.width / 2) }
      : { ...a, z: (a.z - a.depth / 2 + b.z + b.depth / 2) / 2, depth: b.z + b.depth / 2 - (a.z - a.depth / 2) };
    lots.splice(lots.indexOf(a), 2, merged);
  }
  return lots;
}

// Hand out license classes: frontage by frontage (`order`), each lot the first class its frontage prefers that
// has licenses left. streetOf(lot) names a lot's frontage; prefer[frontage] lists classes in order.
export function assignLicenses(lots, counts, streetOf, prefer, order) {
  const left = { ...counts };
  for (const street of order) for (const lot of lots.filter((l) => streetOf(l) === street)) {
    const cls = prefer[street].find((c) => left[c] > 0) || Object.keys(left).find((c) => left[c] > 0); left[cls]--; lot.license = cls;
  }
}
