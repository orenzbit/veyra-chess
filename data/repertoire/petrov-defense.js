// Petrov Defense — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "petrov-defense",
 "name": "Petrov Defense",
 "color": "b",
 "oneLiner": "1.e4 e5 2.Nf3 Nf6 — mirror White's attack with a counterattack.",
 "trunk": "1.e4 e5 2.Nf3 Nf6",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "classical-variation": {
   "label": "Classical Variation",
   "blurb": ""
  },
  "cochrane-gambit": {
   "label": "Cochrane Gambit",
   "blurb": ""
  },
  "stafford-gambit": {
   "label": "Stafford Gambit",
   "blurb": ""
  },
  "three-knights-game": {
   "label": "Three Knights Game",
   "blurb": ""
  },
  "nimzowitsch-attack": {
   "label": "Nimzowitsch Attack",
   "blurb": ""
  },
  "kaufmann-attack": {
   "label": "Kaufmann Attack",
   "blurb": ""
  },
  "marshall-trap": {
   "label": "Marshall Trap",
   "blurb": ""
  },
  "steinitz-attack": {
   "label": "Steinitz Attack",
   "blurb": ""
  },
  "classical": {
   "label": "Classical",
   "blurb": ""
  },
  "urusov-gambit": {
   "label": "Urusov Gambit",
   "blurb": ""
  },
  "millennium-attack": {
   "label": "Millennium Attack",
   "blurb": ""
  },
  "cochrane": {
   "label": "Cochrane",
   "blurb": ""
  },
  "three-knights": {
   "label": "Three Knights",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Defences",
 "lines": [
  {"id":"petrov-defense","name":"Petrov Defense","group":"main","moves":[["e4"],["e5"],["Nf3"],["Nf6"]],"star":true,"idea":"Black attacks e4 instead of defending e5. Drawish at top level but with many traps for White who captures on e5 carelessly."},
  {"id":"classical-variation","name":"Classical Variation","group":"classical-variation","moves":[["e4"],["e5"],["Nf3"],["Nf6"],["Nxe5"],["d6"],["Nf3"],["Nxe4"],["d4"],["d5"]],"star":true},
  {"id":"cochrane-gambit","name":"Cochrane Gambit","group":"cochrane-gambit","moves":[["e4"],["e5"],["Nf3"],["Nf6"],["Nxe5"],["d6"],["Nxf7"]],"star":true},
  {"id":"stafford-gambit","name":"Stafford Gambit","group":"stafford-gambit","moves":[["e4"],["e5"],["Nf3"],["Nf6"],["Nxe5"],["Nc6"]],"star":true},
  {"id":"three-knights-game","name":"Three Knights Game","group":"three-knights-game","moves":[["e4"],["e5"],["Nf3"],["Nf6"],["Nc3"]],"star":true},
  {"id":"nimzowitsch-attack","name":"Nimzowitsch Attack","group":"nimzowitsch-attack","moves":[["e4"],["e5"],["Nf3"],["Nf6"],["Nxe5"],["d6"],["Nf3"],["Nxe4"],["Nc3"]],"star":true},
  {"id":"kaufmann-attack","name":"Kaufmann Attack","group":"kaufmann-attack","moves":[["e4"],["e5"],["Nf3"],["Nf6"],["Nxe5"],["d6"],["Nf3"],["Nxe4"],["Bd3"]],"star":true},
  {"id":"marshall-trap","name":"Marshall Trap","group":"marshall-trap","moves":[["e4"],["e5"],["Nf3"],["Nf6"],["Nxe5"],["d6"],["Nf3"],["Nxe4"],["Nc3"],["Nxc3"],["dxc3"],["Be7"],["Be3"],["Nc6"]],"star":true},
  {"id":"steinitz-attack","name":"Steinitz Attack","group":"steinitz-attack","moves":[["e4"],["e5"],["Nf3"],["Nf6"],["d4"]],"star":true},
  {"id":"classical-line-ending-6-bd6-7-o-o-o-o-8-c4","name":"Classical (line ending 6...Bd6 7.O-O O-O 8.c4)","group":"classical","moves":[["e4"],["e5"],["Nf3"],["Nf6"],["Nxe5"],["d6"],["Nf3"],["Nxe4"],["d4"],["d5"],["Bd3"],["Bd6"],["O-O"],["O-O"],["c4"]]},
  {"id":"classical-line-ending-5-d4-d5-6-bd3-nc6","name":"Classical (line ending 5.d4 d5 6.Bd3 Nc6)","group":"classical","moves":[["e4"],["e5"],["Nf3"],["Nf6"],["Nxe5"],["d6"],["Nf3"],["Nxe4"],["d4"],["d5"],["Bd3"],["Nc6"]],"star":true},
  {"id":"classical-line-ending-7-o-o-nc6-8-c4-nb4","name":"Classical (line ending 7.O-O Nc6 8.c4 Nb4)","group":"classical","moves":[["e4"],["e5"],["Nf3"],["Nf6"],["Nxe5"],["d6"],["Nf3"],["Nxe4"],["d4"],["d5"],["Bd3"],["Be7"],["O-O"],["Nc6"],["c4"],["Nb4"]]},
  {"id":"urusov-gambit","name":"Urusov Gambit","group":"urusov-gambit","moves":[["e4"],["e5"],["Nf3"],["Nf6"],["Bc4"],["Nxe4"]],"star":true},
  {"id":"millennium-attack","name":"Millennium Attack","group":"millennium-attack","moves":[["e4"],["e5"],["Nf3"],["Nf6"],["Nxe5"],["d6"],["Nf3"],["Nxe4"],["Qe2"],["Qe7"],["d3"],["Nf6"],["Bg5"]],"star":true},
  {"id":"cochrane-main","name":"Cochrane, Main","group":"cochrane","moves":[["e4"],["e5"],["Nf3"],["Nf6"],["Nxe5"],["d6"],["Nxf7"],["Kxf7"],["d4"]],"star":true},
  {"id":"three-knights-line-ending-3-nc3-nc6-4-bb5-bb4","name":"Three Knights (line ending 3.Nc3 Nc6 4.Bb5 Bb4)","group":"three-knights","moves":[["e4"],["e5"],["Nf3"],["Nf6"],["Nc3"],["Nc6"],["Bb5"],["Bb4"]],"star":true},
  {"id":"stafford-gambit-bc5-and-h5","name":"Stafford Gambit, Bc5 and h5","group":"stafford-gambit","moves":[["e4"],["e5"],["Nf3"],["Nf6"],["Nxe5"],["Nc6"],["Nxc6"],["dxc6"],["d3"],["Bc5"],["Be2"],["h5"],["O-O"],["Bg4"]]},
  {"id":"stafford-gambit-qe2-and-nd5","name":"Stafford Gambit, Qe2 and Nd5","group":"stafford-gambit","moves":[["e4"],["e5"],["Nf3"],["Nf6"],["Nxe5"],["Nc6"],["Nxc6"],["dxc6"],["e5"],["Qe7"],["Qe2"],["Nd5"],["c4"],["Nb6"],["Nc3"],["Bf5"]]},
  {"id":"stafford-gambit-qd7","name":"Stafford Gambit, Qd7","group":"stafford-gambit","moves":[["e4"],["e5"],["Nf3"],["Nf6"],["Nxe5"],["Nc6"],["Nxc6"],["dxc6"],["d3"],["Bc5"],["Be2"],["Qd7"],["O-O"],["O-O"]]},
  {"id":"stafford-gambit-h5-and-o-o","name":"Stafford Gambit, h5 and O-O","group":"stafford-gambit","moves":[["e4"],["e5"],["Nf3"],["Nf6"],["Nxe5"],["Nc6"],["Nxc6"],["dxc6"],["d3"],["Bc5"],["Be2"],["h5"],["O-O"],["O-O"]]},
  {"id":"stafford-gambit-h5-and-qd7","name":"Stafford Gambit, h5 and Qd7","group":"stafford-gambit","moves":[["e4"],["e5"],["Nf3"],["Nf6"],["Nxe5"],["Nc6"],["Nxc6"],["dxc6"],["d3"],["Bc5"],["Be2"],["h5"],["O-O"],["Qd7"]]}
 ]
};
