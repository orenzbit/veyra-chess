// Albin Counter-Gambit — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "albin-counter-gambit",
 "name": "Albin Counter-Gambit",
 "color": "b",
 "oneLiner": "1.d4 d5 2.c4 e5 — sacrifice a pawn for quick activity.",
 "trunk": "1.d4 d5 2.c4 e5",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "lasker-trap": {
   "label": "Lasker Trap",
   "blurb": ""
  },
  "normal-line": {
   "label": "Normal Line",
   "blurb": ""
  },
  "modern-line": {
   "label": "Modern Line",
   "blurb": ""
  },
  "balogh-variation": {
   "label": "Balogh Variation",
   "blurb": ""
  },
  "krenosz-variation": {
   "label": "Krenosz Variation",
   "blurb": ""
  },
  "spassky-variation": {
   "label": "Spassky Variation",
   "blurb": ""
  },
  "janowski-variation": {
   "label": "Janowski Variation",
   "blurb": ""
  },
  "tartakower-defense": {
   "label": "Tartakower Defense",
   "blurb": ""
  },
  "fianchetto-variation": {
   "label": "Fianchetto Variation",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Gambits",
 "lines": [
  {"id":"albin-counter-gambit","name":"Albin Counter-Gambit","group":"main","moves":[["d4"],["d5"],["c4"],["e5"]],"star":true,"idea":"Black strikes at White's centre right away and gets a strong d4-pawn if White is not careful. Tricky with many traps."},
  {"id":"lasker-trap","name":"Lasker Trap","group":"lasker-trap","moves":[["d4"],["d5"],["c4"],["e5"],["dxe5"],["d4"],["e3"],["Bb4+"],["Bd2"],["dxe3"]],"star":true},
  {"id":"normal-line","name":"Normal Line","group":"normal-line","moves":[["d4"],["d5"],["c4"],["e5"],["dxe5"],["d4"],["Nf3"]],"star":true},
  {"id":"modern-line","name":"Modern Line","group":"modern-line","moves":[["d4"],["d5"],["c4"],["e5"],["dxe5"],["d4"],["Nf3"],["Nc6"],["Nbd2"]],"star":true},
  {"id":"balogh-variation","name":"Balogh Variation","group":"balogh-variation","moves":[["d4"],["d5"],["c4"],["e5"],["dxe5"],["d4"],["Nf3"],["Nc6"],["Nbd2"],["Qe7"]],"star":true},
  {"id":"krenosz-variation","name":"Krenosz Variation","group":"krenosz-variation","moves":[["d4"],["d5"],["c4"],["e5"],["dxe5"],["d4"],["Nf3"],["Nc6"],["Nbd2"],["Bg4"],["h3"],["Bxf3"],["Nxf3"],["Bb4+"],["Bd2"],["Qe7"]],"star":true},
  {"id":"spassky-variation","name":"Spassky Variation","group":"spassky-variation","moves":[["d4"],["d5"],["c4"],["e5"],["dxe5"],["d4"],["e4"]],"star":true},
  {"id":"janowski-variation","name":"Janowski Variation","group":"janowski-variation","moves":[["d4"],["d5"],["c4"],["e5"],["dxe5"],["d4"],["Nf3"],["Nc6"],["Nbd2"],["f6"]],"star":true},
  {"id":"tartakower-defense","name":"Tartakower Defense","group":"tartakower-defense","moves":[["d4"],["d5"],["c4"],["e5"],["dxe5"],["d4"],["Nf3"],["c5"]],"star":true},
  {"id":"fianchetto-variation","name":"Fianchetto Variation","group":"fianchetto-variation","moves":[["d4"],["d5"],["c4"],["e5"],["dxe5"],["d4"],["Nf3"],["Nc6"],["g3"]],"star":true},
  {"id":"fianchetto-variation-bg4-line","name":"Fianchetto Variation, Bg4 Line","group":"fianchetto-variation","moves":[["d4"],["d5"],["c4"],["e5"],["dxe5"],["d4"],["Nf3"],["Nc6"],["g3"],["Bg4"]]},
  {"id":"fianchetto-variation-bf5-line","name":"Fianchetto Variation, Bf5 Line","group":"fianchetto-variation","moves":[["d4"],["d5"],["c4"],["e5"],["dxe5"],["d4"],["Nf3"],["Nc6"],["g3"],["Bf5"]]},
  {"id":"fianchetto-variation-be6-line","name":"Fianchetto Variation, Be6 Line","group":"fianchetto-variation","moves":[["d4"],["d5"],["c4"],["e5"],["dxe5"],["d4"],["Nf3"],["Nc6"],["g3"],["Be6"]]}
 ]
};
