// French Defence — daxaur/tabia (MIT), extended by Veyra Chess
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "french",
 "name": "French Defence",
 "color": "b",
 "eco": "C00",
 "oneLiner": "1.e4 e6 — solid and combative: a rock-solid chain, then break with …c5 and …f6.",
 "trunk": "1.e4 e6 2.d4 d5",
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
  "main": {
   "label": "Main · 3.Nc3",
   "blurb": "Winawer & Classical"
  },
  "other": {
   "label": "Other",
   "blurb": "Advance & Tarrasch"
  },
  "v-main": {
   "label": "Main",
   "blurb": ""
  },
  "v-advance-variation": {
   "label": "Advance Variation",
   "blurb": ""
  },
  "v-milner-barry-gambit": {
   "label": "Milner-Barry Gambit",
   "blurb": ""
  },
  "v-exchange-variation": {
   "label": "Exchange Variation",
   "blurb": ""
  },
  "v-tarrasch-variation": {
   "label": "Tarrasch Variation",
   "blurb": ""
  },
  "v-winawer-variation": {
   "label": "Winawer Variation",
   "blurb": ""
  },
  "v-classical-variation": {
   "label": "Classical Variation",
   "blurb": ""
  },
  "v-steinitz-variation": {
   "label": "Steinitz Variation",
   "blurb": ""
  },
  "v-rubinstein-variation": {
   "label": "Rubinstein Variation",
   "blurb": ""
  },
  "v-king-s-indian-attack": {
   "label": "King's Indian Attack",
   "blurb": ""
  },
  "v-advance": {
   "label": "Advance",
   "blurb": ""
  },
  "v-winawer": {
   "label": "Winawer",
   "blurb": ""
  },
  "v-tarrasch": {
   "label": "Tarrasch",
   "blurb": ""
  },
  "v-classical": {
   "label": "Classical",
   "blurb": ""
  },
  "v-rubinstein": {
   "label": "Rubinstein",
   "blurb": ""
  },
  "v-exchange": {
   "label": "Exchange",
   "blurb": ""
  },
  "v-two-knights": {
   "label": "Two Knights",
   "blurb": ""
  },
  "v-wing-gambit": {
   "label": "Wing Gambit",
   "blurb": ""
  },
  "v-paulsen-attack": {
   "label": "Paulsen Attack",
   "blurb": ""
  },
  "v-reversed-philidor": {
   "label": "Reversed Philidor",
   "blurb": ""
  },
  "v-1-e4-e6-2-nc3": {
   "label": "1.e4 e6 2.Nc3",
   "blurb": ""
  },
  "v-1-e4-e6-2-c4": {
   "label": "1.e4 e6 2.c4",
   "blurb": ""
  },
  "v-chigorin-variation": {
   "label": "Chigorin Variation",
   "blurb": ""
  },
  "v-labourdonnais-variation": {
   "label": "Labourdonnais Variation",
   "blurb": ""
  }
 },
 "source": "daxaur/tabia (MIT)",
 "category": "Defences",
 "lines": [
  {"id":"winawer","name":"Winawer (3.Nc3 Bb4)","group":"main","star":true,"idea":"Pin and trade on c3 to wreck White’s queenside pawns, then besiege the doubled pawns and the centre.","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["Bb4","3…Bb4 — the Winawer."],["e5"],["c5"],["a3"],["Bxc3+"],["bxc3"],["Ne7","Target the doubled c-pawns and e5."]]},
  {"id":"classical-french","name":"Classical (3.Nc3 Nf6)","group":"main","idea":"Develop classically; after Bg5 trade dark-squared bishops and play against the cramped e5-chain with …c5/…f6.","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["Nf6"],["Bg5"],["Be7"],["e5"],["Nfd7"],["Bxe7"],["Qxe7","Now …c5 and …f6 strike the chain."]]},
  {"id":"advance-french","name":"Advance (3.e5)","group":"other","idea":"White grabs space with e5. Undermine the base of the chain with …c5 and …Qb6, hitting d4 and b2.","moves":[["e4"],["e6"],["d4"],["d5"],["e5","3.e5 — the Advance."],["c5"],["c3"],["Nc6"],["Nf3"],["Qb6"],["a3"],["c4","Clamp the queenside and play on the light squares."]]},
  {"id":"tarrasch-french","name":"Tarrasch (3.Nd2)","group":"other","idea":"Against 3.Nd2, hit the centre at once with …c5; equal, active piece play in an open position.","moves":[["e4"],["e6"],["d4"],["d5"],["Nd2","3.Nd2 — the Tarrasch."],["c5"],["exd5"],["exd5"],["Ngf3"],["Nc6"],["Bb5"],["Bd6","Free, comfortable development."]]},
  {"id":"french-defense","name":"French Defense","group":"v-main","moves":[["e4"],["e6"]],"idea":"Black accepts a cramped bishop on c8 for a rock-solid structure. The plan is to attack White's centre with ...c5, then play for counterplay."},
  {"id":"advance-variation","name":"Advance Variation","group":"v-advance-variation","moves":[["e4"],["e6"],["d4"],["d5"],["e5"]]},
  {"id":"milner-barry-gambit","name":"Milner-Barry Gambit","group":"v-milner-barry-gambit","moves":[["e4"],["e6"],["d4"],["d5"],["e5"],["c5"],["c3"],["Nc6"],["Nf3"],["Qb6"],["Bd3"],["cxd4"],["cxd4"],["Bd7"],["O-O"]]},
  {"id":"exchange-variation","name":"Exchange Variation","group":"v-exchange-variation","moves":[["e4"],["e6"],["d4"],["d5"],["exd5"],["exd5"]]},
  {"id":"tarrasch-variation","name":"Tarrasch Variation","group":"v-tarrasch-variation","moves":[["e4"],["e6"],["d4"],["d5"],["Nd2"]]},
  {"id":"winawer-variation","name":"Winawer Variation","group":"v-winawer-variation","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["Bb4"]]},
  {"id":"classical-variation","name":"Classical Variation","group":"v-classical-variation","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["Nf6"]]},
  {"id":"steinitz-variation","name":"Steinitz Variation","group":"v-steinitz-variation","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["Nf6"],["e5"],["Nfd7"]]},
  {"id":"rubinstein-variation","name":"Rubinstein Variation","group":"v-rubinstein-variation","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["dxe4"]]},
  {"id":"king-s-indian-attack","name":"King's Indian Attack","group":"v-king-s-indian-attack","moves":[["e4"],["e6"],["d3"]]},
  {"id":"advance-line-ending-4-c3-nc6-5-nf3-qb6","name":"Advance (line ending 4.c3 Nc6 5.Nf3 Qb6)","group":"v-advance","moves":[["e4"],["e6"],["d4"],["d5"],["e5"],["c5"],["c3"],["Nc6"],["Nf3"],["Qb6"]]},
  {"id":"advance-line-ending-2-d5-3-e5-c5-4-qg4","name":"Advance (line ending 2...d5 3.e5 c5 4.Qg4)","group":"v-advance","moves":[["e4"],["e6"],["d4"],["d5"],["e5"],["c5"],["Qg4"]]},
  {"id":"advance-line-ending-4-nc6-5-nf3-qb6-6-a3","name":"Advance (line ending 4...Nc6 5.Nf3 Qb6 6.a3)","group":"v-advance","moves":[["e4"],["e6"],["d4"],["d5"],["e5"],["c5"],["c3"],["Nc6"],["Nf3"],["Qb6"],["a3"]]},
  {"id":"advance-line-ending-4-c3-nc6-5-nf3-bd7","name":"Advance (line ending 4.c3 Nc6 5.Nf3 Bd7)","group":"v-advance","moves":[["e4"],["e6"],["d4"],["d5"],["e5"],["c5"],["c3"],["Nc6"],["Nf3"],["Bd7"]]},
  {"id":"advance-line-ending-6-be2-cxd4-7-cxd4-nxd4","name":"Advance (line ending 6.Be2 cxd4 7.cxd4 Nxd4)","group":"v-advance","moves":[["e4"],["e6"],["d4"],["d5"],["e5"],["c5"],["c3"],["Nc6"],["Nf3"],["Qb6"],["Be2"],["cxd4"],["cxd4"],["Nxd4"]]},
  {"id":"advance-4-nf3-nc6-5-be3","name":"Advance, 4.Nf3 Nc6 5.Be3","group":"v-advance","moves":[["e4"],["e6"],["d4"],["d5"],["e5"],["c5"],["c3"],["Nc6"],["Nf3"],["cxd4"],["cxd4"],["Bd7"],["Be2"]]},
  {"id":"winawer-line-ending-8-qxg7-rg8-9-qxh7-cxd4","name":"Winawer (line ending 8.Qxg7 Rg8 9.Qxh7 cxd4)","group":"v-winawer","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["Bb4"],["e5"],["c5"],["a3"],["Bxc3+"],["bxc3"],["Ne7"],["Qg4"],["Qc7"],["Qxg7"],["Rg8"],["Qxh7"],["cxd4"]]},
  {"id":"winawer-line-ending-2-d5-3-nc3-bb4-4-e5","name":"Winawer (line ending 2...d5 3.Nc3 Bb4 4.e5)","group":"v-winawer","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["Bb4"],["e5"]]},
  {"id":"winawer-line-ending-5-a3-bxc3-6-bxc3-qc7","name":"Winawer (line ending 5.a3 Bxc3+ 6.bxc3 Qc7)","group":"v-winawer","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["Bb4"],["e5"],["c5"],["a3"],["Bxc3+"],["bxc3"],["Qc7"]]},
  {"id":"winawer-line-ending-3-nc3-bb4-4-e5-qd7","name":"Winawer (line ending 3.Nc3 Bb4 4.e5 Qd7)","group":"v-winawer","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["Bb4"],["e5"],["Qd7"]]},
  {"id":"winawer-line-ending-3-nc3-bb4-4-e5-b6","name":"Winawer (line ending 3.Nc3 Bb4 4.e5 b6)","group":"v-winawer","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["Bb4"],["e5"],["b6"]]},
  {"id":"winawer-line-ending-3-bb4-4-exd5-exd5-5-bd3","name":"Winawer (line ending 3...Bb4 4.exd5 exd5 5.Bd3)","group":"v-winawer","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["Bb4"],["exd5"],["exd5"],["Bd3"]]},
  {"id":"winawer-line-ending-3-nc3-bb4-4-exd5-exd5","name":"Winawer (line ending 3.Nc3 Bb4 4.exd5 exd5)","group":"v-winawer","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["Bb4"],["exd5"],["exd5"]]},
  {"id":"winawer-line-ending-2-d5-3-nc3-bb4-4-qd3","name":"Winawer (line ending 2...d5 3.Nc3 Bb4 4.Qd3)","group":"v-winawer","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["Bb4"],["Qd3"]]},
  {"id":"winawer-line-ending-2-d5-3-nc3-bb4-4-bd3","name":"Winawer (line ending 2...d5 3.Nc3 Bb4 4.Bd3)","group":"v-winawer","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["Bb4"],["Bd3"]]},
  {"id":"winawer-4-bd2","name":"Winawer, 4.Bd2","group":"v-winawer","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["Bb4"],["Bd2"]]},
  {"id":"winawer-line-ending-3-bb4-4-e5-c5-5-bd2","name":"Winawer (line ending 3...Bb4 4.e5 c5 5.Bd2)","group":"v-winawer","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["Bb4"],["e5"],["c5"],["Bd2"]]},
  {"id":"winawer-line-ending-4-e5-c5-5-a3-ba5","name":"Winawer (line ending 4.e5 c5 5.a3 Ba5)","group":"v-winawer","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["Bb4"],["e5"],["c5"],["a3"],["Ba5"]]},
  {"id":"tarrasch-line-ending-7-ne2-cxd4-8-cxd4-f6","name":"Tarrasch (line ending 7.Ne2 cxd4 8.cxd4 f6)","group":"v-tarrasch","moves":[["e4"],["e6"],["d4"],["d5"],["Nd2"],["Nf6"],["e5"],["Nfd7"],["Bd3"],["c5"],["c3"],["Nc6"],["Ne2"],["cxd4"],["cxd4"],["f6"]]},
  {"id":"tarrasch-line-ending-8-cxd4-f6-9-exf6-nxf6","name":"Tarrasch (line ending 8.cxd4 f6 9.exf6 Nxf6)","group":"v-tarrasch","moves":[["e4"],["e6"],["d4"],["d5"],["Nd2"],["Nf6"],["e5"],["Nfd7"],["Bd3"],["c5"],["c3"],["Nc6"],["Ne2"],["cxd4"],["cxd4"],["f6"],["exf6"],["Nxf6"]]},
  {"id":"tarrasch-line-ending-2-d4-d5-3-nd2-nc6","name":"Tarrasch (line ending 2.d4 d5 3.Nd2 Nc6)","group":"v-tarrasch","moves":[["e4"],["e6"],["d4"],["d5"],["Nd2"],["Nc6"]]},
  {"id":"tarrasch-line-ending-2-d5-3-nd2-dxe4-4-nxe4","name":"Tarrasch (line ending 2...d5 3.Nd2 dxe4 4.Nxe4)","group":"v-tarrasch","moves":[["e4"],["e6"],["d4"],["d5"],["Nd2"],["dxe4"],["Nxe4"]]},
  {"id":"tarrasch-line-ending-2-d4-d5-3-nd2-bb4","name":"Tarrasch (line ending 2.d4 d5 3.Nd2 Bb4)","group":"v-tarrasch","moves":[["e4"],["e6"],["d4"],["d5"],["Nd2"],["Bb4"]]},
  {"id":"tarrasch-line-ending-7-dxc5-bxc5-8-o-o-nge7","name":"Tarrasch (line ending 7.dxc5 Bxc5 8.O-O Nge7)","group":"v-tarrasch","moves":[["e4"],["e6"],["d4"],["d5"],["Nd2"],["c5"],["exd5"],["exd5"],["Ngf3"],["Nc6"],["Bb5"],["Bd6"],["dxc5"],["Bxc5"],["O-O"],["Ne7"]]},
  {"id":"tarrasch-line-ending-7-ne2-cxd4-8-cxd4-f6-2","name":"Tarrasch (line ending 7.Ne2 cxd4 8.cxd4 f6)","group":"v-tarrasch","moves":[["e4"],["e6"],["d4"],["d5"],["Nd2"],["Nf6"],["e5"],["Nfd7"],["c3"],["c5"],["Bd3"],["Nc6"],["Ne2"],["cxd4"],["cxd4"],["f6"]]},
  {"id":"tarrasch-line-ending-2-d4-d5-3-nd2-h6","name":"Tarrasch (line ending 2.d4 d5 3.Nd2 h6)","group":"v-tarrasch","moves":[["e4"],["e6"],["d4"],["d5"],["Nd2"],["h6"]]},
  {"id":"tarrasch-line-ending-2-d4-d5-3-nd2-a6","name":"Tarrasch (line ending 2.d4 d5 3.Nd2 a6)","group":"v-tarrasch","moves":[["e4"],["e6"],["d4"],["d5"],["Nd2"],["a6"]]},
  {"id":"tarrasch-line-ending-8-cxd4-f6-9-exf6-qxf6","name":"Tarrasch (line ending 8.cxd4 f6 9.exf6 Qxf6)","group":"v-tarrasch","moves":[["e4"],["e6"],["d4"],["d5"],["Nd2"],["Nf6"],["e5"],["Nfd7"],["Bd3"],["c5"],["c3"],["Nc6"],["Ne2"],["cxd4"],["cxd4"],["f6"],["exf6"],["Qxf6"]]},
  {"id":"classical-line-ending-9-qd2-o-o-10-o-o-o-a6","name":"Classical (line ending 9.Qd2 O-O 10.O-O-O a6)","group":"v-classical","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["Nf6"],["e5"],["Nfd7"],["f4"],["c5"],["Nf3"],["Nc6"],["Be3"],["cxd4"],["Nxd4"],["Bc5"],["Qd2"],["O-O"],["O-O-O"],["a6"]]},
  {"id":"classical-line-ending-6-bxf6-bxf6-7-nf3-o-o","name":"Classical (line ending 6.Bxf6 Bxf6 7.Nf3 O-O)","group":"v-classical","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["Nf6"],["Bg5"],["dxe4"],["Nxe4"],["Be7"],["Bxf6"],["Bxf6"],["Nf3"],["O-O"]]},
  {"id":"classical-line-ending-6-bxe7-qxe7-7-qd2-o-o","name":"Classical (line ending 6.Bxe7 Qxe7 7.Qd2 O-O)","group":"v-classical","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["Nf6"],["Bg5"],["Be7"],["e5"],["Nfd7"],["Bxe7"],["Qxe7"],["Qd2"],["O-O"]]},
  {"id":"classical-line-ending-3-nc3-nf6-4-bg5-bb4","name":"Classical (line ending 3.Nc3 Nf6 4.Bg5 Bb4)","group":"v-classical","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["Nf6"],["Bg5"],["Bb4"]]},
  {"id":"classical-line-ending-2-d5-3-nc3-nf6-4-bd3","name":"Classical (line ending 2...d5 3.Nc3 Nf6 4.Bd3)","group":"v-classical","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["Nf6"],["Bd3"]]},
  {"id":"classical-line-ending-3-nc3-nf6-4-exd5-exd5","name":"Classical (line ending 3.Nc3 Nf6 4.exd5 exd5)","group":"v-classical","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["Nf6"],["exd5"],["exd5"]]},
  {"id":"classical-line-ending-4-be7-5-e5-nfd7-6-h4","name":"Classical (line ending 4...Be7 5.e5 Nfd7 6.h4)","group":"v-classical","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["Nf6"],["Bg5"],["Be7"],["e5"],["Nfd7"],["h4"]]},
  {"id":"classical-4-e5-nfd7-5-f4","name":"Classical, 4.e5 Nfd7 5.f4","group":"v-classical","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["Nf6"],["e5"],["Nfd7"],["f4"]]},
  {"id":"classical-rubinstein-type-4-bg5-dxe4","name":"Classical, Rubinstein-type 4.Bg5 dxe4","group":"v-classical","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["Nf6"],["Bg5"],["dxe4"],["Nxe4"],["Nbd7"]]},
  {"id":"rubinstein-line-ending-3-nc3-dxe4-4-nxe4-bd7","name":"Rubinstein (line ending 3.Nc3 dxe4 4.Nxe4 Bd7)","group":"v-rubinstein","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["dxe4"],["Nxe4"],["Bd7"]]},
  {"id":"rubinstein-line-ending-3-nc3-dxe4-4-nxe4-nd7","name":"Rubinstein (line ending 3.Nc3 dxe4 4.Nxe4 Nd7)","group":"v-rubinstein","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["dxe4"],["Nxe4"],["Nd7"]]},
  {"id":"rubinstein-main","name":"Rubinstein, Main","group":"v-rubinstein","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["dxe4"],["Nxe4"],["Nd7"],["Nf3"],["Ngf6"],["Nxf6+"],["Nxf6"],["Bd3"],["c5"]]},
  {"id":"rubinstein-line-ending-4-nxe4-nd7-5-qe2-ngf6","name":"Rubinstein (line ending 4.Nxe4 Nd7 5.Qe2 Ngf6)","group":"v-rubinstein","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["dxe4"],["Nxe4"],["Nd7"],["Qe2"],["Ngf6"]]},
  {"id":"rubinstein-line-ending-6-nxf6-nxf6-7-bd3-be7","name":"Rubinstein (line ending 6.Nxf6+ Nxf6 7.Bd3 Be7)","group":"v-rubinstein","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["dxe4"],["Nxe4"],["Nd7"],["Nf3"],["Ngf6"],["Nxf6+"],["Nxf6"],["Bd3"],["Be7"]]},
  {"id":"rubinstein-line-ending-7-ngf6-8-nxf6-nxf6-9-bg5","name":"Rubinstein (line ending 7...Ngf6 8.Nxf6+ Nxf6 9.Bg5)","group":"v-rubinstein","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["dxe4"],["Nxe4"],["Bd7"],["Nf3"],["Bc6"],["Bd3"],["Nd7"],["Qe2"],["Ngf6"],["Nxf6+"],["Nxf6"],["Bg5"]]},
  {"id":"exchange-line-ending-5-bd3-bd6-6-o-o-o-o","name":"Exchange (line ending 5.Bd3 Bd6 6.O-O O-O)","group":"v-exchange","moves":[["e4"],["e6"],["d4"],["d5"],["exd5"],["exd5"],["Nf3"],["Nf6"],["Bd3"],["Bd6"],["O-O"],["O-O"]]},
  {"id":"exchange-line-ending-3-exd5-4-bd3-bd6-5-nf3","name":"Exchange (line ending 3...exd5 4.Bd3 Bd6 5.Nf3)","group":"v-exchange","moves":[["e4"],["e6"],["d4"],["d5"],["exd5"],["exd5"],["Bd3"],["Bd6"],["Nf3"]]},
  {"id":"exchange-line-ending-3-exd5-4-nf3-bd6-5-c4","name":"Exchange (line ending 3...exd5 4.Nf3 Bd6 5.c4)","group":"v-exchange","moves":[["e4"],["e6"],["d4"],["d5"],["exd5"],["exd5"],["Nf3"],["Bd6"],["c4"]]},
  {"id":"exchange-line-ending-3-exd5-4-nc3-nf6-5-bg5","name":"Exchange (line ending 3...exd5 4.Nc3 Nf6 5.Bg5)","group":"v-exchange","moves":[["e4"],["e6"],["d4"],["d5"],["exd5"],["exd5"],["Nc3"],["Nf6"],["Bg5"]]},
  {"id":"exchange-3-exd5-4-nf3-bd6","name":"Exchange, 3...exd5 4.Nf3 Bd6","group":"v-exchange","moves":[["e4"],["e6"],["d4"],["d5"],["exd5"],["exd5"],["Nf3"],["Bd6"]]},
  {"id":"exchange-line-ending-4-bd3-nc6-5-c3-bd6","name":"Exchange (line ending 4.Bd3 Nc6 5.c3 Bd6)","group":"v-exchange","moves":[["e4"],["e6"],["d4"],["d5"],["exd5"],["exd5"],["Bd3"],["Nc6"],["c3"],["Bd6"]]},
  {"id":"exchange-line-ending-2-d5-3-exd5-exd5-4-c4","name":"Exchange (line ending 2...d5 3.exd5 exd5 4.c4)","group":"v-exchange","moves":[["e4"],["e6"],["d4"],["d5"],["exd5"],["exd5"],["c4"]]},
  {"id":"two-knights","name":"Two Knights","group":"v-two-knights","moves":[["e4"],["e6"],["Nf3"],["d5"],["Nc3"]]},
  {"id":"two-knights-line-ending-6-bg2-be7-7-o-o-o-o","name":"Two Knights (line ending 6.Bg2 Be7 7.O-O O-O)","group":"v-two-knights","moves":[["e4"],["e6"],["d3"],["d5"],["Nd2"],["Nf6"],["Ngf3"],["c5"],["g3"],["Nc6"],["Bg2"],["Be7"],["O-O"],["O-O"]]},
  {"id":"wing-gambit","name":"Wing Gambit","group":"v-wing-gambit","moves":[["e4"],["e6"],["d4"],["d5"],["e5"],["c5"],["b4"]]},
  {"id":"paulsen-attack","name":"Paulsen Attack","group":"v-paulsen-attack","moves":[["e4"],["e6"],["d4"],["d5"],["Nc3"],["Bb4"],["Bd2"],["dxe4"],["Qg4"]]},
  {"id":"reversed-philidor","name":"Reversed Philidor","group":"v-reversed-philidor","moves":[["e4"],["e6"],["d3"],["d5"],["Nd2"],["Nf6"],["Ngf3"],["c5"],["g3"],["Nc6"],["Bg2"],["Be7"],["O-O"],["O-O"],["Re1"]]},
  {"id":"1-e4-e6-2-nc3","name":"1.e4 e6 2.Nc3","group":"v-1-e4-e6-2-nc3","moves":[["e4"],["e6"],["Nc3"]]},
  {"id":"1-e4-e6-2-c4","name":"1.e4 e6 2.c4","group":"v-1-e4-e6-2-c4","moves":[["e4"],["e6"],["c4"]]},
  {"id":"chigorin-variation","name":"Chigorin Variation","group":"v-chigorin-variation","moves":[["e4"],["e6"],["Qe2"]]},
  {"id":"labourdonnais-variation","name":"Labourdonnais Variation","group":"v-labourdonnais-variation","moves":[["e4"],["e6"],["f4"]]}
 ]
};
