// King's Indian Attack — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "king-s-indian-attack",
 "name": "King's Indian Attack",
 "color": "w",
 "oneLiner": "Nf3, g3, Bg2, O-O, d3 — one setup against almost everything.",
 "trunk": "1.Nf3 d5 2.g3",
 "groups": {
  "sicilian-variation": {
   "label": "Sicilian Variation",
   "blurb": ""
  },
  "french-variation": {
   "label": "French Variation",
   "blurb": ""
  },
  "pirc-variation": {
   "label": "Pirc Variation",
   "blurb": ""
  },
  "fianchetto-defense": {
   "label": "Fianchetto Defense",
   "blurb": ""
  },
  "yugoslav-variation": {
   "label": "Yugoslav Variation",
   "blurb": ""
  },
  "smyslov-variation": {
   "label": "Smyslov Variation",
   "blurb": ""
  },
  "capablanca-variation": {
   "label": "Capablanca Variation",
   "blurb": ""
  },
  "caro-kann-setup": {
   "label": "Caro-Kann Setup",
   "blurb": ""
  },
  "keres-variation": {
   "label": "Keres Variation",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Systems",
 "lines": [
  {"id":"sicilian-variation","name":"Sicilian Variation","group":"sicilian-variation","moves":[["Nf3"],["d5"],["g3"],["c5"],["Bg2"],["Nc6"],["O-O"],["e5"],["d3"],["Nf6"]],"star":true},
  {"id":"french-variation","name":"French Variation","group":"french-variation","moves":[["Nf3"],["d5"],["g3"],["Nf6"],["Bg2"],["e6"],["O-O"],["Be7"],["d3"],["c5"],["Nbd2"]],"star":true},
  {"id":"pirc-variation","name":"Pirc Variation","group":"pirc-variation","moves":[["Nf3"],["d5"],["g3"],["Nf6"],["Bg2"],["c6"],["O-O"],["Bg4"],["d3"],["Nbd7"]],"star":true},
  {"id":"fianchetto-defense","name":"Fianchetto Defense","group":"fianchetto-defense","moves":[["Nf3"],["d5"],["g3"],["g6"],["Bg2"],["Bg7"],["O-O"],["Nf6"],["d3"],["O-O"]],"star":true},
  {"id":"yugoslav-variation","name":"Yugoslav Variation","group":"yugoslav-variation","moves":[["Nf3"],["d5"],["g3"],["Nf6"],["Bg2"],["c5"],["O-O"],["Nc6"],["d3"],["e5"]],"star":true},
  {"id":"smyslov-variation","name":"Smyslov Variation","group":"smyslov-variation","moves":[["Nf3"],["d5"],["g3"],["Nf6"],["Bg2"],["Bf5"]],"star":true,"idea":"White uses the same set-up whatever Black does, then plays e4 and attacks on the kingside. Little theory to remember."},
  {"id":"capablanca-variation","name":"Capablanca Variation","group":"capablanca-variation","moves":[["Nf3"],["d5"],["g3"],["Nf6"],["Bg2"],["Bg4"]],"star":true},
  {"id":"caro-kann-setup","name":"Caro-Kann Setup","group":"caro-kann-setup","moves":[["Nf3"],["d5"],["g3"],["c6"],["Bg2"],["Bg4"]],"star":true},
  {"id":"keres-variation","name":"Keres Variation","group":"keres-variation","moves":[["Nf3"],["d5"],["g3"],["Nf6"],["Bg2"],["e6"],["O-O"],["Nc6"]],"star":true}
 ]
};
