import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { resupplyPracticeAmmo } from './loadout.js';
import { SOLO_PRACTICE_POLICY, createResupplyState, inspectResupply, commitResupply } from './resupply-rules.js';

export class PracticeResupply {
  constructor(scene, guns, launcher) {
    this.guns = guns; this.launcher = launcher; this.policy = SOLO_PRACTICE_POLICY;
    this.matchId = ''; this.teamId = 'blue'; this.playerId = 'local-player'; this.stationId = 'underground-ammo-1'; this.state = null;
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

  beginMatch({ matchId, teamId = 'blue', playerId = 'local-player', now = 0, policy = SOLO_PRACTICE_POLICY }) {
    if (this.matchId === matchId && this.state) return false;
    this.matchId = matchId; this.teamId = teamId; this.playerId = playerId; this.policy = policy;
    this.state = createResupplyState({ matchId, teamId, stationId: this.stationId, now });
    return true;
  }

  setEnabled(enabled) { this.group.visible = !!enabled; }

  status(now) {
    if (!this.state) this.beginMatch({ matchId: 'local-practice-0', now });
    const status = inspectResupply(this.state, this.policy, this.playerId, now);
    this.state = status.state;
    return status;
  }

  promptFor(status) {
    const seconds = Math.ceil(status.remainingSeconds);
    if (status.reason === 'player-used') return `SOLO RESUPPLY USED · ${seconds}s`;
    if (status.reason === 'station-depleted') return `AMMO STATION DEPLETED · ${seconds}s`;
    return '[E] RESUPPLY AMMO · SOLO USE';
  }

  update(player, interact, time) {
    if (!this.group.visible || player.dead || player.pos.distanceToSquared(this.position) > 7.84) return { prompt: '', supplied: false };
    const before = this.status(time);
    if (!interact) return { ...before, prompt: this.promptFor(before), supplied: false, ready: before.allowed };
    if (!before.allowed) return { ...before, prompt: this.promptFor(before), supplied: false, ready: false };
    const amounts = resupplyPracticeAmmo(this.guns, this.launcher);
    const added = Object.values(amounts).reduce((sum, amount) => sum + amount, 0);
    const committed = commitResupply(this.state, this.policy, { playerId: this.playerId, now: time, added });
    this.state = committed.state;
    return {
      ...committed,
      prompt: committed.consumed ? `AMMO RESUPPLIED · ${Math.ceil(committed.remainingSeconds)}s` : committed.reason === 'ammo-full' ? 'AMMO ALREADY AT CAPACITY' : this.promptFor(committed),
      supplied: committed.consumed,
      ready: committed.allowed,
      amounts,
    };
  }
}
