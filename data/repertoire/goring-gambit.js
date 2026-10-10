// Göring Gambit — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "goring-gambit",
 "name": "Göring Gambit",
 "color": "w",
 "oneLiner": "3.d4 exd4 4.c3 — sacrifice a pawn to open lines for the pieces.",
 "trunk": "1.e4 e5 2.Nf3 Nc6 3.d4 exd4 4.c3",
 "groups": {
  "accepted": {
   "label": "Accepted",
   "blurb": ""
  },
  "declined": {
   "label": "Declined",
   "blurb": ""
  },
  "bardeleben-variation": {
   "label": "Bardeleben Variation",
   "blurb": ""
  },
  "paulsen-variation": {
   "label": "Paulsen Variation",
   "blurb": ""
  },
  "main-line": {
   "label": "Main Line",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Gambits",
 "lines": [
  {"id":"accepted","name":"Accepted","group":"accepted","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["c3"],["dxc3"],["Bc4"],["cxb2"],["Bxb2"]],"star":true},
  {"id":"declined","name":"Declined","group":"declined","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["c3"],["d5"]],"star":true,"idea":"White offers a pawn for fast development and open lines against Black's king. If Black declines with ...d5, White still gets a healthy centre."},
  {"id":"bardeleben-variation","name":"Bardeleben Variation","group":"bardeleben-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["c3"],["dxc3"],["Nxc3"],["Bb4"]],"star":true},
  {"id":"paulsen-variation","name":"Paulsen Variation","group":"paulsen-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["c3"],["dxc3"],["Nxc3"],["Nf6"]],"star":true},
  {"id":"main-line","name":"Main Line","group":"main-line","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["c3"],["dxc3"],["Bc4"],["d6"],["Nxc3"]],"star":true}
 ]
};
