// Nimzowitsch Defense — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "nimzowitsch-defense",
 "name": "Nimzowitsch Defense",
 "color": "b",
 "oneLiner": "1.e4 Nc6 — develop a knight first and keep the centre flexible (includes rare side-lines).",
 "trunk": "1.e4 Nc6",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "scandinavian-variation": {
   "label": "Scandinavian Variation",
   "blurb": ""
  },
  "williams-variation": {
   "label": "Williams Variation",
   "blurb": ""
  },
  "1-e4-nc6-2-nf3-d6-3-d4-nf6": {
   "label": "1.e4 Nc6 2.Nf3 d6 3.d4 Nf6",
   "blurb": ""
  },
  "1-e4-nc6-2-nf3-d6-3-bb5": {
   "label": "1.e4 Nc6 2.Nf3 d6 3.Bb5",
   "blurb": ""
  },
  "1-e4-nc6-2-d4-d5-3-e5-bf5": {
   "label": "1.e4 Nc6 2.d4 d5 3.e5 Bf5",
   "blurb": ""
  },
  "1-e4-nc6-2-nf3-e5-3-bc4-nf6": {
   "label": "1.e4 Nc6 2.Nf3 e5 3.Bc4 Nf6",
   "blurb": ""
  },
  "1-e4-nc6-2-nf3-e5-3-bb5-nf6": {
   "label": "1.e4 Nc6 2.Nf3 e5 3.Bb5 Nf6",
   "blurb": ""
  },
  "1-e4-nc6-2-nf3-e5-3-d4-exd4": {
   "label": "1.e4 Nc6 2.Nf3 e5 3.d4 exd4",
   "blurb": ""
  },
  "mikenas-defense": {
   "label": "Mikenas Defense",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Defences",
 "lines": [
  {"id":"nimzowitsch-defense","name":"Nimzowitsch Defense","group":"main","moves":[["e4"],["Nc6"]],"star":true,"idea":"Black delays the central pawn decision and aims for ...e5 or ...d5 later. Offbeat, so it often leaves White without preparation."},
  {"id":"scandinavian-variation","name":"Scandinavian Variation","group":"scandinavian-variation","moves":[["e4"],["Nc6"],["d4"],["d5"]],"star":true},
  {"id":"williams-variation","name":"Williams Variation","group":"williams-variation","moves":[["e4"],["Nc6"],["Nf3"],["e5"],["d4"],["exd4"],["Nxd4"]],"star":true},
  {"id":"1-e4-nc6-2-nf3-d6-3-d4-nf6","name":"1.e4 Nc6 2.Nf3 d6 3.d4 Nf6","group":"1-e4-nc6-2-nf3-d6-3-d4-nf6","moves":[["e4"],["Nc6"],["Nf3"],["d6"],["d4"],["Nf6"],["Nc3"],["Bg4"]],"star":true},
  {"id":"1-e4-nc6-2-nf3-d6-3-d4-nf6-2","name":"1.e4 Nc6 2.Nf3 d6 3.d4 Nf6","group":"1-e4-nc6-2-nf3-d6-3-d4-nf6","moves":[["e4"],["Nc6"],["Nf3"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"]]},
  {"id":"1-e4-nc6-2-nf3-d6-3-bb5","name":"1.e4 Nc6 2.Nf3 d6 3.Bb5","group":"1-e4-nc6-2-nf3-d6-3-bb5","moves":[["e4"],["Nc6"],["Nf3"],["d6"],["Bb5"]],"star":true},
  {"id":"1-e4-nc6-2-d4-d5-3-e5-bf5","name":"1.e4 Nc6 2.d4 d5 3.e5 Bf5","group":"1-e4-nc6-2-d4-d5-3-e5-bf5","moves":[["e4"],["Nc6"],["d4"],["d5"],["e5"],["Bf5"]],"star":true},
  {"id":"1-e4-nc6-2-nf3-e5-3-bc4-nf6","name":"1.e4 Nc6 2.Nf3 e5 3.Bc4 Nf6","group":"1-e4-nc6-2-nf3-e5-3-bc4-nf6","moves":[["e4"],["Nc6"],["Nf3"],["e5"],["Bc4"],["Nf6"],["Ng5"],["d5"],["exd5"],["Nxd5"]],"star":true},
  {"id":"1-e4-nc6-2-nf3-e5-3-bb5-nf6","name":"1.e4 Nc6 2.Nf3 e5 3.Bb5 Nf6","group":"1-e4-nc6-2-nf3-e5-3-bb5-nf6","moves":[["e4"],["Nc6"],["Nf3"],["e5"],["Bb5"],["Nf6"],["Nc3"]],"star":true},
  {"id":"1-e4-nc6-2-d4-d5-3-e5-bf5-2","name":"1.e4 Nc6 2.d4 d5 3.e5 Bf5","group":"1-e4-nc6-2-d4-d5-3-e5-bf5","moves":[["e4"],["Nc6"],["d4"],["d5"],["e5"],["Bf5"],["Nc3"],["e6"],["Nge2"]]},
  {"id":"1-e4-nc6-2-nf3-e5-3-d4-exd4","name":"1.e4 Nc6 2.Nf3 e5 3.d4 exd4","group":"1-e4-nc6-2-nf3-e5-3-d4-exd4","moves":[["e4"],["Nc6"],["Nf3"],["e5"],["d4"],["exd4"],["Nxd4"],["Nxd4"],["Qxd4"],["d6"]],"star":true},
  {"id":"1-e4-nc6-2-d4-e5-3-dxe5-nxe5","name":"1.e4 Nc6 2.d4 e5 3.dxe5 Nxe5","group":"mikenas-defense","moves":[["e4"],["Nc6"],["d4"],["e5"],["dxe5"],["Nxe5"]]},
  {"id":"1-e4-nc6-2-nf3-d6-3-d4-nf6-3","name":"1.e4 Nc6 2.Nf3 d6 3.d4 Nf6","group":"mikenas-defense","moves":[["e4"],["Nc6"],["Nf3"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["Bc4"]]},
  {"id":"1-e4-nc6-2-d4-d5-3-exd5-qxd5","name":"1.e4 Nc6 2.d4 d5 3.exd5 Qxd5","group":"mikenas-defense","moves":[["e4"],["Nc6"],["d4"],["d5"],["exd5"],["Qxd5"],["Nf3"]]},
  {"id":"1-e4-nc6-2-d4-e5-3-d5-nce7","name":"1.e4 Nc6 2.d4 e5 3.d5 Nce7","group":"mikenas-defense","moves":[["e4"],["Nc6"],["d4"],["e5"],["d5"],["Nce7"],["Nf3"]]},
  {"id":"1-e4-nc6-2-d4-e5-3-d5-nce7-2","name":"1.e4 Nc6 2.d4 e5 3.d5 Nce7","group":"mikenas-defense","moves":[["e4"],["Nc6"],["d4"],["e5"],["d5"],["Nce7"]]},
  {"id":"1-e4-nc6-2-b4","name":"1.e4 Nc6 2.b4","group":"mikenas-defense","moves":[["e4"],["Nc6"],["b4"]],"star":true}
 ]
};
