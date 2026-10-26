import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { mapRects, MAP } from './world.js';
import { drawMapRects, formatDistance, mapDotVisible } from './city-map-view.js';
const $ = (s) => document.querySelector(s);
const el = {};
export function initHud() {
  for (const id of ['fps', 'map', 'state', 'sRed', 'sBlue', 'timer', 'feed', 'callout', 'kill', 'pts', 'hit', 'hurt', 'labels', 'mag', 'res', 'kills', 'ab4', 'ab5', 'ab6', 'hud', 'wname', 'interactPrompt', 'tInteract', 'weaponTray', 'spawnProtection']) el[id] = document.getElementById(id);
  el.map2d = el.map.getContext('2d');
  // bake the block map once: 4 px per metre on a 100x100 m canvas
  const W = MAP.maxX - MAP.minX, H = MAP.maxZ - MAP.minZ, S = Math.min(4, 512 / Math.max(W, H)); const off = document.createElement('canvas'); off.width = Math.ceil(W * S); off.height = Math.ceil(H * S); const g = off.getContext('2d');
  drawMapRects(g, mapRects, MAP, S);
  el.off = off; el.S = S; el.W = W; el.H = H;
  el.hud.classList.add('on');
}
export const hud = {
  fps(v) { el.fps.textContent = 'FPS ' + v; },
  score(red, blue) { el.sRed.textContent = red; el.sBlue.textContent = blue; el.state.textContent = blue > red ? 'WINNING' : blue < red ? 'LOSING' : 'TIED'; },
  timer(s) { s = Math.max(0, Math.ceil(s)); el.timer.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; },
  ammo(mag, res, kills, name, id) {
    el.mag.textContent = mag; el.res.textContent = res; el.kills.textContent = kills + ' ☠'; if (name && el.wname.textContent !== name) el.wname.textContent = name;
    if (id && el.weaponTray) for (const button of el.weaponTray.querySelectorAll('[data-weapon]')) button.classList.toggle('selected', button.dataset.weapon === id);
  },
  feed(k, kt, v, vt) {
    const d = document.createElement('div'); d.innerHTML = `<span class="${kt === 'red' ? 'r' : 'k'}">${k}</span><span class="w">🔫</span><span class="${vt === 'red' ? 'r' : 'k'}">${v}</span>`;
    el.feed.appendChild(d); while (el.feed.children.length > 5) el.feed.firstChild.remove(); setTimeout(() => d.remove(), 6000);
  },
  callout(text, sub = '', icon = '') {
    el.callout.querySelector('.t').textContent = text; el.callout.querySelector('small').textContent = sub; el.callout.querySelector('.ico').innerHTML = icon;
    el.callout.classList.add('on'); clearTimeout(el.calloutT); el.calloutT = setTimeout(() => el.callout.classList.remove('on'), 2600);
  },
  prompt(text = '', interior = false, mobileLabel = '') {
    if (!el.interactPrompt) return;
    el.interactPrompt.textContent = text; el.interactPrompt.classList.toggle('on', !!text); el.interactPrompt.classList.toggle('interior', interior);
    if (el.tInteract) { el.tInteract.classList.toggle('on', !!text); el.tInteract.textContent = mobileLabel || (interior ? 'EXIT' : 'ENTER'); }
  },
  killText(t) { el.kill.textContent = t; el.kill.classList.add('on'); clearTimeout(el.killT); el.killT = setTimeout(() => el.kill.classList.remove('on'), 1800); },
  points(t = '+100') { el.pts.textContent = t; el.pts.classList.remove('on'); void el.pts.offsetWidth; el.pts.classList.add('on'); },
  hit(kill, head = false) { el.hit.classList.remove('on', 'kill', 'head'); void el.hit.offsetWidth; el.hit.classList.add('on'); if (head) el.hit.classList.add('head'); if (kill) el.hit.classList.add('kill'); },
  hurt(k) { el.hurt.style.opacity = THREE.MathUtils.clamp(k, 0, 1); },
  protection(seconds) {
    if (!el.spawnProtection) return;
    const active = seconds > 0;
    el.spawnProtection.classList.toggle('on', active);
    el.spawnProtection.textContent = active ? `SPAWN SHIELD ${seconds.toFixed(1)}s` : '';
  },
  ability(n, frac, ready) { const e = el['ab' + n]; e.querySelector('.fill').style.transform = `scaleY(${frac})`; e.classList.toggle('ready', ready); },
  labels(camera, items) {
    // items: {pos, name, team, dist}
    let i = 0; const kids = el.labels.children;
    const v = new THREE.Vector3();
    for (const it of items) {
      let d = kids[i]; if (!d) { d = document.createElement('div'); d.className = 'lab'; d.innerHTML = '<i></i><span></span>'; el.labels.appendChild(d); }
      v.copy(it.pos); v.project(camera);
      if (v.z > 1 || v.x < -1.1 || v.x > 1.1 || v.y < -1.1 || v.y > 1.1) { d.style.display = 'none'; i++; continue; }
      d.style.display = ''; d.style.left = ((v.x + 1) / 2 * innerWidth) + 'px'; d.style.top = ((1 - v.y) / 2 * innerHeight) + 'px';
      d.className = 'lab' + (it.team === 'red' ? ' red' : ''); d.lastChild.textContent = it.name ? `${it.name} · ${it.dist} m` : `${it.dist} m`; i++;
    }
    for (; i < kids.length; i++) kids[i].style.display = 'none';
  },
  // overlay (M6.6, city only): { pois, route, waypoint } drawn under the
  // player markers; markers use the shared mapDotVisible rule.
  minimap(player, dots, snitch, overlay = null) {
    const g = el.map2d, R = 150, S = el.S; g.clearRect(0, 0, 300, 300);
    g.save(); g.beginPath(); g.arc(R, R, R, 0, 6.3); g.clip();
    g.translate(R, R); g.rotate(player.yaw);
    const scale = 2.1; // zoom (canvas px per map px)
    g.scale(scale, scale); g.translate(-(player.pos.x - MAP.minX) * S, -(player.pos.z - MAP.minZ) * S);
    g.drawImage(el.off, 0, 0);
    const mx = (x) => (x - MAP.minX) * S, mz = (z) => (z - MAP.minZ) * S;
    if (overlay?.route?.points?.length > 1) {
      g.lineJoin = 'round'; g.lineCap = 'round';
      for (const [width, color] of [[4.5, 'rgba(0,0,0,.6)'], [2.6, '#f2d28b']]) {
        g.beginPath(); overlay.route.points.forEach((p, i) => (i ? g.lineTo(mx(p.x), mz(p.z)) : g.moveTo(mx(p.x), mz(p.z))));
        g.lineWidth = width / scale; g.strokeStyle = color; g.stroke();
      }
    }
    for (const poi of overlay?.pois || []) {
      g.fillStyle = poi.kind === 'bank' ? '#f2d28b' : poi.kind === 'arena' ? '#ff6b5a' : poi.kind === 'business' ? '#9aa6b2' : '#e8e1d2';
      g.beginPath(); g.arc(mx(poi.x), mz(poi.z), 3.4 / scale, 0, 6.3); g.fill(); g.lineWidth = 1 / scale; g.strokeStyle = '#000'; g.stroke();
    }
    for (const d of dots) {
      if (!mapDotVisible(d, snitch)) continue;
      g.fillStyle = d.team === 'red' ? '#ff3b4a' : '#4aa8ff'; g.beginPath(); g.arc(mx(d.pos.x), mz(d.pos.z), 2.6, 0, 6.3); g.fill();
    }
    g.restore();
    // Waypoint: a pin inside the minimap, or an arrow on its rim pointing to it.
    if (overlay?.waypoint) {
      const dx = (overlay.waypoint.entry.x - player.pos.x) * S * scale, dz = (overlay.waypoint.entry.z - player.pos.z) * S * scale;
      const c = Math.cos(player.yaw), s = Math.sin(player.yaw), sx = dx * c - dz * s, sy = dx * s + dz * c, d = Math.hypot(sx, sy) || 1;
      g.save(); g.translate(R, R);
      if (d < R - 16) { g.fillStyle = '#f2d28b'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.arc(sx, sy, 7, 0, 6.3); g.fill(); g.stroke(); }
      else { g.translate((sx / d) * (R - 14), (sy / d) * (R - 14)); g.rotate(Math.atan2(sy, sx) + Math.PI / 2); g.fillStyle = '#f2d28b'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -11); g.lineTo(9, 7); g.lineTo(-9, 7); g.closePath(); g.fill(); g.stroke(); }
      g.restore();
    }
    // player arrow (always pointing up)
    g.save(); g.translate(R, R); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -8); g.lineTo(6, 6); g.lineTo(0, 3); g.lineTo(-6, 6); g.closePath(); g.fill(); g.restore();
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 2; g.beginPath(); g.arc(R, R, R - 1, 0, 6.3); g.stroke();
  },
  // Distance / direction chip: info = { name, distance, bearing, note } or null.
  waypoint(info) {
    const chip = el.waypointChip ||= document.getElementById('waypointChip'); if (!chip) return;
    chip.hidden = !info; if (!info) return;
    chip.querySelector('.name').textContent = info.name;
    chip.querySelector('.dist').textContent = info.note || formatDistance(info.distance);
    chip.querySelector('.arrow').style.transform = `rotate(${info.bearing ?? 0}rad)`;
    chip.classList.toggle('note', !!info.note);
  },
};
