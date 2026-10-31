// Scandinavian Defense — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "scandinavian-defense",
 "name": "Scandinavian Defense",
 "color": "b",
 "oneLiner": "1.e4 d5 — challenge the centre at once, queen out early.",
 "trunk": "1.e4 d5",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "main-line": {
   "label": "Main Line",
   "blurb": ""
  },
  "modern-variation": {
   "label": "Modern Variation",
   "blurb": ""
  },
  "icelandic-gambit": {
   "label": "Icelandic Gambit",
   "blurb": ""
  },
  "portuguese-gambit": {
   "label": "Portuguese Gambit",
   "blurb": ""
  },
  "modern": {
   "label": "Modern",
   "blurb": ""
  },
  "portuguese": {
   "label": "Portuguese",
   "blurb": ""
  },
  "anderssen": {
   "label": "Anderssen",
   "blurb": ""
  },
  "schiller-pytel-variation": {
   "label": "Schiller-Pytel Variation",
   "blurb": ""
  },
  "danish-gambit-type": {
   "label": "Danish Gambit-type",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Defences",
 "lines": [
  {"id":"scandinavian-defense","name":"Scandinavian Defense","group":"main","moves":[["e4"],["d5"]],"star":true,"idea":"Black hits e4 immediately. After the exchange the queen recaptures and must be placed carefully. Few theoretical lines to learn."},
  {"id":"main-line","name":"Main Line","group":"main-line","moves":[["e4"],["d5"],["exd5"],["Qxd5"]],"star":true},
  {"id":"modern-variation","name":"Modern Variation","group":"modern-variation","moves":[["e4"],["d5"],["exd5"],["Nf6"]],"star":true},
  {"id":"icelandic-gambit","name":"Icelandic Gambit","group":"icelandic-gambit","moves":[["e4"],["d5"],["exd5"],["Nf6"],["c4"],["e6"]],"star":true},
  {"id":"portuguese-gambit","name":"Portuguese Gambit","group":"portuguese-gambit","moves":[["e4"],["d5"],["exd5"],["Nf6"],["d4"],["Bg4"]],"star":true},
  {"id":"main-line-ending-2-exd5-qxd5-3-nc3-qa5","name":"Main (line ending 2.exd5 Qxd5 3.Nc3 Qa5)","group":"main","moves":[["e4"],["d5"],["exd5"],["Qxd5"],["Nc3"],["Qa5"]]},
  {"id":"main-line-ending-2-exd5-qxd5-3-nc3-qd6","name":"Main (line ending 2.exd5 Qxd5 3.Nc3 Qd6)","group":"main","moves":[["e4"],["d5"],["exd5"],["Qxd5"],["Nc3"],["Qd6"]]},
  {"id":"main-line-ending-4-d4-nf6-5-nf3-c6","name":"Main (line ending 4.d4 Nf6 5.Nf3 c6)","group":"main","moves":[["e4"],["d5"],["exd5"],["Qxd5"],["Nc3"],["Qa5"],["d4"],["Nf6"],["Nf3"],["c6"]]},
  {"id":"main-line-ending-3-c4-e6-4-dxe6-bxe6","name":"Main (line ending 3.c4 e6 4.dxe6 Bxe6)","group":"main","moves":[["e4"],["d5"],["exd5"],["Nf6"],["c4"],["e6"],["dxe6"],["Bxe6"]]},
  {"id":"main-line-ending-2-exd5-qxd5-3-nc3-qd8","name":"Main (line ending 2.exd5 Qxd5 3.Nc3 Qd8)","group":"main","moves":[["e4"],["d5"],["exd5"],["Qxd5"],["Nc3"],["Qd8"]]},
  {"id":"main-line-ending-2-qxd5-3-nc3-qa5-4-b4","name":"Main (line ending 2...Qxd5 3.Nc3 Qa5 4.b4)","group":"main","moves":[["e4"],["d5"],["exd5"],["Qxd5"],["Nc3"],["Qa5"],["b4"]]},
  {"id":"main-line-ending-2-exd5-qxd5-3-nc3-qe5","name":"Main (line ending 2.exd5 Qxd5 3.Nc3 Qe5+)","group":"main","moves":[["e4"],["d5"],["exd5"],["Qxd5"],["Nc3"],["Qe5+"]]},
  {"id":"main-line-ending-6-h3-bxf3-7-qxf3-e6","name":"Main (line ending 6.h3 Bxf3 7.Qxf3 e6)","group":"main","moves":[["e4"],["d5"],["exd5"],["Qxd5"],["Nc3"],["Qa5"],["d4"],["c6"],["Nf3"],["Bg4"],["h3"],["Bxf3"],["Qxf3"],["e6"]]},
  {"id":"main-line-ending-6-bc4-bf5-7-bd2-e6","name":"Main (line ending 6.Bc4 Bf5 7.Bd2 e6)","group":"main","moves":[["e4"],["d5"],["exd5"],["Qxd5"],["Nc3"],["Qa5"],["d4"],["Nf6"],["Nf3"],["c6"],["Bc4"],["Bf5"],["Bd2"],["e6"]]},
  {"id":"main-line-ending-6-bf5-7-bd2-e6-8-nd5","name":"Main (line ending 6...Bf5 7.Bd2 e6 8.Nd5)","group":"main","moves":[["e4"],["d5"],["exd5"],["Qxd5"],["Nc3"],["Qa5"],["d4"],["Nf6"],["Nf3"],["c6"],["Bc4"],["Bf5"],["Bd2"],["e6"],["Nd5"]]},
  {"id":"main-line-ending-7-bd2-e6-8-nd5-qd8","name":"Main (line ending 7.Bd2 e6 8.Nd5 Qd8)","group":"main","moves":[["e4"],["d5"],["exd5"],["Qxd5"],["Nc3"],["Qa5"],["d4"],["Nf6"],["Nf3"],["c6"],["Bc4"],["Bf5"],["Bd2"],["e6"],["Nd5"],["Qd8"]]},
  {"id":"main-3-qa5-4-d4-nf6","name":"Main, 3...Qa5 4.d4 Nf6","group":"main","moves":[["e4"],["d5"],["exd5"],["Qxd5"],["Nc3"],["Qa5"],["d4"],["Nf6"]]},
  {"id":"modern-line-ending-5-bc4-nb6-6-bb3-bg7","name":"Modern (line ending 5.Bc4 Nb6 6.Bb3 Bg7)","group":"modern","moves":[["e4"],["d5"],["exd5"],["Nf6"],["d4"],["Nxd5"],["Nf3"],["g6"],["Bc4"],["Nb6"],["Bb3"],["Bg7"]]},
  {"id":"modern-main","name":"Modern, Main","group":"modern","moves":[["e4"],["d5"],["exd5"],["Nf6"],["d4"],["Nxd5"],["Nf3"],["g6"]]},
  {"id":"modern-3-bb5","name":"Modern, 3.Bb5+","group":"modern","moves":[["e4"],["d5"],["exd5"],["Nf6"],["Bb5+"],["Bd7"],["Bc4"],["b5"]]},
  {"id":"modern-3-nf3","name":"Modern, 3.Nf3","group":"modern","moves":[["e4"],["d5"],["exd5"],["Nf6"],["Nf3"],["Nxd5"],["d4"],["g6"],["Be2"]]},
  {"id":"modern-3-d4","name":"Modern, 3.d4","group":"modern","moves":[["e4"],["d5"],["exd5"],["Nf6"],["d4"],["Nxd5"],["Nf3"],["Bg4"]]},
  {"id":"modern-line-ending-3-nxd5-4-c4-nb6-5-nf3","name":"Modern (line ending 3...Nxd5 4.c4 Nb6 5.Nf3)","group":"modern","moves":[["e4"],["d5"],["exd5"],["Nf6"],["d4"],["Nxd5"],["c4"],["Nb6"],["Nf3"]]},
  {"id":"modern-3-c4","name":"Modern, 3.c4","group":"modern","moves":[["e4"],["d5"],["exd5"],["Nf6"],["c4"]],"star":true},
  {"id":"portuguese-main","name":"Portuguese, Main","group":"portuguese","moves":[["e4"],["d5"],["exd5"],["Nf6"],["d4"],["Bg4"],["f3"],["Bf5"],["c4"],["e6"],["dxe6"],["Bxe6"]]},
  {"id":"portuguese-line-ending-4-be2-bxe2-5-qxe2-nxd5","name":"Portuguese (line ending 4.Be2 Bxe2 5.Qxe2 Nxd5)","group":"portuguese","moves":[["e4"],["d5"],["exd5"],["Nf6"],["d4"],["Bg4"],["Be2"],["Bxe2"],["Qxe2"],["Nxd5"]]},
  {"id":"portuguese-bg4","name":"Portuguese, Bg4","group":"portuguese","moves":[["e4"],["d5"],["exd5"],["Nf6"],["d4"],["Bg4"],["Nf3"]],"star":true},
  {"id":"portuguese-line-ending-2-nf6-3-d4-bg4-4-be2","name":"Portuguese (line ending 2...Nf6 3.d4 Bg4 4.Be2)","group":"portuguese","moves":[["e4"],["d5"],["exd5"],["Nf6"],["d4"],["Bg4"],["Be2"]]},
  {"id":"anderssen","name":"Anderssen","group":"anderssen","moves":[["e4"],["d5"],["exd5"],["Qxd5"],["Nc3"],["Qa5"],["d4"],["Nf6"],["Nf3"],["c6"],["Bc4"]],"star":true},
  {"id":"schiller-pytel-variation","name":"Schiller-Pytel Variation","group":"schiller-pytel-variation","moves":[["e4"],["d5"],["exd5"],["Qxd5"],["Nc3"],["Qa5"],["d4"],["c6"],["Nf3"],["Bg4"],["h3"],["Bxf3"],["Qxf3"],["e6"],["Bd2"]],"star":true},
  {"id":"danish-gambit-type","name":"Danish Gambit-type","group":"danish-gambit-type","moves":[["e4"],["d5"],["exd5"],["c6"]],"star":true},
  {"id":"icelandic-gambit-bb4","name":"Icelandic Gambit, Bb4","group":"icelandic-gambit","moves":[["e4"],["d5"],["exd5"],["Nf6"],["c4"],["e6"],["dxe6"],["Bxe6"],["Nc3"],["Nc6"],["Nf3"],["Bb4"]]},
  {"id":"icelandic-gambit-qe7","name":"Icelandic Gambit, Qe7","group":"icelandic-gambit","moves":[["e4"],["d5"],["exd5"],["Nf6"],["c4"],["e6"],["dxe6"],["Bxe6"],["d4"],["Bb4+"],["Bd2"],["Bxd2+"],["Qxd2"],["Qe7"]]}
 ]
};
