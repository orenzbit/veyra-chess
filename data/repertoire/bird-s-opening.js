// Bird's Opening — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "bird-s-opening",
 "name": "Bird's Opening",
 "color": "w",
 "oneLiner": "1.f4 — seize e5 with the f-pawn and play for a kingside attack.",
 "trunk": "1.f4",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "from-s-gambit": {
   "label": "From's Gambit",
   "blurb": ""
  },
  "from-s-gambit-accepted": {
   "label": "From's Gambit Accepted",
   "blurb": ""
  },
  "dutch-variation": {
   "label": "Dutch Variation",
   "blurb": ""
  },
  "dutch": {
   "label": "Dutch",
   "blurb": ""
  },
  "lasker-variation": {
   "label": "Lasker Variation",
   "blurb": ""
  },
  "swiss-gambit": {
   "label": "Swiss Gambit",
   "blurb": ""
  },
  "hobbs-gambit": {
   "label": "Hobbs Gambit",
   "blurb": ""
  },
  "mujannah-formation": {
   "label": "Mujannah Formation",
   "blurb": ""
  },
  "williams-gambit": {
   "label": "Williams Gambit",
   "blurb": ""
  },
  "sicilian-defense": {
   "label": "Sicilian Defense",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Systems",
 "lines": [
  {"id":"bird-s-opening","name":"Bird's Opening","group":"main","moves":[["f4"]],"star":true,"idea":"White controls the e5 square and builds a Dutch-like setup in reverse. It weakens the king a little, but it is uncommon and surprising."},
  {"id":"from-s-gambit","name":"From's Gambit","group":"from-s-gambit","moves":[["f4"],["e5"]],"star":true},
  {"id":"from-s-gambit-accepted","name":"From's Gambit Accepted","group":"from-s-gambit-accepted","moves":[["f4"],["e5"],["fxe5"],["d6"]],"star":true},
  {"id":"dutch-variation","name":"Dutch Variation","group":"dutch-variation","moves":[["f4"],["f5"]],"star":true},
  {"id":"dutch-classical","name":"Dutch, Classical","group":"dutch","moves":[["f4"],["d5"],["Nf3"],["Nf6"],["e3"],["g6"],["Be2"],["Bg7"],["O-O"],["O-O"],["d3"],["c5"]],"star":true},
  {"id":"dutch-stonewall","name":"Dutch, Stonewall","group":"dutch","moves":[["f4"],["d5"],["Nf3"],["Nf6"],["e3"],["e6"],["Be2"],["Be7"],["O-O"],["O-O"],["b3"],["c5"]]},
  {"id":"lasker-variation","name":"Lasker Variation","group":"lasker-variation","moves":[["f4"],["d5"],["Nf3"],["Nf6"],["e3"],["c5"],["b3"],["Nc6"],["Bb2"],["e6"]],"star":true},
  {"id":"swiss-gambit","name":"Swiss Gambit","group":"swiss-gambit","moves":[["f4"],["f5"],["e4"],["fxe4"],["Nc3"],["Nf6"],["g4"]],"star":true},
  {"id":"hobbs-gambit","name":"Hobbs Gambit","group":"hobbs-gambit","moves":[["f4"],["d5"],["g4"]],"star":true},
  {"id":"mujannah-formation","name":"Mujannah Formation","group":"mujannah-formation","moves":[["f4"],["d5"],["Nf3"],["Nf6"],["e3"],["g6"],["b3"],["Bg7"],["Bb2"],["O-O"],["Be2"],["c5"]],"star":true},
  {"id":"williams-gambit","name":"Williams Gambit","group":"williams-gambit","moves":[["f4"],["f5"],["e4"],["fxe4"],["Nc3"],["Nf6"],["Qe2"]],"star":true},
  {"id":"sicilian-defense","name":"Sicilian Defense","group":"sicilian-defense","moves":[["f4"],["c5"]],"star":true}
 ]
};
