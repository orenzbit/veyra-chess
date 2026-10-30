// Shared PGN fixtures for the DNA short/unfinished game rule.
// plies and endCause are written by hand from the movetext and headers; the checks compare
// both src/chess-dna.ts and netlify/functions/chess-dna.mjs against these expectations.

const tags = (pairs) => pairs.map(([name, value]) => '[' + name + ' "' + value + '"]').join('\n');
const pgn = (pairs, movetext) => tags(pairs) + '\n\n' + movetext;

const TEN = '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4';
const ELEVEN = TEN + ' 6. cxd4';
const TWELVE = ELEVEN + ' Bb4+';
const FOURTEEN = TWELVE + ' 7. Bd2 O-O';

export const DNA_END_PARSER_FIXTURES = [
  { name: 'nested variations and a comment containing a parenthesis', pgn: pgn([['Termination', 'Time forfeit'], ['Result', '1-0']], '1. e4 e5 2. Nf3 (2. f4 (2. d4 d5) exf4) Nc6 3. Bb5 {c (x} a6 1-0'), plies: 6, endCause: 'other' },
  { name: 'annotation glyph runs glued to moves', pgn: pgn([['Termination', 'Time forfeit'], ['Result', '1-0']], '1. e4!! e5?? 2. Nf3?!?! Nc6 1-0'), plies: 4, endCause: 'other' },
  { name: 'non-breaking space between moves', pgn: pgn([['Termination', 'Time forfeit'], ['Result', '1-0']], '1. e4\u00a0e5 2. Nf3 Nc6 1-0'), plies: 4, endCause: 'other' },
];

