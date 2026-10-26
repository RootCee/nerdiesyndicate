// Nerdie Arms gun and ammo shop: its site, interior layout, server space, and the restock rule.
// Pure (no Three.js): the server (room-core), the client (gun-shop.js), and the tests share it.
// The shop is the North Market storefront facing West Avenue (formerly the provisional Diner);
// its footprint, height, and collider are unchanged.
import { createCityPlan } from './city-layout.js';

export const GUN_SHOP_BUILDING_ID = 'west-mixed-north-3';
export const GUN_SHOP_ID = 'nerdie-arms';

// Restocking is free for now: there is no in-game currency, and the Nerdie Cash wallet is
// read-only (charging it would be a blockchain transaction). `price` is the hook for later.
export const GUN_SHOP_RULES = Object.freeze({ restockCooldownMs: 20_000, counterReach: 2.6, stationReach: 1.0, price: null, currency: null });

const round = (v) => Math.round(v * 100) / 100;
export function gunShopSite(plan = createCityPlan()) {
  const b = plan.districts.flatMap((d) => d.buildings).find((x) => x.id === GUN_SHOP_BUILDING_ID);
  // the interior sits high above the city, like the other interiors (40, 55, 70, 85 m)
  return Object.freeze({ id: GUN_SHOP_ID, buildingId: b.id, name: 'Nerdie Arms', x: b.x, z: b.z, width: b.width, depth: b.depth, height: b.height, front: b.front, interiorY: 115 });
}

// The interior in world coordinates. The door is on the west wall; customers stand west of the
// counter; display cases with each weapon line the south wall.
export function gunShopInterior(site = gunShopSite()) {
  const y = site.interiorY, wall = 0.3, minX = site.x - site.width / 2 + wall, maxX = site.x + site.width / 2 - wall, minZ = site.z - site.depth / 2 + wall, maxZ = site.z + site.depth / 2 - wall;
  const counterX = minX + 8.6, stations = ['ak', 'mac10', 'mp5', 'm700', 'rpg'].map((weaponId, i) => {
    const x = round(minX + 1.6 + i * 1.3);
    return Object.freeze({ weaponId, x, z: round(minZ + 0.55), stand: Object.freeze({ x, y, z: round(minZ + 1.75) }) });
  });
  return Object.freeze({
    y, height: 4.2, minX, maxX, minZ, maxZ, doorZ: site.z, doorWidth: 1.8,
    counter: Object.freeze({ x: round(counterX), minZ: round(minZ + 1.6), maxZ: round(maxZ - 1.5), depth: 0.9, height: 1.05 }),
    counterStand: Object.freeze({ x: round(counterX - 1.1), y, z: site.z }),
    stations: Object.freeze(stations),
  });
}

// The server space: the street door 1.4 m in front of the west facade, the interior behind it.
export function gunShopSpace(site = gunShopSite()) {
  const front = site.x - site.width / 2, inner = gunShopInterior(site);
  return {
    id: site.id, layer: 1, safeZone: true,
    entry: { x: round(front - 1.4), y: 0, z: site.z }, inside: { x: round(inner.minX + 1.4), y: site.interiorY, z: site.z },
    exit: { x: round(inner.minX + 1.0), y: site.interiorY, z: site.z }, outside: { x: round(front - 1.2), y: 0, z: site.z },
    bounds: { minX: round(inner.minX + 0.2), maxX: round(inner.maxX - 0.2), minY: site.interiorY - 1, maxY: site.interiorY + 5, minZ: round(inner.minZ + 0.2), maxZ: round(inner.maxZ - 0.2) },
    counter: inner.counterStand,
  };
}

const FORBIDDEN = ['playerId', 'ammo', 'reserve', 'magazine', 'price', 'context', 'position'];
export function validShopIntent(message, protocolVersion) {
  return !!message && message.v === protocolVersion && message.type === 'shop' && Number.isSafeInteger(message.seq) && message.seq >= 0
    && message.shopId === GUN_SHOP_ID && message.action === 'restock' && !FORBIDDEN.some((f) => Object.hasOwn(message, f));
}

// Restock every weapon's reserve to its cap (weaponRules: multiplayer-combat's MULTIPLAYER_WEAPON_RULES,
// passed in to keep this module free of an import cycle). The player must be inside the shop, at the
// counter, and past the cooldown; nothing the client sends sets an amount.
export function applyShopIntent(player, message, now, protocolVersion, space, weaponRules) {
  if (!validShopIntent(message, protocolVersion)) return { ok: false, reason: 'invalid_shop' };
  if (message.seq <= (player.lastShopSeq ?? -1)) return { ok: false, reason: 'stale_shop_sequence' };
  player.lastShopSeq = message.seq;
  if (player.context?.space?.id !== GUN_SHOP_ID) return { ok: false, reason: 'not_in_shop' };
  const s = player.state, c = space.counter;
  if (!s || Math.hypot(s.x - c.x, s.y - c.y, s.z - c.z) > GUN_SHOP_RULES.counterReach) return { ok: false, reason: 'not_at_counter' };
  if (now < (player.shopReadyAt ?? 0)) return { ok: false, reason: 'shop_cooldown', readyAt: player.shopReadyAt };
  const ammo = player.combat?.ammo; if (!ammo) return { ok: false, reason: 'invalid_shop' };
  let added = 0;
  for (const [id, rule] of Object.entries(weaponRules)) { const a = ammo[id]; if (!a) continue; added += Math.max(0, rule.reserve - a.reserve); a.reserve = rule.reserve; }
  if (!added) return { ok: false, reason: 'ammo_full' };
  player.shopReadyAt = now + GUN_SHOP_RULES.restockCooldownMs;
  return { ok: true, added, readyAt: player.shopReadyAt };
}
