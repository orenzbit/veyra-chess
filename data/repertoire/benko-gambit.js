// Benko Gambit — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "benko-gambit",
 "name": "Benko Gambit",
 "color": "b",
 "oneLiner": "1.d4 Nf6 2.c4 c5 3.d5 b5 — give a pawn for long-term queenside pressure.",
 "trunk": "1.d4 Nf6 2.c4 c5 3.d5 b5",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "fully-accepted": {
   "label": "Fully Accepted",
   "blurb": ""
  },
  "half-accepted": {
   "label": "Half-Accepted",
   "blurb": ""
  },
  "declined": {
   "label": "Declined",
   "blurb": ""
  },
  "accepted": {
   "label": "Accepted",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Gambits",
 "lines": [
  {"id":"benko-gambit","name":"Benko Gambit","group":"main","moves":[["d4"],["Nf6"],["c4"],["c5"],["d5"],["b5"]],"star":true,"idea":"Black sacrifices the b-pawn to open files for the rooks and bishop. The pressure remains even in endgames."},
  {"id":"fully-accepted-fianchetto","name":"Fully Accepted, Fianchetto","group":"fully-accepted","moves":[["d4"],["Nf6"],["c4"],["c5"],["d5"],["b5"],["cxb5"],["a6"],["bxa6"],["Bxa6"],["Nc3"],["d6"],["e4"],["Bxf1"],["Kxf1"],["g6"],["g3"],["Bg7"],["Kg2"],["O-O"],["Nf3"]],"star":true},
  {"id":"fully-accepted-nbd7","name":"Fully Accepted, Nbd7","group":"fully-accepted","moves":[["d4"],["Nf6"],["c4"],["c5"],["d5"],["b5"],["cxb5"],["a6"],["bxa6"],["g6"],["Nc3"],["Bxa6"],["e4"],["Bxf1"],["Kxf1"],["d6"],["Nf3"],["Bg7"],["g3"],["O-O"],["Kg2"],["Nbd7"]]},
  {"id":"half-accepted-zaitsev","name":"Half-Accepted, Zaitsev","group":"half-accepted","moves":[["d4"],["Nf6"],["c4"],["c5"],["d5"],["b5"],["cxb5"],["a6"],["Nc3"],["axb5"],["e4"],["b4"],["Nb5"],["d6"]],"star":true},
  {"id":"declined-nf3","name":"Declined, Nf3","group":"declined","moves":[["d4"],["Nf6"],["c4"],["c5"],["d5"],["b5"],["Nf3"]],"star":true},
  {"id":"accepted","name":"Accepted","group":"accepted","moves":[["d4"],["Nf6"],["c4"],["c5"],["d5"],["b5"],["cxb5"],["a6"]],"star":true}
 ]
};
