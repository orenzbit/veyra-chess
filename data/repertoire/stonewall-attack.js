// Stonewall Attack — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "stonewall-attack",
 "name": "Stonewall Attack",
 "color": "w",
 "oneLiner": "1.d4 d5 and f4 — a solid pawn wall with a kingside attack.",
 "trunk": "1.d4 d5",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "anti-stonewall": {
   "label": "Anti-Stonewall",
   "blurb": ""
  },
  "black-s-fianchetto": {
   "label": "Black's Fianchetto",
   "blurb": ""
  },
  "kingside": {
   "label": "Kingside",
   "blurb": ""
  },
  "dutch-style": {
   "label": "Dutch-style",
   "blurb": ""
  },
  "early-bg4": {
   "label": "Early Bg4",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Systems",
 "lines": [
  {"id":"stonewall-attack","name":"Stonewall Attack","group":"main","moves":[["d4"],["d5"],["e3"],["Nf6"],["Bd3"],["e6"],["f4"]],"star":true},
  {"id":"anti-stonewall","name":"Anti-Stonewall","group":"anti-stonewall","moves":[["d4"],["d5"],["e3"],["Nf6"],["Bd3"],["c5"],["c3"],["Nc6"],["f4"],["Bf5"]],"star":true},
  {"id":"black-s-fianchetto","name":"Black's Fianchetto","group":"black-s-fianchetto","moves":[["d4"],["d5"],["e3"],["Nf6"],["Bd3"],["g6"],["f4"],["Bg7"],["Nf3"],["O-O"]],"star":true},
  {"id":"kingside","name":"Kingside","group":"kingside","moves":[["d4"],["d5"],["e3"],["Nf6"],["Bd3"],["Bg4"]],"star":true},
  {"id":"dutch-style","name":"Dutch-style","group":"dutch-style","moves":[["d4"],["d5"],["f4"]],"star":true,"idea":"White builds pawns on d4, e3, c3 and f4, then attacks on the kingside with the bishop on d3. A plan, not a list of moves."},
  {"id":"early-bg4","name":"Early Bg4","group":"early-bg4","moves":[["d4"],["d5"],["e3"],["Bf5"],["Bd3"],["Bxd3"],["Qxd3"]],"star":true}
 ]
};
