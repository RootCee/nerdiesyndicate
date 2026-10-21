import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { HybridApartmentSystem, addInteriorIsolationShell, box, makeMaterial, wallCollider } from './apartment-system.js';
import { insideInteractionRange, interactionCooldownReady, shouldTransitionApartment } from './city-layout.js';

const TRANSITION_COOLDOWN = 0.65;

// Reuse the proven apartment transition, render-layer, and ceiling-cutaway
// lifecycle. Only the compact house shell, floor plan, furnishings, and labels
// differ, keeping private interiors compatible with the existing camera path.
export class HybridHouseSystem extends HybridApartmentSystem {
  constructor(scene, site, options = {}) {
    super(scene, site, options);
    const frontX = site.x - site.width / 2;
    const interiorFrontX = site.x - 6;
    this.entry.set(frontX - 1.35, 0, site.z);
    this.insideSpawn.set(interiorFrontX + 1.3, site.interiorY, site.z);
    this.exit.set(interiorFrontX + 0.9, site.interiorY, site.z);
    this.outsideSpawn.set(frontX - 1.45, 0, site.z);
    if (site.entry) this.entry.set(site.entry.x, site.entry.y, site.entry.z);
    if (site.outsideSpawn) this.outsideSpawn.set(site.outsideSpawn.x, site.outsideSpawn.y, site.outsideSpawn.z);
    this.destruction = null;
  }

  buildExterior() {
    const s = this.site, g = this.exterior;
    // Original-kit houses already supply their visible door, porch, walls and
    // destruction-aware face colliders. Reusing that exterior avoids a fake
    // shell and prevents duplicate collision geometry.
    if (s.useExistingExterior) return;
    const door = makeMaterial(0x3d261d, { roughness: 0.72 });
    const trim = makeMaterial(0xd1c4a4), brass = makeMaterial(0xc49a42, { roughness: 0.3, metalness: 0.75 });
    const concrete = makeMaterial(0x8b8982), frontX = s.x - s.width / 2;
    box(g, concrete, [2.8, 0.12, 3.2], [frontX - 1.1, 0.04, s.z], `house-porch-${s.id}`);
    box(g, trim, [0.18, 2.65, 2.25], [frontX - 0.12, 1.325, s.z], `house-door-trim-${s.id}`);
    box(g, door, [0.2, 2.35, 1.86], [frontX - 0.24, 1.175, s.z], `house-exterior-door-${s.id}`);
    box(g, brass, [0.1, 0.1, 0.1], [frontX - 0.36, 1.02, s.z - 0.58], `house-exterior-handle-${s.id}`);
    box(g, trim, [1.9, 0.2, 2.8], [frontX - 0.85, 2.68, s.z], `house-entry-awning-${s.id}`);
    wallCollider(this.addCollider, frontX - 0.24, 1.175, s.z, 0.2, 2.35, 1.86, { door: `${s.id}-exterior`, house: s.id });
  }

  buildInterior() {
    const s = this.site, g = this.interior, y = s.interiorY;
    const floor = makeMaterial(0x624938), wall = makeMaterial(0xc4b79d), ceiling = makeMaterial(0x77736b);
    const accent = makeMaterial(0x4e3028), cabinet = makeMaterial(0x765238), metal = makeMaterial(0x454b50, { metalness: 0.35 });
    const porcelain = makeMaterial(0xd7d9d7), door = makeMaterial(0x462e23), brass = makeMaterial(0xc49a42, { metalness: 0.75 });
    const w = 12, d = 10, h = 3.2, cx = s.x, cz = s.z, t = 0.22, frontX = cx - w / 2;

    this.isolationShell = addInteriorIsolationShell(g, [cx, y + 5.5, cz], [32, 14, 28], `house-interior-isolation-shell-${s.id}`);
    this.backdrop = box(g, makeMaterial(0x25231f), [32, 0.08, 28], [cx, y - 0.17, cz], `house-cutaway-backdrop-${s.id}`);
    box(g, floor, [w, 0.18, d], [cx, y - 0.09, cz], `house-floor-${s.id}`);
    this.ceilingPanels = [];
    const columns = 3, rows = 2, panelW = w / columns, panelD = d / rows;
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      const px = cx - w / 2 + panelW * (column + 0.5), pz = cz - d / 2 + panelD * (row + 0.5);
      const panel = box(g, ceiling.clone(), [panelW + 0.025, 0.18, panelD + 0.025], [px, y + h + 0.09, pz], `house-ceiling-panel-${column}-${row}`);
      panel.userData.cutawayBounds = { minX: px - panelW / 2, maxX: px + panelW / 2, minZ: pz - panelD / 2, maxZ: pz + panelD / 2 };
      this.ceilingPanels.push(panel);
    }
    this.ceiling = this.ceilingPanels[0]; this.cutawayPanel = null;
    this.ceilingBounds = { minX: cx - w / 2, maxX: cx + w / 2, minY: y + h, maxY: y + h + 0.18, minZ: cz - d / 2, maxZ: cz + d / 2 };

