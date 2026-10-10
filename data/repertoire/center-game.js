// Center Game — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "center-game",
 "name": "Center Game",
 "color": "w",
 "oneLiner": "1.e4 e5 2.d4 exd4 3.Qxd4 — grab the centre and bring the queen out early.",
 "trunk": "1.e4 e5 2.d4 exd4",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "danish-gambit": {
   "label": "Danish Gambit",
   "blurb": ""
  },
  "danish-gambit-accepted": {
   "label": "Danish Gambit Accepted",
   "blurb": ""
  },
  "accepted": {
   "label": "Accepted",
   "blurb": ""
  },
  "berger-variation": {
   "label": "Berger Variation",
   "blurb": ""
  },
  "charousek-variation": {
   "label": "Charousek Variation",
   "blurb": ""
  },
  "paulsen-attack": {
   "label": "Paulsen Attack",
   "blurb": ""
  },
  "kieseritzky-variation": {
   "label": "Kieseritzky Variation",
   "blurb": ""
  },
  "halasz-gambit": {
   "label": "Halasz Gambit",
   "blurb": ""
  },
  "von-hennig-gambit": {
   "label": "Von Hennig Gambit",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Classical",
 "lines": [
  {"id":"center-game","name":"Center Game","group":"main","moves":[["e4"],["e5"],["d4"],["exd4"],["Qxd4"]],"star":true},
  {"id":"danish-gambit","name":"Danish Gambit","group":"danish-gambit","moves":[["e4"],["e5"],["d4"],["exd4"],["c3"]],"star":true},
  {"id":"danish-gambit-accepted","name":"Danish Gambit Accepted","group":"danish-gambit-accepted","moves":[["e4"],["e5"],["d4"],["exd4"],["c3"],["dxc3"],["Bc4"],["cxb2"],["Bxb2"]],"star":true},
  {"id":"accepted","name":"Accepted","group":"accepted","moves":[["e4"],["e5"],["d4"],["exd4"]],"star":true,"idea":"White trades the centre pawn and develops the queen fast, accepting that Black will gain tempi hitting it. Simple play, but the queen must not be careless."},
  {"id":"berger-variation","name":"Berger Variation","group":"berger-variation","moves":[["e4"],["e5"],["d4"],["exd4"],["Qxd4"],["Nc6"],["Qe3"],["Nf6"],["Nc3"],["Bb4"]],"star":true},
  {"id":"charousek-variation","name":"Charousek Variation","group":"charousek-variation","moves":[["e4"],["e5"],["d4"],["exd4"],["Qxd4"],["Nc6"],["Qe3"],["Nf6"],["Nc3"],["Bb4"],["Bd2"],["O-O"],["O-O-O"],["Re8"]],"star":true},
  {"id":"paulsen-attack","name":"Paulsen Attack","group":"paulsen-attack","moves":[["e4"],["e5"],["d4"],["exd4"],["Qxd4"],["Nc6"],["Qe3"],["g6"]],"star":true},
  {"id":"kieseritzky-variation","name":"Kieseritzky Variation","group":"kieseritzky-variation","moves":[["e4"],["e5"],["d4"],["exd4"],["Qxd4"],["Nc6"],["Qe3"],["Nf6"],["Nc3"],["Bb4"],["Bd2"],["O-O"]],"star":true},
  {"id":"halasz-gambit","name":"Halasz Gambit","group":"halasz-gambit","moves":[["e4"],["e5"],["d4"],["exd4"],["f4"]],"star":true},
  {"id":"von-hennig-gambit","name":"Von Hennig Gambit","group":"von-hennig-gambit","moves":[["e4"],["e5"],["d4"],["exd4"],["Nf3"]],"star":true}
 ]
};
