// Rat Defense — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "rat-defense",
 "name": "Rat Defense",
 "color": "b",
 "oneLiner": "1.e4 d6 2.d4 g6 — wait, then react to White's setup.",
 "trunk": "1.e4 d6 2.d4",
 "groups": {
  "1-e4-d6-2-d4-g6": {
   "label": "1.e4 d6 2.d4 g6",
   "blurb": ""
  },
  "1-e4-d6-2-d4-g6-3-nc3-bg7": {
   "label": "1.e4 d6 2.d4 g6 3.Nc3 Bg7",
   "blurb": ""
  },
  "1-e4-d6-2-d4-g6-3-nc3-c6": {
   "label": "1.e4 d6 2.d4 g6 3.Nc3 c6",
   "blurb": ""
  },
  "1-e4-d6-2-d4-e5-3-nf3-exd4": {
   "label": "1.e4 d6 2.d4 e5 3.Nf3 exd4",
   "blurb": ""
  },
  "1-e4-d6-2-d4-nf6-3-nc3-e5": {
   "label": "1.e4 d6 2.d4 Nf6 3.Nc3 e5",
   "blurb": ""
  },
  "1-e4-d6-2-d4-e5-3-dxe5-dxe5": {
   "label": "1.e4 d6 2.d4 e5 3.dxe5 dxe5",
   "blurb": ""
  },
  "1-e4-d6-2-d4-d5-3-e5-e6": {
   "label": "1.e4 d6 2.d4 d5 3.e5 e6",
   "blurb": ""
  },
  "1-e4-d6-2-d4-e5-3-nf3-nd7": {
   "label": "1.e4 d6 2.d4 e5 3.Nf3 Nd7",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Defences",
 "lines": [
  {"id":"1-e4-d6-2-d4-g6","name":"1.e4 d6 2.d4 g6","group":"1-e4-d6-2-d4-g6","moves":[["e4"],["d6"],["d4"],["g6"]],"star":true,"idea":"A flexible way to reach Pirc and Modern structures. Black keeps options open and avoids sharp theory."},
  {"id":"1-e4-d6-2-d4-g6-3-nc3-bg7","name":"1.e4 d6 2.d4 g6 3.Nc3 Bg7","group":"1-e4-d6-2-d4-g6-3-nc3-bg7","moves":[["e4"],["d6"],["d4"],["g6"],["Nc3"],["Bg7"],["Nf3"],["Nf6"]],"star":true},
  {"id":"1-e4-d6-2-d4-g6-3-nc3-c6","name":"1.e4 d6 2.d4 g6 3.Nc3 c6","group":"1-e4-d6-2-d4-g6-3-nc3-c6","moves":[["e4"],["d6"],["d4"],["g6"],["Nc3"],["c6"],["Nf3"],["Bg7"]],"star":true},
  {"id":"1-e4-d6-2-d4-g6-3-nc3-bg7-2","name":"1.e4 d6 2.d4 g6 3.Nc3 Bg7","group":"1-e4-d6-2-d4-g6-3-nc3-bg7","moves":[["e4"],["d6"],["d4"],["g6"],["Nc3"],["Bg7"],["f4"],["c6"]]},
  {"id":"1-e4-d6-2-d4-e5-3-nf3-exd4","name":"1.e4 d6 2.d4 e5 3.Nf3 exd4","group":"1-e4-d6-2-d4-e5-3-nf3-exd4","moves":[["e4"],["d6"],["d4"],["e5"],["Nf3"],["exd4"],["Nxd4"]],"star":true},
  {"id":"1-e4-d6-2-d4-nf6-3-nc3-e5","name":"1.e4 d6 2.d4 Nf6 3.Nc3 e5","group":"1-e4-d6-2-d4-nf6-3-nc3-e5","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["e5"],["Nf3"],["exd4"],["Nxd4"]],"star":true},
  {"id":"1-e4-d6-2-d4-e5-3-dxe5-dxe5","name":"1.e4 d6 2.d4 e5 3.dxe5 dxe5","group":"1-e4-d6-2-d4-e5-3-dxe5-dxe5","moves":[["e4"],["d6"],["d4"],["e5"],["dxe5"],["dxe5"],["Qxd8+"],["Kxd8"],["Bc4"]],"star":true},
  {"id":"1-e4-d6-2-d4-d5-3-e5-e6","name":"1.e4 d6 2.d4 d5 3.e5 e6","group":"1-e4-d6-2-d4-d5-3-e5-e6","moves":[["e4"],["d6"],["d4"],["d5"],["e5"],["e6"]],"star":true},
  {"id":"1-e4-d6-2-d4-e5-3-nf3-nd7","name":"1.e4 d6 2.d4 e5 3.Nf3 Nd7","group":"1-e4-d6-2-d4-e5-3-nf3-nd7","moves":[["e4"],["d6"],["d4"],["e5"],["Nf3"],["Nd7"]],"star":true}
 ]
};
