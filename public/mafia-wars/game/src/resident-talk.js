// Light conversation with a permanent resident. Pure: every line is written here and filled from the
// resident's real schedule (resident-schedule.js), job and personality, so what they say always matches
// where the bank says they are. No free text and no AI: residents only ever say these lines.
import { scheduledPlace } from './resident-schedule.js';

export const TALK_PLACES = Object.freeze([
  { id: 'nerdie-city-bank', name: 'the bank' }, { id: 'nerdie-arms', name: 'Ammo' }, { id: 'corner-market', name: 'the Corner Market' },
  { id: 'city-hall', name: 'City Hall' }, { id: 'academy-library', name: 'the Library' }, { id: 'central-park', name: 'Central Park' },
  { id: 'north-court', name: 'North Court Apartments' },
]);
const placeName = (id) => TALK_PLACES.find((p) => p.id === id)?.name || 'work';
const PLACE_TITLE = (name) => name.charAt(0).toUpperCase() + name.slice(1);

const clock = (minute) => { const m = ((minute % 1440) + 1440) % 1440, h = Math.floor(m / 60); return `${h % 12 || 12}${m % 60 ? `:${String(m % 60).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`; };
// A stable choice for the day: the same resident gives the same answer until tomorrow.
const pick = (lines, seed) => { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return lines[(h >>> 0) % lines.length]; };

// Each personality has its own voice. {name} {place} {until} {start} are filled in.
const VOICES = Object.freeze({
  peaceful: {
    hello: ['Hey there! I\'m {name}.', 'Hi, neighbor. {name}, nice to meet you.', 'Well hello! Name\'s {name}.'],
    work: ['Working at {place} till {until}. Steady day so far.', 'On shift at {place} until {until}. Come by sometime!'],
    commute: ['On my way to {place}. I start at {start}.', 'Headed to {place}, shift starts at {start}.'],
    shop: ['Just got off. Picking up something at the Corner Market.', 'Shift\'s done, so I\'m grabbing groceries.'],
    social: ['Just catching up with folks in the park.', 'Evenings in the park are the best part of the day.'],
    leisure: ['Enjoying the park while the sun\'s out.', 'Taking a slow afternoon in the park.'],
    home: ['Just taking it easy today.', 'Not much going on. Heading home soon.'],
    bye: ['Take care now!', 'See you around, neighbor.'],
  },
  cautious: {
    hello: ['Oh. Hi. I\'m {name}.', 'Um, hello. {name}.', 'Hi... sorry, I\'m {name}.'],
    work: ['I\'m working. At {place}, until {until}.', 'Still on shift at {place}. Till {until}.'],
    commute: ['I can\'t be late. {place} at {start}.', 'Going to {place}. I start at {start}.'],
    shop: ['Just getting a few things. Then home.', 'Quick stop at the market, that\'s all.'],
    social: ['The park\'s nice in the evening. Quiet.', 'Just sitting a while in the park.'],
    leisure: ['I like the park when it\'s calm.', 'Just getting some air.'],
    home: ['I\'m just heading home.', 'Staying in, mostly.'],
    bye: ['Okay. Bye.', 'Be safe out there.'],
  },
  defensive: {
    hello: ['{name}. What can I do for you?', 'Name\'s {name}. You need something?', '{name}. Keep it friendly and we\'re good.'],
    work: ['On the clock at {place} till {until}.', 'Working {place}. Done at {until}.'],
    commute: ['Headed to {place}. Clock in at {start}.', 'Got a shift at {place}, {start}. Walk with me.'],
    shop: ['Off the clock. Picking up food.', 'Grabbing supplies before I head in.'],
    social: ['Keeping an eye on the park tonight.', 'Just checking in with the neighborhood.'],
    leisure: ['Just out in the park.', 'Watching the block from the park.'],
    home: ['Laying low today.', 'Just watching the block.'],
    bye: ['Stay sharp.', 'Watch yourself out there.'],
  },
  aggressive: {
    hello: ['{name}. Make it quick.', 'Yeah? I\'m {name}.', '{name}. What\'s up?'],
    work: ['Working. {place}, till {until}. Don\'t hold me up.', 'Clocked in at {place}. Out at {until}.'],
    commute: ['Running to {place}. Starts at {start}.', 'Can\'t talk long, I\'m due at {place} at {start}.'],
    shop: ['Grabbing food. Shift wore me out.', 'Market run. That\'s it.'],
    social: ['Just posted up in the park.', 'Chilling. Park\'s the spot tonight.'],
    leisure: ['Killing time in the park.', 'Just hanging out.'],
    home: ['Nothing going on today.', 'Just around.'],
    bye: ['Later.', 'Aight.'],
  },
});

export const TALK_TOPICS = Object.freeze([
  { id: 'how', label: 'How\'s it going?' }, { id: 'work', label: 'What do you do?' },
  { id: 'where', label: 'Where can I find…?' }, { id: 'bye', label: 'See you around' },
]);

// resident: { index, name, personality, job: { title, workplaceId, shiftStartMinute, shiftDurationMinutes } | null,
// chess: { hello } | null }; minute: the economic minute of the day; day: a day key (YYYY-MM-DD) for stable choices.
export function residentConversation(resident, minute, day = '') {
  const voice = VOICES[resident.personality] || VOICES.peaceful, job = resident.job;
  const at = scheduledPlace(job, minute, 'north-court', resident.index), seed = (topic) => `${resident.index}:${day}:${topic}`;
  const fill = (line) => line.replaceAll('{name}', resident.name)
    .replaceAll('{place}', at.locationId === job?.workplaceId ? placeName(job.workplaceId) : placeName(at.locationId))
    .replaceAll('{until}', job ? clock(job.shiftStartMinute + job.shiftDurationMinutes) : '')
    .replaceAll('{start}', job ? clock(job.shiftStartMinute) : '');
  const greeting = resident.chess?.hello && at.activity !== 'work' ? `${fill(pick(voice.hello, seed('hello')))} ${resident.chess.hello}` : fill(pick(voice.hello, seed('hello')));
  return {
    activity: at.activity, locationId: at.locationId, greeting, topics: TALK_TOPICS,
    reply(topic, placeId = null) {
      if (topic === 'how') return { text: fill(pick(voice[at.activity] || voice.home, seed(`how:${at.activity}`))) };
      if (topic === 'work') {
        const chess = resident.chess ? ' And you can find me at the chess tables in Central Park.' : '';
        if (!job) return { text: `No steady job right now. I pick up city temp work when there's a slot.${chess}` };
        const title = job.title.toLowerCase().replace('city hall', 'City Hall').replace('corner market', 'Corner Market').replace('ammo', 'Ammo');
        return { text: `I'm ${/^[aeiou]/i.test(title) ? 'an' : 'a'} ${title} at ${placeName(job.workplaceId)}, ${clock(job.shiftStartMinute)} to ${clock(job.shiftStartMinute + job.shiftDurationMinutes)}.${chess}` };
      }
      if (topic === 'where') {
        const place = TALK_PLACES.find((p) => p.id === placeId);
        if (!place) return { text: 'Where are you trying to go?', places: TALK_PLACES };
        const mine = job?.workplaceId === place.id ? ' That\'s where I work.' : '';
        return { text: `${PLACE_TITLE(place.name)}? I'll point you there.${mine}`, waypoint: place.id };
      }
      return { text: fill(pick(voice.bye, seed('bye'))), done: true };
    },
  };
}
