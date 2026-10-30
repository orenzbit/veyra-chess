// Queen's Gambit Declined — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "queen-s-gambit-declined",
 "name": "Queen's Gambit Declined",
 "color": "b",
 "oneLiner": "1.d4 d5 2.c4 e6 — hold the centre with a solid pawn on e6.",
 "trunk": "1.d4 d5 2.c4",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "orthodox-defense": {
   "label": "Orthodox Defense",
   "blurb": ""
  },
  "exchange-variation": {
   "label": "Exchange Variation",
   "blurb": ""
  },
  "tartakower-variation": {
   "label": "Tartakower Variation",
   "blurb": ""
  },
  "lasker-defense": {
   "label": "Lasker Defense",
   "blurb": ""
  },
  "cambridge-springs": {
   "label": "Cambridge Springs",
   "blurb": ""
  },
  "tarrasch-defense": {
   "label": "Tarrasch Defense",
   "blurb": ""
  },
  "semi-slav-defense": {
   "label": "Semi-Slav Defense",
   "blurb": ""
  },
  "ragozin-defense": {
   "label": "Ragozin Defense",
   "blurb": ""
  },
  "vienna-variation": {
   "label": "Vienna Variation",
   "blurb": ""
  },
  "exchange": {
   "label": "Exchange",
   "blurb": ""
  },
  "tartakower": {
   "label": "Tartakower",
   "blurb": ""
  },
  "semi-tarrasch": {
   "label": "Semi-Tarrasch",
   "blurb": ""
  },
  "alatortsev": {
   "label": "Alatortsev",
   "blurb": ""
  },
  "harrwitz-attack": {
   "label": "Harrwitz Attack",
   "blurb": ""
  },
  "albin-counter-gambit": {
   "label": "Albin-Counter-Gambit",
   "blurb": ""
  },
  "barmen-variation": {
   "label": "Barmen Variation",
   "blurb": ""
  },
  "catalan-type": {
   "label": "Catalan-type",
   "blurb": ""
  },
  "marshall-defense": {
   "label": "Marshall Defense",
   "blurb": ""
  },
  "orthodox": {
   "label": "Orthodox",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Gambits",
 "lines": [
  {"id":"queen-s-gambit-declined","name":"Queen's Gambit Declined","group":"main","moves":[["d4"],["d5"],["c4"],["e6"]],"star":true,"idea":"Black refuses the pawn and keeps the d5-pawn supported. Solid and classical, with the problem bishop on c8 to solve."},
  {"id":"orthodox-defense","name":"Orthodox Defense","group":"orthodox-defense","moves":[["d4"],["d5"],["c4"],["e6"],["Nc3"],["Nf6"],["Bg5"],["Be7"],["e3"],["O-O"],["Nf3"],["Nbd7"]],"star":true},
  {"id":"exchange-variation","name":"Exchange Variation","group":"exchange-variation","moves":[["d4"],["d5"],["c4"],["e6"],["Nc3"],["Nf6"],["cxd5"],["exd5"]],"star":true},
  {"id":"tartakower-variation","name":"Tartakower Variation","group":"tartakower-variation","moves":[["d4"],["d5"],["c4"],["e6"],["Nc3"],["Nf6"],["Bg5"],["Be7"],["e3"],["O-O"],["Nf3"],["h6"],["Bh4"],["b6"]],"star":true},
  {"id":"lasker-defense","name":"Lasker Defense","group":"lasker-defense","moves":[["d4"],["d5"],["c4"],["e6"],["Nc3"],["Nf6"],["Bg5"],["Be7"],["e3"],["O-O"],["Nf3"],["h6"],["Bh4"],["Ne4"]],"star":true},
  {"id":"cambridge-springs","name":"Cambridge Springs","group":"cambridge-springs","moves":[["d4"],["d5"],["c4"],["e6"],["Nc3"],["Nf6"],["Bg5"],["Nbd7"],["e3"],["c6"],["Nf3"],["Qa5"]],"star":true},
  {"id":"tarrasch-defense","name":"Tarrasch Defense","group":"tarrasch-defense","moves":[["d4"],["d5"],["c4"],["e6"],["Nc3"],["c5"]],"star":true},
  {"id":"semi-slav-defense","name":"Semi-Slav Defense","group":"semi-slav-defense","moves":[["d4"],["d5"],["c4"],["e6"],["Nc3"],["c6"],["Nf3"],["Nf6"]],"star":true},
  {"id":"ragozin-defense","name":"Ragozin Defense","group":"ragozin-defense","moves":[["d4"],["d5"],["c4"],["e6"],["Nc3"],["Nf6"],["Nf3"],["Bb4"]],"star":true},
  {"id":"vienna-variation","name":"Vienna Variation","group":"vienna-variation","moves":[["d4"],["d5"],["c4"],["e6"],["Nc3"],["Nf6"],["Nf3"],["Bb4"],["cxd5"],["exd5"],["Bg5"]],"star":true},
  {"id":"exchange-bf4","name":"Exchange, Bf4","group":"exchange","moves":[["d4"],["d5"],["c4"],["e6"],["cxd5"],["exd5"],["Nc3"],["Nf6"],["Bf4"]],"star":true},
  {"id":"tartakower-bd3","name":"Tartakower, Bd3","group":"tartakower","moves":[["d4"],["d5"],["c4"],["e6"],["Nc3"],["Nf6"],["Bg5"],["Be7"],["e3"],["O-O"],["Nf3"],["h6"],["Bh4"],["b6"],["Bd3"],["Bb7"]],"star":true},
  {"id":"semi-tarrasch","name":"Semi-Tarrasch","group":"semi-tarrasch","moves":[["d4"],["d5"],["c4"],["e6"],["Nc3"],["Nf6"],["Nf3"],["c5"],["cxd5"],["Nxd5"],["e4"],["Nxc3"],["bxc3"],["cxd4"],["cxd4"]],"star":true},
  {"id":"alatortsev","name":"Alatortsev","group":"alatortsev","moves":[["d4"],["d5"],["c4"],["e6"],["Nf3"],["Nf6"],["Nc3"],["c6"]],"star":true},
  {"id":"harrwitz-attack","name":"Harrwitz Attack","group":"harrwitz-attack","moves":[["d4"],["d5"],["c4"],["e6"],["Nc3"],["Nf6"],["Bf4"]],"star":true},
  {"id":"albin-counter-gambit","name":"Albin-Counter-Gambit","group":"albin-counter-gambit","moves":[["d4"],["d5"],["c4"],["e6"],["Nc3"],["Be7"]],"star":true},
  {"id":"barmen-variation","name":"Barmen Variation","group":"barmen-variation","moves":[["d4"],["d5"],["c4"],["e6"],["Nc3"],["Nf6"],["Bg5"],["Be7"],["Nf3"],["O-O"],["e3"],["h6"],["Bh4"],["Ne4"]],"star":true},
  {"id":"catalan-type","name":"Catalan-type","group":"catalan-type","moves":[["d4"],["d5"],["c4"],["e6"],["Nf3"],["Nf6"],["g3"],["Be7"],["Bg2"],["O-O"],["O-O"]],"star":true},
  {"id":"marshall-defense","name":"Marshall Defense","group":"marshall-defense","moves":[["d4"],["d5"],["c4"],["Nf6"]],"star":true},
  {"id":"cambridge-springs-bd3","name":"Cambridge Springs, Bd3","group":"cambridge-springs","moves":[["d4"],["d5"],["c4"],["e6"],["Nc3"],["Nf6"],["Bg5"],["Nbd7"],["e3"],["c6"],["Nf3"],["Qa5"],["Nd2"],["Bb4"],["Qc2"],["O-O"],["Bd3"],["dxc4"],["Bxc4"],["Nb6"]]},
  {"id":"orthodox-rubinstein","name":"Orthodox, Rubinstein","group":"orthodox","moves":[["d4"],["d5"],["c4"],["e6"],["Nc3"],["Nf6"],["Bg5"],["Be7"],["e3"],["O-O"],["Nf3"],["Nbd7"],["Rc1"],["c6"],["Bd3"],["dxc4"],["Bxc4"],["Nd5"],["Bxe7"],["Qxe7"],["O-O"],["Nxc3"],["Rxc3"],["e5"]],"star":true},
  {"id":"orthodox-lasker-defense","name":"Orthodox, Lasker Defense","group":"orthodox","moves":[["d4"],["d5"],["c4"],["e6"],["Nc3"],["Nf6"],["Bg5"],["Be7"],["e3"],["O-O"],["Nf3"],["h6"],["Bh4"],["Ne4"],["Bxe7"],["Qxe7"],["Rc1"],["c6"],["Be2"],["Nxc3"],["Rxc3"],["dxc4"],["Bxc4"],["Nd7"]]},
  {"id":"tartakower-variation-2","name":"Tartakower Variation","group":"tartakower-variation","moves":[["d4"],["d5"],["c4"],["e6"],["Nc3"],["Nf6"],["Bg5"],["Be7"],["e3"],["O-O"],["Nf3"],["h6"],["Bh4"],["b6"],["Bxf6"],["Bxf6"],["cxd5"],["exd5"],["Rc1"],["Bb7"]]},
  {"id":"albin-counter-gambit-nbd2-and-f6","name":"Albin-Counter-Gambit, Nbd2 and f6","group":"albin-counter-gambit","moves":[["d4"],["d5"],["c4"],["e5"],["dxe5"],["d4"],["Nf3"],["Nc6"],["g3"],["Be6"],["Bg2"],["Qd7"],["O-O"],["O-O-O"],["Nbd2"],["f6"]]},
  {"id":"albin-counter-gambit-bf5-and-qd7","name":"Albin-Counter-Gambit, Bf5 and Qd7","group":"albin-counter-gambit","moves":[["d4"],["d5"],["c4"],["e5"],["dxe5"],["d4"],["Nf3"],["Nc6"],["a3"],["Bf5"],["Nbd2"],["Qd7"],["e3"],["O-O-O"]]},
  {"id":"albin-counter-gambit-lasker-trap-ends-at-7-ke2","name":"Albin-Counter-Gambit, Lasker trap (ends at 7.Ke2)","group":"albin-counter-gambit","moves":[["d4"],["d5"],["c4"],["e5"],["dxe5"],["d4"],["e3"],["Bb4+"],["Bd2"],["dxe3"],["Bxb4"],["exf2+"],["Ke2"]]},
  {"id":"albin-counter-gambit-bc5-and-be6","name":"Albin-Counter-Gambit, Bc5 and Be6","group":"albin-counter-gambit","moves":[["d4"],["d5"],["c4"],["e5"],["dxe5"],["d4"],["Nf3"],["Nc6"],["g3"],["Bc5"],["Bg2"],["Be6"],["O-O"],["Qd7"],["Nbd2"],["O-O-O"]]},
  {"id":"marshall-defense-tan-gambit","name":"Marshall Defense, Tan Gambit","group":"marshall-defense","moves":[["d4"],["d5"],["c4"],["Nf6"],["cxd5"],["c6"]]}
 ]
};
