// Ponziani Opening — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "ponziani-opening",
 "name": "Ponziani Opening",
 "color": "w",
 "oneLiner": "1.e4 e5 2.Nf3 Nc6 3.c3 — prepare d4 and take a big centre.",
 "trunk": "1.e4 e5 2.Nf3 Nc6 3.c3",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "jaenisch-counterattack": {
   "label": "Jaenisch Counterattack",
   "blurb": ""
  },
  "steinitz-variation": {
   "label": "Steinitz Variation",
   "blurb": ""
  },
  "leonhardt-variation": {
   "label": "Leonhardt Variation",
   "blurb": ""
  },
  "caro-gambit": {
   "label": "Caro Gambit",
   "blurb": ""
  },
  "fraser-defense": {
   "label": "Fraser Defense",
   "blurb": ""
  },
  "dubois-reti-defense": {
   "label": "Dubois-Reti Defense",
   "blurb": ""
  },
  "romanishin-variation": {
   "label": "Romanishin Variation",
   "blurb": ""
  },
  "neumann-gambit": {
   "label": "Neumann Gambit",
   "blurb": ""
  },
  "ponziani-counter-gambit": {
   "label": "Ponziani Counter Gambit",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Classical",
 "lines": [
  {"id":"ponziani-opening","name":"Ponziani Opening","group":"main","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["c3"]],"star":true,"idea":"White supports a strong d4 push before Black can react. It is less known than other open games, so opponents often lack preparation."},
  {"id":"jaenisch-counterattack","name":"Jaenisch Counterattack","group":"jaenisch-counterattack","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["c3"],["Nf6"]],"star":true},
  {"id":"steinitz-variation","name":"Steinitz Variation","group":"steinitz-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["c3"],["d5"],["Qa4"],["f6"]],"star":true},
  {"id":"leonhardt-variation","name":"Leonhardt Variation","group":"leonhardt-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["c3"],["d5"],["Qa4"],["Bd7"]],"star":true},
  {"id":"caro-gambit","name":"Caro Gambit","group":"caro-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["c3"],["Nf6"],["d4"],["Nxe4"],["d5"],["Ne7"],["Nxe5"],["Ng6"]],"star":true},
  {"id":"fraser-defense","name":"Fraser Defense","group":"fraser-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["c3"],["d5"],["Qa4"],["Nf6"]],"star":true},
  {"id":"dubois-reti-defense","name":"Dubois-Reti Defense","group":"dubois-reti-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["c3"],["d5"],["Bb5"],["dxe4"],["Nxe5"],["Qg5"]],"star":true},
  {"id":"romanishin-variation","name":"Romanishin Variation","group":"romanishin-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["c3"],["d5"],["Qa4"],["Bd7"],["Nxe5"],["Nxe5"],["d4"],["Ng6"]],"star":true},
  {"id":"neumann-gambit","name":"Neumann Gambit","group":"neumann-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["c3"],["d5"],["Qa4"],["Nf6"],["Nxe5"],["Bd6"],["Nxc6"],["bxc6"],["d4"],["O-O"]],"star":true},
  {"id":"ponziani-counter-gambit","name":"Ponziani Counter Gambit","group":"ponziani-counter-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["c3"],["d5"],["exd5"],["Qxd5"],["d4"]],"star":true}
 ]
};
