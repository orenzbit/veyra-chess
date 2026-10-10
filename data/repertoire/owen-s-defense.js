// Owen's Defense — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "owen-s-defense",
 "name": "Owen's Defense",
 "color": "b",
 "oneLiner": "1.e4 b6 — fianchetto the queen's bishop against White's centre.",
 "trunk": "1.e4 b6",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "1-e4-b6-2-d4-bb7-3-bd3-f5": {
   "label": "1.e4 b6 2.d4 Bb7 3.Bd3 f5",
   "blurb": ""
  },
  "1-e4-b6-2-d4-bb7-3-bd3-e6": {
   "label": "1.e4 b6 2.d4 Bb7 3.Bd3 e6",
   "blurb": ""
  },
  "1-e4-b6-2-d4-bb7-3-nc3-e6": {
   "label": "1.e4 b6 2.d4 Bb7 3.Nc3 e6",
   "blurb": ""
  },
  "1-e4-b6-2-d4-bb7-3-bd3-nf6": {
   "label": "1.e4 b6 2.d4 Bb7 3.Bd3 Nf6",
   "blurb": ""
  },
  "1-e4-b6-2-d4-bb7-3-bd3-c5": {
   "label": "1.e4 b6 2.d4 Bb7 3.Bd3 c5",
   "blurb": ""
  },
  "1-e4-b6-2-nf3-bb7-3-nc3-e6": {
   "label": "1.e4 b6 2.Nf3 Bb7 3.Nc3 e6",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Defences",
 "lines": [
  {"id":"owen-s-defense","name":"Owen's Defense","group":"main","moves":[["e4"],["b6"]],"star":true,"idea":"The bishop on b7 pressures e4 from afar. White gets space, but Black stays flexible and solid."},
  {"id":"1-e4-b6-2-d4-bb7-3-bd3-f5","name":"1.e4 b6 2.d4 Bb7 3.Bd3 f5","group":"1-e4-b6-2-d4-bb7-3-bd3-f5","moves":[["e4"],["b6"],["d4"],["Bb7"],["Bd3"],["f5"],["exf5"],["Bxg2"],["Qh5+"],["g6"]],"star":true},
  {"id":"1-e4-b6-2-d4-bb7-3-bd3-e6","name":"1.e4 b6 2.d4 Bb7 3.Bd3 e6","group":"1-e4-b6-2-d4-bb7-3-bd3-e6","moves":[["e4"],["b6"],["d4"],["Bb7"],["Bd3"],["e6"],["Nf3"],["g6"]],"star":true},
  {"id":"1-e4-b6-2-d4-bb7-3-nc3-e6","name":"1.e4 b6 2.d4 Bb7 3.Nc3 e6","group":"1-e4-b6-2-d4-bb7-3-nc3-e6","moves":[["e4"],["b6"],["d4"],["Bb7"],["Nc3"],["e6"],["Nf3"],["Nf6"]]},
  {"id":"1-e4-b6-2-d4-bb7-3-nc3-e6-2","name":"1.e4 b6 2.d4 Bb7 3.Nc3 e6","group":"1-e4-b6-2-d4-bb7-3-nc3-e6","moves":[["e4"],["b6"],["d4"],["Bb7"],["Nc3"],["e6"],["a3"]],"star":true},
  {"id":"1-e4-b6-2-d4-bb7-3-bd3-nf6","name":"1.e4 b6 2.d4 Bb7 3.Bd3 Nf6","group":"1-e4-b6-2-d4-bb7-3-bd3-nf6","moves":[["e4"],["b6"],["d4"],["Bb7"],["Bd3"],["Nf6"],["Qe2"],["e6"],["Nf3"],["c5"]],"star":true},
  {"id":"1-e4-b6-2-d4-bb7-3-bd3-e6-2","name":"1.e4 b6 2.d4 Bb7 3.Bd3 e6","group":"1-e4-b6-2-d4-bb7-3-bd3-e6","moves":[["e4"],["b6"],["d4"],["Bb7"],["Bd3"],["e6"],["Nf3"],["Nf6"]]},
  {"id":"1-e4-b6-2-d4-bb7-3-bd3-c5","name":"1.e4 b6 2.d4 Bb7 3.Bd3 c5","group":"1-e4-b6-2-d4-bb7-3-bd3-c5","moves":[["e4"],["b6"],["d4"],["Bb7"],["Bd3"],["c5"],["dxc5"],["bxc5"],["c3"],["e6"]],"star":true},
  {"id":"1-e4-b6-2-nf3-bb7-3-nc3-e6","name":"1.e4 b6 2.Nf3 Bb7 3.Nc3 e6","group":"1-e4-b6-2-nf3-bb7-3-nc3-e6","moves":[["e4"],["b6"],["Nf3"],["Bb7"],["Nc3"],["e6"]],"star":true}
 ]
};
