// London System — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "london-system",
 "name": "London System",
 "color": "w",
 "oneLiner": "1.d4 d5 2.Bf4 — an easy-to-learn setup that works against almost anything.",
 "trunk": "1.d4",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "classical-setup": {
   "label": "Classical Setup",
   "blurb": ""
  },
  "jobava-attack": {
   "label": "Jobava Attack",
   "blurb": ""
  },
  "jobava": {
   "label": "Jobava",
   "blurb": ""
  },
  "anti-london": {
   "label": "Anti-London",
   "blurb": ""
  },
  "poisoned-pawn": {
   "label": "Poisoned Pawn",
   "blurb": ""
  },
  "hodgson-attack": {
   "label": "Hodgson Attack",
   "blurb": ""
  },
  "accelerated-london": {
   "label": "Accelerated London",
   "blurb": ""
  },
  "king-s-indian-setup": {
   "label": "King's Indian Setup",
   "blurb": ""
  },
  "benoni-setup": {
   "label": "Benoni Setup",
   "blurb": ""
  },
  "dutch-setup": {
   "label": "Dutch Setup",
   "blurb": ""
  },
  "queen-s-indian-setup": {
   "label": "Queen's Indian Setup",
   "blurb": ""
  },
  "nimzo-indian-setup": {
   "label": "Nimzo-Indian Setup",
   "blurb": ""
  },
  "slav-setup": {
   "label": "Slav Setup",
   "blurb": ""
  },
  "pseudo-trompowsky": {
   "label": "Pseudo-Trompowsky",
   "blurb": ""
  },
  "barry-style": {
   "label": "Barry-style",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Systems",
 "lines": [
  {"id":"london-system","name":"London System","group":"main","moves":[["d4"],["d5"],["Bf4"]],"star":true,"idea":"White develops the bishop outside the pawn chain, plays e3, c3 and Nf3. Few theory lines to memorize, with solid structure."},
  {"id":"classical-setup","name":"Classical Setup","group":"classical-setup","moves":[["d4"],["Nf6"],["Nf3"],["d5"],["Bf4"]],"star":true},
  {"id":"jobava-attack","name":"Jobava Attack","group":"jobava-attack","moves":[["d4"],["d5"],["Nc3"],["Nf6"],["Bf4"]],"star":true},
  {"id":"jobava-e6","name":"Jobava, e6","group":"jobava","moves":[["d4"],["d5"],["Nc3"],["Nf6"],["Bf4"],["e6"],["e3"],["c5"]]},
  {"id":"jobava-c5","name":"Jobava, c5","group":"jobava","moves":[["d4"],["d5"],["Nc3"],["Nf6"],["Bf4"],["c5"]],"star":true},
  {"id":"jobava-bf5","name":"Jobava, Bf5","group":"jobava","moves":[["d4"],["d5"],["Nc3"],["Nf6"],["Bf4"],["Bf5"]]},
  {"id":"jobava-nc6","name":"Jobava, Nc6","group":"jobava","moves":[["d4"],["d5"],["Nc3"],["Nf6"],["Bf4"],["Nc6"]]},
  {"id":"jobava-a6","name":"Jobava, a6","group":"jobava","moves":[["d4"],["d5"],["Nc3"],["Nf6"],["Bf4"],["c6"]]},
  {"id":"anti-london","name":"Anti-London","group":"anti-london","moves":[["d4"],["d5"],["Nf3"],["Nf6"],["Bf4"],["c5"],["e3"],["Nc6"],["Nbd2"],["cxd4"],["exd4"]],"star":true},
  {"id":"poisoned-pawn","name":"Poisoned Pawn","group":"poisoned-pawn","moves":[["d4"],["d5"],["Nf3"],["Nf6"],["Bf4"],["c5"],["e3"],["Qb6"],["Nc3"]],"star":true},
  {"id":"hodgson-attack","name":"Hodgson Attack","group":"hodgson-attack","moves":[["d4"],["d5"],["Bg5"]],"star":true},
  {"id":"accelerated-london","name":"Accelerated London","group":"accelerated-london","moves":[["d4"],["d5"],["Bf4"],["c5"],["e3"],["Nc6"],["Nf3"],["cxd4"],["exd4"],["Bf5"]],"star":true},
  {"id":"king-s-indian-setup","name":"King's Indian Setup","group":"king-s-indian-setup","moves":[["d4"],["Nf6"],["Nf3"],["g6"],["Bf4"]],"star":true},
  {"id":"benoni-setup","name":"Benoni Setup","group":"benoni-setup","moves":[["d4"],["Nf6"],["Nf3"],["c5"],["Bf4"]],"star":true},
  {"id":"dutch-setup","name":"Dutch Setup","group":"dutch-setup","moves":[["d4"],["f5"],["Bf4"]],"star":true},
  {"id":"queen-s-indian-setup","name":"Queen's Indian Setup","group":"queen-s-indian-setup","moves":[["d4"],["Nf6"],["Nf3"],["e6"],["Bf4"]],"star":true},
  {"id":"nimzo-indian-setup","name":"Nimzo-Indian Setup","group":"nimzo-indian-setup","moves":[["d4"],["Nf6"],["Bf4"],["e6"],["e3"],["Bb4+"]],"star":true},
  {"id":"slav-setup","name":"Slav Setup","group":"slav-setup","moves":[["d4"],["d5"],["Nf3"],["c6"],["Bf4"],["Nf6"],["e3"],["Bf5"]],"star":true},
  {"id":"pseudo-trompowsky","name":"Pseudo-Trompowsky","group":"pseudo-trompowsky","moves":[["d4"],["Nf6"],["Bf4"],["c5"]],"star":true},
  {"id":"barry-style","name":"Barry-style","group":"barry-style","moves":[["d4"],["Nf6"],["Nf3"],["g6"],["Nc3"],["d5"],["Bf4"]],"star":true},
  {"id":"dutch-setup-d6","name":"Dutch Setup, d6","group":"dutch-setup","moves":[["d4"],["f5"],["Bf4"],["Nf6"],["e3"],["d6"],["Nf3"],["e6"],["Be2"],["Be7"],["O-O"],["O-O"],["c4"],["Qe8"]]},
  {"id":"queen-s-indian-setup-bb7","name":"Queen's Indian Setup, Bb7","group":"queen-s-indian-setup","moves":[["d4"],["Nf6"],["Nf3"],["e6"],["Bf4"],["b6"],["e3"],["Bb7"],["Bd3"],["Be7"],["O-O"],["O-O"],["c3"],["d5"]]},
  {"id":"king-s-indian-setup-bd3","name":"King's Indian Setup, Bd3","group":"king-s-indian-setup","moves":[["d4"],["Nf6"],["Nf3"],["g6"],["Bf4"],["Bg7"],["e3"],["O-O"],["Bd3"],["d6"],["O-O"],["Nbd7"],["Re1"],["e5"]]},
  {"id":"king-s-indian-setup-nbd2","name":"King's Indian Setup, Nbd2","group":"king-s-indian-setup","moves":[["d4"],["Nf6"],["Nf3"],["g6"],["Bf4"],["Bg7"],["e3"],["O-O"],["Bd3"],["d6"],["Nbd2"],["Nbd7"],["O-O"],["e5"]]},
  {"id":"dutch-setup-bd3","name":"Dutch Setup, Bd3","group":"dutch-setup","moves":[["d4"],["f5"],["Bf4"],["Nf6"],["e3"],["e6"],["Nf3"],["Be7"],["Bd3"],["O-O"],["O-O"],["b6"],["Nbd2"],["Bb7"]]},
  {"id":"dutch-setup-d6-and-c4","name":"Dutch Setup, d6 and c4","group":"dutch-setup","moves":[["d4"],["f5"],["Bf4"],["Nf6"],["e3"],["e6"],["Nf3"],["Be7"],["Bd3"],["O-O"],["O-O"],["d6"],["c4"],["Qe8"]]},
  {"id":"king-s-indian-setup-d6-and-e5","name":"King's Indian Setup, d6 and e5","group":"king-s-indian-setup","moves":[["d4"],["Nf6"],["Nf3"],["g6"],["Bf4"],["d6"],["e3"],["Bg7"],["Bd3"],["O-O"],["O-O"],["Nbd7"],["c4"],["e5"]]},
  {"id":"nimzo-indian-setup-nd2","name":"Nimzo-Indian Setup, Nd2","group":"nimzo-indian-setup","moves":[["d4"],["Nf6"],["Bf4"],["e6"],["e3"],["Bb4+"],["c3"],["Be7"],["Bd3"],["O-O"],["Nd2"],["d5"]]},
  {"id":"barry-style-re1-setup","name":"Barry-style, Re1 setup","group":"barry-style","moves":[["d4"],["Nf6"],["Nf3"],["g6"],["Nc3"],["d5"],["Bf4"],["Bg7"],["e3"],["O-O"],["Be2"],["c6"],["O-O"],["Nbd7"],["Re1"],["Qa5"]]},
  {"id":"barry-style-nc6-and-dxc5","name":"Barry-style, Nc6 and dxc5","group":"barry-style","moves":[["d4"],["Nf6"],["Nf3"],["g6"],["Nc3"],["d5"],["Bf4"],["Bg7"],["e3"],["O-O"],["Be2"],["c5"],["O-O"],["Nc6"],["dxc5"],["Qa5"]]},
  {"id":"barry-style-ne5-and-be2","name":"Barry-style, Ne5 and Be2","group":"barry-style","moves":[["d4"],["Nf6"],["Nf3"],["g6"],["Nc3"],["d5"],["Bf4"],["Bg7"],["e3"],["O-O"],["Ne5"],["c5"],["Be2"],["Nc6"]]},
  {"id":"barry-style-c6-and-qb6","name":"Barry-style, c6 and Qb6","group":"barry-style","moves":[["d4"],["Nf6"],["Nf3"],["g6"],["Nc3"],["d5"],["Bf4"],["Bg7"],["e3"],["O-O"],["Be2"],["c6"],["O-O"],["Qb6"]]}
 ]
};
