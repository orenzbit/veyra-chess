// Danish Gambit — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "danish-gambit",
 "name": "Danish Gambit",
 "color": "w",
 "oneLiner": "1.e4 e5 2.d4 exd4 3.c3 — sacrifice pawns for two open bishops and speed.",
 "trunk": "1.e4 e5 2.d4 exd4 3.c3",
 "groups": {
  "schlechter-defense": {
   "label": "Schlechter Defense",
   "blurb": ""
  },
  "declined": {
   "label": "Declined",
   "blurb": ""
  },
  "collijn-defense": {
   "label": "Collijn Defense",
   "blurb": ""
  },
  "copenhagen-defense": {
   "label": "Copenhagen Defense",
   "blurb": ""
  },
  "classical": {
   "label": "Classical",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Gambits",
 "lines": [
  {"id":"schlechter-defense","name":"Schlechter Defense","group":"schlechter-defense","moves":[["e4"],["e5"],["d4"],["exd4"],["c3"],["dxc3"],["Bc4"],["cxb2"],["Bxb2"],["d5"],["Bxd5"],["Nf6"]],"star":true},
  {"id":"declined","name":"Declined","group":"declined","moves":[["e4"],["e5"],["d4"],["exd4"],["c3"],["d5"]],"star":true,"idea":"White gives one or two pawns so both bishops aim at Black's king. If Black returns the extra material correctly, White is fine; if not, the attack comes quickly."},
  {"id":"collijn-defense","name":"Collijn Defense","group":"collijn-defense","moves":[["e4"],["e5"],["d4"],["exd4"],["c3"],["dxc3"],["Bc4"],["d5"]],"star":true},
  {"id":"copenhagen-defense","name":"Copenhagen Defense","group":"copenhagen-defense","moves":[["e4"],["e5"],["d4"],["exd4"],["c3"],["dxc3"],["Bc4"],["cxb2"],["Bxb2"],["Bb4+"]],"star":true},
  {"id":"classical","name":"Classical","group":"classical","moves":[["e4"],["e5"],["d4"],["exd4"],["c3"],["dxc3"],["Nxc3"]],"star":true}
 ]
};
