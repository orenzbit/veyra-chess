// Catalan Opening — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "catalan-opening",
 "name": "Catalan Opening",
 "color": "w",
 "oneLiner": "1.d4 Nf6 2.c4 e6 3.g3 — fianchetto the bishop for long-term pressure.",
 "trunk": "1.d4 Nf6 2.c4 e6 3.g3",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "open-variation": {
   "label": "Open Variation",
   "blurb": ""
  },
  "closed-variation": {
   "label": "Closed Variation",
   "blurb": ""
  },
  "open": {
   "label": "Open",
   "blurb": ""
  },
  "closed": {
   "label": "Closed",
   "blurb": ""
  },
  "bogo-catalan": {
   "label": "Bogo-Catalan",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Systems",
 "lines": [
  {"id":"catalan-opening","name":"Catalan Opening","group":"main","moves":[["d4"],["Nf6"],["c4"],["e6"],["g3"]],"star":true,"idea":"White's bishop on g2 presses on the long diagonal against b7 and the queenside. A strategic opening with a small, lasting edge."},
  {"id":"open-variation","name":"Open Variation","group":"open-variation","moves":[["d4"],["Nf6"],["c4"],["e6"],["g3"],["d5"],["Bg2"],["dxc4"]],"star":true},
  {"id":"closed-variation","name":"Closed Variation","group":"closed-variation","moves":[["d4"],["Nf6"],["c4"],["e6"],["g3"],["d5"],["Bg2"],["Be7"],["Nf3"],["O-O"],["O-O"]],"star":true},
  {"id":"open-bd2","name":"Open, Bd2","group":"open","moves":[["d4"],["Nf6"],["c4"],["e6"],["g3"],["d5"],["Bg2"],["dxc4"],["Nf3"],["a6"],["Qc2"],["Bb4+"]],"star":true},
  {"id":"open-qa4","name":"Open, Qa4+","group":"open","moves":[["d4"],["Nf6"],["c4"],["e6"],["g3"],["d5"],["Bg2"],["dxc4"],["Qa4+"],["c6"],["Qxc4"],["b5"]]},
  {"id":"closed-spassky-bd2","name":"Closed, Spassky, Bd2","group":"closed","moves":[["d4"],["Nf6"],["c4"],["e6"],["g3"],["d5"],["Bg2"],["Be7"],["Nf3"],["O-O"],["O-O"],["Nbd7"],["Nbd2"]],"star":true},
  {"id":"bogo-catalan","name":"Bogo-Catalan","group":"bogo-catalan","moves":[["d4"],["Nf6"],["c4"],["e6"],["g3"],["Bb4+"]],"star":true},
  {"id":"open-qc2-and-qxc4","name":"Open, Qc2 and Qxc4","group":"open","moves":[["d4"],["Nf6"],["c4"],["e6"],["g3"],["d5"],["Bg2"],["dxc4"],["Nf3"],["Be7"],["O-O"],["O-O"],["Qc2"],["a6"],["Qxc4"],["b5"],["Qc2"],["Bb7"]]},
  {"id":"closed-qc2-a4","name":"Closed, Qc2 a4","group":"closed","moves":[["d4"],["Nf6"],["c4"],["e6"],["g3"],["d5"],["Bg2"],["Be7"],["Nf3"],["O-O"],["O-O"],["dxc4"],["Qc2"],["a6"],["a4"],["Bd7"],["Qxc4"],["Bc6"],["Bg5"]]},
  {"id":"closed-6-c6","name":"Closed, 6...c6","group":"closed","moves":[["d4"],["Nf6"],["c4"],["e6"],["g3"],["d5"],["Bg2"],["Be7"],["Nf3"],["O-O"],["O-O"],["c6"],["Qc2"],["Nbd7"],["Nbd2"],["b6"],["e4"],["Bb7"]]}
 ]
};
