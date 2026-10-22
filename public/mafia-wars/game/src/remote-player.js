import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { Character } from './characters.js';
import { MULTIPLAYER_LIMITS, interpolateSnapshots } from './multiplayer-protocol.js';

function makeLabel(name) {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d'); ctx.font = '700 26px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(0, 8, 256, 42); ctx.fillStyle = '#f5d58e'; ctx.fillText(name || 'PLAYER 2', 128, 39);
  const material = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material); sprite.scale.set(2.5, 0.625, 1); sprite.position.y = 2.25; return sprite;
}

export class RemotePlayer {
  constructor(scene, { id, name }, ghostMat) {
    this.scene = scene; this.id = id; this.name = name; this.snapshots = []; this.character = new Character(scene, 'blue_zip', ghostMat, { presenceOnly: true });
    this.label = makeLabel(name); this.character.obj.add(this.label); this.position = new THREE.Vector3(); this.lastStateAt = performance.now();
    this.lastSeq = -1; this.lastServerAt = 0; this.lastArrivalAt = 0; this.animationAccum = 0; this.renderState = {};
    this.metrics = { snapshots: 0, staleSnapshots: 0, jitterMs: 0, interpolationMs: MULTIPLAYER_LIMITS.interpolationMs, snapshotAgeMs: 0, extrapolations: 0, animationUpdates: 0 };
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
  update(dt, serverNow, viewerPosition) {
    const state = interpolateSnapshots(this.snapshots, serverNow - this.metrics.interpolationMs, this.renderState, MULTIPLAYER_LIMITS.maxExtrapolationMs);
    if (!state) return;
    this.metrics.snapshotAgeMs = Math.max(0, serverNow - this.lastServerAt); if (state.extrapolated) this.metrics.extrapolations++;
    this.position.set(state.x, state.y, state.z);
    const distance = viewerPosition ? viewerPosition.distanceTo(this.position) : 0;
    this.character.obj.visible = distance < 180;
    if (!this.character.obj.visible) return;
    this.character.obj.position.copy(this.position); this.character.obj.rotation.y = state.yaw + Math.PI;
    this.character.play(state.state === 'run' ? 'Run' : state.state === 'walk' ? 'Walk' : 'Idle_Gun', 0.12);
    this.animationAccum += dt;
    const animationHz = distance < 28 ? 30 : distance < 75 ? 15 : 8, interval = 1 / animationHz;
    if (this.animationAccum >= interval) {
      this.character.update(Math.min(0.15, this.animationAccum), this.position, state.yaw + Math.PI, false, false);
      this.animationAccum = 0; this.metrics.animationUpdates++;
    }
  }
  diagnostics() { return { ...this.metrics, queuedSnapshots: this.snapshots.length }; }
  dispose() { this.label.material.map.dispose(); this.label.material.dispose(); this.character.dispose(this.scene); }
}
