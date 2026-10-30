// Torre Attack — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "torre-attack",
 "name": "Torre Attack",
 "color": "w",
 "oneLiner": "1.d4 Nf6 2.Nf3 e6 3.Bg5 — pin the knight, build solidly.",
 "trunk": "1.d4",
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
  },
  "wagner-gambit": {
   "label": "Wagner Gambit",
   "blurb": ""
  },
  "gossip-variation": {
   "label": "Gossip Variation",
   "blurb": ""
  },
  "breyer-variation": {
   "label": "Breyer Variation",
   "blurb": ""
  },
  "petrosian-gambit": {
   "label": "Petrosian Gambit",
   "blurb": ""
  },
  "nimzowitsch-variation": {
   "label": "Nimzowitsch Variation",
   "blurb": ""
  },
  "grunfeld-variation": {
   "label": "Grünfeld Variation",
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
  {"id":"fianchetto-defense","name":"Fianchetto Defense","group":"fianchetto-defense","moves":[["d4"],["Nf6"],["Nf3"],["g6"],["Bg5"],["Bg7"],["Nbd2"],["O-O"],["e3"],["d6"]]},
  {"id":"accelerated","name":"Accelerated","group":"accelerated","moves":[["d4"],["Nf6"],["Nf3"],["d5"],["Bg5"],["Ne4"],["Bf4"]],"star":true},
  {"id":"nimzo-style","name":"Nimzo-Style","group":"nimzo-style","moves":[["d4"],["Nf6"],["Nf3"],["e6"],["Bg5"],["Bb4+"],["c3"],["h6"]],"star":true},
  {"id":"anti-torre","name":"Anti-Torre","group":"anti-torre","moves":[["d4"],["Nf6"],["Nf3"],["e6"],["Bg5"],["h6"],["Bh4"],["g5"]],"star":true},
  {"id":"wagner-gambit","name":"Wagner Gambit","group":"wagner-gambit","moves":[["d4"],["Nf6"],["Nf3"],["e6"],["Bg5"],["c5"],["e4"]],"star":true},
  {"id":"gossip-variation","name":"Gossip Variation","group":"gossip-variation","moves":[["d4"],["d5"],["Nf3"],["Nf6"],["Bg5"],["Ne4"]],"star":true},
  {"id":"breyer-variation","name":"Breyer Variation","group":"breyer-variation","moves":[["d4"],["Nf6"],["Nf3"],["e6"],["Bg5"],["d5"],["e3"],["c5"],["c3"],["Qb6"]],"star":true},
  {"id":"petrosian-gambit","name":"Petrosian Gambit","group":"petrosian-gambit","moves":[["d4"],["Nf6"],["Nf3"],["e6"],["Bg5"],["c5"],["e3"],["b6"],["d5"]],"star":true},
  {"id":"nimzowitsch-variation","name":"Nimzowitsch Variation","group":"nimzowitsch-variation","moves":[["d4"],["Nf6"],["Nf3"],["e6"],["Bg5"],["h6"]],"star":true},
  {"id":"grunfeld-variation","name":"Grünfeld Variation","group":"grunfeld-variation","moves":[["d4"],["d5"],["Nf3"],["Nf6"],["Bg5"],["g6"]],"star":true},
  {"id":"grunfeld-variation-main-line","name":"Grünfeld Variation, Main Line","group":"grunfeld-variation","moves":[["d4"],["Nf6"],["Nf3"],["g6"],["Bg5"],["Bg7"],["Nbd2"],["d5"],["e3"],["O-O"]]},
  {"id":"fianchetto-defense-euwe-variation","name":"Fianchetto Defense, Euwe Variation","group":"fianchetto-defense","moves":[["d4"],["Nf6"],["Nf3"],["g6"],["Bg5"],["Bg7"],["Nbd2"],["c5"]],"star":true}
 ]
};
