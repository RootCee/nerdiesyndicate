// M6.7A deterministic city population. The same room seed always produces the
// same residents (role, look, personality, routine), so identities stay
// consistent for every connected player and across reconnects.
import { NPC_LIBRARY, NPC_PALETTES, NPC_ROLE_LABELS, NPC_SCHEMA_VERSION, npcIdFor } from './npc-schema.js';

export const NPC_POPULATION = Object.freeze({
  max: 36,         // identities per city room
  maxActive: 24,   // hard ceiling on simultaneously simulated residents
  startActive: 12, // default active cap until device measurements justify more
  roles: Object.freeze({ civilian: 15, defensive: 7, worker: 8, guard: 6 }),
});

// FNV-1a string hash + mulberry32: small, dependency-free, deterministic.
export function seededRandom(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ROLE_OUTFITS = Object.freeze({ worker: ['worker', 'farmer'], guard: ['suit', 'formal'] });

export function seedPopulation(seed, count = NPC_POPULATION.max) {
  return seedResidents(seed, Math.min(count, NPC_POPULATION.max));
}

// Bank P1.2: the permanent city population (up to 200 residents) from one seed. The same stream of
// draws as seedPopulation, so a seed's first 36 residents are identical either way; the role mix
// repeats every 36 residents.
export const PERMANENT_POPULATION_MAX = 200;
export function seedResidents(seed, count) {
  const random = seededRandom(`npc:${seed}`), pick = (list) => list[Math.floor(random() * list.length)];
  const roles = Object.entries(NPC_POPULATION.roles).flatMap(([role, n]) => Array(n).fill(role));
  const residents = [];
  for (let i = 0; i < Math.min(count, PERMANENT_POPULATION_MAX); i++) {
    const role = roles[i % roles.length], packName = random() < 0.5 ? 'women' : 'men', pack = NPC_LIBRARY[packName];
    const preferred = (ROLE_OUTFITS[role] || []).filter((o) => pack.outfits.includes(o));
    const body = preferred.length && random() < 0.6 ? pick(preferred) : pick(pack.outfits);
    residents.push(Object.freeze({
      id: npcIdFor(i), schemaVersion: NPC_SCHEMA_VERSION, role, label: NPC_ROLE_LABELS[role],
      appearance: Object.freeze({
        pack: packName, head: pick(pack.outfits), body, legs: pick(pack.outfits),
        accessory: pack.accessories[body] && random() < 0.5 ? pack.accessories[body] : null,
        skin: Math.floor(random() * NPC_PALETTES.skin.length), hair: Math.floor(random() * NPC_PALETTES.hair.length),
        top: Math.floor(random() * NPC_PALETTES.cloth.length), bottom: Math.floor(random() * NPC_PALETTES.cloth.length), shoes: Math.floor(random() * NPC_PALETTES.shoes.length),
        height: Math.round((0.94 + random() * 0.12) * 1000) / 1000, build: Math.round((0.92 + random() * 0.18) * 1000) / 1000,
      }),
      traits: Object.freeze({
        bravery: role === 'guard' ? 0.7 + random() * 0.3 : role === 'defensive' ? 0.5 + random() * 0.4 : random() * 0.6,
        aggression: random() * 0.3, sociability: random(), curiosity: random(), pace: Math.round((0.85 + random() * 0.3) * 1000) / 1000,
      }),
      routine: random() < 0.4 ? 'visit' : 'stroll',
    }));
  }
  return residents;
}
