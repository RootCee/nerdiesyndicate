import { MULTIPLAYER_LIMITS, PROTOCOL_VERSION } from './multiplayer-protocol.js';
import { normalizeAvatarAppearance } from './avatar-schema.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// npc=1 opts in to M6.7 city residents; older clients never receive them.
const wsUrl = (base, room, ticket, npc = false) => `${base.replace(/^http/, 'ws').replace(/\/$/, '')}/rooms/${encodeURIComponent(room)}/ws?ticket=${encodeURIComponent(ticket)}&v=${PROTOCOL_VERSION}${npc ? '&npc=1' : ''}`;
const rounded = (value) => Math.round(value * 1000) / 1000;
// RC1 hotfix 1c: reconnection. Bounded exponential backoff with jitter (0.5 s doubling to a 15 s ceiling, ±25 %),
// for as long as the game runs; resume the same session within the room's grace period, rejoin after it.
export const RECONNECT_RULES = Object.freeze({ baseMs: 500, maxMs: 15_000, jitter: 0.25, attemptTimeoutMs: 8_000, idleCheckMs: 1_000,
  resumeWindowMs: MULTIPLAYER_LIMITS.reconnectGraceMs - 3_000, resumeFailuresBeforeRejoin: 2, aliveCheckMs: 4_000 });
export function reconnectDelay(attempt, random = Math.random, rules = RECONNECT_RULES) {
  const base = Math.min(rules.maxMs, rules.baseMs * 2 ** Math.max(0, Math.min(20, attempt)));
  return Math.round(base * (1 - rules.jitter + 2 * rules.jitter * random()));
}

