// Zukertort Opening — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "zukertort-opening",
 "name": "Zukertort Opening",
 "color": "w",
 "oneLiner": "1.Nf3 followed by quiet development — flexible and often transposes.",
 "trunk": "1.Nf3",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "queen-s-indian-accelerated": {
   "label": "Queen's Indian Accelerated",
   "blurb": ""
  },
  "kingside-fianchetto": {
   "label": "Kingside Fianchetto",
   "blurb": ""
  },
  "dutch-variation": {
   "label": "Dutch Variation",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Systems",
 "lines": [
  {"id":"zukertort-opening","name":"Zukertort Opening","group":"main","moves":[["Nf3"],["d5"]],"star":true,"idea":"White keeps the central structure open and decides later. Many move orders lead to well-known systems."},
  {"id":"queen-s-indian-accelerated","name":"Queen's Indian Accelerated","group":"queen-s-indian-accelerated","moves":[["Nf3"],["Nf6"],["c4"],["e6"],["g3"],["b6"]],"star":true},
  {"id":"kingside-fianchetto","name":"Kingside Fianchetto","group":"kingside-fianchetto","moves":[["Nf3"],["Nf6"],["g3"]],"star":true},
  {"id":"dutch-variation","name":"Dutch Variation","group":"dutch-variation","moves":[["Nf3"],["f5"]],"star":true}
 ]
};