    box(g, wall, [w, h, t], [cx, y + h / 2, cz - d / 2], 'house-wall-south');
    box(g, wall, [w, h, t], [cx, y + h / 2, cz + d / 2], 'house-wall-north');
    box(g, wall, [t, h, d], [cx + w / 2, y + h / 2, cz], 'house-wall-east');
    const exitWidth = 2.05, wing = (d - exitWidth) / 2;
    box(g, wall, [t, h, wing], [frontX, y + h / 2, cz - exitWidth / 2 - wing / 2], 'house-wall-west-south');
    box(g, wall, [t, h, wing], [frontX, y + h / 2, cz + exitWidth / 2 + wing / 2], 'house-wall-west-north');
    box(g, wall, [t, h - 2.45, exitWidth], [frontX, y + 2.45 + (h - 2.45) / 2, cz], 'house-wall-west-header');
    box(g, door, [0.16, 2.35, exitWidth - 0.14], [frontX + 0.1, y + 1.175, cz], `house-interior-exit-door-${s.id}`);
    box(g, brass, [0.1, 0.1, 0.1], [frontX + 0.21, y + 1.02, cz + 0.62], `house-interior-handle-${s.id}`);

    // Living room occupies the west side. Two door gaps in the main partition
    // lead to the kitchen and bedroom/bathroom side of the house.
    for (const [z, length] of [[cz - 4, 2], [cz, 2], [cz + 4, 2]]) box(g, wall, [t, h, length], [cx + 0.5, y + h / 2, z], 'house-main-partition');
    box(g, wall, [5.5, h, t], [cx + 3.25, y + h / 2, cz], 'house-east-partition');
    box(g, wall, [t, h, 2.4], [cx + 3.7, y + h / 2, cz + 3.8], 'house-bath-partition');

    box(g, accent, [3.2, 0.72, 1.25], [cx - 2.6, y + 0.36, cz + 2.5], 'house-living-sofa');
    box(g, cabinet, [2.4, 0.65, 0.55], [cx - 2.6, y + 0.325, cz - 3.8], 'house-living-media-console');
    box(g, cabinet, [3.6, 0.9, 0.9], [cx + 3.5, y + 0.45, cz - 4.15], 'house-kitchen-counter');
    box(g, metal, [1.05, 1.9, 0.8], [cx + 5.15, y + 0.95, cz - 4.1], 'house-kitchen-fridge');
    box(g, floor, [2.7, 0.48, 3.7], [cx + 2.1, y + 0.24, cz + 2.65], 'house-bedroom-bed');
    box(g, cabinet, [1.1, 2.05, 2.1], [cx + 5.25, y + 1.025, cz + 2.3], 'house-bedroom-wardrobe');
    box(g, porcelain, [1.3, 0.85, 0.65], [cx + 4.75, y + 0.425, cz + 4.35], 'house-bathroom-vanity');
    box(g, porcelain, [0.75, 0.72, 0.9], [cx + 2.75, y + 0.36, cz + 4.25], 'house-bathroom-toilet');

