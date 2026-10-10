// Benoni Defence — daxaur/tabia (MIT), extended by Veyra Chess
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "benoni",
 "name": "Benoni Defence",
 "color": "b",
 "eco": "A60",
 "oneLiner": "1.d4 Nf6 2.c4 c5 3.d5 e6 — the Benoni: hand White the centre, get a queenside majority and a raging dark-squared bishop.",
 "trunk": "1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nc3 exd5 5.cxd5 d6",
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
  "modern": {
   "label": "Modern Benoni",
   "blurb": "The main lines after 3…e6"
  },
  "side": {
   "label": "Sidelines",
   "blurb": "Czech Benoni & Benko Gambit"
  },
  "v-modern-variation": {
   "label": "Modern Variation",
   "blurb": ""
  },
  "v-taimanov-attack": {
   "label": "Taimanov Attack",
   "blurb": ""
  },
  "v-four-pawns-attack": {
   "label": "Four Pawns Attack",
   "blurb": ""
  },
  "v-czech-benoni": {
   "label": "Czech Benoni",
   "blurb": ""
  },
  "v-modern": {
   "label": "Modern",
   "blurb": ""
  },
  "v-czech": {
   "label": "Czech",
   "blurb": ""
  },
  "v-hromodka-system": {
   "label": "Hromodka System",
   "blurb": ""
  },
  "v-benko-accepted": {
   "label": "Benko Accepted",
   "blurb": ""
  },
  "v-benko-declined": {
   "label": "Benko Declined",
   "blurb": ""
  },
  "v-blumenfeld-countergambit": {
   "label": "Blumenfeld Countergambit",
   "blurb": ""
  }
 },
 "source": "daxaur/tabia (MIT)",
 "category": "Defences",
 "lines": [
  {"id":"classical","name":"Classical Main (8.Be2)","group":"modern","star":true,"idea":"The main Modern Benoni. Fianchetto, castle, and uncoil with …Re8, …Na6–c7 and the thematic …b5 break. Objectively White is a shade better (≈ +0.7), but it’s one of the richest, most double-edged structures in chess — you play for the win as Black.","moves":[["d4"],["Nf6"],["c4"],["c5"],["d5"],["e6","3…e6 — challenge the d5-pawn."],["Nc3"],["exd5"],["cxd5"],["d6"],["e4"],["g6","6…g6 — the Benoni bishop heads to g7."],["Nf3"],["Bg7"],["Be2"],["O-O"],["O-O"],["Re8","9…Re8 — pressure e4, prepare …Na6 and …b5."],["Nd2"],["Na6","10…Na6 — reroute to c7 to support …b5; rich, fighting middlegame."]]},
  {"id":"fianchetto","name":"Fianchetto (7.g3)","group":"modern","idea":"White fianchettoes to blunt your bishop. Develop solidly and aim for …Re8/…Na6 and the …b5 lever; the d6/c5 majority is your trump.","moves":[["d4"],["Nf6"],["c4"],["c5"],["d5"],["e6"],["Nc3"],["exd5"],["cxd5"],["d6"],["Nf3"],["g6"],["g3","7.g3 — the Fianchetto Variation."],["Bg7"],["Bg2"],["O-O"],["O-O"],["Na6","9…Na6 — the modern setup; …Nc7 and …b5 to come."]]},
  {"id":"four-pawns","name":"Four Pawns Attack (7.f4)","group":"modern","idea":"White grabs the whole centre with f4. Meet the Bb5+ check with …Nfd7 (the main antidote), castle, and counter the over-extended pawns with …Na6 and …b5.","moves":[["d4"],["Nf6"],["c4"],["c5"],["d5"],["e6"],["Nc3"],["exd5"],["cxd5"],["d6"],["e4"],["g6"],["f4","7.f4 — the Four Pawns Attack, the most ambitious try."],["Bg7"],["Bb5+"],["Nfd7","8…Nfd7! — the key move; the big centre becomes a target."],["a4"],["O-O"],["Nf3"],["Na6","10…Na6 — pressure the over-extended pawns."]]},
  {"id":"czech","name":"Czech Benoni (3…e5)","group":"side","idea":"Lock the centre with …e5. A patient manoeuvring game: reroute the knight …Ne8–g7 and prepare the …f5 break.","moves":[["d4"],["Nf6"],["c4"],["c5"],["d5"],["e5","3…e5 — the Czech Benoni, a closed, strategic battle."],["Nc3"],["d6"],["e4"],["Be7"],["Nf3"],["O-O"],["Be2"],["Ne8","7…Ne8 — heading …Ng7 and …f5."]]},
  {"id":"benko","name":"Benko Gambit (3…b5)","group":"side","idea":"Sacrifice a wing pawn for long-term pressure: the half-open a- and b-files and a powerful g7-bishop give lasting, low-risk initiative.","moves":[["d4"],["Nf6"],["c4"],["c5"],["d5"],["b5","3…b5!? — the Benko Gambit."],["cxb5"],["a6"],["bxa6"],["Bxa6"],["Nc3"],["d6"],["e4"],["Bxf1"],["Kxf1"],["g6","Black has full compensation: the open queenside files and the long diagonal."]]},
  {"id":"modern-variation","name":"Modern Variation","group":"v-modern-variation","moves":[["d4"],["Nf6"],["c4"],["c5"],["d5"],["e6"],["Nc3"],["exd5"],["cxd5"],["d6"]]},
  {"id":"taimanov-attack","name":"Taimanov Attack","group":"v-taimanov-attack","moves":[["d4"],["Nf6"],["c4"],["c5"],["d5"],["e6"],["Nc3"],["exd5"],["cxd5"],["d6"],["e4"],["g6"],["f4"],["Bg7"],["Bb5+"]]},
  {"id":"four-pawns-attack","name":"Four Pawns Attack","group":"v-four-pawns-attack","moves":[["d4"],["Nf6"],["c4"],["c5"],["d5"],["e6"],["Nc3"],["exd5"],["cxd5"],["d6"],["e4"],["g6"],["f4"],["Bg7"],["Nf3"],["O-O"]]},
  {"id":"czech-benoni","name":"Czech Benoni","group":"v-czech-benoni","moves":[["d4"],["Nf6"],["c4"],["c5"],["d5"],["e5"]],"idea":"Black gives White the centre but gets queenside pawn majority and the long diagonal for the g7-bishop. Sharp, double-edged."},
  {"id":"modern-four-pawns-bg4","name":"Modern, Four Pawns, Bg4","group":"v-modern","moves":[["d4"],["Nf6"],["c4"],["c5"],["d5"],["e6"],["Nc3"],["exd5"],["cxd5"],["d6"],["e4"],["g6"],["f4"],["Bg7"],["Nf3"],["O-O"],["Be2"],["c4"]]},
  {"id":"modern-fianchetto-nf3","name":"Modern, Fianchetto, Nf3","group":"v-modern","moves":[["d4"],["Nf6"],["c4"],["c5"],["d5"],["e6"],["Nc3"],["exd5"],["cxd5"],["d6"],["Nf3"],["g6"],["g3"]]},
  {"id":"modern-classical-qc2","name":"Modern, Classical, Qc2","group":"v-modern","moves":[["d4"],["Nf6"],["c4"],["c5"],["d5"],["e6"],["Nc3"],["exd5"],["cxd5"],["d6"],["e4"],["g6"],["Nf3"],["Bg7"],["Be2"],["O-O"],["O-O"],["Re8"],["Nd2"]]},
  {"id":"modern-classical-bf4","name":"Modern, Classical, Bf4","group":"v-modern","moves":[["d4"],["Nf6"],["c4"],["c5"],["d5"],["e6"],["Nc3"],["exd5"],["cxd5"],["d6"],["e4"],["g6"],["Nf3"],["Bg7"],["Be2"],["O-O"],["O-O"],["Re8"],["Bf4"]]},
  {"id":"czech-bg5","name":"Czech, Bg5","group":"v-czech","moves":[["d4"],["Nf6"],["c4"],["c5"],["d5"],["e5"],["Nc3"],["d6"],["e4"],["Be7"],["Bg5"]]},
  {"id":"czech-nf3","name":"Czech, Nf3","group":"v-czech","moves":[["d4"],["Nf6"],["c4"],["c5"],["d5"],["e5"],["Nc3"],["d6"],["Nf3"]]},
  {"id":"czech-g3","name":"Czech, g3","group":"v-czech","moves":[["d4"],["Nf6"],["c4"],["c5"],["d5"],["e5"],["Nc3"],["d6"],["g3"]]},
  {"id":"czech-be2","name":"Czech, Be2","group":"v-czech","moves":[["d4"],["Nf6"],["c4"],["c5"],["d5"],["e5"],["e4"],["d6"],["Nc3"],["Be7"],["Nf3"]]},
  {"id":"hromodka-system","name":"Hromodka System","group":"v-hromodka-system","moves":[["d4"],["c5"],["d5"],["d6"],["Nc3"],["Nf6"],["e4"],["g6"]]},
  {"id":"benko-accepted","name":"Benko Accepted","group":"v-benko-accepted","moves":[["d4"],["Nf6"],["c4"],["c5"],["d5"],["b5"],["cxb5"],["a6"],["bxa6"],["Bxa6"]]},
  {"id":"benko-declined","name":"Benko Declined","group":"v-benko-declined","moves":[["d4"],["Nf6"],["c4"],["c5"],["d5"],["b5"],["Bg5"]]},
  {"id":"benko-declined-nf3","name":"Benko Declined, Nf3","group":"v-benko-declined","moves":[["d4"],["Nf6"],["c4"],["c5"],["d5"],["b5"],["Nf3"]]},
  {"id":"benko-declined-bg5-qa5","name":"Benko Declined, Bg5 Qa5+","group":"v-benko-declined","moves":[["d4"],["Nf6"],["c4"],["c5"],["d5"],["b5"],["Bg5"],["Qa5+"]]},
  {"id":"benko-declined-bg5-bxc4","name":"Benko Declined, Bg5 bxc4","group":"v-benko-declined","moves":[["d4"],["Nf6"],["c4"],["c5"],["d5"],["b5"],["Bg5"],["bxc4"]]},
  {"id":"benko-declined-bg5-nf6","name":"Benko Declined, Bg5 Nf6","group":"v-benko-declined","moves":[["d4"],["Nf6"],["c4"],["c5"],["d5"],["b5"],["Bg5"],["Qb6"]]},
  {"id":"blumenfeld-countergambit","name":"Blumenfeld Countergambit","group":"v-blumenfeld-countergambit","moves":[["d4"],["Nf6"],["c4"],["e6"],["Nf3"],["c5"],["d5"],["b5"]]}
 ]
};
