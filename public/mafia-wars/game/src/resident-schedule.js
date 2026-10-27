// Where a permanent resident should be at a minute of the economic day (bank migration 0008: one city day
// per real day, from midnight Pacific). Pure: the room's resident simulation follows it, and the Founder
// Executive Suite shows the same answer, so the bank and the street always agree.
const PACIFIC = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hourCycle: 'h23', hour: '2-digit', minute: '2-digit' });
export function economicMinuteOfDay(nowMs = Date.now()) {
  const parts = Object.fromEntries(PACIFIC.formatToParts(new Date(nowMs)).map((p) => [p.type, p.value]));
  return (Number(parts.hour) % 24) * 60 + Number(parts.minute);
}

// A 30-minute market trip after each shift; the three people in a job start 10 minutes apart, so a store
// sees a few shoppers at a time instead of a whole crew at once.
export const SHOP_TRIP_MINUTES = 30;
export const shopOffsetFor = (index) => (Number.isInteger(index) && index >= 0 ? (index % 3) * 10 : 0);

// work: { workplaceId, shiftStartMinute, shiftDurationMinutes } or null. An hour's commute before a shift,
// a short market trip after it (index staggers it), the evening in the park; without a job, afternoons in the park.
export function scheduledPlace(work, minute, homeLocationId = 'north-court', index = null) {
  if (work) {
    const start = work.shiftStartMinute, end = start + work.shiftDurationMinutes;
    if (minute >= Math.max(0, start - 60) && minute < start) return { activity: 'commute', locationId: work.workplaceId };
    if (minute >= start && minute < end) return { activity: 'work', locationId: work.workplaceId };
    const shop = end + shopOffsetFor(index);
    if (minute >= shop && minute < Math.min(1_440, shop + SHOP_TRIP_MINUTES)) return { activity: 'shop', locationId: 'corner-market' };
    if (minute >= 1_140 && minute < 1_320) return { activity: 'social', locationId: 'central-park' };
  } else if (minute >= 720 && minute < 1_140) return { activity: 'leisure', locationId: 'central-park' };
  return { activity: 'home', locationId: homeLocationId };
}
