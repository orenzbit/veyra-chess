// Grünfeld Defense — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "grunfeld-defense",
 "name": "Grünfeld Defense",
 "color": "b",
 "oneLiner": "1.d4 Nf6 2.c4 g6 3.Nc3 d5 — hit the centre with ...d5 at once.",
 "trunk": "1.d4",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "exchange-variation": {
   "label": "Exchange Variation",
   "blurb": ""
  },
  "russian-system": {
   "label": "Russian System",
   "blurb": ""
  },
  "neo-grunfeld-defense": {
   "label": "Neo-Grünfeld Defense",
   "blurb": ""
  },
  "three-knights": {
   "label": "Three Knights",
   "blurb": ""
  },
  "brinckmann-attack": {
   "label": "Brinckmann Attack",
   "blurb": ""
  },
  "stockholm-variation": {
   "label": "Stockholm Variation",
   "blurb": ""
  },
  "stockholm": {
   "label": "Stockholm",
   "blurb": ""
  },
  "exchange": {
   "label": "Exchange",
   "blurb": ""
  },
  "russian": {
   "label": "Russian",
   "blurb": ""
  },
  "fianchetto": {
   "label": "Fianchetto",
   "blurb": ""
  },
  "gibbon-gambit": {
   "label": "Gibbon Gambit",
   "blurb": ""
  },
  "zaitsev-gambit": {
   "label": "Zaitsev Gambit",
   "blurb": ""
  },
  "flohr-variation": {
   "label": "Flohr Variation",
   "blurb": ""
  },
  "smyslov-defense": {
   "label": "Smyslov Defense",
   "blurb": ""
  },
  "lundin-variation": {
   "label": "Lundin Variation",
   "blurb": ""
  },
  "lutikov-variation": {
   "label": "Lutikov Variation",
   "blurb": ""
  },
  "pachman-variation": {
   "label": "Pachman Variation",
   "blurb": ""
  },
  "botvinnik-variation": {
   "label": "Botvinnik Variation",
   "blurb": ""
  },
  "opocensky-variation": {
   "label": "Opocensky Variation",
   "blurb": ""
  },
  "makogonov-variation": {
   "label": "Makogonov Variation",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Defences",
 "lines": [
  {"id":"grunfeld-defense","name":"Grünfeld Defense","group":"main","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["d5"]],"star":true,"idea":"Black challenges White's centre immediately and attacks it with the bishop on g7 and ...c5. Sharp and theoretical."},
  {"id":"exchange-variation","name":"Exchange Variation","group":"exchange-variation","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["d5"],["cxd5"],["Nxd5"],["e4"],["Nxc3"],["bxc3"]],"star":true},
  {"id":"russian-system","name":"Russian System","group":"russian-system","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["d5"],["Nf3"],["Bg7"],["Qb3"]],"star":true},
  {"id":"neo-grunfeld-defense","name":"Neo-Grünfeld Defense","group":"neo-grunfeld-defense","moves":[["d4"],["Nf6"],["c4"],["g6"],["g3"],["Bg7"],["Bg2"],["d5"]],"star":true},
  {"id":"three-knights","name":"Three Knights","group":"three-knights","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["d5"],["Nf3"],["Bg7"]],"star":true},
  {"id":"brinckmann-attack","name":"Brinckmann Attack","group":"brinckmann-attack","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["d5"],["Bf4"]],"star":true},
  {"id":"stockholm-variation","name":"Stockholm Variation","group":"stockholm-variation","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["d5"],["Bg5"],["Ne4"],["cxd5"],["Nxg5"]],"star":true},
  {"id":"stockholm-qd5","name":"Stockholm, Qd5","group":"stockholm","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["d5"],["Bg5"],["Ne4"],["Nxe4"],["dxe4"],["d5"]],"star":true},
  {"id":"exchange-main-line","name":"Exchange, Main Line","group":"exchange","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["d5"],["cxd5"],["Nxd5"],["e4"],["Nxc3"],["bxc3"],["Bg7"],["Nf3"],["c5"],["Rb1"],["O-O"],["Be2"],["cxd4"],["cxd4"],["Qa5+"],["Qd2"],["Qxd2+"],["Bxd2"],["b6"],["O-O"],["Bb7"]]},
  {"id":"exchange-smyslov-bc4","name":"Exchange, Smyslov Bc4","group":"exchange","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["d5"],["cxd5"],["Nxd5"],["e4"],["Nxc3"],["bxc3"],["Bg7"],["Bc4"],["c5"],["Ne2"],["Nc6"],["Be3"],["O-O"],["O-O"],["Bg4"],["f3"],["Na5"],["Bd3"],["cxd4"],["cxd4"],["Be6"]]},
  {"id":"exchange-be3-qd2","name":"Exchange, Be3 Qd2","group":"exchange","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["d5"],["cxd5"],["Nxd5"],["e4"],["Nxc3"],["bxc3"],["Bg7"],["Be3"],["c5"],["Qd2"],["O-O"],["Rc1"]],"star":true},
  {"id":"russian-qxc4","name":"Russian, Qxc4","group":"russian","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["d5"],["Nf3"],["Bg7"],["Qb3"],["dxc4"],["Qxc4"],["O-O"],["e4"],["Bg4"],["Be3"],["Nfd7"]],"star":true},
  {"id":"fianchetto","name":"Fianchetto","group":"fianchetto","moves":[["d4"],["Nf6"],["c4"],["g6"],["g3"],["Bg7"],["Bg2"],["d5"],["cxd5"],["Nxd5"],["Nf3"],["O-O"],["O-O"]],"star":true},
  {"id":"gibbon-gambit","name":"Gibbon Gambit","group":"gibbon-gambit","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["d5"],["g4"]],"star":true},
  {"id":"zaitsev-gambit","name":"Zaitsev Gambit","group":"zaitsev-gambit","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["d5"],["h4"]],"star":true},
  {"id":"flohr-variation","name":"Flohr Variation","group":"flohr-variation","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["d5"],["Nf3"],["Bg7"],["Qa4+"]],"star":true},
  {"id":"smyslov-defense","name":"Smyslov Defense","group":"smyslov-defense","moves":[["d4"],["d5"],["c4"],["c6"],["Nc3"],["Nf6"],["e3"],["g6"],["Nf3"],["Bg7"],["Bd3"],["O-O"],["O-O"],["Bg4"]],"star":true},
  {"id":"lundin-variation","name":"Lundin Variation","group":"lundin-variation","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["d5"],["Bg5"],["Ne4"],["Nxe4"],["dxe4"],["Qd2"],["c5"]],"star":true},
  {"id":"lutikov-variation","name":"Lutikov Variation","group":"lutikov-variation","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["d5"],["f3"]],"star":true},
  {"id":"pachman-variation","name":"Pachman Variation","group":"pachman-variation","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["d5"],["e3"],["Bg7"],["Qb3"],["dxc4"],["Bxc4"],["O-O"],["Nf3"],["Nbd7"],["Ng5"]],"star":true},
  {"id":"botvinnik-variation","name":"Botvinnik Variation","group":"botvinnik-variation","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["d5"],["Nf3"],["Bg7"],["e3"],["O-O"],["Qb3"],["e6"]],"star":true},
  {"id":"opocensky-variation","name":"Opocensky Variation","group":"opocensky-variation","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["d5"],["Nf3"],["Bg7"],["e3"],["O-O"],["Bd2"]],"star":true},
  {"id":"makogonov-variation","name":"Makogonov Variation","group":"makogonov-variation","moves":[["d4"],["Nf6"],["c4"],["g6"],["Nc3"],["d5"],["Nf3"],["Bg7"],["e3"],["O-O"],["b4"]],"star":true}
 ]
};
