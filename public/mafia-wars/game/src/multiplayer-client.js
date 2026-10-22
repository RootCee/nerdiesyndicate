import { MULTIPLAYER_LIMITS, PROTOCOL_VERSION } from './multiplayer-protocol.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const wsUrl = (base, room, ticket) => `${base.replace(/^http/, 'ws').replace(/\/$/, '')}/rooms/${encodeURIComponent(room)}/ws?ticket=${encodeURIComponent(ticket)}&v=${PROTOCOL_VERSION}`;
const rounded = (value) => Math.round(value * 1000) / 1000;

export class MultiplayerClient extends EventTarget {
  constructor({ serviceUrl, name = 'Guest' }) {
    super(); this.serviceUrl = serviceUrl.replace(/\/$/, ''); this.name = name.slice(0, 16) || 'Guest';
    this.state = 'disconnected'; this.seq = 0; this.socket = null; this.credentials = null;
    this.reconnectAttempts = 0; this.closedByUser = false; this.connectedAt = 0; this.lastMovement = null; this.lastMovementAt = 0;
    this.metrics = { rtt: 0, rttJitter: 0, sent: 0, received: 0, sentBytes: 0, receivedBytes: 0, movementSkipped: 0, rejected: 0, corrections: 0 };
  }
  setState(state, detail = {}) { this.state = state; this.dispatchEvent(new CustomEvent('state', { detail: { state, ...detail } })); }
  async createRoom() { return this.#request('/rooms', { method: 'POST', body: JSON.stringify({ name: this.name }) }); }
  async matchmake() { return this.#request('/matchmake', { method: 'POST', body: JSON.stringify({ name: this.name }) }); }
  async joinRoom(room) { return this.#request(`/rooms/${encodeURIComponent(room)}/join`, { method: 'POST', body: JSON.stringify({ name: this.name }) }); }
  async #request(path, options) {
    let response;
    try {
      response = await fetch(this.serviceUrl + path, { ...options, headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(10000) });
    } catch {
      throw Object.assign(new Error('Multiplayer service unavailable. Check your connection and try again.'), { code: 'service_unavailable' });
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(body.error || `HTTP ${response.status}`), { code: body.code || 'request_failed' });
    return body;
  }
  async connect(credentials) {
    this.credentials = credentials; this.closedByUser = false; this.setState('connecting');
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(wsUrl(this.serviceUrl, credentials.roomCode, credentials.ticket));
      this.socket = socket; let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true; socket.close(); this.setState('connection-lost'); reject(new Error('Connection timed out. Please try again.'));
      }, 10000);
      socket.addEventListener('open', () => { if (settled) return; clearTimeout(timeout); this.reconnectAttempts = 0; this.connectedAt ||= performance.now(); this.setState('connected', credentials); settled = true; resolve(credentials); });
      socket.addEventListener('message', (event) => { this.metrics.received++; this.metrics.receivedBytes += typeof event.data === 'string' ? event.data.length : event.data?.byteLength || 0; this.#message(event.data); });
      socket.addEventListener('error', () => { if (!settled) { clearTimeout(timeout); settled = true; this.setState('connection-lost'); reject(new Error('WebSocket connection failed. Please try again.')); } });
      socket.addEventListener('close', (event) => { if (this.socket !== socket) return; this.socket = null; if (!this.closedByUser) this.#reconnect(event.code); else this.setState('disconnected'); });
    });
  }
  #message(raw) {
    let message; try { message = JSON.parse(raw); } catch { return; }
    if (message.type === 'ping') { this.send({ type: 'pong', nonce: message.nonce }); return; }
    if (message.type === 'pong') {
      const sample = Math.max(0, performance.now() - message.sentAt), previous = this.metrics.rtt;
      this.metrics.rtt = previous ? previous * 0.8 + sample * 0.2 : sample;
      this.metrics.rttJitter = previous ? this.metrics.rttJitter * 0.8 + Math.abs(sample - previous) * 0.2 : 0;
      return;
    }
    if (message.type === 'reject') this.metrics.rejected++;
    if (message.type === 'correction') this.metrics.corrections++;
    this.dispatchEvent(new CustomEvent('message', { detail: message }));
  }
  async #reconnect(code) {
    if (!this.credentials || this.closedByUser) return;
    if (code === 4004) { this.setState('session-expired'); return; }
    if (code === 4003) { this.setState('room-full'); return; }
    this.setState('reconnecting');
    while (!this.closedByUser && this.reconnectAttempts < 5) {
      await wait(Math.min(6000, 500 * 2 ** this.reconnectAttempts++));
      try { await this.connect(this.credentials); return; } catch {}
    }
    if (!this.closedByUser) this.setState('connection-lost');
  }
  send(message) {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    const raw = JSON.stringify({ v: PROTOCOL_VERSION, ...message });
    if (new TextEncoder().encode(raw).byteLength > MULTIPLAYER_LIMITS.maxPayloadBytes) return false;
    this.socket.send(raw); this.metrics.sent++; this.metrics.sentBytes += raw.length; return true;
  }
  sendMovement(player, now = performance.now()) {
    const movement = { x: rounded(player.pos.x), y: rounded(player.pos.y), z: rounded(player.pos.z), yaw: rounded(player.yaw), speed: rounded(player.planar), state: player.sprinting ? 'run' : player.planar > 0.25 ? 'walk' : 'idle' };
    const prior = this.lastMovement, changed = !prior || movement.state !== prior.state || Math.abs(movement.x - prior.x) > 0.002 || Math.abs(movement.y - prior.y) > 0.002 || Math.abs(movement.z - prior.z) > 0.002 || Math.abs(movement.yaw - prior.yaw) > 0.002;
    if (!changed && movement.state === 'idle' && now - this.lastMovementAt < MULTIPLAYER_LIMITS.idleUpdateMs) { this.metrics.movementSkipped++; return false; }
    const sent = this.send({ type: 'move', seq: ++this.seq, clientTime: Math.round(now), ...movement });
    if (sent) { this.lastMovement = movement; this.lastMovementAt = now; }
    return sent;
  }
  ping() { const sentAt = performance.now(); this.send({ type: 'ping', nonce: Math.random().toString(36).slice(2), sentAt }); }
  diagnostics(now = performance.now()) {
    const seconds = Math.max(1, (now - this.connectedAt) / 1000);
    return { ...this.metrics, sentPerSecond: this.metrics.sent / seconds, receivedPerSecond: this.metrics.received / seconds, sentBytesPerSecond: this.metrics.sentBytes / seconds, receivedBytesPerSecond: this.metrics.receivedBytes / seconds };
  }
  close() { this.closedByUser = true; this.socket?.close(1000, 'client exit'); this.socket = null; this.setState('disconnected'); }
}
