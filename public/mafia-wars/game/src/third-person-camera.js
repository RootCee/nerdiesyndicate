import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { raycastWorld } from './world.js';
import { clampCameraHeight, collisionDistance, dampAngle, dampFactor, dampValue } from './camera-math.js';

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
    // Combat pulls the camera in and further over the shoulder so the player's
    // own body stays clear of the crosshair; aiming tightens it again.
    this.profiles = {
      roam: { distance: this.distance, shoulder: this.shoulder, height: this.height },
      combat: { distance: 3.3, shoulder: 0.62, height: 1.45 },
      aim: { distance: 2.1, shoulder: 0.74, height: 1.5 },
    };
    this.view = { ...this.profiles.roam };
    this.options = { combat: false, aim: false };
    this.enabled = false;
    this.yaw = player.yaw;
    this.pitch = player.pitch;
    this.currentPosition = new THREE.Vector3();
    this.currentOffset = new THREE.Vector3(); // camera relative to the follow target (smoothed)
    this.currentDistance = this.distance;
    this.initialized = false;
    this.collision = { hit: false, fraction: 1, distance: this.distance };
  }

  setEnabled(enabled, snap = false) {
    this.enabled = !!enabled;
    if (this.enabled && snap) {
      this.yaw = this.player.yaw;
      this.pitch = this.player.pitch;
      this.initialized = false;
      this.update(1, true, this.options);
    }
  }

  toggle() {
    this.setEnabled(!this.enabled, true);
    return this.enabled;
  }

  // Hides the local body when collision has pulled the camera into it.
  get obstructed() { return this.enabled && this.currentDistance < 1.1; }

  update(dt, snap = false, options = this.options) {
    this.options = options;
    if (!this.enabled) return;
    const { player, camera, view } = this;
    const profile = options.aim ? this.profiles.aim : options.combat ? this.profiles.combat : this.profiles.roam;
    for (const key of ['distance', 'shoulder', 'height']) view[key] = snap ? profile[key] : dampValue(view[key], profile[key], 10, dt);
    this.yaw = snap ? player.yaw : dampAngle(this.yaw, player.yaw, this.rotationSmoothing, dt);
    this.pitch = snap ? player.pitch : dampValue(this.pitch, player.pitch, this.rotationSmoothing, dt);
    const pitch = THREE.MathUtils.clamp(this.pitch * 0.72, -0.9, 0.95);
    const cp = Math.cos(pitch);
    VIEW.set(-Math.sin(this.yaw) * cp, Math.sin(pitch), -Math.cos(this.yaw) * cp).normalize();
    RIGHT.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    TARGET.set(player.pos.x, player.pos.y + view.height - player.crouchT * 0.35, player.pos.z);
    DESIRED.copy(TARGET).addScaledVector(VIEW, -view.distance).addScaledVector(RIGHT, view.shoulder);
    SEGMENT.subVectors(DESIRED, TARGET);
    raycastWorld(TARGET, SEGMENT, 1, true, HIT);
    const clearDistance = collisionDistance(SEGMENT.length(), HIT.t);
    if (snap || !this.initialized) this.currentDistance = clearDistance;
    else {
      const collisionSpeed = clearDistance < this.currentDistance ? this.collisionInSmoothing : this.collisionOutSmoothing;
      this.currentDistance = dampValue(this.currentDistance, clearDistance, collisionSpeed, dt);
    }
    DESIRED.copy(TARGET).addScaledVector(SEGMENT.normalize(), this.currentDistance);
    // Looking upward naturally places an orbit camera below its target. The city
    // ground is visual geometry (not a raycast collider), so constrain the
    // camera to the player's current walking floor without changing the orbit.
    DESIRED.y = clampCameraHeight(DESIRED.y, player.pos.y);
    // Smooth the camera's offset from the player, not its world position: the camera then moves
    // with the player exactly, so frame-time hitches no longer jerk the character on screen while
    // walking or running. Orbit and collision changes stay smoothed.
    DESIRED.sub(TARGET);
    if (snap || !this.initialized) this.currentOffset.copy(DESIRED);
    else this.currentOffset.lerp(DESIRED, dampFactor(this.smoothing, dt));
    this.currentPosition.copy(TARGET).add(this.currentOffset);
    // Also clamp the smoothed position so a prior below-floor frame cannot ease
    // upward through visible terrain on slower mobile frame rates.
    this.currentPosition.y = clampCameraHeight(this.currentPosition.y, player.pos.y);
    camera.position.copy(this.currentPosition);
    LOOK_AT.copy(TARGET).addScaledVector(VIEW, 6).addScaledVector(RIGHT, view.shoulder * 0.25);
    camera.up.set(0, 1, 0);
    camera.lookAt(LOOK_AT);
    this.collision.hit = HIT.t < 1;
    this.collision.fraction = HIT.t;
    this.collision.distance = this.currentDistance;
    this.initialized = true;
  }
}
