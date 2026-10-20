import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';

const COLORS = {
  world: 0x57e389,
  vehicle: 0xff9f43,
  door: 0xffd166,
  interior: 0x5dade2,
};

function kindOf(collider) {
  if (collider.vehicle) return 'vehicle';
  if (collider.door) return 'door';
  if (collider.interior) return 'interior';
  return 'world';
}

// Developer-only collision overlay. Enable with ?collisionDebug=1. It is kept
// out of normal profiles so the extra draw calls and helpers cost nothing in
// founder/public builds.
export function createCollisionDebug(scene, colliders, player) {
  const root = new THREE.Group(); root.name = 'collision-debug'; scene.add(root);
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const matrix = new THREE.Matrix4();
  for (const kind of Object.keys(COLORS)) {
    const items = colliders.filter((c) => kindOf(c) === kind);
    if (!items.length) continue;
    const material = new THREE.MeshBasicMaterial({ color: COLORS[kind], wireframe: true, transparent: true, opacity: kind === 'world' ? 0.2 : 0.62, depthTest: false });
    const mesh = new THREE.InstancedMesh(unit, material, items.length); mesh.name = `collision-debug-${kind}`; mesh.renderOrder = 100;
    items.forEach((c, i) => {
      const sx = Math.max(0.02, c.maxX - c.minX), sy = Math.max(0.02, c.maxY - c.minY), sz = Math.max(0.02, c.maxZ - c.minZ);
      matrix.makeScale(sx, sy, sz); matrix.setPosition((c.minX + c.maxX) / 2, (c.minY + c.maxY) / 2, (c.minZ + c.maxZ) / 2); mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true; mesh.frustumCulled = false; root.add(mesh);
  }

  const playerMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(player.radius, player.radius, player.height, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x39d5ff, wireframe: true, depthTest: false }),
  );
  playerMesh.name = 'collision-debug-player'; playerMesh.renderOrder = 101; root.add(playerMesh);
  const arrows = Array.from({ length: 8 }, () => {
    const arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 0.8, 0xff3b4a, 0.18, 0.1);
    arrow.visible = false; arrow.renderOrder = 102; root.add(arrow); return arrow;
  });

  return {
    root,
    update() {
      playerMesh.position.set(player.pos.x, player.pos.y + player.height / 2, player.pos.z);
      for (let i = 0; i < arrows.length; i++) {
        const contact = player.collisionContacts[i], arrow = arrows[i];
        arrow.visible = !!contact;
        if (!contact) continue;
        arrow.position.set(player.pos.x, player.pos.y + 0.22 + i * 0.035, player.pos.z);
        arrow.setDirection(new THREE.Vector3(contact.x, 0, contact.z).normalize());
      }
    },
  };
}
