// Alekhine Defense — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "alekhine-defense",
 "name": "Alekhine Defense",
 "color": "b",
 "oneLiner": "1.e4 Nf6 — invite White's pawns forward, then attack them.",
 "trunk": "1.e4 Nf6",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "four-pawns-attack": {
   "label": "Four Pawns Attack",
   "blurb": ""
  },
  "modern-variation": {
   "label": "Modern Variation",
   "blurb": ""
  },
  "exchange-variation": {
   "label": "Exchange Variation",
   "blurb": ""
  },
  "four-pawns": {
   "label": "Four Pawns",
   "blurb": ""
  },
  "modern": {
   "label": "Modern",
   "blurb": ""
  },
  "brooklyn-variation": {
   "label": "Brooklyn Variation",
   "blurb": ""
  },
  "chase-variation": {
   "label": "Chase Variation",
   "blurb": ""
  },
  "exchange": {
   "label": "Exchange",
   "blurb": ""
  },
  "welling-variation": {
   "label": "Welling Variation",
   "blurb": ""
  },
  "maroczy-variation": {
   "label": "Maroczy Variation",
   "blurb": ""
  },
  "saemisch-attack": {
   "label": "Saemisch Attack",
   "blurb": ""
  },
  "mokele-mbembe": {
   "label": "Mokele Mbembe",
   "blurb": ""
  },
  "spielmann-variation": {
   "label": "Spielmann Variation",
   "blurb": ""
  },
  "balogh-variation": {
   "label": "Balogh Variation",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Defences",
 "lines": [
  {"id":"alekhine-defense","name":"Alekhine Defense","group":"main","moves":[["e4"],["Nf6"]],"star":true,"idea":"The knight provokes e5, and Black hopes White's advanced pawns become targets. Rich, unbalanced and tricky for both sides."},
  {"id":"four-pawns-attack","name":"Four Pawns Attack","group":"four-pawns-attack","moves":[["e4"],["Nf6"],["e5"],["Nd5"],["d4"],["d6"],["c4"],["Nb6"],["f4"]],"star":true},
  {"id":"modern-variation","name":"Modern Variation","group":"modern-variation","moves":[["e4"],["Nf6"],["e5"],["Nd5"],["d4"],["d6"],["Nf3"]],"star":true},
  {"id":"exchange-variation","name":"Exchange Variation","group":"exchange-variation","moves":[["e4"],["Nf6"],["e5"],["Nd5"],["d4"],["d6"],["exd6"]],"star":true},
  {"id":"four-pawns-main","name":"Four Pawns, Main","group":"four-pawns","moves":[["e4"],["Nf6"],["e5"],["Nd5"],["d4"],["d6"],["c4"],["Nb6"],["f4"],["dxe5"],["fxe5"],["Nc6"],["Be3"],["Bf5"]]},
  {"id":"four-pawns-line-ending-7-be3-bf5-8-nc3-e6","name":"Four Pawns (line ending 7.Be3 Bf5 8.Nc3 e6)","group":"four-pawns","moves":[["e4"],["Nf6"],["e5"],["Nd5"],["d4"],["d6"],["c4"],["Nb6"],["f4"],["dxe5"],["fxe5"],["Nc6"],["Be3"],["Bf5"],["Nc3"],["e6"]]},
  {"id":"four-pawns-line-ending-4-c4-nb6-5-f4-g5","name":"Four Pawns (line ending 4.c4 Nb6 5.f4 g5)","group":"four-pawns","moves":[["e4"],["Nf6"],["e5"],["Nd5"],["d4"],["d6"],["c4"],["Nb6"],["f4"],["g5"]],"star":true},
  {"id":"modern-main","name":"Modern, Main","group":"modern","moves":[["e4"],["Nf6"],["e5"],["Nd5"],["d4"],["d6"],["Nf3"],["Bg4"],["Be2"],["e6"],["O-O"],["Be7"],["c4"],["Nb6"]]},
  {"id":"modern-line-ending-6-o-o-be7-7-h3-bh5","name":"Modern (line ending 6.O-O Be7 7.h3 Bh5)","group":"modern","moves":[["e4"],["Nf6"],["e5"],["Nd5"],["d4"],["d6"],["Nf3"],["Bg4"],["Be2"],["e6"],["O-O"],["Be7"],["h3"],["Bh5"]]},
  {"id":"modern-line-ending-5-c4-nb6-6-exd6-exd6","name":"Modern (line ending 5.c4 Nb6 6.exd6 exd6)","group":"modern","moves":[["e4"],["Nf6"],["e5"],["Nd5"],["d4"],["d6"],["Nf3"],["Bg4"],["c4"],["Nb6"],["exd6"],["exd6"]]},
  {"id":"modern-line-ending-3-d4-d6-4-nf3-g6","name":"Modern (line ending 3.d4 d6 4.Nf3 g6)","group":"modern","moves":[["e4"],["Nf6"],["e5"],["Nd5"],["d4"],["d6"],["Nf3"],["g6"]],"star":true},
  {"id":"brooklyn-variation","name":"Brooklyn Variation","group":"brooklyn-variation","moves":[["e4"],["Nf6"],["e5"],["Ng8"]],"star":true},
  {"id":"chase-variation","name":"Chase Variation","group":"chase-variation","moves":[["e4"],["Nf6"],["e5"],["Nd5"],["c4"],["Nb6"],["c5"],["Nd5"],["Bc4"],["e6"],["Nc3"]],"star":true},
  {"id":"exchange-line-ending-4-c4-nb6-5-exd6-cxd6","name":"Exchange (line ending 4.c4 Nb6 5.exd6 cxd6)","group":"exchange","moves":[["e4"],["Nf6"],["e5"],["Nd5"],["d4"],["d6"],["c4"],["Nb6"],["exd6"],["cxd6"]],"star":true},
  {"id":"exchange-variation-5-exd6","name":"Exchange Variation, 5...exd6","group":"exchange-variation","moves":[["e4"],["Nf6"],["e5"],["Nd5"],["d4"],["d6"],["c4"],["Nb6"],["exd6"],["exd6"]]},
  {"id":"welling-variation","name":"Welling Variation","group":"welling-variation","moves":[["e4"],["Nf6"],["e5"],["Nd5"],["Nc3"]],"star":true},
  {"id":"maroczy-variation","name":"Maroczy Variation","group":"maroczy-variation","moves":[["e4"],["Nf6"],["e5"],["Nd5"],["d4"],["d6"],["Nf3"],["dxe5"],["Nxe5"],["c6"]],"star":true},
  {"id":"saemisch-attack","name":"Saemisch Attack","group":"saemisch-attack","moves":[["e4"],["Nf6"],["e5"],["Nd5"],["d4"],["d6"],["c4"],["Nb6"],["f4"],["dxe5"],["fxe5"],["Nc6"],["Be3"],["Bf5"],["Nc3"],["e6"],["Nf3"],["Be7"]],"star":true},
  {"id":"mokele-mbembe","name":"Mokele Mbembe","group":"mokele-mbembe","moves":[["e4"],["Nf6"],["e5"],["Nd5"],["Nc3"],["Nxc3"],["dxc3"],["d6"],["exd6"]],"star":true},
  {"id":"spielmann-variation","name":"Spielmann Variation","group":"spielmann-variation","moves":[["e4"],["Nf6"],["e5"],["Nd5"],["c4"],["Nb6"],["c5"]],"star":true},
  {"id":"balogh-variation","name":"Balogh Variation","group":"balogh-variation","moves":[["e4"],["Nf6"],["e5"],["Nd5"],["d4"],["d6"],["Bc4"],["Nb6"],["Bb3"],["dxe5"],["Nc3"],["e6"]],"star":true}
 ]
};
