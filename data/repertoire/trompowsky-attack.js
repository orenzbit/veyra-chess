// Trompowsky Attack — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "trompowsky-attack",
 "name": "Trompowsky Attack",
 "color": "w",
 "oneLiner": "1.d4 Nf6 2.Bg5 — avoid main-line theory by attacking the knight at once.",
 "trunk": "1.d4 Nf6 2.Bg5",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "classical-defense": {
   "label": "Classical Defense",
   "blurb": ""
  },
  "borg-variation": {
   "label": "Borg Variation",
   "blurb": ""
  },
  "vaganian-gambit": {
   "label": "Vaganian Gambit",
   "blurb": ""
  },
  "poisoned-pawn": {
   "label": "Poisoned Pawn",
   "blurb": ""
  },
  "edge-variation": {
   "label": "Edge Variation",
   "blurb": ""
  },
  "raptor-variation": {
   "label": "Raptor Variation",
   "blurb": ""
  },
  "jobava": {
   "label": "Jobava",
   "blurb": ""
  },
  "pseudo-trompowsky": {
   "label": "Pseudo-Trompowsky",
   "blurb": ""
  },
  "trompowsky-gambit": {
   "label": "Trompowsky Gambit",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Systems",
 "lines": [
  {"id":"trompowsky-attack","name":"Trompowsky Attack","group":"main","moves":[["d4"],["Nf6"],["Bg5"]],"star":true,"idea":"White pins or trades the knight to damage Black's structure and reaches unusual positions early."},
  {"id":"classical-defense","name":"Classical Defense","group":"classical-defense","moves":[["d4"],["Nf6"],["Bg5"],["Ne4"],["Bf4"],["d5"],["e3"],["c5"],["Bd3"],["Nc6"],["c3"],["Qb6"]]},
  {"id":"borg-variation","name":"Borg Variation","group":"borg-variation","moves":[["d4"],["Nf6"],["Bg5"],["Ne4"],["Bf4"],["Nf6"]],"star":true},
  {"id":"vaganian-gambit","name":"Vaganian Gambit","group":"vaganian-gambit","moves":[["d4"],["Nf6"],["Bg5"],["Ne4"],["h4"]],"star":true},
  {"id":"poisoned-pawn","name":"Poisoned Pawn","group":"poisoned-pawn","moves":[["d4"],["Nf6"],["Bg5"],["Ne4"],["Bf4"],["c5"],["f3"],["Qa5+"],["c3"],["Nf6"],["d5"],["Qb6"],["Qc1"],["Qxb2"]],"star":true},
  {"id":"edge-variation","name":"Edge Variation","group":"edge-variation","moves":[["d4"],["Nf6"],["Bg5"],["Ne4"],["Bh4"],["c5"],["f3"],["Qa5+"],["c3"],["Nxc3"],["bxc3"]],"star":true},
  {"id":"raptor-variation","name":"Raptor Variation","group":"raptor-variation","moves":[["d4"],["Nf6"],["Bg5"],["Ne4"],["Bf4"],["c5"],["f3"],["Qa5+"],["c3"],["Nf6"],["d5"],["Qb6"],["Qc1"],["Nh5"],["e4"],["Nxf4"]]},
  {"id":"jobava","name":"Jobava","group":"jobava","moves":[["d4"],["Nf6"],["Bg5"],["e6"],["e4"],["h6"],["Bxf6"],["Qxf6"],["Nc3"],["d6"]],"star":true},
  {"id":"pseudo-trompowsky","name":"Pseudo-Trompowsky","group":"pseudo-trompowsky","moves":[["d4"],["Nf6"],["Bg5"],["d5"],["Bxf6"],["exf6"],["e3"],["Bd6"]],"star":true},
  {"id":"trompowsky-gambit","name":"Trompowsky Gambit","group":"trompowsky-gambit","moves":[["d4"],["Nf6"],["Bg5"],["Ne4"],["Bf4"],["c5"],["d5"],["Qb6"],["Nd2"],["Qxb2"]],"star":true},
  {"id":"edge-variation-hergert-gambit","name":"Edge Variation, Hergert Gambit","group":"edge-variation","moves":[["d4"],["Nf6"],["Bg5"],["Ne4"],["Bh4"],["d5"],["f3"],["Nf6"],["Nc3"],["Bf5"],["e4"]]},
  {"id":"raptor-variation-hergert-gambit","name":"Raptor Variation, Hergert Gambit","group":"raptor-variation","moves":[["d4"],["Nf6"],["Bg5"],["Ne4"],["h4"],["Nxg5"],["hxg5"],["e5"]],"star":true},
  {"id":"classical-defense-big-center-variation","name":"Classical Defense, Big Center Variation","group":"classical-defense","moves":[["d4"],["Nf6"],["Bg5"],["e6"],["e4"]],"star":true}
 ]
};
