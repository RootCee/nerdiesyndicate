import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { ceilingObstructsView, insideInteractionRange, interactionCooldownReady, shouldTransitionApartment } from './city-layout.js';

const TRANSITION_COOLDOWN = 0.65;

const makeMaterial = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: options.roughness ?? 0.82, metalness: options.metalness ?? 0 });

function box(parent, material, size, position, name = '') {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = name;
  parent.add(mesh); return mesh;
}

function wallCollider(addCollider, x, y, z, sx, sy, sz, extra = {}) {
  return addCollider(x - sx / 2, z - sz / 2, x + sx / 2, z + sz / 2, y - sy / 2, y + sy / 2, extra);
}

export class HybridApartmentSystem {
  constructor(scene, site, { addCollider, mobile = false } = {}) {
    this.scene = scene;
    this.site = site;
    this.addCollider = addCollider;
    this.mobile = mobile;
    this.active = false;
    this.prompt = '';
    this.transitionReadyAt = 0;
    this.exterior = new THREE.Group(); this.exterior.name = `apartment-exterior-${site.id}`;
    this.interior = new THREE.Group(); this.interior.name = `apartment-interior-${site.id}`; this.interior.visible = false;
    scene.add(this.interior);
    this.buildExterior();
    this.buildInterior();
    const frontX = site.x - site.width / 2;
    const interiorFrontX = site.x - 13 / 2;
    this.entry = new THREE.Vector3(frontX - 1.4, 0, site.z);
    this.insideSpawn = new THREE.Vector3(interiorFrontX + 1.2, site.interiorY, site.z);
    this.exit = new THREE.Vector3(interiorFrontX + 0.8, site.interiorY, site.z);
    this.outsideSpawn = new THREE.Vector3(frontX - 1.2, 0, site.z);
  }

  buildExterior() {
    const s = this.site, g = this.exterior;
    const brick = makeMaterial(0x715042), trim = makeMaterial(0xc7b998), glass = makeMaterial(0x182331, { roughness: 0.2, metalness: 0.35 });
    const doorMat = makeMaterial(0x35241d, { roughness: 0.68 }), brass = makeMaterial(0xc49a42, { roughness: 0.3, metalness: 0.75 });
    const frontX = s.x - s.width / 2, backX = s.x + s.width / 2, wall = 0.35, door = 2.2;
    box(g, brick, [s.width, s.height, wall], [s.x, s.height / 2, s.z - s.depth / 2], 'apartment-side-south');
    box(g, brick, [s.width, s.height, wall], [s.x, s.height / 2, s.z + s.depth / 2], 'apartment-side-north');
    box(g, brick, [wall, s.height, s.depth], [backX, s.height / 2, s.z], 'apartment-back');
    const wing = (s.depth - door) / 2;
    box(g, brick, [wall, s.height, wing], [frontX, s.height / 2, s.z - door / 2 - wing / 2], 'apartment-front-south');
    box(g, brick, [wall, s.height, wing], [frontX, s.height / 2, s.z + door / 2 + wing / 2], 'apartment-front-north');
    box(g, brick, [wall, s.height - 2.7, door], [frontX, 2.7 + (s.height - 2.7) / 2, s.z], 'apartment-front-header');
    box(g, trim, [s.width + 0.5, 0.45, s.depth + 0.5], [s.x, s.height + 0.2, s.z], 'apartment-roof');
    box(g, trim, [0.18, 2.65, 0.16], [frontX - 0.2, 1.325, s.z - door / 2 - 0.08], 'apartment-entry-trim-south');
    box(g, trim, [0.18, 2.65, 0.16], [frontX - 0.2, 1.325, s.z + door / 2 + 0.08], 'apartment-entry-trim-north');
    box(g, trim, [0.18, 0.16, door + 0.35], [frontX - 0.2, 2.57, s.z], 'apartment-entry-trim-top');
    box(g, doorMat, [0.18, 2.42, door - 0.16], [frontX - 0.12, 1.21, s.z], 'north-court-exterior-door');
    box(g, brass, [0.11, 0.11, 0.11], [frontX - 0.24, 1.05, s.z - 0.68], 'north-court-exterior-handle');
    const stride = this.mobile ? 2 : 1;
    for (let floor = 0; floor < 4; floor++) for (let i = -2; i <= 2; i += stride) {
      if (floor === 0 && i === 0) continue;
      box(g, glass, [0.08, 1.15, 1.15], [frontX - 0.23, 2 + floor * 3.1, s.z + i * 2.25], 'apartment-window');
    }
    wallCollider(this.addCollider, s.x, s.height / 2, s.z - s.depth / 2, s.width, s.height, wall);
    wallCollider(this.addCollider, s.x, s.height / 2, s.z + s.depth / 2, s.width, s.height, wall);
    wallCollider(this.addCollider, backX, s.height / 2, s.z, wall, s.height, s.depth);
    wallCollider(this.addCollider, frontX, s.height / 2, s.z - door / 2 - wing / 2, wall, s.height, wing);
    wallCollider(this.addCollider, frontX, s.height / 2, s.z + door / 2 + wing / 2, wall, s.height, wing);
    wallCollider(this.addCollider, frontX, 2.7 + (s.height - 2.7) / 2, s.z, wall, s.height - 2.7, door);
    wallCollider(this.addCollider, frontX - 0.12, 1.21, s.z, 0.18, 2.42, door - 0.16, { door: 'north-court-exterior' });
  }

