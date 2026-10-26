// M6.6 full-screen north-up city map. Plain DOM + 2D canvas over the running
// game (no second render loop, no Three.js): drawn only while open, at most
// ~15 times a second. Waypoints stay on this device; nothing here talks to
// the multiplayer service.
import { createMapView, drawMapRects, formatDistance, mapDotVisible } from './city-map-view.js';
import { DISTRICT_NAMES, STREET_NAMES } from './city-pois.js';
import { snapToStreet } from './city-navigation.js';

const KIND_STYLE = Object.freeze({
  bank: { color: '#f2d28b', glyph: 'B', label: 'Bank' },
  arena: { color: '#ff6b5a', glyph: 'U', label: 'Arena' },
  apartment: { color: '#d6a35a', glyph: 'A', label: 'Apartments' },
  house: { color: '#e8e1d2', glyph: 'H', label: 'House' },
  business: { color: '#9aa6b2', glyph: 'S', label: 'Business' },
  civic: { color: '#b693f0', glyph: 'C', label: 'City Hall' },
  park: { color: '#6cc79a', glyph: 'P', label: 'Park' },
  shop: { color: '#b98cff', glyph: 'G', label: 'Gun & Ammo' },
});
const STATUS_LABEL = Object.freeze({ open: 'OPEN', wallet: 'WALLET ONLY', 'coming-soon': 'COMING SOON' });
const ROUTE_FAILURE = Object.freeze({
  indoors: 'You are inside. Leave the building to plan a route.',
  'off-street': 'No route from here yet. Walk out to a street, then try again.',
  'start-blocked': 'No route from your position. Move to a street and try again.',
  'no-street-near-start': 'No street near you. Head to a road, then try again.',
  'no-street-near-destination': 'No walkable approach to that spot. Pick a street or a marked place.',
  'destination-blocked': 'That spot is inside a building. Pick a street or a marked place.',
  'no-connected-route': 'No connected route there. Pick another place.',
});
export const routeFailureText = (reason) => ROUTE_FAILURE[reason] || 'No route available.';

