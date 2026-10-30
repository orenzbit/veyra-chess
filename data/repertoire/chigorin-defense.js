// Chigorin Defense — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "chigorin-defense",
 "name": "Chigorin Defense",
 "color": "b",
 "oneLiner": "1.d4 d5 2.c4 Nc6 — develop a piece and fight the centre with pieces.",
 "trunk": "1.d4 d5 2.c4 Nc6",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "main-line": {
   "label": "Main Line",
   "blurb": ""
  },
  "modern-gambit": {
   "label": "Modern Gambit",
   "blurb": ""
  },
  "lazard-gambit": {
   "label": "Lazard Gambit",
   "blurb": ""
  },
  "tartakower-gambit": {
   "label": "Tartakower Gambit",
   "blurb": ""
  },
  "exchange-variation": {
   "label": "Exchange Variation",
   "blurb": ""
  },
  "janowski-variation": {
   "label": "Janowski Variation",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Defences",
 "lines": [
  {"id":"chigorin-defense","name":"Chigorin Defense","group":"main","moves":[["d4"],["d5"],["c4"],["Nc6"]],"star":true,"idea":"Black develops the knight before the pawns and ignores classic centre rules. Unusual and rewards creative play."},
  {"id":"main-line","name":"Main Line","group":"main-line","moves":[["d4"],["d5"],["c4"],["Nc6"],["Nf3"],["Bg4"]],"star":true},
  {"id":"main-line-alekhine-variation","name":"Main Line, Alekhine Variation","group":"main-line","moves":[["d4"],["d5"],["c4"],["Nc6"],["Nf3"],["Bg4"],["Qa4"]]},
  {"id":"modern-gambit","name":"Modern Gambit","group":"modern-gambit","moves":[["d4"],["d5"],["c4"],["Nc6"],["Nc3"],["dxc4"],["Nf3"],["Nf6"]],"star":true},
  {"id":"lazard-gambit","name":"Lazard Gambit","group":"lazard-gambit","moves":[["d4"],["d5"],["c4"],["Nc6"],["Nf3"],["e5"]],"star":true},
  {"id":"tartakower-gambit","name":"Tartakower Gambit","group":"tartakower-gambit","moves":[["d4"],["d5"],["c4"],["Nc6"],["Nc3"],["e5"]],"star":true},
  {"id":"exchange-variation","name":"Exchange Variation","group":"exchange-variation","moves":[["d4"],["d5"],["c4"],["Nc6"],["cxd5"],["Qxd5"]],"star":true},
  {"id":"exchange-variation-costa-s-line","name":"Exchange Variation, Costa's Line","group":"exchange-variation","moves":[["d4"],["d5"],["c4"],["Nc6"],["cxd5"],["Qxd5"],["e3"],["e5"],["Nc3"],["Bb4"],["Bd2"],["Bxc3"],["Bxc3"],["exd4"],["Ne2"]]},
  {"id":"janowski-variation","name":"Janowski Variation","group":"janowski-variation","moves":[["d4"],["d5"],["c4"],["Nc6"],["Nc3"],["dxc4"],["Nf3"]],"star":true}
 ]
};