    const structural = [
      [cx, y - 0.05, cz, w, 0.2, d, { step: true }], [cx, y + h / 2, cz - d / 2, w, h, t],
      [cx, y + h / 2, cz + d / 2, w, h, t], [cx + w / 2, y + h / 2, cz, t, h, d],
      [frontX, y + h / 2, cz - exitWidth / 2 - wing / 2, t, h, wing],
      [frontX, y + h / 2, cz + exitWidth / 2 + wing / 2, t, h, wing],
      [frontX, y + 2.45 + (h - 2.45) / 2, cz, t, h - 2.45, exitWidth],
      [frontX + 0.1, y + 1.175, cz, 0.16, 2.35, exitWidth - 0.14, { door: `${s.id}-interior` }],
      [cx + 0.5, y + h / 2, cz - 4, t, h, 2], [cx + 0.5, y + h / 2, cz, t, h, 2],
      [cx + 0.5, y + h / 2, cz + 4, t, h, 2], [cx + 3.25, y + h / 2, cz, 5.5, h, t],
      [cx + 3.7, y + h / 2, cz + 3.8, t, h, 2.4],
    ];
    for (const [x, cy, z, sx, sy, sz, extra = {}] of structural) wallCollider(this.addCollider, x, cy, z, sx, sy, sz, { interior: s.id, house: s.id, ...extra });
    const furniture = [
      [cx - 2.6, y + 0.36, cz + 2.5, 3.2, 0.72, 1.25, 'sofa'], [cx - 2.6, y + 0.325, cz - 3.8, 2.4, 0.65, 0.55, 'media-console'],
      [cx + 3.5, y + 0.45, cz - 4.15, 3.6, 0.9, 0.9, 'counter'], [cx + 5.15, y + 0.95, cz - 4.1, 1.05, 1.9, 0.8, 'fridge'],
      [cx + 2.1, y + 0.24, cz + 2.65, 2.7, 0.48, 3.7, 'bed'], [cx + 5.25, y + 1.025, cz + 2.3, 1.1, 2.05, 2.1, 'wardrobe'],
      [cx + 4.75, y + 0.425, cz + 4.35, 1.3, 0.85, 0.65, 'vanity'], [cx + 2.75, y + 0.36, cz + 4.25, 0.75, 0.72, 0.9, 'toilet'],
    ];
    for (const [x, cy, z, sx, sy, sz, name] of furniture) wallCollider(this.addCollider, x, cy, z, sx, sy, sz, { interior: s.id, house: s.id, furniture: name });
    const fill = new THREE.AmbientLight(0xffead6, this.mobile ? 0.58 : 0.74); fill.name = `house-interior-fill-${s.id}`; g.add(fill);
    const light = new THREE.PointLight(0xffd19a, this.mobile ? 32 : 50, 14, 2); light.position.set(cx, y + 2.7, cz); light.name = `house-interior-key-${s.id}`; g.add(light);
  }

  update(player, input, now = 0) {
    const exteriorDamaged = !!this.destruction?.touched;
    if (exteriorDamaged && this.active) {
      this.active = false; this.interior.visible = false;
      player.pos.copy(this.outsideSpawn); player.vel.set(0, 0, 0); player.onGround = true;
      this.transitionReadyAt = now + TRANSITION_COOLDOWN; this.prompt = '';
      return { active: false, transitioned: true, forced: true, prompt: '', name: this.site.name, cooldownReady: false };
    }
    const wantsInteract = !!input.interact;
    const target = this.active ? this.exit : this.entry;
    const near = insideInteractionRange(player.pos, target, this.active ? 2.7 : 2.8);
    const action = this.mobile ? (this.active ? 'TAP EXIT HOUSE' : 'TAP ENTER HOUSE') : (this.active ? '[E] EXIT HOUSE' : '[E] ENTER HOUSE');
    this.prompt = near ? (exteriorDamaged ? `${this.site.name.toUpperCase()} DAMAGED · ENTRY CLOSED` : `${this.active ? 'EXIT' : 'ENTER'} ${this.site.name.toUpperCase()} · ${action}`) : '';
    const cooldownReady = interactionCooldownReady(now, this.transitionReadyAt);
    if (exteriorDamaged) return { active: false, transitioned: false, prompt: this.prompt, cooldownReady: false, blocked: true };
    if (!shouldTransitionApartment(near, wantsInteract, cooldownReady)) return { active: this.active, transitioned: false, prompt: this.prompt, cooldownReady };
    this.active = !this.active; this.interior.visible = this.active;
    player.pos.copy(this.active ? this.insideSpawn : this.outsideSpawn);
    player.vel.set(0, 0, 0); player.onGround = true;
    if (!this.active) player.yaw = this.site.outsideYaw ?? Math.PI / 2;
    this.transitionReadyAt = now + TRANSITION_COOLDOWN; this.prompt = '';
    return { active: this.active, transitioned: true, prompt: '', name: this.site.name, cooldownReady: true };
  }

  bindDestruction(spec) { this.destruction = spec || null; }
}