  buildInterior() {
    const s = this.site, g = this.interior, y = s.interiorY;
    const floor = makeMaterial(0x5c4638), wall = makeMaterial(0xb6aa91), ceiling = makeMaterial(0x77736b), accent = makeMaterial(0x4e3028), metal = makeMaterial(0x3d4147, { metalness: 0.4 });
    const doorMat = makeMaterial(0x4a3025, { roughness: 0.7 }), brass = makeMaterial(0xc49a42, { roughness: 0.3, metalness: 0.75 });
    const w = 13, d = 10, h = 3.2, cx = s.x, cz = s.z, t = 0.22;
    box(g, floor, [w, 0.18, d], [cx, y - 0.09, cz], 'apartment-floor');
    this.ceiling = box(g, ceiling, [w, 0.18, d], [cx, y + h + 0.09, cz], 'apartment-ceiling');
    this.ceilingBounds = { minX: cx - w / 2, maxX: cx + w / 2, minY: y + h, maxY: y + h + 0.18, minZ: cz - d / 2, maxZ: cz + d / 2 };
    box(g, wall, [w, h, t], [cx, y + h / 2, cz - d / 2], 'apartment-wall-south');
    box(g, wall, [w, h, t], [cx, y + h / 2, cz + d / 2], 'apartment-wall-north');
    box(g, wall, [t, h, d], [cx + w / 2, y + h / 2, cz], 'apartment-wall-east');
    const door = 2.1, wing = (d - door) / 2, frontX = cx - w / 2;
    box(g, wall, [t, h, wing], [frontX, y + h / 2, cz - door / 2 - wing / 2], 'apartment-wall-west-south');
    box(g, wall, [t, h, wing], [frontX, y + h / 2, cz + door / 2 + wing / 2], 'apartment-wall-west-north');
    box(g, wall, [t, h - 2.45, door], [frontX, y + 2.45 + (h - 2.45) / 2, cz], 'apartment-wall-west-header');
    box(g, doorMat, [0.16, 2.35, door - 0.14], [frontX + 0.1, y + 1.175, cz], 'north-court-interior-exit-door');
    box(g, brass, [0.1, 0.1, 0.1], [frontX + 0.21, y + 1.02, cz + 0.65], 'north-court-interior-handle');
    // A reusable compact apartment: hall, living room, kitchenette, and bedroom.
    box(g, wall, [t, h, 3.4], [cx + 0.4, y + h / 2, cz - 3.3], 'apartment-partition-a');
    box(g, wall, [t, h, 3.4], [cx + 0.4, y + h / 2, cz + 3.3], 'apartment-partition-b');
    box(g, accent, [3.1, 0.7, 1.15], [cx + 3.9, y + 0.35, cz - 3.9], 'apartment-kitchen-counter');
    box(g, metal, [1.2, 1.8, 0.75], [cx + 5.4, y + 0.9, cz - 4.25], 'apartment-fridge');
    box(g, accent, [3.4, 0.65, 1.8], [cx + 3.4, y + 0.325, cz + 2.7], 'apartment-sofa');
    box(g, floor, [2.8, 0.45, 4.2], [cx - 2.4, y + 0.225, cz - 2.25], 'apartment-bed');
    const light = new THREE.PointLight(0xffd19a, this.mobile ? 35 : 55, 14, 2); light.position.set(cx, y + 2.7, cz); g.add(light);
    wallCollider(this.addCollider, cx, y - 0.05, cz, w, 0.2, d, { step: true, interior: s.id });
    wallCollider(this.addCollider, cx, y + h / 2, cz - d / 2, w, h, t, { interior: s.id });
    wallCollider(this.addCollider, cx, y + h / 2, cz + d / 2, w, h, t, { interior: s.id });
    wallCollider(this.addCollider, cx + w / 2, y + h / 2, cz, t, h, d, { interior: s.id });
    wallCollider(this.addCollider, frontX, y + h / 2, cz - door / 2 - wing / 2, t, h, wing, { interior: s.id });
    wallCollider(this.addCollider, frontX, y + h / 2, cz + door / 2 + wing / 2, t, h, wing, { interior: s.id });
    wallCollider(this.addCollider, frontX, y + 2.45 + (h - 2.45) / 2, cz, t, h - 2.45, door, { interior: s.id });
    wallCollider(this.addCollider, frontX + 0.1, y + 1.175, cz, 0.16, 2.35, door - 0.14, { interior: s.id, door: 'north-court-interior' });
    wallCollider(this.addCollider, cx + 0.4, y + h / 2, cz - 3.3, t, h, 3.4, { interior: s.id });
    wallCollider(this.addCollider, cx + 0.4, y + h / 2, cz + 3.3, t, h, 3.4, { interior: s.id });
    // Furniture uses inexpensive AABBs so the visible avatar cannot walk
    // through it. These live at the elevated interior floor and therefore do
    // not affect the exterior neighborhood.
    wallCollider(this.addCollider, cx + 3.9, y + 0.35, cz - 3.9, 3.1, 0.7, 1.15, { interior: s.id, furniture: 'counter' });
    wallCollider(this.addCollider, cx + 5.4, y + 0.9, cz - 4.25, 1.2, 1.8, 0.75, { interior: s.id, furniture: 'fridge' });
    wallCollider(this.addCollider, cx + 3.4, y + 0.325, cz + 2.7, 3.4, 0.65, 1.8, { interior: s.id, furniture: 'sofa' });
    wallCollider(this.addCollider, cx - 2.4, y + 0.225, cz - 2.25, 2.8, 0.45, 4.2, { interior: s.id, furniture: 'bed' });
  }

