// Semi-Slav Defense — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "semi-slav-defense",
 "name": "Semi-Slav Defense",
 "color": "b",
 "oneLiner": "2...c6 3.Nf3 Nf6 4.Nc3 e6 — a sharp mix of the Slav and the QGD.",
 "trunk": "1.d4 d5 2.c4 c6 3.Nf3 Nf6",
 "groups": {
  "meran-variation": {
   "label": "Meran Variation",
   "blurb": ""
  },
  "botvinnik-variation": {
   "label": "Botvinnik Variation",
   "blurb": ""
  },
  "moscow-variation": {
   "label": "Moscow Variation",
   "blurb": ""
  },
  "anti-moscow-gambit": {
   "label": "Anti-Moscow Gambit",
   "blurb": ""
  },
  "anti-meran": {
   "label": "Anti-Meran",
   "blurb": ""
  },
  "marshall-gambit": {
   "label": "Marshall Gambit",
   "blurb": ""
  },
  "stoltz-variation": {
   "label": "Stoltz Variation",
   "blurb": ""
  },
  "stonewall-variation": {
   "label": "Stonewall Variation",
   "blurb": ""
  },
  "cambridge-springs-type": {
   "label": "Cambridge Springs-type",
   "blurb": ""
  },
  "ragozin-type": {
   "label": "Ragozin-type",
   "blurb": ""
  },
  "romih-variation": {
   "label": "Romih Variation",
   "blurb": ""
  },
  "moscow": {
   "label": "Moscow",
   "blurb": ""
  },
  "accelerated-meran": {
   "label": "Accelerated Meran",
   "blurb": ""
  },
  "chebanenko-type": {
   "label": "Chebanenko-type",
   "blurb": ""
  },
  "noteboom-variation": {
   "label": "Noteboom Variation",
   "blurb": ""
  },
  "abrahams-variation": {
   "label": "Abrahams Variation",
   "blurb": ""
  },
  "reynolds-variation": {
   "label": "Reynolds Variation",
   "blurb": ""
  },
  "stonewall-type": {
   "label": "Stonewall-type",
   "blurb": ""
  },
  "exchange": {
   "label": "Exchange",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Defences",
 "lines": [
  {"id":"meran-variation","name":"Meran Variation","group":"meran-variation","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["Nc3"],["e6"],["e3"],["Nbd7"],["Bd3"],["dxc4"],["Bxc4"],["b5"]],"star":true},
  {"id":"botvinnik-variation","name":"Botvinnik Variation","group":"botvinnik-variation","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["Nc3"],["e6"],["Bg5"],["dxc4"],["e4"],["b5"]],"star":true},
  {"id":"moscow-variation","name":"Moscow Variation","group":"moscow-variation","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["Nc3"],["e6"],["Bg5"],["h6"]],"star":true},
  {"id":"anti-moscow-gambit","name":"Anti-Moscow Gambit","group":"anti-moscow-gambit","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["Nc3"],["e6"],["Bg5"],["h6"],["Bh4"],["dxc4"],["e4"],["g5"],["Bg3"],["b5"]],"star":true},
  {"id":"anti-meran","name":"Anti-Meran","group":"anti-meran","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["Nc3"],["e6"],["Qc2"]],"star":true,"idea":"Black builds a solid centre but accepts a blocked c8-bishop. The Meran and Botvinnik lines lead to very sharp, double-edged play."},
  {"id":"marshall-gambit","name":"Marshall Gambit","group":"marshall-gambit","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["Nc3"],["e6"],["e4"],["dxe4"],["Nxe4"],["Bb4+"]],"star":true},
  {"id":"stoltz-variation","name":"Stoltz Variation","group":"stoltz-variation","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["Nc3"],["e6"],["e3"],["Nbd7"],["Bd3"],["Bd6"]],"star":true},
  {"id":"stonewall-variation","name":"Stonewall Variation","group":"stonewall-variation","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["Nc3"],["e6"],["e3"],["Nbd7"],["Bd3"],["dxc4"],["Bxc4"],["b5"],["Be2"],["Bb7"]],"star":true},
  {"id":"cambridge-springs-type","name":"Cambridge Springs-type","group":"cambridge-springs-type","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["Nc3"],["e6"],["Bg5"],["Nbd7"],["e3"],["Qa5"]],"star":true},
  {"id":"ragozin-type","name":"Ragozin-type","group":"ragozin-type","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["Nc3"],["e6"],["Bg5"],["Nbd7"],["e3"],["Qa5"],["Nd2"]],"star":true},
  {"id":"romih-variation","name":"Romih Variation","group":"romih-variation","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["Nc3"],["e6"],["Bg5"],["h6"],["Bxf6"],["Qxf6"]],"star":true},
  {"id":"moscow-bxf6-qxf6","name":"Moscow, Bxf6 Qxf6","group":"moscow","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["Nc3"],["e6"],["Bg5"],["h6"],["Bxf6"],["Qxf6"],["e3"],["Nd7"]],"star":true},
  {"id":"accelerated-meran","name":"Accelerated Meran","group":"accelerated-meran","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["e3"],["e6"],["Nc3"],["Nbd7"]],"star":true},
  {"id":"chebanenko-type","name":"Chebanenko-type","group":"chebanenko-type","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["Nc3"],["a6"],["c5"]],"star":true},
  {"id":"noteboom-variation","name":"Noteboom Variation","group":"noteboom-variation","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["Nc3"],["e6"],["e3"],["dxc4"]],"star":true},
  {"id":"abrahams-variation","name":"Abrahams Variation","group":"abrahams-variation","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["Nc3"],["e6"],["e3"],["dxc4"],["Bxc4"],["b5"],["Bd3"],["Bb7"]],"star":true},
  {"id":"reynolds-variation","name":"Reynolds Variation","group":"reynolds-variation","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["Nc3"],["e6"],["e3"],["Nbd7"],["Bd3"],["dxc4"],["Bxc4"],["b5"],["Bd3"],["Bb7"],["O-O"],["a6"]],"star":true},
  {"id":"stonewall-type","name":"Stonewall-type","group":"stonewall-type","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["e3"],["e6"],["Bd3"],["Nbd7"],["Nc3"]],"star":true},
  {"id":"exchange","name":"Exchange","group":"exchange","moves":[["d4"],["d5"],["c4"],["c6"],["Nf3"],["Nf6"],["Nc3"],["e6"],["cxd5"],["exd5"]],"star":true}
 ]
};
