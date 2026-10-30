// Philidor Defense — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "philidor-defense",
 "name": "Philidor Defense",
 "color": "b",
 "oneLiner": "1.e4 e5 2.Nf3 d6 — a solid wall of pawns and slow counterplay.",
 "trunk": "1.e4 e5 2.Nf3 d6",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "hanham-variation": {
   "label": "Hanham Variation",
   "blurb": ""
  },
  "exchange-variation": {
   "label": "Exchange Variation",
   "blurb": ""
  },
  "lion-variation": {
   "label": "Lion Variation",
   "blurb": ""
  },
  "hanham": {
   "label": "Hanham",
   "blurb": ""
  },
  "larsen-variation": {
   "label": "Larsen Variation",
   "blurb": ""
  },
  "antoshin-variation": {
   "label": "Antoshin Variation",
   "blurb": ""
  },
  "philidor-gambit": {
   "label": "Philidor Gambit",
   "blurb": ""
  },
  "paulsen-attack": {
   "label": "Paulsen Attack",
   "blurb": ""
  },
  "steinitz-variation": {
   "label": "Steinitz Variation",
   "blurb": ""
  },
  "locock-gambit": {
   "label": "Locock Gambit",
   "blurb": ""
  },
  "exchange": {
   "label": "Exchange",
   "blurb": ""
  },
  "rellstab-variation": {
   "label": "Rellstab Variation",
   "blurb": ""
  },
  "nimzowitsch-variation": {
   "label": "Nimzowitsch Variation",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Defences",
 "lines": [
  {"id":"philidor-defense","name":"Philidor Defense","group":"main","moves":[["e4"],["e5"],["Nf3"],["d6"]],"star":true,"idea":"Black defends e5 with a pawn, keeps a compact setup and waits. It is passive, but hard to break if you know the typical plans."},
  {"id":"hanham-variation","name":"Hanham Variation","group":"hanham-variation","moves":[["e4"],["e5"],["Nf3"],["d6"],["d4"],["Nd7"]],"star":true},
  {"id":"exchange-variation","name":"Exchange Variation","group":"exchange-variation","moves":[["e4"],["e5"],["Nf3"],["d6"],["d4"],["exd4"],["Nxd4"]],"star":true},
  {"id":"lion-variation","name":"Lion Variation","group":"lion-variation","moves":[["e4"],["e5"],["Nf3"],["d6"],["d4"],["Nf6"],["Nc3"],["Nbd7"]],"star":true},
  {"id":"hanham-line-ending-3-d4-nd7-4-bc4-c6","name":"Hanham (line ending 3.d4 Nd7 4.Bc4 c6)","group":"hanham","moves":[["e4"],["e5"],["Nf3"],["d6"],["d4"],["Nd7"],["Bc4"],["c6"]],"star":true},
  {"id":"hanham-line-ending-3-d4-nd7-4-bc4-be7","name":"Hanham (line ending 3.d4 Nd7 4.Bc4 Be7)","group":"hanham","moves":[["e4"],["e5"],["Nf3"],["d6"],["d4"],["Nd7"],["Bc4"],["Be7"]]},
  {"id":"larsen-variation","name":"Larsen Variation","group":"larsen-variation","moves":[["e4"],["e5"],["Nf3"],["d6"],["d4"],["exd4"],["Nxd4"],["Nf6"],["Nc3"],["Be7"]],"star":true},
  {"id":"antoshin-variation","name":"Antoshin Variation","group":"antoshin-variation","moves":[["e4"],["e5"],["Nf3"],["d6"],["d4"],["exd4"],["Nxd4"],["Nf6"],["Nc3"],["Be7"],["Bf4"]],"star":true},
  {"id":"philidor-gambit","name":"Philidor Gambit","group":"philidor-gambit","moves":[["e4"],["e5"],["Nf3"],["d6"],["d4"],["f5"]],"star":true},
  {"id":"paulsen-attack","name":"Paulsen Attack","group":"paulsen-attack","moves":[["e4"],["e5"],["Nf3"],["d6"],["Bc4"],["Be7"],["d4"],["exd4"],["Nxd4"],["Nf6"],["Nc3"],["O-O"]],"star":true},
  {"id":"steinitz-variation","name":"Steinitz Variation","group":"steinitz-variation","moves":[["e4"],["e5"],["Nf3"],["d6"],["d4"],["exd4"],["Qxd4"]],"star":true},
  {"id":"locock-gambit","name":"Locock Gambit","group":"locock-gambit","moves":[["e4"],["e5"],["Nf3"],["d6"],["Bc4"],["f5"]],"star":true},
  {"id":"exchange-nf6","name":"Exchange, Nf6","group":"exchange","moves":[["e4"],["e5"],["Nf3"],["d6"],["d4"],["exd4"],["Nxd4"],["Nf6"],["Nc3"]],"star":true},
  {"id":"rellstab-variation","name":"Rellstab Variation","group":"rellstab-variation","moves":[["e4"],["e5"],["Nf3"],["d6"],["d4"],["Bg4"]],"star":true},
  {"id":"hanham-line-ending-5-o-o-be7-6-dxe5-dxe5","name":"Hanham (line ending 5.O-O Be7 6.dxe5 dxe5)","group":"hanham","moves":[["e4"],["e5"],["Nf3"],["d6"],["d4"],["Nd7"],["Bc4"],["c6"],["O-O"],["Be7"],["dxe5"],["dxe5"]]},
  {"id":"nimzowitsch-variation","name":"Nimzowitsch Variation","group":"nimzowitsch-variation","moves":[["e4"],["e5"],["Nf3"],["d6"],["d4"],["Nf6"],["dxe5"],["Nxe4"],["Qd5"]],"star":true},
  {"id":"hanham-line-ending-4-bc4-c6-5-ng5-nh6","name":"Hanham (line ending 4.Bc4 c6 5.Ng5 Nh6)","group":"hanham","moves":[["e4"],["e5"],["Nf3"],["d6"],["d4"],["Nd7"],["Bc4"],["c6"],["Ng5"],["Nh6"]]},
  {"id":"locock-gambit-jaenisch-variation","name":"Locock Gambit, Jaenisch Variation","group":"locock-gambit","moves":[["e4"],["e5"],["Nf3"],["d6"],["d4"],["f5"],["Bc4"],["exd4"],["Ng5"],["Nh6"],["Nxh7"]]},
  {"id":"philidor-gambit-del-rio-attack","name":"Philidor Gambit, del Rio Attack","group":"philidor-gambit","moves":[["e4"],["e5"],["Nf3"],["d6"],["d4"],["f5"],["dxe5"],["fxe4"],["Ng5"],["d5"],["e6"]]},
  {"id":"philidor-gambit-berger-variation","name":"Philidor Gambit, Berger Variation","group":"philidor-gambit","moves":[["e4"],["e5"],["Nf3"],["d6"],["d4"],["f5"],["dxe5"],["fxe4"],["Ng5"],["d5"],["e6"],["Bc5"],["Nc3"]]},
  {"id":"philidor-gambit-zukertort-variation","name":"Philidor Gambit, Zukertort Variation","group":"philidor-gambit","moves":[["e4"],["e5"],["Nf3"],["d6"],["d4"],["f5"],["Nc3"]]}
 ]
};
