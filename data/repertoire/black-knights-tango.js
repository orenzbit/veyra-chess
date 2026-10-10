// Black Knights' Tango — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "black-knights-tango",
 "name": "Black Knights' Tango",
 "color": "b",
 "oneLiner": "1.d4 Nf6 2.c4 Nc6 — an offbeat reply that avoids main-line theory.",
 "trunk": "1.d4 Nf6 2.c4 Nc6",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "nf3-e6": {
   "label": "Nf3 e6",
   "blurb": ""
  },
  "nc3-e5": {
   "label": "Nc3 e5",
   "blurb": ""
  },
  "d5-ne5": {
   "label": "d5 Ne5",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Defences",
 "lines": [
  {"id":"black-knights-tango","name":"Black Knights' Tango","group":"main","moves":[["d4"],["Nf6"],["c4"],["Nc6"]],"star":true,"idea":"Black attacks the centre with the knights before choosing a pawn structure. White gets space, but must know the tricks around ...Nb4/...Nd4."},
  {"id":"nf3-e6","name":"Nf3 e6","group":"nf3-e6","moves":[["d4"],["Nf6"],["c4"],["Nc6"],["Nf3"],["e6"],["Nc3"],["Bb4"]],"star":true},
  {"id":"nc3-e5","name":"Nc3 e5","group":"nc3-e5","moves":[["d4"],["Nf6"],["c4"],["Nc6"],["Nc3"],["e5"],["d5"],["Nd4"],["Nf3"],["Nxf3+"],["exf3"],["Bb4"]],"star":true},
  {"id":"d5-ne5","name":"d5 Ne5","group":"d5-ne5","moves":[["d4"],["Nf6"],["c4"],["Nc6"],["d5"],["Ne5"],["f4"],["Ng6"],["Nf3"]],"star":true}
 ]
};
