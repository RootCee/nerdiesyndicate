import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { groundAt, resolve, MAP } from './world.js';
import { movementSubsteps, PLAYER_COLLISION_RADIUS } from './collision-math.js';
export { PLAYER_COLLISION_RADIUS } from './collision-math.js';

const FWD = new THREE.Vector3(), RIGHT = new THREE.Vector3(), WISH = new THREE.Vector3();
// Matches the visible hoodie avatar's torso/arm footprint. The old 0.48 m
// circle stopped the root correctly but let the animated shoulders enter walls.
export class Player {
  constructor(camera) {
    this.camera = camera; this.pos = new THREE.Vector3(0, 0, 40); this.vel = new THREE.Vector3();
    this.yaw = Math.PI; this.pitch = 0; this.kick = 0; this.kickYaw = 0; this.hp = 100; this.maxHp = 100; this.dead = false; this.onGround = true;
    this.crouchT = 0; this.radius = PLAYER_COLLISION_RADIUS; this.height = 1.8; this.eye = 1.62; this.bob = 0; this.bobAmp = 0; this.sens = 0.0022; this.team = 'blue'; this.name = 'You';
    this.kills = 0; this.deaths = 0; this.lastHit = -10; this.regenAt = 0; this.stepT = 0; this.speedMul = 1; this.fovAds = 0;
    camera.rotation.order = 'YXZ';
  }
  get head() { return new THREE.Vector3(this.pos.x, this.pos.y + this.eye * (1 - this.crouchT * 0.33), this.pos.z); }
  forward(out = FWD) { return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }
  update(dt, input, look, time, writeCamera = true) {
    if (!this.dead) {
      this.yaw -= look.dx * this.sens * (input.ads ? 0.6 : 1); this.pitch = THREE.MathUtils.clamp(this.pitch - look.dy * this.sens * (input.ads ? 0.6 : 1), -1.45, 1.45);
    }
    const crouchTarget = input.crouch && !this.dead ? 1 : 0; this.crouchT += (crouchTarget - this.crouchT) * Math.min(1, dt * 12);
    this.forward(FWD); RIGHT.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    WISH.set(0, 0, 0);
    if (!this.dead) { WISH.addScaledVector(FWD, input.moveY).addScaledVector(RIGHT, input.moveX); if (WISH.lengthSq() > 1) WISH.normalize(); }
    const sprint = input.sprint && input.moveY > 0.3 && !input.ads && this.crouchT < 0.5;
    const speed = (sprint ? 6.6 : 4.4) * (1 - this.crouchT * 0.45) * (input.ads ? 0.6 : 1) * this.speedMul;
    const accel = this.onGround ? 14 : 3;
    this.vel.x += (WISH.x * speed - this.vel.x) * Math.min(1, dt * accel);
    this.vel.z += (WISH.z * speed - this.vel.z) * Math.min(1, dt * accel);
    if (input.jump && this.onGround && !this.dead) { this.vel.y = 4.6; this.onGround = false; }
    input.jump = false;
    this.vel.y -= 14 * dt;
    // Integrate horizontal movement in bounded pieces. This prevents a sprint
    // frame from crossing thin geometry and preserves the unblocked component
    // for stable wall sliding.
    const h = this.height * (1 - this.crouchT * 0.35);
    const moveX = this.vel.x * dt, moveZ = this.vel.z * dt;
    const steps = movementSubsteps(moveX, moveZ);
    const stepX = moveX / steps, stepZ = moveZ / steps;
    for (let i = 0; i < steps; i++) {
      const beforeX = this.pos.x, beforeZ = this.pos.z;
      this.pos.x += stepX; this.pos.z += stepZ;
      if (resolve(this.pos, this.radius, this.pos.y + 0.25, this.pos.y + h, this.pos.y)) {
        const actualX = this.pos.x - beforeX, actualZ = this.pos.z - beforeZ;
        if (Math.abs(actualX) < Math.abs(stepX) * 0.35) this.vel.x = 0;
        if (Math.abs(actualZ) < Math.abs(stepZ) * 0.35) this.vel.z = 0;
      }
    }
    this.pos.y += this.vel.y * dt;
    const g = groundAt(this.pos.x, this.pos.z, this.pos.y);
    if (this.pos.y <= g + 0.001 && this.vel.y <= 0) { this.pos.y = g; this.vel.y = 0; this.onGround = true; } else this.onGround = false;
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, MAP.minX + 0.5, MAP.maxX - 0.5); this.pos.z = THREE.MathUtils.clamp(this.pos.z, MAP.minZ + 0.5, MAP.maxZ - 0.5);
    // head bob
    const planar = Math.hypot(this.vel.x, this.vel.z);
    const bobTarget = this.onGround ? planar / 6.6 : 0; this.bobAmp += (bobTarget - this.bobAmp) * Math.min(1, dt * 8);
    this.bob += dt * (sprint ? 11 : 8.5) * (planar > 0.3 ? 1 : 0);
    this.stepT += planar * dt; this.stepped = false; if (this.stepT > 2.2 && this.onGround) { this.stepT = 0; this.stepped = true; }
    // recoil recovery
    this.kick *= Math.exp(-dt * 9); this.kickYaw *= Math.exp(-dt * 9);
    // regen
    if (!this.dead && this.hp < this.maxHp && time - this.lastHit > 4.5) this.hp = Math.min(this.maxHp, this.hp + dt * 22);
    // camera
    const eye = this.eye * (1 - this.crouchT * 0.33) + (this.dead ? -1.2 : 0);
    const bx = Math.sin(this.bob) * 0.025 * this.bobAmp, by = Math.abs(Math.cos(this.bob)) * 0.03 * this.bobAmp - 0.01 * this.bobAmp;
    if (writeCamera) {
      this.camera.position.set(this.pos.x + RIGHT.x * bx, this.pos.y + eye + by, this.pos.z + RIGHT.z * bx);
      this.camera.rotation.set(this.pitch + this.kick, this.yaw + this.kickYaw, Math.sin(this.bob * 0.5) * 0.006 * this.bobAmp + (this.dead ? 0.35 : 0));
    }
    this.planar = planar; this.sprinting = sprint;
  }
  damage(n, time) { if (this.dead) return false; this.hp -= n; this.lastHit = time; if (this.hp <= 0) { this.hp = 0; this.dead = true; this.deaths++; return true; } return false; }
  respawn(p) { this.pos.copy(p); this.vel.set(0, 0, 0); this.hp = this.maxHp; this.dead = false; this.yaw = p.z > 0 ? Math.PI : 0; this.pitch = 0; }
}
