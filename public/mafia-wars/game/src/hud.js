import * as THREE from '/mafia-wars/game/vendor/three/three.module.js';
import { mapRects, MAP } from './world.js';
const $ = (s) => document.querySelector(s);
const el = {};
export function initHud() {
  for (const id of ['fps', 'map', 'state', 'sRed', 'sBlue', 'timer', 'feed', 'callout', 'kill', 'pts', 'hit', 'hurt', 'labels', 'mag', 'res', 'kills', 'ab4', 'ab5', 'ab6', 'hud', 'wname', 'interactPrompt', 'tInteract', 'weaponTray']) el[id] = document.getElementById(id);
  el.map2d = el.map.getContext('2d');
  // bake the block map once: 4 px per metre on a 100x100 m canvas
  const W = MAP.maxX - MAP.minX, H = MAP.maxZ - MAP.minZ, S = Math.min(4, 512 / Math.max(W, H)); const off = document.createElement('canvas'); off.width = Math.ceil(W * S); off.height = Math.ceil(H * S); const g = off.getContext('2d');
  g.fillStyle = '#39482c'; g.fillRect(0, 0, off.width, off.height);
  const col = { road: '#2a2f38', alley: '#35383d', walk: '#737a80', house: '#d8d2c5', apartment: '#b88a4a', venue: '#d9ac58', garage: '#b3ada2', fence: '#8a9a88', tree: '#2c5a2e', pole: '#9a9a9a' };
  const order = ['road', 'alley', 'walk', 'fence', 'tree', 'garage', 'house', 'apartment', 'venue', 'pole'];
  for (const t of order) for (const r of mapRects) if (r.type === t) {
    g.fillStyle = col[t];
    if (t === 'tree') { g.beginPath(); g.arc((r.x + r.w / 2 - MAP.minX) * S, (r.z + r.h / 2 - MAP.minZ) * S, r.w / 2 * S, 0, 6.3); g.fill(); }
    else { g.fillRect((r.x - MAP.minX) * S, (r.z - MAP.minZ) * S, Math.max(1, r.w * S), Math.max(1, r.h * S)); if (t === 'house' || t === 'apartment' || t === 'venue') { g.strokeStyle = t === 'venue' ? '#ffe29a' : '#8c8578'; g.lineWidth = t === 'venue' ? 2 : 1; g.strokeRect((r.x - MAP.minX) * S, (r.z - MAP.minZ) * S, r.w * S, r.h * S); } }
  }
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
  hit(kill) { el.hit.classList.remove('on', 'kill'); void el.hit.offsetWidth; el.hit.classList.add('on'); if (kill) el.hit.classList.add('kill'); },
  hurt(k) { el.hurt.style.opacity = THREE.MathUtils.clamp(k, 0, 1); },
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
  minimap(player, dots, snitch) {
    const g = el.map2d, R = 150, S = el.S; g.clearRect(0, 0, 300, 300);
    g.save(); g.beginPath(); g.arc(R, R, R, 0, 6.3); g.clip();
    g.translate(R, R); g.rotate(player.yaw);
    const scale = 2.1; // zoom (canvas px per map px)
    g.scale(scale, scale); g.translate(-(player.pos.x - MAP.minX) * S, -(player.pos.z - MAP.minZ) * S);
    g.drawImage(el.off, 0, 0);
    for (const d of dots) {
      if (d.team === 'red' && !snitch && !d.spotted) continue;
      g.fillStyle = d.team === 'red' ? '#ff3b4a' : '#4aa8ff'; g.beginPath(); g.arc((d.pos.x - MAP.minX) * S, (d.pos.z - MAP.minZ) * S, 2.6, 0, 6.3); g.fill();
    }
    g.restore();
    // player arrow (always pointing up)
    g.save(); g.translate(R, R); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -8); g.lineTo(6, 6); g.lineTo(0, 3); g.lineTo(-6, 6); g.closePath(); g.fill(); g.restore();
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 2; g.beginPath(); g.arc(R, R, R - 1, 0, 6.3); g.stroke();
  },
};
