// Slav Defense — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "slav-defense",
 "name": "Slav Defense",
 "color": "b",
 "oneLiner": "1.d4 d5 2.c4 c6 — defend d5 and keep the bishop free.",
 "trunk": "1.d4 d5 2.c4 c6",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "main-line": {
   "label": "Main Line",
   "blurb": ""
  },
  "chebanenko-variation": {
   "label": "Chebanenko Variation",
   "blurb": ""
  },
  "exchange-variation": {
   "label": "Exchange Variation",
   "blurb": ""
  },
  "czech-variation": {
   "label": "Czech Variation",
   "blurb": ""
  },
  "smyslov-variation": {
   "label": "Smyslov Variation",
   "blurb": ""
  },
  "winawer-countergambit": {
   "label": "Winawer Countergambit",
   "blurb": ""
  },
  "alapin-variation": {
   "label": "Alapin Variation",
   "blurb": ""
  },
  "quiet-variation": {
   "label": "Quiet Variation",
   "blurb": ""
  },
  "three-knights": {
   "label": "Three Knights",
   "blurb": ""
  },
  "two-knights": {
   "label": "Two Knights",
   "blurb": ""
  },
  "schallopp-defense": {
   "label": "Schallopp Defense",
   "blurb": ""
  },
  "soultanbeieff-variation": {
   "label": "Soultanbeieff Variation",
   "blurb": ""
  },
  "chameleon-variation": {
   "label": "Chameleon Variation",
   "blurb": ""
  },
  "geller-gambit": {
   "label": "Geller Gambit",
   "blurb": ""
  },
  "slow-slav": {
   "label": "Slow Slav",
   "blurb": ""
  },
  "modern-line": {
   "label": "Modern Line",
   "blurb": ""
  },
  "exchange": {
   "label": "Exchange",
   "blurb": ""
  },
  "tolush-geller-gambit": {
   "label": "Tolush-Geller Gambit",
   "blurb": ""
  },
  "marshall-gambit": {
   "label": "Marshall Gambit",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Defences",
 "lines": [
  {"id":"slav-defense","name":"Slav Defense","group":"main","moves":[["d4"],["d5"],["c4"],["c6"]],"star":true,"idea":"Black supports d5 with the c-pawn and plans ...Bf5 before closing the centre with ...e6. A sturdy, reliable choice."},
  {"id":"main-line","name":"Main Line","group":"main-line","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["Nc3"],["dxc4"]],"star":true},
  {"id":"chebanenko-variation","name":"Chebanenko Variation","group":"chebanenko-variation","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["Nc3"],["a6"]],"star":true},
  {"id":"exchange-variation","name":"Exchange Variation","group":"exchange-variation","moves":[["d4"],["d5"],["c4"],["c6"],["cxd5"],["cxd5"]],"star":true},
  {"id":"czech-variation","name":"Czech Variation","group":"czech-variation","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["Nc3"],["dxc4"],["a4"],["Bf5"]],"star":true},
  {"id":"smyslov-variation","name":"Smyslov Variation","group":"smyslov-variation","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["Nc3"],["dxc4"],["a4"],["Bf5"],["e3"],["e6"],["Bxc4"],["Bb4"],["O-O"],["Nbd7"],["Qe2"],["Bg6"]],"star":true},
  {"id":"winawer-countergambit","name":"Winawer Countergambit","group":"winawer-countergambit","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["Nc3"],["dxc4"],["a4"],["Bf5"],["e3"],["e6"],["Bxc4"],["Bb4"],["O-O"],["Nbd7"],["Qe2"],["Bg6"],["e4"],["O-O"]],"star":true},
  {"id":"alapin-variation","name":"Alapin Variation","group":"alapin-variation","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["e3"],["Bf5"],["Nc3"],["e6"],["Nh4"],["Bg6"]],"star":true},
  {"id":"quiet-variation","name":"Quiet Variation","group":"quiet-variation","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["e3"],["Bf5"],["Nc3"],["e6"],["Nh4"]],"star":true},
  {"id":"three-knights","name":"Three Knights","group":"three-knights","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["Nc3"]],"star":true},
  {"id":"two-knights","name":"Two Knights","group":"two-knights","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["e3"]],"star":true},
  {"id":"schallopp-defense","name":"Schallopp Defense","group":"schallopp-defense","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["Nc3"],["dxc4"],["e3"],["b5"]],"star":true},
  {"id":"soultanbeieff-variation","name":"Soultanbeieff Variation","group":"soultanbeieff-variation","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["e3"],["e6"],["Nbd2"]],"star":true},
  {"id":"chameleon-variation","name":"Chameleon Variation","group":"chameleon-variation","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["Nc3"],["e6"],["e3"],["Nbd7"]],"star":true},
  {"id":"geller-gambit","name":"Geller Gambit","group":"geller-gambit","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["Nc3"],["dxc4"],["e4"],["b5"],["e5"],["Nd5"],["a4"]],"star":true},
  {"id":"slow-slav","name":"Slow Slav","group":"slow-slav","moves":[["d4"],["d5"],["c4"],["c6"],["e3"]],"star":true},
  {"id":"modern-line","name":"Modern Line","group":"modern-line","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["Nc3"],["dxc4"],["a4"],["Bf5"],["Ne5"],["Nbd7"]],"star":true},
  {"id":"exchange-bf4","name":"Exchange, Bf4","group":"exchange","moves":[["d4"],["d5"],["c4"],["c6"],["cxd5"],["cxd5"],["Nc3"],["Nc6"],["Bf4"],["Nf6"],["e3"],["Bf5"]],"star":true},
  {"id":"tolush-geller-gambit","name":"Tolush-Geller Gambit","group":"tolush-geller-gambit","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["Nc3"],["e6"],["Bg5"],["dxc4"],["e4"],["b5"],["e5"],["h6"],["Bh4"],["g5"],["Nxg5"],["hxg5"],["Bxg5"],["Nbd7"]],"star":true},
  {"id":"marshall-gambit","name":"Marshall Gambit","group":"marshall-gambit","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["Nc3"],["dxc4"],["e3"],["b5"],["a4"],["b4"],["Na2"]],"star":true}
 ]
};
