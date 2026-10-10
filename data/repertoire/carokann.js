// Caro-Kann — daxaur/tabia (MIT), extended by Veyra Chess
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "carokann",
 "name": "Caro-Kann",
 "color": "b",
 "eco": "B10",
 "oneLiner": "1.e4 c6 — solid as granite: a sound structure, the good bishop out early, no weaknesses.",
 "trunk": "1.e4 c6 2.d4 d5",
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
   "blurb": "Classical development"
  },
  "other": {
   "label": "Other",
   "blurb": "Advance & Panov"
  },
  "v-main": {
   "label": "Main",
   "blurb": ""
  },
  "v-advance-variation": {
   "label": "Advance Variation",
   "blurb": ""
  },
  "v-advance": {
   "label": "Advance",
   "blurb": ""
  },
  "v-exchange-variation": {
   "label": "Exchange Variation",
   "blurb": ""
  },
  "v-panov-botvinnik-attack": {
   "label": "Panov-Botvinnik Attack",
   "blurb": ""
  },
  "v-classical-variation": {
   "label": "Classical Variation",
   "blurb": ""
  },
  "v-karpov-variation": {
   "label": "Karpov Variation",
   "blurb": ""
  },
  "v-bronstein-larsen-variation": {
   "label": "Bronstein-Larsen Variation",
   "blurb": ""
  },
  "v-two-knights-attack": {
   "label": "Two Knights Attack",
   "blurb": ""
  },
  "v-fantasy-variation": {
   "label": "Fantasy Variation",
   "blurb": ""
  },
  "v-exchange": {
   "label": "Exchange",
   "blurb": ""
  },
  "v-panov": {
   "label": "Panov",
   "blurb": ""
  },
  "v-classical": {
   "label": "Classical",
   "blurb": ""
  },
  "v-karpov": {
   "label": "Karpov",
   "blurb": ""
  },
  "v-two-knights": {
   "label": "Two Knights",
   "blurb": ""
  },
  "v-hillbilly-attack": {
   "label": "Hillbilly Attack",
   "blurb": ""
  },
  "v-accelerated-panov": {
   "label": "Accelerated Panov",
   "blurb": ""
  },
  "v-breyer-variation": {
   "label": "Breyer Variation",
   "blurb": ""
  },
  "v-fantasy": {
   "label": "Fantasy",
   "blurb": ""
  },
  "v-gambit-variation": {
   "label": "Gambit Variation",
   "blurb": ""
  },
  "v-edinburgh-variation": {
   "label": "Edinburgh Variation",
   "blurb": ""
  },
  "v-goldman-variation": {
   "label": "Goldman Variation",
   "blurb": ""
  },
  "v-forgacs-variation": {
   "label": "Forgacs Variation",
   "blurb": ""
  },
  "v-rasa-studier": {
   "label": "Rasa-Studier",
   "blurb": ""
  }
 },
 "source": "daxaur/tabia (MIT)",
 "category": "Defences",
 "lines": [
  {"id":"classical-ck","name":"Classical (4…Bf5)","group":"main","star":true,"idea":"Develop the light-squared bishop outside the chain to f5/g6, finish development cleanly, and stand rock-solid.","moves":[["e4"],["c6"],["d4"],["d5"],["Nc3"],["dxe4"],["Nxe4"],["Bf5","4…Bf5 — the good bishop comes out."],["Ng3"],["Bg6"],["h4"],["h6"],["Nf3"],["Nd7","Solid, harmonious development."]]},
  {"id":"advance-ck","name":"Advance (3.e5 Bf5)","group":"other","idea":"Unlike the French, the bishop escapes to f5 before …e6. Develop behind it and chip at d4 with …c5.","moves":[["e4"],["c6"],["d4"],["d5"],["e5","3.e5 — the Advance."],["Bf5"],["Nf3"],["e6"],["Be2"],["Nd7"],["O-O"],["h6","No bad bishop — the Caro point."]]},
  {"id":"panov","name":"Panov–Botvinnik (Exchange c4)","group":"other","idea":"White takes on d5 and plays c4 for an IQP game. Blockade d5, develop actively, and target the isolated pawn.","moves":[["e4"],["c6"],["d4"],["d5"],["exd5"],["cxd5"],["c4","4.c4 — the Panov."],["Nf6"],["Nc3"],["e6"],["Nf3"],["Be7","Blockade and pressure the IQP."]]},
  {"id":"exchange-ck","name":"Exchange (3.exd5)","group":"other","idea":"The quiet Exchange. Get the bishop out to g4, meet Qb3 with …Qd7, and reach a comfortable, symmetrical game with no weaknesses. (≈ =)","moves":[["e4"],["c6"],["d4"],["d5"],["exd5","3.exd5 — the Exchange."],["cxd5"],["Bd3"],["Nc6"],["c3"],["Nf6"],["Bf4"],["Bg4","Pin the knight before …e6."],["Qb3"],["Qd7","Calmly defend b7 — equal and solid."]]},
  {"id":"caro-kann-defense","name":"Caro-Kann Defense","group":"v-main","moves":[["e4"],["c6"]],"idea":"Black prepares ...d5 with a pawn on c6, so the light bishop can develop outside the pawn chain. Safe, sound and good for endgames."},
  {"id":"advance-variation","name":"Advance Variation","group":"v-advance-variation","moves":[["e4"],["c6"],["d4"],["d5"],["e5"]]},
  {"id":"advance-short-variation","name":"Advance, Short Variation","group":"v-advance","moves":[["e4"],["c6"],["d4"],["d5"],["e5"],["Bf5"],["Nf3"],["e6"],["Be2"]]},
  {"id":"exchange-variation","name":"Exchange Variation","group":"v-exchange-variation","moves":[["e4"],["c6"],["d4"],["d5"],["exd5"],["cxd5"]]},
  {"id":"panov-botvinnik-attack","name":"Panov-Botvinnik Attack","group":"v-panov-botvinnik-attack","moves":[["e4"],["c6"],["d4"],["d5"],["exd5"],["cxd5"],["c4"]]},
  {"id":"classical-variation","name":"Classical Variation","group":"v-classical-variation","moves":[["e4"],["c6"],["d4"],["d5"],["Nc3"],["dxe4"],["Nxe4"],["Bf5"]]},
  {"id":"karpov-variation","name":"Karpov Variation","group":"v-karpov-variation","moves":[["e4"],["c6"],["d4"],["d5"],["Nc3"],["dxe4"],["Nxe4"],["Nd7"]]},
  {"id":"bronstein-larsen-variation","name":"Bronstein-Larsen Variation","group":"v-bronstein-larsen-variation","moves":[["e4"],["c6"],["d4"],["d5"],["Nc3"],["dxe4"],["Nxe4"],["Nf6"],["Nxf6+"],["gxf6"]]},
  {"id":"two-knights-attack","name":"Two Knights Attack","group":"v-two-knights-attack","moves":[["e4"],["c6"],["Nc3"],["d5"],["Nf3"]]},
  {"id":"fantasy-variation","name":"Fantasy Variation","group":"v-fantasy-variation","moves":[["e4"],["c6"],["d4"],["d5"],["f3"]]},
  {"id":"advance-line-ending-5-be2-c5-6-be3-nd7","name":"Advance (line ending 5.Be2 c5 6.Be3 Nd7)","group":"v-advance","moves":[["e4"],["c6"],["d4"],["d5"],["e5"],["Bf5"],["Nf3"],["e6"],["Be2"],["c5"],["Be3"],["Nd7"]]},
  {"id":"advance-line-ending-4-nf3-e6-5-be2-ne7","name":"Advance (line ending 4.Nf3 e6 5.Be2 Ne7)","group":"v-advance","moves":[["e4"],["c6"],["d4"],["d5"],["e5"],["Bf5"],["Nf3"],["e6"],["Be2"],["Ne7"]]},
  {"id":"advance-line-ending-6-nge2-c5-7-h4-h5","name":"Advance (line ending 6.Nge2 c5 7.h4 h5)","group":"v-advance","moves":[["e4"],["c6"],["d4"],["d5"],["e5"],["Bf5"],["Nc3"],["e6"],["g4"],["Bg6"],["Nge2"],["c5"],["h4"],["h5"]]},
  {"id":"advance-line-ending-2-d5-3-e5-bf5-4-g4","name":"Advance (line ending 2...d5 3.e5 Bf5 4.g4)","group":"v-advance","moves":[["e4"],["c6"],["d4"],["d5"],["e5"],["Bf5"],["g4"]]},
  {"id":"advance-line-ending-6-be3-cxd4-7-nxd4-nc6","name":"Advance (line ending 6.Be3 cxd4 7.Nxd4 Nc6)","group":"v-advance","moves":[["e4"],["c6"],["d4"],["d5"],["e5"],["Bf5"],["Nf3"],["e6"],["Be2"],["c5"],["Be3"],["cxd4"],["Nxd4"],["Nc6"]]},
  {"id":"advance-3-c5","name":"Advance, 3...c5","group":"v-advance","moves":[["e4"],["c6"],["d4"],["d5"],["e5"],["c5"]]},
  {"id":"advance-3-bf5-4-nf3","name":"Advance, 3...Bf5 4.Nf3","group":"v-advance","moves":[["e4"],["c6"],["d4"],["d5"],["e5"],["Bf5"],["Nf3"]]},
  {"id":"exchange-line-ending-5-c3-nf6-6-bf4-g6","name":"Exchange (line ending 5.c3 Nf6 6.Bf4 g6)","group":"v-exchange","moves":[["e4"],["c6"],["d4"],["d5"],["exd5"],["cxd5"],["Bd3"],["Nc6"],["c3"],["Nf6"],["Bf4"],["g6"]]},
  {"id":"exchange-line-ending-6-nf3-be7-7-cxd5-nxd5","name":"Exchange (line ending 6.Nf3 Be7 7.cxd5 Nxd5)","group":"v-exchange","moves":[["e4"],["c6"],["d4"],["d5"],["exd5"],["cxd5"],["c4"],["Nf6"],["Nc3"],["e6"],["Nf3"],["Be7"],["cxd5"],["Nxd5"]]},
  {"id":"panov-line-ending-4-c4-nf6-5-nc3-g6","name":"Panov (line ending 4.c4 Nf6 5.Nc3 g6)","group":"v-panov","moves":[["e4"],["c6"],["d4"],["d5"],["exd5"],["cxd5"],["c4"],["Nf6"],["Nc3"],["g6"]]},
  {"id":"panov-line-ending-4-c4-nf6-5-nc3-nc6","name":"Panov (line ending 4.c4 Nf6 5.Nc3 Nc6)","group":"v-panov","moves":[["e4"],["c6"],["d4"],["d5"],["exd5"],["cxd5"],["c4"],["Nf6"],["Nc3"],["Nc6"]]},
  {"id":"panov-fianchetto-5-nf3","name":"Panov, Fianchetto, 5.Nf3","group":"v-panov","moves":[["e4"],["c6"],["d4"],["d5"],["exd5"],["cxd5"],["c4"],["Nf6"],["Nc3"],["e6"],["Nf3"],["Bb4"],["cxd5"],["Nxd5"],["Bd2"],["Nc6"]]},
  {"id":"panov-line-ending-7-nxd5-8-bd2-nc6-9-bd3","name":"Panov (line ending 7...Nxd5 8.Bd2 Nc6 9.Bd3)","group":"v-panov","moves":[["e4"],["c6"],["d4"],["d5"],["exd5"],["cxd5"],["c4"],["Nf6"],["Nc3"],["e6"],["Nf3"],["Bb4"],["cxd5"],["Nxd5"],["Bd2"],["Nc6"],["Bd3"]]},
  {"id":"panov-line-ending-4-nf6-5-nc3-nc6-6-bg5","name":"Panov (line ending 4...Nf6 5.Nc3 Nc6 6.Bg5)","group":"v-panov","moves":[["e4"],["c6"],["d4"],["d5"],["exd5"],["cxd5"],["c4"],["Nf6"],["Nc3"],["Nc6"],["Bg5"]]},
  {"id":"panov-5-nf3-bg4","name":"Panov, 5.Nf3 Bg4","group":"v-panov","moves":[["e4"],["c6"],["d4"],["d5"],["exd5"],["cxd5"],["c4"],["Nf6"],["Nc3"],["Nc6"],["Nf3"],["Bg4"]]},
  {"id":"panov-line-ending-7-c5-o-o-8-bd3-b6","name":"Panov (line ending 7.c5 O-O 8.Bd3 b6)","group":"v-panov","moves":[["e4"],["c6"],["d4"],["d5"],["exd5"],["cxd5"],["c4"],["Nf6"],["Nc3"],["e6"],["Nf3"],["Be7"],["c5"],["O-O"],["Bd3"],["b6"]]},
  {"id":"classical-main","name":"Classical, Main","group":"v-classical","moves":[["e4"],["c6"],["d4"],["d5"],["Nc3"],["dxe4"],["Nxe4"],["Bf5"],["Ng3"],["Bg6"],["h4"],["h6"],["Nf3"],["Nd7"],["h5"],["Bh7"],["Bd3"],["Bxd3"],["Qxd3"]]},
  {"id":"classical-line-ending-6-bc4-e6-7-nf3-nd7","name":"Classical (line ending 6.Bc4 e6 7.Nf3 Nd7)","group":"v-classical","moves":[["e4"],["c6"],["d4"],["d5"],["Nc3"],["dxe4"],["Nxe4"],["Bf5"],["Ng3"],["Bg6"],["Bc4"],["e6"],["Nf3"],["Nd7"]]},
  {"id":"classical-line-ending-10-qxd3-e6-11-bf4-qa5","name":"Classical (line ending 10.Qxd3 e6 11.Bf4 Qa5+)","group":"v-classical","moves":[["e4"],["c6"],["d4"],["d5"],["Nc3"],["dxe4"],["Nxe4"],["Bf5"],["Ng3"],["Bg6"],["h4"],["h6"],["Nf3"],["Nd7"],["h5"],["Bh7"],["Bd3"],["Bxd3"],["Qxd3"],["e6"],["Bf4"],["Qa5+"]]},
  {"id":"classical-line-ending-5-bg6-6-nf3-nd7-7-bd3","name":"Classical (line ending 5...Bg6 6.Nf3 Nd7 7.Bd3)","group":"v-classical","moves":[["e4"],["c6"],["d4"],["d5"],["Nc3"],["dxe4"],["Nxe4"],["Bf5"],["Ng3"],["Bg6"],["Nf3"],["Nd7"],["Bd3"]]},
  {"id":"classical-line-ending-11-bf4-e6-12-o-o-o-be7","name":"Classical (line ending 11.Bf4 e6 12.O-O-O Be7)","group":"v-classical","moves":[["e4"],["c6"],["d4"],["d5"],["Nc3"],["dxe4"],["Nxe4"],["Bf5"],["Ng3"],["Bg6"],["h4"],["h6"],["Nf3"],["Nd7"],["h5"],["Bh7"],["Bd3"],["Bxd3"],["Qxd3"],["Ngf6"],["Bf4"],["e6"],["O-O-O"],["Be7"]]},
  {"id":"classical-line-ending-5-gxf6-6-nf3-bf5-7-be2","name":"Classical (line ending 5...gxf6 6.Nf3 Bf5 7.Be2)","group":"v-classical","moves":[["e4"],["c6"],["d4"],["d5"],["Nc3"],["dxe4"],["Nxe4"],["Nf6"],["Nxf6+"],["gxf6"],["Nf3"],["Bf5"],["Be2"]]},
  {"id":"karpov-line-ending-6-nxf6-nxf6-7-bc4-bf5","name":"Karpov (line ending 6.Nxf6+ Nxf6 7.Bc4 Bf5)","group":"v-karpov","moves":[["e4"],["c6"],["d4"],["d5"],["Nc3"],["dxe4"],["Nxe4"],["Nd7"],["Nf3"],["Ngf6"],["Nxf6+"],["Nxf6"],["Bc4"],["Bf5"]]},
  {"id":"karpov-line-ending-8-bd3-h6-9-n5f3-c5","name":"Karpov (line ending 8.Bd3 h6 9.N5f3 c5)","group":"v-karpov","moves":[["e4"],["c6"],["d4"],["d5"],["Nc3"],["dxe4"],["Nxe4"],["Nd7"],["Bc4"],["Ngf6"],["Ng5"],["e6"],["Qe2"],["Nb6"],["Bd3"],["h6"],["N5f3"],["c5"]]},
  {"id":"karpov-line-ending-7-bd6-8-qe2-h6-9-nxf7","name":"Karpov (line ending 7...Bd6 8.Qe2 h6 9.Nxf7)","group":"v-karpov","moves":[["e4"],["c6"],["d4"],["d5"],["Nc3"],["dxe4"],["Nxe4"],["Nd7"],["Ng5"],["Ngf6"],["Bd3"],["e6"],["N1f3"],["Bd6"],["Qe2"],["h6"],["Nxf7"]]},
  {"id":"karpov-main","name":"Karpov, Main","group":"v-karpov","moves":[["e4"],["c6"],["d4"],["d5"],["Nc3"],["dxe4"],["Nxe4"],["Nd7"],["Nf3"],["Ngf6"],["Nxf6+"],["Nxf6"],["Ne5"]]},
  {"id":"two-knights-3-bg4","name":"Two Knights, 3...Bg4","group":"v-two-knights","moves":[["e4"],["c6"],["Nc3"],["d5"],["Nf3"],["Bg4"],["h3"],["Bxf3"],["Qxf3"],["e6"]]},
  {"id":"two-knights-3-dxe4","name":"Two Knights, 3...dxe4","group":"v-two-knights","moves":[["e4"],["c6"],["Nc3"],["d5"],["Nf3"],["dxe4"],["Nxe4"],["Bf5"]]},
  {"id":"two-knights-line-ending-3-nf3-dxe4-4-nxe4-nd7","name":"Two Knights (line ending 3.Nf3 dxe4 4.Nxe4 Nd7)","group":"v-two-knights","moves":[["e4"],["c6"],["Nc3"],["d5"],["Nf3"],["dxe4"],["Nxe4"],["Nd7"]]},
  {"id":"two-knights-main","name":"Two Knights, Main","group":"v-two-knights","moves":[["e4"],["c6"],["Nc3"],["d5"],["Nf3"],["Bg4"]]},
  {"id":"hillbilly-attack","name":"Hillbilly Attack","group":"v-hillbilly-attack","moves":[["e4"],["c6"],["Bc4"]]},
  {"id":"accelerated-panov","name":"Accelerated Panov","group":"v-accelerated-panov","moves":[["e4"],["c6"],["c4"]]},
  {"id":"accelerated-panov-main","name":"Accelerated Panov, Main","group":"v-accelerated-panov","moves":[["e4"],["c6"],["c4"],["d5"],["exd5"],["cxd5"],["cxd5"],["Nf6"],["Nc3"],["Nxd5"]]},
  {"id":"breyer-variation","name":"Breyer Variation","group":"v-breyer-variation","moves":[["e4"],["c6"],["Nc3"],["d5"],["Qf3"]]},
  {"id":"fantasy-line-ending-3-f3-dxe4-4-fxe4-e5","name":"Fantasy (line ending 3.f3 dxe4 4.fxe4 e5)","group":"v-fantasy","moves":[["e4"],["c6"],["d4"],["d5"],["f3"],["dxe4"],["fxe4"],["e5"]]},
  {"id":"fantasy-line-ending-2-d4-d5-3-f3-e6","name":"Fantasy (line ending 2.d4 d5 3.f3 e6)","group":"v-fantasy","moves":[["e4"],["c6"],["d4"],["d5"],["f3"],["e6"]]},
  {"id":"gambit-variation","name":"Gambit Variation","group":"v-gambit-variation","moves":[["e4"],["c6"],["d4"],["d5"],["Nc3"],["dxe4"],["Nxe4"],["Bf5"],["Bc4"]]},
  {"id":"edinburgh-variation","name":"Edinburgh Variation","group":"v-edinburgh-variation","moves":[["e4"],["c6"],["d4"],["d5"],["Nc3"],["Qb6"]]},
  {"id":"goldman-variation","name":"Goldman Variation","group":"v-goldman-variation","moves":[["e4"],["c6"],["d4"],["d5"],["Qf3"]]},
  {"id":"forgacs-variation","name":"Forgacs Variation","group":"v-forgacs-variation","moves":[["e4"],["c6"],["d4"],["d5"],["Nc3"],["dxe4"],["Nxe4"],["Bf5"],["Ng3"],["Bg6"],["Bc4"]]},
  {"id":"rasa-studier","name":"Rasa-Studier","group":"v-rasa-studier","moves":[["e4"],["c6"],["d4"],["d5"],["Nc3"],["dxe4"],["Nxe4"],["Bf5"],["Ng3"],["Bg6"],["Nf3"],["Nd7"],["Bd3"],["e6"],["O-O"],["Ngf6"],["Nh4"]]}
 ]
};
