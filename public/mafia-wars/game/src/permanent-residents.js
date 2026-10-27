// Milestone 2.2 permanent city population. This is the browser/room-safe mirror
// of the registry bootstrap: identities are generated from the same immutable
// seed, while schedules contain no account balances or private history.
import { seedResidents } from './npc-population.js';

export const PERMANENT_RESIDENT_SEED = 'nerdie-city-genesis-v1';
export const PERMANENT_RESIDENT_COUNT = 36;

const JOBS = Object.freeze([
  { from: 1, to: 3, jobId: 'job_bank_teller', title: 'Bank teller', workplaceId: 'nerdie-city-bank', shiftStartMinute: 480, shiftDurationMinutes: 240 },
  { from: 4, to: 6, jobId: 'job_city_hall_clerk', title: 'City Hall clerk', workplaceId: 'city-hall', shiftStartMinute: 540, shiftDurationMinutes: 240 },
  { from: 7, to: 9, jobId: 'job_library_assistant', title: 'Library assistant', workplaceId: 'academy-library', shiftStartMinute: 600, shiftDurationMinutes: 240 },
  { from: 10, to: 11, jobId: 'job_ammo_clerk', title: 'Ammo store clerk', workplaceId: 'nerdie-arms', shiftStartMinute: 720, shiftDurationMinutes: 240 },
  { from: 12, to: 14, jobId: 'job_groundskeeper', title: 'Groundskeeper', workplaceId: 'central-park', shiftStartMinute: 420, shiftDurationMinutes: 240 },
  { from: 15, to: 17, jobId: 'job_corner_market', title: 'Corner Market employee', workplaceId: 'corner-market', shiftStartMinute: 660, shiftDurationMinutes: 240 },
]);

export const PERMANENT_RESIDENT_IDENTITIES = Object.freeze(seedResidents(PERMANENT_RESIDENT_SEED, PERMANENT_RESIDENT_COUNT));
export const PERMANENT_RESIDENT_SCHEDULES = Object.freeze(PERMANENT_RESIDENT_IDENTITIES.map((identity, index) => {
  const number = index + 1, job = JOBS.find((candidate) => number >= candidate.from && number <= candidate.to);
  return Object.freeze({
    gameId: identity.id,
    residentId: `res_${String(number).padStart(4, '0')}`,
    homeLocationId: 'north-court',
    propertyId: `north-court-${String(number).padStart(3, '0')}`,
    employment: job ? Object.freeze({ jobId: job.jobId, title: job.title, workplaceId: job.workplaceId,
      shiftStartMinute: job.shiftStartMinute, shiftDurationMinutes: job.shiftDurationMinutes }) : null,
  });
}));

export function permanentNpcOptions(enabled = false) {
  return enabled ? { identities: PERMANENT_RESIDENT_IDENTITIES, schedules: PERMANENT_RESIDENT_SCHEDULES, seed: PERMANENT_RESIDENT_SEED } : {};
}
