// Where a permanent resident should be at a minute of the economic day (bank migration 0008: one city day
// per real day, from midnight Pacific). Pure: the room's resident simulation follows it, and the Founder
// Executive Suite shows the same answer, so the bank and the street always agree.
import { isStoreOpen } from './store-hours.js';

const PACIFIC = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hourCycle: 'h23', hour: '2-digit', minute: '2-digit' });
// NC-LIFE-01A preview: the bank's clock can run faster than real time (admin.simulation_clock.acceleration);
// rooms and clients then follow it instead of Pacific time. Unset (production), nothing changes.
let economicClock = null;
export function setEconomicClock(clock) {
  economicClock = clock && Number.isFinite(clock.minute) && Number.isFinite(clock.at) && clock.acceleration >= 1 && clock.acceleration <= 3600 ? { minute: clock.minute, at: clock.at, acceleration: clock.acceleration } : null;
  return economicClock;
}
export function economicMinuteOfDay(nowMs = Date.now()) {
  if (economicClock) return ((Math.floor(economicClock.minute + (nowMs - economicClock.at) / 60_000 * economicClock.acceleration) % 1_440) + 1_440) % 1_440;
  const parts = Object.fromEntries(PACIFIC.formatToParts(new Date(nowMs)).map((p) => [p.type, p.value]));
  return (Number(parts.hour) % 24) * 60 + Number(parts.minute);
}

// A 30-minute market trip after each shift (while the market is open); people finishing at the same time
// (a job's crew, the stores' early shift) start 10 minutes apart, so the market sees a few shoppers at a time.
export const SHOP_TRIP_MINUTES = 30;
export const shopOffsetFor = (index) => (Number.isInteger(index) && index >= 0 ? (index % 6) * 10 : 0);

// work: { workplaceId, shiftStartMinute, shiftDurationMinutes } or null. An hour's commute before a shift,
// a short market trip after it (index staggers it), the evening in the park; without a job, afternoons in the park.
// evening (NC-LIFE-01A): { locationId, from, to } when the bank says this resident chose a night out
// (registry.life_plans); it follows work and comes before the market trip and the park.
// errand (bank visits, approved 11 November 2026): { locationId, from, to } from residentBankVisit(); it replaces
// only free time (home, the park, socialising), never work, the commute, a market trip or a planned night out.
export function scheduledPlace(work, minute, homeLocationId = 'north-court', index = null, evening = null, errand = null) {
  const place = basePlace(work, minute, homeLocationId, index, evening);
  if (errand && minute >= errand.from && minute < errand.to && FREE_ACTIVITIES.has(place.activity)) return { activity: 'errand', locationId: errand.locationId };
  return place;
}
const FREE_ACTIVITIES = new Set(['home', 'leisure', 'social']);
function basePlace(work, minute, homeLocationId, index, evening) {
  const out = evening && minute >= evening.from && minute < evening.to ? { activity: 'leisure', locationId: evening.locationId } : null;
  if (work) {
    const start = work.shiftStartMinute, end = start + work.shiftDurationMinutes;
    if (minute >= Math.max(0, start - 60) && minute < start) return { activity: 'commute', locationId: work.workplaceId };
    if (minute >= start && minute < end) return { activity: 'work', locationId: work.workplaceId };
    if (out) return out;
    const shop = end + shopOffsetFor(index);
    if (minute >= shop && minute < Math.min(1_440, shop + SHOP_TRIP_MINUTES) && isStoreOpen(shop) && isStoreOpen(minute)) return { activity: 'shop', locationId: 'corner-market' };
    if (minute >= 1_140 && minute < 1_320) return { activity: 'social', locationId: 'central-park' };
  } else if (out) return out;
  else if (minute >= 720 && minute < 1_140) return { activity: 'leisure', locationId: 'central-park' };
  return { activity: 'home', locationId: homeLocationId };
}

// NC-LIFE-01A: the evening window for a planned Roots night, matching when the bank records the visit
// (an hour after the shift, by 21:00; 18:00 without a job) and closing with the lounge at 22:00.
export const ROOTS_CLOSE_MINUTE = 1_320;
export function rootsEvening(work) {
  const from = work ? Math.min(1_260, work.shiftStartMinute + work.shiftDurationMinutes + 60) : 1_080;
  const end = work ? work.shiftStartMinute + work.shiftDurationMinutes : 0;
  if (end > 1_260) return null; // still working when the visit would start
  return { locationId: 'roots-lounge', from, to: Math.min(ROOTS_CLOSE_MINUTE, from + 90) };
}

// ---- bank visits (approved 11 November 2026) ----
// On some days a resident who is free makes one short visit to the Nerdie City Bank while the tellers are in
// (8 AM-noon Pacific). Which days and when come from a hash of the resident and the day, so every room, the
// talk card and the Founder Executive Suite agree without storing anything. Tuned (40 minutes, 70% of free
// mornings) to about 1.5 customers in the bank on average during teller hours, at most 8. A visit is only a place in the day:
// no ledger entry, no balance change, no tokens.
export const BANK_VISIT_RULES = Object.freeze({ locationId: 'nerdie-city-bank', open: 480, close: 720, minutes: 40, step: 5, perThousand: 700 });
// The day key the talk card already uses (resident-panel.js); it only needs to change once a day.
export const pacificDayKey = (ms = Date.now()) => new Date(ms - 7 * 3_600_000).toISOString().slice(0, 10);
const fnv = (text) => { let h = 0x811c9dc5; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
export function residentBankVisit(residentId, dayKey, work, homeLocationId = 'north-court', index = null, evening = null, rules = BANK_VISIT_RULES) {
  if (typeof residentId !== 'string' || typeof dayKey !== 'string') return null;
  const h = fnv(`${residentId}|${dayKey}|bank-visit`);
  if (h % 1000 >= rules.perThousand) return null;
  const slots = Math.floor((rules.close - rules.open - rules.minutes) / rules.step) + 1, from = rules.open + (fnv(`${h}`) % slots) * rules.step, to = from + rules.minutes;
  for (let m = from; m < to; m += rules.step) if (!FREE_ACTIVITIES.has(basePlace(work, m, homeLocationId, index, evening).activity)) return null; // busy then
  return { locationId: rules.locationId, from, to };
}
export const residentIdFor = (index) => `res_${String(index + 1).padStart(4, '0')}`;
