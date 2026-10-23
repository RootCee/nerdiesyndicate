export const WEAPON_AUDIO_PROFILES = Object.freeze({
  ak: Object.freeze({ shotRate: 0.96, shotVolume: 0.85, reloadRate: 0.96, reloadVolume: 0.72 }),
  mac10: Object.freeze({ shotRate: 1.18, shotVolume: 0.7, reloadRate: 1.18, reloadVolume: 0.62 }),
  mp5: Object.freeze({ shotRate: 1.08, shotVolume: 0.68, reloadRate: 1.08, reloadVolume: 0.64 }),
  m700: Object.freeze({ shotRate: 0.78, shotVolume: 0.95, reloadRate: 0.82, reloadVolume: 0.78 }),
  rpg: Object.freeze({ shotRate: 1, shotVolume: 0.9, reloadRate: 1, reloadVolume: 0.72, rocket: true }),
});

export function weaponAudioProfile(weaponId) {
  return WEAPON_AUDIO_PROFILES[weaponId] || WEAPON_AUDIO_PROFILES.ak;
}

export function networkAudioEventKey(kind, message) {
  if (!message?.playerId) return '';
  const identity = Number.isSafeInteger(message.sequence) ? `s${message.sequence}` : Number.isFinite(message.serverTime) ? `t${message.serverTime}:${message.weaponId || ''}` : '';
  return identity ? `${kind}:${message.playerId}:${identity}` : '';
}

export function createNetworkAudioDeduper({ windowMs = 5000, maxEntries = 256 } = {}) {
  const seen = new Map();
  return {
    accept(kind, message, now = performance.now()) {
      const key = networkAudioEventKey(kind, message);
      if (!key) return false;
      const prior = seen.get(key);
      if (Number.isFinite(prior) && now - prior <= windowMs) return false;
      seen.set(key, now);
      if (seen.size > maxEntries) {
        for (const [entry, at] of seen) {
          if (now - at > windowMs || seen.size > maxEntries) seen.delete(entry);
          if (seen.size <= maxEntries) break;
        }
      }
      return true;
    },
    clear() { seen.clear(); },
    get size() { return seen.size; },
  };
}
