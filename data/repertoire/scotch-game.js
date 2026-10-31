// Scotch Game — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "scotch-game",
 "name": "Scotch Game",
 "color": "w",
 "oneLiner": "1.e4 e5 2.Nf3 Nc6 3.d4 — open the game right away and fight for the centre.",
 "trunk": "1.e4 e5 2.Nf3 Nc6",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "scotch-gambit": {
   "label": "Scotch Gambit",
   "blurb": ""
  },
  "goring-gambit": {
   "label": "Göring Gambit",
   "blurb": ""
  },
  "classical-variation": {
   "label": "Classical Variation",
   "blurb": ""
  },
  "knight-variation": {
   "label": "Knight Variation",
   "blurb": ""
  },
  "four-knights-variation": {
   "label": "Four Knights Variation",
   "blurb": ""
  },
  "mieses-variation": {
   "label": "Mieses Variation",
   "blurb": ""
  },
  "steinitz-variation": {
   "label": "Steinitz Variation",
   "blurb": ""
  },
  "ghulam-kassim-variation": {
   "label": "Ghulam Kassim Variation",
   "blurb": ""
  },
  "schmidt-variation": {
   "label": "Schmidt Variation",
   "blurb": ""
  },
  "blumenfeld-attack": {
   "label": "Blumenfeld Attack",
   "blurb": ""
  },
  "horwitz-attack": {
   "label": "Horwitz Attack",
   "blurb": ""
  },
  "malaniuk-variation": {
   "label": "Malaniuk Variation",
   "blurb": ""
  },
  "potter-variation": {
   "label": "Potter Variation",
   "blurb": ""
  },
  "tartakower-variation": {
   "label": "Tartakower Variation",
   "blurb": ""
  },
  "mieses": {
   "label": "Mieses",
   "blurb": ""
  },
  "haxo-gambit": {
   "label": "Haxo Gambit",
   "blurb": ""
  },
  "benima-defense": {
   "label": "Benima Defense",
   "blurb": ""
  },
  "paulsen-attack": {
   "label": "Paulsen Attack",
   "blurb": ""
  },
  "modern-defense": {
   "label": "Modern Defense",
   "blurb": ""
  },
  "lolli-variation": {
   "label": "Lolli Variation",
   "blurb": ""
  },
  "relfsson-gambit": {
   "label": "Relfsson Gambit",
   "blurb": ""
  },
  "alekhine-gambit": {
   "label": "Alekhine Gambit",
   "blurb": ""
  },
  "vitzthum-attack": {
   "label": "Vitzthum Attack",
   "blurb": ""
  },
  "napoleon-gambit": {
   "label": "Napoleon Gambit",
   "blurb": ""
  },
  "braune-variation": {
   "label": "Braune Variation",
   "blurb": ""
  },
  "fraser-variation": {
   "label": "Fraser Variation",
   "blurb": ""
  },
  "paulsen-variation": {
   "label": "Paulsen Variation",
   "blurb": ""
  },
  "meitner-variation": {
   "label": "Meitner Variation",
   "blurb": ""
  },
  "cochrane-variation": {
   "label": "Cochrane Variation",
   "blurb": ""
  },
  "romanishin-variation": {
   "label": "Romanishin Variation",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Classical",
 "lines": [
  {"id":"scotch-game","name":"Scotch Game","group":"main","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["Nxd4"]],"star":true},
  {"id":"scotch-gambit","name":"Scotch Gambit","group":"scotch-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["Bc4"]],"star":true},
  {"id":"goring-gambit","name":"Göring Gambit","group":"goring-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["c3"]],"star":true},
  {"id":"classical-variation","name":"Classical Variation","group":"classical-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["Nxd4"],["Bc5"]],"star":true},
  {"id":"knight-variation","name":"Knight Variation","group":"knight-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["Nxd4"],["Nf6"]],"star":true},
  {"id":"four-knights-variation","name":"Four Knights Variation","group":"four-knights-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["Nxd4"],["Nf6"],["Nc3"]],"star":true},
  {"id":"mieses-variation","name":"Mieses Variation","group":"mieses-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["Nxd4"],["Nf6"],["Nxc6"],["bxc6"],["e5"],["Qe7"],["Qe2"],["Nd5"],["c4"],["Ba6"]],"star":true},
  {"id":"steinitz-variation","name":"Steinitz Variation","group":"steinitz-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["Nxd4"],["Qh4"]],"star":true},
  {"id":"ghulam-kassim-variation","name":"Ghulam Kassim Variation","group":"ghulam-kassim-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["Nxd4"],["Nf6"],["Nc3"],["Bb4"],["Nxc6"],["bxc6"],["Bd3"],["d5"],["exd5"],["cxd5"],["O-O"],["O-O"],["Bg5"],["c6"]],"star":true},
  {"id":"schmidt-variation","name":"Schmidt Variation","group":"schmidt-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["Nxd4"],["Nf6"],["Nxc6"],["bxc6"],["e5"],["Qe7"],["Qe2"],["Nd5"],["c4"],["Ba6"],["g3"]],"star":true},
  {"id":"blumenfeld-attack","name":"Blumenfeld Attack","group":"blumenfeld-attack","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["Nxd4"],["Bc5"],["Be3"],["Qf6"],["c3"],["Nge7"]],"star":true},
  {"id":"horwitz-attack","name":"Horwitz Attack","group":"horwitz-attack","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["Nxd4"],["Bc5"],["Nxc6"],["Qf6"],["Qd2"],["dxc6"],["Nc3"],["Bxf2+"]],"star":true},
  {"id":"malaniuk-variation","name":"Malaniuk Variation","group":"malaniuk-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["Nxd4"],["Nf6"],["Nxc6"],["bxc6"],["e5"],["Qe7"],["Qe2"],["Nd5"],["c4"],["Nb6"]],"star":true},
  {"id":"potter-variation","name":"Potter Variation","group":"potter-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["Nxd4"],["Bc5"],["Nb3"]],"star":true},
  {"id":"tartakower-variation","name":"Tartakower Variation","group":"tartakower-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["Nxd4"],["Nf6"],["Nxc6"],["bxc6"],["Nc3"]],"star":true},
  {"id":"mieses-main","name":"Mieses, Main","group":"mieses","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["Nxd4"],["Nf6"],["Nxc6"],["bxc6"],["e5"],["Qe7"],["Qe2"],["Nd5"],["c4"],["Ba6"],["b3"]],"star":true},
  {"id":"haxo-gambit","name":"Haxo Gambit","group":"haxo-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["Bc4"],["Bc5"]],"star":true},
  {"id":"benima-defense","name":"Benima Defense","group":"benima-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Be7"],["d4"],["exd4"]],"star":true},
  {"id":"paulsen-attack","name":"Paulsen Attack","group":"paulsen-attack","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["Nxd4"],["Bc5"],["Be3"],["Qf6"],["c3"],["Nge7"],["Bb5"]],"star":true},
  {"id":"modern-defense","name":"Modern Defense","group":"modern-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["Nxd4"],["Qh4"],["Nc3"],["Bb4"]],"star":true},
  {"id":"lolli-variation","name":"Lolli Variation","group":"lolli-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["Nxd4"]],"star":true,"idea":"White trades the d-pawn to open lines early. Active pieces and a lead in space instead of slow manoeuvring."},
  {"id":"relfsson-gambit","name":"Relfsson Gambit","group":"relfsson-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["Bb5"]],"star":true},
  {"id":"alekhine-gambit","name":"Alekhine Gambit","group":"alekhine-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["Nxd4"],["Nf6"],["e5"]],"star":true},
  {"id":"vitzthum-attack","name":"Vitzthum Attack","group":"vitzthum-attack","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["Bc4"],["Bc5"],["Ng5"],["Nh6"],["Qh5"]],"star":true},
  {"id":"napoleon-gambit","name":"Napoleon Gambit","group":"napoleon-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["Nxd4"],["Nxd4"],["exd4"],["Bc4"]],"star":true},
  {"id":"braune-variation","name":"Braune Variation","group":"braune-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["Nxd4"],["Qh4"],["Be3"]],"star":true},
  {"id":"fraser-variation","name":"Fraser Variation","group":"fraser-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["Nxd4"],["Qh4"],["Nf3"]],"star":true},
  {"id":"paulsen-variation","name":"Paulsen Variation","group":"paulsen-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["Nxd4"],["Qh4"],["Nf5"]],"star":true},
  {"id":"meitner-variation","name":"Meitner Variation","group":"meitner-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["Nxd4"],["Bc5"],["Be3"],["Qf6"],["c3"],["Nge7"],["Nc2"]],"star":true},
  {"id":"cochrane-variation","name":"Cochrane Variation","group":"cochrane-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["Bc4"],["Bb4+"],["c3"],["dxc3"],["bxc3"],["Ba5"],["e5"]],"star":true},
  {"id":"romanishin-variation","name":"Romanishin Variation","group":"romanishin-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["Nxd4"],["Bc5"],["Nb3"],["Bb4+"]],"star":true}
 ]
};
