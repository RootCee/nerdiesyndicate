// M7.1D chess-playing residents and difficulty levels. Pure (no Three.js): the server's table
// manager and the client's chess panel share it. Each player is a real city resident (its index
// in the seeded population, so the id `n_<index>` is the same in every room) with fixed chess
// preferences: a level, a style, and lines for the start and end of a game.
import { npcIdFor } from './npc-schema.js';

export const CHESS_LEVELS = Object.freeze([
  Object.freeze({ level: 1, label: 'Rookie', blurb: 'Knows how the pieces move' }),
  Object.freeze({ level: 2, label: 'Casual', blurb: 'Plays the park on weekends' }),
  Object.freeze({ level: 3, label: 'Club', blurb: 'Sees simple tactics' }),
  Object.freeze({ level: 4, label: 'Hustler', blurb: 'Plays for money, usually wins' }),
  Object.freeze({ level: 5, label: 'Master', blurb: 'The best board in the park' }),
]);
export const chessLevel = (level) => CHESS_LEVELS.find((l) => l.level === level) || null;

// style: 'sharp' residents take a draw only when clearly worse; 'solid' ones when roughly level.
export const CHESS_RESIDENTS = Object.freeze([
  { index: 3, name: 'Lil Tre', level: 1, style: 'sharp', hello: 'I just learned this. Go easy.', win: 'Wait, I won?', lose: 'Good game. Teach me that one.' },
  { index: 11, name: 'Ms. Pearl', level: 1, style: 'solid', hello: 'Pull up a stool, baby.', win: 'Even a blind squirrel.', lose: 'You play nice.' },
  { index: 5, name: 'Big Moe', level: 2, style: 'sharp', hello: 'Pieces on the table, no take-backs.', win: 'That is how we do it.', lose: 'Run it back sometime.' },
  { index: 17, name: 'Deacon Hill', level: 2, style: 'solid', hello: 'A quiet game is good for the soul.', win: 'Blessings.', lose: 'Well played, young one.' },
  { index: 8, name: 'Coach Rita', level: 3, style: 'solid', hello: 'Develop your pieces. Watch your king.', win: 'Fundamentals win.', lose: 'Nice technique.' },
  { index: 22, name: 'Smitty', level: 3, style: 'sharp', hello: 'You sure you want this smoke?', win: 'Too easy.', lose: 'Aight, you got that one.' },
  { index: 14, name: 'Quick Nick', level: 4, style: 'sharp', hello: 'Clock is in my head. Let us go.', win: 'Hustle never sleeps.', lose: 'Respect. You can play.' },
  { index: 27, name: 'Auntie Vee', level: 4, style: 'solid', hello: 'I have been on this bench thirty years.', win: 'Thirty years, sugar.', lose: 'Now that was chess.' },
  { index: 1, name: 'Professor Knight', level: 5, style: 'solid', hello: 'Shall we?', win: 'An instructive game. Study the endgame.', lose: 'Excellent. I did not see it.' },
  { index: 30, name: 'Old Man Rook', level: 5, style: 'sharp', hello: 'Sit down. Mind the clock.', win: 'Come back when you are ready.', lose: 'Hm. Nobody does that.' },
].map((r) => Object.freeze({ ...r, id: npcIdFor(r.index) })));
export const chessResident = (id) => CHESS_RESIDENTS.find((r) => r.id === id) || null;
