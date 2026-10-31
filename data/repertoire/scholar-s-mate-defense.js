// Scholar's Mate Defense — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "scholar-s-mate-defense",
 "name": "Scholar's Mate Defense",
 "color": "b",
 "oneLiner": "1.e4 e5 2.Bc4 or 2.Qh5 — an early attack on f7 that looks like instant mate. Stay calm.",
 "trunk": "1.e4 e5",
 "groups": {
  "wayward-queen": {
   "label": "Wayward Queen",
   "blurb": ""
  },
  "bishop-first": {
   "label": "Bishop First",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Defences",
 "lines": [
  {"id":"wayward-queen-nd4","name":"Wayward Queen, Nd4","group":"wayward-queen","moves":[["e4"],["e5"],["Qh5"],["Nc6"],["Bc4"],["g6"],["Qf3"],["Nf6"],["Qb3"],["Nd4"],["Qxb7"]],"star":true,"idea":"Do not panic and do not grab material. Chase the queen with ...g6 and ...Nc6, then guard f7 with ...Nf6 or ...Qe7. Once the queen is pushed back, the attack runs out of steam and you are fine."},
  {"id":"wayward-queen-qxb7-nxc2","name":"Wayward Queen, Qxb7 Nxc2","group":"wayward-queen","moves":[["e4"],["e5"],["Qh5"],["Nc6"],["Bc4"],["g6"],["Qf3"],["Nf6"],["Qb3"],["Nd4"],["Qxb7"],["Nxc2+"]]},
  {"id":"bishop-first-nd4","name":"Bishop First, Nd4","group":"bishop-first","moves":[["e4"],["e5"],["Bc4"],["Nc6"],["Qh5"],["g6"],["Qf3"],["Nf6"],["Qb3"],["Nd4"],["Qxb7"]],"star":true},
  {"id":"bishop-first-nxc2","name":"Bishop First, Nxc2","group":"bishop-first","moves":[["e4"],["e5"],["Bc4"],["Nc6"],["Qh5"],["g6"],["Qf3"],["Nf6"],["Qb3"],["Nd4"],["Qxb7"],["Nxc2+"]]}
 ]
};
