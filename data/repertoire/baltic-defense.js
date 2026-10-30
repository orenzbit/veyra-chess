// Baltic Defense — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "baltic-defense",
 "name": "Baltic Defense",
 "color": "b",
 "oneLiner": "1.d4 d5 2.c4 Bf5 — get the bishop out early, before ...e6.",
 "trunk": "1.d4 d5",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "queen-attack": {
   "label": "Queen Attack",
   "blurb": ""
  },
  "queen-attack-deferred": {
   "label": "Queen Attack Deferred",
   "blurb": ""
  },
  "pseudo-chigorin": {
   "label": "Pseudo-Chigorin",
   "blurb": ""
  },
  "pseudo-slav": {
   "label": "Pseudo-Slav",
   "blurb": ""
  },
  "argentinian-gambit": {
   "label": "Argentinian Gambit",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Defences",
 "lines": [
  {"id":"baltic-defense","name":"Baltic Defense","group":"main","moves":[["d4"],["d5"],["c4"],["Bf5"]],"star":true,"idea":"Black develops the light bishop outside the pawn chain at once and keeps a solid structure."},
  {"id":"queen-attack","name":"Queen Attack","group":"queen-attack","moves":[["d4"],["d5"],["c4"],["Bf5"],["Qb3"]],"star":true},
  {"id":"queen-attack-deferred","name":"Queen Attack Deferred","group":"queen-attack-deferred","moves":[["d4"],["d5"],["c4"],["Bf5"],["Nc3"],["e6"],["Qb3"]],"star":true},
  {"id":"pseudo-chigorin","name":"Pseudo-Chigorin","group":"pseudo-chigorin","moves":[["d4"],["d5"],["c4"],["Bf5"],["Nc3"],["e6"],["Nf3"],["Nc6"]],"star":true},
  {"id":"pseudo-slav","name":"Pseudo-Slav","group":"pseudo-slav","moves":[["d4"],["d5"],["Nf3"],["Bf5"],["c4"],["e6"],["Nc3"],["c6"]],"star":true},
  {"id":"argentinian-gambit","name":"Argentinian Gambit","group":"argentinian-gambit","moves":[["d4"],["d5"],["c4"],["Bf5"],["cxd5"],["Bxb1"],["Qa4+"],["c6"],["dxc6"],["Nxc6"]],"star":true}
 ]
};
