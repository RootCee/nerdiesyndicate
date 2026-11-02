// NC-ECO-01: deterministic, server-authoritative simulated city economy.
// All values are integer cents of SIMULATED $NERDIE. This module never imports a
// wallet, contract, RPC client, or token API. A future settlement adapter must
// remain a separate, explicitly funded boundary.
import { seededRandom } from './npc-population.js';

export const ECONOMY_SCHEMA_VERSION = 1;
export const CITY_OWNER_ID = 'nerdie-city';
export const ROOTS_LOUNGE_ID = 'roots-lounge';
// NC-ECO-01D: players receive no currency (no starter grant) and enter Roots free until player income exists.
// Suggestions are bounded: per author, per room for all players together (a rejoin is a new id), and in total.
export const ECONOMY_RULES = Object.freeze({ residentCount: 100, agentCount: 10, hourMs: 60_000, maxCatchupHours: 72, ledgerLimit: 256, playerAdmissionFee: 0, suggestionLimitPerHour: 3, playerSuggestionsPerHour: 12, suggestionLimit: 200 });

const NAMES = Object.freeze(['Avery Brooks', 'Jordan Ellis', 'Morgan Price', 'Cameron Reed', 'Taylor Grant', 'Riley James', 'Drew Carter', 'Quinn Bailey', 'Casey Monroe', 'Skyler Hayes', 'Kai Bennett', 'Parker Stone', 'Reese Walker', 'Amari Cole', 'Sydney Hart', 'Devon Lane', 'Sage Robinson', 'Micah Turner', 'Rowan Clark', 'Alexis Young']);
const OCCUPATIONS = Object.freeze(['grocer', 'cook', 'driver', 'host', 'performer', 'maintenance', 'housing-coordinator', 'student']);
const NEIGHBORHOODS = Object.freeze(['neighborhood-one', 'east-market', 'east-side', 'north-blocks']);
const ENTERTAINMENT = Object.freeze(['live-music', 'dance', 'social', 'food', 'quiet']);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const int = (n) => Math.max(0, Math.round(Number(n) || 0));
const clone = (v) => JSON.parse(JSON.stringify(v));
const pick = (random, list) => list[Math.floor(random() * list.length)];

export function createBusinesses() {
  const business = (id, name, category, extra = {}) => ({
    id, name, category, ownerId: CITY_OWNER_ID, propertyOwnerId: CITY_OWNER_ID,
    cityOwned: true, leaseEligible: true, operatorIds: [], inventory: {}, cash: 100_000,
    revenue: 0, expenses: 0, wages: 0, transactions: 0, ...extra,
  });
  return [
    business(ROOTS_LOUNGE_ID, 'Roots Lounge', 'entertainment', { leaseEligible: false, protected: true, admissionFee: 1_500, capacity: 48, inventory: { refreshments: 500 }, cash: 200_000 }),
    business('corner-grocery', 'Neighborhood One Grocery', 'grocery', { inventory: { groceries: 2_000 }, unitPrice: 850 }),
    business('roots-kitchen', 'Roots Kitchen', 'restaurant', { inventory: { meals: 1_000 }, unitPrice: 1_250 }),
    business('city-transit', 'Nerdie City Transit', 'transportation', { inventory: { rides: 10_000 }, unitPrice: 350 }),
    business('city-housing', 'Nerdie City Housing', 'residential-rentals', { inventory: { units: 100 }, unitPrice: 8_000 }),
  ];
}

