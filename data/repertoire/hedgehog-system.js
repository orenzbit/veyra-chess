// Hedgehog System — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "hedgehog-system",
 "name": "Hedgehog System",
 "color": "b",
 "oneLiner": "1.c4 c5 or 1.Nf3 Nf6 — a solid set-up with ...e6, ...b6 and a bishop on b7.",
 "trunk": "1.c4 c5 2.Nf3 Nf6 3.Nc3 e6 4.g3 b6 5.Bg2 Bb7 6.O-O",
 "groups": {
  "bg2-setup": {
   "label": "Bg2 setup",
   "blurb": ""
  },
  "nc6-development": {
   "label": "Nc6 development",
   "blurb": ""
  },
  "quiet-re1-setup": {
   "label": "Quiet Re1 setup",
   "blurb": ""
  },
  "nc6-and-d3": {
   "label": "Nc6 and d3",
   "blurb": ""
  },
  "qxd4-and-nc6": {
   "label": "Qxd4 and Nc6",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Defences",
 "lines": [
  {"id":"bg2-setup-qc7","name":"Bg2 setup, Qc7","group":"bg2-setup","moves":[["c4"],["c5"],["Nf3"],["Nf6"],["Nc3"],["e6"],["g3"],["b6"],["Bg2"],["Bb7"],["O-O"],["Be7"],["d4"],["cxd4"],["Qxd4"],["d6"],["Rd1"],["a6"],["b3"],["Nbd7"],["Bb2"],["Qc7"]],"star":true},
  {"id":"nc6-development","name":"Nc6 development","group":"nc6-development","moves":[["c4"],["c5"],["Nf3"],["Nf6"],["Nc3"],["e6"],["g3"],["b6"],["Bg2"],["Bb7"],["O-O"],["Nc6"],["d4"],["cxd4"],["Nxd4"],["Be7"]],"star":true},
  {"id":"quiet-re1-setup","name":"Quiet Re1 setup","group":"quiet-re1-setup","moves":[["c4"],["c5"],["Nf3"],["Nf6"],["Nc3"],["e6"],["g3"],["b6"],["Bg2"],["Bb7"],["O-O"],["Be7"],["Re1"],["O-O"]],"star":true,"idea":"Build a wall with ...e6 and ...b6 and point the bishop down the long diagonal. Wait for the right moment, then open the centre with ...cxd4 or ...d6. Keep the knights flexible and the queenside pawns in reserve."},
  {"id":"nc6-and-d3","name":"Nc6 and d3","group":"nc6-and-d3","moves":[["c4"],["c5"],["Nf3"],["Nf6"],["Nc3"],["e6"],["g3"],["b6"],["Bg2"],["Bb7"],["O-O"],["Nc6"],["d3"],["Be7"]],"star":true},
  {"id":"qxd4-and-nc6","name":"Qxd4 and Nc6","group":"qxd4-and-nc6","moves":[["c4"],["c5"],["Nf3"],["Nf6"],["Nc3"],["e6"],["g3"],["b6"],["Bg2"],["Bb7"],["O-O"],["Be7"],["d4"],["cxd4"],["Qxd4"],["Nc6"]],"star":true}
 ]
};