export function createCityMap({ root, rects, bounds, plan, pois, getGraph, arena, lowMemory = false, onSetWaypoint, onClearWaypoint, onClose, planRoute }) {
  const $ = (id) => root.querySelector(`#${id}`);
  const canvas = $('cityMapCanvas'), g = canvas.getContext('2d');
  const card = $('cityMapCard'), notice = $('cityMapNotice'), places = $('cityMapPlaces');
  const view = createMapView({ bounds, maxScale: 7 });
  const arenaView = createMapView({ bounds: arena.bounds, maxScale: 14 });
  let base = null, state = null, selected = null, selectedRoute = null, open = false, dirty = true, lastDraw = 0, dpr = 1;
  const pointers = new Map(); let gesture = null;

  // Baked lazily on first open: ~2 px/m on low-memory phones, 3 px/m otherwise.
  function bakeBase() {
    const S = lowMemory ? 2 : 3, c = document.createElement('canvas');
    c.width = Math.ceil((bounds.maxX - bounds.minX) * S); c.height = Math.ceil((bounds.maxZ - bounds.minZ) * S);
    drawMapRects(c.getContext('2d'), rects, bounds, S);
    base = { canvas: c, S };
  }

  function resize() {
    dpr = Math.min(lowMemory ? 1.5 : 2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    view.resize(w, h); arenaView.resize(w, h); dirty = true;
  }

  const activeView = () => (state?.mode === 'arena' ? arenaView : view);

  function say(text = '') { notice.textContent = text; notice.hidden = !text; }

  function select(target) {
    selected = target; selectedRoute = null;
    if (!target) { card.hidden = true; dirty = true; return; }
    if (state?.mode === 'city' && state.player) selectedRoute = state.indoors ? { ok: false, reason: 'indoors' } : planRoute(target);
    const style = KIND_STYLE[target.kind];
    $('cityMapCardName').textContent = target.name;
    const status = target.kind === 'pin' ? 'STREET LOCATION' : `${(target.category || style?.label || '').toUpperCase()} · ${STATUS_LABEL[target.status] || ''}`;
    const distance = selectedRoute?.ok ? `${formatDistance(selectedRoute.distance)} WALK` : state?.indoors ? 'ROUTE PAUSED INDOORS' : 'NO ROUTE';
    $('cityMapCardMeta').textContent = `${status} · ${distance}`;
    $('cityMapCardInfo').textContent = target.description || 'A point on the street.';
    const route = $('cityMapRoute');
    route.disabled = !selectedRoute?.ok;
    route.textContent = selectedRoute?.ok ? 'SET WAYPOINT' : 'ROUTE UNAVAILABLE';
    say(selectedRoute && !selectedRoute.ok ? routeFailureText(selectedRoute.reason) : '');
    card.hidden = false; dirty = true;
  }

  function hitPoi(sx, sy) {
    let best = null, bestDistance = 24;
    for (const poi of pois) { const p = view.toScreen(poi.x, poi.z), d = Math.hypot(p.x - sx, p.y - sy); if (d < bestDistance) { best = poi; bestDistance = d; } }
    return best;
  }

  function tap(sx, sy) {
    if (state?.mode !== 'city') { say('Waypoints are unavailable in the Underground. The map shows the arena and your team only.'); return; }
    const poi = hitPoi(sx, sy);
    if (poi) { select(poi); return; }
    const world = view.toWorld(sx, sy), snapped = snapToStreet(getGraph(), world);
    if (!snapped) { select(null); say('No street there. Tap a street or a marked place.'); return; }
    select({ id: 'pin', kind: 'pin', name: 'Dropped pin', x: snapped.x, z: snapped.z, entry: snapped, approach: [], description: 'Waypoint on the nearest street.' });
  }

  // ---- input: mouse drag / wheel, touch pan / pinch, tap to select --------
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    gesture = { startX: e.offsetX, startY: e.offsetY, at: performance.now(), moved: 0, multi: pointers.size > 1 };
  });
  canvas.addEventListener('pointermove', (e) => {
    const prev = pointers.get(e.pointerId); if (!prev) return;
    const next = { x: e.offsetX, y: e.offsetY }, v = activeView();
    if (pointers.size === 1) { v.panBy(next.x - prev.x, next.y - prev.y); if (gesture) gesture.moved += Math.hypot(next.x - prev.x, next.y - prev.y); }
    else if (pointers.size === 2) {
      const [a, b] = [...pointers.entries()].map(([id, p]) => (id === e.pointerId ? next : p));
      const [pa, pb] = [...pointers.values()];
      const before = Math.hypot(pa.x - pb.x, pa.y - pb.y) || 1, after = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, midBefore = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
      v.panBy(mid.x - midBefore.x, mid.y - midBefore.y); v.zoomAt(after / before, mid.x, mid.y);
      if (gesture) { gesture.multi = true; gesture.moved += 99; }
    }
    pointers.set(e.pointerId, next); dirty = true;
  });
  const release = (e) => {
    if (!pointers.delete(e.pointerId)) return;
    if (gesture && !gesture.multi && pointers.size === 0 && gesture.moved < 8 && performance.now() - gesture.at < 700) tap(e.offsetX, e.offsetY);
    if (pointers.size === 0) gesture = null;
  };
  canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); activeView().zoomAt(Math.exp(-e.deltaY * 0.0015), e.offsetX, e.offsetY); dirty = true; }, { passive: false });
  root.addEventListener('keydown', (e) => {
    const v = activeView(), step = 60;
    if (e.key === '+' || e.key === '=') v.zoomAt(1.25); else if (e.key === '-') v.zoomAt(0.8);
    else if (e.key === 'ArrowLeft') v.panBy(step, 0); else if (e.key === 'ArrowRight') v.panBy(-step, 0);
    else if (e.key === 'ArrowUp') v.panBy(0, step); else if (e.key === 'ArrowDown') v.panBy(0, -step);
    else return;
    e.preventDefault(); dirty = true;
  });
  $('cityMapZoomIn').addEventListener('click', () => { activeView().zoomAt(1.4); dirty = true; });
  $('cityMapZoomOut').addEventListener('click', () => { activeView().zoomAt(1 / 1.4); dirty = true; });
  $('cityMapCenter').addEventListener('click', () => { if (state?.player) activeView().centerOn(state.player.x, state.player.z, Math.max(activeView().scale, 2.4)); dirty = true; });
  $('cityMapClose').addEventListener('click', () => onClose());
  $('cityMapRoute').addEventListener('click', () => { if (selected && selectedRoute?.ok) { onSetWaypoint(selected, selectedRoute); select(selected); } });
  $('cityMapClear').addEventListener('click', () => { onClearWaypoint(); dirty = true; });
  addEventListener('resize', () => { if (open) resize(); });

  // Quick list of places (handy on a phone): select and centre.
  const order = ['bank', 'civic', 'park', 'shop', 'arena', 'apartment', 'house', 'business'];
  for (const poi of [...pois].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))) {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = poi.name; button.dataset.poi = poi.id;
    button.style.setProperty('--dot', KIND_STYLE[poi.kind].color);
    button.addEventListener('click', () => { if (state?.mode !== 'city') return; view.centerOn(poi.x, poi.z, Math.max(view.scale, 2.2)); select(poi); });
    places.appendChild(button);
  }

  // ---- drawing --------------------------------------------------------------
  function label(text, x, y, { size = 12, color = '#f4efe5', angle = 0, weight = 600 } = {}) {
    g.save(); g.translate(x, y); if (angle) g.rotate(angle);
    g.font = `${weight} ${size}px Barlow, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(text, 0, 0); g.fillStyle = color; g.fillText(text, 0, 0); g.restore();
  }
  function arrow(p, angle, color = '#ffffff', size = 9) {
    g.save(); g.translate(p.x, p.y); g.rotate(angle + Math.PI / 2);
    g.beginPath(); g.moveTo(0, -size); g.lineTo(size * 0.7, size * 0.75); g.lineTo(0, size * 0.35); g.lineTo(-size * 0.7, size * 0.75); g.closePath();
    g.fillStyle = color; g.strokeStyle = '#000'; g.lineWidth = 1.5; g.fill(); g.stroke(); g.restore();
  }
  function dots(v) {
    for (const d of state.dots || []) {
      if (!mapDotVisible(d, state.snitch)) continue;
      const p = v.toScreen(d.pos.x, d.pos.z);
      g.fillStyle = d.team === 'red' ? '#ff3b4a' : '#4aa8ff'; g.beginPath(); g.arc(p.x, p.y, 5, 0, 6.3); g.fill();
      g.strokeStyle = '#000'; g.lineWidth = 1.5; g.stroke();
    }
  }

  function drawCity() {
    const v = view, k = v.scale / base.S, o = v.toScreen(bounds.minX, bounds.minZ);
    g.setTransform(-k * dpr, 0, 0, -k * dpr, o.x * dpr, o.y * dpr); g.imageSmoothingEnabled = k < 1.5;
    g.drawImage(base.canvas, 0, 0);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // District names at overview zoom, street names once zoomed in a little.
    if (v.scale < 2.2) for (const district of plan.districts) {
      const name = DISTRICT_NAMES[district.id]; if (!name) continue;
      const p = v.toScreen(district.center.x, district.center.z); label(name.toUpperCase(), p.x, p.y, { size: 13, color: '#f2d28b', weight: 700 });
    }
    { const p = v.toScreen(0, 0); if (v.scale < 2.2) label('THE ORIGINAL BLOCK', p.x, p.y - 18, { size: 13, color: '#f2d28b', weight: 700 }); }
    if (v.scale >= 1.4) for (const road of plan.roads) {
      const name = STREET_NAMES[road.id]; if (!name) continue;
      const vertical = road.depth > road.width, length = vertical ? road.depth : road.width, spacing = v.scale > 3 ? 70 : 140;
      for (let t = -length / 2 + spacing / 2; t < length / 2; t += spacing) {
        const p = vertical ? v.toScreen(road.x, road.z + t) : v.toScreen(road.x + t, road.z);
        if (p.x < -60 || p.y < -60 || p.x > v.width + 60 || p.y > v.height + 60) continue;
        label(name, p.x, p.y, { size: 11, angle: vertical ? -Math.PI / 2 : 0 });
      }
    }
    // Route and destination.
    const route = state.route;
    if (route?.points?.length > 1 && !state.indoors) {
      g.lineJoin = 'round'; g.lineCap = 'round';
      for (const [width, color] of [[7, 'rgba(0,0,0,.6)'], [4, '#f2d28b']]) {
        g.beginPath(); route.points.forEach((pt, i) => { const p = v.toScreen(pt.x, pt.z); if (i) g.lineTo(p.x, p.y); else g.moveTo(p.x, p.y); });
        g.lineWidth = width; g.strokeStyle = color; g.stroke();
      }
    }
    if (state.waypoint) { const p = v.toScreen(state.waypoint.entry.x, state.waypoint.entry.z); pin(p, '#f2d28b'); }
    if (selected && selected !== state.waypoint) { const p = v.toScreen(selected.entry.x, selected.entry.z); pin(p, '#ffffff'); }
    // Places.
    for (const poi of pois) {
      const p = v.toScreen(poi.x, poi.z), style = KIND_STYLE[poi.kind], r = selected?.id === poi.id ? 13 : 10;
      g.globalAlpha = poi.status === 'coming-soon' ? 0.8 : 1;
      g.beginPath(); g.arc(p.x, p.y, r, 0, 6.3); g.fillStyle = '#10141a'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = style.color; g.stroke();
      label(style.glyph, p.x, p.y + 0.5, { size: 11, color: style.color, weight: 800 });
      g.globalAlpha = 1;
      if (v.scale >= 2.2 || selected?.id === poi.id) label(poi.status === 'coming-soon' ? `${poi.name} · soon` : poi.name, p.x, p.y + r + 10, { size: 11 });
    }
    dots(v);
  }

  function pin(p, color) {
    g.beginPath(); g.moveTo(p.x, p.y); g.arc(p.x, p.y - 14, 7, Math.PI * 0.8, Math.PI * 2.2); g.closePath();
    g.fillStyle = color; g.strokeStyle = '#000'; g.lineWidth = 1.5; g.fill(); g.stroke();
    g.beginPath(); g.arc(p.x, p.y - 14, 2.6, 0, 6.3); g.fillStyle = '#10141a'; g.fill();
  }

  function drawArena() {
    const v = arenaView;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#1b1d20'; g.fillRect(0, 0, v.width, v.height);
    const a = v.toScreen(arena.bounds.minX, arena.bounds.minZ), b = v.toScreen(arena.bounds.maxX, arena.bounds.maxZ);
    g.fillStyle = '#39482c'; g.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    for (const house of arena.houses) {
      const p = v.toScreen(house.minX, house.minZ), q = v.toScreen(house.maxX, house.maxZ);
      g.fillStyle = '#d8d2c5'; g.fillRect(Math.min(p.x, q.x), Math.min(p.y, q.y), Math.abs(q.x - p.x), Math.abs(q.y - p.y));
    }
    for (const [team, color] of [['blue', '#4aa8ff'], ['red', '#ff3b4a']]) for (const s of arena.spawns[team]) {
      const p = v.toScreen(s.x, s.z); g.fillStyle = color; g.globalAlpha = 0.35; g.fillRect(p.x - 6, p.y - 6, 12, 12); g.globalAlpha = 1;
    }
    { const p = v.toScreen(arena.exit.x, arena.exit.z); label('EXIT', p.x, p.y, { size: 12, color: '#f2d28b', weight: 800 }); }
    dots(v);
  }

  function draw(now) {
    if (!open || !state) return;
    if (!dirty && now - lastDraw < 66) return;
    lastDraw = now; dirty = false;
    if (state.mode === 'city' && !base) bakeBase();
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height);
    if (state.mode === 'arena') drawArena(); else drawCity();
    const v = activeView();
    if (state.player) arrow(v.toScreen(state.player.x, state.player.z), v.headingAngle(state.player.yaw));
    $('cityMapClear').hidden = !state.waypoint;
  }

  return {
    get isOpen() { return open; },
    open(next) {
      state = next; open = true; root.hidden = false; resize();
      $('cityMapMode').textContent = next.mode === 'arena' ? 'THE UNDERGROUND · TEAM VIEW' : next.indoors ? `INSIDE · ROUTE PAUSED` : 'NORTH UP';
      places.hidden = next.mode !== 'city';
      if (next.player) (next.mode === 'arena' ? arenaView.fit() : view.centerOn(next.player.x, next.player.z, Math.max(view.minScale, 1.6)));
      say(next.mode === 'arena' ? 'Waypoints are unavailable in the Underground. The map shows the arena and your team only.' : '');
      select(next.mode === 'city' && next.waypoint ? next.waypoint : null);
      root.focus?.({ preventScroll: true }); dirty = true;
    },
    close() { open = false; root.hidden = true; pointers.clear(); gesture = null; select(null); say(''); },
    frame(next, now = performance.now()) { if (!open) return; state = next; draw(now); },
    refresh() { dirty = true; if (selected) select(selected); },
    view, arenaView,
  };
}
