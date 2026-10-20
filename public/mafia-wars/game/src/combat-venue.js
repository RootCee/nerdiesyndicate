import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { insideInteractionRange, interactionCooldownReady } from './city-layout.js';

const material = (color, roughness = 0.85, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });

function box(parent, mat, size, position, name = '') {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = name;
  parent.add(mesh); return mesh;
}

function signMaterial(text) {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#090908'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#d9ac58'; ctx.lineWidth = 14; ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
  ctx.fillStyle = '#f2d28b'; ctx.font = '700 104px Barlow, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 4);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
}

export class CombatVenueSystem {
  constructor(scene, site, { addCollider, mobile = false } = {}) {
    this.scene = scene; this.site = site; this.addCollider = addCollider; this.mobile = mobile;
    this.prompt = ''; this.transitionReadyAt = 0;
    this.exterior = new THREE.Group(); this.exterior.name = `combat-venue-${site.id}`;
    this.buildExterior(); scene.add(this.exterior);
    const frontX = site.x + site.width / 2;
    this.entry = new THREE.Vector3(frontX + 1.5, 0, site.z);
    this.outsideSpawn = new THREE.Vector3(frontX + 2.3, 0, site.z);
    this.outsideYaw = Math.PI / 2;
  }

  buildExterior() {
    const s = this.site, g = this.exterior;
    const concrete = material(0x47484a), metal = material(0x292d31, 0.58, 0.42), trim = material(0x9d7a39, 0.62, 0.22);
    const door = material(0x17191b, 0.48, 0.62), window = material(0x14202a, 0.22, 0.4);
    box(g, concrete, [s.width, s.height, s.depth], [s.x, s.height / 2, s.z], 'underground-warehouse-shell');
    box(g, metal, [s.width + 0.6, 0.45, s.depth + 0.6], [s.x, s.height + 0.22, s.z], 'underground-warehouse-roof');
    const frontX = s.x + s.width / 2 + 0.08;
    box(g, door, [0.24, 3.4, 3.6], [frontX, 1.7, s.z], 'underground-closed-door');
    box(g, trim, [0.18, 3.75, 0.18], [frontX + 0.14, 1.88, s.z - 1.98], 'underground-door-trim-a');
    box(g, trim, [0.18, 3.75, 0.18], [frontX + 0.14, 1.88, s.z + 1.98], 'underground-door-trim-b');
    box(g, trim, [0.18, 0.2, 4.15], [frontX + 0.14, 3.67, s.z], 'underground-door-trim-top');
    box(g, window, [0.16, 1.15, 3.2], [frontX + 0.11, 6.2, s.z - 6], 'underground-window-a');
    box(g, window, [0.16, 1.15, 3.2], [frontX + 0.11, 6.2, s.z + 6], 'underground-window-b');
    box(g, signMaterial('THE UNDERGROUND'), [0.12, 2.25, 12.5], [frontX + 0.2, 8.25, s.z], 'underground-sign');
    const lamp = new THREE.PointLight(0xd9ac58, this.mobile ? 0 : 65, 13, 2); lamp.position.set(frontX + 2.2, 4.3, s.z); g.add(lamp);
    this.addCollider(s.x - s.width / 2, s.z - s.depth / 2, s.x + s.width / 2, s.z + s.depth / 2, 0, s.height + 0.5, { cityChunk: s.id, venue: s.id });
  }

  update(player, wantsInteract, now = 0, lobbyOpen = false) {
    const near = insideInteractionRange(player.pos, this.entry, 3.2);
    const action = this.mobile ? 'TAP ENTER COMBAT' : '[E] ENTER COMBAT';
    this.prompt = near && !lobbyOpen ? `${this.site.name.toUpperCase()} · ${action}` : '';
    const requestedLobby = near && wantsInteract && !lobbyOpen && interactionCooldownReady(now, this.transitionReadyAt);
    if (requestedLobby) { this.transitionReadyAt = now + 0.65; this.prompt = ''; }
    return { near, prompt: this.prompt, requestedLobby };
  }
}
