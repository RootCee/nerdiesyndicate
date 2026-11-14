// Shim for 'three/webgpu' when three-avbd runs headless (World.create({ device })) next to a WebGL renderer:
// world.js only touches StorageInstancedBufferAttribute when it is given a WebGPURenderer, which we never do.
export * from '../three/three.module.js';
export class StorageInstancedBufferAttribute { constructor() { throw new Error('three-avbd: BodyMesh/renderer mode is not available in the WebGL build'); } }
