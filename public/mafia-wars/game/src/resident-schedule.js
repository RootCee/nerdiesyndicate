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
export function scheduledPlace(work, minute, homeLocationId = 'north-court', index = null, evening = null) {
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
