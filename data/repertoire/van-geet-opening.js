// Van Geet Opening — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "van-geet-opening",
 "name": "Van Geet Opening",
 "color": "w",
 "oneLiner": "1.Nc3 — a flexible first move that can transpose to many systems.",
 "trunk": "1.Nc3",
 "groups": {
  "dunst-opening": {
   "label": "Dunst Opening",
   "blurb": ""
  },
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "dunst-perrenet-gambit": {
   "label": "Dunst-Perrenet Gambit",
   "blurb": ""
  },
  "sokolsky-variation": {
   "label": "Sokolsky Variation",
   "blurb": ""
  },
  "reversed-alekhine": {
   "label": "Reversed Alekhine",
   "blurb": ""
  },
  "anglo-dutch": {
   "label": "Anglo-Dutch",
   "blurb": ""
  },
  "napoleon-gambit": {
   "label": "Napoleon Gambit",
   "blurb": ""
  },
  "napoleon-attack": {
   "label": "Napoleon Attack",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Systems",
 "lines": [
  {"id":"dunst-opening","name":"Dunst Opening","group":"dunst-opening","moves":[["Nc3"]],"star":true,"idea":"White develops a knight first and decides on the structure later. A good surprise weapon."},
  {"id":"van-geet-opening","name":"Van Geet Opening","group":"main","moves":[["Nc3"],["d5"]],"star":true},
  {"id":"dunst-perrenet-gambit","name":"Dunst-Perrenet Gambit","group":"dunst-perrenet-gambit","moves":[["Nc3"],["d5"],["e4"]],"star":true},
  {"id":"sokolsky-variation","name":"Sokolsky Variation","group":"sokolsky-variation","moves":[["Nc3"],["d5"],["e4"],["d4"],["Nce2"],["e5"]],"star":true},
  {"id":"reversed-alekhine","name":"Reversed Alekhine","group":"reversed-alekhine","moves":[["Nc3"],["e5"],["e4"],["Nf6"]],"star":true},
  {"id":"anglo-dutch","name":"Anglo-Dutch","group":"anglo-dutch","moves":[["Nc3"],["f5"]],"star":true},
  {"id":"napoleon-gambit","name":"Napoleon Gambit","group":"napoleon-gambit","moves":[["Nc3"],["d5"],["e4"],["dxe4"],["Nxe4"]],"star":true},
  {"id":"napoleon-attack","name":"Napoleon Attack","group":"napoleon-attack","moves":[["Nc3"],["e5"],["Nf3"],["Nc6"],["d4"]],"star":true}
 ]
};
