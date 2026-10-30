// Italian Game — daxaur/tabia (MIT), extended by Veyra Chess
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "italian",
 "name": "Italian Game",
 "color": "w",
 "eco": "C50",
 "oneLiner": "1.e4 e5 2.Nf3 Nc6 3.Bc4 — the oldest opening: target f7, then choose calm or carnage.",
 "trunk": "1.e4 e5 2.Nf3 Nc6 3.Bc4",
 "groups": {
  "accepted": {
   "label": "Accepted",
   "blurb": "Black takes the pawn"
  },
  "ryder": {
   "label": "Ryder",
   "blurb": "The double-pawn gambit"
  },
  "declined": {
   "label": "Declined",
   "blurb": "Black gives the pawn back"
  },
  "quiet": {
   "label": "Giuoco Piano",
   "blurb": "The slow, modern build"
  },
  "sharp": {
   "label": "Sharp",
   "blurb": "Two Knights & Evans"
  },
  "v-main": {
   "label": "Main",
   "blurb": ""
  },
  "v-giuoco-piano": {
   "label": "Giuoco Piano",
   "blurb": ""
  },
  "v-evans-gambit": {
   "label": "Evans Gambit",
   "blurb": ""
  },
  "v-giuoco-pianissimo": {
   "label": "Giuoco Pianissimo",
   "blurb": ""
  },
  "v-jerome-gambit": {
   "label": "Jerome Gambit",
   "blurb": ""
  },
  "v-hungarian-defense": {
   "label": "Hungarian Defense",
   "blurb": ""
  },
  "v-two-knights-defense": {
   "label": "Two Knights Defense",
   "blurb": ""
  },
  "v-two-knights": {
   "label": "Two Knights",
   "blurb": ""
  },
  "v-evans-gambit-declined": {
   "label": "Evans Gambit Declined",
   "blurb": ""
  },
  "v-blackburne-shilling-gambit": {
   "label": "Blackburne Shilling Gambit",
   "blurb": ""
  },
  "v-paris-defense": {
   "label": "Paris Defense",
   "blurb": ""
  },
  "v-rousseau-gambit": {
   "label": "Rousseau Gambit",
   "blurb": ""
  },
  "v-schilling-kostic-gambit": {
   "label": "Schilling-Kostic Gambit",
   "blurb": ""
  },
  "v-lucchini-gambit": {
   "label": "Lucchini Gambit",
   "blurb": ""
  },
  "v-1-e4-e5-2-nf3-nc6-3-bc4-nf6": {
   "label": "1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6",
   "blurb": ""
  },
  "v-legal-trap": {
   "label": "Legal Trap",
   "blurb": ""
  },
  "v-bird-s-attack": {
   "label": "Bird's Attack",
   "blurb": ""
  },
  "v-deutz-gambit": {
   "label": "Deutz Gambit",
   "blurb": ""
  },
  "v-scotch-gambit": {
   "label": "Scotch Gambit",
   "blurb": ""
  },
  "v-scotch-invitation-declined": {
   "label": "Scotch Invitation Declined",
   "blurb": ""
  },
  "v-anti-fried-liver-defense": {
   "label": "Anti-Fried Liver Defense",
   "blurb": ""
  },
  "v-classical-variation": {
   "label": "Classical Variation",
   "blurb": ""
  }
 },
 "source": "daxaur/tabia (MIT)",
 "category": "Classical",
 "lines": [
  {"id":"giuoco-pianissimo","name":"Giuoco Pianissimo (c3/d3)","group":"quiet","star":true,"idea":"The modern Italian: a small centre with c3 and d3, castle, regroup Nbd2–f1–g3, and build a slow kingside attack.","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["c3","4.c3 — prepare d4 and a slow build."],["Nf6"],["d3"],["d6"],["O-O"],["O-O"],["Re1"],["a6"],["Nbd2","8.Nbd2 — heading Nf1–g3."]]},
  {"id":"two-knights","name":"Two Knights (3…Nf6 4.Ng5)","group":"sharp","idea":"The aggressive 4.Ng5 hits f7. After …d5 you snatch a pawn and hold the extra pawn against Black’s initiative (≈ equal — Black has real compensation).","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Nf6","3…Nf6 — the Two Knights."],["Ng5","4.Ng5!? — straight at f7."],["d5"],["exd5"],["Na5"],["Bb5+"],["c6"],["dxc6"],["bxc6"],["Be2"],["h6"],["Nf3"],["e4"],["Ne5","10.Ne5 — hold the extra pawn."]]},
  {"id":"evans","name":"Evans Gambit (4.b4)","group":"sharp","idea":"A romantic pawn sac: deflect the bishop, grab the centre with c3 and d4, and come crashing at f7.","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["b4","4.b4!? — the Evans Gambit."],["Bxb4"],["c3"],["Ba5"],["d4","6.d4 — rip open the centre for the sac."],["exd4"],["O-O"]]},
  {"id":"italian-game","name":"Italian Game","group":"v-main","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"]],"idea":"The bishop eyes f7 and White builds with c3 and d3 or d4. Great for beginners because the ideas are simple and the development is natural."},
  {"id":"giuoco-piano","name":"Giuoco Piano","group":"v-giuoco-piano","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"]]},
  {"id":"evans-gambit","name":"Evans Gambit","group":"v-evans-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["b4"]]},
  {"id":"giuoco-pianissimo-2","name":"Giuoco Pianissimo","group":"v-giuoco-pianissimo","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["d3"]]},
  {"id":"giuoco-piano-center-attack","name":"Giuoco Piano, Center Attack","group":"v-giuoco-piano","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["c3"],["Nf6"],["d4"]]},
  {"id":"jerome-gambit","name":"Jerome Gambit","group":"v-jerome-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["Bxf7+"]]},
  {"id":"hungarian-defense","name":"Hungarian Defense","group":"v-hungarian-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Be7"]]},
  {"id":"two-knights-defense","name":"Two Knights Defense","group":"v-two-knights-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Nf6"]]},
  {"id":"two-knights-fried-liver-attack","name":"Two Knights, Fried Liver Attack","group":"v-two-knights","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Nf6"],["Ng5"],["d5"],["exd5"],["Nxd5"],["Nxf7"]]},
  {"id":"two-knights-traxler-counterattack","name":"Two Knights, Traxler Counterattack","group":"v-two-knights","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Nf6"],["Ng5"],["Bc5"]]},
  {"id":"two-knights-knight-attack","name":"Two Knights, Knight Attack","group":"v-two-knights","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Nf6"],["Ng5"],["d5"],["exd5"],["Na5"]]},
  {"id":"two-knights-quiet-variation","name":"Two Knights, Quiet Variation","group":"v-two-knights","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Nf6"],["d3"]]},
  {"id":"evans-gambit-line-ending-6-d4-exd4-7-cxd4-bb4","name":"Evans Gambit (line ending 6.d4 exd4 7.cxd4 Bb4+)","group":"v-evans-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["b4"],["Bxb4"],["c3"],["Bd6"],["d4"],["exd4"],["cxd4"],["Bb4+"]]},
  {"id":"evans-gambit-line-ending-5-c3-be7-6-d4-na5","name":"Evans Gambit (line ending 5.c3 Be7 6.d4 Na5)","group":"v-evans-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["b4"],["Bxb4"],["c3"],["Be7"],["d4"],["Na5"]]},
  {"id":"evans-gambit-declined","name":"Evans Gambit Declined","group":"v-evans-gambit-declined","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["b4"],["Bb6"]]},
  {"id":"evans-gambit-line-ending-5-c3-ba5-6-d4-d6","name":"Evans Gambit (line ending 5.c3 Ba5 6.d4 d6)","group":"v-evans-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["b4"],["Bxb4"],["c3"],["Ba5"],["d4"],["d6"]]},
  {"id":"evans-gambit-line-ending-6-d4-exd4-7-o-o-nge7","name":"Evans Gambit (line ending 6.d4 exd4 7.O-O Nge7)","group":"v-evans-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["b4"],["Bxb4"],["c3"],["Ba5"],["d4"],["exd4"],["O-O"],["Nge7"]]},
  {"id":"evans-gambit-line-ending-4-bxb4-5-c3-ba5-6-qb3","name":"Evans Gambit (line ending 4...Bxb4 5.c3 Ba5 6.Qb3)","group":"v-evans-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["b4"],["Bxb4"],["c3"],["Ba5"],["Qb3"]]},
  {"id":"evans-gambit-line-ending-6-exd4-7-o-o-d3-8-qb3","name":"Evans Gambit (line ending 6...exd4 7.O-O d3 8.Qb3)","group":"v-evans-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["b4"],["Bxb4"],["c3"],["Ba5"],["d4"],["exd4"],["O-O"],["d3"],["Qb3"]]},
  {"id":"evans-gambit-line-ending-4-b4-bxb4-5-c3-bc5","name":"Evans Gambit (line ending 4.b4 Bxb4 5.c3 Bc5)","group":"v-evans-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["b4"],["Bxb4"],["c3"],["Bc5"]]},
  {"id":"giuoco-pianissimo-main","name":"Giuoco Pianissimo, Main","group":"v-giuoco-pianissimo","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["d3"],["Nf6"],["c3"],["d6"],["O-O"],["O-O"]]},
  {"id":"giuoco-pianissimo-line-ending-4-nf6-5-nc3-d6-6-bg5","name":"Giuoco Pianissimo (line ending 4...Nf6 5.Nc3 d6 6.Bg5)","group":"v-giuoco-pianissimo","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["d3"],["Nf6"],["Nc3"],["d6"],["Bg5"]]},
  {"id":"giuoco-pianissimo-line-ending-4-d3-nf6-5-c3-d5","name":"Giuoco Pianissimo (line ending 4.d3 Nf6 5.c3 d5)","group":"v-giuoco-pianissimo","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["d3"],["Nf6"],["c3"],["d5"]]},
  {"id":"giuoco-piano-line-ending-7-nxe4-8-o-o-bxc3-9-d5","name":"Giuoco Piano (line ending 7...Nxe4 8.O-O Bxc3 9.d5)","group":"v-giuoco-piano","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["c3"],["Nf6"],["d4"],["exd4"],["cxd4"],["Bb4+"],["Nc3"],["Nxe4"],["O-O"],["Bxc3"],["d5"]]},
  {"id":"giuoco-piano-line-ending-7-bd2-bxd2-8-nbxd2-d5","name":"Giuoco Piano (line ending 7.Bd2 Bxd2+ 8.Nbxd2 d5)","group":"v-giuoco-piano","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["c3"],["Nf6"],["d4"],["exd4"],["cxd4"],["Bb4+"],["Bd2"],["Bxd2+"],["Nbxd2"],["d5"]]},
  {"id":"giuoco-piano-line-ending-4-c3-nf6-5-d3-d6","name":"Giuoco Piano (line ending 4.c3 Nf6 5.d3 d6)","group":"v-giuoco-piano","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["c3"],["Nf6"],["d3"],["d6"]]},
  {"id":"giuoco-piano-line-ending-8-nxc3-9-bxc3-bxc3-10-ba3","name":"Giuoco Piano (line ending 8...Nxc3 9.bxc3 Bxc3 10.Ba3)","group":"v-giuoco-piano","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["c3"],["Nf6"],["d4"],["exd4"],["cxd4"],["Bb4+"],["Nc3"],["Nxe4"],["O-O"],["Nxc3"],["bxc3"],["Bxc3"],["Ba3"]]},
  {"id":"giuoco-piano-line-ending-6-cxd4-bb4-7-nc3-nxe4","name":"Giuoco Piano (line ending 6.cxd4 Bb4+ 7.Nc3 Nxe4)","group":"v-giuoco-piano","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["c3"],["Nf6"],["d4"],["exd4"],["cxd4"],["Bb4+"],["Nc3"],["Nxe4"]]},
  {"id":"giuoco-piano-line-ending-8-o-o-bxc3-9-bxc3-d5","name":"Giuoco Piano (line ending 8.O-O Bxc3 9.bxc3 d5)","group":"v-giuoco-piano","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["c3"],["Nf6"],["d4"],["exd4"],["cxd4"],["Bb4+"],["Nc3"],["Nxe4"],["O-O"],["Bxc3"],["bxc3"],["d5"]]},
  {"id":"giuoco-piano-line-ending-5-exd4-6-cxd4-bb4-7-bd2","name":"Giuoco Piano (line ending 5...exd4 6.cxd4 Bb4+ 7.Bd2)","group":"v-giuoco-piano","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["c3"],["Nf6"],["d4"],["exd4"],["cxd4"],["Bb4+"],["Bd2"]]},
  {"id":"giuoco-piano-line-ending-6-cxd4-bb4-7-bd2-nxe4","name":"Giuoco Piano (line ending 6.cxd4 Bb4+ 7.Bd2 Nxe4)","group":"v-giuoco-piano","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["c3"],["Nf6"],["d4"],["exd4"],["cxd4"],["Bb4+"],["Bd2"],["Nxe4"]]},
  {"id":"giuoco-piano-line-ending-2-nc6-3-bc4-bc5-4-d4","name":"Giuoco Piano (line ending 2...Nc6 3.Bc4 Bc5 4.d4)","group":"v-giuoco-piano","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["d4"]]},
  {"id":"blackburne-shilling-gambit","name":"Blackburne Shilling Gambit","group":"v-blackburne-shilling-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Nd4"]]},
  {"id":"paris-defense","name":"Paris Defense","group":"v-paris-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["O-O"],["Nf6"],["d4"],["Bxd4"],["Nxd4"],["Nxd4"]]},
  {"id":"rousseau-gambit","name":"Rousseau Gambit","group":"v-rousseau-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["f5"]]},
  {"id":"schilling-kostic-gambit","name":"Schilling-Kostic Gambit","group":"v-schilling-kostic-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Nd4"],["Nxe5"],["Qg5"]]},
  {"id":"lucchini-gambit","name":"Lucchini Gambit","group":"v-lucchini-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["d4"],["exd4"],["c3"]]},
  {"id":"two-knights-line-ending-4-d4-exd4-5-o-o-bc5","name":"Two Knights (line ending 4.d4 exd4 5.O-O Bc5)","group":"v-two-knights","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Nf6"],["d4"],["exd4"],["O-O"],["Bc5"]]},
  {"id":"two-knights-line-ending-4-ng5-d5-5-exd5-b5","name":"Two Knights (line ending 4.Ng5 d5 5.exd5 b5)","group":"v-two-knights","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Nf6"],["Ng5"],["d5"],["exd5"],["b5"]]},
  {"id":"two-knights-line-ending-4-ng5-d5-5-exd5-nd4","name":"Two Knights (line ending 4.Ng5 d5 5.exd5 Nd4)","group":"v-two-knights","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Nf6"],["Ng5"],["d5"],["exd5"],["Nd4"]]},
  {"id":"two-knights-line-ending-7-dxc6-bxc6-8-be2-h6","name":"Two Knights (line ending 7.dxc6 bxc6 8.Be2 h6)","group":"v-two-knights","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Nf6"],["Ng5"],["d5"],["exd5"],["Na5"],["Bb5+"],["c6"],["dxc6"],["bxc6"],["Be2"],["h6"]]},
  {"id":"two-knights-line-ending-9-nf3-e4-10-ne5-bd6","name":"Two Knights (line ending 9.Nf3 e4 10.Ne5 Bd6)","group":"v-two-knights","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Nf6"],["Ng5"],["d5"],["exd5"],["Na5"],["Bb5+"],["c6"],["dxc6"],["bxc6"],["Be2"],["h6"],["Nf3"],["e4"],["Ne5"],["Bd6"]]},
  {"id":"two-knights-line-ending-7-qf3-ke6-8-nc3-nb4","name":"Two Knights (line ending 7.Qf3+ Ke6 8.Nc3 Nb4)","group":"v-two-knights","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Nf6"],["Ng5"],["d5"],["exd5"],["Nxd5"],["Nxf7"],["Kxf7"],["Qf3+"],["Ke6"],["Nc3"],["Nb4"]]},
  {"id":"two-knights-line-ending-6-nxf7-kxf7-7-qf3-ke6","name":"Two Knights (line ending 6.Nxf7 Kxf7 7.Qf3+ Ke6)","group":"v-two-knights","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Nf6"],["Ng5"],["d5"],["exd5"],["Nxd5"],["Nxf7"],["Kxf7"],["Qf3+"],["Ke6"]]},
  {"id":"two-knights-line-ending-3-nf6-4-d4-exd4-5-ng5","name":"Two Knights (line ending 3...Nf6 4.d4 exd4 5.Ng5)","group":"v-two-knights","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Nf6"],["d4"],["exd4"],["Ng5"]]},
  {"id":"two-knights-4-d3","name":"Two Knights, 4.d3","group":"v-two-knights","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Nf6"],["d3"],["Be7"]]},
  {"id":"1-e4-e5-2-nf3-nc6-3-bc4-nf6","name":"1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6","group":"v-1-e4-e5-2-nf3-nc6-3-bc4-nf6","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Nf6"],["Ng5"],["d5"],["exd5"],["Na5"],["Bb5+"],["c6"],["dxc6"],["bxc6"],["Be2"],["h6"],["Nf3"],["e4"],["Ne5"],["Bd6"],["d4"]]},
  {"id":"legal-trap","name":"Legal Trap","group":"v-legal-trap","moves":[["e4"],["e5"],["Nf3"],["d6"],["Bc4"],["Bg4"],["Nc3"],["g6"],["Nxe5"],["Bxd1"],["Bxf7+"],["Ke7"],["Nd5#"]]},
  {"id":"legal-trap-nc6-order","name":"Legal Trap, Nc6 order","group":"v-legal-trap","moves":[["e4"],["e5"],["Nf3"],["d6"],["Bc4"],["Nc6"],["Nc3"],["Bg4"],["h3"],["Bh5"],["Nxe5"],["Bxd1"],["Bxf7+"],["Ke7"],["Nd5#"]]},
  {"id":"two-knights-traxler-counterattack-nxf7","name":"Two Knights, Traxler Counterattack, Nxf7","group":"v-two-knights","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Nf6"],["Ng5"],["Bc5"],["Nxf7"],["Bxf2+"],["Kf1"],["Qe7"],["Nxh8"],["d5"]]},
  {"id":"two-knights-traxler-counterattack-nc3","name":"Two Knights, Traxler Counterattack, Nc3","group":"v-two-knights","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Nf6"],["Ng5"],["Bc5"],["Nxf7"],["Bxf2+"],["Kf1"],["Qe7"],["Nxh8"],["d5"],["Nc3"],["Nd4"]]},
  {"id":"two-knights-traxler-counterattack-exd5","name":"Two Knights, Traxler Counterattack, exd5","group":"v-two-knights","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Nf6"],["Ng5"],["Bc5"],["Nxf7"],["Bxf2+"],["Kf1"],["Qe7"],["Nxh8"],["d5"],["exd5"],["Nd4"]]},
  {"id":"bird-s-attack","name":"Bird's Attack","group":"v-bird-s-attack","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["c3"],["Nf6"],["b4"]]},
  {"id":"deutz-gambit","name":"Deutz Gambit","group":"v-deutz-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["O-O"],["Nf6"],["d4"]]},
  {"id":"scotch-gambit","name":"Scotch Gambit","group":"v-scotch-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Nf6"],["d4"],["exd4"],["O-O"]]},
  {"id":"scotch-invitation-declined","name":"Scotch Invitation Declined","group":"v-scotch-invitation-declined","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Nf6"],["d4"],["d6"]]},
  {"id":"anti-fried-liver-defense","name":"Anti-Fried Liver Defense","group":"v-anti-fried-liver-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["h6"]]},
  {"id":"classical-variation","name":"Classical Variation","group":"v-classical-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["c3"]]},
  {"id":"classical-variation-with-d5","name":"Classical Variation, with d5","group":"v-classical-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["c3"],["Nf6"],["d3"],["d5"]]},
  {"id":"giuoco-pianissimo-normal","name":"Giuoco Pianissimo, Normal","group":"v-giuoco-pianissimo","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Nf6"],["d3"],["Bc5"]]},
  {"id":"giuoco-piano-greco-s-attack","name":"Giuoco Piano, Greco's Attack","group":"v-giuoco-piano","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["c3"],["Nf6"],["d4"],["exd4"],["cxd4"],["Bb4+"],["Nc3"]]},
  {"id":"evans-gambit-main-line","name":"Evans Gambit, Main Line","group":"v-evans-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["b4"],["Bxb4"],["c3"],["Ba5"]]},
  {"id":"evans-gambit-morphy-attack","name":"Evans Gambit, Morphy Attack","group":"v-evans-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["b4"],["Bxb4"],["c3"],["Ba5"],["d4"],["exd4"],["O-O"],["d6"],["cxd4"],["Bb6"],["Nc3"]]},
  {"id":"evans-gambit-fraser-attack","name":"Evans Gambit, Fraser Attack","group":"v-evans-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["b4"],["Bxb4"],["c3"],["Bc5"],["d4"],["exd4"],["O-O"],["d6"],["cxd4"],["Bb6"],["Nc3"],["Bg4"],["Qa4"]]},
  {"id":"evans-gambit-goring-attack","name":"Evans Gambit, Göring Attack","group":"v-evans-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["b4"],["Bxb4"],["c3"],["Bc5"],["d4"],["exd4"],["O-O"],["d6"],["cxd4"],["Bb6"],["Nc3"],["Na5"],["Bg5"]]},
  {"id":"evans-gambit-mayet-defense","name":"Evans Gambit, Mayet Defense","group":"v-evans-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["b4"],["Bxb4"],["c3"],["Bf8"]]},
  {"id":"evans-gambit-pierce-defense","name":"Evans Gambit, Pierce Defense","group":"v-evans-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["b4"],["Bxb4"],["c3"],["Ba5"],["d4"],["exd4"]]},
  {"id":"evans-gambit-slow-variation","name":"Evans Gambit, Slow Variation","group":"v-evans-gambit","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Bc5"],["b4"],["Bxb4"],["c3"],["Ba5"],["O-O"]]},
  {"id":"two-knights-defense-max-lange-attack","name":"Two Knights Defense, Max Lange Attack","group":"v-two-knights-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["Bc4"],["Nf6"],["O-O"],["Bc5"],["e5"]]},
  {"id":"two-knights-defense-max-lange-attack-loman-defense","name":"Two Knights Defense, Max Lange Attack, Loman Defense","group":"v-two-knights-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["d4"],["exd4"],["Bc4"],["Bc5"],["O-O"],["Nf6"],["e5"],["d5"],["exf6"],["dxc4"],["Re1+"],["Be6"],["Ng5"],["g6"]]},
  {"id":"two-knights-defense-max-lange-attack-krause-variation","name":"Two Knights Defense, Max Lange Attack, Krause Variation","group":"v-two-knights-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Nf6"],["d4"],["exd4"],["O-O"],["Bc5"],["e5"],["Ng4"],["c3"]]},
  {"id":"two-knights-defense-max-lange-attack-berger-variation","name":"Two Knights Defense, Max Lange Attack, Berger Variation","group":"v-two-knights-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bc4"],["Nf6"],["d4"],["exd4"],["O-O"],["Bc5"],["e5"],["d5"],["exf6"],["dxc4"],["Re1+"],["Be6"],["Ng5"],["Qd5"],["Nc3"],["Qf5"],["g4"],["Qg6"],["Nce4"],["Bb6"],["f4"],["O-O-O"]]}
 ]
};
