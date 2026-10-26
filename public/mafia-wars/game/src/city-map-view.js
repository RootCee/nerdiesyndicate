// M6.6 map math and shared map rules. Pure (no DOM or Three.js) so Node tests
// cover projection, zoom/pan limits, and marker visibility.

// The one visibility rule for every map surface (minimap, full-screen map,
// Underground map). Callers pass the same marker list the minimap has always
// received: allies always show; an opponent shows only while spotted (within
// 14 m in the Underground, or marked by Snitch in practice). Public-city
// players are never in that list, so no map can reveal them.
export const mapDotVisible = (dot, snitch = false) => dot.team !== 'red' || snitch || !!dot.spotted;

export const MINIMAP_BACKGROUND = Object.freeze({
  colors: Object.freeze({ park: '#3f6b3a', field: '#5a8a4a', civic: '#6a3fae', road: '#2a2f38', alley: '#35383d', walk: '#737a80', house: '#d8d2c5', apartment: '#b88a4a', venue: '#d9ac58', bank: '#c9a24a', garage: '#b3ada2', fence: '#8a9a88', tree: '#2c5a2e', pole: '#9a9a9a' }),
  order: Object.freeze(['park', 'field', 'road', 'alley', 'walk', 'fence', 'tree', 'garage', 'house', 'apartment', 'venue', 'bank', 'pole']),
});

// Draws the baked top-down background (x right, z down in canvas pixels; the
// views rotate or flip it). Shared by the minimap and the full-screen map.
export function drawMapRects(g, rects, bounds, S) {
  const { colors, order } = MINIMAP_BACKGROUND;
  g.fillStyle = '#39482c'; g.fillRect(0, 0, g.canvas.width, g.canvas.height);
  for (const t of order) for (const r of rects) if (r.type === t) {
    g.fillStyle = colors[t];
    if (t === 'tree') { g.beginPath(); g.arc((r.x + r.w / 2 - bounds.minX) * S, (r.z + r.h / 2 - bounds.minZ) * S, r.w / 2 * S, 0, 6.3); g.fill(); continue; }
    g.fillRect((r.x - bounds.minX) * S, (r.z - bounds.minZ) * S, Math.max(1, r.w * S), Math.max(1, r.h * S));
    if (t === 'house' || t === 'apartment' || t === 'venue' || t === 'bank') {
      g.strokeStyle = t === 'venue' || t === 'bank' ? '#ffe29a' : '#8c8578'; g.lineWidth = t === 'venue' || t === 'bank' ? 2 : 1;
      g.strokeRect((r.x - bounds.minX) * S, (r.z - bounds.minZ) * S, r.w * S, r.h * S);
    }
  }
}

// North-up view. The city names +z "north" and +x "east"; a true top-down view
// with north up therefore shows +x on the left. The map is never mirrored, so
// turning left in the world also turns left on the map.
export function createMapView({ bounds, width = 1, height = 1, maxScale = 7, margin = 0.94 }) {
  const view = {
    bounds, width, height, cx: (bounds.minX + bounds.maxX) / 2, cz: (bounds.minZ + bounds.maxZ) / 2, scale: 1, minScale: 1, maxScale,
    resize(w, h) {
      const fit = Math.min(w / (bounds.maxX - bounds.minX), h / (bounds.maxZ - bounds.minZ)) * margin;
      const wasFit = Math.abs(this.scale - this.minScale) < 1e-6;
      this.width = w; this.height = h; this.minScale = fit; this.maxScale = Math.max(maxScale, fit);
      this.scale = wasFit ? fit : Math.min(this.maxScale, Math.max(fit, this.scale));
      return this.clamp();
    },
    toScreen(x, z) { return { x: this.width / 2 - (x - this.cx) * this.scale, y: this.height / 2 - (z - this.cz) * this.scale }; },
    toWorld(sx, sy) { return { x: this.cx - (sx - this.width / 2) / this.scale, z: this.cz - (sy - this.height / 2) / this.scale }; },
    // Keeps the city on screen: when the view is wider than the city on an
    // axis the city is centred on it, otherwise its edges cannot pass the
    // screen edges.
    clamp() {
      const hw = this.width / 2 / this.scale, hh = this.height / 2 / this.scale;
      const fitAxis = (c, lo, hi, half) => (hi - lo <= half * 2 ? (lo + hi) / 2 : Math.min(hi - half, Math.max(lo + half, c)));
      this.cx = fitAxis(this.cx, bounds.minX, bounds.maxX, hw); this.cz = fitAxis(this.cz, bounds.minZ, bounds.maxZ, hh);
      return this;
    },
    // Zooms about a screen point, keeping the world point under it fixed
    // (until a pan limit is reached).
    zoomAt(factor, sx = this.width / 2, sy = this.height / 2) {
      const anchor = this.toWorld(sx, sy);
      this.scale = Math.min(this.maxScale, Math.max(this.minScale, this.scale * factor));
      this.cx = anchor.x + (sx - this.width / 2) / this.scale; this.cz = anchor.z + (sy - this.height / 2) / this.scale;
      return this.clamp();
    },
    // Content follows the finger / mouse.
    panBy(dx, dy) { this.cx += dx / this.scale; this.cz += dy / this.scale; return this.clamp(); },
    centerOn(x, z, scale = this.scale) { this.scale = Math.min(this.maxScale, Math.max(this.minScale, scale)); this.cx = x; this.cz = z; return this.clamp(); },
    fit() { this.scale = this.minScale; this.cx = (bounds.minX + bounds.maxX) / 2; this.cz = (bounds.minZ + bounds.maxZ) / 2; return this.clamp(); },
    // Screen angle (canvas radians, 0 = right, +π/2 = down) a player facing
    // `yaw` looks toward. Player forward is (-sin yaw, -cos yaw) in world.
    headingAngle(yaw) { return Math.atan2(Math.cos(yaw), Math.sin(yaw)); },
  };
  return view.resize(width, height);
}

// Waypoint arrow angle relative to where the player faces: 0 = straight
// ahead, positive = turn right (player right vector is (cos yaw, -sin yaw)).
export function relativeBearing(position, yaw, target) {
  const vx = target.x - position.x, vz = target.z - position.z;
  const ahead = -Math.sin(yaw) * vx - Math.cos(yaw) * vz, right = Math.cos(yaw) * vx - Math.sin(yaw) * vz;
  return Math.atan2(right, ahead);
}

export const formatDistance = (metres) => (metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.max(1, Math.round(metres))} m`);
