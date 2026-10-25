// M6.7B2 resident self-defense: pure rules shared by the server simulation
// and tests. Residents only fight someone who attacked them (or, for
// aggressive residents, attacked a resident right beside them); there is no
// path from these rules to attacking a peaceful player.

export const NPC_COMBAT_RULES = Object.freeze({
  maxHealth: 100,
  strikeRange: 1.3,        // stop and strike within this distance
  strikeReach: 1.8,        // server-side validation limit for a strike to land
  cooldownMs: Object.freeze({ defensive: 1600, aggressive: 1250, cornered: 1800 }),
  damage: Object.freeze({ defensive: 8, aggressive: 11, cornered: 6 }),
  approachSpeed: 2.8,      // m/s while closing in
  engageRadius: 20,        // disengage when the attacker gets farther than this
  fightTimeoutMs: 25_000,  // give up a fight after this long
  retreatAt: Object.freeze({ defensive: 45, aggressive: 30, cornered: 15 }), // health below which a fighter retreats
  regenDelayMs: 15_000, regenPerSecond: 4,
  knockdownDamage: 35,     // one hit this heavy knocks a surviving resident down
  knockdownMs: 2200, hurtMs: 450, warnMs: 1200,
  defeatedMinMs: 8000,     // lie at least this long before respawning out of sight
  defeatedMaxMs: 90_000,   // ...and give up waiting for players to leave after this
  respawnProtectionMs: 3000,
  allyRadius: 6,           // aggressive residents defend a resident hit this close
});

export const weaponClass = (weaponId) => (weaponId === 'rpg' ? 'explosive' : weaponId ? 'gun' : 'melee');

// fight | flee | warn | cower. `attacked`: the resident itself was hit;
// `allyAttacked`: a resident within allyRadius was hit.
export function assessThreat({ personality, health, distance, weapon, attackers = 1, escape = true, attacked = false, allyAttacked = false }) {
  const flee = escape ? 'flee' : 'cower';
  // Shot at from afar: hide or get away; nobody charges an attacker beyond engagement range.
  if (distance > NPC_COMBAT_RULES.engageRadius) return flee;
  switch (personality) {
    case 'peaceful': return flee;
    case 'cautious': return weapon === 'melee' && distance > 3 && !attacked ? 'warn' : flee;
    case 'defensive':
      if (!attacked) return flee;
      if (health >= 50 && attackers <= 1 && distance <= (weapon === 'melee' ? 8 : 4) && weapon !== 'explosive') return 'fight';
      return escape ? 'flee' : health >= 25 ? 'fight' : 'cower'; // cornered: defend
    case 'aggressive':
      if (!attacked && !allyAttacked) return flee;
      if (health >= 35 && attackers <= 2 && weapon !== 'explosive' && (weapon === 'melee' || distance <= 12)) return 'fight';
      return escape ? 'flee' : health >= 20 ? 'fight' : 'cower';
    default: return flee;
  }
}

// Strike stats for a fighter (cornered peaceful/cautious residents never strike).
export function strikeProfile(personality, cornered = false) {
  if (personality === 'aggressive') return { damage: NPC_COMBAT_RULES.damage.aggressive, cooldownMs: NPC_COMBAT_RULES.cooldownMs.aggressive, retreatAt: NPC_COMBAT_RULES.retreatAt.aggressive };
  if (personality === 'defensive') return { damage: NPC_COMBAT_RULES.damage.defensive, cooldownMs: NPC_COMBAT_RULES.cooldownMs.defensive, retreatAt: NPC_COMBAT_RULES.retreatAt.defensive };
  return cornered ? { damage: NPC_COMBAT_RULES.damage.cornered, cooldownMs: NPC_COMBAT_RULES.cooldownMs.cornered, retreatAt: NPC_COMBAT_RULES.retreatAt.cornered } : null;
}
