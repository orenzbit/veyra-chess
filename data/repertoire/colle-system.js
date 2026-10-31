// Colle System — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "colle-system",
 "name": "Colle System",
 "color": "w",
 "oneLiner": "1.d4 d5 2.Nf3 Nf6 3.e3 — a quiet build-up before an e4 break.",
 "trunk": "1.d4",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "rhamphorhynchus-variation": {
   "label": "Rhamphorhynchus Variation",
   "blurb": ""
  },
  "colle-koltanowski": {
   "label": "Colle-Koltanowski",
   "blurb": ""
  },
  "anti-colle": {
   "label": "Anti-Colle",
   "blurb": ""
  },
  "traditional": {
   "label": "Traditional",
   "blurb": ""
  },
  "reversed": {
   "label": "Reversed",
   "blurb": ""
  },
  "stonewall-setup": {
   "label": "Stonewall Setup",
   "blurb": ""
  },
  "slav-setup": {
   "label": "Slav Setup",
   "blurb": ""
  },
  "pterodactyl-variation": {
   "label": "Pterodactyl Variation",
   "blurb": ""
  },
  "siroccopteryx-variation": {
   "label": "Siroccopteryx Variation",
   "blurb": ""
  },
  "grunfeld-formation": {
   "label": "Grünfeld Formation",
   "blurb": ""
  },
  "king-s-indian-variation": {
   "label": "King's Indian Variation",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Systems",
 "lines": [
  {"id":"colle-system","name":"Colle System","group":"main","moves":[["d4"],["d5"],["Nf3"],["Nf6"],["e3"]],"star":true,"idea":"White sets up pawns on d4/e3/c3, develops the bishop to d3 and prepares e4. Easy to learn, with a clear plan."},
  {"id":"rhamphorhynchus-variation","name":"Rhamphorhynchus Variation","group":"rhamphorhynchus-variation","moves":[["d4"],["d5"],["Nf3"],["Nf6"],["e3"],["e6"],["Bd3"],["c5"],["b3"],["Nc6"],["O-O"],["Bd6"],["Bb2"],["O-O"],["Nbd2"]],"star":true},
  {"id":"colle-koltanowski","name":"Colle-Koltanowski","group":"colle-koltanowski","moves":[["d4"],["d5"],["Nf3"],["Nf6"],["e3"],["e6"],["Bd3"],["c5"],["c3"],["Nc6"],["Nbd2"],["Bd6"],["O-O"],["O-O"]],"star":true},
  {"id":"anti-colle","name":"Anti-Colle","group":"anti-colle","moves":[["d4"],["d5"],["Nf3"],["Nf6"],["e3"],["c5"],["c3"],["Nc6"],["Nbd2"],["e6"],["Bd3"],["Bd6"]],"star":true},
  {"id":"traditional","name":"Traditional","group":"traditional","moves":[["d4"],["d5"],["Nf3"],["Nf6"],["e3"],["e6"],["Bd3"],["c5"],["c3"],["Nc6"],["Nbd2"],["Bd6"],["O-O"],["O-O"],["dxc5"],["Bxc5"],["e4"]],"star":true},
  {"id":"reversed","name":"Reversed","group":"reversed","moves":[["d4"],["d5"],["e3"],["Nf6"],["Bd3"],["c5"],["c3"],["Nc6"],["Nd2"],["e6"],["Ngf3"]],"star":true},
  {"id":"stonewall-setup","name":"Stonewall Setup","group":"stonewall-setup","moves":[["d4"],["d5"],["e3"],["Nf6"],["Bd3"],["c5"],["c3"],["Nc6"],["f4"]],"star":true},
  {"id":"slav-setup","name":"Slav Setup","group":"slav-setup","moves":[["d4"],["d5"],["Nf3"],["Nf6"],["e3"],["c6"],["Bd3"],["Bg4"]],"star":true},
  {"id":"pterodactyl-variation","name":"Pterodactyl Variation","group":"pterodactyl-variation","moves":[["d4"],["g6"],["Nf3"],["Bg7"],["e3"],["c5"],["Bd3"],["Qa5+"]],"star":true},
  {"id":"siroccopteryx-variation","name":"Siroccopteryx Variation","group":"siroccopteryx-variation","moves":[["d4"],["g6"],["Nf3"],["Bg7"],["e3"],["c5"],["Bd3"],["cxd4"],["Nxd4"],["Qa5+"]],"star":true},
  {"id":"grunfeld-formation","name":"Grünfeld Formation","group":"grunfeld-formation","moves":[["d4"],["d5"],["Nf3"],["Nf6"],["e3"],["g6"],["Bd3"],["Bg7"]],"star":true},
  {"id":"king-s-indian-variation","name":"King's Indian Variation","group":"king-s-indian-variation","moves":[["d4"],["Nf6"],["Nf3"],["g6"],["e3"],["Bg7"],["Bd3"],["d6"]],"star":true}
 ]
};
