// Réti Opening — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "reti-opening",
 "name": "Réti Opening",
 "color": "w",
 "oneLiner": "1.Nf3 — develop first and control the centre from a distance.",
 "trunk": "1.Nf3",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "reversed-slav": {
   "label": "Reversed Slav",
   "blurb": ""
  },
  "king-s-indian-attack": {
   "label": "King's Indian Attack",
   "blurb": ""
  },
  "anglo-slav": {
   "label": "Anglo-Slav",
   "blurb": ""
  },
  "advance-variation": {
   "label": "Advance Variation",
   "blurb": ""
  },
  "nimzowitsch-attack": {
   "label": "Nimzowitsch Attack",
   "blurb": ""
  },
  "queen-s-gambit-accepted-reversed": {
   "label": "Queen's Gambit Accepted Reversed",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Systems",
 "lines": [
  {"id":"reti-opening","name":"Réti Opening","group":"main","moves":[["Nf3"]],"star":true,"idea":"White fianchettos and strikes in the centre later with c4. Flexible, with a hypermodern feel."},
  {"id":"reversed-slav","name":"Reversed Slav","group":"reversed-slav","moves":[["Nf3"],["d5"],["c4"],["c6"]],"star":true},
  {"id":"king-s-indian-attack","name":"King's Indian Attack","group":"king-s-indian-attack","moves":[["Nf3"],["d5"],["g3"],["Nf6"],["Bg2"],["e6"],["O-O"]],"star":true},
  {"id":"anglo-slav","name":"Anglo-Slav","group":"anglo-slav","moves":[["Nf3"],["d5"],["c4"],["c6"],["b3"]],"star":true},
  {"id":"advance-variation","name":"Advance Variation","group":"advance-variation","moves":[["Nf3"],["d5"],["c4"],["d4"]],"star":true},
  {"id":"nimzowitsch-attack","name":"Nimzowitsch Attack","group":"nimzowitsch-attack","moves":[["Nf3"],["d5"],["b3"]],"star":true},
  {"id":"queen-s-gambit-accepted-reversed","name":"Queen's Gambit Accepted Reversed","group":"queen-s-gambit-accepted-reversed","moves":[["Nf3"],["d5"],["c4"],["dxc4"]],"star":true}
 ]
};
