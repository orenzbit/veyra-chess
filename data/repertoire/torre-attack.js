// Torre Attack — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "torre-attack",
 "name": "Torre Attack",
 "color": "w",
 "oneLiner": "1.d4 Nf6 2.Nf3 e6 3.Bg5 — pin the knight, build solidly.",
 "trunk": "1.d4 Nf6 2.Nf3",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "classical": {
   "label": "Classical",
   "blurb": ""
  },
  "wolf-variation": {
   "label": "Wolf Variation",
   "blurb": ""
  },
  "yugoslav": {
   "label": "Yugoslav",
   "blurb": ""
  },
  "fianchetto-defense": {
   "label": "Fianchetto Defense",
   "blurb": ""
  },
  "accelerated": {
   "label": "Accelerated",
   "blurb": ""
  },
  "nimzo-style": {
   "label": "Nimzo-Style",
   "blurb": ""
  },
  "anti-torre": {
   "label": "Anti-Torre",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Systems",
 "lines": [
  {"id":"torre-attack","name":"Torre Attack","group":"main","moves":[["d4"],["Nf6"],["Nf3"],["e6"],["Bg5"]],"star":true,"idea":"The bishop on g5 pins the f6-knight. White follows with e3 and Nbd2, a simple system for many opponents."},
  {"id":"classical","name":"Classical","group":"classical","moves":[["d4"],["Nf6"],["Nf3"],["e6"],["Bg5"],["d5"],["e3"],["Nbd7"],["Bd3"],["Be7"],["Nbd2"],["O-O"],["c3"],["c5"]],"star":true},
  {"id":"wolf-variation","name":"Wolf Variation","group":"wolf-variation","moves":[["d4"],["Nf6"],["Nf3"],["e6"],["Bg5"],["d5"],["e3"],["Nbd7"],["Nbd2"],["Be7"],["c3"],["c5"],["Bd3"],["b6"]],"star":true},
  {"id":"yugoslav","name":"Yugoslav","group":"yugoslav","moves":[["d4"],["Nf6"],["Nf3"],["e6"],["Bg5"],["c5"],["e3"],["cxd4"],["exd4"],["Be7"],["Nc3"],["Nc6"],["Bd3"],["d5"],["O-O"],["O-O"]],"star":true},
  {"id":"fianchetto-defense","name":"Fianchetto Defense","group":"fianchetto-defense","moves":[["d4"],["Nf6"],["Nf3"],["g6"],["Bg5"],["Bg7"],["Nbd2"],["O-O"],["e3"],["d6"]],"star":true},
  {"id":"accelerated","name":"Accelerated","group":"accelerated","moves":[["d4"],["Nf6"],["Nf3"],["d5"],["Bg5"],["Ne4"],["Bf4"]],"star":true},
  {"id":"nimzo-style","name":"Nimzo-Style","group":"nimzo-style","moves":[["d4"],["Nf6"],["Nf3"],["e6"],["Bg5"],["Bb4+"],["c3"],["h6"]],"star":true},
  {"id":"anti-torre","name":"Anti-Torre","group":"anti-torre","moves":[["d4"],["Nf6"],["Nf3"],["e6"],["Bg5"],["h6"],["Bh4"],["g5"]],"star":true}
 ]
};
