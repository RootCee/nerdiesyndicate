import * as THREE from 'three';
import { raycastWorld } from './world.js';
import { collisionDistance, dampAngle, dampFactor, dampValue } from './camera-math.js';

const TARGET = new THREE.Vector3();
const VIEW = new THREE.Vector3();
const RIGHT = new THREE.Vector3();
const SEGMENT = new THREE.Vector3();
const DESIRED = new THREE.Vector3();
const LOOK_AT = new THREE.Vector3();
const HIT = { t: 1, n: new THREE.Vector3() };

export class ThirdPersonCamera {
  constructor(camera, player, options = {}) {
    this.camera = camera;
    this.player = player;
    this.distance = options.distance ?? 4.6;
    this.height = options.height ?? 1.38;
    this.shoulder = options.shoulder ?? 0.42;
    this.smoothing = options.smoothing ?? 14;
    this.rotationSmoothing = options.rotationSmoothing ?? 18;
    this.collisionInSmoothing = options.collisionInSmoothing ?? 30;
    this.collisionOutSmoothing = options.collisionOutSmoothing ?? 8;
    this.enabled = false;
    this.yaw = player.yaw;
    this.pitch = player.pitch;
    this.currentPosition = new THREE.Vector3();
    this.currentDistance = this.distance;
    this.initialized = false;
    this.collision = { hit: false, fraction: 1, distance: this.distance };
  }

  setEnabled(enabled, snap = false) {
    this.enabled = !!enabled;
    if (this.enabled && snap) {
      this.yaw = this.player.yaw;
      this.pitch = this.player.pitch;
      this.currentDistance = this.distance;
      this.initialized = false;
      this.update(1, true);
    }
  }

  toggle() {
    this.setEnabled(!this.enabled, true);
    return this.enabled;
  }

  update(dt, snap = false) {
    if (!this.enabled) return;
    const { player, camera } = this;
    this.yaw = snap ? player.yaw : dampAngle(this.yaw, player.yaw, this.rotationSmoothing, dt);
    this.pitch = snap ? player.pitch : dampValue(this.pitch, player.pitch, this.rotationSmoothing, dt);
    const pitch = THREE.MathUtils.clamp(this.pitch * 0.72, -0.9, 0.95);
    const cp = Math.cos(pitch);
    VIEW.set(-Math.sin(this.yaw) * cp, Math.sin(pitch), -Math.cos(this.yaw) * cp).normalize();
    RIGHT.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    TARGET.set(player.pos.x, player.pos.y + this.height - player.crouchT * 0.35, player.pos.z);
    DESIRED.copy(TARGET).addScaledVector(VIEW, -this.distance).addScaledVector(RIGHT, this.shoulder);
    SEGMENT.subVectors(DESIRED, TARGET);
    raycastWorld(TARGET, SEGMENT, 1, true, HIT);
    const clearDistance = collisionDistance(SEGMENT.length(), HIT.t);
    if (snap || !this.initialized) this.currentDistance = clearDistance;
    else {
      const collisionSpeed = clearDistance < this.currentDistance ? this.collisionInSmoothing : this.collisionOutSmoothing;
      this.currentDistance = dampValue(this.currentDistance, clearDistance, collisionSpeed, dt);
    }
    DESIRED.copy(TARGET).addScaledVector(SEGMENT.normalize(), this.currentDistance);
    if (snap || !this.initialized) this.currentPosition.copy(DESIRED);
    else this.currentPosition.lerp(DESIRED, dampFactor(this.smoothing, dt));
    camera.position.copy(this.currentPosition);
    LOOK_AT.copy(TARGET).addScaledVector(VIEW, 6).addScaledVector(RIGHT, this.shoulder * 0.25);
    camera.up.set(0, 1, 0);
    camera.lookAt(LOOK_AT);
    this.collision.hit = HIT.t < 1;
    this.collision.fraction = HIT.t;
    this.collision.distance = this.currentDistance;
    this.initialized = true;
  }
}
