import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { insideInteractionRange, interactionCooldownReady } from './city-layout.js';
import { BANK_COPY } from './city-pois.js';
import { FRONT_NORMALS } from './city-layout.js';

// M6.6 Nerdie City Bank: signage and an entrance on an existing storefront
// (the shell, awning, and collider come from city-expansion.js). The entrance
// opens the existing wallet only; it never moves money or stores balances.
// No lights are added: the city keeps a fixed light count (see city-expansion).
const material = (color, roughness = 0.6, metalness = 0.2) => new THREE.MeshStandardMaterial({ color, roughness, metalness });

function signMaterial(title, subtitle) {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0d1a14'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#d9ac58'; ctx.lineWidth = 12; ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f2d28b';
  ctx.font = '700 92px Barlow, sans-serif'; ctx.fillText(title, canvas.width / 2, 104);
  ctx.font = '600 38px Barlow, sans-serif'; ctx.fillStyle = '#c9b78f'; ctx.fillText(subtitle, canvas.width / 2, 190);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
}

// A BoxGeometry's canvas texture reads correctly on its +x face; turn the sign so that face points
// out of the facade (east: as built, west: half a turn, north/south: a quarter turn).
export function signFacing(mesh, nx, nz) {
  mesh.rotation.set(0, 0, 0);
  if (nx < 0) mesh.rotation.y = Math.PI; else if (nz > 0) mesh.rotation.y = -Math.PI / 2; else if (nz < 0) mesh.rotation.y = Math.PI / 2;
  if (nz) mesh.geometry = new THREE.BoxGeometry(0.12, mesh.geometry.parameters.height, mesh.geometry.parameters.width);
  return mesh;
}

export class BankSystem {
  constructor(parent, site, { mobile = false, visuals = true } = {}) {
    this.site = site; this.mobile = mobile; this.prompt = ''; this.readyAt = 0;
    this.entry = new THREE.Vector3(site.entry.x, 0, site.entry.z);
    // M7.0B1: in the North Market showcase the bank is built by city-showcase.js; only the interaction stays here
    if (!visuals) { this.group = null; return; }
    // M7.0A: built on whichever facade faces the street (site.entry.facing: east/west/north/south).
    const [nx, nz] = FRONT_NORMALS[site.entry.facing] || FRONT_NORMALS.east, half = nx ? site.width / 2 : site.depth / 2, facadeLength = nx ? site.depth : site.width;
    this.group = new THREE.Group(); this.group.name = `city-bank-${site.id}`; parent.add(this.group);
    // a box `out` metres proud of the front facade, `along` metres along it; sizes given as (depth off the facade, height, length along it)
    const box = (mat, thick, sy, length, out, y, along, name) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(nx ? thick : length, sy, nx ? length : thick), mat);
      m.position.set(site.x + nx * (half + out) + (nx ? 0 : along), y, site.z + nz * (half + out) + (nx ? along : 0)); m.castShadow = true; m.name = name; this.group.add(m); return m;
    };
    const gold = material(0xb88a3b, 0.42, 0.55), glass = material(0x14202a, 0.18, 0.45), stone = material(0xcfc6b4, 0.85, 0);
    // Fascia sign above the entrance, its lettering facing the street.
    const sign = box(signMaterial('NERDIE CITY BANK', 'WALLET ACCESS'), 0.12, 1.5, Math.min(facadeLength * 0.86, 9), 0.24, 3.75, 0, 'city-bank-sign');
    signFacing(sign, nx, nz);
    // Gold-framed glass door with stone columns, proud of the shopfront glass.
    box(glass, 0.12, 2.35, 1.7, 0.14, 1.18, 0, 'city-bank-door');
    box(gold, 0.16, 0.14, 2.0, 0.18, 2.42, 0, 'city-bank-door-head');
    for (const d of [-1, 1]) {
      box(gold, 0.16, 2.4, 0.12, 0.18, 1.2, d * 0.92, 'city-bank-door-jamb');
      box(stone, 0.5, 2.7, 0.5, 0.3, 1.35, d * 1.55, 'city-bank-column');
    }
    this.entry = new THREE.Vector3(site.entry.x, 0, site.entry.z);
  }

  update(player, wantsInteract, now = 0) {
    const near = insideInteractionRange(player.pos, this.entry, 2.6);
    this.prompt = near ? `${BANK_COPY.prompt} · ${this.mobile ? `TAP ${BANK_COPY.action}` : `[E] ${BANK_COPY.action}`}` : '';
    const opened = near && wantsInteract && interactionCooldownReady(now, this.readyAt);
    if (opened) this.readyAt = now + 1.2;
    return { near, prompt: this.prompt, opened, mobileLabel: near ? BANK_COPY.action : '' };
  }
}
