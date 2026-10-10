// Three Knights Game — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "three-knights-game",
 "name": "Three Knights Game",
 "color": "w",
 "oneLiner": "1.e4 e5 2.Nf3 Nc6 3.Nc3 — simple, solid development with both knights.",
 "trunk": "1.e4 e5 2.Nf3 Nc6 3.Nc3",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "schlechter": {
   "label": "Schlechter",
   "blurb": ""
  },
  "winawer-defense": {
   "label": "Winawer Defense",
   "blurb": ""
  },
  "hammerschlag": {
   "label": "Hammerschlag",
   "blurb": ""
  },
  "steinitz-variation": {
   "label": "Steinitz Variation",
   "blurb": ""
  },
  "schlechter-defense": {
   "label": "Schlechter Defense",
   "blurb": ""
  },
  "1-e4-e5-2-nf3-nc6-3-nc3-bc5": {
   "label": "1.e4 e5 2.Nf3 Nc6 3.Nc3 Bc5",
   "blurb": ""
  },
  "hammerschlag-gambit": {
   "label": "Hammerschlag Gambit",
   "blurb": ""
  },
  "winawer": {
   "label": "Winawer",
   "blurb": ""
  },
  "steinitz": {
   "label": "Steinitz",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Classical",
 "lines": [
  {"id":"three-knights-game","name":"Three Knights Game","group":"main","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"]],"star":true,"idea":"Develop both knights, then choose a plan: d4, Bb5 or Bc4. A quiet way to reach a playable open game."},
  {"id":"schlechter","name":"Schlechter","group":"schlechter","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["g6"]],"star":true},
  {"id":"winawer-defense","name":"Winawer Defense","group":"winawer-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["f5"]],"star":true},
  {"id":"hammerschlag","name":"Hammerschlag","group":"hammerschlag","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Bc5"]],"star":true},
  {"id":"steinitz-variation","name":"Steinitz Variation","group":"steinitz-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Bb4"]],"star":true},
  {"id":"schlechter-defense","name":"Schlechter Defense","group":"schlechter-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["g6"],["d4"],["exd4"],["Nd5"]],"star":true},
  {"id":"1-e4-e5-2-nf3-nc6-3-nc3-bc5","name":"1.e4 e5 2.Nf3 Nc6 3.Nc3 Bc5","group":"1-e4-e5-2-nf3-nc6-3-nc3-bc5","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Bc5"],["Nxe5"],["Nxe5"],["d4"],["Bxd4"]],"star":true},
  {"id":"hammerschlag-gambit","name":"Hammerschlag Gambit","group":"hammerschlag-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Bc5"],["Nxe5"],["Nxe5"],["d4"],["Bd6"],["dxe5"],["Bxe5"]],"star":true},
  {"id":"winawer-main","name":"Winawer, Main","group":"winawer","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["f5"],["d4"],["fxe4"],["Nxe5"],["Nf6"]]},
  {"id":"winawer-line-ending-2-nc6-3-nc3-f5-4-exf5","name":"Winawer (line ending 2...Nc6 3.Nc3 f5 4.exf5)","group":"winawer","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["f5"],["exf5"]],"star":true},
  {"id":"steinitz-line-ending-2-nc6-3-nc3-bb4-4-nd5","name":"Steinitz (line ending 2...Nc6 3.Nc3 Bb4 4.Nd5)","group":"steinitz","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Bb4"],["Nd5"]],"star":true},
  {"id":"schlechter-g3","name":"Schlechter, g3","group":"schlechter","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["g6"],["g3"]]}
 ]
};
