// Irregular Openings — Veyra Chess (MIT)
// Format: lines of [SAN, comment?]; see data-src/daxaur/LICENSE for credited content.
export const repertoire = {
 "id": "irregular-openings",
 "name": "Irregular Openings",
 "color": "w",
 "oneLiner": "Rare first moves: a3, a4, b3, b4, c3, d3, e3, g3, g4, h3, h4, Nc3, Nh3.",
 "trunk": "",
 "groups": {
  "king-s-pawn-opening": {
   "label": "King's Pawn Opening",
   "blurb": ""
  },
  "king-s-pawn-game": {
   "label": "King's Pawn Game",
   "blurb": ""
  },
  "queen-s-pawn-game": {
   "label": "Queen's Pawn Game",
   "blurb": ""
  },
  "indian-defense": {
   "label": "Indian Defense",
   "blurb": ""
  },
  "polish-opening": {
   "label": "Polish Opening",
   "blurb": ""
  },
  "grob-opening": {
   "label": "Grob Opening",
   "blurb": ""
  },
  "hungarian-opening": {
   "label": "Hungarian Opening",
   "blurb": ""
  },
  "mieses-opening": {
   "label": "Mieses Opening",
   "blurb": ""
  },
  "van-t-kruijs-opening": {
   "label": "Van't Kruijs Opening",
   "blurb": ""
  },
  "anderssen-s-opening": {
   "label": "Anderssen's Opening",
   "blurb": ""
  },
  "amar-opening": {
   "label": "Amar Opening",
   "blurb": ""
  },
  "ware-opening": {
   "label": "Ware Opening",
   "blurb": ""
  },
  "clemenz-opening": {
   "label": "Clemenz Opening",
   "blurb": ""
  },
  "desprez-opening": {
   "label": "Desprez Opening",
   "blurb": ""
  },
  "saragossa-opening": {
   "label": "Saragossa Opening",
   "blurb": ""
  },
  "portuguese-opening": {
   "label": "Portuguese Opening",
   "blurb": ""
  }
 },
 "source": "veyra",
 "category": "Systems",
 "lines": [
  {"id":"king-s-pawn-opening","name":"King's Pawn Opening","group":"king-s-pawn-opening","moves":[["e4"]],"star":true,"idea":"Uncommon first moves for surprise value. Most are sound enough but give Black a comfortable game if met with sensible central play."},
  {"id":"king-s-pawn-game","name":"King's Pawn Game","group":"king-s-pawn-game","moves":[["e4"],["e5"]],"star":true},
  {"id":"queen-s-pawn-game","name":"Queen's Pawn Game","group":"queen-s-pawn-game","moves":[["d4"]],"star":true},
  {"id":"symmetrical","name":"Symmetrical","group":"queen-s-pawn-game","moves":[["d4"],["d5"]]},
  {"id":"indian-defense","name":"Indian Defense","group":"indian-defense","moves":[["d4"],["Nf6"],["c4"]],"star":true},
  {"id":"polish-opening","name":"Polish Opening","group":"polish-opening","moves":[["b4"]],"star":true},
  {"id":"grob-opening","name":"Grob Opening","group":"grob-opening","moves":[["g4"]],"star":true},
  {"id":"hungarian-opening","name":"Hungarian Opening","group":"hungarian-opening","moves":[["g3"]],"star":true},
  {"id":"mieses-opening","name":"Mieses Opening","group":"mieses-opening","moves":[["d3"]],"star":true},
  {"id":"van-t-kruijs-opening","name":"Van't Kruijs Opening","group":"van-t-kruijs-opening","moves":[["e3"]],"star":true},
  {"id":"anderssen-s-opening","name":"Anderssen's Opening","group":"anderssen-s-opening","moves":[["a3"]],"star":true},
  {"id":"amar-opening","name":"Amar Opening","group":"amar-opening","moves":[["Nh3"]],"star":true},
  {"id":"ware-opening","name":"Ware Opening","group":"ware-opening","moves":[["a4"]],"star":true},
  {"id":"clemenz-opening","name":"Clemenz Opening","group":"clemenz-opening","moves":[["h3"]],"star":true},
  {"id":"desprez-opening","name":"Desprez Opening","group":"desprez-opening","moves":[["h4"]],"star":true},
  {"id":"saragossa-opening","name":"Saragossa Opening","group":"saragossa-opening","moves":[["c3"]],"star":true},
  {"id":"1-e4-nf6-2-bb5","name":"1.e4 Nf6 2.Bb5","group":"portuguese-opening","moves":[["e4"],["Nf6"],["Bb5"]],"star":true},
  {"id":"napoleon-attack","name":"Napoleon Attack","group":"king-s-pawn-game","moves":[["e4"],["e5"],["Qf3"]]},
  {"id":"alapin-opening","name":"Alapin Opening","group":"king-s-pawn-game","moves":[["e4"],["e5"],["Ne2"]]},
  {"id":"modern-defense","name":"Modern Defense","group":"queen-s-pawn-game","moves":[["d4"],["g6"]]},
  {"id":"london-system","name":"London System","group":"queen-s-pawn-game","moves":[["d4"],["d5"],["Nf3"],["Nf6"],["Bf4"]]},
  {"id":"zukertort-system","name":"Zukertort System","group":"polish-opening","moves":[["Nf3"],["Nf6"],["b4"],["g6"],["Bb2"]]},
  {"id":"schiffler-sokolsky-variation","name":"Schiffler-Sokolsky Variation","group":"polish-opening","moves":[["b4"],["e6"],["Bb2"],["Nf6"],["b5"],["d5"],["e3"]]},
  {"id":"double-grob","name":"Double Grob","group":"grob-opening","moves":[["g4"],["g5"]]},
  {"id":"grob-gambit","name":"Grob Gambit","group":"grob-opening","moves":[["g4"],["d5"],["Bg2"]]},
  {"id":"wing-gambit","name":"Wing Gambit","group":"ware-opening","moves":[["a4"],["b5"],["axb5"],["Bb7"]]},
  {"id":"ware-gambit","name":"Ware Gambit","group":"ware-opening","moves":[["a4"],["e5"],["a5"],["d5"],["e3"],["f5"],["a6"]]}
 ]
};
