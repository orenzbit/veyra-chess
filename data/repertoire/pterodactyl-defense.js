// Pterodactyl Defense — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "pterodactyl-defense",
 "name": "Pterodactyl Defense",
 "color": "b",
 "oneLiner": "1.e4 c5 2.Nf3 Qa5 — an offbeat queen sortie in the Sicilian.",
 "trunk": "1.e4 c5 2.Nf3",
 "groups": {
  "main": {
   "label": "Main",
   "blurb": ""
  },
  "hyperaccelerated": {
   "label": "Hyperaccelerated",
   "blurb": ""
  },
  "classical": {
   "label": "Classical",
   "blurb": ""
  },
  "3-qxa5": {
   "label": "3.Qxa5",
   "blurb": ""
  },
  "2-qa5-3-bb5": {
   "label": "2...Qa5 3.Bb5",
   "blurb": ""
  },
  "2-qa5-3-c3-e6": {
   "label": "2...Qa5 3.c3 e6",
   "blurb": ""
  },
  "2-qa5-3-na3": {
   "label": "2...Qa5 3.Na3",
   "blurb": ""
  },
  "2-qa5-3-nc3": {
   "label": "2...Qa5 3.Nc3",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Defences",
 "lines": [
  {"id":"pterodactyl-defense","name":"Pterodactyl Defense","group":"main","moves":[["e4"],["c5"],["Nf3"],["Qa5"]],"star":true,"idea":"Black brings the queen out early to a5 to hit e5 and the c3 square. Unusual and tricky, but White gets a lead in development."},
  {"id":"main","name":"Main","group":"main","moves":[["e4"],["c5"],["Nf3"],["Qa5"],["c3"],["Nf6"]]},
  {"id":"hyperaccelerated","name":"Hyperaccelerated","group":"hyperaccelerated","moves":[["e4"],["c5"],["Nf3"],["g6"],["d4"],["cxd4"],["Nxd4"],["Bg7"],["c4"],["Qa5"]],"star":true},
  {"id":"classical","name":"Classical","group":"classical","moves":[["e4"],["c5"],["Nf3"],["Qa5"],["c3"],["e5"]],"star":true},
  {"id":"3-qxa5","name":"3.Qxa5","group":"3-qxa5","moves":[["e4"],["c5"],["Nf3"],["Qa5"],["b3"],["Nc6"]],"star":true},
  {"id":"2-qa5-3-bb5","name":"2...Qa5 3.Bb5","group":"2-qa5-3-bb5","moves":[["e4"],["c5"],["Nf3"],["Qa5"],["Bb5"],["Nc6"]],"star":true},
  {"id":"2-qa5-3-c3-e6","name":"2...Qa5 3.c3 e6","group":"2-qa5-3-c3-e6","moves":[["e4"],["c5"],["Nf3"],["Qa5"],["c3"],["e6"]],"star":true},
  {"id":"2-qa5-3-na3","name":"2...Qa5 3.Na3","group":"2-qa5-3-na3","moves":[["e4"],["c5"],["Nf3"],["Qa5"],["Na3"]],"star":true},
  {"id":"2-qa5-3-nc3","name":"2...Qa5 3.Nc3","group":"2-qa5-3-nc3","moves":[["e4"],["c5"],["Nf3"],["Qa5"],["Nc3"]],"star":true}
 ]
};
