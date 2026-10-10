// Old Indian Defense — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "old-indian-defense",
 "name": "Old Indian Defense",
 "color": "b",
 "oneLiner": "1.d4 Nf6 2.c4 d6 — a solid setup with ...e5 to follow.",
 "trunk": "1.d4 Nf6 2.c4 d6",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "main-line": {
   "label": "Main Line",
   "blurb": ""
  },
  "ukrainian-variation": {
   "label": "Ukrainian Variation",
   "blurb": ""
  },
  "fianchetto-variation": {
   "label": "Fianchetto Variation",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Defences",
 "lines": [
  {"id":"old-indian-defense","name":"Old Indian Defense","group":"main","moves":[["d4"],["Nf6"],["c4"],["d6"]],"star":true,"idea":"Black builds a compact structure and aims to strike in the centre later. Safe, if a little passive."},
  {"id":"main-line","name":"Main Line","group":"main-line","moves":[["d4"],["Nf6"],["c4"],["d6"],["Nc3"],["Nbd7"],["e4"],["e5"],["Nf3"],["Be7"],["Be2"],["O-O"],["O-O"],["c6"]],"star":true},
  {"id":"ukrainian-variation","name":"Ukrainian Variation","group":"ukrainian-variation","moves":[["d4"],["Nf6"],["c4"],["d6"],["Nc3"],["Nbd7"],["e4"],["e5"],["Nf3"],["c6"],["Be2"],["Be7"],["O-O"],["O-O"],["Re1"]],"star":true},
  {"id":"fianchetto-variation","name":"Fianchetto Variation","group":"fianchetto-variation","moves":[["d4"],["Nf6"],["c4"],["d6"],["Nc3"],["e5"],["Nf3"],["Nbd7"],["g3"],["c6"],["Bg2"],["Be7"],["O-O"],["O-O"]],"star":true}
 ]
};
