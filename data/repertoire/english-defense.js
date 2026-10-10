// English Defense — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "english-defense",
 "name": "English Defense",
 "color": "b",
 "oneLiner": "1.d4 e6 2.c4 b6 — queen's bishop fianchetto against d4 and c4.",
 "trunk": "1.d4 e6 2.c4 b6",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "hartlaub-gambit": {
   "label": "Hartlaub Gambit",
   "blurb": ""
  },
  "perrin-variation": {
   "label": "Perrin Variation",
   "blurb": ""
  },
  "polish-variation": {
   "label": "Polish Variation",
   "blurb": ""
  },
  "orthodox-variation": {
   "label": "Orthodox Variation",
   "blurb": ""
  },
  "seirawan-variation": {
   "label": "Seirawan Variation",
   "blurb": ""
  },
  "birmingham-gambit": {
   "label": "Birmingham Gambit",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Defences",
 "lines": [
  {"id":"main","name":"Main","group":"main","moves":[["d4"],["e6"],["c4"],["b6"],["e4"],["Bb7"]],"star":true,"idea":"Black aims at the centre with the bishop on b7 and keeps flexible pawn structure choices."},
  {"id":"hartlaub-gambit","name":"Hartlaub Gambit","group":"hartlaub-gambit","moves":[["d4"],["e6"],["c4"],["b6"],["e4"],["Bb7"],["Bd3"],["f5"]],"star":true},
  {"id":"perrin-variation","name":"Perrin Variation","group":"perrin-variation","moves":[["d4"],["e6"],["c4"],["b6"],["Nc3"],["Bb7"],["e4"]],"star":true},
  {"id":"polish-variation","name":"Polish Variation","group":"polish-variation","moves":[["d4"],["e6"],["c4"],["b6"],["Nc3"],["Bb7"],["a3"]],"star":true},
  {"id":"orthodox-variation","name":"Orthodox Variation","group":"orthodox-variation","moves":[["d4"],["e6"],["c4"],["b6"],["Nf3"],["Bb7"]],"star":true},
  {"id":"seirawan-variation","name":"Seirawan Variation","group":"seirawan-variation","moves":[["d4"],["e6"],["c4"],["b6"],["e4"],["Bb7"],["Bd3"],["Bb4+"]],"star":true},
  {"id":"birmingham-gambit","name":"Birmingham Gambit","group":"birmingham-gambit","moves":[["d4"],["e6"],["c4"],["b6"],["e4"],["Bb7"],["Bd3"],["c5"]],"star":true}
 ]
};
