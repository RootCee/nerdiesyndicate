import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';

// One tiny generated texture gives desktop and mobile the same sky direction
// without shipping another HDR or skyline image.
export function createNaturalSkyTexture({ mobile = false } = {}) {
  const width = mobile ? 512 : 1024, height = width / 2;
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#263c59'); sky.addColorStop(0.43, '#7188a2');
  sky.addColorStop(0.72, '#d4aa83'); sky.addColorStop(1, '#5d6872');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);

  const sun = ctx.createRadialGradient(width * 0.72, height * 0.58, 0, width * 0.72, height * 0.58, width * 0.14);
  sun.addColorStop(0, 'rgba(255,235,190,.62)'); sun.addColorStop(.18, 'rgba(255,194,137,.22)'); sun.addColorStop(1, 'rgba(255,175,110,0)');
  ctx.fillStyle = sun; ctx.fillRect(0, 0, width, height);

  // Broad translucent cloud bands read naturally but cost nothing per frame.
  ctx.save(); ctx.filter = `blur(${mobile ? 7 : 12}px)`; ctx.globalAlpha = mobile ? 0.055 : 0.075;
  for (let i = 0; i < 17; i++) {
    const x = ((i * 173) % 1090) / 1090 * width - width * 0.12;
    const y = height * (0.18 + ((i * 47) % 42) / 100);
    ctx.fillStyle = i % 3 ? '#d5dbe1' : '#56677a';
    ctx.beginPath(); ctx.ellipse(x, y, width * (0.045 + (i % 4) * 0.01), height * (0.012 + (i % 3) * 0.006), -0.06, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = !mobile;
  texture.minFilter = mobile ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter;
  texture.name = 'nerdie-city-natural-sky';
  return texture;
}
