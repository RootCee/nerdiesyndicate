export const DESKTOP_WEAPON_ORDER = Object.freeze(['ak', 'mac10', 'mp5', 'm700', 'rpg']);
// Mobile exposes the shared desktop arsenal. The low-memory profile still
// starts with only AK/MAC-10 resident; the remaining viewmodels load on demand.
export const MOBILE_WEAPON_ORDER = DESKTOP_WEAPON_ORDER;

export function weaponOrderForProfile(lowMemory = false) {
  return lowMemory ? [...MOBILE_WEAPON_ORDER] : [...DESKTOP_WEAPON_ORDER];
}

export function requestedWeapon(current, command, order) {
  if (!Array.isArray(order) || !order.length) return current;
  const index = Math.max(0, order.indexOf(current));
  if (command === 'next' || command === 'toggle') return order[(index + 1) % order.length];
  if (command === 'prev') return order[(index + order.length - 1) % order.length];
  return order.includes(command) ? command : current;
}
