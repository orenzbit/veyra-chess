// Four Knights Game — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "four-knights-game",
 "name": "Four Knights Game",
 "color": "w",
 "oneLiner": "1.e4 e5 2.Nf3 Nc6 3.Nc3 Nf6 — symmetrical and very safe for both sides.",
 "trunk": "1.e4 e5 2.Nf3 Nc6",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "spanish-variation": {
   "label": "Spanish Variation",
   "blurb": ""
  },
  "scotch-variation": {
   "label": "Scotch Variation",
   "blurb": ""
  },
  "halloween-gambit": {
   "label": "Halloween Gambit",
   "blurb": ""
  },
  "spanish": {
   "label": "Spanish",
   "blurb": ""
  },
  "scotch": {
   "label": "Scotch",
   "blurb": ""
  },
  "italian-variation": {
   "label": "Italian Variation",
   "blurb": ""
  },
  "glek-variation": {
   "label": "Glek Variation",
   "blurb": ""
  },
  "gunsberg-variation": {
   "label": "Gunsberg Variation",
   "blurb": ""
  },
  "double-ruy-lopez": {
   "label": "Double Ruy Lopez",
   "blurb": ""
  },
  "scotch-variation-accepted": {
   "label": "Scotch Variation Accepted",
   "blurb": ""
  },
  "naroditsky-variation": {
   "label": "Naroditsky Variation",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Classical",
 "lines": [
  {"id":"four-knights-game","name":"Four Knights Game","group":"main","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Nf6"]],"star":true,"idea":"Both sides develop all four knights. White can play the Spanish pin, or the Scotch push d4 for an open game."},
  {"id":"spanish-variation","name":"Spanish Variation","group":"spanish-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Nf6"],["Bb5"]],"star":true},
  {"id":"scotch-variation","name":"Scotch Variation","group":"scotch-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Nf6"],["d4"]],"star":true},
  {"id":"halloween-gambit","name":"Halloween Gambit","group":"halloween-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Nf6"],["Nxe5"]],"star":true},
  {"id":"spanish-line-ending-3-nc3-nf6-4-bb5-nd4","name":"Spanish (line ending 3.Nc3 Nf6 4.Bb5 Nd4)","group":"spanish","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Nf6"],["Bb5"],["Nd4"]],"star":true},
  {"id":"spanish-line-ending-5-o-o-o-o-6-d3-d6","name":"Spanish (line ending 5.O-O O-O 6.d3 d6)","group":"spanish","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Nf6"],["Bb5"],["Bb4"],["O-O"],["O-O"],["d3"],["d6"]]},
  {"id":"spanish-line-ending-7-bg5-bxc3-8-bxc3-qe7","name":"Spanish (line ending 7.Bg5 Bxc3 8.bxc3 Qe7)","group":"spanish","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Nf6"],["Bb5"],["Bb4"],["O-O"],["O-O"],["d3"],["d6"],["Bg5"],["Bxc3"],["bxc3"],["Qe7"]]},
  {"id":"spanish-line-ending-9-re1-nd8-10-d4-ne6","name":"Spanish (line ending 9.Re1 Nd8 10.d4 Ne6)","group":"spanish","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Nf6"],["Bb5"],["Bb4"],["O-O"],["O-O"],["d3"],["d6"],["Bg5"],["Bxc3"],["bxc3"],["Qe7"],["Re1"],["Nd8"],["d4"],["Ne6"]]},
  {"id":"scotch-line-ending-3-nf6-4-d4-exd4-5-nd5","name":"Scotch (line ending 3...Nf6 4.d4 exd4 5.Nd5)","group":"scotch","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Nf6"],["d4"],["exd4"],["Nd5"]],"star":true},
  {"id":"scotch-line-ending-6-nxc6-bxc6-7-bd3-d5","name":"Scotch (line ending 6.Nxc6 bxc6 7.Bd3 d5)","group":"scotch","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Nf6"],["d4"],["exd4"],["Nxd4"],["Bb4"],["Nxc6"],["bxc6"],["Bd3"],["d5"]]},
  {"id":"scotch-line-ending-9-o-o-o-o-10-bg5-c6","name":"Scotch (line ending 9.O-O O-O 10.Bg5 c6)","group":"scotch","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Nf6"],["d4"],["exd4"],["Nxd4"],["Bb4"],["Nxc6"],["bxc6"],["Bd3"],["d5"],["exd5"],["cxd5"],["O-O"],["O-O"],["Bg5"],["c6"]]},
  {"id":"italian-variation","name":"Italian Variation","group":"italian-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Nf6"],["Bc4"],["Nxe4"]],"star":true},
  {"id":"glek-variation","name":"Glek Variation","group":"glek-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Nf6"],["g3"]],"star":true},
  {"id":"gunsberg-variation","name":"Gunsberg Variation","group":"gunsberg-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Nf6"],["a3"]],"star":true},
  {"id":"double-ruy-lopez","name":"Double Ruy Lopez","group":"double-ruy-lopez","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Nf6"],["Bb5"],["Bb4"],["O-O"],["O-O"],["d3"],["d6"],["Bg5"]],"star":true},
  {"id":"scotch-variation-accepted","name":"Scotch Variation Accepted","group":"scotch-variation-accepted","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Nf6"],["d4"],["exd4"]],"star":true},
  {"id":"scotch-variation-accepted-main-line","name":"Scotch Variation Accepted, Main Line","group":"scotch-variation-accepted","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Nf6"],["d4"],["exd4"],["Nxd4"],["Bb4"],["Nxc6"],["bxc6"],["Bd3"],["d5"],["exd5"],["O-O"],["O-O"]]},
  {"id":"scotch-variation-krause-gambit","name":"Scotch Variation, Krause Gambit","group":"scotch-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Nf6"],["d4"],["Bb4"],["Nxe5"]]},
  {"id":"scotch-variation-oxford-gambit","name":"Scotch Variation, Oxford Gambit","group":"scotch-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Nf6"],["d4"],["Bb4"],["d5"],["Nd4"]]},
  {"id":"scotch-variation-schmid-defense","name":"Scotch Variation, Schmid Defense","group":"scotch-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Nf6"],["d4"],["exd4"],["Nxd4"],["Nxe4"]]},
  {"id":"spanish-variation-double-spanish","name":"Spanish Variation, Double Spanish","group":"spanish-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Nf6"],["Bb5"],["Bb4"]]},
  {"id":"spanish-variation-classical-variation","name":"Spanish Variation, Classical Variation","group":"spanish-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Nf6"],["Bb5"],["Bc5"]]},
  {"id":"spanish-variation-ranken-variation","name":"Spanish Variation, Ranken Variation","group":"spanish-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Nf6"],["Bb5"],["a6"],["Bxc6"]]},
  {"id":"spanish-variation-janowski-variation","name":"Spanish Variation, Janowski Variation","group":"spanish-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Nf6"],["Bb5"],["Bb4"],["O-O"],["O-O"],["d3"],["Bxc3"],["bxc3"],["d6"],["Re1"]]},
  {"id":"italian-variation-noa-gambit","name":"Italian Variation, Noa Gambit","group":"italian-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Nf6"],["Nc3"],["Nxe4"],["Bxf7+"]]},
  {"id":"naroditsky-variation","name":"Naroditsky Variation","group":"naroditsky-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Nf6"],["Nd5"]],"star":true},
  {"id":"halloween-gambit-oldtimer-variation","name":"Halloween Gambit, Oldtimer Variation","group":"halloween-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Nc3"],["Nf6"],["Nxe5"],["Nxe5"],["d4"],["Ng6"],["e5"],["Ng8"],["Bc4"],["Bb4"],["Qf3"],["f5"]]}
 ]
};
