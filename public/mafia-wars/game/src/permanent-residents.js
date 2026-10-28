// Milestone 2.2 permanent city population. This is the browser/room-safe mirror
// of the registry bootstrap: identities are generated from the same immutable
// seed, while schedules contain no account balances or private history.
import { seedResidents } from './npc-population.js';
import { economicMinuteOfDay } from './resident-schedule.js';
import { STORES, STORE_ROTA, STORE_SHIFTS, STORE_SHIFT_MINUTES, storeJobId } from './store-hours.js';

export const PERMANENT_RESIDENT_SEED = 'nerdie-city-genesis-v1';
export const PERMANENT_RESIDENT_COUNT = 36;

const JOBS = Object.freeze([
  { from: 1, to: 3, jobId: 'job_bank_teller', title: 'Bank teller', workplaceId: 'nerdie-city-bank', shiftStartMinute: 480, shiftDurationMinutes: 240 },
  { from: 4, to: 6, jobId: 'job_city_hall_clerk', title: 'City Hall clerk', workplaceId: 'city-hall', shiftStartMinute: 540, shiftDurationMinutes: 240 },
  { from: 7, to: 9, jobId: 'job_library_assistant', title: 'Library assistant', workplaceId: 'academy-library', shiftStartMinute: 600, shiftDurationMinutes: 240 },
  { from: 12, to: 14, jobId: 'job_groundskeeper', title: 'Groundskeeper', workplaceId: 'central-park', shiftStartMinute: 420, shiftDurationMinutes: 240 },
]);
// Store staff (store-hours.js, bank migration 0013): one resident per six-hour shift, 4 AM to 10 PM.
const STORE_JOBS = new Map(STORES.flatMap((store) => STORE_ROTA[store.id].map((index, k) => [index, {
  jobId: storeJobId(store.id, STORE_SHIFTS[k].id), title: store.title, workplaceId: store.id, shiftStartMinute: STORE_SHIFTS[k].start, shiftDurationMinutes: STORE_SHIFT_MINUTES,
}])));

export const PERMANENT_RESIDENT_IDENTITIES = Object.freeze(seedResidents(PERMANENT_RESIDENT_SEED, PERMANENT_RESIDENT_COUNT));
export const PERMANENT_RESIDENT_SCHEDULES = Object.freeze(PERMANENT_RESIDENT_IDENTITIES.map((identity, index) => {
  const number = index + 1, job = STORE_JOBS.get(index) || JOBS.find((candidate) => number >= candidate.from && number <= candidate.to);
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
export function permanentNpcOptions(enabled = false) {
  return enabled ? { identities: PERMANENT_RESIDENT_IDENTITIES, schedules: PERMANENT_RESIDENT_SCHEDULES, seed: PERMANENT_RESIDENT_SEED, scheduleMinute: economicMinuteOfDay } : {};
}
