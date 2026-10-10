// Barnes Opening — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "barnes-opening",
 "name": "Barnes Opening",
 "color": "w",
 "oneLiner": "1.f3 — a weird, weakening first move; mostly a trap to avoid.",
 "trunk": "1.f3",
 "groups": {
  "1-f3": {
   "label": "1.f3",
   "blurb": ""
  },
  "1-f3-e5-2-e4-nf6-3-nc3-d5": {
   "label": "1.f3 e5 2.e4 Nf6 3.Nc3 d5",
   "blurb": ""
  },
  "1-f3-e5-2-kf2": {
   "label": "1.f3 e5 2.Kf2",
   "blurb": ""
  },
  "1-f3-d5-2-e4-dxe4-3-fxe4-e5": {
   "label": "1.f3 d5 2.e4 dxe4 3.fxe4 e5",
   "blurb": ""
  },
  "1-f3-d5-2-e4-e5": {
   "label": "1.f3 d5 2.e4 e5",
   "blurb": ""
  },
  "1-f3-e5-2-e4-nc6-3-nc3-bc5": {
   "label": "1.f3 e5 2.e4 Nc6 3.Nc3 Bc5",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Systems",
 "lines": [
  {"id":"1-f3","name":"1.f3","group":"1-f3","moves":[["f3"]],"star":true,"idea":"1.f3 blocks the knight and weakens the king. Know the dangers, and know that Black can exploit it quickly."},
  {"id":"1-f3-e5-2-e4-nf6-3-nc3-d5","name":"1.f3 e5 2.e4 Nf6 3.Nc3 d5","group":"1-f3-e5-2-e4-nf6-3-nc3-d5","moves":[["f3"],["e5"],["e4"],["Nf6"],["Nc3"],["d5"]],"star":true},
  {"id":"1-f3-e5-2-kf2","name":"1.f3 e5 2.Kf2","group":"1-f3-e5-2-kf2","moves":[["f3"],["e5"],["Kf2"]],"star":true},
  {"id":"1-f3-d5-2-e4-dxe4-3-fxe4-e5","name":"1.f3 d5 2.e4 dxe4 3.fxe4 e5","group":"1-f3-d5-2-e4-dxe4-3-fxe4-e5","moves":[["f3"],["d5"],["e4"],["dxe4"],["fxe4"],["e5"],["Nf3"],["Nc6"]],"star":true},
  {"id":"1-f3-d5-2-e4-e5","name":"1.f3 d5 2.e4 e5","group":"1-f3-d5-2-e4-e5","moves":[["f3"],["d5"],["e4"],["e5"]],"star":true},
  {"id":"1-f3-e5-2-e4-nc6-3-nc3-bc5","name":"1.f3 e5 2.e4 Nc6 3.Nc3 Bc5","group":"1-f3-e5-2-e4-nc6-3-nc3-bc5","moves":[["f3"],["e5"],["e4"],["Nc6"],["Nc3"],["Bc5"]],"star":true}
 ]
};
