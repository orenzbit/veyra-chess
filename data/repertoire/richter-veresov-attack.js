// Richter-Veresov Attack — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "richter-veresov-attack",
 "name": "Richter-Veresov Attack",
 "color": "w",
 "oneLiner": "1.d4 d5 2.Nc3 Nf6 3.Bg5 — develop actively and keep an edge in activity.",
 "trunk": "1.d4",
 "groups": {
  "veresov-opening": {
   "label": "Veresov Opening",
   "blurb": ""
  },
  "classical-defense": {
   "label": "Classical Defense",
   "blurb": ""
  },
  "veresov-gambit": {
   "label": "Veresov Gambit",
   "blurb": ""
  },
  "armand-variation": {
   "label": "Armand Variation",
   "blurb": ""
  },
  "carlsbad-variation": {
   "label": "Carlsbad Variation",
   "blurb": ""
  },
  "mason-gambit": {
   "label": "Mason Gambit",
   "blurb": ""
  },
  "mason-variation": {
   "label": "Mason Variation",
   "blurb": ""
  },
  "dubois-gambit": {
   "label": "Dubois Gambit",
   "blurb": ""
  },
  "mason": {
   "label": "Mason",
   "blurb": ""
  },
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "boyce-defense": {
   "label": "Boyce Defense",
   "blurb": ""
  },
  "malich-gambit": {
   "label": "Malich Gambit",
   "blurb": ""
  },
  "richter-variation": {
   "label": "Richter Variation",
   "blurb": ""
  },
  "veresov-variation": {
   "label": "Veresov Variation",
   "blurb": ""
  },
  "two-knights-system": {
   "label": "Two Knights System",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Systems",
 "lines": [
  {"id":"veresov-opening","name":"Veresov Opening","group":"veresov-opening","moves":[["d4"],["d5"],["Nc3"]],"star":true,"idea":"White puts pieces on active squares and avoids main lines. Good for players who prefer ideas to theory."},
  {"id":"richter-veresov-attack","name":"Richter-Veresov Attack","group":"veresov-opening","moves":[["d4"],["d5"],["Nc3"],["Nf6"],["Bg5"],["Nbd7"]]},
  {"id":"classical-defense","name":"Classical Defense","group":"classical-defense","moves":[["d4"],["d5"],["Nc3"],["Nf6"],["Bg5"],["Bf5"]],"star":true},
  {"id":"veresov-gambit","name":"Veresov Gambit","group":"veresov-gambit","moves":[["d4"],["d5"],["Nc3"],["Nf6"],["Bg5"],["Nbd7"],["Nf3"],["g6"]],"star":true},
  {"id":"armand-variation","name":"Armand Variation","group":"armand-variation","moves":[["d4"],["d5"],["Nc3"],["Nf6"],["Bg5"],["Bf5"],["Bxf6"],["exf6"]],"star":true},
  {"id":"carlsbad-variation","name":"Carlsbad Variation","group":"carlsbad-variation","moves":[["d4"],["d5"],["Nc3"],["Nf6"],["Bg5"],["Nbd7"],["e3"],["g6"]],"star":true},
  {"id":"mason-gambit","name":"Mason Gambit","group":"mason-gambit","moves":[["d4"],["d5"],["Nc3"],["Nf6"],["Bg5"],["Nbd7"],["Nf3"],["h6"]],"star":true},
  {"id":"mason-variation","name":"Mason Variation","group":"mason-variation","moves":[["d4"],["d5"],["Nc3"],["Nf6"],["Bg5"],["Nbd7"],["Nf3"],["e6"]],"star":true},
  {"id":"dubois-gambit","name":"Dubois Gambit","group":"dubois-gambit","moves":[["d4"],["d5"],["Nc3"],["Nf6"],["Bg5"],["e6"]],"star":true},
  {"id":"mason-f3","name":"Mason, f3","group":"mason","moves":[["d4"],["d5"],["Nc3"],["Nf6"],["Bg5"],["Nbd7"],["f3"]],"star":true},
  {"id":"richter-veresov-attack-2","name":"Richter-Veresov Attack","group":"main","moves":[["d4"],["Nf6"],["Nc3"],["d5"],["Bg5"]],"star":true},
  {"id":"boyce-defense","name":"Boyce Defense","group":"boyce-defense","moves":[["d4"],["Nf6"],["Nc3"],["d5"],["Bg5"],["Ne4"]],"star":true},
  {"id":"malich-gambit","name":"Malich Gambit","group":"malich-gambit","moves":[["d4"],["Nf6"],["Nc3"],["d5"],["Bg5"],["c5"],["Bxf6"],["gxf6"],["e4"],["dxe4"],["d5"]],"star":true},
  {"id":"richter-variation","name":"Richter Variation","group":"richter-variation","moves":[["d4"],["Nf6"],["Nc3"],["d5"],["Bg5"],["Bf5"],["f3"]],"star":true},
  {"id":"veresov-variation","name":"Veresov Variation","group":"veresov-variation","moves":[["d4"],["Nf6"],["Nc3"],["d5"],["Bg5"],["Bf5"],["Bxf6"]],"star":true},
  {"id":"two-knights-system","name":"Two Knights System","group":"two-knights-system","moves":[["d4"],["Nf6"],["Nc3"],["d5"],["Bg5"],["Nbd7"],["Nf3"]],"star":true},
  {"id":"two-knights-system-grunfeld-defense","name":"Two Knights System, Grünfeld Defense","group":"two-knights-system","moves":[["d4"],["Nf6"],["Nc3"],["d5"],["Bg5"],["Nbd7"],["Nf3"],["g6"]]}
 ]
};
