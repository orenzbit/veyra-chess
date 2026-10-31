// Latvian Gambit — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "latvian-gambit",
 "name": "Latvian Gambit",
 "color": "b",
 "oneLiner": "1.e4 e5 2.Nf3 f5 — an all-in counterattack with a big hole on f5.",
 "trunk": "1.e4 e5 2.Nf3 f5",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "accepted": {
   "label": "Accepted",
   "blurb": ""
  },
  "greco-variation": {
   "label": "Greco Variation",
   "blurb": ""
  },
  "corkscrew": {
   "label": "Corkscrew",
   "blurb": ""
  },
  "foltys-variation": {
   "label": "Foltys Variation",
   "blurb": ""
  },
  "nimzowitsch-variation": {
   "label": "Nimzowitsch Variation",
   "blurb": ""
  },
  "bronstein-gambit": {
   "label": "Bronstein Gambit",
   "blurb": ""
  },
  "fraser-defense": {
   "label": "Fraser Defense",
   "blurb": ""
  },
  "diepstraten-countergambit": {
   "label": "Diepstraten Countergambit",
   "blurb": ""
  },
  "corkscrew-countergambit": {
   "label": "Corkscrew Countergambit",
   "blurb": ""
  },
  "mayet-attack": {
   "label": "Mayet Attack",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Gambits",
 "lines": [
  {"id":"latvian-gambit","name":"Latvian Gambit","group":"main","moves":[["e4"],["e5"],["Nf3"],["f5"]],"star":true,"idea":"Black attacks White's centre on move two and accepts weaknesses. Good practical chances against beginners, risky against theory."},
  {"id":"accepted","name":"Accepted","group":"accepted","moves":[["e4"],["e5"],["Nf3"],["f5"],["Nxe5"],["Qf6"],["d4"],["d6"],["Nc4"],["fxe4"],["Nc3"],["Qg6"]],"star":true},
  {"id":"greco-variation","name":"Greco Variation","group":"greco-variation","moves":[["e4"],["e5"],["Nf3"],["f5"],["Bc4"],["fxe4"],["Nxe5"],["Qg5"]],"star":true},
  {"id":"corkscrew","name":"Corkscrew","group":"corkscrew","moves":[["e4"],["e5"],["Nf3"],["f5"],["Nxe5"],["Nc6"]],"star":true},
  {"id":"foltys-variation","name":"Foltys Variation","group":"foltys-variation","moves":[["e4"],["e5"],["Nf3"],["f5"],["Nxe5"],["Qf6"],["d4"],["d6"],["Nc4"],["fxe4"],["Nc3"],["Qg6"],["Ne3"],["c6"]],"star":true},
  {"id":"nimzowitsch-variation","name":"Nimzowitsch Variation","group":"nimzowitsch-variation","moves":[["e4"],["e5"],["Nf3"],["f5"],["d4"]],"star":true},
  {"id":"bronstein-gambit","name":"Bronstein Gambit","group":"bronstein-gambit","moves":[["e4"],["e5"],["Nf3"],["f5"],["exf5"],["e4"]],"star":true},
  {"id":"fraser-defense","name":"Fraser Defense","group":"fraser-defense","moves":[["e4"],["e5"],["Nf3"],["f5"],["Nxe5"],["Qf6"],["d4"],["d6"],["Nc4"],["fxe4"],["Nc3"],["Qg6"],["Ne3"],["Nf6"]],"star":true},
  {"id":"diepstraten-countergambit","name":"Diepstraten Countergambit","group":"diepstraten-countergambit","moves":[["e4"],["e5"],["Nf3"],["f5"],["c4"]],"star":true},
  {"id":"corkscrew-countergambit","name":"Corkscrew Countergambit","group":"corkscrew-countergambit","moves":[["e4"],["e5"],["Nf3"],["f5"],["Bc4"],["fxe4"],["Nxe5"],["Nf6"]],"star":true},
  {"id":"mayet-attack","name":"Mayet Attack","group":"mayet-attack","moves":[["e4"],["e5"],["Nf3"],["f5"],["Bc4"]],"star":true}
 ]
};
