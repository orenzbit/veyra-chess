// King's Indian Defense — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "king-s-indian-defense",
 "name": "King's Indian Defense",
 "color": "b",
 "oneLiner": "1.d4 Nf6 2.c4 g6 — let White build a centre, then attack it.",
 "trunk": "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "classical-variation": {
   "label": "Classical Variation",
   "blurb": ""
  },
  "samisch-variation": {
   "label": "Sämisch Variation",
   "blurb": ""
  },
  "fianchetto-variation": {
   "label": "Fianchetto Variation",
   "blurb": ""
  },
  "four-pawns-attack": {
   "label": "Four Pawns Attack",
   "blurb": ""
  },
  "averbakh-variation": {
   "label": "Averbakh Variation",
   "blurb": ""
  },
  "smyslov-system": {
   "label": "Smyslov System",
   "blurb": ""
  },
  "smyslov": {
   "label": "Smyslov",
   "blurb": ""
  },
  "mar-del-plata": {
   "label": "Mar del Plata",
   "blurb": ""
  },
  "petrosian-system": {
   "label": "Petrosian System",
   "blurb": ""
  },
  "bayonet-attack": {
   "label": "Bayonet Attack",
   "blurb": ""
  },
  "samisch": {
   "label": "Sämisch",
   "blurb": ""
  },
  "fianchetto": {
   "label": "Fianchetto",
   "blurb": ""
  },
  "four-pawns": {
   "label": "Four Pawns",
   "blurb": ""
  },
  "exchange-variation": {
   "label": "Exchange Variation",
   "blurb": ""
  },
  "averbakh": {
   "label": "Averbakh",
   "blurb": ""
  },
  "classical": {
   "label": "Classical",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Defences",
 "lines": [
  {"id":"king-s-indian-defense","name":"King's Indian Defense","group":"main","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["Bg7"]],"star":true,"idea":"Black fianchettoes and strikes with ...e5 or ...c5. Great for attacking players who like a kingside storm."},
  {"id":"classical-variation","name":"Classical Variation","group":"classical-variation","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["Bg7"],["e4"],["d6"],["Nf3"],["O-O"],["Be2"],["e5"]],"star":true},
  {"id":"samisch-variation","name":"Sämisch Variation","group":"samisch-variation","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["Bg7"],["e4"],["d6"],["f3"],["O-O"],["Be3"]],"star":true},
  {"id":"fianchetto-variation","name":"Fianchetto Variation","group":"fianchetto-variation","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["Bg7"],["Nf3"],["O-O"],["g3"]],"star":true},
  {"id":"four-pawns-attack","name":"Four Pawns Attack","group":"four-pawns-attack","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["Bg7"],["e4"],["d6"],["f4"]],"star":true},
  {"id":"averbakh-variation","name":"Averbakh Variation","group":"averbakh-variation","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["Bg7"],["e4"],["d6"],["Be2"],["O-O"],["Bg5"]],"star":true},
  {"id":"smyslov-system","name":"Smyslov System","group":"smyslov-system","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["Bg7"],["e4"],["d6"],["Be3"]],"star":true},
  {"id":"smyslov-bd3","name":"Smyslov, Bd3","group":"smyslov","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["Bg7"],["e4"],["d6"],["Be3"],["O-O"],["Bd3"],["e5"]],"star":true},
  {"id":"smyslov-nf3","name":"Smyslov, Nf3","group":"smyslov","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["Bg7"],["e4"],["d6"],["Be3"],["O-O"],["Nf3"],["e5"]]},
  {"id":"smyslov-nge2","name":"Smyslov, Nge2","group":"smyslov","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["Bg7"],["e4"],["d6"],["Be3"],["O-O"],["Nge2"],["e5"]]},
  {"id":"smyslov-f3","name":"Smyslov, f3","group":"smyslov","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["Bg7"],["e4"],["d6"],["Be3"],["O-O"],["f3"],["e5"]]},
  {"id":"smyslov-be2","name":"Smyslov, Be2","group":"smyslov","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["Bg7"],["e4"],["d6"],["Be3"],["O-O"],["Be2"],["e5"]]},
  {"id":"mar-del-plata","name":"Mar del Plata","group":"mar-del-plata","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["Bg7"],["e4"],["d6"],["Nf3"],["O-O"],["Be2"],["e5"],["O-O"],["Nc6"],["d5"],["Ne7"],["Ne1"],["Nd7"],["Be3"],["f5"],["f3"],["f4"],["Bf2"],["g5"]],"star":true},
  {"id":"petrosian-system","name":"Petrosian System","group":"petrosian-system","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["Bg7"],["e4"],["d6"],["Nf3"],["O-O"],["Be2"],["e5"],["d5"],["a5"],["Bg5"],["h6"],["Bh4"],["Na6"]],"star":true},
  {"id":"bayonet-attack","name":"Bayonet Attack","group":"bayonet-attack","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["Bg7"],["e4"],["d6"],["Nf3"],["O-O"],["Be2"],["e5"],["O-O"],["Nc6"],["d5"],["Ne7"],["b4"],["Nh5"],["Re1"],["f5"]],"star":true},
  {"id":"samisch-qd2","name":"Sämisch, Qd2","group":"samisch","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["Bg7"],["e4"],["d6"],["f3"],["O-O"],["Be3"],["e5"],["d5"],["Nh5"],["Qd2"],["f5"],["O-O-O"],["Na6"]],"star":true},
  {"id":"fianchetto-nbd7","name":"Fianchetto, Nbd7","group":"fianchetto","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["Bg7"],["g3"],["O-O"],["Bg2"],["d6"],["Nf3"],["Nbd7"],["O-O"],["e5"],["e4"],["c6"],["h3"],["Qb6"]],"star":true},
  {"id":"four-pawns-nf3","name":"Four Pawns, Nf3","group":"four-pawns","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["Bg7"],["e4"],["d6"],["f4"],["O-O"],["Nf3"],["c5"],["d5"],["e6"],["Be2"],["exd5"],["cxd5"],["Bg4"]],"star":true},
  {"id":"exchange-variation","name":"Exchange Variation","group":"exchange-variation","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["Bg7"],["e4"],["d6"],["Nf3"],["O-O"],["Be2"],["e5"],["dxe5"],["dxe5"],["Qxd8"],["Rxd8"],["Bg5"],["Re8"]],"star":true},
  {"id":"averbakh-c5","name":"Averbakh, c5","group":"averbakh","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["Bg7"],["e4"],["d6"],["Be2"],["O-O"],["Bg5"],["c5"],["d5"],["h6"],["Bf4"],["e6"]],"star":true},
  {"id":"classical-na6","name":"Classical, Na6","group":"classical","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["Bg7"],["e4"],["d6"],["Nf3"],["O-O"],["Be2"],["Na6"],["O-O"],["e5"],["Be3"],["Ng4"],["Bg5"],["Qe8"]],"star":true}
 ]
};
