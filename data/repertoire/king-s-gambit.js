// King's Gambit — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "king-s-gambit",
 "name": "King's Gambit",
 "color": "w",
 "oneLiner": "1.e4 e5 2.f4 — offer a pawn at once to rip open the f-file and attack.",
 "trunk": "1.e4 e5 2.f4",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "accepted": {
   "label": "Accepted",
   "blurb": ""
  },
  "declined": {
   "label": "Declined",
   "blurb": ""
  },
  "falkbeer-counter-gambit": {
   "label": "Falkbeer Counter-Gambit",
   "blurb": ""
  },
  "muzio-gambit": {
   "label": "Muzio Gambit",
   "blurb": ""
  },
  "rice-gambit": {
   "label": "Rice Gambit",
   "blurb": ""
  },
  "kieseritzky-gambit": {
   "label": "Kieseritzky Gambit",
   "blurb": ""
  },
  "allgaier-gambit": {
   "label": "Allgaier Gambit",
   "blurb": ""
  },
  "bishop-s-gambit": {
   "label": "Bishop's Gambit",
   "blurb": ""
  },
  "cunningham-defense": {
   "label": "Cunningham Defense",
   "blurb": ""
  },
  "fischer-defense": {
   "label": "Fischer Defense",
   "blurb": ""
  },
  "schallopp-defense": {
   "label": "Schallopp Defense",
   "blurb": ""
  },
  "modern-defense": {
   "label": "Modern Defense",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Gambits",
 "lines": [
  {"id":"king-s-gambit","name":"King's Gambit","group":"main","moves":[["e4"],["e5"],["f4"]],"star":true,"idea":"White gives up a pawn for speed and an open f-file. If Black takes, build a big centre and hunt the king; if Black declines, develop fast and keep the attack."},
  {"id":"accepted","name":"Accepted","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"]],"star":true},
  {"id":"declined","name":"Declined","group":"declined","moves":[["e4"],["e5"],["f4"],["Bc5"]],"star":true},
  {"id":"falkbeer-counter-gambit","name":"Falkbeer Counter-Gambit","group":"falkbeer-counter-gambit","moves":[["e4"],["e5"],["f4"],["d5"]],"star":true},
  {"id":"muzio-gambit","name":"Muzio Gambit","group":"muzio-gambit","moves":[["e4"],["e5"],["f4"],["exf4"],["Nf3"],["g5"],["Bc4"],["g4"],["O-O"]],"star":true},
  {"id":"rice-gambit","name":"Rice Gambit","group":"rice-gambit","moves":[["e4"],["e5"],["f4"],["exf4"],["Nf3"],["g5"],["Bc4"],["g4"],["O-O"],["gxf3"],["Qxf3"]],"star":true},
  {"id":"kieseritzky-gambit","name":"Kieseritzky Gambit","group":"kieseritzky-gambit","moves":[["e4"],["e5"],["f4"],["exf4"],["Nf3"],["g5"],["h4"],["g4"],["Ne5"]],"star":true},
  {"id":"allgaier-gambit","name":"Allgaier Gambit","group":"allgaier-gambit","moves":[["e4"],["e5"],["f4"],["exf4"],["Nf3"],["g5"],["h4"],["g4"],["Ng5"]],"star":true},
  {"id":"bishop-s-gambit","name":"Bishop's Gambit","group":"bishop-s-gambit","moves":[["e4"],["e5"],["f4"],["exf4"],["Bc4"]],"star":true},
  {"id":"cunningham-defense","name":"Cunningham Defense","group":"cunningham-defense","moves":[["e4"],["e5"],["f4"],["exf4"],["Nf3"],["Be7"]],"star":true},
  {"id":"fischer-defense","name":"Fischer Defense","group":"fischer-defense","moves":[["e4"],["e5"],["f4"],["exf4"],["Nf3"],["d6"]],"star":true},
  {"id":"schallopp-defense","name":"Schallopp Defense","group":"schallopp-defense","moves":[["e4"],["e5"],["f4"],["exf4"],["Nf3"],["Nf6"]],"star":true},
  {"id":"modern-defense","name":"Modern Defense","group":"modern-defense","moves":[["e4"],["e5"],["f4"],["exf4"],["Nf3"],["d5"]],"star":true},
  {"id":"knight-gambit","name":"Knight Gambit","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Nf3"]]},
  {"id":"classical-variation","name":"Classical Variation","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Nf3"],["g5"],["h4"],["g4"],["Ne5"],["Nf6"]]},
  {"id":"kieseritzky-line-ending-6-bc4-d5-7-exd5-bd6","name":"Kieseritzky (line ending 6.Bc4 d5 7.exd5 Bd6)","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Nf3"],["g5"],["h4"],["g4"],["Ne5"],["Nf6"],["Bc4"],["d5"],["exd5"],["Bd6"]]},
  {"id":"kieseritzky-line-ending-6-nxg4-bxg4-7-qxg4-nf6","name":"Kieseritzky (line ending 6.Nxg4 Bxg4 7.Qxg4 Nf6)","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Nf3"],["g5"],["h4"],["g4"],["Ne5"],["d6"],["Nxg4"],["Bxg4"],["Qxg4"],["Nf6"]]},
  {"id":"muzio-line-ending-9-qxd4-10-be3-qf6-11-qd5","name":"Muzio (line ending 9...Qxd4+ 10.Be3 Qf6 11.Qd5+)","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Nf3"],["g5"],["Bc4"],["g4"],["O-O"],["gxf3"],["Qxf3"],["Qf6"],["e5"],["Qxe5"],["Bxf7+"],["Kxf7"],["d4"],["Qxd4+"],["Be3"],["Qf6"],["Qd5+"]]},
  {"id":"muzio-gambit-line-ending-3-nf3-g5-4-bc4-bg7","name":"Muzio Gambit (line ending 3.Nf3 g5 4.Bc4 Bg7)","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Nf3"],["g5"],["Bc4"],["Bg7"]]},
  {"id":"hanstein-gambit","name":"Hanstein Gambit","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Nf3"],["g5"],["Bc4"],["g4"],["Ne5"]]},
  {"id":"quaade-gambit","name":"Quaade Gambit","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Nf3"],["g5"],["Nc3"]]},
  {"id":"becker-defense","name":"Becker Defense","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Nf3"],["h6"]]},
  {"id":"bonsch-osmolovsky","name":"Bonsch-Osmolovsky","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Nf3"],["Ne7"]]},
  {"id":"bishop-s-gambit-line-ending-3-bc4-d5-4-bxd5-qh4","name":"Bishop's Gambit (line ending 3.Bc4 d5 4.Bxd5 Qh4+)","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Bc4"],["d5"],["Bxd5"],["Qh4+"]]},
  {"id":"bishop-s-gambit-line-ending-3-bc4-qh4-4-kf1-g5","name":"Bishop's Gambit (line ending 3.Bc4 Qh4+ 4.Kf1 g5)","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Bc4"],["Qh4+"],["Kf1"],["g5"]]},
  {"id":"bishop-s-gambit-line-ending-2-exf4-3-bc4-nf6-4-nc3","name":"Bishop's Gambit (line ending 2...exf4 3.Bc4 Nf6 4.Nc3)","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Bc4"],["Nf6"],["Nc3"]]},
  {"id":"bishop-s-gambit-line-ending-4-e5-d5-5-bb5-c6","name":"Bishop's Gambit (line ending 4.e5 d5 5.Bb5+ c6)","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Bc4"],["Nf6"],["e5"],["d5"],["Bb5+"],["c6"]]},
  {"id":"villemson-gambit","name":"Villemson Gambit","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Nc3"]]},
  {"id":"mason-gambit","name":"Mason Gambit","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Nf3"],["g5"],["d4"],["g4"],["Bc4"]]},
  {"id":"fischer-defense-4-d4","name":"Fischer Defense, 4.d4","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Nf3"],["d6"],["d4"],["g5"],["h4"],["g4"],["Ng1"]]},
  {"id":"schallopp-4-e5","name":"Schallopp, 4.e5","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Nf3"],["Nf6"],["e5"],["Nh5"],["Be2"]]},
  {"id":"modern-defense-4-exd5","name":"Modern Defense, 4.exd5","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Nf3"],["d5"],["exd5"],["Nf6"]]},
  {"id":"cunningham-line-ending-4-bh4-5-nxh4-qxh4-6-kf1","name":"Cunningham (line ending 4...Bh4+ 5.Nxh4 Qxh4+ 6.Kf1)","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Nf3"],["Be7"],["Bc4"],["Bh4+"],["Nxh4"],["Qxh4+"],["Kf1"]]},
  {"id":"classical-defense","name":"Classical Defense","group":"declined","moves":[["e4"],["e5"],["f4"],["Bc5"],["Nf3"],["d6"]]},
  {"id":"classical-line-ending-3-d6-4-c3-nf6-5-d4","name":"Classical (line ending 3...d6 4.c3 Nf6 5.d4)","group":"declined","moves":[["e4"],["e5"],["f4"],["Bc5"],["Nf3"],["d6"],["c3"],["Nf6"],["d4"]]},
  {"id":"falkbeer-line-ending-3-exd5-e4-4-d3-nf6","name":"Falkbeer (line ending 3.exd5 e4 4.d3 Nf6)","group":"declined","moves":[["e4"],["e5"],["f4"],["d5"],["exd5"],["e4"],["d3"],["Nf6"]]},
  {"id":"falkbeer-line-ending-4-nc3-nf6-5-qe2-bd6","name":"Falkbeer (line ending 4.Nc3 Nf6 5.Qe2 Bd6)","group":"declined","moves":[["e4"],["e5"],["f4"],["d5"],["exd5"],["e4"],["Nc3"],["Nf6"],["Qe2"],["Bd6"]]},
  {"id":"falkbeer-line-ending-2-f4-d5-3-exd5-c6","name":"Falkbeer (line ending 2.f4 d5 3.exd5 c6)","group":"declined","moves":[["e4"],["e5"],["f4"],["d5"],["exd5"],["c6"]]},
  {"id":"queen-s-knight-defense","name":"Queen's Knight Defense","group":"declined","moves":[["e4"],["e5"],["f4"],["Nc6"]]},
  {"id":"norwalde-variation","name":"Norwalde Variation","group":"declined","moves":[["e4"],["e5"],["f4"],["d6"],["Nf3"],["Qe7"]]},
  {"id":"keene-s-defense","name":"Keene's Defense","group":"declined","moves":[["e4"],["e5"],["f4"],["Qh4+"],["g3"],["Qe7"]]},
  {"id":"mafia-defense","name":"Mafia Defense","group":"declined","moves":[["e4"],["e5"],["f4"],["Nf6"]]},
  {"id":"slow-defense","name":"Slow Defense","group":"declined","moves":[["e4"],["e5"],["f4"],["Bc5"],["Nf3"],["d6"],["c3"],["f5"]]},
  {"id":"soller-gambit","name":"Soller Gambit","group":"declined","moves":[["e4"],["e5"],["f4"],["Bc5"],["Nf3"],["Nc6"],["fxe5"],["d6"]]},
  {"id":"panteldakis-countergambit","name":"Panteldakis Countergambit","group":"declined","moves":[["e4"],["e5"],["f4"],["f5"]]},
  {"id":"tartakower","name":"Tartakower","group":"declined","moves":[["e4"],["e5"],["f4"],["Bc5"],["Nf3"],["Nf6"]]},
  {"id":"accepted-tumbleweed","name":"Accepted, Tumbleweed","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Kf2"]]},
  {"id":"accepted-gaga-gambit","name":"Accepted, Gaga Gambit","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["g3"]]},
  {"id":"accepted-paris-gambit","name":"Accepted, Paris Gambit","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Ne2"]]},
  {"id":"accepted-mayet-gambit","name":"Accepted, Mayet Gambit","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Nf3"],["g5"],["Bc4"],["Bg7"],["d4"],["d6"],["c3"]]},
  {"id":"accepted-greco-gambit","name":"Accepted, Greco Gambit","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Nf3"],["d6"],["Bc4"],["h6"],["d4"],["g5"],["h4"],["Bg7"]]},
  {"id":"accepted-kotov-gambit","name":"Accepted, Kotov Gambit","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Nf3"],["g5"],["Bc4"],["g4"],["d4"],["gxf3"],["Bxf4"]]},
  {"id":"accepted-lolli-gambit","name":"Accepted, Lolli Gambit","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Nf3"],["g5"],["Bc4"],["g4"],["Bxf7+"]]},
  {"id":"accepted-breyer-gambit","name":"Accepted, Breyer Gambit","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Qf3"]]},
  {"id":"accepted-orsini-gambit","name":"Accepted, Orsini Gambit","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["b3"]]},
  {"id":"accepted-stamma-gambit","name":"Accepted, Stamma Gambit","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["h4"]]},
  {"id":"accepted-basman-gambit","name":"Accepted, Basman Gambit","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Qe2"]]},
  {"id":"accepted-blachly-gambit","name":"Accepted, Blachly Gambit","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Nf3"],["Nc6"],["Bc4"],["g5"]]},
  {"id":"accepted-carrera-gambit","name":"Accepted, Carrera Gambit","group":"accepted","moves":[["e4"],["e5"],["f4"],["exf4"],["Qh5"]]},
  {"id":"declined-miles-defense","name":"Declined, Miles Defense","group":"declined","moves":[["e4"],["e5"],["f4"],["Nc6"],["Nf3"],["f5"]]}
 ]
};
