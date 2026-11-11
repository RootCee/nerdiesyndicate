// RC1 hotfix: the bank's tellers behind their windows. Residents #1-3 work at the Nerdie City Bank from 8 AM to
// noon Pacific (permanent-residents.js; the bank ledger records the same jobs). The room keeps them inside while
// they work (npc-sim indoorWorkplace, like store clerks), so they are never also on the street, and tells a
// player in the bank who is on shift (`bank-staff`, room-core.js). A room that does not send it (an older
// Worker) leaves the windows empty, as before, so nobody is ever drawn twice.
// Bank visits (approved 11 November 2026): the same message lists residents visiting as customers (`visitors`);
// they stand at customer spots (a step back from the teller windows, by the market terminals, by the benches)
// and can be talked to like anyone in the city. Visits involve no money.
import { PERMANENT_RESIDENT_IDENTITIES } from './permanent-residents.js';

const WAVE_MS = 2600, NOTICE_M = 6;
export const BANK_STAFF_LIMIT = 4; // one per teller window
export const BANK_VISITOR_LIMITS = Object.freeze({ mobile: 4, desktop: 8 });
const r2 = (v) => Math.round(v * 100) / 100;

// Where a teller stands: behind the counter (the staff side, east of the line) at their window, facing the
// customers' side. Pure, from bank-layout.js bankInterior(); windows are filled in order.
export function tellerStands(layout) {
  const c = layout.counter, x = r2(c.x + c.depth / 2 + 0.55);
  return layout.tellers.map((z) => Object.freeze({ x, y: layout.y, z, yaw: -Math.PI / 2 }));
}
// Where customers stand, in the order they are filled: at teller windows 1-3 (a step back from the station, so
// the player can still use it), then the four market terminals, then by the two benches. Each faces what they
// came for. Pure.
export function visitorSpots(layout) {
  const y = layout.y, st = (id) => layout.stations.find((s) => s.id === id), spots = [];
  for (const id of ['teller-1', 'teller-2', 'teller-3']) { const s = st(id); spots.push({ x: r2(s.stand.x - 0.6), z: s.stand.z, yaw: Math.PI / 2 }); }
  for (const id of ['market-1', 'market-2', 'market-3', 'market-4']) { const s = st(id); spots.push({ x: r2(s.stand.x + 0.6), z: s.stand.z, yaw: -Math.PI / 2 }); }
  for (const b of layout.benches) spots.push({ x: r2(b.x + (b.x < layout.medallion.x ? -0.75 : 0.75)), z: r2(b.z + 0.4), yaw: b.x < layout.medallion.x ? Math.PI / 2 : -Math.PI / 2 });
  return spots.map((s) => Object.freeze({ ...s, y }));
}
// The residents to draw: valid permanent residents, unique, in window order (lowest resident number first).
export function tellersToDraw(residents, limit = BANK_STAFF_LIMIT, exclude = new Set()) {
  const seen = new Set(), out = [];
  for (const r of Array.isArray(residents) ? residents : []) {
    if (!Number.isSafeInteger(r?.index) || !PERMANENT_RESIDENT_IDENTITIES[r.index] || seen.has(r.index) || exclude.has(r.index)) continue;
    seen.add(r.index); out.push(r.index);
  }
  return out.sort((a, b) => a - b).slice(0, limit);
}

export class BankStaff {
  constructor(scene, { library, layout, mobile = false }) {
    Object.assign(this, { scene, library }); this.stands = tellerStands(layout); this.spots = visitorSpots(layout);
    this.visitorLimit = Math.min(this.spots.length, mobile ? BANK_VISITOR_LIMITS.mobile : BANK_VISITOR_LIMITS.desktop);
    this.wanted = []; this.wantedVisitors = []; this.entries = new Map(); this.waveUntil = 0;
  }
  // From the room: who is on shift inside, and who is visiting (empty clears them).
  setResidents(residents, visitors = []) {
    this.wanted = tellersToDraw(residents);
    this.wantedVisitors = tellersToDraw(visitors, this.visitorLimit, new Set(this.wanted));
  }
  clear() { this.wanted = []; this.wantedVisitors = []; this.#dropAll(); }
  get count() { return this.entries.size; }
  get drawn() { return [...this.entries].filter(([, e]) => e.role === 'teller').map(([i]) => i); }
  get drawnVisitors() { return [...this.entries].filter(([, e]) => e.role === 'visitor').map(([i]) => i); }
  // A visitor within reach to talk to: { index, identity } or null (tellers are served by the teller station).
  nearbyVisitor(player, reach) {
    let best = null, bestD = reach;
    for (const [index, e] of this.entries) { if (e.role !== 'visitor') continue; const d = Math.hypot(player.pos.x - e.stand.x, player.pos.z - e.stand.z); if (d < bestD) { best = { index, identity: e.identity }; bestD = d; } }
    return best;
  }
  // Each frame: inside the bank or not.
  update(dt, inside, player) {
    if (!inside) { if (this.entries.size) this.#dropAll(); return; }
    const want = new Map([...this.wanted.map((index, k) => [index, { stand: this.stands[k], role: 'teller' }]), ...this.wantedVisitors.map((index, k) => [index, { stand: this.spots[k], role: 'visitor' }])]);
    for (const [index, e] of this.entries) if (!want.has(index) || want.get(index).stand !== e.stand) { e.visual.dispose(); this.entries.delete(index); }
    for (const [index, { stand, role }] of want) {
      if (this.entries.has(index)) continue;
      const identity = PERMANENT_RESIDENT_IDENTITIES[index];
      if (!this.library.npcPackReady(identity.appearance.pack)) { this.library.ensureNpcPack(identity.appearance.pack).catch(() => {}); continue; }
      const visual = this.library.buildNpcVisual(identity); if (!visual) continue;
      visual.root.position.set(stand.x, stand.y, stand.z); visual.root.rotation.y = stand.yaw;
      visual.root.traverse((o) => o.layers.set(1)); this.scene.add(visual.root);
      this.entries.set(index, { visual, stand, identity, role }); if (role === 'teller') this.waveUntil = performance.now() + WAVE_MS;
    }
    for (const e of this.entries.values()) {
      const near = player && Math.hypot(player.pos.x - e.stand.x, player.pos.z - e.stand.z) < (e.role === 'teller' ? NOTICE_M : 2.5);
      e.visual.play(e.role === 'teller' && performance.now() < this.waveUntil && near ? 'Wave' : e.identity.traits.sociability > 0.5 ? 'Idle' : 'Idle_Neutral');
      e.visual.root.rotation.y = near ? Math.atan2(player.pos.x - e.stand.x, player.pos.z - e.stand.z) : e.stand.yaw; // looks at whoever comes up to them
      e.visual.mixer.update(dt);
    }
  }
  #dropAll() { for (const e of this.entries.values()) e.visual.dispose(); this.entries.clear(); }
}