export function seedResidents(seed = 'nerdie-city', count = ECONOMY_RULES.residentCount) {
  const random = seededRandom(`economy:${seed}`), residents = [];
  for (let i = 0; i < count; i++) {
    const neighborhood = i < 40 ? 'neighborhood-one' : pick(random, NEIGHBORHOODS);
    const occupation = OCCUPATIONS[i % OCCUPATIONS.length];
    const preferences = [pick(random, ENTERTAINMENT)];
    if (preferences[0] !== 'live-music' && random() < 0.55) preferences.push('live-music');
    const id = `resident-${String(i + 1).padStart(3, '0')}`;
    residents.push({
      id, name: `${NAMES[i % NAMES.length]} ${Math.floor(i / NAMES.length) + 1}`,
      residence: `city-home-${String((i % 50) + 1).padStart(3, '0')}`, neighborhood, occupation,
      employerId: occupation === 'grocer' ? 'corner-grocery' : occupation === 'cook' ? 'roots-kitchen' : occupation === 'driver' ? 'city-transit' : occupation === 'housing-coordinator' ? 'city-housing' : ROOTS_LOUNGE_ID,
      income: 2_400 + (i % 8) * 250, spendingBudget: 12_000 + Math.floor(random() * 10_000), savings: 20_000 + Math.floor(random() * 50_000),
      entertainmentPreferences: preferences, schedule: { workStart: 8 + (i % 3), workEnd: 16 + (i % 3), leisureStart: 18 + (i % 4), sleep: 23 },
      relationships: [], satisfaction: Math.round((0.55 + random() * 0.35) * 100) / 100,
      location: 'residence', activity: 'home', rootsVisits: 0, lastDecisionHour: -1,
    });
  }
  for (let i = 0; i < residents.length; i++) residents[i].relationships = [residents[(i + 1) % residents.length].id, residents[(i + 7) % residents.length].id];
  return residents;
}

export function seedAgents(residents, count = ECONOMY_RULES.agentCount) {
  const ambitions = ['build-savings', 'community-leadership', 'hospitality-career', 'entrepreneurship', 'civic-influence'];
  return residents.slice(0, count).map((resident, i) => ({
    id: `agent-${String(i + 1).padStart(2, '0')}`, residentId: resident.id,
    personality: i % 3 === 0 ? 'ambitious' : i % 3 === 1 ? 'social' : 'pragmatic',
    goals: [{ id: ambitions[i % ambitions.length], progress: 0, status: 'active' }],
    economicAmbition: ambitions[i % ambitions.length], relationships: [...resident.relationships], memory: [],
    employmentInterest: resident.occupation, businessInterests: [i % 2 ? 'restaurant' : 'entertainment'],
    neighborhood: resident.neighborhood, reputation: 10 + i, influence: 5 + i, lastDecision: null,
  }));
}

export class CityEconomy {
  constructor({ seed = 'nerdie-city', now = () => Date.now(), state = null } = {}) {
    this.seed = seed; this.now = now; this.random = seededRandom(`decisions:${seed}`);
    this.treasury = { id: CITY_OWNER_ID, balance: 10_000_000, revenue: 0, expenses: 0 };
    this.businesses = createBusinesses(); this.residents = seedResidents(seed); this.agents = seedAgents(this.residents);
    this.suggestions = []; this.playerAccounts = {}; this.ledger = []; this.nextTransaction = 1; this.nextSuggestion = 1;
    this.hour = 0; this.lastTickAt = now(); this.changed = true;
    this.genesisFunding = this.totalMoney();
    this.ledger.push({ id: 'tx-genesis', type: 'funding', source: 'genesis', destination: 'city-economy', amount: this.genesisFunding, hour: 0 });
    if (state) this.restore(state);
  }