export class MultiplayerClient extends EventTarget {
  constructor({ serviceUrl, name = 'Guest', appearance, npc = false }) {
    super(); this.npc = npc === true; this.serviceUrl = serviceUrl.replace(/\/$/, ''); this.name = name.slice(0, 16) || 'Guest';
    this.appearance = normalizeAvatarAppearance(appearance); this.state = 'disconnected'; this.seq = 0; this.appearanceSeq = 0; this.equipmentSeq = 0; this.combatSeq = 0; this.spaceSeq = 0; this.economySeq = 0; this.socket = null; this.credentials = null;
    this.reconnectAttempts = 0; this.closedByUser = false; this.connectedAt = 0; this.lastMovement = null; this.lastMovementAt = 0;
    this.reconnectRules = RECONNECT_RULES; this.random = Math.random; this.attemptId = 0; this.reconnectCycle = 0; this.reconnecting = false; this.joinMode = null; this.lastReceivedAt = 0;
    this.#watchLifecycle();
    this.metrics = { rtt: 0, rttJitter: 0, sent: 0, received: 0, sentBytes: 0, receivedBytes: 0, movementSkipped: 0, rejected: 0, corrections: 0 };
  }
  setState(state, detail = {}) { this.state = state; this.dispatchEvent(new CustomEvent('state', { detail: { state, ...detail } })); }
  #joinBody() { return JSON.stringify({ name: this.name, appearance: this.appearance }); }
  // The kind of room joined is remembered so a reconnection after the session ended can rejoin the same kind.
  async createRoom() { const r = await this.#request('/rooms', { method: 'POST', body: this.#joinBody() }); this.joinMode = { kind: 'room', roomCode: r.roomCode }; return r; }
  async matchmake() { const r = await this.#request('/matchmake', { method: 'POST', body: this.#joinBody() }); this.joinMode = { kind: 'public' }; return r; }
  async joinRoom(room) { const r = await this.#request(`/rooms/${encodeURIComponent(room)}/join`, { method: 'POST', body: this.#joinBody() }); this.joinMode = { kind: 'room', roomCode: room }; return r; }
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
  // First join (the Public City / room buttons): a failure is reported to the caller, who offers a retry.
  async connect(credentials) {
    this.closedByUser = false; this.#cancelReconnect(); this.joinMode ||= { kind: 'room', roomCode: credentials.roomCode };
    this.setState('connecting');
    try { return await this.#open(credentials); } catch (error) { if (!this.closedByUser) this.setState('connection-lost'); throw error; }
  }
  // One WebSocket attempt. Resolves once open (and this attempt is still the current one); rejects on error or
  // timeout without touching the session, so the caller decides what happens next. RC1 hotfix 1c: before, a failed
  // attempt marked the session closed by the user, which ended every later retry after one failure.
  #open(credentials, detail = {}) {
    const attemptId = ++this.attemptId;
    return new Promise((resolve, reject) => {
      let socket;
      try { socket = new WebSocket(wsUrl(this.serviceUrl, credentials.roomCode, credentials.ticket, this.npc)); }
      catch { reject(new Error('WebSocket is unavailable in this browser. Please reload and try again.')); return; }
      let settled = false;
      const fail = (message) => { if (settled) return; settled = true; clearTimeout(timeout); try { socket.close(); } catch {} reject(new Error(message)); };
      const timeout = setTimeout(() => fail('Connection timed out. Please try again.'), this.reconnectRules.attemptTimeoutMs);
      socket.addEventListener('open', () => {
        if (settled) return;
        if (attemptId !== this.attemptId || this.closedByUser) { fail('superseded'); return; } // an obsolete attempt: never a second session
        settled = true; clearTimeout(timeout);
        const previous = this.socket; this.socket = socket; this.credentials = credentials; this.lastReceivedAt = performance.now();
        if (previous && previous !== socket) try { previous.close(1000, 'replaced'); } catch {}
        this.reconnectAttempts = 0; this.connectedAt ||= performance.now(); this.#keepAlive();
        this.setState('connected', { ...credentials, ...detail }); resolve(credentials);
      });
      socket.addEventListener('message', (event) => { if (this.socket !== socket) return; this.lastReceivedAt = performance.now(); this.metrics.received++; this.metrics.receivedBytes += typeof event.data === 'string' ? event.data.length : event.data?.byteLength || 0; this.#message(event.data); });
      socket.addEventListener('error', () => fail('WebSocket connection failed. Please try again.'));
      socket.addEventListener('close', (event) => {
        if (!settled) { fail('WebSocket connection closed.'); return; }
        if (this.socket !== socket) return; // an old or replaced socket
        this.socket = null; this.#keepAlive(false);
        if (this.closedByUser) this.setState('disconnected'); else this.#lost(event.code);
      });
    });
  }
  // The game loop pings every 5 s but stops while the tab is hidden; this timer keeps a background tab
  // known to the server (which drops sockets silent for MULTIPLAYER_LIMITS.staleConnectionMs).
  #keepAlive(on = true) {
    clearInterval(this.keepAliveTimer); this.keepAliveTimer = null; if (!on) return;
    this.keepAliveTimer = setInterval(() => { if (performance.now() - (this.lastSentAt || 0) > 15000) this.ping(); }, 20000);
    this.keepAliveTimer.unref?.();
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
  // ---- RC1 hotfix 1c: automatic reconnection ----
  // The live socket went away. 4004: another tab or device took this session over (or it expired); 4003: room
  // full. Anything else: keep trying while the game runs: resume this session (same player, same place) while
  // the room still holds it, or rejoin (a fresh session at a spawn point, as on first entry) once it has let it go.
  #lost(code) {
    if (code === 4004) { this.setState('session-expired'); return; }
    if (code === 4003) { this.setState('room-full'); return; }
    this.#startReconnect();
  }
  #startReconnect() {
    if (this.closedByUser || !this.credentials || this.reconnecting) return;
    const cycle = ++this.reconnectCycle; this.reconnecting = true; this.disconnectedAt = performance.now(); this.resumeFailures = 0;
    this.#reconnectLoop(cycle).finally(() => { if (cycle === this.reconnectCycle) this.reconnecting = false; });
  }
  #cancelReconnect() { this.reconnectCycle++; this.reconnecting = false; this.attemptId++; this.#wake(); }
  async #reconnectLoop(cycle) {
    const rules = this.reconnectRules, live = () => !this.closedByUser && cycle === this.reconnectCycle;
    for (let attempt = 0; live(); attempt++) {
      const delay = reconnectDelay(attempt, this.random, rules);
      this.setState('reconnecting', { attempt, retryInMs: delay, offlineMs: Math.round(performance.now() - this.disconnectedAt), online: this.#online() });
      await this.#sleep(delay);
      // While the page is hidden (iPhone in the background) or the device is offline, wait: no requests are made.
      while (live() && (this.#hidden() || !this.#online())) { this.setState('reconnecting', { attempt, waiting: this.#hidden() ? 'hidden' : 'offline', offlineMs: Math.round(performance.now() - this.disconnectedAt), online: this.#online() }); await this.#sleep(rules.idleCheckMs); }
      if (!live()) return;
      this.reconnectAttempts = attempt + 1;
      try {
        const resume = performance.now() - this.disconnectedAt < rules.resumeWindowMs && this.resumeFailures < rules.resumeFailuresBeforeRejoin;
        if (resume) {
          try { await this.#open(this.credentials, { resumed: true }); return; }
          catch { if (await this.#serviceReachable()) this.resumeFailures++; throw new Error('resume failed'); } // reachable but refused: the room let the session go
        }
        const credentials = await this.#rejoinCredentials(); if (!live()) return;
        await this.#open(credentials, { rejoined: true }); return;
      } catch (error) { if (error?.code === 'session_ended') { this.setState('session-expired'); return; } }
    }
  }
  // A fresh session in the same kind of room: the public city again, or the same private room by its code.
  async #rejoinCredentials() {
    if (this.joinMode?.kind === 'room') {
      try { return { ...(await this.joinRoom(this.joinMode.roomCode)), roomCode: this.joinMode.roomCode }; }
      catch (error) { if (error.code === 'room_full' || /not found/i.test(error.message)) throw Object.assign(new Error('room closed'), { code: 'session_ended' }); throw error; }
    }
    return this.matchmake();
  }
  async #serviceReachable() {
    // any answer at all (opaque is fine) means the network and the service are up
    try { await fetch(this.serviceUrl + '/health', { mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(4000) }); return true; } catch { return false; }
  }
  #online() { return typeof navigator === 'undefined' || navigator.onLine !== false; }
  #hidden() { return typeof document !== 'undefined' && document.visibilityState === 'hidden'; }
  // Sleeps that end early when the page comes back or the network returns (#wake).
  #sleep(ms) {
    return new Promise((resolve) => {
      const wakers = (this.wakers ||= new Set()); let t = 0;
      const done = () => { clearTimeout(t); wakers.delete(done); resolve(); };
      t = setTimeout(done, ms); wakers.add(done);
    });
  }
  #wake() { for (const done of [...(this.wakers || [])]) done(); }
  // Page lifecycle (iPhone Safari): coming back to the foreground or online wakes a waiting reconnect at once; a
  // socket that still looks open after the page slept is checked with a ping and replaced if it stays silent.
  #watchLifecycle() {
    if (this.lifecycleWatched || typeof addEventListener !== 'function') return; this.lifecycleWatched = true;
    const back = () => { if (this.reconnecting) { this.#wake(); return; } if (this.state === 'connected') this.#checkAlive(); };
    addEventListener('online', back); addEventListener('pageshow', back);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') back(); });
  }
  // Public for the page-lifecycle hook and tests: ping, and replace the socket if it stays silent.
  checkConnection() { this.#checkAlive(); }
  #checkAlive() {
    const socket = this.socket; if (!socket || this.closedByUser) return;
    const before = this.lastReceivedAt; this.ping();
    clearTimeout(this.aliveTimer);
    this.aliveTimer = setTimeout(() => {
      if (this.socket !== socket || this.lastReceivedAt !== before || this.closedByUser) return; // it answered, or already replaced
      this.socket = null; this.#keepAlive(false); try { socket.close(4000, 'silent after resume'); } catch {}
      this.#startReconnect();
    }, this.reconnectRules.aliveCheckMs);
  }
  send(message) {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    const raw = JSON.stringify({ v: PROTOCOL_VERSION, ...message });
    if (new TextEncoder().encode(raw).byteLength > MULTIPLAYER_LIMITS.maxPayloadBytes) return false;
    this.socket.send(raw); this.lastSentAt = performance.now(); this.metrics.sent++; this.metrics.sentBytes += raw.length; return true;
  }
  // `aim` (M6.9): { raised, pitch } so other players see the weapon up and pointed.
  sendMovement(player, now = performance.now(), aim = null) {
    const movement = { x: rounded(player.pos.x), y: rounded(player.pos.y), z: rounded(player.pos.z), yaw: rounded(player.yaw), speed: rounded(player.planar), state: player.sprinting ? 'run' : player.planar > 0.25 ? 'walk' : 'idle' };
    if (aim) { movement.aim = aim.raised ? 1 : 0; movement.pitch = Math.round(Math.max(-1.5, Math.min(1.5, aim.pitch || 0)) * 100) / 100; }
    const prior = this.lastMovement, changed = !prior || movement.state !== prior.state || Math.abs(movement.x - prior.x) > 0.002 || Math.abs(movement.y - prior.y) > 0.002 || Math.abs(movement.z - prior.z) > 0.002 || Math.abs(movement.yaw - prior.yaw) > 0.002
      || movement.aim !== prior.aim || Math.abs((movement.pitch || 0) - (prior.pitch || 0)) > 0.02;
    if (!changed && movement.state === 'idle' && now - this.lastMovementAt < MULTIPLAYER_LIMITS.idleUpdateMs) { this.metrics.movementSkipped++; return false; }
    const sent = this.send({ type: 'move', seq: ++this.seq, clientTime: Math.round(now), ...movement });
    if (sent) { this.lastMovement = movement; this.lastMovementAt = now; }
    return sent;
  }
  updateAppearance(appearance) {
    this.appearance = normalizeAvatarAppearance(appearance);
    return this.send({ type: 'appearance', seq: ++this.appearanceSeq, appearance: this.appearance });
  }
  updateEquipment(weaponId, holstered = false) { return this.send({ type: 'equipment', seq: ++this.equipmentSeq, weaponId, holstered }); }
  // viewAt (M6.9 dev3): the server time of what the shooter was looking at (remote players are drawn interpolated in the past)
  fireWeapon(weaponId, direction, viewAt = undefined) { return this.send({ type: 'fire', seq: ++this.combatSeq, weaponId, direction: { x: rounded(direction.x), y: rounded(direction.y), z: rounded(direction.z) }, ...(Number.isFinite(viewAt) ? { viewAt: Math.round(viewAt) } : {}) }); }
  reloadWeapon(weaponId) { return this.send({ type: 'reload', seq: ++this.combatSeq, weaponId }); }
  updateSpace(spaceId, action) { return this.send({ type: 'space', seq: ++this.spaceSeq, spaceId, action }); }
  // Ammo (gun shop): ask the server to restock every reserve (it checks the shop, the counter, and the cooldown)
  shopRestock(shopId = 'nerdie-arms') { this.shopSeq = (this.shopSeq || 0) + 1; return this.send({ type: 'shop', seq: this.shopSeq, shopId, action: 'restock' }); }
  // M7.1D chess: sit, stand, ready, challenge, move, resign, draws, watch (the server checks the seat and the rules)
  sendChess(body) { this.chessSeq = (this.chessSeq || 0) + 1; return this.send({ type: 'chess', seq: this.chessSeq, ...body }); }
  sendEconomy(body) { return this.send({ type: 'economy', seq: ++this.economySeq, ...body }); }
  // Talking to a resident: the server holds them in place, facing this player, for a few seconds (resent while talking).
  talkToResident(index) { return Number.isInteger(index) && index >= 0 ? this.send({ type: 'npc-talk', index }) : false; }
  ping() { const sentAt = performance.now(); this.send({ type: 'ping', nonce: Math.random().toString(36).slice(2), sentAt }); }
  diagnostics(now = performance.now()) {
    const seconds = Math.max(1, (now - this.connectedAt) / 1000);
    return { ...this.metrics, sentPerSecond: this.metrics.sent / seconds, receivedPerSecond: this.metrics.received / seconds, sentBytesPerSecond: this.metrics.sentBytes / seconds, receivedBytesPerSecond: this.metrics.receivedBytes / seconds };
  }
  close() { this.closedByUser = true; this.#cancelReconnect(); clearTimeout(this.aliveTimer); this.#keepAlive(false); this.socket?.close(1000, 'client exit'); this.socket = null; this.setState('disconnected'); }
}
