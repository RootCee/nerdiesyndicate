// NC-LIFE-02B-2: the residents who are home, drawn inside the home the player is standing in (a house, or
// an apartment unit). Who is home comes from the room (home-occupants: the simulation's indoor residents,
// never also on the street); where they stand comes from home-presence.js (clear floor, the home's own
// layout, no new geometry). Same character models and talk card as store staff (store-staff.js).
import { HOME_PRESENCE_LIMITS, homeActivityPlacement, homePresenceSpots } from './home-presence.js';
import { homeActivity, profileFromTraits } from './home-routine.js';
import { PERMANENT_RESIDENT_SCHEDULES } from './permanent-residents.js';
import { economicMinuteOfDay } from './resident-schedule.js';
import { applySeatedPose, findSeatBones } from './seated-pose.js';
// NC-LIFE-02 Milestone 3: residents at home do something (home-routine.js): sleep on the bed, relax on the sofa, cook,
// eat or tidy at the right furniture. The room says what (activity); without it (older room) the client works it out from
// the same schedule. A lying or seated pose is set on the drawn model only; nothing else changes.
const FEET_TO_MIDDLE = 0.85;

const NOTICE_M = 5;

export class HomeResidents {
  constructor(scene, { library, mobile = false, minute = () => economicMinuteOfDay() } = {}) {
    Object.assign(this, { scene, library, minute });
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
      const activity = this.activityOf(r), d = this.drawn.get(r.index);
      if (d && d.activity === activity) { d.resident = r; continue; }
      if (d) { d.visual.root.rotation.set(0, 0, 0); d.visual.root.rotation.order = 'XYZ'; d.seated = null; } // a new activity: placed again below
      const others = [...this.drawn.values()].filter((o) => o !== d).map((o) => o.spot);
      let spot = homeActivityPlacement(view, activity, view.avoid, others);
      if (!spot) { const free = this.spots.find((s) => !others.some((o) => Math.hypot(o.x - s.x, o.z - s.z) < 0.5)); if (!free) continue; spot = { pose: 'stand', ...free }; }
      if (d) { d.spot = spot; d.activity = activity; d.resident = r; continue; }
      if (!this.library.npcPackReady(r.identity.appearance.pack)) { this.library.ensureNpcPack(r.identity.appearance.pack).catch(() => {}); continue; }
      const visual = this.library.buildNpcVisual(r.identity); if (!visual) continue;
      visual.root.traverse((o) => o.layers.set(view.layer)); this.scene.add(visual.root);
      this.drawn.set(r.index, { visual, spot, resident: r, activity, seated: null });
    }
    for (const d of this.drawn.values()) {
      const s = d.spot, near = player && Math.hypot(player.pos.x - s.x, player.pos.z - s.z) < NOTICE_M;
      if (s.pose === 'lie') { // on the bed, on their back: feet at the root, so the root sits half a body from the middle
        d.visual.play('Idle_Neutral'); d.visual.mixer.update(dt);
        d.visual.root.rotation.order = 'YXZ'; d.visual.root.rotation.set(-Math.PI / 2, s.yaw, 0);
        d.visual.root.position.set(s.x + Math.sin(s.yaw) * FEET_TO_MIDDLE, s.y, s.z + Math.cos(s.yaw) * FEET_TO_MIDDLE);
      } else if (s.pose === 'sit') {
        d.visual.play('Idle'); d.visual.mixer.update(dt);
        d.seated ||= findSeatBones(d.visual.root);
        if (d.seated) applySeatedPose(d.visual.root, d.seated, { x: s.x, z: s.z, yaw: s.yaw, seatTop: s.seatTop }); else d.visual.root.position.set(s.x, s.y, s.z);
      } else {
        d.visual.play(near ? 'Idle' : d.activity === 'cook' || d.activity === 'tidy' ? 'Interact' : d.resident.identity.traits?.sociability > 0.5 ? 'Idle' : 'Idle_Neutral');
        d.visual.root.position.set(s.x, s.y, s.z);
        d.visual.root.rotation.y = near ? Math.atan2(player.pos.x - s.x, player.pos.z - s.z) : s.yaw; // looks at a visitor
        d.visual.mixer.update(dt);
      }
    }
  }
  // The nearest drawn resident within reach, for the talk card: { index, identity } or null.
  nearby(player, reach) {
    let best = null, bestD = reach;
    for (const d of this.drawn.values()) { const dd = Math.hypot(player.pos.x - d.spot.x, player.pos.z - d.spot.z); if (dd < bestD) { best = d; bestD = dd; } }
    return best ? { index: best.resident.index, identity: best.resident.identity } : null;
  }
  // What a resident is doing at home: the room's word, else the same routine from their schedule.
  activityOf(r) {
    if (typeof r.activity === 'string') return r.activity;
    const schedule = PERMANENT_RESIDENT_SCHEDULES[r.index];
    return homeActivity({ residentId: r.residentId || schedule?.residentId || String(r.index), minute: this.minute(), work: schedule?.employment || null, profile: profileFromTraits(r.identity?.traits) }).kind;
  }
  get count() { return this.drawn.size; }
  get drawnResidents() { return [...this.drawn.values()].map((d) => ({ index: d.resident.index, residentId: d.resident.residentId, activity: d.activity, pose: d.spot.pose, x: d.spot.x, y: d.spot.y, z: d.spot.z })); }
  clear() { for (const d of this.drawn.values()) d.visual.dispose(); this.drawn.clear(); }
}
