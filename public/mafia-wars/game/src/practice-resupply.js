import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { PRACTICE_RESUPPLY_COOLDOWN, resupplyPracticeAmmo } from './loadout.js';

export class PracticeResupply {
  constructor(scene, guns, launcher) {
    this.guns = guns; this.launcher = launcher; this.cooldownUntil = 0;
    this.position = new THREE.Vector3(-5.5, 0, 34.5);
    this.group = new THREE.Group(); this.group.name = 'practice-ammo-resupply';
    const caseMat = new THREE.MeshStandardMaterial({ color: 0x3d4b35, roughness: 0.82, metalness: 0.16 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xd9ac58, roughness: 0.55, metalness: 0.35 });
    const caseMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.64, 0.9), caseMat); caseMesh.position.y = 0.34; this.group.add(caseMesh);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.12, 0.96), trimMat); lid.position.y = 0.69; this.group.add(lid);
    const marker = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.82, 24), new THREE.MeshBasicMaterial({ color: 0xffd478, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
    marker.rotation.x = -Math.PI / 2; marker.position.y = 0.025; this.group.add(marker);
    this.group.position.copy(this.position); this.group.visible = false; scene.add(this.group);
  }

  setEnabled(enabled) { this.group.visible = !!enabled; if (!enabled) this.cooldownUntil = 0; }

  update(player, interact, time) {
    if (!this.group.visible || player.dead || player.pos.distanceToSquared(this.position) > 7.84) return { prompt: '', supplied: false };
    const remaining = Math.max(0, this.cooldownUntil - time);
    if (!interact) return { prompt: remaining > 0 ? `AMMO RESUPPLY · ${Math.ceil(remaining)}s` : '[E] RESUPPLY AMMO', supplied: false, ready: remaining <= 0 };
    if (remaining > 0) return { prompt: `AMMO RESUPPLY · ${Math.ceil(remaining)}s`, supplied: false, ready: false };
    const amounts = resupplyPracticeAmmo(this.guns, this.launcher);
    const supplied = Object.values(amounts).some((amount) => amount > 0);
    if (supplied) this.cooldownUntil = time + PRACTICE_RESUPPLY_COOLDOWN;
    return { prompt: supplied ? `AMMO RESUPPLIED · ${PRACTICE_RESUPPLY_COOLDOWN}s` : 'AMMO FULL', supplied, ready: !supplied, amounts };
  }
}
