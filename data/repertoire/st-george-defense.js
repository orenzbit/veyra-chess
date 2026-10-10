// St. George Defense — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "st-george-defense",
 "name": "St. George Defense",
 "color": "b",
 "oneLiner": "1.e4 a6 — a tricky waiting move that prepares ...b5.",
 "trunk": "1.e4 a6",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "1-e4-a6-2-d4-b5-3-nf3-bb7": {
   "label": "1.e4 a6 2.d4 b5 3.Nf3 Bb7",
   "blurb": ""
  },
  "1-e4-a6-2-d4-b5-3-bd3-bb7": {
   "label": "1.e4 a6 2.d4 b5 3.Bd3 Bb7",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Defences",
 "lines": [
  {"id":"st-george-defense","name":"St. George Defense","group":"main","moves":[["e4"],["a6"]],"star":true,"idea":"Black plans a queenside fianchetto and a flexible centre. Unusual, so White must think for themselves early."},
  {"id":"1-e4-a6-2-d4-b5-3-nf3-bb7","name":"1.e4 a6 2.d4 b5 3.Nf3 Bb7","group":"1-e4-a6-2-d4-b5-3-nf3-bb7","moves":[["e4"],["a6"],["d4"],["b5"],["Nf3"],["Bb7"],["Bd3"],["Nf6"],["Qe2"],["e6"]]},
  {"id":"1-e4-a6-2-d4-b5-3-nf3-bb7-2","name":"1.e4 a6 2.d4 b5 3.Nf3 Bb7","group":"1-e4-a6-2-d4-b5-3-nf3-bb7","moves":[["e4"],["a6"],["d4"],["b5"],["Nf3"],["Bb7"],["Bd3"],["Nf6"],["Qe2"],["e6"],["a4"],["c5"]]},
  {"id":"1-e4-a6-2-d4-b5-3-bd3-bb7","name":"1.e4 a6 2.d4 b5 3.Bd3 Bb7","group":"1-e4-a6-2-d4-b5-3-bd3-bb7","moves":[["e4"],["a6"],["d4"],["b5"],["Bd3"],["Bb7"],["Nf3"],["Nf6"],["Qe2"],["e6"],["Nbd2"]],"star":true},
  {"id":"1-e4-a6-2-d4-b5-3-nf3-bb7-3","name":"1.e4 a6 2.d4 b5 3.Nf3 Bb7","group":"1-e4-a6-2-d4-b5-3-nf3-bb7","moves":[["e4"],["a6"],["d4"],["b5"],["Nf3"],["Bb7"],["Bd3"],["e6"],["O-O"]],"star":true}
 ]
};
