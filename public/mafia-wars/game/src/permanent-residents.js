// Milestone 2.2 permanent city population. This is the browser/room-safe mirror
// of the registry bootstrap: identities are generated from the same immutable
// seed, while schedules contain no account balances or private history.
import { seedResidents } from './npc-population.js';
import { economicMinuteOfDay } from './resident-schedule.js';
import { STORES, STORE_ROTA, STORE_SHIFTS, STORE_SHIFT_MINUTES, storeJobId } from './store-hours.js';
import { ARRIVALS } from './arrival-cohort.js';

export const PERMANENT_RESIDENT_SEED = 'nerdie-city-genesis-v1';
export const PERMANENT_RESIDENT_COUNT = 36;

// Civic opening hours (bank migration 0017): City Hall 8 AM-6 PM, the bank 9 AM-6 PM, the library 9 AM-8 PM, covered by
// the same three residents each on staggered four-hour shifts (one job per resident).
const civic = (resident, jobId, title, workplaceId, shiftStartMinute) => ({ from: resident, to: resident, jobId, title, workplaceId, shiftStartMinute, shiftDurationMinutes: 240 });
const JOBS = Object.freeze([
  civic(1, 'job_bank_teller_open', 'Bank teller', 'nerdie-city-bank', 540),
  civic(2, 'job_bank_teller_mid', 'Bank teller', 'nerdie-city-bank', 720),
  civic(3, 'job_bank_teller_close', 'Bank teller', 'nerdie-city-bank', 840),
  civic(4, 'job_city_hall_clerk_open', 'City Hall clerk', 'city-hall', 480),
  civic(5, 'job_city_hall_clerk_mid', 'City Hall clerk', 'city-hall', 660),
  civic(6, 'job_city_hall_clerk_close', 'City Hall clerk', 'city-hall', 840),
  civic(7, 'job_library_assistant_open', 'Library assistant', 'academy-library', 540),
  civic(8, 'job_library_assistant_mid', 'Library assistant', 'academy-library', 780),
  civic(9, 'job_library_assistant_close', 'Library assistant', 'academy-library', 960),
  { from: 12, to: 14, jobId: 'job_groundskeeper', title: 'Groundskeeper', workplaceId: 'central-park', shiftStartMinute: 420, shiftDurationMinutes: 240 },
]);
// Store staff (store-hours.js, bank migration 0013): one resident per six-hour shift, 4 AM to 10 PM.
const STORE_JOBS = new Map(STORES.flatMap((store) => STORE_ROTA[store.id].map((index, k) => [index, {
  jobId: storeJobId(store.id, STORE_SHIFTS[k].id), title: store.title, workplaceId: store.id, shiftStartMinute: STORE_SHIFTS[k].start, shiftDurationMinutes: STORE_SHIFT_MINUTES,
}])));

// Arrivals (arrival-cohort.js) follow the 36 at the next generator indices: appearance and role from the same seed (so the first 36 are
// byte-identical), traits from their own definitions. A room shows them only when told to (ARRIVAL_RESIDENTS), after the bank has them.
const SEEDED = seedResidents(PERMANENT_RESIDENT_SEED, PERMANENT_RESIDENT_COUNT + ARRIVALS.length);
const bounded = (v, hi) => Math.round(Math.min(hi, Math.max(0, Number(v) || 0)) * 1000) / 1000;
export const ARRIVAL_IDENTITIES = Object.freeze(ARRIVALS.map((a) => { const s = SEEDED[a.residentNo - 1];
  return Object.freeze({ ...s, traits: Object.freeze({ bravery: bounded(a.traits.bravery, 1), aggression: bounded(a.traits.aggression, 1), sociability: bounded(a.traits.sociability, 1), curiosity: bounded(a.traits.curiosity, 1), pace: bounded(a.traits.pace, 1.2) }) }); }));
export const PERMANENT_RESIDENT_IDENTITIES = Object.freeze(SEEDED.slice(0, PERMANENT_RESIDENT_COUNT));   // genesis (36)
export const CITY_RESIDENT_IDENTITIES = Object.freeze([...PERMANENT_RESIDENT_IDENTITIES, ...ARRIVAL_IDENTITIES]);   // genesis + arrivals
export const GENESIS_RESIDENT_COUNT = PERMANENT_RESIDENT_COUNT;
export const CITY_RESIDENT_SCHEDULES = Object.freeze(CITY_RESIDENT_IDENTITIES.map((identity, index) => {
  const number = index + 1;
  // arrivals: no home and no job until they find them (the bank's records drive the rest; employment arrives with the life plans)
  if (index >= PERMANENT_RESIDENT_COUNT) return Object.freeze({ gameId: identity.id, residentId: `res_${String(number).padStart(4, '0')}`, homeLocationId: 'north-court', propertyId: null, employment: null, arrival: true });
  const job = STORE_JOBS.get(index) || JOBS.find((candidate) => number >= candidate.from && number <= candidate.to);
  return Object.freeze({
    gameId: identity.id,
    residentId: `res_${String(number).padStart(4, '0')}`,
    homeLocationId: 'north-court',
    propertyId: `north-court-${String(number).padStart(3, '0')}`,
    employment: job ? Object.freeze({ jobId: job.jobId, title: job.title, workplaceId: job.workplaceId,
      shiftStartMinute: job.shiftStartMinute, shiftDurationMinutes: job.shiftDurationMinutes }) : null,
  });
}));

// Residents keep their schedules on the economic clock, the one the ledger pays shifts by (real Pacific
// time); the sky keeps its own faster cycle.
export { economicMinuteOfDay };
export const PERMANENT_RESIDENT_SCHEDULES = Object.freeze(CITY_RESIDENT_SCHEDULES.slice(0, PERMANENT_RESIDENT_COUNT));
export function permanentNpcOptions(enabled = false, { arrivals = false } = {}) {
  return enabled ? { identities: arrivals ? CITY_RESIDENT_IDENTITIES : PERMANENT_RESIDENT_IDENTITIES, schedules: arrivals ? CITY_RESIDENT_SCHEDULES : PERMANENT_RESIDENT_SCHEDULES, seed: PERMANENT_RESIDENT_SEED, scheduleMinute: economicMinuteOfDay } : {};
}
