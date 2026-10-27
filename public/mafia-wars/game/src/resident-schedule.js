// Where a permanent resident should be at a minute of the economic day (bank migration 0008: one city day
// per real day, from midnight Pacific). Pure: the room's resident simulation follows it, and the Founder
// Executive Suite shows the same answer, so the bank and the street always agree.
const PACIFIC = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hourCycle: 'h23', hour: '2-digit', minute: '2-digit' });
export function economicMinuteOfDay(nowMs = Date.now()) {
  const parts = Object.fromEntries(PACIFIC.formatToParts(new Date(nowMs)).map((p) => [p.type, p.value]));
  return (Number(parts.hour) % 24) * 60 + Number(parts.minute);
}

// work: { workplaceId, shiftStartMinute, shiftDurationMinutes } or null. An hour's commute before a shift,
// two hours of shopping after it, the evening in the park; without a job, afternoons in the park.
export function scheduledPlace(work, minute, homeLocationId = 'north-court') {
  if (work) {
    const start = work.shiftStartMinute, end = start + work.shiftDurationMinutes;
    if (minute >= Math.max(0, start - 60) && minute < start) return { activity: 'commute', locationId: work.workplaceId };
    if (minute >= start && minute < end) return { activity: 'work', locationId: work.workplaceId };
    if (minute >= end && minute < Math.min(1_440, end + 120)) return { activity: 'shop', locationId: 'corner-market' };
    if (minute >= 1_140 && minute < 1_320) return { activity: 'social', locationId: 'central-park' };
  } else if (minute >= 720 && minute < 1_140) return { activity: 'leisure', locationId: 'central-park' };
  return { activity: 'home', locationId: homeLocationId };
}
