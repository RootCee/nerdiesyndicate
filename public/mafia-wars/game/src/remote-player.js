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
    this.scene = scene; this.id = id; this.name = name; this.snapshots = []; this.character = new Character(scene, 'blue_zip', ghostMat);
    this.label = makeLabel(name); this.character.obj.add(this.label); this.position = new THREE.Vector3(); this.lastStateAt = performance.now();
  }
  push(state) { if (!Number.isFinite(state?.serverTime)) return; this.snapshots.push({ ...state, at: state.serverTime }); if (this.snapshots.length > 12) this.snapshots.splice(0, this.snapshots.length - 12); this.lastStateAt = performance.now(); }
  update(dt, serverNow) {
    const state = interpolateSnapshots(this.snapshots, serverNow - MULTIPLAYER_LIMITS.interpolationMs);
    if (!state) return;
    this.position.set(state.x, state.y, state.z); this.character.play(state.state === 'run' ? 'Run' : state.state === 'walk' ? 'Walk' : 'Idle_Gun', 0.12);
    this.character.update(dt, this.position, state.yaw + Math.PI, false, false); this.character.obj.visible = true; this.character.gun.visible = true;
  }
  dispose() { this.label.material.map.dispose(); this.label.material.dispose(); this.character.dispose(this.scene); }
}
