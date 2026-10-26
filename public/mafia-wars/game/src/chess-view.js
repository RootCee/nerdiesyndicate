// M7.1D chess board model for the in-game panel. Pure (no DOM): it reads the server's table state,
// turns taps or clicks into intents (select, move, promote), and words the status. The server
// decides everything; legal targets come from the `legal` list it sends to the player to move.
import { chessLevel } from './chess-residents.js';

export const FILES = 'abcdefgh';
// Solid glyphs for both colours (coloured by CSS); U+FE0E keeps phones from drawing emoji.
export const GLYPHS = Object.freeze({ k: '♚︎', q: '♛︎', r: '♜︎', b: '♝︎', n: '♞︎', p: '♟︎' });
export const PIECE_NAMES = Object.freeze({ k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' });
export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// square name -> piece letter ('P' white pawn, 'p' black pawn), from a FEN placement
export function parseFen(fen = START_FEN) {
  const board = new Map(), rows = fen.split(' ')[0].split('/');
  rows.forEach((row, r) => { let f = 0; for (const ch of row) { if (/\d/.test(ch)) f += Number(ch); else { board.set(`${FILES[f]}${8 - r}`, ch); f++; } } });
  return board;
}
// The 64 squares top-left first, from the viewer's side (black sees its own pieces at the bottom).
export function orderedSquares(orientation = 'w') {
  const out = [];
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) out.push(orientation === 'w' ? `${FILES[f]}${8 - r}` : `${FILES[7 - f]}${r + 1}`);
  return out;
}
export const isLight = (square) => (FILES.indexOf(square[0]) + Number(square[1])) % 2 === 1;
export const colorOf = (piece) => (piece ? (piece === piece.toUpperCase() ? 'w' : 'b') : null);
export const targetsFrom = (legal = [], from) => [...new Set(legal.filter((m) => m.startsWith(from)).map((m) => m.slice(2, 4)))];
export const needsPromotion = (legal = [], from, to) => legal.some((m) => m.length === 5 && m.startsWith(from + to));
export function kingInCheck(view) {
  if (!view?.check || !view.fen) return null;
  const king = view.turn === 'w' ? 'K' : 'k';
  for (const [sq, p] of parseFen(view.fen)) if (p === king) return sq;
  return null;
}

// Tap-to-move (works the same for a mouse click and a finger): tap one of your pieces to select it
// (its targets light up), tap a target to move, tap another of your pieces to switch, anything else clears.
export class BoardModel {
  constructor() { this.selected = null; }
  reset() { this.selected = null; }
  canMove(view) { return !!view && view.status === 'playing' && view.you && view.turn === view.you && Array.isArray(view.legal); }
  tap(square, view) {
    if (!this.canMove(view)) { this.selected = null; return { type: 'none' }; }
    const piece = parseFen(view.fen).get(square);
    if (this.selected) {
      const from = this.selected;
      if (targetsFrom(view.legal, from).includes(square)) {
        this.selected = null;
        return needsPromotion(view.legal, from, square) ? { type: 'promote', from, to: square } : { type: 'move', uci: from + square };
      }
      if (square === from) { this.selected = null; return { type: 'clear' }; }
    }
    if (colorOf(piece) === view.you && targetsFrom(view.legal, square).length) { this.selected = square; return { type: 'select', from: square, targets: targetsFrom(view.legal, square) }; }
    this.selected = null; return { type: 'clear' };
  }
}

const sideName = (side) => (side === 'w' ? 'White' : 'Black');
export const OUTCOME_TEXT = Object.freeze({ checkmate: 'Checkmate', stalemate: 'Stalemate', repetition: 'Threefold repetition', 'fifty-move': 'Fifty-move rule', 'insufficient-material': 'Insufficient material', agreement: 'Draw agreed', resignation: 'Resignation', abandonment: 'Left the table', timeout: 'Out of time' });
export function occupantLabel(o) {
  if (!o) return 'Empty seat';
  if (o.kind !== 'npc') return o.name;
  const lvl = chessLevel(o.level), rec = o.record ? ` · ${o.record.w}-${o.record.l}-${o.record.d} here` : '';
  return `${o.name} · ${lvl ? lvl.label : 'Resident'}${rec}`;
}
// One line for the board header: whose move, check, the result, or what the table is waiting for.
export function statusLine(view) {
  if (!view) return '';
  const name = (side) => view.seats?.[side]?.name || sideName(side);
  if (view.result) {
    const { winner, outcome } = view.result, how = OUTCOME_TEXT[outcome] || outcome;
    if (!winner) return `Draw · ${how}`;
    if (view.you) return `${winner === view.you ? 'You win' : 'You lose'} · ${how}`;
    return `${name(winner)} wins · ${how}`;
  }
  if (view.status === 'playing') {
    const check = view.check ? 'Check · ' : '';
    if (view.you) return `${check}${view.turn === view.you ? 'Your move' : `${name(view.turn)} is thinking`}`;
    return `${check}${name(view.turn)} to move`;
  }
  if (view.status === 'ready') {
    if (!view.you) return 'Players getting ready';
    return view.ready?.[view.you] ? `Waiting for ${name(view.you === 'w' ? 'b' : 'w')} to get ready` : 'Opponent seated · press Ready';
  }
  if (view.status === 'waiting') return view.you ? 'Waiting for an opponent · or play a resident' : 'A player is waiting for an opponent';
  return 'Free table';
}
// The world prompt for a table, from the occupancy summary everyone receives.
export function tablePrompt(summary, mobile = false) {
  const key = mobile ? '' : '[E] ';
  if (!summary || summary.s === 'free') return { text: `${key}PLAY CHESS`, label: 'PLAY CHESS', action: 'sit' };
  if (summary.s === 'waiting' && !summary.x) { const who = summary.w || summary.b; return { text: `${key}PLAY ${who.name.toUpperCase()}`, label: 'JOIN CHESS', action: 'sit' }; }
  if (summary.s === 'over' && !summary.x && (!summary.w || !summary.b)) return { text: `${key}PLAY CHESS`, label: 'PLAY CHESS', action: 'sit' };
  return { text: `${key}WATCH CHESS`, label: 'WATCH CHESS', action: 'watch' };
}
// Where each seated player sits, from the occupancy summary: playerId -> { x, z, yaw } on the stool,
// facing the board (seated-pose.js draws them; the same convention as the server's resident seats).
export function seatedPlayers(summaries = [], tables = []) {
  const out = new Map();
  for (const s of summaries) {
    const t = tables.find((x) => x.id === s.id); if (!t) continue;
    for (const [side, i] of [['w', 0], ['b', 1]]) {
      const o = s[side]; if (o?.kind !== 'player' || !o.id) continue;
      const seat = t.seats[i]; out.set(o.id, { x: seat.x, z: seat.z, yaw: Math.atan2(t.x - seat.x, t.z - seat.z), tableId: t.id });
    }
  }
  return out;
}
// Numbered move list: [['1.', 'e4', 'e5'], ['2.', 'Nf3', '']]
export function moveRows(san = []) { const rows = []; for (let i = 0; i < san.length; i += 2) rows.push([`${i / 2 + 1}.`, san[i], san[i + 1] || '']); return rows; }
// Captured pieces from the server's capture list: white's haul is black pieces (lower case).
export function capturedBy(captures = '') { const order = 'qrbnp'; const sort = (s) => [...s].sort((a, b) => order.indexOf(a.toLowerCase()) - order.indexOf(b.toLowerCase())); return { w: sort([...captures].filter((c) => c === c.toLowerCase())), b: sort([...captures].filter((c) => c === c.toUpperCase())) }; }
