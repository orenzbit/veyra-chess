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
  {"id":"barry-style","name":"Barry-style","group":"barry-style","moves":[["d4"],["Nf6"],["Nf3"],["g6"],["Nc3"],["d5"],["Bf4"]],"star":true}
 ]
};
