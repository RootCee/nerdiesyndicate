import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { createRoadPaintLayout, PAINT } from './city-road-paint-layout.js';

const COLORS = Object.freeze({
  [PAINT.lane]: new THREE.Color(0xd7a83e),
  [PAINT.crosswalk]: new THREE.Color(0xd8d5c9),
});

function pushRect(position, color, spec) {
  const x0 = spec.x - spec.width / 2;
  const x1 = spec.x + spec.width / 2;
  const z0 = spec.z - spec.depth / 2;
  const z1 = spec.z + spec.depth / 2;
  const base = position.length / 3;
  position.push(x0, 0, z0, x1, 0, z0, x1, 0, z1, x0, 0, z1);
  const tint = COLORS[spec.kind];
  for (let i = 0; i < 4; i++) color.push(tint.r, tint.g, tint.b);
  // Counter-clockwise from above so the single-sided paint faces the camera.
  return [base, base + 2, base + 1, base, base + 3, base + 2];
}

export function buildCityRoadMarkings(parent, roads) {
  const layout = createRoadPaintLayout(roads);
  const position = [];
  const color = [];
  const index = [];
  for (const spec of layout) index.push(...pushRect(position, color, spec));

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
  geometry.setIndex(index);
  geometry.computeBoundingSphere();

  const material = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'city-road-markings';
  mesh.position.y = 0.061;
  mesh.renderOrder = 1;
  parent.add(mesh);
  return { mesh, quads: layout.length, triangles: layout.length * 2 };
}
