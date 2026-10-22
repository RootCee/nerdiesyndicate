import { MULTIPLAYER_LIMITS, PROTOCOL_VERSION } from './multiplayer-protocol.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const wsUrl = (base, room, ticket) => `${base.replace(/^http/, 'ws').replace(/\/$/, '')}/rooms/${encodeURIComponent(room)}/ws?ticket=${encodeURIComponent(ticket)}`;

export class MultiplayerClient extends EventTarget {
  constructor({ serviceUrl, name = 'Guest' }) {
    super(); this.serviceUrl = serviceUrl.replace(/\/$/, ''); this.name = name.slice(0, 16) || 'Guest';
    this.state = 'disconnected'; this.seq = 0; this.socket = null; this.credentials = null;
    this.reconnectAttempts = 0; this.closedByUser = false; this.metrics = { rtt: 0, sent: 0, received: 0, rejected: 0, corrections: 0 };
  }
  setState(state, detail = {}) { this.state = state; this.dispatchEvent(new CustomEvent('state', { detail: { state, ...detail } })); }
  async createRoom() { return this.#request('/rooms', { method: 'POST', body: JSON.stringify({ name: this.name }) }); }
  async matchmake() { return this.#request('/matchmake', { method: 'POST', body: JSON.stringify({ name: this.name }) }); }
  async joinRoom(room) { return this.#request(`/rooms/${encodeURIComponent(room)}/join`, { method: 'POST', body: JSON.stringify({ name: this.name }) }); }
  async #request(path, options) {
    const response = await fetch(this.serviceUrl + path, { ...options, headers: { 'content-type': 'application/json' } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(body.error || `HTTP ${response.status}`), { code: body.code || 'request_failed' });
    return body;
  }
  async connect(credentials) {
    this.credentials = credentials; this.closedByUser = false; this.setState('connecting');
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(wsUrl(this.serviceUrl, credentials.roomCode, credentials.ticket));
      this.socket = socket; let settled = false;
      socket.addEventListener('open', () => { this.reconnectAttempts = 0; this.setState('connected', credentials); settled = true; resolve(credentials); });
      socket.addEventListener('message', (event) => { this.metrics.received++; this.#message(event.data); });
      socket.addEventListener('error', () => { if (!settled) reject(new Error('WebSocket connection failed')); });
      socket.addEventListener('close', (event) => { if (this.socket !== socket) return; this.socket = null; if (!this.closedByUser) this.#reconnect(event.code); else this.setState('disconnected'); });
    });
  }
  #message(raw) {
    let message; try { message = JSON.parse(raw); } catch { return; }
    if (message.type === 'ping') { this.send({ type: 'pong', nonce: message.nonce }); return; }
    if (message.type === 'pong') { this.metrics.rtt = Math.max(0, performance.now() - message.sentAt); return; }
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
    this.socket.send(raw); this.metrics.sent++; return true;
  }
  sendMovement(player, now = performance.now()) {
    return this.send({ type: 'move', seq: ++this.seq, clientTime: Math.round(now), x: player.pos.x, y: player.pos.y, z: player.pos.z,
      yaw: player.yaw, speed: player.planar, state: player.sprinting ? 'run' : player.planar > 0.25 ? 'walk' : 'idle' });
  }
  ping() { const sentAt = performance.now(); this.send({ type: 'ping', nonce: Math.random().toString(36).slice(2), sentAt }); }
  close() { this.closedByUser = true; this.socket?.close(1000, 'client exit'); this.socket = null; this.setState('disconnected'); }
}