  business(id) { return this.businesses.find((b) => b.id === id); }
  resident(id) { return this.residents.find((r) => r.id === id); }
  agent(id) { return this.agents.find((a) => a.id === id || a.residentId === id); }
  totalMoney() { return this.treasury.balance + this.businesses.reduce((n, b) => n + b.cash, 0) + this.residents.reduce((n, r) => n + r.spendingBudget + r.savings, 0) + Object.values(this.playerAccounts).reduce((n, a) => n + a.balance, 0); }
  #record(entry) {
    this.ledger.push({ id: `tx-${String(this.nextTransaction++).padStart(7, '0')}`, hour: this.hour, ...entry });
    if (this.ledger.length > ECONOMY_RULES.ledgerLimit) this.ledger.splice(1, this.ledger.length - ECONOMY_RULES.ledgerLimit);
    this.changed = true;
  }
  #residentDebit(resident, amount, { savingsAllowed = false } = {}) {
    amount = int(amount); if (resident.spendingBudget >= amount) { resident.spendingBudget -= amount; return true; }
    if (!savingsAllowed || resident.spendingBudget + resident.savings < amount) return false;
    const remainder = amount - resident.spendingBudget; resident.spendingBudget = 0; resident.savings -= remainder; return true;
  }
  transfer({ from, to, amount, type, metadata = {}, savingsAllowed = false }) {
    amount = int(amount); if (!amount || from === to) return { ok: false, reason: 'invalid_transfer' };
    // Legacy player balances (from the retired starter grant) are kept but frozen: nothing moves in or out.
    if (this.playerAccounts[from] || this.playerAccounts[to]) return { ok: false, reason: 'player_account_frozen' };
    const resident = this.resident(from), fromBusiness = this.business(from), toBusiness = this.business(to);
    if (resident) { if (!this.#residentDebit(resident, amount, { savingsAllowed })) return { ok: false, reason: 'insufficient_funds' }; }
    else if (fromBusiness) { if (fromBusiness.cash < amount) return { ok: false, reason: 'insufficient_funds' }; fromBusiness.cash -= amount; fromBusiness.expenses += amount; }
    else if (from === CITY_OWNER_ID) { if (this.treasury.balance < amount) return { ok: false, reason: 'insufficient_funds' }; this.treasury.balance -= amount; this.treasury.expenses += amount; }
    else return { ok: false, reason: 'unknown_source' };
    if (toBusiness) { toBusiness.cash += amount; toBusiness.revenue += amount; toBusiness.transactions++; }
    else if (this.resident(to)) { const target = this.resident(to); target.spendingBudget += Math.round(amount * 0.8); target.savings += amount - Math.round(amount * 0.8); }
    else if (to === CITY_OWNER_ID) { this.treasury.balance += amount; this.treasury.revenue += amount; }
    else throw new Error(`Unknown destination ${to}`);
    this.#record({ type, source: from, destination: to, amount, metadata }); return { ok: true, amount };
  }
  // A legacy (frozen) account for this player, or null. Joining never creates an account or moves money.
  playerAccount(playerId) { return this.playerAccounts[`player:${playerId}`] || null; }
  // Players enter Roots free (ECONOMY_RULES.playerAdmissionFee): the visit is counted, no money moves.
  admitPlayer(playerId) {
    const lounge = this.business(ROOTS_LOUNGE_ID); lounge.playerVisits = (lounge.playerVisits || 0) + 1; this.changed = true;
    return { ok: true, amount: ECONOMY_RULES.playerAdmissionFee, complimentary: true, visits: lounge.playerVisits, playerId };
  }
  // Session-keyed accounts from the retired starter grant: empty ones are retired, funded ones are kept frozen
  // (their money stays counted in totalMoney), and one ledger entry records what happened.
  #retireEmptyPlayerAccounts() {
    const accounts = Object.entries(this.playerAccounts || {}), empty = accounts.filter(([, a]) => !(a.balance > 0));
    for (const [id, a] of accounts) if (a.balance > 0) a.frozen = true;
    if (!empty.length) return;
    for (const [id] of empty) delete this.playerAccounts[id];
    const kept = Object.values(this.playerAccounts);
    this.#record({ type: 'player-accounts-retired', source: CITY_OWNER_ID, destination: CITY_OWNER_ID, amount: 0, metadata: { retiredEmpty: empty.length, keptFrozen: kept.length, frozenBalance: kept.reduce((n, a) => n + a.balance, 0) } });
  }
  openRoots(count = 10) {
    let admitted = 0;
    for (const r of this.residents) { if (admitted >= count) break; if (this.admissionDecision(r.id).allowed && this.admitResident(r.id, `opening-${Math.floor(admitted / 3)}`).ok) admitted++; }
    return admitted;
  }

  purchase(residentId, businessId, item = 'service', amount = null) {
    const resident = this.resident(residentId), business = this.business(businessId);
    if (!resident || !business) return { ok: false, reason: 'not_found' };
    const price = int(amount ?? business.unitPrice ?? 500), stock = business.inventory[item];
    if (Number.isFinite(stock) && stock < 1) return { ok: false, reason: 'out_of_stock' };
    const result = this.transfer({ from: resident.id, to: business.id, amount: price, type: 'purchase', metadata: { item } });
    if (result.ok && Number.isFinite(stock)) business.inventory[item]--;
    return result;
  }

  admissionDecision(residentId) {
    const r = this.resident(residentId), lounge = this.business(ROOTS_LOUNGE_ID); if (!r) return { allowed: false, reason: 'not_found' };
    const culturalAffinity = r.neighborhood === 'neighborhood-one' || r.entertainmentPreferences.some((p) => p === 'live-music' || p === 'dance' || p === 'social');
    if (r.spendingBudget < lounge.admissionFee) return { allowed: false, reason: 'insufficient_entertainment_budget', fee: lounge.admissionFee };
    return { allowed: culturalAffinity || r.satisfaction < 0.7, reason: culturalAffinity ? 'cultural_affinity' : 'recreation_need', fee: lounge.admissionFee };
  }

  admitResident(residentId, groupId = null) {
    const decision = this.admissionDecision(residentId); if (!decision.allowed) return { ok: false, reason: decision.reason };
    const result = this.transfer({ from: residentId, to: ROOTS_LOUNGE_ID, amount: decision.fee, type: 'admission', metadata: { groupId } });
    if (result.ok) {
      // Roots is operated directly by the city: admission is recorded as venue
      // revenue, then swept immediately to the treasury rather than retained by
      // an operator or exposed as a withdrawable balance.
      this.transfer({ from: ROOTS_LOUNGE_ID, to: CITY_OWNER_ID, amount: decision.fee, type: 'city-revenue', metadata: { businessId: ROOTS_LOUNGE_ID, source: 'admission' } });
      const r = this.resident(residentId), visitPattern = (r.rootsVisits + Number(r.id.match(/\d+/)?.[0] || 0)) % 4; r.location = ROOTS_LOUNGE_ID; r.socialGroupId = groupId; r.activity = r.entertainmentPreferences.includes('dance') ? 'dancing' : visitPattern === 0 ? 'bar' : visitPattern === 1 ? 'seated' : 'socializing'; r.rootsVisits++; r.satisfaction = clamp(r.satisfaction + 0.03, 0, 1);
    }
    return result;
  }

  departResident(residentId) { const r = this.resident(residentId); if (!r) return false; r.location = 'residence'; r.activity = 'home'; r.socialGroupId = null; this.changed = true; return true; }
  setAdmissionFee(actorId, amount) {
    if (actorId !== CITY_OWNER_ID) return { ok: false, reason: 'not_authorized' }; amount = int(amount);
    if (amount > 100_000) return { ok: false, reason: 'invalid_fee' }; this.business(ROOTS_LOUNGE_ID).admissionFee = amount; this.changed = true; return { ok: true, amount };
  }
  setOperator(actorId, businessId, operatorId) {
    const b = this.business(businessId); if (!b) return { ok: false, reason: 'not_found' };
    if (actorId !== CITY_OWNER_ID) return { ok: false, reason: 'not_authorized' };
    if (!b.leaseEligible) return { ok: false, reason: 'property_protected' };
    if (!this.resident(operatorId)) return { ok: false, reason: 'invalid_operator' };
    b.operatorIds = [operatorId]; this.changed = true; return { ok: true };
  }
  transferOwnership() { return { ok: false, reason: 'city_property_non_transferable' }; }

  submitSuggestion({ authorId, category, text, source = 'submitted', weight = 1 }) {
    const categories = ['products', 'businesses', 'entertainment', 'housing', 'employment', 'public-services', 'neighborhood-improvements'];
    if (!this.resident(authorId) && !String(authorId).startsWith('player:')) return { ok: false, reason: 'unknown_author' };
    if (!categories.includes(category)) return { ok: false, reason: 'invalid_category' };
    text = String(text || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 160); if (text.length < 3) return { ok: false, reason: 'empty_suggestion' };
    const authoredThisHour = this.suggestions.filter((s) => s.authorId === authorId && s.hour === this.hour);
    if (authoredThisHour.length >= ECONOMY_RULES.suggestionLimitPerHour) return { ok: false, reason: 'suggestion_rate_limited' };
    if (String(authorId).startsWith('player:') && this.suggestions.filter((s) => s.hour === this.hour && String(s.authorId).startsWith('player:')).length >= ECONOMY_RULES.playerSuggestionsPerHour) return { ok: false, reason: 'suggestion_rate_limited' };
    if (this.suggestions.some((s) => s.authorId === authorId && s.category === category && s.text.toLowerCase() === text.toLowerCase() && this.hour - s.hour < 24)) return { ok: false, reason: 'duplicate_suggestion' };
    const suggestion = { id: `suggestion-${this.nextSuggestion++}`, authorId, category, text, source, weight: clamp(Number(weight) || 1, 0.1, 5), hour: this.hour };
    this.suggestions.push(suggestion); this.#boundSuggestions(); this.changed = true; return { ok: true, suggestion };
  }
  // The demand board reflects the most recent suggestionLimit requests; the oldest drop off.
  #boundSuggestions() { if (this.suggestions.length > ECONOMY_RULES.suggestionLimit) this.suggestions.splice(0, this.suggestions.length - ECONOMY_RULES.suggestionLimit);
  }
  demandBoard() {
    const groups = new Map(); for (const s of this.suggestions) { const key = `${s.category}:${s.text.toLowerCase()}`, prior = groups.get(key) || { category: s.category, text: s.text, requests: 0, demand: 0 }; prior.requests++; prior.demand += s.weight; groups.set(key, prior); }
    return [...groups.values()].sort((a, b) => b.demand - a.demand || b.requests - a.requests || a.text.localeCompare(b.text));
  }

  decideAgent(agentId) {
    const a = this.agent(agentId), r = a && this.resident(a.residentId); if (!a || !r) return { ok: false, reason: 'not_found' };
    let action = 'save';
    if (a.personality === 'social' && this.admissionDecision(r.id).allowed) action = 'attend-roots';
    else if (r.spendingBudget < r.income * 2) action = 'work';
    else if (a.businessInterests.includes('entertainment')) action = 'study-demand';
    a.lastDecision = { hour: this.hour, action }; a.goals[0].progress = clamp(a.goals[0].progress + 0.02, 0, 1);
    if (action === 'attend-roots') this.admitResident(r.id, `agent-group-${this.hour}`);
    if (action === 'study-demand' && this.hour % 24 === 0) this.submitSuggestion({ authorId: r.id, category: 'entertainment', text: 'More live community music nights', source: 'agent-goal', weight: 1 + a.influence / 100 });
    a.memory.push({ hour: this.hour, type: 'decision', action }); if (a.memory.length > 20) a.memory.shift(); this.changed = true;
    return { ok: true, action };
  }

  #hourStep() {
    const hourOfDay = this.hour % 24;
    if (hourOfDay === 9) for (const r of this.residents) this.transfer({ from: r.employerId, to: r.id, amount: r.income, type: 'wage', metadata: { occupation: r.occupation } });
    if (hourOfDay === 18) for (let i = 0; i < this.residents.length; i++) {
      const r = this.residents[i]; this.purchase(r.id, i % 3 ? 'corner-grocery' : 'roots-kitchen', i % 3 ? 'groceries' : 'meals');
      if (i % 5 === this.hour % 5) this.admitResident(r.id, `social-${this.hour}-${i % 10}`);
    }
    if (hourOfDay === 23) for (const r of this.residents) this.departResident(r.id);
    if (hourOfDay === 0 && this.hour > 0) {
      for (const r of this.residents) this.transfer({ from: r.id, to: 'city-housing', amount: this.business('city-housing').unitPrice, type: 'rent', savingsAllowed: true, metadata: { residence: r.residence } });
      for (const b of this.businesses) if (b.id !== ROOTS_LOUNGE_ID && b.cash > 150_000) this.transfer({ from: b.id, to: CITY_OWNER_ID, amount: Math.floor((b.cash - 150_000) * 0.2), type: 'city-revenue' });
    }
    for (const a of this.agents) this.decideAgent(a.id);
  }

  advanceHours(hours = 1) { for (let i = 0; i < Math.max(0, Math.min(ECONOMY_RULES.maxCatchupHours, int(hours))); i++) { this.hour++; this.#hourStep(); } return this.snapshot(); }
  tick(now = this.now()) { const elapsed = Math.floor((now - this.lastTickAt) / ECONOMY_RULES.hourMs); if (elapsed > 0) { this.advanceHours(elapsed); this.lastTickAt += Math.min(elapsed, ECONOMY_RULES.maxCatchupHours) * ECONOMY_RULES.hourMs; } return elapsed; }
  snapshot(playerId = null) {
    const lounge = this.business(ROOTS_LOUNGE_ID), present = this.residents.filter((r) => r.location === ROOTS_LOUNGE_ID);
    const businesses = clone(this.businesses), otherRevenue = businesses.filter((b) => b.id !== ROOTS_LOUNGE_ID).reduce((n, b) => n + b.revenue, 0), expenses = this.treasury.expenses + businesses.reduce((n, b) => n + b.expenses, 0);
    return { schemaVersion: ECONOMY_SCHEMA_VERSION, hour: this.hour, simulated: true, currency: 'SIMULATED_NERDIE', treasury: clone(this.treasury), businesses, residentCount: this.residents.length, agentCount: this.agents.length,
      player: playerId ? clone(this.playerAccounts[`player:${playerId}`] || null) : null,
      legacyPlayerBalances: { accounts: Object.keys(this.playerAccounts).length, total: Object.values(this.playerAccounts).reduce((n, a) => n + a.balance, 0), frozen: true },
      roots: { admissionFee: lounge.admissionFee, playerAdmissionFee: ECONOMY_RULES.playerAdmissionFee, playerVisits: lounge.playerVisits || 0, admissionRevenue: lounge.revenue, attendance: present.length, activities: present.reduce((o, r) => (o[r.activity] = (o[r.activity] || 0) + 1, o), {}), residents: present.map((r) => ({ id: r.id, name: r.name, occupation: r.occupation, neighborhood: r.neighborhood, employerId: r.employerId, entertainmentPreferences: [...r.entertainmentPreferences], satisfaction: r.satisfaction, activity: r.activity, socialGroupId: r.socialGroupId || null, rootsVisits: r.rootsVisits })) },
      reports: { otherBusinessRevenue: otherRevenue, operatingExpenses: expenses, netIncome: this.treasury.revenue + businesses.reduce((n, b) => n + b.revenue, 0) - expenses },
      recentTransactions: clone(this.ledger.slice(-12).reverse()), demand: this.demandBoard().slice(0, 12), totalMoney: this.totalMoney() };
  }
  toJSON() { return clone({ schemaVersion: ECONOMY_SCHEMA_VERSION, seed: this.seed, treasury: this.treasury, businesses: this.businesses, residents: this.residents, agents: this.agents, suggestions: this.suggestions, playerAccounts: this.playerAccounts, ledger: this.ledger, nextTransaction: this.nextTransaction, nextSuggestion: this.nextSuggestion, hour: this.hour, lastTickAt: this.lastTickAt, genesisFunding: this.genesisFunding }); }
  restore(state) {
    if (!state || state.schemaVersion !== ECONOMY_SCHEMA_VERSION) return false;
    for (const key of ['treasury', 'businesses', 'residents', 'agents', 'suggestions', 'ledger']) if (!state[key]) return false;
    Object.assign(this, clone(state)); this.playerAccounts ||= {}; this.random = seededRandom(`decisions:${this.seed}`); this.changed = false;
    const before = this.ledger.length, accounts = Object.keys(this.playerAccounts).length, suggestions = this.suggestions.length;
    this.#retireEmptyPlayerAccounts(); this.#boundSuggestions(); // NC-ECO-01D migration of saved rooms (same schema)
    if (this.ledger.length !== before || Object.keys(this.playerAccounts).length !== accounts || this.suggestions.length !== suggestions) this.changed = true;
    return true;
  }
}
