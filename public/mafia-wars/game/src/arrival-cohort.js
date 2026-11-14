// Development arrival cohorts: new AI residents who join the permanent population after genesis (36). Each has a fixed resident number,
// so the bank (registry.arrive_residents), the rooms (permanent-residents.js) and the client agree on who is who, and arrival is
// idempotent across restarts and deployments. They arrive with nothing handed to them: no job, home, membership, weapon, rank or money;
// relationships only where the backstory gives one. Interests are what they talk about and do; ambitions drive their own decisions.
// Room identities (appearance, role) come from the genesis seed at the same index (seedResidents), so the first 36 never change.
// Milestone 10: cohort 1 (six). Milestone 11: cohort 2 (twenty). Planning target ~200 residents (npc-population.js PERMANENT_POPULATION_MAX).
const t = (pace, bravery, curiosity, aggression, sociability) => ({ pace, bravery, curiosity, aggression, sociability });
const COHORT_1 = [
  { name: 'Dante Rivers', ambition: 'underground_influence', secondaryAmbition: 'financial_independence', traits: t(1.05, 0.7, 0.35, 0.28, 0.55), interests: ['street life', 'boxing'],
    backstory: 'Back in town after a few hard years; a cousin in North Court vouched for him.', knowsFoundingGang: 'aggressive' },
  { name: 'Mae Okafor', ambition: 'career_advancement', secondaryAmbition: 'home_ownership', traits: t(0.98, 0.35, 0.85, 0.02, 0.5), interests: ['bookkeeping', 'reading'],
    backstory: 'A bookkeeper who moved for work that fell through; looking for a job and a room.' },
  { name: 'Tomas Reyes', ambition: 'financial_independence', secondaryAmbition: 'business_ownership', traits: t(1.1, 0.5, 0.55, 0.18, 0.6), interests: ['sales', 'sneakers'],
    backstory: 'A hustler with sales experience who once worked beside a crew founder.', knowsFoundingGang: 'disciplined' },
  { name: 'Lena Park', ambition: 'social_popularity', secondaryAmbition: 'civic_influence', traits: t(1.0, 0.4, 0.6, 0.03, 0.88), interests: ['nightlife', 'music'],
    backstory: 'A promoter who wants to know everyone and throw the best nights at Roots.' },
  { name: 'Grace Holloway', ambition: 'security_stability', secondaryAmbition: 'civic_influence', traits: t(0.85, 0.2, 0.4, 0.0, 0.45), interests: ['gardening', 'church'],
    backstory: 'A retired nurse starting over after losing her flat; wants a quiet, safe life.' },
  { name: 'Kofi Mensah', ambition: 'business_ownership', secondaryAmbition: 'career_advancement', traits: t(1.02, 0.6, 0.8, 0.06, 0.5), interests: ['electronics', 'repair'],
    backstory: 'A tinkerer who dreams of running his own shop; repairs phones for anyone who asks.' },
];
const COHORT_2 = [
  { name: 'Marisol Vega', ambition: 'career_advancement', secondaryAmbition: 'home_ownership', traits: t(1.0, 0.45, 0.7, 0.04, 0.55), interests: ['chess', 'accounting'],
    backstory: 'A night-school accountant who learned chess from her grandfather and wants steady work.' },
  { name: 'Theo Adeyemi', ambition: 'business_ownership', secondaryAmbition: 'financial_independence', traits: t(1.06, 0.55, 0.75, 0.05, 0.62), interests: ['food', 'markets'],
    backstory: 'Sold suya from a cart back home; saving to open a food counter.' },
  { name: 'Rashad Coleman', ambition: 'underground_influence', secondaryAmbition: 'organizational_leadership', traits: t(1.08, 0.75, 0.3, 0.32, 0.5), interests: ['street life', 'cars'],
    backstory: 'Grew up two blocks over; heard the Hounds were taking on people who can hold their own.', knowsFoundingGang: 'aggressive' },
  { name: 'Priya Natarajan', ambition: 'civic_influence', secondaryAmbition: 'career_advancement', traits: t(0.95, 0.4, 0.9, 0.02, 0.6), interests: ['chess', 'local politics'],
    backstory: 'A former debate coach who wants a voice at City Hall and a good game in the park.' },
  { name: 'Benny Castillo', ambition: 'social_popularity', secondaryAmbition: 'independence', traits: t(1.1, 0.5, 0.5, 0.08, 0.92), interests: ['dancing', 'nightlife'],
    backstory: 'A dancer who goes wherever the music is; knows how to make a room laugh.' },
  { name: 'Odessa King', ambition: 'security_stability', secondaryAmbition: 'home_ownership', traits: t(0.82, 0.25, 0.35, 0.0, 0.4), interests: ['sewing', 'cooking'],
    backstory: 'A seamstress who came to be near her sister; wants a small, safe place of her own.' },
  { name: 'Felix Brandt', ambition: 'career_advancement', secondaryAmbition: 'financial_independence', traits: t(1.0, 0.5, 0.65, 0.05, 0.35), interests: ['chess', 'machines'],
    backstory: 'A quiet mechanic who plays speed chess on his phone between jobs.' },
  { name: 'Nadia Haddad', ambition: 'business_ownership', secondaryAmbition: 'social_popularity', traits: t(1.04, 0.5, 0.8, 0.03, 0.78), interests: ['fashion', 'retail'],
    backstory: 'Ran a thrift stall online; wants a real storefront on the strip.' },
  { name: 'Curtis Mayfield Jr.', ambition: 'underground_influence', secondaryAmbition: 'financial_independence', traits: t(1.04, 0.6, 0.4, 0.24, 0.45), interests: ['music', 'street life'],
    backstory: 'A producer short on money and patience; not opposed to fast cash.' },
  { name: 'Hana Sato', ambition: 'career_advancement', secondaryAmbition: 'civic_influence', traits: t(0.97, 0.35, 0.88, 0.01, 0.52), interests: ['libraries', 'chess'],
    backstory: 'A graduate student who wants work at the Academy library and a regular chess partner.' },
  { name: 'Marcus Oyelaran', ambition: 'organizational_leadership', secondaryAmbition: 'civic_influence', traits: t(1.02, 0.6, 0.6, 0.06, 0.8), interests: ['community organizing', 'basketball'],
    backstory: 'Ran a youth league back home; wants to build something people belong to.' },
  { name: 'Lucia Ferraro', ambition: 'home_ownership', secondaryAmbition: 'security_stability', traits: t(0.93, 0.35, 0.5, 0.02, 0.55), interests: ['cooking', 'gardening'],
    backstory: 'A line cook who has rented for twenty years and wants her own door key.' },
  { name: 'Jamal Whitfield', ambition: 'financial_independence', secondaryAmbition: 'underground_influence', traits: t(1.07, 0.55, 0.45, 0.2, 0.6), interests: ['dice', 'sneakers'],
    backstory: 'Always has an angle; will take honest work if it pays, and the other kind if it pays better.' },
  { name: 'Ruth Abernathy', ambition: 'security_stability', secondaryAmbition: 'social_popularity', traits: t(0.8, 0.2, 0.55, 0.0, 0.7), interests: ['chess', 'gospel'],
    backstory: 'A retired schoolteacher who keeps a chess set in her bag and a hymn in her pocket.' },
  { name: 'Ezra Goldfarb', ambition: 'business_ownership', secondaryAmbition: 'career_advancement', traits: t(1.0, 0.45, 0.85, 0.03, 0.5), interests: ['watches', 'repair'],
    backstory: 'A watch repairer looking for a corner of a shop to rent.' },
  { name: 'Tasha Monroe', ambition: 'social_popularity', secondaryAmbition: 'career_advancement', traits: t(1.05, 0.45, 0.6, 0.05, 0.85), interests: ['hair', 'music'],
    backstory: 'A stylist who brings her clients by word of mouth; looking for chairs and friends.' },
  { name: 'Victor Okonkwo', ambition: 'career_advancement', secondaryAmbition: 'home_ownership', traits: t(0.99, 0.65, 0.5, 0.07, 0.45), interests: ['security work', 'weightlifting'],
    backstory: 'A former security guard who wants a steady shift and a place to rest.' },
  { name: 'Selena Cruz', ambition: 'independence', secondaryAmbition: 'social_popularity', traits: t(1.1, 0.6, 0.75, 0.12, 0.65), interests: ['skateboarding', 'art'],
    backstory: 'An artist who paints murals for food; does not like being told what to do.' },
  { name: 'Darius Grant', ambition: 'underground_influence', secondaryAmbition: 'social_popularity', traits: t(1.06, 0.55, 0.35, 0.22, 0.7), interests: ['street life', 'music'],
    backstory: 'A charmer who knows a Sparrow from the old neighbourhood.', knowsFoundingGang: 'disciplined' },
  { name: 'Agnes Whitlock', ambition: 'civic_influence', secondaryAmbition: 'security_stability', traits: t(0.84, 0.3, 0.7, 0.01, 0.6), interests: ['chess', 'history'],
    backstory: 'A former librarian who reads the city archives for fun and plays a careful game.' },
];
const number = (start, list, cohort) => list.map((a, i) => Object.freeze({ ...a, role: a.role || 'worker', residentNo: start + i, cohort }));
export const ARRIVAL_COHORTS = Object.freeze({ 'arrival-cohort-1': number(37, COHORT_1, 'arrival-cohort-1'), 'arrival-cohort-2': number(43, COHORT_2, 'arrival-cohort-2') });
export const ARRIVALS = Object.freeze(Object.values(ARRIVAL_COHORTS).flat());
export const ARRIVAL_COHORT = ARRIVAL_COHORTS['arrival-cohort-1'];   // Milestone 10 name
export const arrivalByNo = (no) => ARRIVALS.find((a) => a.residentNo === no) || null;
