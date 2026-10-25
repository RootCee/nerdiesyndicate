import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { Character, ensureCharacterModel } from './characters.js';
import { normalizeAvatarAppearance } from './avatar-schema.js';
import { MULTIPLAYER_LIMITS, interpolateSnapshots } from './multiplayer-protocol.js';
import { normalizeEquipment } from './multiplayer-equipment.js';

function makeLabel(name) {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d'); ctx.font = '700 26px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(0, 8, 256, 42); ctx.fillStyle = '#f5d58e'; ctx.fillText(name || 'PLAYER 2', 128, 39);
  const material = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material); sprite.scale.set(2.5, 0.625, 1); sprite.position.y = 2.25; return sprite;
}

export class RemotePlayer {
  constructor(scene, { id, name, appearance, appearanceRevision = 0, equipment, equipmentRevision = 0, context, contextRevision = 0, combat }, ghostMat, { ensureWeaponVisual = async () => false } = {}) {
    this.scene = scene; this.id = id; this.name = name; this.ghostMat = ghostMat; this.snapshots = []; this.character = null;
    this.label = makeLabel(name); this.label.visible = false; this.scene.add(this.label); this.position = new THREE.Vector3(); this.lastStateAt = performance.now();
    this.lastSeq = -1; this.lastServerAt = 0; this.lastArrivalAt = 0; this.animationAccum = 0; this.renderState = {};
    this.appearance = normalizeAvatarAppearance(appearance); this.appearanceRevision = -1; this.appearanceRequest = 0;
    this.equipment = normalizeEquipment(equipment); this.equipmentRevision = -1; this.equipmentRequest = 0; this.ensureWeaponVisual = ensureWeaponVisual;
    this.context = context || { space: { id: 'city', instanceId: null } }; this.contextRevision = contextRevision;
    this.combat = combat || { health: 100, maxHealth: 100, dead: false, team: null, kills: 0, deaths: 0 };
    this.metrics = { snapshots: 0, staleSnapshots: 0, jitterMs: 0, interpolationMs: MULTIPLAYER_LIMITS.interpolationMs, snapshotAgeMs: 0, extrapolations: 0, animationUpdates: 0 };
    this.setAppearance(this.appearance, appearanceRevision); this.setEquipment(this.equipment, equipmentRevision);
  }
  async setAppearance(appearance, revision = this.appearanceRevision + 1) {
    if (revision < this.appearanceRevision) return false;
    const canonical = normalizeAvatarAppearance(appearance);
    if (this.character?.name === canonical.preset) { this.appearance = canonical; this.appearanceRevision = revision; return true; }
    const request = ++this.appearanceRequest;
    try { await ensureCharacterModel(canonical.preset); } catch { return false; }
    if (request !== this.appearanceRequest || revision < this.appearanceRevision) return false;
    const replacement = new Character(this.scene, canonical.preset, this.ghostMat, { presenceOnly: true });
    replacement.obj.position.copy(this.position); replacement.obj.visible = this.character?.obj.visible ?? false;
    this.label.position.set(0, 2.25, 0); this.label.visible = true; replacement.obj.add(this.label); this.character?.dispose(this.scene); this.character = replacement;
    this.appearance = canonical; this.appearanceRevision = revision; this.setContext(this.context, this.contextRevision); await this.#applyEquipment(replacement); return true;
  }
  async #applyEquipment(character = this.character) {
    if (!character) return false;
    const request = ++this.equipmentRequest, equipment = this.equipment;
    if (!equipment.weaponId) { character.setWeapon(null, true); return true; }
    if (!await this.ensureWeaponVisual(equipment.weaponId)) return false;
    if (request !== this.equipmentRequest || character !== this.character) return false;
    return character.setWeapon(equipment.weaponId, equipment.holstered);
  }
  async setEquipment(equipment, revision = this.equipmentRevision + 1, context = this.context, contextRevision = this.contextRevision) {
    if (revision < this.equipmentRevision) return false;
    this.equipment = normalizeEquipment(equipment); this.equipmentRevision = revision;
    this.setContext(context, contextRevision);
    return this.#applyEquipment();
  }
  setContext(context, revision = this.contextRevision + 1) {
    if (!context || revision < this.contextRevision) return false;
    this.context = context; this.contextRevision = revision;
    const layer = context.space?.id === 'city' || context.space?.id === 'underground' ? 0 : 1;
    this.character?.obj.traverse((object) => object.layers?.set(layer));
    this.label.layers.set(layer); return true;
  }
  setCombat(combat) {
    if (!combat) return false;
    this.combat = { ...this.combat, ...combat };
    if (this.character) this.character.obj.visible = !this.combat.dead;
    return true;
  }
  // A shot: raise and recoil now (not at the next throttled animation tick), so the muzzle flash and tracer start at the raised muzzle.
  triggerFire(direction = null) {
    if (!this.character) return;
    this.character.triggerFire(direction);
    const state = this.renderState;
    if (Number.isFinite(state?.yaw)) this.character.update(0, this.position, state.yaw + Math.PI, (state.aim || 0) > 0.5, false, null, { moving: state.state !== 'idle' });
  }
  push(state) {
    if (!Number.isFinite(state?.serverTime) || !Number.isSafeInteger(state.seq) || state.seq <= this.lastSeq) { this.metrics.staleSnapshots++; return; }
    const arrivedAt = performance.now();
    if (this.lastServerAt && this.lastArrivalAt) {
      const expected = state.serverTime - this.lastServerAt, actual = arrivedAt - this.lastArrivalAt, sample = Math.abs(actual - expected);
      this.metrics.jitterMs = this.metrics.jitterMs ? this.metrics.jitterMs * 0.85 + sample * 0.15 : sample;
      this.metrics.interpolationMs = THREE.MathUtils.clamp(MULTIPLAYER_LIMITS.interpolationMs + this.metrics.jitterMs * 1.5, MULTIPLAYER_LIMITS.interpolationMinMs, MULTIPLAYER_LIMITS.interpolationMaxMs);
    }
    this.lastSeq = state.seq; this.lastServerAt = state.serverTime; this.lastArrivalAt = arrivedAt;
    this.snapshots.push({ ...state, at: state.serverTime }); if (this.snapshots.length > 12) this.snapshots.splice(0, this.snapshots.length - 12);
    this.lastStateAt = arrivedAt; this.metrics.snapshots++;
  }
  teleport(state) {
    if (!state || !Number.isFinite(state.serverTime)) return;
    this.snapshots = [{ ...state, at: state.serverTime }];
    this.position.set(state.x, state.y, state.z);
    if (this.character) this.character.obj.position.copy(this.position);
  }
  update(dt, serverNow, viewerPosition, viewerSpace = 'city') {
    const state = interpolateSnapshots(this.snapshots, serverNow - this.metrics.interpolationMs, this.renderState, MULTIPLAYER_LIMITS.maxExtrapolationMs);
    if (!state) return;
    this.metrics.snapshotAgeMs = Math.max(0, serverNow - this.lastServerAt); if (state.extrapolated) this.metrics.extrapolations++;
    this.position.set(state.x, state.y, state.z);
    const distance = viewerPosition ? viewerPosition.distanceTo(this.position) : 0;
    if (!this.character) { this.label.position.copy(this.position); this.label.position.y += 2.25; return; }
    this.character.obj.visible = !this.combat.dead && distance < 180 && (this.context?.space?.id || 'city') === viewerSpace;
    if (!this.character.obj.visible) return;
    this.character.obj.position.copy(this.position); this.character.obj.rotation.y = state.yaw + Math.PI;
    this.character.play(state.state === 'run' ? 'Run' : state.state === 'walk' ? 'Walk' : 'Idle_Gun', 0.12);
    this.character.aimPitch = state.pitch || 0; // M6.9: their aim, interpolated like the rest of the state
    this.animationAccum += dt;
    const animationHz = distance < 28 ? 30 : distance < 75 ? 15 : 8, interval = 1 / animationHz;
    if (this.animationAccum >= interval) {
      this.character.update(Math.min(0.15, this.animationAccum), this.position, state.yaw + Math.PI, (state.aim || 0) > 0.5, false, null, { moving: state.state !== 'idle' });
      this.animationAccum = 0; this.metrics.animationUpdates++;
    }
  }
  diagnostics() { return { ...this.metrics, queuedSnapshots: this.snapshots.length, equipment: this.equipment, equipmentRevision: this.equipmentRevision, context: this.context, combat: this.combat }; }
  dispose() { this.appearanceRequest++; this.equipmentRequest++; this.scene.remove(this.label); this.label.material.map.dispose(); this.label.material.dispose(); this.character?.dispose(this.scene); }
}
