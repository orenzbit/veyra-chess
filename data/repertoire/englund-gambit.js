// Englund Gambit — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "englund-gambit",
 "name": "Englund Gambit",
 "color": "b",
 "oneLiner": "1.d4 e5 — a trappy gambit that sets quick tricks.",
 "trunk": "1.d4 e5",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "main-line": {
   "label": "Main Line",
   "blurb": ""
  },
  "declined": {
   "label": "Declined",
   "blurb": ""
  },
  "soller-gambit": {
   "label": "Soller Gambit",
   "blurb": ""
  },
  "hartlaub-gambit": {
   "label": "Hartlaub Gambit",
   "blurb": ""
  },
  "stockholm-variation": {
   "label": "Stockholm Variation",
   "blurb": ""
  },
  "felbecker-gambit": {
   "label": "Felbecker Gambit",
   "blurb": ""
  },
  "mutkin-gambit": {
   "label": "Mutkin Gambit",
   "blurb": ""
  },
  "zilbermints": {
   "label": "Zilbermints",
   "blurb": ""
  },
  "reversed-alekhine": {
   "label": "Reversed Alekhine",
   "blurb": ""
  },
  "diemer-duhm": {
   "label": "Diemer-Duhm",
   "blurb": ""
  },
  "mosquito-gambit": {
   "label": "Mosquito Gambit",
   "blurb": ""
  },
  "zilbermints-gambit": {
   "label": "Zilbermints Gambit",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Gambits",
 "lines": [
  {"id":"englund-gambit","name":"Englund Gambit","group":"main","moves":[["d4"],["e5"]],"star":true,"idea":"Black sacrifices a pawn to bring the queen out and hunt for traps. Dangerous only if White plays carelessly."},
  {"id":"main-line","name":"Main Line","group":"main-line","moves":[["d4"],["e5"],["dxe5"],["Nc6"],["Nf3"],["Qe7"]],"star":true},
  {"id":"declined","name":"Declined","group":"declined","moves":[["d4"],["e5"],["e3"]],"star":true},
  {"id":"soller-gambit","name":"Soller Gambit","group":"soller-gambit","moves":[["d4"],["e5"],["dxe5"],["Nc6"],["Nf3"],["Qe7"],["Bf4"],["Qb4+"],["Bd2"],["Qxb2"],["Bc3"],["Bb4"],["Qd2"],["Bxc3"],["Nxc3"],["Qxc3"],["Qxc3"],["Nxe5"],["Nxe5"]],"star":true},
  {"id":"hartlaub-gambit","name":"Hartlaub Gambit","group":"hartlaub-gambit","moves":[["d4"],["e5"],["dxe5"],["Nc6"],["Nf3"],["Qe7"],["Qd5"],["f6"]],"star":true},
  {"id":"stockholm-variation","name":"Stockholm Variation","group":"stockholm-variation","moves":[["d4"],["e5"],["dxe5"],["Nc6"],["Nf3"],["Qe7"],["Qd5"],["f6"],["exf6"],["Nxf6"]],"star":true},
  {"id":"felbecker-gambit","name":"Felbecker Gambit","group":"felbecker-gambit","moves":[["d4"],["e5"],["dxe5"],["Nc6"],["Nf3"],["Qe7"],["Bf4"],["Qb4+"],["Bd2"],["Qxb2"],["Bc3"],["Bb4"],["Qd2"],["Bxc3"],["Nxc3"],["Qxc3"]],"star":true},
  {"id":"mutkin-gambit","name":"Mutkin Gambit","group":"mutkin-gambit","moves":[["d4"],["e5"],["dxe5"],["Nc6"],["Nf3"],["Qe7"],["Bf4"],["Qb4+"],["Nbd2"],["Qxb2"],["e3"],["Bb4"],["Rb1"],["Qxa2"]],"star":true},
  {"id":"zilbermints","name":"Zilbermints","group":"zilbermints","moves":[["d4"],["e5"],["dxe5"],["Nc6"],["Nf3"],["Qe7"],["Bf4"],["Qb4+"],["Bd2"],["Qxb2"],["Bc3"],["Bb4"],["Qd2"],["Bxc3"],["Nxc3"],["Qxc3"],["Qxc3"],["Nxe5"]],"star":true},
  {"id":"reversed-alekhine","name":"Reversed Alekhine","group":"reversed-alekhine","moves":[["d4"],["e5"],["dxe5"],["d6"]],"star":true},
  {"id":"diemer-duhm","name":"Diemer-Duhm","group":"diemer-duhm","moves":[["d4"],["e5"],["dxe5"],["Nc6"],["e4"]],"star":true},
  {"id":"mosquito-gambit","name":"Mosquito Gambit","group":"mosquito-gambit","moves":[["d4"],["e5"],["dxe5"],["Qh4"]],"star":true},
  {"id":"zilbermints-gambit","name":"Zilbermints Gambit","group":"zilbermints-gambit","moves":[["d4"],["e5"],["dxe5"],["Nc6"],["Nf3"],["Nge7"]],"star":true}
 ]
};