  update(player, input, now = 0) {
    const wantsInteract = !!input.interact;
    input.interact = false;
    const target = this.active ? this.exit : this.entry;
    const near = insideInteractionRange(player.pos, target, this.active ? 2.7 : 2.8);
    const action = this.mobile ? (this.active ? 'TAP EXIT' : 'TAP ENTER') : (this.active ? '[E] EXIT' : '[E] ENTER');
    this.prompt = near ? (this.active ? `EXIT NORTH COURT · ${action}` : `ENTER NORTH COURT · ${action}`) : '';
    const cooldownReady = interactionCooldownReady(now, this.transitionReadyAt);
    if (!shouldTransitionApartment(near, wantsInteract, cooldownReady)) return { active: this.active, transitioned: false, prompt: this.prompt, cooldownReady };
    this.active = !this.active;
    this.interior.visible = this.active;
    player.pos.copy(this.active ? this.insideSpawn : this.outsideSpawn);
    player.vel.set(0, 0, 0); player.onGround = true;
    if (!this.active) player.yaw = Math.PI / 2;
    this.transitionReadyAt = now + TRANSITION_COOLDOWN;
    this.prompt = '';
    return { active: this.active, transitioned: true, prompt: '', name: this.site.name, cooldownReady: true };
  }

  updateCameraVisibility(camera, player, dt = 1 / 60) {
    if (!this.ceiling) return false;
    const target = { x: player.pos.x, y: player.pos.y + 1.2, z: player.pos.z };
    const obstructed = this.active && ceilingObstructsView(camera.position, target, this.ceilingBounds);
    const targetOpacity = obstructed ? 0 : 1;
    const material = this.ceiling.material;
    material.opacity += (targetOpacity - material.opacity) * (1 - Math.exp(-18 * Math.max(0, dt)));
    material.transparent = material.opacity < 0.999;
    material.depthWrite = material.opacity > 0.55;
    this.ceiling.visible = material.opacity > 0.025;
    return obstructed;
  }
}
