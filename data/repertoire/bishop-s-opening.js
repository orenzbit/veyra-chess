// Bishop's Opening — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "bishop-s-opening",
 "name": "Bishop's Opening",
 "color": "w",
 "oneLiner": "1.e4 e5 2.Bc4 — put the bishop on its best diagonal before the knight.",
 "trunk": "1.e4 e5 2.Bc4",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "urusov-gambit": {
   "label": "Urusov Gambit",
   "blurb": ""
  },
  "berlin-defense": {
   "label": "Berlin Defense",
   "blurb": ""
  },
  "vienna-hybrid": {
   "label": "Vienna Hybrid",
   "blurb": ""
  },
  "philidor-counterattack": {
   "label": "Philidor Counterattack",
   "blurb": ""
  },
  "calabrese-countergambit": {
   "label": "Calabrese Countergambit",
   "blurb": ""
  },
  "boi-variation": {
   "label": "Boi Variation",
   "blurb": ""
  },
  "lewis-countergambit": {
   "label": "Lewis Countergambit",
   "blurb": ""
  },
  "classical-defense": {
   "label": "Classical Defense",
   "blurb": ""
  },
  "pratt-variation": {
   "label": "Pratt Variation",
   "blurb": ""
  },
  "lisitsyn-gambit": {
   "label": "Lisitsyn Gambit",
   "blurb": ""
  },
  "wing-gambit": {
   "label": "Wing Gambit",
   "blurb": ""
  },
  "ponziani-gambit": {
   "label": "Ponziani Gambit",
   "blurb": ""
  },
  "del-rio-variation": {
   "label": "Del Rio Variation",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Classical",
 "lines": [
  {"id":"bishop-s-opening","name":"Bishop's Opening","group":"main","moves":[["e4"],["e5"],["Bc4"]],"star":true,"idea":"The bishop eyes f7 right away. White keeps options for d4 or f4 later and avoids the heavy theory of the Ruy Lopez and Italian."},
  {"id":"urusov-gambit","name":"Urusov Gambit","group":"urusov-gambit","moves":[["e4"],["e5"],["Bc4"],["Nf6"],["d4"],["exd4"],["Nf3"]],"star":true},
  {"id":"berlin-defense","name":"Berlin Defense","group":"berlin-defense","moves":[["e4"],["e5"],["Bc4"],["Nf6"]],"star":true},
  {"id":"vienna-hybrid","name":"Vienna Hybrid","group":"vienna-hybrid","moves":[["e4"],["e5"],["Bc4"],["Nf6"],["Nc3"]],"star":true},
  {"id":"philidor-counterattack","name":"Philidor Counterattack","group":"philidor-counterattack","moves":[["e4"],["e5"],["Bc4"],["c6"]],"star":true},
  {"id":"calabrese-countergambit","name":"Calabrese Countergambit","group":"calabrese-countergambit","moves":[["e4"],["e5"],["Bc4"],["f5"]],"star":true},
  {"id":"boi-variation","name":"Boi Variation","group":"boi-variation","moves":[["e4"],["e5"],["Bc4"],["Nc6"],["Qh5"]],"star":true},
  {"id":"lewis-countergambit","name":"Lewis Countergambit","group":"lewis-countergambit","moves":[["e4"],["e5"],["Bc4"],["Bc5"],["Nf3"]],"star":true},
  {"id":"classical-defense","name":"Classical Defense","group":"classical-defense","moves":[["e4"],["e5"],["Bc4"],["Bc5"]],"star":true},
  {"id":"pratt-variation","name":"Pratt Variation","group":"pratt-variation","moves":[["e4"],["e5"],["Bc4"],["Nf6"],["d3"],["c6"]],"star":true},
  {"id":"lisitsyn-gambit","name":"Lisitsyn Gambit","group":"lisitsyn-gambit","moves":[["e4"],["e5"],["Bc4"],["Nf6"],["Nf3"],["Nxe4"],["Nxe5"],["Qe7"]],"star":true},
  {"id":"wing-gambit","name":"Wing Gambit","group":"wing-gambit","moves":[["e4"],["e5"],["Bc4"],["Nf6"],["b4"]],"star":true},
  {"id":"ponziani-gambit","name":"Ponziani Gambit","group":"ponziani-gambit","moves":[["e4"],["e5"],["Bc4"],["Nf6"],["d4"],["exd4"],["Nf3"],["Nc6"]],"star":true},
  {"id":"del-rio-variation","name":"Del Rio Variation","group":"del-rio-variation","moves":[["e4"],["e5"],["Bc4"],["Nf6"],["Nf3"],["Nxe4"]],"star":true}
 ]
};