export const DNA_END_FIXTURES = [
  { name: 'five full moves, time forfeit, decisive result (10 plies)', pgn: pgn([['Termination', 'Time forfeit'], ['Result', '1-0']], TEN + ' 1-0'), plies: 10, endCause: 'other' },
  { name: 'eleven plies (six moves not yet complete), time forfeit', pgn: pgn([['Termination', 'Time forfeit'], ['Result', '1-0']], ELEVEN + ' 1-0'), plies: 11, endCause: 'other' },
  { name: 'twelve plies (six full moves), time forfeit is kept', pgn: pgn([['Termination', 'Time forfeit'], ['Result', '1-0']], TWELVE + ' 1-0'), plies: 12, endCause: 'other' },
  { name: 'seven full moves, abandoned is kept', pgn: pgn([['Termination', 'Abandoned'], ['Result', '0-1']], FOURTEEN + ' 0-1'), plies: 14, endCause: 'other' },
  { name: 'mate in four full moves (seven plies), lichess Normal', pgn: pgn([['Termination', 'Normal'], ['Result', '1-0']], '1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0'), plies: 7, endCause: 'checkmate' },
  { name: 'mate in two full moves (four plies) with contradicting time forfeit header', pgn: pgn([['Termination', 'Time forfeit'], ['Result', '0-1']], '1. f3 e5 2. g4 Qh4# 0-1'), plies: 4, endCause: 'checkmate' },
  { name: 'mate marked with annotation glyphs', pgn: pgn([['Termination', 'Normal'], ['Result', '0-1']], '1. f3 e5 2. g4 Qh4#!? 0-1'), plies: 4, endCause: 'checkmate' },
  { name: 'checkmate only in the Termination header', pgn: pgn([['Termination', 'Black won by checkmate'], ['Result', '0-1']], '1. f3 e5 2. g4 Qh4 0-1'), plies: 4, endCause: 'checkmate' },
  { name: 'three moves, chess.com resignation', pgn: pgn([['Termination', 'White won by resignation'], ['Result', '1-0']], '1. e4 e5 2. Nf3 Nc6 3. Bc4 1-0'), plies: 5, endCause: 'resignation' },
  { name: 'three moves, lichess Normal with decisive result (likely resignation)', pgn: pgn([['Termination', 'Normal'], ['Result', '0-1']], '1. e4 e5 2. Nf3 Nc6 3. Bc4 0-1'), plies: 5, endCause: 'resignation_likely' },
  { name: 'short draw by agreement (Normal, 1/2-1/2, castling)', pgn: pgn([['Termination', 'Normal'], ['Result', '1/2-1/2']], '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6 5. d3 1/2-1/2'), plies: 9, endCause: 'other' },
  { name: 'short draw by agreement (chess.com wording)', pgn: pgn([['Termination', 'Draw by agreement'], ['Result', '1/2-1/2']], '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 1/2-1/2'), plies: 8, endCause: 'other' },
  { name: 'short game won on time (chess.com wording)', pgn: pgn([['Termination', 'Black won on time'], ['Result', '0-1']], '1. e4 e5 2. Nf3 Nc6 0-1'), plies: 4, endCause: 'other' },
  { name: 'short game with no Termination header but decisive result', pgn: pgn([['Result', '1-0']], '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 1-0'), plies: 6, endCause: 'unknown' },
  { name: 'short game with no Termination and no Result header', pgn: pgn([], '1. e4 e5 2. Nf3 Nc6'), plies: 4, endCause: 'unknown' },
  { name: 'short game, time forfeit header but Result * (unknown)', pgn: pgn([['Termination', 'Time forfeit'], ['Result', '*']], '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 *'), plies: 6, endCause: 'unknown' },
  { name: 'short game, time forfeit header but no Result header', pgn: pgn([['Termination', 'Time forfeit']], '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 *'), plies: 6, endCause: 'unknown' },
  { name: 'short game with an unrecognised Termination text', pgn: pgn([['Termination', 'Rules infraction'], ['Result', '1-0']], '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 1-0'), plies: 6, endCause: 'unknown' },
  { name: 'comments, line comment, variation, NAG and glued move numbers', pgn: pgn([['Termination', 'Time forfeit'], ['Result', '1-0']], '1. e4 {comment with ) and (} e5 ; line comment 2. d4\n2. Nf3 (2. Bc4 Bc5 3. Nf3) 2... Nc6 $1 3. Bb5 1-0'), plies: 5, endCause: 'other' },
  { name: 'same as the 10-ply fixture with CRLF line endings', pgn: pgn([['Termination', 'Time forfeit'], ['Result', '1-0']], TEN + ' 1-0').replace(/\n/g, '\r\n'), plies: 10, endCause: 'other' },
  { name: 'headers only, no moves, time forfeit', pgn: pgn([['Termination', 'Time forfeit'], ['Result', '1-0']], '1-0'), plies: 0, endCause: 'other' },
  { name: 'glued move numbers and annotation glyphs (10 plies)', pgn: pgn([['Termination', 'Time forfeit'], ['Result', '1-0']], '1.e4! e5?! 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d4 exd4 1-0'), plies: 10, endCause: 'other' },
  { name: 'check (not mate) in a short time forfeit game', pgn: pgn([['Termination', 'Time forfeit'], ['Result', '1-0']], '1. e4 e5 2. Nf3 Nc6 3. Bc4 d6 4. Bxf7+ 1-0'), plies: 7, endCause: 'other' },
  { name: 'chess.com username "CheckmateKing" must not read as checkmate: won on time (4 plies)', pgn: pgn([['Termination', 'CheckmateKing won on time'], ['Result', '0-1']], '1. e4 e5 2. Nf3 Nc6 0-1'), plies: 4, endCause: 'other' },
  { name: 'chess.com username "Animated_Knight" must not read as mated: won - game abandoned (4 plies)', pgn: pgn([['Termination', 'Animated_Knight won - game abandoned'], ['Result', '1-0']], '1. d4 d5 2. c4 e6 1-0'), plies: 4, endCause: 'other' },
  { name: 'chess.com username "IResignNever" must not read as resignation: won on time (6 plies)', pgn: pgn([['Termination', 'IResignNever won on time'], ['Result', '0-1']], '1. e4 c5 2. Nf3 d6 3. d4 cxd4 0-1'), plies: 6, endCause: 'other' },
  { name: 'chess.com username "automated99" must not read as mated: won on time (2 plies)', pgn: pgn([['Termination', 'automated99 won on time'], ['Result', '1-0']], '1. e4 e5 1-0'), plies: 2, endCause: 'other' },
  { name: 'chess.com username "IResignNever" won by resignation is still resignation', pgn: pgn([['Termination', 'IResignNever won by resignation'], ['Result', '1-0']], '1. e4 e5 2. Nf3 Nc6 3. Bc4 1-0'), plies: 5, endCause: 'resignation' },
  { name: 'chess.com username "CheckmateKing" won by checkmate (header only) is still checkmate', pgn: pgn([['Termination', 'CheckmateKing won by checkmate'], ['Result', '0-1']], '1. f3 e5 2. g4 Qh4 0-1'), plies: 4, endCause: 'checkmate' },
  { name: 'short game drawn (chess.com wording "Game drawn by agreement")', pgn: pgn([['Termination', 'Game drawn by agreement'], ['Result', '1/2-1/2']], '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 1/2-1/2'), plies: 8, endCause: 'other' },
];
