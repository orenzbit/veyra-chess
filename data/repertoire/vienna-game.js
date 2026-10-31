// Vienna Game — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "vienna-game",
 "name": "Vienna Game",
 "color": "w",
 "oneLiner": "1.e4 e5 2.Nc3 — a flexible start that can turn into a fast f4 attack.",
 "trunk": "1.e4 e5 2.Nc3",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "vienna-gambit": {
   "label": "Vienna Gambit",
   "blurb": ""
  },
  "stanley-variation": {
   "label": "Stanley Variation",
   "blurb": ""
  },
  "frankenstein-dracula-variation": {
   "label": "Frankenstein-Dracula Variation",
   "blurb": ""
  },
  "falkbeer-variation": {
   "label": "Falkbeer Variation",
   "blurb": ""
  },
  "mieses-variation": {
   "label": "Mieses Variation",
   "blurb": ""
  },
  "paulsen-variation": {
   "label": "Paulsen Variation",
   "blurb": ""
  },
  "max-lange-defense": {
   "label": "Max Lange Defense",
   "blurb": ""
  },
  "vienna-gambit-accepted": {
   "label": "Vienna Gambit Accepted",
   "blurb": ""
  },
  "hamppe-muzio-gambit": {
   "label": "Hamppe-Muzio Gambit",
   "blurb": ""
  },
  "anderssen-defense": {
   "label": "Anderssen Defense",
   "blurb": ""
  },
  "fyfe-gambit": {
   "label": "Fyfe Gambit",
   "blurb": ""
  },
  "zhuravlev-countergambit": {
   "label": "Zhuravlev Countergambit",
   "blurb": ""
  },
  "1-e4-e5-2-nc3-nc6-3-nf3-nf6": {
   "label": "1.e4 e5 2.Nc3 Nc6 3.Nf3 Nf6",
   "blurb": ""
  },
  "1-e4-e5-2-nc3-nf6-3-bc4-bc5": {
   "label": "1.e4 e5 2.Nc3 Nf6 3.Bc4 Bc5",
   "blurb": ""
  },
  "pierce-gambit": {
   "label": "Pierce Gambit",
   "blurb": ""
  },
  "omaha-gambit": {
   "label": "Omaha Gambit",
   "blurb": ""
  },
  "giraffe-attack": {
   "label": "Giraffe Attack",
   "blurb": ""
  },
  "heyde-variation": {
   "label": "Heyde Variation",
   "blurb": ""
  },
  "mengarini-variation": {
   "label": "Mengarini Variation",
   "blurb": ""
  },
  "philidor-countergambit": {
   "label": "Philidor Countergambit",
   "blurb": ""
  },
  "hamppe-meitner-variation": {
   "label": "Hamppe-Meitner Variation",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Classical",
 "lines": [
  {"id":"vienna-game","name":"Vienna Game","group":"main","moves":[["e4"],["e5"],["Nc3"]],"star":true,"idea":"Develop the knight first, keep f4 in reserve. White stays flexible: quiet development, or a sharp kingside push when Black is careless."},
  {"id":"vienna-gambit","name":"Vienna Gambit","group":"vienna-gambit","moves":[["e4"],["e5"],["Nc3"],["Nf6"],["f4"]],"star":true},
  {"id":"stanley-variation","name":"Stanley Variation","group":"stanley-variation","moves":[["e4"],["e5"],["Nc3"],["Nc6"],["Bc4"],["Nf6"]],"star":true},
  {"id":"frankenstein-dracula-variation","name":"Frankenstein-Dracula Variation","group":"frankenstein-dracula-variation","moves":[["e4"],["e5"],["Nc3"],["Nf6"],["Bc4"],["Nxe4"],["Qh5"],["Nd6"],["Bb3"],["Be7"],["Nf3"],["Nc6"],["Nxe5"],["Nxe5"],["Qxe5"],["O-O"]],"star":true},
  {"id":"falkbeer-variation","name":"Falkbeer Variation","group":"falkbeer-variation","moves":[["e4"],["e5"],["Nc3"],["Nf6"],["Bc4"],["Nxe4"]],"star":true},
  {"id":"mieses-variation","name":"Mieses Variation","group":"mieses-variation","moves":[["e4"],["e5"],["Nc3"],["Nf6"],["g3"]],"star":true},
  {"id":"paulsen-variation","name":"Paulsen Variation","group":"paulsen-variation","moves":[["e4"],["e5"],["Nc3"],["Nf6"],["Bc4"],["Nc6"],["d3"]],"star":true},
  {"id":"max-lange-defense","name":"Max Lange Defense","group":"max-lange-defense","moves":[["e4"],["e5"],["Nc3"],["Nf6"],["f4"],["d5"],["fxe5"],["Nxe4"],["Nf3"],["Be7"],["d4"],["f6"]],"star":true},
  {"id":"vienna-gambit-accepted","name":"Vienna Gambit Accepted","group":"vienna-gambit-accepted","moves":[["e4"],["e5"],["Nc3"],["Nf6"],["f4"],["exf4"],["e5"],["Qe7"],["Qe2"],["Ng8"]],"star":true},
  {"id":"hamppe-muzio-gambit","name":"Hamppe-Muzio Gambit","group":"hamppe-muzio-gambit","moves":[["e4"],["e5"],["Nc3"],["Nc6"],["f4"],["exf4"],["Nf3"],["g5"],["Bc4"],["g4"],["O-O"]],"star":true},
  {"id":"anderssen-defense","name":"Anderssen Defense","group":"anderssen-defense","moves":[["e4"],["e5"],["Nc3"],["Nc6"],["f4"],["exf4"],["Nf3"],["g5"],["d4"],["g4"],["Ne5"],["Nf6"]],"star":true},
  {"id":"fyfe-gambit","name":"Fyfe Gambit","group":"fyfe-gambit","moves":[["e4"],["e5"],["Nc3"],["Nc6"],["Bc4"],["Nf6"],["d4"]],"star":true},
  {"id":"zhuravlev-countergambit","name":"Zhuravlev Countergambit","group":"zhuravlev-countergambit","moves":[["e4"],["e5"],["Nc3"],["Nf6"],["Bc4"],["Nxe4"],["Nxe4"],["d5"],["Bxd5"],["Qxd5"],["Nc3"],["Qe6"]],"star":true},
  {"id":"1-e4-e5-2-nc3-nc6-3-nf3-nf6","name":"1.e4 e5 2.Nc3 Nc6 3.Nf3 Nf6","group":"1-e4-e5-2-nc3-nc6-3-nf3-nf6","moves":[["e4"],["e5"],["Nc3"],["Nc6"],["Nf3"],["Nf6"]],"star":true},
  {"id":"1-e4-e5-2-nc3-nf6-3-bc4-bc5","name":"1.e4 e5 2.Nc3 Nf6 3.Bc4 Bc5","group":"1-e4-e5-2-nc3-nf6-3-bc4-bc5","moves":[["e4"],["e5"],["Nc3"],["Nf6"],["Bc4"],["Bc5"],["d3"]],"star":true},
  {"id":"pierce-gambit","name":"Pierce Gambit","group":"pierce-gambit","moves":[["e4"],["e5"],["Nc3"],["Nf6"],["f4"],["d5"],["fxe5"],["Nxe4"],["Nf3"],["Bg4"],["Qe2"]],"star":true},
  {"id":"omaha-gambit","name":"Omaha Gambit","group":"omaha-gambit","moves":[["e4"],["e5"],["Nc3"],["d6"],["f4"]],"star":true},
  {"id":"giraffe-attack","name":"Giraffe Attack","group":"giraffe-attack","moves":[["e4"],["e5"],["Nc3"],["Bc5"],["Qg4"]],"star":true},
  {"id":"heyde-variation","name":"Heyde Variation","group":"heyde-variation","moves":[["e4"],["e5"],["Nc3"],["Nf6"],["f4"],["d5"],["fxe5"],["Nxe4"],["Qf3"],["f5"],["d4"]],"star":true},
  {"id":"mengarini-variation","name":"Mengarini Variation","group":"mengarini-variation","moves":[["e4"],["e5"],["Nc3"],["Nf6"],["a3"]],"star":true},
  {"id":"philidor-countergambit","name":"Philidor Countergambit","group":"philidor-countergambit","moves":[["e4"],["e5"],["Nc3"],["Nc6"],["d4"],["f5"]],"star":true},
  {"id":"hamppe-meitner-variation","name":"Hamppe-Meitner Variation","group":"hamppe-meitner-variation","moves":[["e4"],["e5"],["Nc3"],["Bc5"],["Na4"]],"star":true},
  {"id":"vienna-gambit-main-line","name":"Vienna Gambit, Main Line","group":"vienna-gambit","moves":[["e4"],["e5"],["Nc3"],["Nf6"],["f4"],["d5"]]},
  {"id":"vienna-gambit-paulsen-attack","name":"Vienna Gambit, Paulsen Attack","group":"vienna-gambit","moves":[["e4"],["e5"],["Nc3"],["Nf6"],["f4"],["d5"],["fxe5"],["Nxe4"],["Qf3"]]},
  {"id":"vienna-gambit-breyer-variation","name":"Vienna Gambit, Breyer Variation","group":"vienna-gambit","moves":[["e4"],["e5"],["Nc3"],["Nf6"],["f4"],["d5"],["fxe5"],["Nxe4"],["Nf3"],["Be7"]]},
  {"id":"vienna-gambit-modern-variation","name":"Vienna Gambit, Modern Variation","group":"vienna-gambit","moves":[["e4"],["e5"],["Nc3"],["Nf6"],["f4"],["d5"],["fxe5"],["Nxe4"],["d3"]]}
 ]
};
