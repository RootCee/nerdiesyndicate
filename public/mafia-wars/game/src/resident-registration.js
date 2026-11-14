// NC-LIFE-02 Milestone 4: City Hall registration in the game. The Registration clerk offers it only when the City Service says
// registration is open (GET /v1/resident/config); otherwise the desk stays informational. Flow: the website's wallet signs the City
// Service's one-time Sign-In with Ethereum text (free; no transaction, approval or transfer) -> the City Service verifies it and
// registers (or signs in) the player -> a permanent resident number (R-000123). The game then gets a short-lived room pass and
// hands it to the room, which verifies it itself. The session and pass live only in this tab's memory. Guests keep playing as before.
import { resolveCityServiceEndpoint } from './city-service-client.js';

const STYLE = `#regPanel{position:fixed;inset:0;z-index:80;display:none;align-items:center;justify-content:center;background:#0008}
#regPanel.on{display:flex}#regPanel .rg-card{width:min(420px,92vw);padding:18px;border-radius:14px;background:#14111b;color:#eee;font:15px/1.4 Barlow,system-ui,sans-serif;box-shadow:0 8px 30px #000c}
#regPanel h2{margin:0 0 8px;font-size:20px;color:#f2d28b}#regPanel p{margin:6px 0;color:#ccc}#regPanel input{width:100%;box-sizing:border-box;padding:9px;margin:8px 0;border-radius:8px;border:1px solid #555;background:#1d1926;color:#fff;font:inherit}
#regPanel .rg-row{display:flex;gap:8px;margin-top:10px}#regPanel button{flex:1;padding:10px;border:0;border-radius:8px;background:#3b2c55;color:#fff;font:700 14px Barlow,system-ui,sans-serif;cursor:pointer}
#regPanel button.rg-go{background:#7a5a12}#regPanel .rg-msg{min-height:20px;color:#f6b26b}`;

