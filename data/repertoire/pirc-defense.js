// Pirc Defense — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "pirc-defense",
 "name": "Pirc Defense",
 "color": "b",
 "oneLiner": "1.e4 d6 2.d4 Nf6 3.Nc3 g6 — let White build a centre, then attack it.",
 "trunk": "1.e4 d6 2.d4 Nf6 3.Nc3",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "austrian-attack": {
   "label": "Austrian Attack",
   "blurb": ""
  },
  "classical-variation": {
   "label": "Classical Variation",
   "blurb": ""
  },
  "150-attack": {
   "label": "150 Attack",
   "blurb": ""
  },
  "austrian": {
   "label": "Austrian",
   "blurb": ""
  },
  "classical": {
   "label": "Classical",
   "blurb": ""
  },
  "byrne-variation": {
   "label": "Byrne Variation",
   "blurb": ""
  },
  "sveshnikov-system": {
   "label": "Sveshnikov System",
   "blurb": ""
  },
  "bayonet-attack": {
   "label": "Bayonet Attack",
   "blurb": ""
  },
  "quiet-system": {
   "label": "Quiet System",
   "blurb": ""
  },
  "kholmov-system": {
   "label": "Kholmov System",
   "blurb": ""
  },
  "czech-defense": {
   "label": "Czech Defense",
   "blurb": ""
  },
  "ufimtsev-pytel": {
   "label": "Ufimtsev-Pytel",
   "blurb": ""
  },
  "roscher-gambit": {
   "label": "Roscher Gambit",
   "blurb": ""
  },
  "pytel": {
   "label": "Pytel",
   "blurb": ""
  },
  "lion-variation": {
   "label": "Lion Variation",
   "blurb": ""
  },
  "chinese-variation": {
   "label": "Chinese Variation",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Defences",
 "lines": [
  {"id":"pirc-defense","name":"Pirc Defense","group":"main","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"]],"star":true,"idea":"Black fianchettos the bishop and strikes at the centre later with ...c5 or ...e5. A flexible, hypermodern defence."},
  {"id":"austrian-attack","name":"Austrian Attack","group":"austrian-attack","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["f4"]],"star":true},
  {"id":"classical-variation","name":"Classical Variation","group":"classical-variation","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["Nf3"]],"star":true},
  {"id":"150-attack","name":"150 Attack","group":"150-attack","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["Be3"]],"star":true},
  {"id":"austrian-attack-main","name":"Austrian Attack, Main","group":"austrian-attack","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["f4"],["Bg7"],["Nf3"],["O-O"],["Bd3"],["Na6"]]},
  {"id":"austrian-line-ending-4-f4-bg7-5-nf3-c5","name":"Austrian (line ending 4.f4 Bg7 5.Nf3 c5)","group":"austrian","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["f4"],["Bg7"],["Nf3"],["c5"]]},
  {"id":"austrian-6-e5","name":"Austrian, 6.e5","group":"austrian","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["f4"],["Bg7"],["e5"]],"star":true},
  {"id":"austrian-line-ending-6-e5-dxe5-7-fxe5-ng4","name":"Austrian (line ending 6.e5 dxe5 7.fxe5 Ng4)","group":"austrian","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["f4"],["Bg7"],["Nf3"],["O-O"],["e5"],["dxe5"],["fxe5"],["Ng4"]]},
  {"id":"classical-main","name":"Classical, Main","group":"classical","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["Nf3"],["Bg7"],["Be2"],["O-O"],["O-O"],["c6"]],"star":true},
  {"id":"classical-line-ending-5-be2-o-o-6-o-o-bg4","name":"Classical (line ending 5.Be2 O-O 6.O-O Bg4)","group":"classical","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["Nf3"],["Bg7"],["Be2"],["O-O"],["O-O"],["Bg4"]]},
  {"id":"classical-line-ending-5-be2-o-o-6-o-o-nc6","name":"Classical (line ending 5.Be2 O-O 6.O-O Nc6)","group":"classical","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["Nf3"],["Bg7"],["Be2"],["O-O"],["O-O"],["Nc6"]]},
  {"id":"classical-line-ending-6-o-o-bg4-7-be3-nc6","name":"Classical (line ending 6.O-O Bg4 7.Be3 Nc6)","group":"classical","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["Nf3"],["Bg7"],["Be2"],["O-O"],["O-O"],["Bg4"],["Be3"],["Nc6"]]},
  {"id":"150-attack-main","name":"150 Attack, Main","group":"150-attack","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["Be3"],["Bg7"],["Qd2"],["c6"]]},
  {"id":"150-attack-line-ending-4-be3-c6-5-qd2-b5","name":"150 Attack (line ending 4.Be3 c6 5.Qd2 b5)","group":"150-attack","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["Be3"],["c6"],["Qd2"],["b5"]]},
  {"id":"byrne-variation","name":"Byrne Variation","group":"byrne-variation","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["Bg5"]],"star":true},
  {"id":"sveshnikov-system","name":"Sveshnikov System","group":"sveshnikov-system","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["Bc4"]],"star":true},
  {"id":"bayonet-attack","name":"Bayonet Attack","group":"bayonet-attack","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["Be3"],["Bg7"],["Qd2"],["O-O"],["O-O-O"],["b5"]],"star":true},
  {"id":"quiet-system","name":"Quiet System","group":"quiet-system","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["Nf3"],["Bg7"],["h3"]],"star":true},
  {"id":"kholmov-system","name":"Kholmov System","group":"kholmov-system","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["Bc4"],["Bg7"]],"star":true},
  {"id":"czech-defense","name":"Czech Defense","group":"czech-defense","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["c6"]],"star":true},
  {"id":"ufimtsev-pytel","name":"Ufimtsev-Pytel","group":"ufimtsev-pytel","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["Nf3"],["c6"]],"star":true},
  {"id":"roscher-gambit","name":"Roscher Gambit","group":"roscher-gambit","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["Bc4"],["Bg7"],["Qf3"]],"star":true},
  {"id":"pytel","name":"Pytel","group":"pytel","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["f4"],["Bg7"],["Nf3"],["c5"],["dxc5"],["Qa5"]],"star":true},
  {"id":"lion-variation","name":"Lion Variation","group":"lion-variation","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["e5"]],"star":true},
  {"id":"chinese-variation","name":"Chinese Variation","group":"chinese-variation","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["Be2"],["Bg7"],["g4"]],"star":true},
  {"id":"austrian-attack-unzicker-attack","name":"Austrian Attack, Unzicker Attack","group":"austrian-attack","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["f4"],["Bg7"],["Nf3"],["O-O"],["e5"]]},
  {"id":"austrian-attack-unzicker-attack-bronstein-variation","name":"Austrian Attack, Unzicker Attack, Bronstein Variation","group":"austrian-attack","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["f4"],["Bg7"],["Nf3"],["O-O"],["e5"],["Nfd7"],["h4"]]},
  {"id":"austrian-attack-weiss-variation","name":"Austrian Attack, Weiss Variation","group":"austrian-attack","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["f4"],["Bg7"],["Nf3"],["O-O"],["Bd3"]]},
  {"id":"austrian-attack-kurajica-variation","name":"Austrian Attack, Kurajica Variation","group":"austrian-attack","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["f4"],["Bg7"],["Nf3"],["O-O"],["Be3"]]},
  {"id":"austrian-attack-ljubojevic-variation","name":"Austrian Attack, Ljubojevic Variation","group":"austrian-attack","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["f4"],["Bg7"],["Bc4"]]},
  {"id":"150-attack-inner-doll-defense","name":"150 Attack, Inner Doll Defense","group":"150-attack","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["Be3"],["c6"],["Qd2"],["Bg4"]]},
  {"id":"150-attack-sveshnikov-jansa-attack","name":"150 Attack, Sveshnikov-Jansa Attack","group":"150-attack","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["Be3"],["c6"],["h3"]]},
  {"id":"classical-variation-quiet-system","name":"Classical Variation, Quiet System","group":"classical-variation","moves":[["e4"],["d6"],["d4"],["Nf6"],["Nc3"],["g6"],["Nf3"],["Bg7"],["Be2"]]}
 ]
};
