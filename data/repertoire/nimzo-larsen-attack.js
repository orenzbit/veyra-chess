// Nimzo-Larsen Attack — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "nimzo-larsen-attack",
 "name": "Nimzo-Larsen Attack",
 "color": "w",
 "oneLiner": "1.b3 — long-diagonal pressure with the bishop on b2.",
 "trunk": "1.b3",
 "groups": {
  "larsen-s-opening": {
   "label": "Larsen's Opening",
   "blurb": ""
  },
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "classical": {
   "label": "Classical",
   "blurb": ""
  },
  "spike-variation": {
   "label": "Spike Variation",
   "blurb": ""
  },
  "dutch-variation": {
   "label": "Dutch Variation",
   "blurb": ""
  },
  "modern-variation": {
   "label": "Modern Variation",
   "blurb": ""
  },
  "english-variation": {
   "label": "English Variation",
   "blurb": ""
  },
  "indian-variation": {
   "label": "Indian Variation",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Systems",
 "lines": [
  {"id":"larsen-s-opening","name":"Larsen's Opening","group":"larsen-s-opening","moves":[["b3"]],"star":true,"idea":"White develops the queen's bishop on the long diagonal and fights for the centre with pieces. Flexible and less studied."},
  {"id":"main","name":"Main","group":"main","moves":[["b3"],["e5"],["Bb2"],["Nc6"],["e3"],["d5"],["Bb5"],["Bd6"],["Bxc6+"],["bxc6"]],"star":true},
  {"id":"classical","name":"Classical","group":"classical","moves":[["b3"],["d5"],["Bb2"],["Nf6"],["e3"],["e6"],["Nf3"],["Be7"],["Bd3"],["O-O"],["O-O"],["c5"]],"star":true},
  {"id":"spike-variation","name":"Spike Variation","group":"spike-variation","moves":[["b3"],["e5"],["Bb2"],["Nc6"],["e3"],["Nf6"],["Bb5"],["Bd6"],["f4"]],"star":true},
  {"id":"dutch-variation","name":"Dutch Variation","group":"dutch-variation","moves":[["b3"],["f5"]],"star":true},
  {"id":"modern-variation","name":"Modern Variation","group":"modern-variation","moves":[["b3"],["Nf6"],["Bb2"],["g6"],["e3"],["Bg7"]],"star":true},
  {"id":"english-variation","name":"English Variation","group":"english-variation","moves":[["b3"],["c5"],["Bb2"],["Nc6"],["e3"],["Nf6"],["Bb5"],["Qc7"]],"star":true},
  {"id":"indian-variation","name":"Indian Variation","group":"indian-variation","moves":[["b3"],["Nf6"],["Bb2"],["e6"],["e3"],["Be7"]],"star":true}
 ]
};
