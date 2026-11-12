// NC-PULSE-01: the City Pulse display mounted in Roots Lounge. One canvas texture on one plane (no extra lights,
// no image files); it is redrawn only when the figures change. Before anyone opens the board it shows the
// Nerdie City branding and an invitation; after a load, the headline figures of the last 7 city days.
import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';

const C = { bg: '#0c0a12', panel: '#16121f', purple: '#7b3fe4', purpleDeep: '#2a1650', lime: '#b6f23a', ink: '#f1ecfa', dim: '#9d93b3', gold: '#e8c55a' };
const FONT = "'Barlow Condensed','Barlow',system-ui,sans-serif";

// Pure drawing into any 2D context (tests pass a recorder). w×h is the canvas size.
export function drawCityPulseBoard(ctx, view, w, h) {
  const u = w / 512, font = (px, weight = 700) => `${weight} ${Math.round(px * u)}px ${FONT}`;
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = C.purpleDeep; ctx.fillRect(0, 0, w, 58 * u);
  ctx.fillStyle = C.lime; ctx.fillRect(0, 58 * u, w, 3 * u);
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillStyle = C.dim; ctx.font = font(13, 600); ctx.fillText('NERDIE CITY', 18 * u, 18 * u);
  ctx.fillStyle = C.lime; ctx.font = font(30); ctx.fillText('CITY PULSE', 18 * u, 40 * u);
  // A heartbeat trace on the right of the header: decoration, not data.
  ctx.strokeStyle = C.lime; ctx.lineWidth = 3 * u; ctx.beginPath();
  const trace = [[300, 36], [340, 36], [352, 20], [364, 50], [376, 28], [386, 36], [494, 36]];
  trace.forEach(([x, y], i) => (i ? ctx.lineTo(x * u, y * u) : ctx.moveTo(x * u, y * u))); ctx.stroke();
  const ready = view?.hasData && view.activity;
  if (ready) {
    const a = view.activity, food = a.categories.find((c) => c.key === 'food')?.total ?? 0, leisure = a.categories.find((c) => c.key === 'leisure')?.total ?? 0;
    const tiles = [['FOOD ITEMS', food, C.lime], ['LEISURE ITEMS', leisure, C.purple], ['ROOTS VISITS', view.roots.totalVisits, C.gold]];
    tiles.forEach(([label, value, color], i) => {
      const x = (18 + i * 162) * u, y = 76 * u, tw = 150 * u, th = 92 * u;
      ctx.fillStyle = C.panel; ctx.fillRect(x, y, tw, th); ctx.fillStyle = color; ctx.fillRect(x, y, 4 * u, th);
      ctx.fillStyle = C.dim; ctx.font = font(12, 600); ctx.fillText(label, x + 14 * u, y + 18 * u);
      ctx.fillStyle = C.ink; ctx.font = font(44); ctx.fillText(Number(value).toLocaleString('en-US'), x + 14 * u, y + 58 * u);
    });
    ctx.fillStyle = C.dim; ctx.font = font(13, 500); ctx.fillText(`${view.rangeLabel.toUpperCase()} · ${view.source === 'live' ? 'LIVE CITY' : 'PREVIEW SERVICE'}`, 18 * u, 186 * u);
    ctx.fillStyle = view.demand.empty ? C.lime : C.gold; ctx.font = font(18, 600);
    ctx.fillText(view.demand.empty ? 'REQUESTS FULFILLED' : `UNMET DEMAND · ${view.demand.categories.map((c) => c.label.toUpperCase()).slice(0, 3).join(' · ')}`, 18 * u, 214 * u);
  } else {
    ctx.fillStyle = C.ink; ctx.font = font(26); ctx.fillText('WHAT THE CITY IS DOING', 18 * u, 100 * u);
    ctx.fillStyle = C.dim; ctx.font = font(17, 500);
    ctx.fillText("Residents' purchases, Roots Lounge visits", 18 * u, 136 * u);
    ctx.fillText('and the things they could not find.', 18 * u, 160 * u);
    ctx.fillStyle = C.lime; ctx.font = font(18, 600); ctx.fillText(view?.status === 'unavailable' ? 'CITY FIGURES UNAVAILABLE · TRY AGAIN SOON' : view?.status === 'not-connected' ? 'NOT CONNECTED IN THIS BUILD' : 'WALK UP TO VIEW', 18 * u, 204 * u);
  }
  ctx.fillStyle = C.dim; ctx.font = font(11, 500); ctx.fillText('SIMULATED CITY ECONOMY · NOT ON-CHAIN $NERDIE', 18 * u, h - 14 * u);
}

const boardKey = (view) => (view?.hasData ? `${view.source}|${view.fromDay}|${view.toDay}|${view.activity.totalItems}|${view.roots.totalVisits}|${view.demand.categories.map((c) => c.key + c.missed).join()}` : `none|${view?.status || 'idle'}`);

export class CityPulseBoardDisplay {
  // placement: { x, y, z, width, height, facing: {x, z} } (roots-lounge-layout.js). mobile halves the texture.
  constructor(placement, { mobile = false, document: doc = globalThis.document } = {}) {
    const w = mobile ? 512 : 768, h = Math.round(w * 240 / 512);
    this.canvas = doc.createElement('canvas'); this.canvas.width = w; this.canvas.height = h; this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas); this.texture.colorSpace = THREE.SRGBColorSpace; this.texture.generateMipmaps = false; this.texture.minFilter = THREE.LinearFilter;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(placement.width, placement.width * h / w), new THREE.MeshBasicMaterial({ map: this.texture, toneMapped: false }));
    this.mesh.name = 'roots-city-pulse-board'; this.mesh.position.set(placement.x, placement.y, placement.z); this.mesh.rotation.y = Math.atan2(placement.facing.x, placement.facing.z);
    this.key = null; this.draws = 0; this.update(null);
  }
  update(view) {
    const key = boardKey(view); if (key === this.key) return false;
    this.key = key; drawCityPulseBoard(this.ctx, view, this.canvas.width, this.canvas.height); this.texture.needsUpdate = true; this.draws++; return true;
  }
}
