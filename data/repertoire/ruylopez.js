// Ruy Lopez — daxaur/tabia (MIT), extended by Veyra Chess
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "ruylopez",
 "name": "Ruy Lopez",
 "color": "w",
 "eco": "C60",
 "oneLiner": "1.e4 e5 2.Nf3 Nc6 3.Bb5 — the Spanish: pressure the knight, the centre, and squeeze.",
 "trunk": "1.e4 e5 2.Nf3 Nc6 3.Bb5",
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
  "closed": {
   "label": "Closed · 3…a6",
   "blurb": "The main road"
  },
  "other": {
   "label": "Other defences",
   "blurb": "Berlin, Open, Exchange"
  },
  "v-main": {
   "label": "Main",
   "blurb": ""
  },
  "v-berlin-defense": {
   "label": "Berlin Defense",
   "blurb": ""
  },
  "v-morphy-defense": {
   "label": "Morphy Defense",
   "blurb": ""
  },
  "v-exchange-variation": {
   "label": "Exchange Variation",
   "blurb": ""
  },
  "v-open-variation": {
   "label": "Open Variation",
   "blurb": ""
  },
  "v-closed-variation": {
   "label": "Closed Variation",
   "blurb": ""
  },
  "v-marshall-attack": {
   "label": "Marshall Attack",
   "blurb": ""
  },
  "v-anti-marshall": {
   "label": "Anti-Marshall",
   "blurb": ""
  },
  "v-chigorin-variation": {
   "label": "Chigorin Variation",
   "blurb": ""
  },
  "v-breyer-variation": {
   "label": "Breyer Variation",
   "blurb": ""
  },
  "v-zaitsev-variation": {
   "label": "Zaitsev Variation",
   "blurb": ""
  },
  "v-smyslov-variation": {
   "label": "Smyslov Variation",
   "blurb": ""
  },
  "v-schliemann-defense": {
   "label": "Schliemann Defense",
   "blurb": ""
  },
  "v-classical-defense": {
   "label": "Classical Defense",
   "blurb": ""
  },
  "v-steinitz-defense": {
   "label": "Steinitz Defense",
   "blurb": ""
  },
  "v-bird-s-defense": {
   "label": "Bird's Defense",
   "blurb": ""
  },
  "v-closed": {
   "label": "Closed",
   "blurb": ""
  },
  "v-open": {
   "label": "Open",
   "blurb": ""
  },
  "v-exchange": {
   "label": "Exchange",
   "blurb": ""
  },
  "v-delayed-exchange": {
   "label": "Delayed Exchange",
   "blurb": ""
  },
  "v-berlin": {
   "label": "Berlin",
   "blurb": ""
  },
  "v-steinitz": {
   "label": "Steinitz",
   "blurb": ""
  },
  "v-steinitz-deferred": {
   "label": "Steinitz Deferred",
   "blurb": ""
  },
  "v-cozio-defense": {
   "label": "Cozio Defense",
   "blurb": ""
  },
  "v-cozio": {
   "label": "Cozio",
   "blurb": ""
  },
  "v-classical": {
   "label": "Classical",
   "blurb": ""
  },
  "v-fianchetto-defense": {
   "label": "Fianchetto Defense",
   "blurb": ""
  },
  "v-schliemann": {
   "label": "Schliemann",
   "blurb": ""
  },
  "v-anti-berlin": {
   "label": "Anti-Berlin",
   "blurb": ""
  },
  "v-wormald-attack": {
   "label": "Wormald Attack",
   "blurb": ""
  },
  "v-m-ller-defense": {
   "label": "Møller Defense",
   "blurb": ""
  },
  "v-archangel-variation": {
   "label": "Archangel Variation",
   "blurb": ""
  },
  "v-neo-archangel": {
   "label": "Neo-Archangel",
   "blurb": ""
  },
  "v-marshall": {
   "label": "Marshall",
   "blurb": ""
  }
 },
 "source": "daxaur/tabia (MIT)",
 "category": "Classical",
 "lines": [
  {"id":"closed-main","name":"Closed Main (Morphy)","group":"closed","star":true,"idea":"The classical Spanish: retreat the bishop to b3, brace the centre with c3/h3, and build a kingside bind.","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5","3.Bb5 — the Spanish bishop."],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["d6"],["c3"],["O-O"],["h3","9.h3 — stop …Bg4; prepare d4."]]},
  {"id":"exchange","name":"Exchange (4.Bxc6)","group":"closed","idea":"Trade on c6 and play the better pawn structure: four vs three on the kingside in the endgame.","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Bxc6","4.Bxc6 — the Exchange."],["dxc6"],["O-O"],["f6"],["d4"],["exd4"],["Nxd4"],["c5"],["Nb3"],["Qxd1"],["Rxd1","9.Rxd1 — a healthy structural edge."]]},
  {"id":"berlin","name":"Berlin Defence (3…Nf6)","group":"other","idea":"The Berlin Wall. Steer into the famous queenless endgame where your structure and the bishop pair give a nagging pull.","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Nf6","3…Nf6 — the Berlin."],["O-O"],["Nxe4"],["d4"],["Nd6"],["Bxc6"],["dxc6"],["dxe5"],["Nf5"],["Qxd8+"],["Kxd8"],["Nc3","9.Nc3 — the Berlin endgame."]]},
  {"id":"open","name":"Open Spanish (5…Nxe4)","group":"other","idea":"Black grabs e4 for activity. Hit back with c3 and a timely d4-build; the centre and bishop tell.","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Nxe4","5…Nxe4 — the Open."],["d4"],["b5"],["Bb3"],["d5"],["dxe5"],["Be6"],["c3","9.c3 — solid; the e5-pawn cramps Black."]]},
  {"id":"ruy-lopez","name":"Ruy Lopez","group":"v-main","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"]],"idea":"The Spanish is the classic main road: pin the defender of e5, castle, and build up the centre step by step. Slow squeeze, rich in plans."},
  {"id":"berlin-defense","name":"Berlin Defense","group":"v-berlin-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Nf6"]]},
  {"id":"berlin-defense-rio-gambit","name":"Berlin Defense, Rio Gambit","group":"v-berlin-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Nf6"],["O-O"],["Nxe4"],["d4"],["Nd6"],["Bxc6"],["dxc6"],["dxe5"],["Nf5"]]},
  {"id":"berlin-defense-endgame","name":"Berlin Defense, Endgame","group":"v-berlin-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Nf6"],["O-O"],["Nxe4"],["d4"],["Nd6"],["Bxc6"],["dxc6"],["dxe5"],["Nf5"],["Qxd8+"],["Kxd8"]]},
  {"id":"morphy-defense","name":"Morphy Defense","group":"v-morphy-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"]]},
  {"id":"exchange-variation","name":"Exchange Variation","group":"v-exchange-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Bxc6"]]},
  {"id":"open-variation","name":"Open Variation","group":"v-open-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Nxe4"]]},
  {"id":"closed-variation","name":"Closed Variation","group":"v-closed-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["d6"],["c3"],["O-O"]]},
  {"id":"marshall-attack","name":"Marshall Attack","group":"v-marshall-attack","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["O-O"],["c3"],["d5"]]},
  {"id":"anti-marshall-8-a4","name":"Anti-Marshall, 8.a4","group":"v-anti-marshall","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["O-O"],["a4"]]},
  {"id":"chigorin-variation","name":"Chigorin Variation","group":"v-chigorin-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["d6"],["c3"],["O-O"],["h3"],["Na5"],["Bc2"],["c5"],["d4"],["Qc7"]]},
  {"id":"breyer-variation","name":"Breyer Variation","group":"v-breyer-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["d6"],["c3"],["O-O"],["h3"],["Nb8"]]},
  {"id":"zaitsev-variation","name":"Zaitsev Variation","group":"v-zaitsev-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["d6"],["c3"],["O-O"],["h3"],["Bb7"],["d4"],["Re8"]]},
  {"id":"smyslov-variation","name":"Smyslov Variation","group":"v-smyslov-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["d6"],["c3"],["O-O"],["h3"],["h6"]]},
  {"id":"schliemann-defense","name":"Schliemann Defense","group":"v-schliemann-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["f5"]]},
  {"id":"classical-defense","name":"Classical Defense","group":"v-classical-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Bc5"]]},
  {"id":"steinitz-defense","name":"Steinitz Defense","group":"v-steinitz-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["d6"]]},
  {"id":"bird-s-defense","name":"Bird's Defense","group":"v-bird-s-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Nd4"]]},
  {"id":"closed-line-ending-8-c3-o-o-9-h3-nd7","name":"Closed (line ending 8.c3 O-O 9.h3 Nd7)","group":"v-closed","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["d6"],["c3"],["O-O"],["h3"],["Nd7"]]},
  {"id":"closed-line-ending-8-c3-o-o-9-h3-bd7","name":"Closed (line ending 8.c3 O-O 9.h3 Bd7)","group":"v-closed","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["d6"],["c3"],["O-O"],["h3"],["Bd7"]]},
  {"id":"closed-line-ending-12-nbd2-cxd4-13-cxd4-nc6","name":"Closed (line ending 12.Nbd2 cxd4 13.cxd4 Nc6)","group":"v-closed","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["d6"],["c3"],["O-O"],["h3"],["Na5"],["Bc2"],["c5"],["d4"],["Qc7"],["Nbd2"],["cxd4"],["cxd4"],["Nc6"]]},
  {"id":"open-line-ending-11-bc2-bf5-12-nb3-bg4","name":"Open (line ending 11.Bc2 Bf5 12.Nb3 Bg4)","group":"v-open","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Nxe4"],["d4"],["b5"],["Bb3"],["d5"],["dxe5"],["Be6"],["c3"],["Bc5"],["Nbd2"],["O-O"],["Bc2"],["Bf5"],["Nb3"],["Bg4"]]},
  {"id":"open-line-ending-7-bb3-d5-8-dxe5-be6","name":"Open (line ending 7.Bb3 d5 8.dxe5 Be6)","group":"v-open","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Nxe4"],["d4"],["b5"],["Bb3"],["d5"],["dxe5"],["Be6"]]},
  {"id":"open-line-ending-7-d5-8-dxe5-be6-9-qe2","name":"Open (line ending 7...d5 8.dxe5 Be6 9.Qe2)","group":"v-open","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Nxe4"],["d4"],["b5"],["Bb3"],["d5"],["dxe5"],["Be6"],["Qe2"]]},
  {"id":"open-berlin-type-6-d4","name":"Open, Berlin-type 6.d4","group":"v-open","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Nxe4"],["d4"],["b5"],["Bb3"],["d5"]]},
  {"id":"open-6-qe2","name":"Open, 6.Qe2","group":"v-open","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Nxe4"],["Qe2"]]},
  {"id":"open-line-ending-7-d5-8-dxe5-be6-9-nbd2","name":"Open (line ending 7...d5 8.dxe5 Be6 9.Nbd2)","group":"v-open","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Nxe4"],["d4"],["b5"],["Bb3"],["d5"],["dxe5"],["Be6"],["Nbd2"]]},
  {"id":"exchange-line-ending-3-a6-4-bxc6-dxc6-5-o-o","name":"Exchange (line ending 3...a6 4.Bxc6 dxc6 5.O-O)","group":"v-exchange","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Bxc6"],["dxc6"],["O-O"]]},
  {"id":"exchange-line-ending-4-bxc6-dxc6-5-nxe5-qd4","name":"Exchange (line ending 4.Bxc6 dxc6 5.Nxe5 Qd4)","group":"v-exchange","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Bxc6"],["dxc6"],["Nxe5"],["Qd4"]]},
  {"id":"exchange-line-ending-5-exd4-6-qxd4-qxd4-7-nxd4","name":"Exchange (line ending 5...exd4 6.Qxd4 Qxd4 7.Nxd4)","group":"v-exchange","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Bxc6"],["dxc6"],["d4"],["exd4"],["Qxd4"],["Qxd4"],["Nxd4"]]},
  {"id":"exchange-5-nc3","name":"Exchange, 5.Nc3","group":"v-exchange","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Bxc6"],["dxc6"],["Nc3"]]},
  {"id":"exchange-line-ending-5-o-o-bg4-6-h3-h5","name":"Exchange (line ending 5.O-O Bg4 6.h3 h5)","group":"v-exchange","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Bxc6"],["dxc6"],["O-O"],["Bg4"],["h3"],["h5"]]},
  {"id":"delayed-exchange","name":"Delayed Exchange","group":"v-delayed-exchange","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["Bxc6"],["dxc6"]]},
  {"id":"berlin-line-ending-2-nc6-3-bb5-nf6-4-d3","name":"Berlin (line ending 2...Nc6 3.Bb5 Nf6 4.d3)","group":"v-berlin","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Nf6"],["d3"]]},
  {"id":"berlin-line-ending-3-bb5-nf6-4-d3-ne7","name":"Berlin (line ending 3.Bb5 Nf6 4.d3 Ne7)","group":"v-berlin","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Nf6"],["d3"],["Ne7"]]},
  {"id":"berlin-berlin-wall-5-nxe4","name":"Berlin, Berlin Wall, 5...Nxe4","group":"v-berlin","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Nf6"],["O-O"],["Nxe4"]]},
  {"id":"berlin-4-d3","name":"Berlin, 4.d3","group":"v-berlin","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Nf6"],["d3"],["Bc5"]]},
  {"id":"berlin-4-nc3","name":"Berlin, 4.Nc3","group":"v-berlin","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Nf6"],["Nc3"]]},
  {"id":"berlin-line-ending-3-nf6-4-o-o-nxe4-5-re1","name":"Berlin (line ending 3...Nf6 4.O-O Nxe4 5.Re1)","group":"v-berlin","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Nf6"],["O-O"],["Nxe4"],["Re1"]]},
  {"id":"steinitz-line-ending-3-bb5-a6-4-ba4-d6","name":"Steinitz (line ending 3.Bb5 a6 4.Ba4 d6)","group":"v-steinitz","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["d6"]]},
  {"id":"steinitz-deferred","name":"Steinitz Deferred","group":"v-steinitz-deferred","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["d6"],["c3"]]},
  {"id":"steinitz-deferred-line-ending-5-c3-bd7-6-d4-nge7","name":"Steinitz Deferred (line ending 5.c3 Bd7 6.d4 Nge7)","group":"v-steinitz-deferred","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["d6"],["c3"],["Bd7"],["d4"],["Nge7"]]},
  {"id":"bird-s-defense-main","name":"Bird's Defense, Main","group":"v-bird-s-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Nd4"],["Nxd4"],["exd4"],["O-O"],["c6"]]},
  {"id":"bird-s-defense-line-ending-4-nxd4-exd4-5-o-o-bc5","name":"Bird's Defense (line ending 4.Nxd4 exd4 5.O-O Bc5)","group":"v-bird-s-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Nd4"],["Nxd4"],["exd4"],["O-O"],["Bc5"]]},
  {"id":"cozio-defense","name":"Cozio Defense","group":"v-cozio-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Nge7"]]},
  {"id":"cozio-line-ending-3-bb5-nge7-4-c3-g6","name":"Cozio (line ending 3.Bb5 Nge7 4.c3 g6)","group":"v-cozio","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Nge7"],["c3"],["g6"]]},
  {"id":"classical-line-ending-3-bb5-bc5-4-c3-f5","name":"Classical (line ending 3.Bb5 Bc5 4.c3 f5)","group":"v-classical","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Bc5"],["c3"],["f5"]]},
  {"id":"classical-4-c3","name":"Classical, 4.c3","group":"v-classical","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Bc5"],["c3"],["Nf6"]]},
  {"id":"classical-4-o-o","name":"Classical, 4.O-O","group":"v-classical","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Bc5"],["O-O"],["Nd4"]]},
  {"id":"classical-4-o-o-nge7","name":"Classical, 4.O-O Nge7","group":"v-classical","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Bc5"],["O-O"],["Nge7"]]},
  {"id":"fianchetto-defense","name":"Fianchetto Defense","group":"v-fianchetto-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["g6"]]},
  {"id":"schliemann-line-ending-4-d4-fxe4-5-nxe5-qg5","name":"Schliemann (line ending 4.d4 fxe4 5.Nxe5 Qg5)","group":"v-schliemann","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["f5"],["d4"],["fxe4"],["Nxe5"],["Qg5"]]},
  {"id":"schliemann-line-ending-4-nc3-fxe4-5-nxe4-nf6","name":"Schliemann (line ending 4.Nc3 fxe4 5.Nxe4 Nf6)","group":"v-schliemann","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["f5"],["Nc3"],["fxe4"],["Nxe4"],["Nf6"]]},
  {"id":"schliemann-line-ending-3-bb5-f5-4-exf5-e4","name":"Schliemann (line ending 3.Bb5 f5 4.exf5 e4)","group":"v-schliemann","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["f5"],["exf5"],["e4"]]},
  {"id":"schliemann-line-ending-6-nxe5-dxe4-7-nxc6-qg5","name":"Schliemann (line ending 6.Nxe5 dxe4 7.Nxc6 Qg5)","group":"v-schliemann","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["f5"],["Nc3"],["fxe4"],["Nxe4"],["d5"],["Nxe5"],["dxe4"],["Nxc6"],["Qg5"]]},
  {"id":"anti-berlin-4-d3","name":"Anti-Berlin, 4.d3","group":"v-anti-berlin","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Nf6"],["d3"],["d6"]]},
  {"id":"wormald-attack","name":"Wormald Attack","group":"v-wormald-attack","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["Qe2"]]},
  {"id":"m-ller-defense","name":"Møller Defense","group":"v-m-ller-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Bc5"]]},
  {"id":"archangel-variation","name":"Archangel Variation","group":"v-archangel-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["b5"],["Bb3"],["Bc5"]]},
  {"id":"neo-archangel","name":"Neo-Archangel","group":"v-neo-archangel","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["b5"],["Bb3"],["Bb7"]]},
  {"id":"anti-marshall-line-ending-6-b5-7-bb3-o-o-8-d4","name":"Anti-Marshall (line ending 6...b5 7.Bb3 O-O 8.d4)","group":"v-anti-marshall","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["O-O"],["d4"]]},
  {"id":"marshall-main","name":"Marshall, Main","group":"v-marshall","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["O-O"],["c3"],["d5"],["exd5"],["Nxd5"],["Nxe5"],["Nxe5"],["Rxe5"],["c6"]]},
  {"id":"marshall-line-ending-12-d3-bd6-13-re1-bf5","name":"Marshall (line ending 12.d3 Bd6 13.Re1 Bf5)","group":"v-marshall","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["O-O"],["c3"],["d5"],["exd5"],["Nxd5"],["Nxe5"],["Nxe5"],["Rxe5"],["c6"],["d3"],["Bd6"],["Re1"],["Bf5"]]},
  {"id":"marshall-line-ending-12-d3-bd6-13-re1-qh4","name":"Marshall (line ending 12.d3 Bd6 13.Re1 Qh4)","group":"v-marshall","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["O-O"],["c3"],["d5"],["exd5"],["Nxd5"],["Nxe5"],["Nxe5"],["Rxe5"],["c6"],["d3"],["Bd6"],["Re1"],["Qh4"]]},
  {"id":"marshall-line-ending-7-o-o-8-c3-d5-9-d4","name":"Marshall (line ending 7...O-O 8.c3 d5 9.d4)","group":"v-marshall","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["O-O"],["c3"],["d5"],["d4"]]},
  {"id":"breyer-variation-2","name":"Breyer Variation","group":"v-breyer-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["d6"],["c3"],["O-O"],["h3"],["Nb8"],["d4"],["Nbd7"]]},
  {"id":"chigorin-variation-2","name":"Chigorin Variation","group":"v-chigorin-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["d6"],["c3"],["O-O"],["h3"],["Na5"],["Bc2"],["c5"],["d4"],["Qc7"],["Nbd2"],["cxd4"],["cxd4"],["Nc6"],["Nb3"],["a5"]]},
  {"id":"zaitsev-variation-2","name":"Zaitsev Variation","group":"v-zaitsev-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["d6"],["c3"],["O-O"],["h3"],["Bb7"],["d4"],["Re8"],["Nbd2"],["Bf8"],["a4"],["h6"],["Bc2"],["exd4"],["cxd4"],["Nb4"],["Bb1"],["c5"],["d5"],["Nd7"],["Ra3"],["f5"]]},
  {"id":"berlin-defense-nyholm-attack","name":"Berlin Defense, Nyholm Attack","group":"v-berlin-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Nf6"],["d4"],["exd4"],["O-O"]]},
  {"id":"berlin-defense-winawer-attack","name":"Berlin Defense, Winawer Attack","group":"v-berlin-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Nf6"],["O-O"],["Nxe4"],["d4"],["Be7"],["Qe2"],["Nd6"],["Bxc6"],["bxc6"],["dxe5"],["Nb7"],["Nd4"]]},
  {"id":"berlin-defense-cordel-variation","name":"Berlin Defense, Cordel Variation","group":"v-berlin-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Nf6"],["O-O"],["Nxe4"],["d4"],["Be7"],["Qe2"],["Nd6"],["Bxc6"],["bxc6"],["dxe5"],["Nf5"]]},
  {"id":"berlin-defense-l-hermet-variation","name":"Berlin Defense, l'Hermet Variation","group":"v-berlin-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Nf6"],["O-O"],["Nxe4"],["d4"],["Nd6"]]},
  {"id":"berlin-defense-hedgehog-variation","name":"Berlin Defense, Hedgehog Variation","group":"v-berlin-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Nf6"],["O-O"],["d6"],["d4"],["Bd7"],["Nc3"],["Be7"]]},
  {"id":"berlin-defense-zukertort-variation","name":"Berlin Defense, Zukertort Variation","group":"v-berlin-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Nf6"],["O-O"],["Nxe4"],["d4"],["Be7"],["Qe2"],["Nd6"],["Bxc6"],["bxc6"],["dxe5"],["Nb7"],["c4"]]},
  {"id":"berlin-defense-pillsbury-variation","name":"Berlin Defense, Pillsbury Variation","group":"v-berlin-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Nf6"],["O-O"],["Nxe4"],["d4"],["Be7"],["Qe2"],["Nd6"],["Bxc6"],["bxc6"],["dxe5"],["Nb7"],["b3"]]},
  {"id":"berlin-defense-trifunovic-variation","name":"Berlin Defense, Trifunovic Variation","group":"v-berlin-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Nf6"],["O-O"],["Nxe4"],["d4"],["Be7"],["Qe2"],["d5"]]},
  {"id":"berlin-defense-rio-de-janeiro-variation","name":"Berlin Defense, Rio de Janeiro Variation","group":"v-berlin-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Nf6"],["O-O"],["Nxe4"],["d4"],["Be7"]]},
  {"id":"berlin-defense-closed-showalter-variation","name":"Berlin Defense, Closed Showalter Variation","group":"v-berlin-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Nf6"],["O-O"],["d6"],["d4"],["Bd7"],["Nc3"],["Be7"],["Bxc6"]]},
  {"id":"berlin-defense-berlin-wall","name":"Berlin Defense, Berlin Wall","group":"v-berlin-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Nf6"],["O-O"],["Nxe4"],["d4"],["Nd6"],["Bxc6"],["dxc6"],["dxe5"],["Nf5"],["Qxd8+"],["Kxd8"],["Nc3"],["Bd7"]]},
  {"id":"berlin-defense-l-hermet-variation-westerinen-line","name":"Berlin Defense, l'Hermet Variation, Westerinen Line","group":"v-berlin-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["Nf6"],["O-O"],["Nxe4"],["d4"],["Nd6"],["Bxc6"],["dxc6"],["dxe5"],["Ne4"]]},
  {"id":"steinitz-defense-center-gambit","name":"Steinitz Defense, Center Gambit","group":"v-steinitz-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["d6"],["d4"],["exd4"],["O-O"]]},
  {"id":"steinitz-defense-nimzowitsch-attack","name":"Steinitz Defense, Nimzowitsch Attack","group":"v-steinitz-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["d6"],["d4"],["Bd7"],["Nc3"],["Nf6"],["Bxc6"]]},
  {"id":"steinitz-defense-semi-duras-variation","name":"Steinitz Defense, Semi-Duras Variation","group":"v-steinitz-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["d6"],["d4"],["Bd7"],["c4"]]},
  {"id":"morphy-defense-steinitz-deferred","name":"Morphy Defense, Steinitz Deferred","group":"v-morphy-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["d6"]]},
  {"id":"morphy-defense-schliemann-defense-deferred","name":"Morphy Defense, Schliemann Defense Deferred","group":"v-morphy-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["f5"]]},
  {"id":"morphy-defense-schliemann-defense-deferred-jaenisch-gambit-deferred","name":"Morphy Defense, Schliemann Defense Deferred, Jaenisch Gambit Deferred","group":"v-morphy-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["f5"],["exf5"]]},
  {"id":"schliemann-defense-kostic-defense","name":"Schliemann Defense, Kostić Defense","group":"v-schliemann-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["f5"],["Nc3"],["fxe4"],["Nxe4"],["Be7"]]},
  {"id":"schliemann-defense-mohring-variation","name":"Schliemann Defense, Möhring Variation","group":"v-schliemann-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["f5"],["Nc3"],["fxe4"],["Nxe4"],["d5"],["Nxe5"],["dxe4"],["Nxc6"],["Qd5"]]},
  {"id":"schliemann-defense-schonemann-attack","name":"Schliemann Defense, Schönemann Attack","group":"v-schliemann-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["f5"],["d4"]]},
  {"id":"schliemann-defense-exchange-variation","name":"Schliemann Defense, Exchange Variation","group":"v-schliemann-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["f5"],["Bxc6"]]},
  {"id":"schliemann-defense-dyckhoff-variation","name":"Schliemann Defense, Dyckhoff Variation","group":"v-schliemann-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["f5"],["Nc3"]]},
  {"id":"schliemann-defense-jaenisch-gambit-accepted","name":"Schliemann Defense, Jaenisch Gambit Accepted","group":"v-schliemann-defense","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["f5"],["exf5"]]},
  {"id":"closed","name":"Closed","group":"v-closed","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"]]},
  {"id":"closed-breyer","name":"Closed, Breyer","group":"v-closed","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["d6"],["c3"],["O-O"],["h3"],["Nb8"],["d4"]]},
  {"id":"closed-rosen-attack","name":"Closed, Rosen Attack","group":"v-closed","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["d6"],["d4"]]},
  {"id":"closed-flohr-system","name":"Closed, Flohr System","group":"v-closed","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["d6"],["c3"],["O-O"],["h3"],["Bb7"]]},
  {"id":"closed-center-attack","name":"Closed, Center Attack","group":"v-closed","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["d4"]]},
  {"id":"closed-morphy-attack","name":"Closed, Morphy Attack","group":"v-closed","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Nc3"]]},
  {"id":"closed-keres-defense","name":"Closed, Keres Defense","group":"v-closed","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["d6"],["c3"],["O-O"],["h3"],["Na5"],["Bc2"],["c5"],["d4"],["Nd7"]]},
  {"id":"closed-zaitsev-system","name":"Closed, Zaitsev System","group":"v-closed","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["d6"],["c3"],["O-O"],["h3"],["Re8"]]},
  {"id":"closed-alekhine-gambit","name":"Closed, Alekhine Gambit","group":"v-closed","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["d6"],["c3"],["Na5"],["Bc2"],["c5"],["d4"],["Qc7"],["Nbd2"],["O-O"],["Nf1"],["Bg4"],["Ne3"],["Bxf3"],["Qxf3"]]},
  {"id":"closed-yates-variation","name":"Closed, Yates Variation","group":"v-closed","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["d6"],["c3"],["O-O"],["d4"]]},
  {"id":"closed-delayed-exchange","name":"Closed, Delayed Exchange","group":"v-closed","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Bxc6"]]},
  {"id":"closed-chigorin-defense","name":"Closed, Chigorin Defense","group":"v-closed","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["d6"],["c3"],["O-O"],["h3"],["Na5"]]},
  {"id":"closed-lutikov-variation","name":"Closed, Lutikov Variation","group":"v-closed","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["d6"],["c3"],["O-O"],["Bc2"]]},
  {"id":"closed-kholmov-variation","name":"Closed, Kholmov Variation","group":"v-closed","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["d6"],["c3"],["O-O"],["h3"],["Be6"]]},
  {"id":"closed-rossolimo-defense","name":"Closed, Rossolimo Defense","group":"v-closed","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["d6"],["c3"],["O-O"],["h3"],["Na5"],["Bc2"],["c6"],["d4"],["Qc7"]]},
  {"id":"closed-trajkovic-counterattack","name":"Closed, Trajkovic Counterattack","group":"v-closed","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["Bb7"]]},
  {"id":"open-variation-motzko-attack","name":"Open Variation, Motzko Attack","group":"v-open-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Nxe4"],["d4"],["b5"],["Bb3"],["d5"],["dxe5"],["Be6"],["c3"],["Bc5"],["Qd3"]]},
  {"id":"open-variation-tarrasch-trap","name":"Open Variation, Tarrasch Trap","group":"v-open-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Nxe4"],["d4"],["b5"],["Bb3"],["d5"],["dxe5"],["Be6"],["c3"],["Be7"],["Re1"],["O-O"],["Nd4"],["Qd7"],["Nxe6"],["fxe6"],["Rxe4"]]},
  {"id":"open-variation-friess-attack","name":"Open Variation, Friess Attack","group":"v-open-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Nxe4"],["d4"],["b5"],["Nxe5"]]},
  {"id":"open-variation-karpov-gambit","name":"Open Variation, Karpov Gambit","group":"v-open-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Nxe4"],["d4"],["b5"],["Bb3"],["d5"],["dxe5"],["Be6"],["Nbd2"],["Nc5"],["c3"],["d4"],["Ng5"]]},
  {"id":"open-variation-riga-variation","name":"Open Variation, Riga Variation","group":"v-open-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Nxe4"],["d4"],["exd4"]]},
  {"id":"open-variation-harksen-gambit","name":"Open Variation, Harksen Gambit","group":"v-open-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Nxe4"],["d4"],["b5"],["Bb3"],["d5"],["c4"]]},
  {"id":"open-variation-berger-variation","name":"Open Variation, Berger Variation","group":"v-open-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Nxe4"],["d4"],["b5"],["Bb3"],["d5"],["a4"],["Nxd4"],["Nxd4"],["exd4"],["Nc3"]]},
  {"id":"open-variation-knorre-variation","name":"Open Variation, Knorre Variation","group":"v-open-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Nxe4"],["Nc3"]]},
  {"id":"open-variation-malkin-variation","name":"Open Variation, Malkin Variation","group":"v-open-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Nxe4"],["d4"],["b5"],["Bb3"],["d5"],["dxe5"],["Be6"],["c3"],["Be7"],["Nbd2"],["O-O"],["Qe2"]]},
  {"id":"open-variation-skipworth-gambit","name":"Open Variation, Skipworth Gambit","group":"v-open-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Nxe4"],["Re1"],["d5"]]},
  {"id":"open-variation-richter-variation","name":"Open Variation, Richter Variation","group":"v-open-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Nxe4"],["d4"],["b5"],["d5"]]},
  {"id":"open-variation-classical-defense","name":"Open Variation, Classical Defense","group":"v-open-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Nxe4"],["d4"],["b5"],["Bb3"],["d5"],["dxe5"],["Be6"],["c3"],["Be7"]]},
  {"id":"open-variation-breslau-variation","name":"Open Variation, Breslau Variation","group":"v-open-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Nxe4"],["d4"],["b5"],["Bb3"],["d5"],["dxe5"],["Be6"],["c3"],["Be7"],["Re1"],["O-O"],["Nd4"],["Nxe5"]]},
  {"id":"open-variation-dilworth-variation","name":"Open Variation, Dilworth Variation","group":"v-open-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Nxe4"],["d4"],["b5"],["Bb3"],["d5"],["dxe5"],["Be6"],["c3"],["Bc5"],["Nbd2"],["O-O"],["Bc2"],["Nxf2"]]},
  {"id":"open-variation-schlechter-defense","name":"Open Variation, Schlechter Defense","group":"v-open-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Nxe4"],["d4"],["b5"],["Bb3"],["d5"],["a4"],["Nxd4"]]},
  {"id":"open-variation-italian-variation","name":"Open Variation, Italian Variation","group":"v-open-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Nxe4"],["d4"],["b5"],["Bb3"],["d5"],["dxe5"],["Be6"],["c3"],["Bc5"]]},
  {"id":"open-variation-zukertort-variation","name":"Open Variation, Zukertort Variation","group":"v-open-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Nxe4"],["d4"],["b5"],["Bb3"],["d5"],["dxe5"],["Ne7"]]},
  {"id":"open-variation-st-petersburg-variation","name":"Open Variation, St. Petersburg Variation","group":"v-open-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Nxe4"],["d4"],["b5"],["Bb3"],["d5"],["dxe5"],["Be6"],["c3"],["Bc5"],["Nbd2"]]},
  {"id":"open-variation-classical-defense-main-line","name":"Open Variation, Classical Defense, Main Line","group":"v-open-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Nxe4"],["d4"],["Be7"],["Re1"],["b5"],["Bb3"],["d5"],["dxe5"],["Be6"],["c3"]]},
  {"id":"open-variation-motzko-attack-nenarokov-variation","name":"Open Variation, Motzko Attack, Nenarokov Variation","group":"v-open-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Nxe4"],["d4"],["b5"],["Bb3"],["d5"],["dxe5"],["Be6"],["c3"],["Bc5"],["Qd3"],["Ne7"]]},
  {"id":"open-variation-berlin-variation","name":"Open Variation, Berlin Variation","group":"v-open-variation","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Nxe4"],["d4"],["b5"],["Bb3"],["d5"],["dxe5"],["Be6"],["c3"],["Nc5"]]},
  {"id":"marshall-attack-main-line","name":"Marshall Attack, Main Line","group":"v-marshall-attack","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["O-O"],["c3"],["d5"],["exd5"],["Nxd5"],["Nxe5"],["Nxe5"],["Rxe5"],["c6"],["d4"]]},
  {"id":"marshall-attack-re3-variation","name":"Marshall Attack, Re3 Variation","group":"v-marshall-attack","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["O-O"],["c3"],["d5"],["exd5"],["Nxd5"],["Nxe5"],["Nxe5"],["Rxe5"],["c6"],["Bxd5"],["cxd5"],["d4"],["Bd6"],["Re3"]]},
  {"id":"marshall-attack-modern-main-line","name":"Marshall Attack, Modern Main Line","group":"v-marshall-attack","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["O-O"],["c3"],["d5"],["exd5"],["Nxd5"],["Nxe5"],["Nxe5"],["Rxe5"],["c6"],["d4"],["Bd6"],["Re1"],["Qh4"],["g3"],["Qh3"]]},
  {"id":"marshall-attack-steiner-variation","name":"Marshall Attack, Steiner Variation","group":"v-marshall-attack","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["O-O"],["c3"],["d5"],["exd5"],["e4"]]},
  {"id":"marshall-attack-original-marshall-attack","name":"Marshall Attack, Original Marshall Attack","group":"v-marshall-attack","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["O-O"],["c3"],["d5"],["exd5"],["Nxd5"],["Nxe5"],["Nxe5"],["Rxe5"],["Nf6"]]},
  {"id":"marshall-attack-main-line-spassky-variation","name":"Marshall Attack, Main Line, Spassky Variation","group":"v-marshall-attack","moves":[["e4"],["e5"],["Nf3"],["Nc6"],["Bb5"],["a6"],["Ba4"],["Nf6"],["O-O"],["Be7"],["Re1"],["b5"],["Bb3"],["O-O"],["c3"],["d5"],["exd5"],["Nxd5"],["Nxe5"],["Nxe5"],["Rxe5"],["c6"],["d4"],["Bd6"],["Re1"],["Qh4"],["g3"],["Qh3"],["Be3"],["Bg4"],["Qd3"],["Rae8"],["Nd2"],["Re6"],["a4"],["Qh5"]]}
 ]
};
