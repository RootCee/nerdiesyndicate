// M6.7B1 resident awareness and reactions: pure rules shared by the server
// simulation and tests. No attacks or damage exist here; the most an NPC does
// toward a player is look, greet, keep its distance, or run away.
//
// Personality is derived from the M6.7A identity (role + traits), so no new
// identity fields are sent and M6.7A clients keep validating identities.

export const NPC_PERSONALITIES = Object.freeze(['peaceful', 'cautious', 'defensive', 'aggressive']);

export function personalityOf(identity) {
  const { role, traits } = identity;
  if (traits.aggression >= 0.21) return 'aggressive';
  if (role === 'defensive' || role === 'guard' || traits.bravery >= 0.6) return 'defensive';
  if (traits.bravery < 0.25) return 'cautious';
  return 'peaceful';
}

// Behaviour codes travel as the optional 7th value of each npc-states entry
// (M6.7A clients read only the first six).
export const NPC_BEHAVIOR = Object.freeze({ calm: 0, alert: 1, startled: 2, flee: 3, greet: 4, wary: 5 });

export const NPC_BEHAVIOR_RULES = Object.freeze({
  hearing: Object.freeze({ gunshot: 45, violence: 25, death: 30, panic: 12 }), // metres
  weight: Object.freeze({ gunshot: 1.0, violence: 0.8, death: 1.2, panic: 0.5 }),
  // A resident flees when the event's severity at its distance exceeds this.
  fleeAt: Object.freeze({ peaceful: 0.25, cautious: 0.08, defensive: 0.75, aggressive: Infinity }),
  startleMs: 700,          // flinch before running or standing alert
  alertMs: 6000,           // stand facing the disturbance, then calm down
  recoverMs: 5000,         // after fleeing, catch breath facing back
  greetMs: 2200, greetRadius: 3.5, greetCooldownMs: 60_000,
  wariness: 10,            // a remembered threat closer than this is avoided again
  threatMemoryMs: 60_000,  // how long a threatening event (and who caused it) is remembered
  fleeSpeed: 3.4,          // m/s at pace 1
  fleeMin: 35, fleeMax: 75, // flee destination distance from the resident
  panicRadius: 12,         // residents this close to a startled or fleeing one react too
  panicDepth: 1,           // secondhand panic spreads one hop only
});

// Severity of an event at a distance: 0 beyond hearing, up to the type weight.
export function severityOf(type, distance) {
  const range = NPC_BEHAVIOR_RULES.hearing[type];
  if (!range || distance > range) return 0;
  return NPC_BEHAVIOR_RULES.weight[type] * (1 - distance / range);
}

export function reactionTo(personality, type, distance) {
  const severity = severityOf(type, distance);
  if (severity <= 0) return 'ignore';
  return severity > NPC_BEHAVIOR_RULES.fleeAt[personality] ? 'flee' : 'alert';
}

// Nonverbal response to a peaceful player stepping close.
export function greetingFor(personality, sociability) {
  if (personality === 'peaceful') return sociability > 0.45 ? 'greet' : null;
  if (personality === 'defensive') return sociability > 0.6 ? 'greet' : null;
  return 'wary'; // cautious and aggressive residents watch rather than wave
}
