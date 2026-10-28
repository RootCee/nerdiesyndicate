// The resident on shift behind a store's counter (store-hours.js), drawn inside the store's interior on the
// interior render layer. The room keeps them off the street while they work (npc-sim indoors), so there is
// one of them. Waves when a customer comes in, and can be talked to like anyone in the city.
import { PERMANENT_RESIDENT_IDENTITIES } from './permanent-residents.js';
import { economicMinuteOfDay } from './resident-schedule.js';
import { storeForSpace, storeStaffAt } from './store-hours.js';

const WAVE_MS = 2600, NOTICE_M = 6;

// Where the clerk stands in a generic shop (interior-catalog.js layout, world coordinates): behind its
// counter or bar, on the side away from the room (toward the nearer wall), facing the customers.
export function counterStand(L) {
  const c = L.furniture.find((f) => f.type === 'counter') || L.furniture.find((f) => f.type === 'bar'); if (!c) return null;
  const cx = (L.minX + L.maxX) / 2, cz = (L.minZ + L.maxZ) / 2, keep = (v, lo, hi) => Math.min(hi - 0.32, Math.max(lo + 0.32, v)); // clear of the walls
  if (c.d > c.w) { const s = c.x > cx ? 1 : -1; return { x: keep(c.x + s * (c.w / 2 + 0.55), L.minX, L.maxX), y: L.y, z: c.z, yaw: s > 0 ? -Math.PI / 2 : Math.PI / 2 }; }
  const s = c.z > cz ? 1 : -1; return { x: c.x, y: L.y, z: keep(c.z + s * (c.d / 2 + 0.55), L.minZ, L.maxZ), yaw: s > 0 ? Math.PI : 0 };
}

export class StoreStaff {
  constructor(scene, { library, now = () => Date.now() } = {}) {
    Object.assign(this, { scene, library, now }); this.visual = null; this.index = -1; this.spaceId = null; this.stand = null; this.waveUntil = 0;
  }
  // Each frame: the space the player is in, and where its clerk stands (null outside a store).
  update(dt, spaceId, stand, player) {
    const store = storeForSpace(spaceId), index = store && stand ? storeStaffAt(store.id, economicMinuteOfDay(this.now())) : -1;
    if (index !== this.index || spaceId !== this.spaceId) { this.#clear(); this.index = index; this.spaceId = spaceId; this.stand = stand; this.waveUntil = performance.now() + WAVE_MS; }
    if (index < 0) return;
    const identity = PERMANENT_RESIDENT_IDENTITIES[index];
    if (!this.visual) {
      if (!this.library.npcPackReady(identity.appearance.pack)) { this.library.ensureNpcPack(identity.appearance.pack).catch(() => {}); return; }
      this.visual = this.library.buildNpcVisual(identity); if (!this.visual) return;
      this.visual.root.position.set(stand.x, stand.y, stand.z); this.visual.root.rotation.y = stand.yaw;
      this.visual.root.traverse((o) => o.layers.set(1)); this.scene.add(this.visual.root);
    }
    const near = player && Math.hypot(player.pos.x - stand.x, player.pos.z - stand.z) < NOTICE_M;
    this.visual.play(performance.now() < this.waveUntil && near ? 'Wave' : identity.traits.sociability > 0.5 ? 'Idle' : 'Idle_Neutral');
    if (near) this.visual.root.rotation.y = Math.atan2(player.pos.x - stand.x, player.pos.z - stand.z); // looks at the customer
    this.visual.mixer.update(dt);
  }
  // The clerk's resident index when the player is close enough to talk, else -1.
  nearby(player, reach) { return this.visual && Math.hypot(player.pos.x - this.stand.x, player.pos.z - this.stand.z) < reach ? this.index : -1; }
  #clear() { this.visual?.dispose(); this.visual = null; }
}
