// Modern Defense — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "modern-defense",
 "name": "Modern Defense",
 "color": "b",
 "oneLiner": "1.e4 g6 — fianchetto first, decide the pawn structure later.",
 "trunk": "1.e4 g6",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "standard": {
   "label": "Standard",
   "blurb": ""
  },
  "pseudo-austrian": {
   "label": "Pseudo-Austrian",
   "blurb": ""
  },
  "westermann-gambit": {
   "label": "Westermann Gambit",
   "blurb": ""
  },
  "gurgenidze": {
   "label": "Gurgenidze",
   "blurb": ""
  },
  "lizard-variation": {
   "label": "Lizard Variation",
   "blurb": ""
  },
  "averbakh-variation": {
   "label": "Averbakh Variation",
   "blurb": ""
  },
  "two-knights": {
   "label": "Two Knights",
   "blurb": ""
  },
  "norwegian-defense": {
   "label": "Norwegian Defense",
   "blurb": ""
  },
  "robatsch": {
   "label": "Robatsch",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Defences",
 "lines": [
  {"id":"modern-defense","name":"Modern Defense","group":"main","moves":[["e4"],["g6"]],"star":true,"idea":"Black delays the central fight and puts the bishop on g7. Very flexible, but White gets space, so react at the right time."},
  {"id":"standard","name":"Standard","group":"standard","moves":[["e4"],["g6"],["d4"],["Bg7"],["Nc3"],["d6"]],"star":true},
  {"id":"pseudo-austrian","name":"Pseudo-Austrian","group":"pseudo-austrian","moves":[["e4"],["g6"],["d4"],["Bg7"],["Nc3"],["d6"],["f4"]],"star":true},
  {"id":"westermann-gambit","name":"Westermann Gambit","group":"westermann-gambit","moves":[["e4"],["g6"],["d4"],["Bg7"],["Nc3"],["c6"],["Be3"],["b5"]],"star":true},
  {"id":"gurgenidze","name":"Gurgenidze","group":"gurgenidze","moves":[["e4"],["g6"],["d4"],["Bg7"],["Nc3"],["c6"],["Nf3"],["d5"]],"star":true},
  {"id":"lizard-variation","name":"Lizard Variation","group":"lizard-variation","moves":[["e4"],["g6"],["d4"],["Bg7"],["Nc3"],["d6"],["Nf3"],["a6"]],"star":true},
  {"id":"averbakh-variation","name":"Averbakh Variation","group":"averbakh-variation","moves":[["e4"],["g6"],["d4"],["Bg7"],["Nc3"],["d6"],["Be3"],["a6"]],"star":true},
  {"id":"two-knights","name":"Two Knights","group":"two-knights","moves":[["e4"],["g6"],["d4"],["Bg7"],["Nc3"],["d6"],["Nf3"],["Nf6"]],"star":true},
  {"id":"norwegian-defense","name":"Norwegian Defense","group":"norwegian-defense","moves":[["e4"],["g6"],["d4"],["Bg7"],["Nf3"],["d6"],["Bc4"],["Nf6"]],"star":true},
  {"id":"robatsch","name":"Robatsch","group":"robatsch","moves":[["e4"],["g6"],["d4"],["Bg7"],["Nc3"],["c6"],["Bc4"]],"star":true}
 ]
};
