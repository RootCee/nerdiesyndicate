// M7.1D chess at the Central Park tables (client): the table prompt, the board panel (mouse and
// touch), and the requests it sends. It never decides anything: every seat, move, and result comes
// from the room server, and the board shows only what the server last sent.
import { CHESS_TABLES } from './city-park-layout.js';
import { CHESS_LEVELS } from './chess-residents.js';
import { BoardModel, GLYPHS, PIECE_NAMES, capturedBy, colorOf, isLight, kingInCheck, moveRows, occupantLabel, orderedSquares, parseFen, statusLine, tablePrompt, targetsFrom } from './chess-view.js';

const PROMPT_REACH = 2.6; // matches the server's seat reach (3 m) with a margin
const STYLE = `
#chessPanel{position:fixed;inset:0;z-index:60;display:none;align-items:center;justify-content:center;background:rgba(10,6,20,.55);font-family:'Barlow Condensed',system-ui,sans-serif;color:#f3eefc;padding:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left))}
#chessPanel.on{display:flex}
#chessPanel .cp-card{background:#1b1430;border:2px solid #c9a227;border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.55);display:grid;grid-template-columns:auto minmax(220px,300px);gap:14px;padding:14px;max-height:100%;overflow:auto}
#chessPanel .cp-head{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:10px}
#chessPanel h2{margin:0;font-size:20px;letter-spacing:.08em;color:#e8c55a}
#chessPanel .cp-x{background:none;border:1px solid #5b4a86;color:#f3eefc;border-radius:8px;width:40px;height:40px;font-size:20px;cursor:pointer}
#chessPanel .cp-main{display:flex;flex-direction:column;gap:6px}
#chessPanel .cp-who{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:16px;min-height:26px}
#chessPanel .cp-who .turn{width:10px;height:10px;border-radius:50%;background:transparent;display:inline-block;margin-right:6px}
#chessPanel .cp-who.on .turn{background:#5fd38a;box-shadow:0 0 8px #5fd38a}
#chessPanel .cp-cap{font-size:18px;letter-spacing:-.06em;opacity:.9}
#chessPanel .cp-board{--sq:min(calc((100vw - 48px) / 8),calc((100vh - 260px) / 8),64px);display:grid;grid-template-columns:repeat(8,var(--sq));grid-template-rows:repeat(8,var(--sq));border:3px solid #3a2a63;border-radius:6px;overflow:hidden;touch-action:manipulation;user-select:none;-webkit-user-select:none}
#chessPanel .sq{position:relative;border:0;padding:0;margin:0;display:flex;align-items:center;justify-content:center;font-size:calc(var(--sq) * .78);line-height:1;cursor:pointer;font-family:'DejaVu Sans','Segoe UI Symbol','Apple Symbols',serif}
#chessPanel .sq.l{background:#e9dcb8}#chessPanel .sq.d{background:#6f5a9a}
#chessPanel .sq.last.l{background:#f2e083}#chessPanel .sq.last.d{background:#a28d3f}
#chessPanel .sq.sel{box-shadow:inset 0 0 0 4px #39d67a}
#chessPanel .sq.check{background:radial-gradient(circle,#ff4d4d 0,#c0262d 55%,transparent 75%)}
#chessPanel .sq.t::after{content:'';position:absolute;width:28%;height:28%;border-radius:50%;background:rgba(30,160,90,.75)}
#chessPanel .sq.t.cap::after{width:86%;height:86%;background:transparent;border:4px solid rgba(30,160,90,.8)}
#chessPanel .pw{color:#fffaf0;text-shadow:0 0 1px #000,0 0 2px #000,1px 1px 0 #2a1d47}
#chessPanel .pb{color:#15101f;text-shadow:0 0 1px #fff8,0 1px 0 #fff4}
#chessPanel .sq .coord{position:absolute;left:3px;bottom:1px;font-size:10px;font-family:'Barlow Condensed',sans-serif;opacity:.7;color:#2a1d47}
#chessPanel .cp-side{display:flex;flex-direction:column;gap:10px;min-width:0}
#chessPanel .cp-status{font-size:20px;font-weight:600;color:#fff;min-height:28px}
#chessPanel .cp-note{font-size:14px;color:#c9bde6;min-height:18px}
#chessPanel .cp-actions{display:flex;flex-wrap:wrap;gap:8px}
#chessPanel button.cp-b{min-height:44px;padding:0 14px;border-radius:9px;border:1px solid #6a55a3;background:#3a2a63;color:#fff;font:600 16px 'Barlow Condensed',sans-serif;letter-spacing:.05em;cursor:pointer}
#chessPanel button.cp-b.go{background:#1f8a4c;border-color:#39d67a}
#chessPanel button.cp-b.warn{background:#7a2330;border-color:#e0596a}
#chessPanel button.cp-b:focus-visible,#chessPanel .sq:focus-visible,#chessPanel .cp-x:focus-visible{outline:3px solid #e8c55a;outline-offset:1px}
#chessPanel .cp-levels{display:grid;grid-template-columns:1fr;gap:6px}
#chessPanel .cp-levels button{text-align:left;padding:6px 12px}
#chessPanel .cp-levels small{display:block;font-weight:400;opacity:.75;font-size:13px}
#chessPanel .cp-hist{background:#140f24;border-radius:8px;padding:8px;max-height:220px;overflow:auto;font:15px/1.5 'Barlow Condensed',sans-serif;display:grid;grid-template-columns:auto 1fr 1fr;column-gap:10px}
#chessPanel .cp-hist .n{opacity:.6}
#chessPanel .cp-promo{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(10,6,20,.7)}
#chessPanel .cp-promo.on{display:flex}
#chessPanel .cp-promo div{display:flex;gap:8px;background:#1b1430;border:2px solid #c9a227;border-radius:12px;padding:12px}
#chessPanel .cp-promo button{width:64px;height:64px;font-size:46px;border-radius:10px;border:1px solid #6a55a3;background:#e9dcb8;cursor:pointer}
@media (max-width:760px),(max-height:520px) and (orientation:landscape){#chessPanel .cp-card{grid-template-columns:1fr;padding:10px;gap:8px}#chessPanel .cp-hist{max-height:96px}}
@media (max-height:520px) and (orientation:landscape){#chessPanel .cp-card{grid-template-columns:auto minmax(180px,1fr)}#chessPanel .cp-board{--sq:min(calc((100vh - 70px) / 8),56px)}}
@media (prefers-reduced-motion:reduce){#chessPanel *{transition:none!important}}
`;

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export class ChessClient {
  // send(body): the multiplayer client's sendChess; onOpen(open): the game pauses movement and the pointer lock
  constructor({ send, mobile = false, onOpen = () => {}, document: doc = globalThis.document } = {}) {
    Object.assign(this, { send, mobile, onOpen, doc });
    this.summary = new Map(); this.view = null; this.tableId = null; this.isOpen = false; this.board = new BoardModel(); this.note = ''; this.confirming = null; this.levels = false;
    this.nearest = null;
  }
  get open() { return this.isOpen; }
  // ---- world: the prompt beside a table (returns { prompt, mobileLabel })
  update(player, interact, online = true) {
    if (this.isOpen) return { prompt: '', mobileLabel: '' };
    let best = null;
    for (const t of CHESS_TABLES) {
      const d = Math.min(...t.seats.map((s) => Math.min(dist(player.pos, s), dist(player.pos, s.stand))), dist(player.pos, t));
      if (d <= PROMPT_REACH && (!best || d < best.d)) best = { t, d };
    }
    this.nearest = best?.t || null;
    if (!best) return { prompt: '', mobileLabel: '' };
    if (!online) return { prompt: 'CHESS · JOIN THE ONLINE CITY TO PLAY', mobileLabel: '' };
    const p = tablePrompt(this.summary.get(best.t.id), this.mobile);
    if (interact) this.#use(best.t.id, p.action);
    return { prompt: p.text, mobileLabel: p.label };
  }
  #use(tableId, action) {
    this.tableId = tableId; this.view = null; this.mode = action; this.note = action === 'sit' ? 'Taking a seat…' : 'Opening the board…';
    this.send({ action, tableId }); this.#setOpen(true);
  }
  // ---- server messages
  onMessage(message) {
    if (message.type === 'chess-tables') { this.summary = new Map((message.tables || []).map((t) => [t.id, t])); if (this.isOpen && !this.view) this.render(); return; }
    if (message.type !== 'chess' || message.tableId !== this.tableId) return;
    const wasSeated = !!this.view?.you;
    if (this.view?.matchId !== message.matchId || this.view?.ply !== message.ply) this.board.reset();
    this.view = message; this.note = ''; if (message.status === 'playing' || !message.you) this.levels = false;
    // left the seat (stood up, walked away, or lost the seat): close unless still watching
    if (wasSeated && !message.you && this.isOpen && this.mode === 'sit') { this.#setOpen(false); return; }
    if (this.isOpen) this.render();
  }
  onReject(message) {
    const text = { chess_seat_taken: 'That seat was just taken.', chess_table_busy: 'This table is busy. You can watch instead.', chess_too_far: 'Step up to the table first.', chess_already_seated: 'You are already seated at another table.', chess_no_resident_free: 'Every resident at that level is busy. Try another level.', chess_illegal_move: 'That move is not legal.', chess_not_your_turn: 'Wait for your turn.', chess_stale_move: 'The board changed. Try again.', chess_not_available: 'Chess is only available in the open city.', chess_rate_limited: 'Slow down a little.', chess_draw_pending: 'Your draw offer is still open.' }[message.reason] || 'The table did not accept that.';
    this.note = text; if (!this.view && ['chess_seat_taken', 'chess_table_busy', 'chess_too_far', 'chess_already_seated', 'chess_not_available'].includes(message.reason)) { this.#setOpen(false); return; }
    if (this.isOpen) this.render();
  }
  // Escape / the close button: spectators stop watching; a seated player leaves (resigning a live game, after a confirm).
  close() {
    if (!this.isOpen) return;
    if (this.view?.you) {
      if (this.view.status === 'playing' && this.confirming !== 'leave') { this.confirming = 'leave'; this.render(); return; }
      this.send({ action: 'stand' });
    } else if (this.tableId) this.send({ action: 'unwatch', tableId: this.tableId });
    this.#setOpen(false);
  }
  reset() { if (this.isOpen) this.#setOpen(false); this.view = null; this.summary.clear(); }
  #setOpen(open) {
    this.isOpen = open; this.confirming = null; this.levels = false; this.board.reset();
    this.#ensureDom(); this.root?.classList.toggle('on', open); // (headless without a document: the tests)
    if (!open) { this.view = null; this.tableId = null; this.note = ''; }
    else this.render();
    this.onOpen(open);
  }
  // ---- panel
  #ensureDom() {
    if (this.root || !this.doc) return;
    const d = this.doc, style = d.createElement('style'); style.textContent = STYLE; d.head.appendChild(style);
    const root = d.createElement('div'); root.id = 'chessPanel'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Chess');
    root.innerHTML = `<div class="cp-card"><div class="cp-head"><h2 class="cp-title">CHESS</h2><button class="cp-x" type="button" aria-label="Close">×</button></div>
      <div class="cp-main"><div class="cp-who top"></div><div style="position:relative"><div class="cp-board" role="grid" aria-label="Chess board"></div><div class="cp-promo" role="dialog" aria-label="Promote pawn"><div></div></div></div><div class="cp-who bottom"></div></div>
      <div class="cp-side"><div class="cp-status" aria-live="polite"></div><div class="cp-note" aria-live="polite"></div><div class="cp-actions"></div><div class="cp-levels"></div><div class="cp-hist" aria-label="Moves"></div></div></div>`;
    d.body.appendChild(root); this.root = root;
    const $ = (s) => root.querySelector(s);
    this.el = { title: $('.cp-title'), top: $('.cp-who.top'), bottom: $('.cp-who.bottom'), board: $('.cp-board'), promo: $('.cp-promo'), status: $('.cp-status'), note: $('.cp-note'), actions: $('.cp-actions'), levels: $('.cp-levels'), hist: $('.cp-hist') };
    $('.cp-x').addEventListener('click', () => this.close());
    this.squares = new Map();
    for (let i = 0; i < 64; i++) {
      const b = d.createElement('button'); b.type = 'button'; b.className = 'sq'; b.setAttribute('role', 'gridcell');
      b.addEventListener('click', () => this.#tap(b.dataset.square)); this.el.board.appendChild(b); this.squares.set(i, b);
    }
    // keep game input (WASD, fire) from seeing presses aimed at the panel
    for (const type of ['keydown', 'keyup']) root.addEventListener(type, (e) => { if (e.code !== 'Escape') e.stopPropagation(); });
  }
  #tap(square) {
    if (!square) return;
    const r = this.board.tap(square, this.view);
    if (r.type === 'move') this.#move(r.uci);
    else if (r.type === 'promote') this.#promote(r.from, r.to);
    this.render();
  }
  #move(uci) { this.send({ action: 'move', matchId: this.view.matchId, ply: this.view.ply, uci }); this.note = ''; }
  #promote(from, to) {
    const box = this.el.promo.firstElementChild, white = this.view.you === 'w'; box.innerHTML = '';
    for (const p of ['q', 'r', 'b', 'n']) {
      const b = this.doc.createElement('button'); b.type = 'button'; b.className = white ? 'pw' : 'pb'; b.textContent = GLYPHS[p]; b.setAttribute('aria-label', `Promote to ${PIECE_NAMES[p]}`);
      b.addEventListener('click', () => { this.el.promo.classList.remove('on'); this.#move(from + to + p); this.render(); }); box.appendChild(b);
    }
    this.el.promo.classList.add('on'); box.firstElementChild.focus();
  }
  #button(label, onClick, kind = '') { const b = this.doc.createElement('button'); b.type = 'button'; b.className = `cp-b ${kind}`; b.textContent = label; b.addEventListener('click', onClick); this.el.actions.appendChild(b); return b; }
  render() {
    if (!this.root) return;
    const v = this.view, el = this.el, tableNo = (this.tableId || '').replace('chess-', '');
    el.title.textContent = `CHESS · TABLE ${tableNo}${v?.exhibition ? ' · RESIDENTS' : ''}`;
    const orientation = v?.you === 'b' ? 'b' : 'w', board = parseFen(v?.fen), legal = v?.legal || [];
    const sel = this.board.selected, targets = new Set(sel ? targetsFrom(legal, sel) : []), check = kingInCheck(v), last = v?.last;
    orderedSquares(orientation).forEach((sq, i) => {
      const b = this.squares.get(i), piece = board.get(sq), color = colorOf(piece);
      b.dataset.square = sq; b.className = `sq ${isLight(sq) ? 'l' : 'd'}${sel === sq ? ' sel' : ''}${targets.has(sq) ? ` t${piece ? ' cap' : ''}` : ''}${check === sq ? ' check' : ''}${last && (last.from === sq || last.to === sq) ? ' last' : ''}`;
      b.innerHTML = piece ? `<span class="${color === 'w' ? 'pw' : 'pb'}">${GLYPHS[piece.toLowerCase()]}</span>` : '';
      if ((orientation === 'w' ? sq[1] === '1' : sq[1] === '8')) b.insertAdjacentHTML('beforeend', `<span class="coord">${sq[0]}</span>`);
      b.setAttribute('aria-label', `${sq}${piece ? ` ${color === 'w' ? 'white' : 'black'} ${PIECE_NAMES[piece.toLowerCase()]}` : ''}${targets.has(sq) ? ', move here' : ''}`);
    });
    // players: the viewer's colour at the bottom
    const caps = capturedBy(v?.captures), bottomSide = orientation, topSide = orientation === 'w' ? 'b' : 'w';
    for (const [node, side] of [[el.top, topSide], [el.bottom, bottomSide]]) {
      const o = v?.seats?.[side], you = v?.you === side ? ' (you)' : '';
      node.classList.toggle('on', v?.status === 'playing' && v.turn === side);
      node.innerHTML = `<span><span class="turn"></span>${side === 'w' ? '○' : '●'} ${escapeHtml(occupantLabel(o))}${you}</span><span class="cp-cap ${side === 'w' ? 'pb' : 'pw'}">${caps[side].map((p) => GLYPHS[p.toLowerCase()]).join('')}</span>`;
    }
    el.status.textContent = v ? statusLine(v) : this.note;
    el.note.textContent = v ? (this.confirming === 'leave' ? 'Leaving now resigns this game.' : v.drawOffer && v.drawOffer !== v.you && v.you ? 'Your opponent offers a draw.' : v.drawOffer === v.you ? 'Draw offered.' : this.note) : '';
    el.hist.innerHTML = moveRows(v?.san).map(([n, a, b]) => `<span class="n">${n}</span><span>${escapeHtml(a)}</span><span>${escapeHtml(b)}</span>`).join('');
    el.hist.scrollTop = el.hist.scrollHeight;
    this.#actions(v);
  }
  #actions(v) {
    const el = this.el; el.actions.innerHTML = ''; el.levels.innerHTML = '';
    if (!v) return;
    if (!v.you) { this.#button('STOP WATCHING', () => this.close()); return; }
    if (this.confirming === 'leave') { this.#button('LEAVE AND RESIGN', () => { this.confirming = 'confirmed'; this.close(); }, 'warn'); this.#button('KEEP PLAYING', () => { this.confirming = null; this.render(); }); return; }
    if (this.confirming === 'resign') { this.#button('YES, RESIGN', () => { this.confirming = null; this.send({ action: 'resign' }); }, 'warn'); this.#button('KEEP PLAYING', () => { this.confirming = null; this.render(); }); return; }
    if (v.status === 'playing') {
      if (v.drawOffer && v.drawOffer !== v.you) { this.#button('ACCEPT DRAW', () => this.send({ action: 'answer-draw', accept: true }), 'go'); this.#button('DECLINE', () => this.send({ action: 'answer-draw', accept: false })); }
      else if (!v.drawOffer) this.#button('OFFER DRAW', () => this.send({ action: 'offer-draw' }));
      this.#button('RESIGN', () => { this.confirming = 'resign'; this.render(); }, 'warn');
      return;
    }
    const opponent = v.seats[v.you === 'w' ? 'b' : 'w'];
    if (opponent && (v.status === 'ready' || v.status === 'over')) {
      if (!v.ready?.[v.you]) this.#button(v.status === 'over' ? 'REMATCH' : 'READY', () => this.send({ action: 'ready' }), 'go');
    }
    if (!opponent || opponent.kind === 'npc' || v.status === 'over') {
      if (!this.levels) this.#button(opponent?.kind === 'npc' ? 'PLAY ANOTHER RESIDENT' : 'PLAY A RESIDENT', () => { this.levels = true; this.render(); }, opponent ? '' : 'go');
      else for (const l of CHESS_LEVELS) {
        const b = this.doc.createElement('button'); b.type = 'button'; b.className = 'cp-b'; b.innerHTML = `${l.level} · ${l.label.toUpperCase()}<small>${escapeHtml(l.blurb)}</small>`;
        b.addEventListener('click', () => { this.levels = false; this.note = 'A resident is coming over…'; this.send({ action: 'challenge', level: l.level }); this.render(); }); el.levels.appendChild(b);
      }
    }
    this.#button('LEAVE TABLE', () => this.close());
  }
}
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
