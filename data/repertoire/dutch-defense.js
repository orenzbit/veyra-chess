// Dutch Defense — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "dutch-defense",
 "name": "Dutch Defense",
 "color": "b",
 "oneLiner": "1.d4 f5 — fight for e4 with the f-pawn, aim for the attack.",
 "trunk": "1.d4 f5",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "staunton-gambit": {
   "label": "Staunton Gambit",
   "blurb": ""
  },
  "leningrad-variation": {
   "label": "Leningrad Variation",
   "blurb": ""
  },
  "stonewall-variation": {
   "label": "Stonewall Variation",
   "blurb": ""
  },
  "classical-variation": {
   "label": "Classical Variation",
   "blurb": ""
  },
  "leningrad": {
   "label": "Leningrad",
   "blurb": ""
  },
  "stonewall": {
   "label": "Stonewall",
   "blurb": ""
  },
  "classical": {
   "label": "Classical",
   "blurb": ""
  },
  "alapin-variation": {
   "label": "Alapin Variation",
   "blurb": ""
  },
  "hopton-attack": {
   "label": "Hopton Attack",
   "blurb": ""
  },
  "fianchetto-attack": {
   "label": "Fianchetto Attack",
   "blurb": ""
  },
  "fianchetto-variation": {
   "label": "Fianchetto Variation",
   "blurb": ""
  },
  "raphael-variation": {
   "label": "Raphael Variation",
   "blurb": ""
  },
  "korchnoi-attack": {
   "label": "Korchnoi Attack",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Defences",
 "lines": [
  {"id":"dutch-defense","name":"Dutch Defense","group":"main","moves":[["d4"],["f5"]],"star":true,"idea":"Black takes control of e4 and aims for a kingside attack. The weakened king means you must develop carefully."},
  {"id":"staunton-gambit","name":"Staunton Gambit","group":"staunton-gambit","moves":[["d4"],["f5"],["e4"]],"star":true},
  {"id":"leningrad-variation","name":"Leningrad Variation","group":"leningrad-variation","moves":[["d4"],["f5"],["g3"],["Nf6"],["Bg2"],["g6"]],"star":true},
  {"id":"stonewall-variation","name":"Stonewall Variation","group":"stonewall-variation","moves":[["d4"],["f5"],["g3"],["Nf6"],["Bg2"],["e6"],["Nf3"],["d5"],["O-O"],["Bd6"],["c4"],["c6"]],"star":true},
  {"id":"classical-variation","name":"Classical Variation","group":"classical-variation","moves":[["d4"],["f5"],["c4"],["Nf6"],["g3"],["e6"],["Bg2"],["Be7"],["Nf3"],["O-O"],["O-O"],["d6"]],"star":true},
  {"id":"leningrad-main-line","name":"Leningrad, Main Line","group":"leningrad","moves":[["d4"],["f5"],["g3"],["Nf6"],["Bg2"],["g6"],["Nf3"],["Bg7"],["O-O"],["O-O"],["c4"],["d6"],["Nc3"],["Qe8"]],"star":true},
  {"id":"leningrad-nc6","name":"Leningrad, Nc6","group":"leningrad","moves":[["d4"],["f5"],["g3"],["Nf6"],["Bg2"],["g6"],["Nf3"],["Bg7"],["O-O"],["O-O"],["c4"],["d6"],["Nc3"],["Nc6"],["d5"],["Ne5"],["Nxe5"],["dxe5"]]},
  {"id":"stonewall-ilyin-zhenevsky","name":"Stonewall, Ilyin-Zhenevsky","group":"stonewall","moves":[["d4"],["f5"],["c4"],["Nf6"],["g3"],["e6"],["Bg2"],["d5"],["Nf3"],["c6"],["O-O"],["Bd6"],["b3"],["Qe7"],["Ba3"],["Bxa3"],["Nxa3"],["O-O"]],"star":true},
  {"id":"classical-qe8","name":"Classical, Qe8","group":"classical","moves":[["d4"],["f5"],["c4"],["Nf6"],["g3"],["e6"],["Bg2"],["Be7"],["Nc3"],["O-O"],["Nf3"],["d6"],["O-O"],["Qe8"]],"star":true},
  {"id":"staunton-gambit-bg5","name":"Staunton Gambit, Bg5","group":"staunton-gambit","moves":[["d4"],["f5"],["e4"],["fxe4"],["Nc3"],["Nf6"],["Bg5"],["e6"],["Nxe4"],["Be7"],["Bxf6"],["Bxf6"],["Nf3"],["O-O"]]},
  {"id":"alapin-variation","name":"Alapin Variation","group":"alapin-variation","moves":[["d4"],["f5"],["Bg5"],["Nf6"],["Bxf6"],["exf6"],["e3"],["d5"],["Nd2"],["Bd6"]],"star":true},
  {"id":"hopton-attack","name":"Hopton Attack","group":"hopton-attack","moves":[["d4"],["f5"],["Bg5"]],"star":true},
  {"id":"fianchetto-attack","name":"Fianchetto Attack","group":"fianchetto-attack","moves":[["d4"],["f5"],["g3"]],"star":true},
  {"id":"fianchetto-variation","name":"Fianchetto Variation","group":"fianchetto-variation","moves":[["d4"],["f5"],["c4"],["Nf6"],["g3"]],"star":true},
  {"id":"raphael-variation","name":"Raphael Variation","group":"raphael-variation","moves":[["d4"],["f5"],["Nc3"]],"star":true},
  {"id":"korchnoi-attack","name":"Korchnoi Attack","group":"korchnoi-attack","moves":[["d4"],["f5"],["h3"]],"star":true}
 ]
};
