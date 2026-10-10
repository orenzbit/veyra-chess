// Elephant Gambit — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "elephant-gambit",
 "name": "Elephant Gambit",
 "color": "b",
 "oneLiner": "1.e4 e5 2.Nf3 d5 — hit the centre at once, even at the cost of a pawn.",
 "trunk": "1.e4 e5 2.Nf3 d5",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "1-e4-e5-2-nf3-d5-3-nxe5-dxe4": {
   "label": "1.e4 e5 2.Nf3 d5 3.Nxe5 dxe4",
   "blurb": ""
  },
  "1-e4-e5-2-nf3-d5-3-exd5-e4": {
   "label": "1.e4 e5 2.Nf3 d5 3.exd5 e4",
   "blurb": ""
  },
  "1-e4-e5-2-nf3-d5-3-nxe5-bd6": {
   "label": "1.e4 e5 2.Nf3 d5 3.Nxe5 Bd6",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Gambits",
 "lines": [
  {"id":"elephant-gambit","name":"Elephant Gambit","group":"main","moves":[["e4"],["e5"],["Nf3"],["d5"]],"star":true,"idea":"Black fights for the centre immediately. It is risky against good play, so the aim is to get active pieces and punish a careless White."},
  {"id":"1-e4-e5-2-nf3-d5-3-nxe5-dxe4","name":"1.e4 e5 2.Nf3 d5 3.Nxe5 dxe4","group":"1-e4-e5-2-nf3-d5-3-nxe5-dxe4","moves":[["e4"],["e5"],["Nf3"],["d5"],["Nxe5"],["dxe4"],["Nc3"]],"star":true},
  {"id":"1-e4-e5-2-nf3-d5-3-exd5-e4","name":"1.e4 e5 2.Nf3 d5 3.exd5 e4","group":"1-e4-e5-2-nf3-d5-3-exd5-e4","moves":[["e4"],["e5"],["Nf3"],["d5"],["exd5"],["e4"],["Qe2"],["Nf6"]],"star":true},
  {"id":"1-e4-e5-2-nf3-d5-3-exd5-e4-2","name":"1.e4 e5 2.Nf3 d5 3.exd5 e4","group":"1-e4-e5-2-nf3-d5-3-exd5-e4","moves":[["e4"],["e5"],["Nf3"],["d5"],["exd5"],["e4"],["Ne5"],["Nd7"]]},
  {"id":"1-e4-e5-2-nf3-d5-3-nxe5-bd6","name":"1.e4 e5 2.Nf3 d5 3.Nxe5 Bd6","group":"1-e4-e5-2-nf3-d5-3-nxe5-bd6","moves":[["e4"],["e5"],["Nf3"],["d5"],["Nxe5"],["Bd6"]],"star":true}
 ]
};