export class ResidentRegistration {
  constructor({ endpoint = resolveCityServiceEndpoint(), fetchImpl = globalThis.fetch?.bind(globalThis), bridge, walletAddress = () => null, sendIdentify = () => false, doc = globalThis.document, onRegistered = () => {} } = {}) {
    Object.assign(this, { endpoint, fetchImpl, bridge, walletAddress, sendIdentify, doc, onRegistered });
    this.enabled = false; this.profile = null; this.identity = null; this.pending = null;
    let session = null; // memory only
    this.setSession = (s) => { session = s || null; };
    this.hasSession = () => !!session;
    this.authHeader = () => (session ? { authorization: `Bearer ${session}` } : {});
  }
  async post(path, body, headers = {}) {
    const res = await this.fetchImpl(`${this.endpoint}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body || {}) });
    let data = {}; try { data = await res.json(); } catch { /* not JSON */ }
    return { status: res.status, ...data };
  }
  // Is registration open? (A City Service without the routes simply says no.)
  async loadConfig() {
    try { const res = await this.fetchImpl(`${this.endpoint}/v1/resident/config`); this.enabled = res.ok && (await res.json()).registration === true; } catch { this.enabled = false; }
    return this.enabled;
  }
  get available() { return this.enabled; }
  // Step 1: sign (and register if the wallet is already a resident). Returns { done } or { needName } or throws a readable Error.
  async begin() {
    const address = this.walletAddress(); if (!address) throw new Error('Connect your wallet with MY WALLET first. Guests can keep playing without registering.');
    const c = await this.post('/v1/resident/challenge', { address }); if (c.status !== 200) throw new Error(c.message || 'Registration is not available right now.');
    const signature = await this.bridge.signResidentChallenge(c.message);
    this.pending = { address, nonce: c.nonce, signature };
    return this.finish('');
  }
  // Step 2 (new residents): the display name, with the same one-time signature (the City Service has not spent it yet).
  async finish(displayName) {
    if (!this.pending) throw new Error('Start again.');
    const r = await this.post('/v1/resident/register', { ...this.pending, displayName: displayName || undefined });
    if (r.status === 400 && r.error === 'name_required') return { needName: true };
    if (r.status !== 200) { if (r.error === 'challenge_invalid') this.pending = null; throw new Error(r.message || 'That did not work. Nothing was changed.'); }
    this.pending = null; this.profile = r.profile; this.setSession(r.session);
    await this.identify(); this.onRegistered(this.profile, r.registered === true);
    return { done: true, profile: r.profile, registered: r.registered === true };
  }
  // Give the room a fresh pass (after registering, and again after a reconnect). The room verifies it itself.
  async identify() {
    if (!this.hasSession()) return false;
    const p = await this.post('/v1/resident/room-pass', {}, this.authHeader());
    return p.status === 200 && !!p.pass && this.sendIdentify(p.pass);
  }
  onIdentity(message) { if (message?.type === 'identity' && message.ok) this.identity = { residentNo: message.residentNo, name: message.name, roles: message.roles }; return this.identity; }

  // ---- the panel (opened from the Registration clerk's talk card)
  open() {
    this.#ensureDom(); this.root.classList.add('on');
    if (this.profile) return this.#show('done');
    this.#show('intro');
  }
  close() { this.root?.classList.remove('on'); }
  #show(step, message = '') {
    const p = this.profile, html = {
      intro: `<h2>Register at City Hall</h2><p>Become a registered resident: a permanent resident number and a name everyone sees in the city.</p><p>Your wallet signs a one-time message. <b>It is free and does not move funds, approve tokens or send a transaction.</b></p><p>Guests can keep playing without registering.</p><div class="rg-row"><button type="button" data-rg="close">Not now</button><button type="button" class="rg-go" data-rg="sign">Sign with wallet</button></div>`,
      name: `<h2>Choose your name</h2><p>3 to 24 characters: letters, numbers, spaces, dots, dashes or underscores.</p><input maxlength="24" autocomplete="off" spellcheck="false" aria-label="Display name"><div class="rg-row"><button type="button" data-rg="close">Cancel</button><button type="button" class="rg-go" data-rg="name">Register</button></div>`,
      done: `<h2>Welcome, ${esc(p?.displayName || '')}</h2><p>You are resident <b>${esc(p?.residentNo || '')}</b>.</p><div class="rg-row"><button type="button" class="rg-go" data-rg="close">Done</button></div>`,
      busy: `<h2>Waiting for your wallet…</h2><p>Approve the sign-in message in your wallet. Nothing is charged.</p>`,
    }[step];
    this.card.innerHTML = `${html}<p class="rg-msg" aria-live="polite">${esc(message)}</p>`;
    this.card.querySelector('input')?.focus?.();
  }
  #ensureDom() {
    if (this.root || !this.doc?.createElement) return;
    const style = this.doc.createElement('style'); style.textContent = STYLE; this.doc.head.appendChild(style);
    this.root = this.doc.createElement('div'); this.root.id = 'regPanel'; this.root.setAttribute('role', 'dialog'); this.root.setAttribute('aria-label', 'City Hall registration');
    this.root.innerHTML = '<div class="rg-card"></div>'; this.doc.body.appendChild(this.root); this.card = this.root.querySelector('.rg-card');
    for (const type of ['keydown', 'keyup', 'keypress']) this.root.addEventListener(type, (e) => { if (e.code === 'Escape' && type === 'keydown') this.close(); e.stopPropagation(); });
    this.root.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-rg]'); if (!b) { if (e.target === this.root) this.close(); return; }
      const act = b.dataset.rg;
      if (act === 'close') return this.close();
      try {
        if (act === 'sign') { this.#show('busy'); const r = await this.begin(); this.#show(r.needName ? 'name' : 'done'); }
        if (act === 'name') { const name = this.card.querySelector('input')?.value.trim() || ''; this.#show('busy'); const r = await this.finish(name); this.#show(r.needName ? 'name' : 'done'); }
      } catch (error) { this.#show(act === 'name' && this.pending ? 'name' : 'intro', error.message); }
    });
  }
}
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
