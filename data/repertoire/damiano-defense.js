// Damiano Defense — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "damiano-defense",
 "name": "Damiano Defense",
 "color": "b",
 "oneLiner": "1.e4 e5 2.Nf3 f6 — a famous bad move; the point is to know why.",
 "trunk": "1.e4 e5 2.Nf3 f6",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "1-e4-e5-2-nf3-f6-3-nxe5-fxe5": {
   "label": "1.e4 e5 2.Nf3 f6 3.Nxe5 fxe5",
   "blurb": ""
  },
  "1-e4-e5-2-nf3-f6-3-bc4": {
   "label": "1.e4 e5 2.Nf3 f6 3.Bc4",
   "blurb": ""
  },
  "1-e4-e5-2-nf3-f6-3-d4": {
   "label": "1.e4 e5 2.Nf3 f6 3.d4",
   "blurb": ""
  },
  "1-e4-e5-2-nf3-f6-3-nc3-nc6": {
   "label": "1.e4 e5 2.Nf3 f6 3.Nc3 Nc6",
   "blurb": ""
  },
  "1-e4-e5-2-nf3-f6-3-nxe5-qe7": {
   "label": "1.e4 e5 2.Nf3 f6 3.Nxe5 Qe7",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Defences",
 "lines": [
  {"id":"damiano-defense","name":"Damiano Defense","group":"main","moves":[["e4"],["e5"],["Nf3"],["f6"]],"star":true,"idea":"2...f6 weakens the king. Against it, White can sacrifice on e5 and win quickly. Study it to avoid, or to punish it as White."},
  {"id":"1-e4-e5-2-nf3-f6-3-nxe5-fxe5","name":"1.e4 e5 2.Nf3 f6 3.Nxe5 fxe5","group":"1-e4-e5-2-nf3-f6-3-nxe5-fxe5","moves":[["e4"],["e5"],["Nf3"],["f6"],["Nxe5"],["fxe5"],["Qh5+"],["Ke7"],["Qxe5+"],["Kf7"],["Bc4+"],["d5"],["Bxd5+"],["Kg6"]]},
  {"id":"1-e4-e5-2-nf3-f6-3-bc4","name":"1.e4 e5 2.Nf3 f6 3.Bc4","group":"1-e4-e5-2-nf3-f6-3-bc4","moves":[["e4"],["e5"],["Nf3"],["f6"],["Bc4"]],"star":true},
  {"id":"1-e4-e5-2-nf3-f6-3-d4","name":"1.e4 e5 2.Nf3 f6 3.d4","group":"1-e4-e5-2-nf3-f6-3-d4","moves":[["e4"],["e5"],["Nf3"],["f6"],["d4"]],"star":true},
  {"id":"1-e4-e5-2-nf3-f6-3-nc3-nc6","name":"1.e4 e5 2.Nf3 f6 3.Nc3 Nc6","group":"1-e4-e5-2-nf3-f6-3-nc3-nc6","moves":[["e4"],["e5"],["Nf3"],["f6"],["Nc3"],["Nc6"]],"star":true},
  {"id":"1-e4-e5-2-nf3-f6-3-nxe5-qe7","name":"1.e4 e5 2.Nf3 f6 3.Nxe5 Qe7","group":"1-e4-e5-2-nf3-f6-3-nxe5-qe7","moves":[["e4"],["e5"],["Nf3"],["f6"],["Nxe5"],["Qe7"]],"star":true},
  {"id":"1-e4-e5-2-nf3-f6-3-nxe5-fxe5-2","name":"1.e4 e5 2.Nf3 f6 3.Nxe5 fxe5","group":"1-e4-e5-2-nf3-f6-3-nxe5-fxe5","moves":[["e4"],["e5"],["Nf3"],["f6"],["Nxe5"],["fxe5"],["Qh5+"],["g6"],["Qxe5+"],["Qe7"]]},
  {"id":"1-e4-e5-2-nf3-f6-3-nxe5-fxe5-3","name":"1.e4 e5 2.Nf3 f6 3.Nxe5 fxe5","group":"1-e4-e5-2-nf3-f6-3-nxe5-fxe5","moves":[["e4"],["e5"],["Nf3"],["f6"],["Nxe5"],["fxe5"],["Qh5+"],["Ke7"]],"star":true}
 ]
};
