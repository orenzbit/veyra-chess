// Queen's Indian Defense — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "queen-s-indian-defense",
 "name": "Queen's Indian Defense",
 "color": "b",
 "oneLiner": "1.d4 Nf6 2.c4 e6 3.Nf3 b6 — control e4 with the bishop on b7.",
 "trunk": "1.d4 Nf6 2.c4 e6 3.Nf3 b6",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "petrosian-variation": {
   "label": "Petrosian Variation",
   "blurb": ""
  },
  "fianchetto-variation": {
   "label": "Fianchetto Variation",
   "blurb": ""
  },
  "anti-queen-s-indian": {
   "label": "Anti-Queen's Indian",
   "blurb": ""
  },
  "main-line": {
   "label": "Main Line",
   "blurb": ""
  },
  "fianchetto": {
   "label": "Fianchetto",
   "blurb": ""
  },
  "petrosian": {
   "label": "Petrosian",
   "blurb": ""
  },
  "kasparov-petrosian": {
   "label": "Kasparov-Petrosian",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Defences",
 "lines": [
  {"id":"queen-s-indian-defense","name":"Queen's Indian Defense","group":"main","moves":[["d4"],["Nf6"],["c4"],["e6"],["Nf3"],["b6"]],"star":true,"idea":"Black fianchettoes the queen's bishop to fight for e4 and the centre. Solid and flexible."},
  {"id":"petrosian-variation","name":"Petrosian Variation","group":"petrosian-variation","moves":[["d4"],["Nf6"],["c4"],["e6"],["Nf3"],["b6"],["a3"]],"star":true},
  {"id":"fianchetto-variation","name":"Fianchetto Variation","group":"fianchetto-variation","moves":[["d4"],["Nf6"],["c4"],["e6"],["Nf3"],["b6"],["g3"],["Bb7"],["Bg2"]],"star":true},
  {"id":"anti-queen-s-indian","name":"Anti-Queen's Indian","group":"anti-queen-s-indian","moves":[["d4"],["Nf6"],["c4"],["e6"],["Nf3"],["b6"],["Qc2"]],"star":true},
  {"id":"main-line-ba6","name":"Main Line, Ba6","group":"main-line","moves":[["d4"],["Nf6"],["c4"],["e6"],["Nf3"],["b6"],["g3"],["Ba6"],["b3"],["Bb4+"],["Bd2"],["Be7"],["Bg2"],["c6"],["Bc3"],["d5"],["Ne5"],["Nfd7"],["Nxd7"],["Nxd7"],["Nd2"],["O-O"],["O-O"]],"star":true},
  {"id":"fianchetto-ne4","name":"Fianchetto, Ne4","group":"fianchetto","moves":[["d4"],["Nf6"],["c4"],["e6"],["Nf3"],["b6"],["g3"],["Bb7"],["Bg2"],["Be7"],["O-O"],["O-O"],["Nc3"],["Ne4"],["Qc2"],["Nxc3"],["Qxc3"],["c5"]],"star":true},
  {"id":"petrosian-nxd5","name":"Petrosian, Nxd5","group":"petrosian","moves":[["d4"],["Nf6"],["c4"],["e6"],["Nf3"],["b6"],["a3"],["Bb7"],["Nc3"],["d5"],["cxd5"],["Nxd5"],["Qc2"],["Nxc3"],["bxc3"],["Be7"],["e4"],["O-O"]],"star":true},
  {"id":"kasparov-petrosian","name":"Kasparov-Petrosian","group":"kasparov-petrosian","moves":[["d4"],["Nf6"],["c4"],["e6"],["Nf3"],["b6"],["a3"],["Ba6"],["Qc2"],["Bb7"],["Nc3"],["c5"],["e4"],["cxd4"],["Nxd4"],["Nc6"],["Nxc6"],["Bxc6"]],"star":true}
 ]
};
