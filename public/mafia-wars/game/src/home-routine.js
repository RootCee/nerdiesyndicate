// NC-LIFE-02 Milestone 3: what a resident does while at home. The schedule (resident-schedule.js, from their job row)
// decides WHEN they are home; this decides WHAT they do there: sleep, relax, cook, eat, tidy. Pure and deterministic
// (resident, minute of the economic day), so the room, the client and the tests agree, and a QA room's clock drives it.
//
// Hooks for later milestones: `profile` (personality and preferences: sociability, tidiness), and `override` (a decision
// made elsewhere, e.g. a relationship visit or an underground lifestyle plan, that replaces the routine for a while).
// Nothing here touches money, schedules or housing.

export const HOME_ACTIVITIES = Object.freeze({
  sleep: Object.freeze({ label: 'sleeping', anchor: 'bed', pose: 'lie' }),
  relax: Object.freeze({ label: 'relaxing on the sofa', anchor: 'sofa', pose: 'sit' }),
  cook: Object.freeze({ label: 'cooking', anchor: 'counter', pose: 'stand' }),
  eat: Object.freeze({ label: 'having a meal', anchor: 'table', pose: 'stand' }),
  tidy: Object.freeze({ label: 'tidying up', anchor: 'wardrobe', pose: 'stand' }),
});
const SLEEP_MINUTES = 8 * 60, MEALS = Object.freeze([[420, 480], [720, 780], [1110, 1200]]); // breakfast, lunch, dinner windows
const fnv = (text) => { let h = 0x811c9dc5; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
const inWindow = (m, from, to) => (from <= to ? m >= from && m < to : m >= from || m < to); // windows may cross midnight
const mod = (m) => ((m % 1440) + 1440) % 1440;

// When a resident sleeps: eight hours ending 90 minutes before their shift starts (an hour's commute plus getting
// ready); without a job, 11 PM to 7 AM. Returns { from, to } in minutes of the day (may cross midnight).
export function sleepWindow(work) {
  const wake = work && Number.isInteger(work.shiftStartMinute) ? mod(work.shiftStartMinute - 90) : 420;
  return { from: mod(wake - SLEEP_MINUTES), to: wake };
}

// What the resident does at home at this minute: { kind, label, anchor, pose }. Only meaningful while the schedule has
// them at home. residentId: stable id; work: their employment (job row); profile: { sociability, tidiness } in 0..1.
export function homeActivity({ residentId, minute, work = null, profile = null, override = null }) {
  if (override && HOME_ACTIVITIES[override]) return { kind: override, ...HOME_ACTIVITIES[override] };
  const m = mod(Math.floor(minute)), sleep = sleepWindow(work);
  if (inWindow(m, sleep.from, sleep.to)) return { kind: 'sleep', ...HOME_ACTIVITIES.sleep };
  // meals: cook for the first part of a meal window, then eat
  for (const [from, to] of MEALS) if (m >= from && m < to) { const kind = m < from + 25 ? 'cook' : 'eat'; return { kind, ...HOME_ACTIVITIES[kind] }; }
  // otherwise, in half-hour blocks: mostly relaxing, sometimes tidying (tidier people more often)
  const tidiness = Number.isFinite(profile?.tidiness) ? profile.tidiness : 0.3;
  const roll = (fnv(`${residentId}|${Math.floor(m / 30)}`) % 1000) / 1000;
  const kind = roll < tidiness * 0.6 ? 'tidy' : 'relax';
  return { kind, ...HOME_ACTIVITIES[kind] };
}
export const homeActivityLabel = (args) => homeActivity(args).label;
// The routine's personality inputs from a resident's existing traits (npc-population.js): sociable people relax more,
// the less curious tidy more. One place, so the room, the visuals and the talk card agree.
export const profileFromTraits = (traits) => ({ sociability: Number(traits?.sociability) || 0.5, tidiness: 1 - (Number.isFinite(traits?.curiosity) ? traits.curiosity : 0.5) });
