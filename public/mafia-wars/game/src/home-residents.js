// NC-LIFE-02B-2: the residents who are home, drawn inside the home the player is standing in (a house, or
// an apartment unit). Who is home comes from the room (home-occupants: the simulation's indoor residents,
// never also on the street); where they stand comes from home-presence.js (clear floor, the home's own
// layout, no new geometry). Same character models and talk card as store staff (store-staff.js).
import { HOME_PRESENCE_LIMITS, homePresenceSpots } from './home-presence.js';

const NOTICE_M = 5;

export class HomeResidents {
  constructor(scene, { library, mobile = false } = {}) {
    Object.assign(this, { scene, library });
    this.limit = mobile ? HOME_PRESENCE_LIMITS.mobile : HOME_PRESENCE_LIMITS.desktop; // iPhone 2, desktop 4
    this.occupants = { spaceId: null, residents: [] }; this.drawn = new Map(); this.viewKey = ''; this.spots = [];
  }
  // The room's home-occupants message: { spaceId, residents: [{ index, id, residentId, propertyId, identity }] }.
  setOccupants(message) {
    this.occupants = { spaceId: typeof message?.spaceId === 'string' ? message.spaceId : null, residents: Array.isArray(message?.residents) ? message.residents : [] };
  }
  // Each frame: view is city.interiors.homeView (null outside a home).
  update(dt, view, player) {
    const key = view?.spaceId || '';
    if (key !== this.viewKey) { this.clear(); this.viewKey = key; this.spots = view ? homePresenceSpots(view, this.limit, view.avoid) : []; }
    const want = view && this.occupants.spaceId === view.spaceId ? this.occupants.residents.filter((r) => r?.identity?.appearance).slice(0, this.limit) : [];
    for (const [index, d] of this.drawn) if (!want.some((r) => r.index === index)) { d.visual.dispose(); this.drawn.delete(index); } // gone out
    for (const r of want) {
      if (this.drawn.has(r.index)) continue;
      const taken = new Set([...this.drawn.values()].map((d) => d.spot)), spot = this.spots.find((s) => !taken.has(s)); if (!spot) continue;
      if (!this.library.npcPackReady(r.identity.appearance.pack)) { this.library.ensureNpcPack(r.identity.appearance.pack).catch(() => {}); continue; }
      const visual = this.library.buildNpcVisual(r.identity); if (!visual) continue;
      visual.root.position.set(spot.x, spot.y, spot.z); visual.root.rotation.y = spot.yaw;
      visual.root.traverse((o) => o.layers.set(view.layer)); this.scene.add(visual.root);
      this.drawn.set(r.index, { visual, spot, resident: r });
    }
    for (const d of this.drawn.values()) {
      const near = player && Math.hypot(player.pos.x - d.spot.x, player.pos.z - d.spot.z) < NOTICE_M;
      d.visual.play(near ? 'Idle' : d.resident.identity.traits?.sociability > 0.5 ? 'Idle' : 'Idle_Neutral');
      d.visual.root.rotation.y = near ? Math.atan2(player.pos.x - d.spot.x, player.pos.z - d.spot.z) : d.spot.yaw; // looks at a visitor
      d.visual.mixer.update(dt);
    }
  }
  // The nearest drawn resident within reach, for the talk card: { index, identity } or null.
  nearby(player, reach) {
    let best = null, bestD = reach;
    for (const d of this.drawn.values()) { const dd = Math.hypot(player.pos.x - d.spot.x, player.pos.z - d.spot.z); if (dd < bestD) { best = d; bestD = dd; } }
    return best ? { index: best.resident.index, identity: best.resident.identity } : null;
  }
  get count() { return this.drawn.size; }
  get drawnResidents() { return [...this.drawn.values()].map((d) => ({ index: d.resident.index, residentId: d.resident.residentId, x: d.spot.x, y: d.spot.y, z: d.spot.z })); }
  clear() { for (const d of this.drawn.values()) d.visual.dispose(); this.drawn.clear(); }
}
