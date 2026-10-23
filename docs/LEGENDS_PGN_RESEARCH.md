# Historical Legends PGN research

This report is generated from the committed PGN files by scripts/build-historical-legend-bots.mjs. It describes the supplied game data; it is not an independent engine evaluation. Runtime rating parameters use official peak FIDE ratings where stated; for players from eras without comparable official ratings, the parameter is an internal estimate, not a directly comparable historical rating.

## Method and limitations

- Games are assigned to the player only when the player name is found in the PGN White or Black headers.
- Opening repertoires are grouped by the color the historical player actually played and sorted by source-game frequency, not by theoretical quality.
- The listed game examples preserve event/date/round/opponent/result/color and a short move sample from the source PGN.
- Capture/check/late-king metrics describe observed move patterns. They do not prove intent or style similarity by themselves.
- Style labels are hypotheses. The bot must still pass legal-move, tactical-accuracy, full-tournament and holdout checks.

## Viswanathan Anand (anand)

- Source PGN: Anand.pgn
- Internal bot rating parameter: 2817 (Peak FIDE rating 2817 (2011))
- Rating source: https://2700chess.com/records
- Valid games attributed to the player: 4253
- Training / holdout games: 3828 / 425
- Holdout captures/checks per 100 player moves: 20.71 / 4.29
- Date range: 1984–2026
- Results from the player perspective: 1485 wins, 2150 draws, 618 losses
- Games as White / Black: 2157 / 2096
- Average game length: 80.79 plies
- Captures per 100 player moves: 20.95
- Checks per 100 player moves: 4.63
- King moves after ply 40 per 100 player moves: 7.48
- Opening diversity: 1331 White lines and 1509 Black lines
- Working style hypothesis: אוניברסלי־דינמי. סגנון אוניברסלי־דינמי: מגוון פתיחות רחב, שילוב בין יוזמה לחישוב זהיר והעדפה להתאים את התוכנית לעמדה. מדדי PGN מתארים שכיחות, לא כוונה או איכות מהלך.

### Representative source games

- Anand.pgn:1985.??.??:Lloyds Bank op:?:Shovel, Kenneth:Anand, Viswanathan · 1985.??.?? · Lloyds Bank op · round ? · split training · black · vs Shovel, Kenneth · result 1/2-1/2 · ECO E90
  - Source move sample: 1.d4 Nf6 2.c4 c5 3.d5 d6 4.Nc3 g6 5.e4 Bg7 6.Nf3 O-O 7.h3 e6 8.Bd3 exd5
- Anand.pgn:1984.??.??:Lloyds Bank op:5:Chandler, Murray G:Anand, Viswanathan · 1984.??.?? · Lloyds Bank op · round 5 · split training · black · vs Chandler, Murray G · result 1-0 · ECO B66
  - Source move sample: 1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 d6 6.Bg5 e6 7.Qd2 a6 8.O-O-O h6
- Anand.pgn:1984.??.??:Thessaloniki ol (Men):1:Barumba, G.:Anand, Viswanathan · 1984.??.?? · Thessaloniki ol (Men) · round 1 · split training · black · vs Barumba, G. · result 0-1 · ECO E94
  - Source move sample: 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.Nf3 O-O 5.e4 d6 6.Be2 Nbd7 7.O-O e5 8.dxe5 dxe5
- Anand.pgn:1984.??.??:Lloyds Bank op:8:Anand, Viswanathan:Wells, Peter K · 1984.??.?? · Lloyds Bank op · round 8 · split training · white · vs Wells, Peter K · result 1/2-1/2 · ECO B17
  - Source move sample: 1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Nd7 5.Nf3 Ngf6 6.Ng3 e6 7.Bd3 c5 8.O-O cxd4
- Anand.pgn:1984.??.??:Wch U20:?:Anand, Viswanathan:Wolff, Patrick G · 1984.??.?? · Wch U20 · round ? · split holdout · white · vs Wolff, Patrick G · result 0-1 · ECO B09
  - Source move sample: 1.e4 d6 2.d4 Nf6 3.Nc3 g6 4.f4 Bg7 5.Nf3 O-O 6.e5 Nfd7 7.h4 c5 8.e6 fxe6
- Anand.pgn:1984.??.??:Lloyds Bank op:9:Anand, Viswanathan:Greenfeld, Alon · 1984.??.?? · Lloyds Bank op · round 9 · split training · white · vs Greenfeld, Alon · result 1-0 · ECO B49
  - Source move sample: 1.e4 c5 2.Nf3 e6 3.Nc3 a6 4.d4 cxd4 5.Nxd4 Qc7 6.Be2 Nf6 7.O-O Nc6 8.Be3 Bb4

### Held-out positions not used to build the repertoire

- Anand.pgn:1984.??.??:Wch U20:?:Anand, Viswanathan:Wolff, Patrick G · opening · ply 9 · white vs Wolff, Patrick G · result 0-1 · historical move Nf3 (g1f3)
  - FEN: `rnbqk2r/ppp1ppbp/3p1np1/8/3PPP2/2N5/PPP3PP/R1BQKBNR w KQkq - 1 5`
- Anand.pgn:1984.??.??:Wch U20:?:Anand, Viswanathan:Wolff, Patrick G · middlegame · ply 13 · white vs Wolff, Patrick G · result 0-1 · historical move h4 (h2h4)
  - FEN: `rnbq1rk1/pppnppbp/3p2p1/4P3/3P1P2/2N2N2/PPP3PP/R1BQKB1R w KQ - 1 7`
- Anand.pgn:1984.??.??:Wch U20:?:Anand, Viswanathan:Wolff, Patrick G · middlegame · ply 23 · white vs Wolff, Patrick G · result 0-1 · historical move Be3 (c1e3)
  - FEN: `r1bq1rk1/pp2p1bp/2nppn2/2p5/3P1P1R/2N2N2/PPP3P1/R1BQKB2 w Q - 3 12`
- Anand.pgn:1984.??.??:Wch U20:?:Anand, Viswanathan:Wolff, Patrick G · endgame · ply 35 · white vs Wolff, Patrick G · result 0-1 · historical move Bc4+ (d3c4)
  - FEN: `r1b2rk1/pp2p1bp/5n2/q7/4p2R/2NBB3/PPP3P1/R2QK3 w Q - 0 18`
- Anand.pgn:1984.??.??:Thessaloniki ol (Men):8:Alzate, Dario:Anand, Viswanathan · opening · ply 10 · black vs Alzate, Dario · result 0-1 · historical move e6 (e7e6)
  - FEN: `rnbqkb1r/pp2pppp/3p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R b KQkq - 2 5`
- Anand.pgn:1984.??.??:Thessaloniki ol (Men):8:Alzate, Dario:Anand, Viswanathan · middlegame · ply 34 · black vs Alzate, Dario · result 0-1 · historical move Ne5 (d7e5)
  - FEN: `r2r2k1/1pqnbppp/p2pb3/8/P2BPR2/2N3Q1/1PP1B1PP/R6K b - - 4 17`
- Anand.pgn:1984.??.??:Thessaloniki ol (Men):8:Alzate, Dario:Anand, Viswanathan · middlegame · ply 68 · black vs Alzate, Dario · result 0-1 · historical move Qxc3 (d4c3)
  - FEN: `4r1k1/1p2r2p/p2p2pb/P2P1p2/2Pq4/1RQ2B2/1P4PP/5R1K b - - 2 34`
- Anand.pgn:1984.??.??:Thessaloniki ol (Men):8:Alzate, Dario:Anand, Viswanathan · endgame · ply 100 · black vs Alzate, Dario · result 0-1 · historical move Be5 (g7e5)
  - FEN: `7k/5Rb1/B2p4/3P3p/p6P/8/6K1/1r6 b - - 3 50`
- Anand.pgn:1985.??.??:Lloyds Bank op:?:Mannion, Stephen R:Anand, Viswanathan · opening · ply 10 · black vs Mannion, Stephen R · result 0-1 · historical move Bg7 (f8g7)
  - FEN: `rnbqkb1r/pp2pp1p/3p1np1/2p5/4P3/2P2N2/PP1PBPPP/RNBQ1RK1 b kq - 1 5`
- Anand.pgn:1985.??.??:Lloyds Bank op:?:Mannion, Stephen R:Anand, Viswanathan · middlegame · ply 20 · black vs Mannion, Stephen R · result 0-1 · historical move a6 (a7a6)
  - FEN: `r2q1rk1/pp1b1pbp/2np1np1/1Bp1p3/P3P3/2P2N1P/1P1P1PP1/RNBQR1K1 b - - 0 10`
- Anand.pgn:1985.??.??:Lloyds Bank op:?:Mannion, Stephen R:Anand, Viswanathan · middlegame · ply 40 · black vs Mannion, Stephen R · result 0-1 · historical move Qf6 (d8f6)
  - FEN: `r2q2k1/1p5p/p1n1p1pB/2Pp4/P3P3/5P1P/5P2/R3Q1K1 b - - 0 20`
- Anand.pgn:1985.??.??:Lloyds Bank op:?:Mannion, Stephen R:Anand, Viswanathan · endgame · ply 58 · black vs Mannion, Stephen R · result 0-1 · historical move d3 (d4d3)
  - FEN: `7k/1p1r1q1p/p1n3p1/2P1p1B1/P2pPP1P/5R2/1Q3P2/6K1 b - - 3 29`
- Anand.pgn:1985.??.??:Wch U20:8:Grivas, Efstratios:Anand, Viswanathan · opening · ply 10 · black vs Grivas, Efstratios · result 1/2-1/2 · historical move Bg7 (f8g7)
  - FEN: `rnbqkb1r/pp2pp1p/3p1np1/2pP4/2P1P3/2N5/PP3PPP/R1BQKBNR b KQkq - 0 5`
- Anand.pgn:1985.??.??:Wch U20:8:Grivas, Efstratios:Anand, Viswanathan · middlegame · ply 12 · black vs Grivas, Efstratios · result 1/2-1/2 · historical move O-O (e8g8)
  - FEN: `rnbqk2r/pp2ppbp/3p1np1/2pP4/2P1P3/2N5/PP2BPPP/R1BQK1NR b KQkq - 2 6`
- Anand.pgn:1985.??.??:Wch U20:8:Grivas, Efstratios:Anand, Viswanathan · middlegame · ply 24 · black vs Grivas, Efstratios · result 1/2-1/2 · historical move Rfe8 (f8e8)
  - FEN: `r4rk1/pp3pbp/1q1pbnp1/2p3B1/2PnP3/1PN2N1P/P3BPP1/R2Q1RK1 b - - 2 12`
- Anand.pgn:1985.??.??:Wch U20:8:Grivas, Efstratios:Anand, Viswanathan · endgame · ply 34 · black vs Grivas, Efstratios · result 1/2-1/2 · historical move bxc6 (b7c6)
  - FEN: `r3r1k1/pp3p1p/2Qpb1p1/2p5/2P5/1Pb1BN1P/P4PP1/R4RK1 b - - 0 17`
- Anand.pgn:1986.??.??:Calcutta:?:Meetei, AB.:Anand, Viswanathan · opening · ply 10 · black vs Meetei, AB. · result 0-1 · historical move e5 (e7e5)
  - FEN: `r1bqk1nr/ppp1ppbp/2np2p1/8/3PP3/2N2N1P/PPP2PP1/R1BQKB1R b KQkq - 2 5`
- Anand.pgn:1986.??.??:Calcutta:?:Meetei, AB.:Anand, Viswanathan · middlegame · ply 18 · black vs Meetei, AB. · result 0-1 · historical move f5 (f7f5)
  - FEN: `r1bq1rk1/ppp1npbp/2np2p1/8/3NP3/2N1B2P/PPP1BPP1/R2Q1RK1 b - - 4 9`
- Anand.pgn:1986.??.??:Calcutta:?:Meetei, AB.:Anand, Viswanathan · middlegame · ply 34 · black vs Meetei, AB. · result 0-1 · historical move Nc6 (e5c6)
  - FEN: `4rr1k/pppq2bp/3pb1p1/4n3/4NP2/1P2B2P/P1PQB1P1/3R1RK1 b - - 0 17`
- Anand.pgn:1986.??.??:Calcutta:?:Meetei, AB.:Anand, Viswanathan · endgame · ply 50 · black vs Meetei, AB. · result 0-1 · historical move d5 (d6d5)
  - FEN: `4rr1k/ppp3bp/2npq1p1/1P6/4NPP1/4BB1P/P2Q4/5RK1 b - - 0 25`
- Anand.pgn:1986.??.??:Dubai ol (Men):5:Aturupane, H.:Anand, Viswanathan · opening · ply 10 · black vs Aturupane, H. · result 0-1 · historical move Nf6 (g8f6)
  - FEN: `rnbqkbnr/1pp2ppp/p3p3/8/P1pP4/4PN2/1P3PPP/RNBQKB1R b KQkq - 0 5`
- Anand.pgn:1986.??.??:Dubai ol (Men):5:Aturupane, H.:Anand, Viswanathan · middlegame · ply 18 · black vs Aturupane, H. · result 0-1 · historical move Bxc5 (f8c5)
  - FEN: `r1b1kb1r/1pq2ppp/p1n1pn2/2P5/P1B5/2N1PN2/1P3PPP/R1BQ1RK1 b kq - 2 9`
- Anand.pgn:1986.??.??:Dubai ol (Men):5:Aturupane, H.:Anand, Viswanathan · middlegame · ply 34 · black vs Aturupane, H. · result 0-1 · historical move Nd4 (c6d4)
  - FEN: `r1b2rk1/1p3ppp/p1nqp3/8/P3P3/2N3P1/BP2QP1P/3R1RK1 b - - 1 17`
- Anand.pgn:1986.??.??:Dubai ol (Men):5:Aturupane, H.:Anand, Viswanathan · endgame · ply 52 · black vs Aturupane, H. · result 0-1 · historical move b4 (b5b4)
  - FEN: `3r1r1k/1B3ppp/p7/1p2pP1q/P2nP1b1/2NRR1P1/1P3Q1P/6K1 b - - 1 26`

### Most frequent source lines as White

- 1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e5 6.Ndb5 d6 7.Bg5 a6 8.Na3 b5 · observed in 46 source games · ECO B33
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O Nxe4 5.d4 Nd6 6.Bxc6 dxc6 7.dxe5 Nf5 8.Qxd8+ Kxd8 · observed in 37 source games · ECO C67
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.h3 Bb7 · observed in 29 source games · ECO C88
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.c3 d5 · observed in 26 source games · ECO C89
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O · observed in 25 source games · ECO C92
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O Nxe4 5.Re1 Nd6 6.Nxe5 Be7 7.Bf1 Nxe5 8.Rxe5 O-O · observed in 24 source games · ECO C67
- 1.e4 e5 2.Nf3 Nf6 3.Nxe5 d6 4.Nf3 Nxe4 5.d4 d5 6.Bd3 Nc6 7.O-O Be7 8.c4 Nb4 · observed in 20 source games · ECO C42
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O · observed in 18 source games · ECO C95
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.d3 b5 7.Bb3 d6 8.a3 O-O · observed in 16 source games · ECO C84
- 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be3 Ng4 7.Bg5 h6 8.Bh4 g5 · observed in 13 source games · ECO B90
- 1.e4 e5 2.Nf3 Nf6 3.Nxe5 d6 4.Nf3 Nxe4 5.d4 d5 6.Bd3 Bd6 7.O-O O-O 8.c4 c6 · observed in 13 source games · ECO C42
- 1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Bf5 5.Ng3 Bg6 6.h4 h6 7.Nf3 Nd7 8.h5 Bh7 · observed in 12 source games · ECO B19

### Most frequent source lines as Black

- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Nxe4 6.d4 b5 7.Bb3 d5 8.dxe5 Be6 · observed in 20 source games · ECO C80
- 1.d4 Nf6 2.c4 e6 3.Nf3 b6 4.g3 Ba6 5.b3 Bb4+ 6.Bd2 Be7 7.Bg2 c6 8.Bc3 d5 · observed in 16 source games · ECO E15
- 1.e4 e5 2.Nf3 Nf6 3.Nxe5 d6 4.Nf3 Nxe4 5.d4 d5 6.Bd3 Nc6 7.O-O Be7 8.c4 Nb4 · observed in 16 source games · ECO C42
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.h3 Bb7 · observed in 15 source games · ECO C88
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O Nxe4 5.d4 Nd6 6.Bxc6 dxc6 7.dxe5 Nf5 8.Qxd8+ Kxd8 · observed in 15 source games · ECO C67
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O Nxe4 5.Re1 Nd6 6.Nxe5 Be7 7.Bf1 Nxe5 8.Rxe5 O-O · observed in 12 source games · ECO C67
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Nxe4 6.d4 b5 7.Bb3 d5 8.dxe5 Be6 · observed in 9 source games · ECO C83
- 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be2 e5 7.Nb3 Be7 8.O-O O-O · observed in 8 source games · ECO B92
- 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 Nc6 6.Bg5 e6 7.Qd2 Be7 8.O-O-O O-O · observed in 8 source games · ECO B65
- 1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.Qc2 d5 5.cxd5 Qxd5 6.e3 c5 7.Bd2 Bxc3 8.Bxc3 cxd4 · observed in 7 source games · ECO E34
- 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be3 e5 7.Nf3 Be7 8.Bc4 O-O · observed in 7 source games · ECO B90
- 1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Bf5 5.Ng3 Bg6 6.h4 h6 7.Nf3 Nd7 8.h5 Bh7 · observed in 7 source games · ECO B19

### Phrase archive

- general: אני מחפש את המהלך שמחבר בין יוזמה לעמדה יציבה. / מהירות עוזרת רק כשהתגובה החזקה של היריב כבר נבדקה.
- opening: אני בוחר פתיחה שמעניקה אפשרויות — לא הבטחות. / כשההכנה נגמרת, מתחיל החישוב האמיתי.
- threat: לפני שאמשיך ביוזמה, אני בודק מה היריב כופה עליי. / מה משתנה אם היריב מוצא את התגובה החזקה ביותר?
- tactics: חשב את כל רצף ההכאות, לא רק את המהלך הראשון. / טקטיקה טובה משפרת את העמדה; היא לא רק מרוויחה רגע.
- endgame: בסיום, פעילות המלך והכלים חשובה לא פחות מהחומר. / אם היוזמה יכולה להפוך ליתרון יציב, בחר את הרגע להמיר.

---

## Adolf Anderssen (anderssen)

- Source PGN: Anderssen.pgn
- Internal bot rating parameter: 2700 (Internal simulation estimate; no comparable official FIDE rating from his era)
- Valid games attributed to the player: 680
- Training / holdout games: 611 / 69
- Holdout captures/checks per 100 player moves: 22.18 / 6.64
- Date range: 1844–1878
- Results from the player perspective: 348 wins, 67 draws, 264 losses
- Games as White / Black: 316 / 364
- Average game length: 72.79 plies
- Captures per 100 player moves: 21.76
- Checks per 100 player moves: 7.43
- King moves after ply 40 per 100 player moves: 6.38
- Opening diversity: 206 White lines and 239 Black lines
- Working style hypothesis: התקפי. יוזמה והתקפות ישירות, בהתאם לפרופיל ההיסטורי המקובל ולמדדי המשחקים.

### Representative source games

- Anderssen.pgn:1851.??.??:Berlin m2:?:Dufresne, Jean:Anderssen, Adolf · 1851.??.?? · Berlin m2 · round ? · split training · black · vs Dufresne, Jean · result 1/2-1/2 · ECO B14
  - Source move sample: 1.e4 e6 2.d4 d5 3.exd5 exd5 4.c4 c6 5.Nc3 Be6 6.cxd5 cxd5 7.Nf3 Nc6 8.Bd3 Nf6
- Anderssen.pgn:1844.??.??:Great Britain:?:Seligo:Anderssen, Adolf · 1844.??.?? · Great Britain · round ? · split holdout · black · vs Seligo · result 1-0 · ECO C26
  - Source move sample: 1.e4 e5 2.Bc4 Nf6 3.Nc3 Bc5 4.h3 O-O 5.a3 c6 6.Nf3 d5 7.exd5 cxd5 8.Ba2 Nc6
- Anderssen.pgn:1866.??.??:Berlin m3:?:Minckwitz, Johannes:Anderssen, Adolf · 1866.??.?? · Berlin m3 · round ? · split training · black · vs Minckwitz, Johannes · result * · ECO C63
  - Source move sample: 1.e4 e5 2.Nf3 Nc6 3.Bb5 f5 4.d3 Nf6 5.O-O Bc5 6.Bc4 d6 7.Bg5 h6 8.Bxf6 Qxf6
- Anderssen.pgn:1846.??.??:Breslau m:?:Von Heydebrand und der L, Tassilo:Anderssen, Adolf · 1846.??.?? · Breslau m · round ? · split training · black · vs Von Heydebrand und der L, Tassilo · result 0-1 · ECO B44
  - Source move sample: 1.e4 c5 2.d4 cxd4 3.Nf3 Nc6 4.Bc4 e6 5.Nxd4 Bc5 6.Nf3 Nge7 7.Nc3 O-O 8.a3 Ng6
- Anderssen.pgn:1851.??.??:Berlin m2:?:Anderssen, Adolf:Dufresne, Jean · 1851.??.?? · Berlin m2 · round ? · split training · white · vs Dufresne, Jean · result 1/2-1/2 · ECO B44
  - Source move sample: 1.e4 c5 2.d4 cxd4 3.Nf3 Nc6 4.Nxd4 e6 5.Nf3 Nge7 6.Bd3 Ng6 7.O-O Bc5 8.Nc3 a6
- Anderssen.pgn:1846.??.??:Breslau m:?:Anderssen, Adolf:Von Heydebrand und der L, Tassilo · 1846.??.?? · Breslau m · round ? · split training · white · vs Von Heydebrand und der L, Tassilo · result 0-1 · ECO C37
  - Source move sample: 1.e4 e5 2.f4 exf4 3.Nf3 g5 4.Bc4 g4 5.O-O gxf3 6.Qxf3 Qf6 7.e5 Qxe5 8.d3 Bh6
- Anderssen.pgn:1846.??.??:Breslau m:?:Anderssen, Adolf:Von Heydebrand und der L, Tassilo · 1846.??.?? · Breslau m · round ? · split training · white · vs Von Heydebrand und der L, Tassilo · result 1-0 · ECO B01
  - Source move sample: 1.e4 d5 2.exd5 Nf6 3.Nf3 Bg4 4.Be2 Nxd5 5.O-O e6 6.d4 c5 7.Ne5 Bxe2 8.Qxe2 cxd4

### Held-out positions not used to build the repertoire

- Anderssen.pgn:1844.??.??:Great Britain:?:Seligo:Anderssen, Adolf · opening · ply 10 · black vs Seligo · result 1-0 · historical move c6 (c7c6)
  - FEN: `rnbq1rk1/pppp1ppp/5n2/2b1p3/2B1P3/P1N4P/1PPP1PP1/R1BQK1NR b KQ - 0 5`
- Anderssen.pgn:1844.??.??:Great Britain:?:Seligo:Anderssen, Adolf · middlegame · ply 16 · black vs Seligo · result 1-0 · historical move Nc6 (b8c6)
  - FEN: `rnbq1rk1/pp3ppp/5n2/2bpp3/8/P1N2N1P/BPPP1PP1/R1BQK2R b KQ - 1 8`
- Anderssen.pgn:1844.??.??:Great Britain:?:Seligo:Anderssen, Adolf · middlegame · ply 30 · black vs Seligo · result 1-0 · historical move Be6 (c8e6)
  - FEN: `r1b2rk1/pp3ppp/2nb2q1/3p3n/3PpP2/P6P/BPP1N1PN/R1BQ1R1K b - f3 0 15`
- Anderssen.pgn:1844.??.??:Great Britain:?:Seligo:Anderssen, Adolf · endgame · ply 44 · black vs Seligo · result 1-0 · historical move Rg4 (g6g4)
  - FEN: `r4qk1/pp2b1pp/2n1b1r1/3p1p1Q/2PPpP2/PPN1B2P/B5PN/R4R1K b - - 2 22`
- Anderssen.pgn:1848.??.??:Breslau m:6:Harrwitz, Daniel:Anderssen, Adolf · opening · ply 10 · black vs Harrwitz, Daniel · result 0-1 · historical move Bg7 (f8g7)
  - FEN: `rnb1kbnr/pppp1p1p/8/6p1/2BPPp1q/8/PPP3PP/RNBQ1KNR b kq - 0 5`
- Anderssen.pgn:1848.??.??:Breslau m:6:Harrwitz, Daniel:Anderssen, Adolf · middlegame · ply 18 · black vs Harrwitz, Daniel · result 0-1 · historical move Rf8 (h8f8)
  - FEN: `rnb1k2r/ppppn1bp/5p2/4P1pq/2BPNp2/5N2/PPP3PP/R1BQ1K1R b kq - 1 9`
- Anderssen.pgn:1848.??.??:Breslau m:6:Harrwitz, Daniel:Anderssen, Adolf · middlegame · ply 36 · black vs Harrwitz, Daniel · result 0-1 · historical move Qf4 (h4f4)
  - FEN: `r1b1k3/ppp1n2p/2n2r2/3pN3/3P3q/5B2/PPP2B1P/R2Q2KR b q - 4 18`
- Anderssen.pgn:1848.??.??:Breslau m:6:Harrwitz, Daniel:Anderssen, Adolf · endgame · ply 52 · black vs Harrwitz, Daniel · result 0-1 · historical move Be6 (c8e6)
  - FEN: `r1b2k2/ppp4p/5r2/3p1n1B/5q2/8/PPP1QN1P/4R1KR b - - 1 26`
- Anderssen.pgn:1851.??.??:Berlin m1:?:Mayet, Carl:Anderssen, Adolf · middlegame · ply 10 · black vs Mayet, Carl · result 0-1 · historical move dxc6 (d7c6)
  - FEN: `r1bqk2r/pppp1ppp/2B2n2/2b1p3/4P3/2P2N2/PP1P1PPP/RNBQK2R b KQkq - 0 5`
- Anderssen.pgn:1851.??.??:Berlin m1:?:Mayet, Carl:Anderssen, Adolf · middlegame · ply 14 · black vs Mayet, Carl · result 0-1 · historical move h5 (h7h5)
  - FEN: `r2qk2r/ppp2ppp/2p2n2/2b1p3/4P1b1/2P2N1P/PP1P1PP1/RNBQ1RK1 b kq - 0 7`
- Anderssen.pgn:1851.??.??:Berlin m1:?:Mayet, Carl:Anderssen, Adolf · endgame · ply 20 · black vs Mayet, Carl · result 0-1 · historical move Nxe4 (f6e4)
  - FEN: `r2qk2r/ppp2pp1/2p2n2/2b1N3/3PP3/2P3p1/PP3PP1/RNBQ1RK1 b kq - 0 10`
- Anderssen.pgn:1851.??.??:Berlin m2:?:Dufresne, Jean:Anderssen, Adolf · opening · ply 10 · black vs Dufresne, Jean · result 0-1 · historical move Ba5 (b4a5)
  - FEN: `r1bqk1nr/pppp1ppp/2n5/4p3/1bB1P3/2P2N2/P2P1PPP/RNBQK2R b KQkq - 0 5`
- Anderssen.pgn:1851.??.??:Berlin m2:?:Dufresne, Jean:Anderssen, Adolf · middlegame · ply 12 · black vs Dufresne, Jean · result 0-1 · historical move Nf6 (g8f6)
  - FEN: `r1bqk1nr/pppp1ppp/2n5/b3p3/2B1P3/2P2N2/P2P1PPP/RNBQ1RK1 b kq - 2 6`
- Anderssen.pgn:1851.??.??:Berlin m2:?:Dufresne, Jean:Anderssen, Adolf · middlegame · ply 20 · black vs Dufresne, Jean · result 0-1 · historical move Re8 (f8e8)
  - FEN: `r1bq1rk1/ppp2ppp/2n5/b2pP3/2B1n3/B1P2N2/P1Q2PPP/RN3RK1 b - - 1 10`
- Anderssen.pgn:1851.??.??:Berlin m2:?:Dufresne, Jean:Anderssen, Adolf · endgame · ply 30 · black vs Dufresne, Jean · result 0-1 · historical move Qg5+ (d8g5)
  - FEN: `r2qr1k1/ppp2ppp/2n5/b2bP3/2P5/B6P/P1Q2P1P/RN1RN1K1 b - - 0 15`
- Anderssen.pgn:1851.??.??:Berlin m3:?:Anderssen, Adolf:Falkbeer, Ernst Karl · opening · ply 9 · white vs Falkbeer, Ernst Karl · result 1-0 · historical move exd5 (e4d5)
  - FEN: `r1bqkb1r/ppp2ppp/2n2n2/3pp1N1/2B1P3/8/PPPP1PPP/RNBQK2R w KQkq - 0 5`
- Anderssen.pgn:1851.??.??:Berlin m3:?:Anderssen, Adolf:Falkbeer, Ernst Karl · middlegame · ply 23 · white vs Falkbeer, Ernst Karl · result 1-0 · historical move bxc3 (b2c3)
  - FEN: `r4rk1/pppq1ppp/5n2/n2Pp1N1/8/2bP4/PPP1QPPP/R1B2RK1 w - - 0 12`
- Anderssen.pgn:1851.??.??:Berlin m3:?:Anderssen, Adolf:Falkbeer, Ernst Karl · middlegame · ply 43 · white vs Falkbeer, Ernst Karl · result 1-0 · historical move Qxe1 (f2e1)
  - FEN: `r5k1/ppp2ppp/5n2/2B2PN1/1n3R2/8/P1p2QPP/4r1K1 w - - 0 22`
- Anderssen.pgn:1851.??.??:Berlin m3:?:Anderssen, Adolf:Falkbeer, Ernst Karl · endgame · ply 63 · white vs Falkbeer, Ernst Karl · result 1-0 · historical move Re8+ (e1e8)
  - FEN: `6k1/2p2pp1/7p/3n1PP1/pp6/5N2/P1p2K1P/2BrR3 w - - 0 32`
- Anderssen.pgn:1851.??.??:London2:?:Anderssen, Adolf:Meyerhofer · opening · ply 9 · white vs Meyerhofer · result 1-0 · historical move Nc3 (b1c3)
  - FEN: `rnbqk1nr/ppp2ppp/8/3p4/1bPP4/8/PP3PPP/RNBQKBNR w KQkq - 1 5`
- Anderssen.pgn:1851.??.??:London2:?:Anderssen, Adolf:Meyerhofer · middlegame · ply 25 · white vs Meyerhofer · result 1-0 · historical move Rad1 (a1d1)
  - FEN: `r2q1r1k/ppp3p1/2n1b2p/3n1p2/1b1P4/2N1BN2/PPQ1BPPP/R4RK1 w - - 0 13`
- Anderssen.pgn:1851.??.??:London2:?:Anderssen, Adolf:Meyerhofer · middlegame · ply 49 · white vs Meyerhofer · result 1-0 · historical move Nxd1 (c3d1)
  - FEN: `5r1k/1p2n1p1/p1p1b2p/5p2/2B2R2/P1N5/1P3KPP/2Br4 w - - 0 25`
- Anderssen.pgn:1851.??.??:London2:?:Anderssen, Adolf:Meyerhofer · endgame · ply 73 · white vs Meyerhofer · result 1-0 · historical move Kf4 (g3f4)
  - FEN: `8/1p6/p4k2/2pr4/8/P3B1K1/1PB3PP/8 w - - 0 37`
- Anderssen.pgn:1851.??.??:London m9:?:Loewenthal, Johann Jacob:Anderssen, Adolf · opening · ply 10 · black vs Loewenthal, Johann Jacob · result 1-0 · historical move Bg7 (f8g7)
  - FEN: `rnb1kbnr/pppp1p1p/8/6p1/2B1Pp1q/2N5/PPPP2PP/R1BQ1KNR b kq - 1 5`

### Most frequent source lines as White

- 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4 Bxb4 5.c3 Bc5 6.O-O d6 7.d4 exd4 8.cxd4 Bb6 · observed in 18 source games · ECO C51
- 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4 Bxb4 5.c3 Ba5 6.d4 exd4 7.O-O dxc3 8.Qb3 Qf6 · observed in 9 source games · ECO C52
- 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4 Bxb4 5.c3 Bc5 6.d4 exd4 7.O-O d6 8.cxd4 Bb6 · observed in 9 source games · ECO C51
- 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4 Bb6 5.O-O d6 6.a4 a6 7.a5 Ba7 8.b5 axb5 · observed in 5 source games · ECO C51
- 1.e4 e5 2.f4 exf4 3.Nf3 g5 4.Bc4 g4 5.O-O gxf3 6.Qxf3 Qf6 7.e5 Qxe5 8.d3 Bh6 · observed in 4 source games · ECO C37
- 1.e4 e5 2.f4 exf4 3.Nf3 g5 4.h4 g4 5.Ne5 Bg7 6.Nxg4 d5 7.Nf2 dxe4 8.Nxe4 Qe7 · observed in 4 source games · ECO C39
- 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4 Bxb4 5.c3 Ba5 6.d4 exd4 7.O-O d3 8.Ng5 Nh6 · observed in 4 source games · ECO C52
- 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4 Bxb4 5.c3 Ba5 6.d4 exd4 7.O-O d3 8.Qb3 Qf6 · observed in 4 source games · ECO C52
- 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5 Na5 6.Bb5+ c6 7.dxc6 bxc6 8.Be2 h6 · observed in 4 source games · ECO C59
- 1.e4 e5 2.f4 exf4 3.Nf3 g5 4.h4 g4 5.Ne5 h5 6.Bc4 Nh6 7.d4 d6 8.Nd3 f3 · observed in 3 source games · ECO C39
- 1.e4 e5 2.f4 exf4 3.Nf3 g5 4.h4 g4 5.Ne5 Nf6 6.Bc4 d5 7.exd5 Bd6 8.d4 Nh5 · observed in 3 source games · ECO C39
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.d3 d6 6.Bxc6+ bxc6 7.h3 g6 8.Nc3 Bg7 · observed in 3 source games · ECO C77

### Most frequent source lines as Black

- 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4 Bxb4 5.c3 Bc5 6.O-O d6 7.d4 exd4 8.cxd4 Bb6 · observed in 10 source games · ECO C51
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O Nxe4 5.d4 Be7 6.Qe2 Nd6 7.Bxc6 bxc6 8.dxe5 Nb7 · observed in 9 source games · ECO C67
- 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d4 exd4 6.cxd4 Bb4+ 7.Bd2 Bxd2+ 8.Nbxd2 d5 · observed in 9 source games · ECO C54
- 1.e4 e5 2.f4 exf4 3.Bc4 Qh4+ 4.Kf1 g5 5.d4 Bg7 6.Nc3 Ne7 7.g3 fxg3 8.Kg2 Qh6 · observed in 8 source games · ECO C33
- 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4 Bxb4 5.c3 Ba5 6.d4 exd4 7.O-O dxc3 8.Qb3 Qf6 · observed in 7 source games · ECO C52
- 1.e4 e5 2.f4 exf4 3.Bc4 Qh4+ 4.Kf1 g5 5.Nc3 Bg7 6.d4 Ne7 7.g3 fxg3 8.Kg2 Qh6 · observed in 5 source games · ECO C33
- 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4 Bxb4 5.c3 Bc5 6.d4 exd4 7.O-O d6 8.cxd4 Bb6 · observed in 5 source games · ECO C51
- 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d4 exd4 6.e5 d5 7.Bb5 Ne4 8.cxd4 Bb4+ · observed in 5 source games · ECO C54
- 1.e4 e5 2.f4 exf4 3.Nf3 g5 4.Bc4 g4 5.Ne5 Qh4+ 6.Kf1 Nh6 7.d4 d6 8.Nd3 f3 · observed in 4 source games · ECO C37
- 1.e4 e5 2.f4 exf4 3.Nf3 g5 4.h4 g4 5.Ne5 h5 6.Bc4 Rh7 7.d4 f3 8.gxf3 d6 · observed in 4 source games · ECO C39
- 1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nf6 5.Bd3 Nc6 6.Be3 d5 7.exd5 exd5 8.O-O Bd6 · observed in 3 source games · ECO B40
- 1.e4 e5 2.f4 exf4 3.Bc4 d5 4.Bxd5 c6 5.Bb3 Qh4+ 6.Kf1 g5 7.d4 Bg7 8.Nc3 Ne7 · observed in 3 source games · ECO C33

### Phrase archive

- general: חפש את הרעיון שמחבר בין הפתיחה לתוכנית האמצע. / Adolf Anderssen: יוזמה צריכה ליצור איום ממשי או לשפר פעילות. / בדוק את איומי שני הצדדים לפני בחירת מהלך.
- opening: שכיחות מהלך במשחקים היסטוריים אינה הוכחה שהוא הטוב ביותר. / Adolf Anderssen: חפש פיתוח מהיר ופתיחת קווים רק כשהמלך והכלים תומכים בכך. / השתמש ברפרטואר כנקודת התחלה, לא כהתחייבות עיוורת.
- threat: לפני בחירה טקטית, בדוק את התגובה הכפויה של היריב. / Adolf Anderssen: לפני התקפה, בדוק את תגובת ההגנה הטובה ביותר. / איום טוב הוא איום ששורד את ההגנה הטובה ביותר.
- tactics: שמור על איכות המהלך גם כאשר אתה מעדיף סגנון מסוים. / Adolf Anderssen: הקרבה דורשת וריאציה כפויה או תמורה עמדה ברורה. / אל תקריב חומר ללא תמורה שניתן להסביר.
- endgame: בסיומים, בדוק פעילות המלך והרגלים החופשיים. / Adolf Anderssen: גם התקפה צריכה לדעת מתי להמיר יתרון לסיום זכוי. / בדוק פעילות מלך, רגלים חופשיים וחולשות לפני חילופים.

---

## José Raúl Capablanca (capablanca)

- Source PGN: Capablanca.pgn
- Internal bot rating parameter: 2725 (Internal simulation estimate; retrospective ratings are not directly comparable to modern FIDE ratings)
- Valid games attributed to the player: 597
- Training / holdout games: 537 / 60
- Holdout captures/checks per 100 player moves: 22.2 / 5.46
- Date range: 1901–1941
- Results from the player perspective: 301 wins, 251 draws, 44 losses
- Games as White / Black: 308 / 289
- Average game length: 78.02 plies
- Captures per 100 player moves: 21.91
- Checks per 100 player moves: 5.76
- King moves after ply 40 per 100 player moves: 7.87
- Opening diversity: 260 White lines and 236 Black lines
- Working style hypothesis: סיומים ודיוק. פישוטים, פעילות כלים וסיומים; המדדים בקובץ אינם תחליף לניתוח מנוע.

### Representative source games

- Capablanca.pgn:1901.??.??:Havana m:6:Corzo y Prinzipe, Juan:Capablanca, Jose Raul · 1901.??.?? · Havana m · round 6 · split training · black · vs Corzo y Prinzipe, Juan · result 1/2-1/2 · ECO C25
  - Source move sample: 1.e4 e5 2.Nc3 Nc6 3.f4 exf4 4.Nf3 g5 5.h4 g4 6.Ng5 h6 7.Nxf7 Kxf7 8.d4 d5
- Capablanca.pgn:1901.??.??:Havana m:2:Corzo y Prinzipe, Juan:Capablanca, Jose Raul · 1901.??.?? · Havana m · round 2 · split training · black · vs Corzo y Prinzipe, Juan · result 1-0 · ECO C52
  - Source move sample: 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4 Bxb4 5.c3 Ba5 6.d4 exd4 7.O-O d6 8.Qb3 Qe7
- Capablanca.pgn:1901.??.??:Havana m:4:Corzo y Prinzipe, Juan:Capablanca, Jose Raul · 1901.??.?? · Havana m · round 4 · split training · black · vs Corzo y Prinzipe, Juan · result 0-1 · ECO C49
  - Source move sample: 1.e4 e5 2.Nf3 Nc6 3.Nc3 Nf6 4.Bb5 Bb4 5.O-O O-O 6.d3 d6 7.Bg5 Ne7 8.Ne2 Ng6
- Capablanca.pgn:1901.??.??:Havana m:3:Capablanca, Jose Raul:Corzo y Prinzipe, Juan · 1901.??.?? · Havana m · round 3 · split training · white · vs Corzo y Prinzipe, Juan · result 1/2-1/2 · ECO A80
  - Source move sample: 1.d4 f5 2.e3 Nf6 3.Nf3 e6 4.Bd3 b6 5.b3 Bb7 6.Nbd2 Bb4 7.Bb2 Ne4 8.Bxe4 fxe4
- Capablanca.pgn:1901.??.??:Havana m:1:Capablanca, Jose Raul:Corzo y Prinzipe, Juan · 1901.??.?? · Havana m · round 1 · split holdout · white · vs Corzo y Prinzipe, Juan · result 0-1 · ECO C47
  - Source move sample: 1.e4 e5 2.Nf3 Nc6 3.d4 exd4 4.Nxd4 Nf6 5.Nc3 Bb4 6.Nxc6 bxc6 7.Qd3 O-O 8.Bd2 Bxc3
- Capablanca.pgn:1919.??.??:Bradford sim:?:Capablanca, Jose Raul:White · 1919.??.?? · Bradford sim · round ? · split training · white · vs White · result * · ECO A52
  - Source move sample: 1.d4 Nf6 2.c4 e5 3.dxe5 Ng4 4.Nf3 Bc5 5.e3 Nc6 6.Bd2 O-O 7.Bc3 Re8 8.Be2 d6
- Capablanca.pgn:1901.??.??:Havana m:9:Capablanca, Jose Raul:Corzo y Prinzipe, Juan · 1901.??.?? · Havana m · round 9 · split training · white · vs Corzo y Prinzipe, Juan · result 1-0 · ECO A83
  - Source move sample: 1.d4 f5 2.e4 fxe4 3.Nc3 Nf6 4.Bg5 c6 5.Bxf6 exf6 6.Nxe4 d5 7.Ng3 Qe7+ 8.Qe2 Qxe2+

### Held-out positions not used to build the repertoire

- Capablanca.pgn:1901.??.??:Havana m:1:Capablanca, Jose Raul:Corzo y Prinzipe, Juan · opening · ply 9 · white vs Corzo y Prinzipe, Juan · result 0-1 · historical move Nc3 (b1c3)
  - FEN: `r1bqkb1r/pppp1ppp/2n2n2/8/3NP3/8/PPP2PPP/RNBQKB1R w KQkq - 1 5`
- Capablanca.pgn:1901.??.??:Havana m:1:Capablanca, Jose Raul:Corzo y Prinzipe, Juan · middlegame · ply 17 · white vs Corzo y Prinzipe, Juan · result 0-1 · historical move Bxc3 (d2c3)
  - FEN: `r1bq1rk1/p1pp1ppp/2p2n2/8/4P3/2bQ4/PPPB1PPP/R3KB1R w KQ - 0 9`
- Capablanca.pgn:1901.??.??:Havana m:1:Capablanca, Jose Raul:Corzo y Prinzipe, Juan · middlegame · ply 31 · white vs Corzo y Prinzipe, Juan · result 0-1 · historical move Qf5 (e4f5)
  - FEN: `r3r1k1/pbpp2pp/2p4q/4p3/2P1Q3/3B4/PP3PPP/1K1R3R w - - 1 16`
- Capablanca.pgn:1901.??.??:Havana m:1:Capablanca, Jose Raul:Corzo y Prinzipe, Juan · endgame · ply 45 · white vs Corzo y Prinzipe, Juan · result 0-1 · historical move Rg1 (h1g1)
  - FEN: `r3r1k1/p1p4p/2p3pP/8/2Ppp1b1/8/PP3P1P/1KR2B1R w - - 0 23`
- Capablanca.pgn:1901.??.??:Havana m:11:Capablanca, Jose Raul:Corzo y Prinzipe, Juan · opening · ply 9 · white vs Corzo y Prinzipe, Juan · result 1-0 · historical move Bb2 (c1b2)
  - FEN: `r1bqkbnr/pp3ppp/2n1p3/2pp4/3P4/1P2PN2/P1P2PPP/RNBQKB1R w KQkq - 0 5`
- Capablanca.pgn:1901.??.??:Havana m:11:Capablanca, Jose Raul:Corzo y Prinzipe, Juan · middlegame · ply 31 · white vs Corzo y Prinzipe, Juan · result 1-0 · historical move a3 (a2a3)
  - FEN: `r4rk1/pp1b2pp/1qn1p3/3pPp2/3P2n1/1P1B1NP1/PBP1Q2P/R4RK1 w - - 5 16`
- Capablanca.pgn:1901.??.??:Havana m:11:Capablanca, Jose Raul:Corzo y Prinzipe, Juan · middlegame · ply 61 · white vs Corzo y Prinzipe, Juan · result 1-0 · historical move exf7 (e6f7)
  - FEN: `r6k/pp3nrp/4P3/1q1P1pp1/8/PP3N1P/1B5K/4RR2 w - - 1 31`
- Capablanca.pgn:1901.??.??:Havana m:11:Capablanca, Jose Raul:Corzo y Prinzipe, Juan · endgame · ply 91 · white vs Corzo y Prinzipe, Juan · result 1-0 · historical move Kf2 (g2f2)
  - FEN: `3B4/p7/6k1/1p6/6p1/PP6/6K1/8 w - - 0 46`
- Capablanca.pgn:1909.??.??:USA m:7:Marshall, Frank James:Capablanca, Jose Raul · opening · ply 10 · black vs Marshall, Frank James · result 1-0 · historical move Ne4 (f6e4)
  - FEN: `rnbqk2r/ppp1bppp/4pn2/3p2B1/2PP4/2N1P3/PP3PPP/R2QKBNR b KQkq - 0 5`
- Capablanca.pgn:1909.??.??:USA m:7:Marshall, Frank James:Capablanca, Jose Raul · middlegame · ply 14 · black vs Marshall, Frank James · result 1-0 · historical move Nxc3 (e4c3)
  - FEN: `rnb1k2r/ppp1qppp/4p3/3p4/2PPn3/2NBP3/PP3PPP/R2QK1NR b KQkq - 1 7`
- Capablanca.pgn:1909.??.??:USA m:7:Marshall, Frank James:Capablanca, Jose Raul · middlegame · ply 26 · black vs Marshall, Frank James · result 1-0 · historical move b6 (b7b6)
  - FEN: `r1b2rk1/pp2qppp/5n2/2pp4/P2P4/Q1PBPN2/5PPP/R3K2R b KQ - 1 13`
- Capablanca.pgn:1909.??.??:USA m:7:Marshall, Frank James:Capablanca, Jose Raul · endgame · ply 38 · black vs Marshall, Frank James · result 1-0 · historical move Bc6 (b7c6)
  - FEN: `r1r3k1/pb1q1ppp/Pp6/2pp4/3P4/Q1P1PN2/5PPP/RR4K1 b - - 0 19`
- Capablanca.pgn:1909.??.??:USA m:17:Marshall, Frank James:Capablanca, Jose Raul · opening · ply 10 · black vs Marshall, Frank James · result 1/2-1/2 · historical move O-O (e8g8)
  - FEN: `r1bqk2r/pppp1ppp/2n2n2/1B2p3/1b2P3/2N2N2/PPPP1PPP/R1BQ1RK1 b kq - 7 5`
- Capablanca.pgn:1909.??.??:USA m:17:Marshall, Frank James:Capablanca, Jose Raul · middlegame · ply 24 · black vs Marshall, Frank James · result 1/2-1/2 · historical move fxe6 (f7e6)
  - FEN: `r2qnrk1/pp2nppp/2ppB3/4p1B1/4P2N/2PP4/P1P2PPP/R2Q1RK1 b - - 0 12`
- Capablanca.pgn:1909.??.??:USA m:17:Marshall, Frank James:Capablanca, Jose Raul · middlegame · ply 46 · black vs Marshall, Frank James · result 1/2-1/2 · historical move cxd4 (c5d4)
  - FEN: `6k1/1p1Nnr1p/3pp3/2p5/3QP1p1/2PP4/P1P3PP/R5K1 b - - 0 23`
- Capablanca.pgn:1909.??.??:USA m:17:Marshall, Frank James:Capablanca, Jose Raul · endgame · ply 70 · black vs Marshall, Frank James · result 1/2-1/2 · historical move Kg5 (f6g5)
  - FEN: `8/8/5k2/3p3p/1n1P4/2p1N1PP/2P1K3/8 b - - 0 35`
- Capablanca.pgn:1911.??.??:Montevideo sim:?:Capablanca, Jose Raul:Rivas Costa, Santiago · opening · ply 9 · white vs Rivas Costa, Santiago · result 1/2-1/2 · historical move f3 (f2f3)
  - FEN: `rnbqkb1r/pppp2pp/4pn2/6B1/3Pp3/2N5/PPP2PPP/R2QKBNR w KQkq - 0 5`
- Capablanca.pgn:1911.??.??:Montevideo sim:?:Capablanca, Jose Raul:Rivas Costa, Santiago · middlegame · ply 25 · white vs Rivas Costa, Santiago · result 1/2-1/2 · historical move Bxf6 (g5f6)
  - FEN: `r1b1k2r/pp2q1pp/2n2n2/3pp1B1/1bpP1N2/2N1QP1B/PPP3PP/R3K2R w KQkq - 0 13`
- Capablanca.pgn:1911.??.??:Montevideo sim:?:Capablanca, Jose Raul:Rivas Costa, Santiago · middlegame · ply 49 · white vs Rivas Costa, Santiago · result 1/2-1/2 · historical move Rbe1 (b1e1)
  - FEN: `2r3r1/pp6/2k4p/3p4/2pP1p1P/2P2P2/P1PK4/1R4R1 w - - 2 25`
- Capablanca.pgn:1911.??.??:Montevideo sim:?:Capablanca, Jose Raul:Rivas Costa, Santiago · endgame · ply 73 · white vs Rivas Costa, Santiago · result 1/2-1/2 · historical move Kh4 (h3h4)
  - FEN: `8/6R1/p4r1p/1p1p1k1P/2pP1p2/2P2P1K/P1P5/8 w - - 8 37`
- Capablanca.pgn:1911.??.??:New York:10:Capablanca, Jose Raul:Walcott, G. · opening · ply 9 · white vs Walcott, G. · result 1-0 · historical move d3 (d2d3)
  - FEN: `r1bqkb1r/1ppp1ppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 5`
- Capablanca.pgn:1911.??.??:New York:10:Capablanca, Jose Raul:Walcott, G. · middlegame · ply 21 · white vs Walcott, G. · result 1-0 · historical move Ng3 (f1g3)
  - FEN: `r2qrbk1/1ppb1ppp/p1np1n2/4p3/B3P1P1/2PP1N1P/PP3P2/R1BQKN1R w KQ - 1 11`
- Capablanca.pgn:1911.??.??:New York:10:Capablanca, Jose Raul:Walcott, G. · middlegame · ply 39 · white vs Walcott, G. · result 1-0 · historical move Kg2 (g1g2)
  - FEN: `r4rk1/1pp1bqpp/p2pp3/3np1P1/6Q1/2PP1NNP/PP3P2/R1B2RK1 w - - 6 20`
- Capablanca.pgn:1911.??.??:New York:10:Capablanca, Jose Raul:Walcott, G. · endgame · ply 57 · white vs Walcott, G. · result 1-0 · historical move h4 (h3h4)
  - FEN: `r5k1/1pp1b1pp/p2pp3/3rp1P1/8/2P3NP/PP1BRPK1/4R3 w - - 6 29`

### Most frequent source lines as White

- 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Nbd7 5.e3 Be7 6.Nf3 O-O 7.Rc1 a6 8.a3 h6 · observed in 4 source games · ECO D63
- 1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.Qc2 d5 5.cxd5 Qxd5 6.Nf3 c5 7.Bd2 Bxc3 8.Bxc3 Nc6 · observed in 3 source games · ECO E34
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 Na5 · observed in 3 source games · ECO C90
- 1.d4 d5 2.c4 e6 3.Nc3 c5 4.cxd5 exd5 5.Nf3 Nc6 6.g3 Nf6 7.Bg2 Be7 8.O-O O-O · observed in 2 source games · ECO D34
- 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Nbd7 5.e3 Be7 6.Nf3 O-O 7.Rc1 a6 8.cxd5 exd5 · observed in 2 source games · ECO D65
- 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Nbd7 5.e3 c6 6.Bd3 Qa5 7.Bh4 dxc4 8.Bxc4 b5 · observed in 2 source games · ECO D51
- 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Nbd7 5.e3 c6 6.Nf3 Qa5 7.Nd2 Bb4 8.Qc2 dxc4 · observed in 2 source games · ECO D52
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Nxe4 6.d4 b5 7.Bb3 d5 8.dxe5 Be6 · observed in 2 source games · ECO C80
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Nxe4 6.d4 b5 7.Bb3 d5 8.dxe5 Be6 · observed in 2 source games · ECO C83
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 f5 4.Nc3 Nf6 5.Qe2 Nd4 6.Nxd4 exd4 7.exf5+ Be7 8.Ne4 O-O · observed in 2 source games · ECO C63
- 1.e4 e5 2.Nf3 Nf6 3.Nxe5 d6 4.Nf3 Nxe4 5.d4 d5 6.Bd3 Bd6 7.c4 Bb4+ 8.Nbd2 O-O · observed in 2 source games · ECO C42
- 1.e4 e5 2.Nf3 Nf6 3.Nxe5 d6 4.Nf3 Nxe4 5.Qe2 Qe7 6.d3 Nf6 7.Bg5 Qxe2+ 8.Bxe2 Be7 · observed in 2 source games · ECO C42

### Most frequent source lines as Black

- 1.d4 Nf6 2.c4 e6 3.Nc3 d5 4.Bg5 Nbd7 5.e3 Be7 6.Nf3 O-O 7.Rc1 c6 8.Bd3 dxc4 · observed in 6 source games · ECO D67
- 1.d4 d5 2.Nf3 Nf6 3.c4 e6 4.Nc3 Nbd7 5.Bg5 Be7 6.e3 O-O 7.Rc1 c6 8.Qc2 dxc4 · observed in 4 source games · ECO D64
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 Na5 · observed in 4 source games · ECO C90
- 1.e4 e5 2.Nf3 Nc6 3.Nc3 Nf6 4.Bb5 Bb4 5.O-O O-O 6.d3 d6 7.Bg5 Bxc3 8.bxc3 Qe7 · observed in 4 source games · ECO C49
- 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Be7 5.e3 Ne4 6.Bxe7 Qxe7 7.cxd5 Nxc3 8.bxc3 exd5 · observed in 3 source games · ECO D53
- 1.d4 Nf6 2.c4 e6 3.Nf3 b6 4.g3 Bb7 5.Bg2 Bb4+ 6.Bd2 Bxd2+ 7.Qxd2 O-O 8.Nc3 Ne4 · observed in 3 source games · ECO E16
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O d6 5.d4 Bd7 6.Nc3 Be7 7.Re1 exd4 8.Nxd4 O-O · observed in 3 source games · ECO C66
- 1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3 dxc4 5.a4 Bf5 6.e3 e6 7.Bxc4 Bb4 8.O-O O-O · observed in 2 source games · ECO D19
- 1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.Qc2 d5 5.a3 Bxc3+ 6.Qxc3 Ne4 7.Qc2 c5 8.dxc5 Nc6 · observed in 2 source games · ECO E37
- 1.d4 Nf6 2.c4 e6 3.Nc3 d5 4.Bg5 Be7 5.e3 O-O 6.Nf3 Nbd7 7.Rc1 c6 8.a3 a6 · observed in 2 source games · ECO D64
- 1.e4 e5 2.Nc3 Nc6 3.f4 exf4 4.Nf3 g5 5.h4 g4 6.Ng5 h6 7.Nxf7 Kxf7 8.d4 d5 · observed in 2 source games · ECO C25
- 1.e4 e5 2.Nf3 Nc6 3.Nc3 Nf6 4.Bb5 Nd4 5.Nxd4 exd4 6.e5 dxc3 7.exf6 Qxf6 8.dxc3 Qe5+ · observed in 2 source games · ECO C48

### Phrase archive

- general: חפש את הרעיון שמחבר בין הפתיחה לתוכנית האמצע. / José Raúl Capablanca: פעילות הכלים חשובה יותר מפשטות מלאכותית. / בדוק את איומי שני הצדדים לפני בחירת מהלך.
- opening: שכיחות מהלך במשחקים היסטוריים אינה הוכחה שהוא הטוב ביותר. / José Raúl Capablanca: בחר פתיחה שמובילה לעמדה שניתן להבין ולשחק היטב. / השתמש ברפרטואר כנקודת התחלה, לא כהתחייבות עיוורת.
- threat: לפני בחירה טקטית, בדוק את התגובה הכפויה של היריב. / José Raúl Capablanca: בדוק איומים טקטיים גם לפני חילופי כלים. / איום טוב הוא איום ששורד את ההגנה הטובה ביותר.
- tactics: שמור על איכות המהלך גם כאשר אתה מעדיף סגנון מסוים. / José Raúl Capablanca: אל תיכנס לסיום נחות בלי תמורה קונקרטית. / אל תקריב חומר ללא תמורה שניתן להסביר.
- endgame: בסיומים, בדוק פעילות המלך והרגלים החופשיים. / José Raúl Capablanca: חשב מרוצי רגלים, פעילות מלך ועמדות צריחים. / בדוק פעילות מלך, רגלים חופשיים וחולשות לפני חילופים.

---

## Magnus Carlsen (carlsen)

- Source PGN: Carlsen.pgn
- Internal bot rating parameter: 2882 (Peak FIDE rating 2882 (2014))
- Rating source: https://2700chess.com/records
- Valid games attributed to the player: 7815
- Training / holdout games: 7035 / 780
- Holdout captures/checks per 100 player moves: 20.55 / 6.54
- Date range: 2001–2026
- Results from the player perspective: 4285 wins, 2343 draws, 1187 losses
- Games as White / Black: 3958 / 3857
- Average game length: 92.68 plies
- Captures per 100 player moves: 20.89
- Checks per 100 player moves: 6.31
- King moves after ply 40 per 100 player moves: 10.38
- Opening diversity: 3211 White lines and 3018 Black lines
- Working style hypothesis: אוניברסלי. משחק אוניברסלי ולחץ מתמשך; מדדי PGN מתארים דפוסים ולא מוכיחים איכות מהלך.

### Representative source games

- Carlsen.pgn:2001.01.05:Troll Masters:1:Edvardsen,R:Carlsen,Magnus · 2001.01.05 · Troll Masters · round 1 · split holdout · black · vs Edvardsen,R · result 1/2-1/2 · ECO D12
  - Source move sample: 1.d4 Nf6 2.Nf3 d5 3.e3 Bf5 4.c4 c6 5.Nc3 e6 6.Bd3 Bxd3 7.Qxd3 Nbd7 8.b3 Bd6
- Carlsen.pgn:2001.01.09:Troll Masters:6:Grubert,C:Carlsen,Magnus · 2001.01.09 · Troll Masters · round 6 · split training · black · vs Grubert,C · result 1-0 · ECO C42
  - Source move sample: 1.e4 e5 2.Nf3 Nf6 3.Nxe5 d6 4.Nf3 Nxe4 5.d4 d5 6.Bd3 Bd6 7.O-O O-O 8.c4 c6
- Carlsen.pgn:2001.04.07:Open NOR-ch:1:Hagberg,Oivind:Carlsen,M · 2001.04.07 · Open NOR-ch · round 1 · split training · black · vs Hagberg,Oivind · result 0-1 · ECO C42
  - Source move sample: 1.e4 e5 2.Nf3 Nf6 3.d3 d6 4.c3 g6 5.Bg5 Bg7 6.Be2 O-O 7.d4 h6 8.Bxf6 Qxf6
- Carlsen.pgn:2001.04.11:Open NOR-ch:6:Carlsen,M:Rukovci,Shemsi · 2001.04.11 · Open NOR-ch · round 6 · split training · white · vs Rukovci,Shemsi · result 1/2-1/2 · ECO A21
  - Source move sample: 1.c4 e5 2.Nc3 Bb4 3.Nd5 Be7 4.Nxe7 Nxe7 5.d4 exd4 6.Qxd4 O-O
- Carlsen.pgn:2001.01.06:Troll Masters:2:Carlsen,Magnus:Brameld,A · 2001.01.06 · Troll Masters · round 2 · split training · white · vs Brameld,A · result 0-1 · ECO B05
  - Source move sample: 1.e4 Nf6 2.e5 Nd5 3.d4 d6 4.Nf3 Bg4 5.Bc4 e6 6.O-O Nb6 7.Be2 Be7 8.h3 Bh5
- Carlsen.pgn:2001.01.07:Troll Masters:3:Carlsen,Magnus:Fant,G · 2001.01.07 · Troll Masters · round 3 · split training · white · vs Fant,G · result 1-0 · ECO C16
  - Source move sample: 1.e4 e6 2.d4 d5 3.Nc3 Bb4 4.e5 Ne7 5.a3 Bxc3+ 6.bxc3 b6 7.Qg4 Nf5 8.Bd3 h5

### Held-out positions not used to build the repertoire

- Carlsen.pgn:2001.01.05:Troll Masters:1:Edvardsen,R:Carlsen,Magnus · opening · ply 10 · black vs Edvardsen,R · result 1/2-1/2 · historical move e6 (e7e6)
  - FEN: `rn1qkb1r/pp2pppp/2p2n2/3p1b2/2PP4/2N1PN2/PP3PPP/R1BQKB1R b KQkq - 1 5`
- Carlsen.pgn:2001.01.05:Troll Masters:1:Edvardsen,R:Carlsen,Magnus · middlegame · ply 14 · black vs Edvardsen,R · result 1/2-1/2 · historical move Nbd7 (b8d7)
  - FEN: `rn1qkb1r/pp3ppp/2p1pn2/3p4/2PP4/2NQPN2/PP3PPP/R1B1K2R b KQkq - 0 7`
- Carlsen.pgn:2001.01.05:Troll Masters:1:Edvardsen,R:Carlsen,Magnus · middlegame · ply 24 · black vs Edvardsen,R · result 1/2-1/2 · historical move dxc4 (d5c4)
  - FEN: `3r1rk1/pp1nqppp/2pbpn2/3p4/2PP4/1PNQPN2/PB3PPP/3RR1K1 b - - 8 12`
- Carlsen.pgn:2001.01.05:Troll Masters:1:Edvardsen,R:Carlsen,Magnus · endgame · ply 36 · black vs Edvardsen,R · result 1/2-1/2 · historical move Qxd8 (e7d8)
  - FEN: `3R2k1/pp2qppp/2p2n2/4b3/2P5/2N1P3/PB2QPPP/6K1 b - - 0 18`
- Carlsen.pgn:2001.04.08:Open NOR-ch:2:Carlsen,M:Sollid,Stein · opening · ply 9 · white vs Sollid,Stein · result 0-1 · historical move dxe4 (d3e4)
  - FEN: `r1bqkbnr/pppp2pp/2n5/1B2p3/4p3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5`
- Carlsen.pgn:2001.04.08:Open NOR-ch:2:Carlsen,M:Sollid,Stein · middlegame · ply 15 · white vs Sollid,Stein · result 0-1 · historical move Bg5 (c1g5)
  - FEN: `r1bqk2r/ppp1b1pp/2np1n2/1B2p3/4P3/2N2N2/PPP2PPP/R1BQ1RK1 w kq - 2 8`
- Carlsen.pgn:2001.04.08:Open NOR-ch:2:Carlsen,M:Sollid,Stein · middlegame · ply 27 · white vs Sollid,Stein · result 0-1 · historical move Nd2 (f3d2)
  - FEN: `r4rk1/pppqn2p/3pbp2/4p3/4P3/2P2N2/PP2BPPP/R2Q1RK1 w - - 0 14`
- Carlsen.pgn:2001.04.08:Open NOR-ch:2:Carlsen,M:Sollid,Stein · endgame · ply 41 · white vs Sollid,Stein · result 0-1 · historical move Nb3 (d2b3)
  - FEN: `2b1rrk1/ppp4p/2q5/3p1n2/4p1B1/2P5/PP1NQPPP/3R1R1K w - - 4 21`
- Carlsen.pgn:2001.04.17:Classics IMA:3:Hersvik,D:Carlsen,M · opening · ply 10 · black vs Hersvik,D · result 1/2-1/2 · historical move Bg7 (f8g7)
  - FEN: `r1bqkb1r/pp1ppp1p/2n2np1/2p5/2P5/2N2NP1/PP1PPPBP/R1BQK2R b KQkq - 1 5`
- Carlsen.pgn:2001.04.17:Classics IMA:3:Hersvik,D:Carlsen,M · middlegame · ply 28 · black vs Hersvik,D · result 1/2-1/2 · historical move Ne8 (f6e8)
  - FEN: `1r1q1rk1/3bppbp/2np1np1/1p6/1P6/2NP1NPP/3BPPB1/1R1Q1RK1 b - - 2 14`
- Carlsen.pgn:2001.04.17:Classics IMA:3:Hersvik,D:Carlsen,M · middlegame · ply 52 · black vs Hersvik,D · result 1/2-1/2 · historical move Bf6 (c3f6)
  - FEN: `2rqr1k1/4pp2/3p2p1/1p3bN1/1P6/2bPP2P/4QPB1/1R3RK1 b - - 2 26`
- Carlsen.pgn:2001.04.17:Classics IMA:3:Hersvik,D:Carlsen,M · endgame · ply 78 · black vs Hersvik,D · result 1/2-1/2 · historical move Rxg1 (g3g1)
  - FEN: `2r5/3q1pk1/4p1p1/1p1p4/1P1P1P1b/4P1rP/4Q2K/1R3BR1 b - - 6 39`
- Carlsen.pgn:2001.08.07:Nordic Championships:4:Carlsen,M:Miellet Bensan,Y · opening · ply 9 · white vs Miellet Bensan,Y · result 0-1 · historical move Nc3 (b1c3)
  - FEN: `r1bqkb1r/pp1ppppp/2n2n2/8/3NP3/8/PPP2PPP/RNBQKB1R w KQkq - 1 5`
- Carlsen.pgn:2001.08.07:Nordic Championships:4:Carlsen,M:Miellet Bensan,Y · middlegame · ply 27 · white vs Miellet Bensan,Y · result 0-1 · historical move cxd5 (c4d5)
  - FEN: `r2qk2r/5pbp/p1np4/1p1bpp2/2P1P3/N2B4/PP3PPP/R2Q1RK1 w kq - 0 14`
- Carlsen.pgn:2001.08.07:Nordic Championships:4:Carlsen,M:Miellet Bensan,Y · middlegame · ply 53 · white vs Miellet Bensan,Y · result 0-1 · historical move Qg4 (g3g4)
  - FEN: `4rrk1/5p1p/pq1p2n1/3PbR2/7P/3B2Q1/1PN3P1/5R1K w - - 1 27`
- Carlsen.pgn:2001.08.07:Nordic Championships:4:Carlsen,M:Miellet Bensan,Y · endgame · ply 79 · white vs Miellet Bensan,Y · result 0-1 · historical move Kg3 (h2g3)
  - FEN: `3r3k/8/R2p3p/3Pn2P/8/8/6PK/8 w - - 1 40`
- Carlsen.pgn:2001.09.27:ECC:5:Carlsen,M:Indrebo,Kyrre · opening · ply 9 · white vs Indrebo,Kyrre · result 1-0 · historical move O-O (e1g1)
  - FEN: `rnbqk2r/ppppp1bp/5np1/5p2/3P4/5NP1/PPP1PPBP/RNBQK2R w KQkq - 2 5`
- Carlsen.pgn:2001.09.27:ECC:5:Carlsen,M:Indrebo,Kyrre · middlegame · ply 19 · white vs Indrebo,Kyrre · result 1-0 · historical move Nc3 (b1c3)
  - FEN: `r1bq1rk1/ppp3bp/2np2p1/4Pp2/2P3n1/BP3NP1/P3PPBP/RN1Q1RK1 w - - 3 10`
- Carlsen.pgn:2001.09.27:ECC:5:Carlsen,M:Indrebo,Kyrre · middlegame · ply 37 · white vs Indrebo,Kyrre · result 1-0 · historical move Qc1 (d1c1)
  - FEN: `r1b2rk1/ppp4p/2nq4/2RN2p1/8/1P2P1P1/P4PB1/3Q1RK1 w - - 1 19`
- Carlsen.pgn:2001.09.27:ECC:5:Carlsen,M:Indrebo,Kyrre · endgame · ply 53 · white vs Indrebo,Kyrre · result 1-0 · historical move Bxd5 (g2d5)
  - FEN: `r1br4/ppR4p/6k1/3p4/3R2p1/1P2P1P1/P4PB1/6K1 w - - 2 27`
- Carlsen.pgn:2002.01.06:Troll Masters:3:Womacka,M:Carlsen,M · opening · ply 10 · black vs Womacka,M · result 1-0 · historical move Qc7 (d8c7)
  - FEN: `rnbqkbnr/1p1p1ppp/p3p3/8/3NP3/3B4/PPP2PPP/RNBQK2R b KQkq - 1 5`
- Carlsen.pgn:2002.01.06:Troll Masters:3:Womacka,M:Carlsen,M · middlegame · ply 28 · black vs Womacka,M · result 1-0 · historical move Rd8 (a8d8)
  - FEN: `r3kb1r/1q2nppp/p1b1p3/1pp1P3/2P5/3B1PB1/PP1NQ1PP/R4RK1 b kq - 0 14`
- Carlsen.pgn:2002.01.06:Troll Masters:3:Womacka,M:Carlsen,M · middlegame · ply 56 · black vs Womacka,M · result 1-0 · historical move Ke7 (e8e7)
  - FEN: `2r1k3/5pp1/6p1/p3P2r/1pP5/1P6/P5PP/R3R1K1 b - - 1 28`
- Carlsen.pgn:2002.01.06:Troll Masters:3:Womacka,M:Carlsen,M · endgame · ply 82 · black vs Womacka,M · result 1-0 · historical move Rxa2 (d2a2)
  - FEN: `8/4kpp1/6p1/4P3/R1P5/pP4K1/P2r2PP/8 b - - 6 41`

### Most frequent source lines as White

- 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O Nxe4 5.Re1 Nd6 6.Nxe5 Be7 7.Bf1 Nxe5 8.Rxe5 O-O · observed in 30 source games · ECO C67
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O Nxe4 5.d4 Nd6 6.Bxc6 dxc6 7.dxe5 Nf5 8.Qxd8+ Kxd8 · observed in 11 source games · ECO C67
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.a4 b4 · observed in 9 source games · ECO C88
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O · observed in 8 source games · ECO C95
- 1.d4 Nf6 2.c4 e6 3.Nf3 d5 4.g3 Be7 5.Bg2 O-O 6.O-O dxc4 7.Qc2 a6 8.a4 Bd7 · observed in 7 source games · ECO E06
- 1.d4 Nf6 2.c4 e6 3.Nf3 d5 4.Nc3 c5 5.cxd5 cxd4 6.Qxd4 exd5 7.e4 dxe4 8.Qxd8+ Kxd8 · observed in 7 source games · ECO D41
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.d3 d6 6.c3 g6 7.O-O Bg7 8.Re1 O-O · observed in 7 source games · ECO C77
- 1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e5 6.Ndb5 d6 7.Bg5 a6 8.Na3 b5 · observed in 6 source games · ECO B33
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.d3 b5 7.Bb3 d6 8.a4 Bd7 · observed in 6 source games · ECO C84
- 1.e4 e5 2.Nf3 Nc6 3.Nc3 Nf6 4.d4 exd4 5.Nxd4 Bb4 6.Nxc6 bxc6 7.Bd3 O-O 8.O-O d5 · observed in 6 source games · ECO C47
- 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O 6.Be2 e5 7.O-O h6 8.Re1 Nbd7 · observed in 5 source games · ECO E94
- 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O 6.Be2 e5 7.O-O Nc6 8.d5 Ne7 · observed in 5 source games · ECO E97

### Most frequent source lines as Black

- 1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e5 6.Ndb5 d6 7.Bg5 a6 8.Na3 b5 · observed in 38 source games · ECO B33
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O Nxe4 5.d4 Nd6 6.Bxc6 dxc6 7.dxe5 Nf5 8.Qxd8+ Kxd8 · observed in 30 source games · ECO C67
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O · observed in 15 source games · ECO C95
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.c3 d5 · observed in 14 source games · ECO C89
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.a4 Bb7 · observed in 12 source games · ECO C88
- 1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e5 6.Ndb5 d6 7.Nd5 Nxd5 8.exd5 Ne7 · observed in 8 source games · ECO B33
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.d3 b5 7.Bb3 d6 8.a3 O-O · observed in 8 source games · ECO C84
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.c3 d6 · observed in 8 source games · ECO C95
- 1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e5 6.Ndb5 d6 7.Nd5 Nxd5 8.exd5 Nb8 · observed in 7 source games · ECO B33
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.a4 Rb8 · observed in 7 source games · ECO C88
- 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d4 exd4 6.e5 d5 7.Bb5 Ne4 8.cxd4 Bb6 · observed in 7 source games · ECO C53
- 1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.Qc2 d5 5.a3 Bxc3+ 6.Qxc3 Ne4 7.Qc2 c5 8.dxc5 Nc6 · observed in 6 source games · ECO E37

### Phrase archive

- general: השחקן הטוב בכל הזמנים: אני ממשיך ליצור בעיות גם בעמדה שנראית שווה. / השחקן הטוב בכל הזמנים: אני לוחץ על חולשה קטנה עד שהיריב נאלץ לקבל החלטה קשה.
- opening: השחקן הטוב בכל הזמנים: אני בוחר מבנה שאפשר לשחק לאורך זמן ולא רק לזכור בעל פה. / השחקן הטוב בכל הזמנים: אם היריב יוצא מהתיאוריה, אני מחפש עמדה נוחה להמשך מעשי.
- threat: השחקן הטוב בכל הזמנים: אני מגדיל לחץ על יעד קבוע במקום למהר להתקפה לא מבוססת. / השחקן הטוב בכל הזמנים: אני מחפש את ההגנה המדויקת ביותר של היריב לפני שאני מעלה לחץ.
- tactics: השחקן הטוב בכל הזמנים: אני לא מכריח שילוב אם מהלך שקט שומר על יתרון. / השחקן הטוב בכל הזמנים: אני בודק משאבים טקטיים גם בעמדות שקטות ובסופים ארוכים.
- endgame: השחקן הטוב בכל הזמנים: אני שומר על כלים פעילים וממשיך לבדוק טעויות קטנות. / השחקן הטוב בכל הזמנים: בסיום אני משפר את המלך והכלי הגרוע ביותר לפני יצירת יעד נוסף.

---

## Bobby Fischer (fischer)

- Source PGN: Fischer.pgn
- Internal bot rating parameter: 2785 (Peak FIDE rating 2785 (1972))
- Rating source: https://www.chess.com/blog/CurvySmile/list-of-chess-players-by-peak-fide-rating
- Valid games attributed to the player: 825
- Training / holdout games: 742 / 83
- Holdout captures/checks per 100 player moves: 22.55 / 5.74
- Date range: 1955–1992
- Results from the player perspective: 479 wins, 255 draws, 91 losses
- Games as White / Black: 431 / 394
- Average game length: 81.62 plies
- Captures per 100 player moves: 21.81
- Checks per 100 player moves: 5.78
- King moves after ply 40 per 100 player moves: 8.27
- Opening diversity: 317 White lines and 303 Black lines
- Working style hypothesis: עמדתי ודיוק. דיוק, פעילות כלים והכנה לפתיחה; סיווג זה הוא נקודת פתיחה לבדיקת holdout.

### Representative source games

- Fischer.pgn:1955.??.??:USA-chJ:?:Whisler, W.:Fischer, Robert James · 1955.??.?? · USA-chJ · round ? · split training · black · vs Whisler, W. · result 1/2-1/2 · ECO E81
  - Source move sample: 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.f3 O-O 6.Bg5 Nbd7 7.Qd2 e5 8.d5 a5
- Fischer.pgn:1956.??.??:CAN-op:?:Sobel, Robert:Fischer, Robert James · 1956.??.?? · CAN-op · round ? · split holdout · black · vs Sobel, Robert · result 1-0 · ECO B70
  - Source move sample: 1.d4 Nf6 2.Nf3 g6 3.g3 Bg7 4.Bg2 O-O 5.O-O d6 6.Nc3 c5 7.e4 cxd4 8.Nxd4 Nc6
- Fischer.pgn:1955.??.??:USA-chJ:?:Thomason, J.:Fischer, Robert James · 1955.??.?? · USA-chJ · round ? · split holdout · black · vs Thomason, J. · result 0-1 · ECO E91
  - Source move sample: 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O 6.Bd3 Bg4 7.O-O Nc6 8.Be3 Nd7
- Fischer.pgn:1955.??.??:USA-chJ:?:Fischer, Robert James:Ames, D. · 1955.??.?? · USA-chJ · round ? · split training · white · vs Ames, D. · result 1/2-1/2 · ECO C55
  - Source move sample: 1.e4 e5 2.Nf3 Nc6 3.Nc3 Nf6 4.Bc4 Nxe4 5.Bxf7+ Kxf7 6.Nxe4 d5 7.Neg5+ Kg8 8.d4 h6
- Fischer.pgn:1955.??.??:USA-chJ:?:Fischer, Robert James:Warner, K. · 1955.??.?? · USA-chJ · round ? · split training · white · vs Warner, K. · result 0-1 · ECO B72
  - Source move sample: 1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 d6 6.Be2 g6 7.Be3 Bg7 8.f3 O-O
- Fischer.pgn:1956.??.??:CAN-op:?:Fischer, Robert James:Sharp, C. · 1956.??.?? · CAN-op · round ? · split training · white · vs Sharp, C. · result 1-0 · ECO C84
  - Source move sample: 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O b5 6.Bb3 Be7 7.d4 d6 8.c3 O-O

### Held-out positions not used to build the repertoire

- Fischer.pgn:1955.??.??:USA-chJ:?:Thomason, J.:Fischer, Robert James · opening · ply 10 · black vs Thomason, J. · result 0-1 · historical move O-O (e8g8)
  - FEN: `rnbqk2r/ppp1ppbp/3p1np1/8/2PPP3/2N2N2/PP3PPP/R1BQKB1R b KQkq - 1 5`
- Fischer.pgn:1955.??.??:USA-chJ:?:Thomason, J.:Fischer, Robert James · middlegame · ply 14 · black vs Thomason, J. · result 0-1 · historical move Nc6 (b8c6)
  - FEN: `rn1q1rk1/ppp1ppbp/3p1np1/8/2PPP1b1/2NB1N2/PP3PPP/R1BQ1RK1 b - - 5 7`
- Fischer.pgn:1955.??.??:USA-chJ:?:Thomason, J.:Fischer, Robert James · middlegame · ply 24 · black vs Thomason, J. · result 0-1 · historical move f5 (f7f5)
  - FEN: `r2q1rk1/pppnnpbp/3p2p1/3Pp3/2P1P3/2N1B3/PP2BPPP/R2Q1RK1 b - - 2 12`
- Fischer.pgn:1955.??.??:USA-chJ:?:Thomason, J.:Fischer, Robert James · endgame · ply 36 · black vs Thomason, J. · result 0-1 · historical move Ne5 (d7e5)
  - FEN: `r2q1r2/pppn2bk/3p2pp/3P1n2/2P1NB2/3B4/PP2Q1PP/R4RK1 b - - 0 18`
- Fischer.pgn:1956.??.??:CAN-op:?:Sobel, Robert:Fischer, Robert James · opening · ply 10 · black vs Sobel, Robert · result 1-0 · historical move d6 (d7d6)
  - FEN: `rnbq1rk1/ppppppbp/5np1/8/3P4/5NP1/PPP1PPBP/RNBQ1RK1 b - - 4 5`
- Fischer.pgn:1956.??.??:CAN-op:?:Sobel, Robert:Fischer, Robert James · middlegame · ply 16 · black vs Sobel, Robert · result 1-0 · historical move Nc6 (b8c6)
  - FEN: `rnbq1rk1/pp2ppbp/3p1np1/8/3NP3/2N3P1/PPP2PBP/R1BQ1RK1 b - - 0 8`
- Fischer.pgn:1956.??.??:CAN-op:?:Sobel, Robert:Fischer, Robert James · middlegame · ply 28 · black vs Sobel, Robert · result 1-0 · historical move Rd8 (f8d8)
  - FEN: `r1q2rk1/pp2ppbp/2n2np1/3P4/8/1PN2PP1/PBP1N1KP/R2Q1R2 b - - 0 14`
- Fischer.pgn:1956.??.??:CAN-op:?:Sobel, Robert:Fischer, Robert James · endgame · ply 42 · black vs Sobel, Robert · result 1-0 · historical move Qf5 (e6f5)
  - FEN: `r2r4/pp2ppkp/4qnp1/8/2P2N2/PP3PP1/1Q4KP/R4R2 b - - 4 21`
- Fischer.pgn:1956.??.??:New York Rosenwald:?:Reshevsky, Samuel Herman:Fischer, Robert James · opening · ply 10 · black vs Reshevsky, Samuel Herman · result 1-0 · historical move d6 (d7d6)
  - FEN: `rnbq1rk1/ppppppbp/5np1/8/2PP4/2N3P1/PP2PPBP/R1BQK1NR b KQ - 4 5`
- Fischer.pgn:1956.??.??:New York Rosenwald:?:Reshevsky, Samuel Herman:Fischer, Robert James · middlegame · ply 18 · black vs Reshevsky, Samuel Herman · result 1-0 · historical move b5 (b7b5)
  - FEN: `1rbq1rk1/1pp1ppbp/p1np1np1/8/2PP4/1PN2NP1/PB2PPBP/R2Q1RK1 b - - 2 9`
- Fischer.pgn:1956.??.??:New York Rosenwald:?:Reshevsky, Samuel Herman:Fischer, Robert James · middlegame · ply 32 · black vs Reshevsky, Samuel Herman · result 1-0 · historical move Bf5 (c8f5)
  - FEN: `1rbq1rk1/1np1pp1p/3p1bp1/8/1P1P4/2B2NP1/P4PBP/2RQ1RK1 b - - 0 16`
- Fischer.pgn:1956.??.??:New York Rosenwald:?:Reshevsky, Samuel Herman:Fischer, Robert James · endgame · ply 48 · black vs Reshevsky, Samuel Herman · result 1-0 · historical move Ng4 (e5g4)
  - FEN: `1rr3k1/2pqp2p/3p1pp1/3Pnb2/1P1N1P2/P1R1Q1P1/6BP/5RK1 b - - 0 24`
- Fischer.pgn:1956.??.??:USA-ch Juniors:?:Grossguth, C.:Fischer, Robert James · opening · ply 10 · black vs Grossguth, C. · result 0-1 · historical move a6 (a7a6)
  - FEN: `rnbqkb1r/pp2pppp/3p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R b KQkq - 2 5`
- Fischer.pgn:1956.??.??:USA-ch Juniors:?:Grossguth, C.:Fischer, Robert James · middlegame · ply 16 · black vs Grossguth, C. · result 0-1 · historical move O-O (e8g8)
  - FEN: `rnbqk2r/1p2bppp/p2p1n2/4p3/4P3/1NN1B3/PPP1BPPP/R2QK2R b KQkq - 3 8`
- Fischer.pgn:1956.??.??:USA-ch Juniors:?:Grossguth, C.:Fischer, Robert James · middlegame · ply 30 · black vs Grossguth, C. · result 0-1 · historical move Rxd8 (f8d8)
  - FEN: `rn1Q1rk1/5ppp/p3bb2/1p2p3/4P3/1NN1pP2/PPP1B2P/2KR3R b - - 0 15`
- Fischer.pgn:1956.??.??:USA-ch Juniors:?:Grossguth, C.:Fischer, Robert James · endgame · ply 46 · black vs Grossguth, C. · result 0-1 · historical move Bf4 (g5f4)
  - FEN: `3r2k1/6pp/p3p3/4p1b1/Np1rP3/3BpP2/PPP1K2P/5R2 b - - 5 23`
- Fischer.pgn:1956.??.??:USA-op:?:Fischer, Robert James:Popel, Stephan A · opening · ply 9 · white vs Popel, Stephan A · result 1/2-1/2 · historical move d3 (d2d3)
  - FEN: `rnbq1rk1/ppppppbp/5np1/8/8/5NP1/PPPPPPBP/RNBQ1RK1 w - - 4 5`
- Fischer.pgn:1956.??.??:USA-op:?:Fischer, Robert James:Popel, Stephan A · middlegame · ply 21 · white vs Popel, Stephan A · result 1/2-1/2 · historical move Nfd2 (f3d2)
  - FEN: `1r1q1rk1/1p2ppbp/p1npbnp1/P1p5/2N1P3/3P1NP1/1PP2PBP/R1BQ1RK1 w - - 1 11`
- Fischer.pgn:1956.??.??:USA-op:?:Fischer, Robert James:Popel, Stephan A · middlegame · ply 39 · white vs Popel, Stephan A · result 1/2-1/2 · historical move Bxg7 (e5g7)
  - FEN: `2r2rk1/1p2ppbp/p5p1/P2nB3/2Np4/3P1KP1/1PP2P1P/R4R2 w - - 1 20`
- Fischer.pgn:1956.??.??:USA-op:?:Fischer, Robert James:Popel, Stephan A · endgame · ply 59 · white vs Popel, Stephan A · result 1/2-1/2 · historical move f4 (f2f4)
  - FEN: `3n4/1pr1kp1p/pR2p1p1/P2r4/2Np4/1R1P2P1/1PPK1P1P/8 w - - 16 30`
- Fischer.pgn:1957.??.??:East Orange:?:Fischer, Robert James:Saidy, Anthony Fred · opening · ply 9 · white vs Saidy, Anthony Fred · result 1-0 · historical move Nc3 (b1c3)
  - FEN: `r1bqkb1r/pp1ppppp/2n2n2/8/3NP3/8/PPP2PPP/RNBQKB1R w KQkq - 1 5`
- Fischer.pgn:1957.??.??:East Orange:?:Fischer, Robert James:Saidy, Anthony Fred · middlegame · ply 15 · white vs Saidy, Anthony Fred · result 1-0 · historical move O-O (e1g1)
  - FEN: `r2qkb1r/pp1b1ppp/2nppn2/8/3NP3/1BN5/PPP2PPP/R1BQK2R w KQkq - 0 8`
- Fischer.pgn:1957.??.??:East Orange:?:Fischer, Robert James:Saidy, Anthony Fred · middlegame · ply 27 · white vs Saidy, Anthony Fred · result 1-0 · historical move Nxa7 (b5a7)
  - FEN: `r2q1rk1/p3bppp/3ppn2/1N6/3BbP2/1B6/PPP1Q1PP/R4RK1 w - - 0 14`
- Fischer.pgn:1957.??.??:East Orange:?:Fischer, Robert James:Saidy, Anthony Fred · endgame · ply 41 · white vs Saidy, Anthony Fred · result 1-0 · historical move Bb6 (e3b6)
  - FEN: `5rk1/4bppp/2b2n2/r3p3/7q/1BN1B3/PPPRQ1PP/5RK1 w - - 10 21`

### Most frequent source lines as White

- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O · observed in 9 source games · ECO C95
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O · observed in 8 source games · ECO C92
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.c3 d5 · observed in 7 source games · ECO C89
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O · observed in 6 source games · ECO C98
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O · observed in 6 source games · ECO C97
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.c3 d6 · observed in 5 source games · ECO C92
- 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 Nc6 6.Bc4 e6 7.Bb3 Be7 8.Be3 O-O · observed in 4 source games · ECO B88
- 1.e4 c6 2.Nc3 d5 3.Nf3 Bg4 4.h3 Bxf3 5.Qxf3 Nf6 6.d3 e6 7.g3 Bb4 8.Bd2 d4 · observed in 4 source games · ECO B11
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O · observed in 4 source games · ECO C96
- 1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 g6 5.c4 Nf6 6.Nc3 Nxd4 7.Qxd4 d6 8.Be2 Bg7 · observed in 3 source games · ECO B36
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O · observed in 3 source games · ECO C93
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.c3 d6 · observed in 3 source games · ECO C98

### Most frequent source lines as Black

- 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Bg5 e6 7.f4 Be7 8.Qf3 Qc7 · observed in 10 source games · ECO B99
- 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Bg5 e6 7.f4 Qb6 8.Qd2 Qxb2 · observed in 9 source games · ECO B97
- 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be2 e5 7.Nb3 Be7 8.O-O O-O · observed in 6 source games · ECO B92
- 1.d4 Nf6 2.c4 g6 3.g3 Bg7 4.Bg2 O-O 5.Nc3 d6 6.Nf3 Nc6 7.O-O e5 8.d5 Ne7 · observed in 3 source games · ECO E62
- 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.f3 e5 6.Nge2 O-O 7.Bg5 c6 8.Qd2 Qa5 · observed in 3 source games · ECO E81
- 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.f3 O-O 6.Be3 Nc6 7.Nge2 a6 8.h4 h5 · observed in 3 source games · ECO E83
- 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be2 e5 7.Nb3 Be6 8.O-O Nbd7 · observed in 3 source games · ECO B92
- 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.f4 e5 7.Nf3 Qc7 8.Bd3 Nbd7 · observed in 3 source games · ECO B93
- 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.g3 e5 7.Nde2 Be7 8.Bg2 O-O · observed in 3 source games · ECO B91
- 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Be2 O-O 6.Bg5 c5 7.d5 e6 8.Nf3 h6 · observed in 2 source games · ECO A72
- 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Be2 O-O 6.Bg5 h6 7.Be3 c5 8.d5 e6 · observed in 2 source games · ECO E74
- 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Be2 O-O 6.Nf3 e5 7.d5 Nbd7 8.Bg5 h6 · observed in 2 source games · ECO E93

### Phrase archive

- general: חפש את הרעיון שמחבר בין הפתיחה לתוכנית האמצע. / Bobby Fischer: שפר את הכלי הפחות פעיל לפני יצירת חולשה. / בדוק את איומי שני הצדדים לפני בחירת מהלך.
- opening: שכיחות מהלך במשחקים היסטוריים אינה הוכחה שהוא הטוב ביותר. / Bobby Fischer: פתח לפי תוכנית מבנית ולא רק לפי זיכרון. / השתמש ברפרטואר כנקודת התחלה, לא כהתחייבות עיוורת.
- threat: לפני בחירה טקטית, בדוק את התגובה הכפויה של היריב. / Bobby Fischer: מנע את התוכנית של היריב כשאפשר לעשות זאת בלי לוותר על פעילות. / איום טוב הוא איום ששורד את ההגנה הטובה ביותר.
- tactics: שמור על איכות המהלך גם כאשר אתה מעדיף סגנון מסוים. / Bobby Fischer: חשב טקטיקה לפני מעבר לתמרון איטי. / אל תקריב חומר ללא תמורה שניתן להסביר.
- endgame: בסיומים, בדוק פעילות המלך והרגלים החופשיים. / Bobby Fischer: נצל חולשות, פעילות מלך ורגלים חופשיים. / בדוק פעילות מלך, רגלים חופשיים וחולשות לפני חילופים.

---

## Anatoly Karpov (karpov)

- Source PGN: Karpov.pgn
- Internal bot rating parameter: 2780 (Peak FIDE rating 2780 (1994))
- Rating source: https://www.chess.com/blog/CurvySmile/list-of-chess-players-by-peak-fide-rating
- Valid games attributed to the player: 3525
- Training / holdout games: 3173 / 352
- Holdout captures/checks per 100 player moves: 19.82 / 4.15
- Date range: 1961–2022
- Results from the player perspective: 1367 wins, 1651 draws, 496 losses
- Games as White / Black: 1882 / 1643
- Average game length: 83.66 plies
- Captures per 100 player moves: 19.94
- Checks per 100 player moves: 4.25
- King moves after ply 40 per 100 player moves: 8.34
- Opening diversity: 1364 White lines and 1074 Black lines
- Working style hypothesis: עמדתי. לחץ עמדתי, מניעת תוכניות היריב ושיפור כלים; נדרש אימות מול משחקי holdout.

### Representative source games

- Karpov.pgn:1961.??.??:Zlatoust:?:Kalashnikov, Viacheslav:Karpov, Anatoly · 1961.??.?? · Zlatoust · round ? · split training · black · vs Kalashnikov, Viacheslav · result 1/2-1/2 · ECO A30
  - Source move sample: 1.d4 Nf6 2.Nf3 e6 3.c4 b6 4.g3 Bb7 5.Bg2 c5 6.O-O Be7 7.Nc3 cxd4 8.Nxd4 Bxg2
- Karpov.pgn:1961.??.??:Zlatoust:?:Tarinin, X.:Karpov, Anatoly · 1961.??.?? · Zlatoust · round ? · split training · black · vs Tarinin, X. · result 1-0 · ECO C97
  - Source move sample: 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O
- Karpov.pgn:1961.??.??:Zlatoust:?:Zadneprovsky:Karpov, Anatoly · 1961.??.?? · Zlatoust · round ? · split holdout · black · vs Zadneprovsky · result 0-1 · ECO E27
  - Source move sample: 1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.a3 Bxc3+ 5.bxc3 O-O 6.Bg5 h6 7.Bh4 d5 8.e3 b6
- Karpov.pgn:1961.??.??:Zlatoust:?:Karpov, Anatoly:Alekseev, V. · 1961.??.?? · Zlatoust · round ? · split training · white · vs Alekseev, V. · result 1/2-1/2 · ECO B40
  - Source move sample: 1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nf6 5.f3 d5 6.exd5 Nxd5 7.Bb5+ Bd7 8.Bxd7+ Nxd7
- Karpov.pgn:1969.??.??:URS-ch U18 playoff:7:Karpov, Anatoly:Vaganian, Rafael A · 1969.??.?? · URS-ch U18 playoff · round 7 · split training · white · vs Vaganian, Rafael A · result 0-1 · ECO B04
  - Source move sample: 1.e4 Nf6 2.e5 Nd5 3.d4 d6 4.Nf3 g6 5.Be2 Bg7 6.c4 Nb6 7.exd6 cxd6 8.h3 O-O
- Karpov.pgn:1998.02.28:EE Internet sim:?:Karpov, Anatoly:Mellul, P. · 1998.02.28 · EE Internet sim · round ? · split training · white · vs Mellul, P. · result * · ECO D79
  - Source move sample: 1.d4 Nf6 2.c4 g6 3.Nf3 Bg7 4.g3 O-O 5.Bg2 c6 6.Nc3 d5 7.cxd5 cxd5 8.Ne5 Nc6
- Karpov.pgn:1961.??.??:Zlatoust:?:Karpov, Anatoly:Ponomariov, Boris · 1961.??.?? · Zlatoust · round ? · split holdout · white · vs Ponomariov, Boris · result 1-0 · ECO C01
  - Source move sample: 1.e4 e6 2.d4 d5 3.exd5 exd5 4.Nf3 Nf6 5.Bd3 Bg4 6.O-O Be7 7.Re1 O-O 8.Bg5 Nbd7

### Held-out positions not used to build the repertoire

- Karpov.pgn:1961.??.??:Zlatoust:?:Karpov, Anatoly:Ponomariov, Boris · opening · ply 9 · white vs Ponomariov, Boris · result 1-0 · historical move Bd3 (f1d3)
  - FEN: `rnbqkb1r/ppp2ppp/5n2/3p4/3P4/5N2/PPP2PPP/RNBQKB1R w KQkq - 2 5`
- Karpov.pgn:1961.??.??:Zlatoust:?:Karpov, Anatoly:Ponomariov, Boris · middlegame · ply 41 · white vs Ponomariov, Boris · result 1-0 · historical move Nxc4 (e5c4)
  - FEN: `r5k1/pp4pp/3qr1p1/3pN3/2pPn3/2P5/PPQ2PPP/R3R1K1 w - - 4 21`
- Karpov.pgn:1961.??.??:Zlatoust:?:Karpov, Anatoly:Ponomariov, Boris · middlegame · ply 81 · white vs Ponomariov, Boris · result 1-0 · historical move f4 (f3f4)
  - FEN: `7k/p4rp1/8/1p1N1nqp/3P4/2P2P1P/PP3QP1/4R1K1 w - - 3 41`
- Karpov.pgn:1961.??.??:Zlatoust:?:Karpov, Anatoly:Ponomariov, Boris · endgame · ply 119 · white vs Ponomariov, Boris · result 1-0 · historical move d6 (d5d6)
  - FEN: `7k/q5p1/5n2/3P1P1p/1pP2Q1P/4N1PK/1P6/8 w - - 1 60`
- Karpov.pgn:1961.??.??:Zlatoust:?:Zadneprovsky:Karpov, Anatoly · opening · ply 10 · black vs Zadneprovsky · result 0-1 · historical move O-O (e8g8)
  - FEN: `rnbqk2r/pppp1ppp/4pn2/8/2PP4/P1P5/4PPPP/R1BQKBNR b KQkq - 0 5`
- Karpov.pgn:1961.??.??:Zlatoust:?:Zadneprovsky:Karpov, Anatoly · middlegame · ply 34 · black vs Zadneprovsky · result 0-1 · historical move f6 (f7f6)
  - FEN: `r2q1r2/p1pn1pk1/1p2p2p/3p2p1/3P1P2/P1P1P1B1/2Q3PP/R3KR2 b Q - 0 17`
- Karpov.pgn:1961.??.??:Zlatoust:?:Zadneprovsky:Karpov, Anatoly · middlegame · ply 66 · black vs Zadneprovsky · result 0-1 · historical move Nf2 (g4f2)
  - FEN: `4r3/p1p2k1r/1p3p1p/3p1q1P/6n1/P1P5/1K4P1/3QB2R b - - 1 33`
- Karpov.pgn:1961.??.??:Zlatoust:?:Zadneprovsky:Karpov, Anatoly · endgame · ply 100 · black vs Zadneprovsky · result 0-1 · historical move f4 (f5f4)
  - FEN: `7Q/3kr3/1p1q4/2pp1prp/P7/1KP5/3R4/8 b - - 1 50`
- Karpov.pgn:1967.??.??:EU-ch casual:?:Ciric, Dragoljub M:Karpov, Anatoly · opening · ply 10 · black vs Ciric, Dragoljub M · result 1/2-1/2 · historical move Be7 (f8e7)
  - FEN: `r1bqkb1r/1ppp1ppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 3 5`
- Karpov.pgn:1967.??.??:EU-ch casual:?:Ciric, Dragoljub M:Karpov, Anatoly · middlegame · ply 18 · black vs Ciric, Dragoljub M · result 1/2-1/2 · historical move Na5 (c6a5)
  - FEN: `r1bq1rk1/2p1bppp/p1np1n2/1p2p3/4P3/1BP2N1P/PP1P1PP1/RNBQR1K1 b - - 0 9`
- Karpov.pgn:1967.??.??:EU-ch casual:?:Ciric, Dragoljub M:Karpov, Anatoly · middlegame · ply 34 · black vs Ciric, Dragoljub M · result 1/2-1/2 · historical move cxb4 (c5b4)
  - FEN: `r3rnk1/1bq1bp1p/p2p2pB/npp1p1N1/1P2P3/2PP2NP/P1B2PP1/R2QR1K1 b - - 0 17`
- Karpov.pgn:1967.??.??:EU-ch casual:?:Ciric, Dragoljub M:Karpov, Anatoly · endgame · ply 50 · black vs Ciric, Dragoljub M · result 1/2-1/2 · historical move dxe4 (d5e4)
  - FEN: `2r1rnk1/1b3p1p/p2qn1pB/1p1pp3/1P2P3/P2PQ2P/4NPP1/R2BR1K1 b - - 0 25`
- Karpov.pgn:1967.??.??:EU-ch U18 sf 6768:5:Zara, Dan:Karpov, Anatoly · opening · ply 10 · black vs Zara, Dan · result 1/2-1/2 · historical move Qe7 (d8e7)
  - FEN: `rnbqkb1r/ppp2ppp/3p4/8/4n3/5N2/PPPPQPPP/RNB1KB1R b KQkq - 1 5`
- Karpov.pgn:1967.??.??:EU-ch U18 sf 6768:5:Zara, Dan:Karpov, Anatoly · middlegame · ply 12 · black vs Zara, Dan · result 1/2-1/2 · historical move Nf6 (e4f6)
  - FEN: `rnb1kb1r/ppp1qppp/3p4/8/4n3/3P1N2/PPP1QPPP/RNB1KB1R b KQkq - 0 6`
- Karpov.pgn:1967.??.??:EU-ch U18 sf 6768:5:Zara, Dan:Karpov, Anatoly · middlegame · ply 22 · black vs Zara, Dan · result 1/2-1/2 · historical move a6 (a7a6)
  - FEN: `r1b1k2r/pppnbpp1/3p1n1p/8/7B/2NP1N2/PPP1BPPP/2KR3R b kq - 2 11`
- Karpov.pgn:1967.??.??:EU-ch U18 sf 6768:5:Zara, Dan:Karpov, Anatoly · endgame · ply 32 · black vs Zara, Dan · result 1/2-1/2 · historical move Kxe8 (f8e8)
  - FEN: `r1b1Rk2/1ppn1pp1/p2p1b1p/8/7B/3P1N2/PPP2PPP/2KR1B2 b - - 0 16`
- Karpov.pgn:1968.??.??:URS-chT:?:Karpov, Anatoly:Mikliaev, I. · opening · ply 9 · white vs Mikliaev, I. · result 1-0 · historical move c3 (c2c3)
  - FEN: `r1bqkbnr/1pp2ppp/p1np4/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5`
- Karpov.pgn:1968.??.??:URS-chT:?:Karpov, Anatoly:Mikliaev, I. · middlegame · ply 37 · white vs Mikliaev, I. · result 1-0 · historical move Nh2 (f3h2)
  - FEN: `r3r3/1nqb1pbk/p2p1npp/1p1Pp3/1Pp1P3/P1P1BNNP/2B2PP1/R2QR1K1 w - - 3 19`
- Karpov.pgn:1968.??.??:URS-chT:?:Karpov, Anatoly:Mikliaev, I. · middlegame · ply 73 · white vs Mikliaev, I. · result 1-0 · historical move Qxf4 (d2f4)
  - FEN: `r3b1nk/5q2/r2p1p2/1p1P3p/1PpNPbnP/2P3N1/2BQ4/2R2RK1 w - - 0 37`
- Karpov.pgn:1968.??.??:URS-chT:?:Karpov, Anatoly:Mikliaev, I. · endgame · ply 107 · white vs Mikliaev, I. · result 1-0 · historical move Be2 (d1e2)
  - FEN: `6k1/8/3p4/1p1PnP1p/1PpK3P/2P5/8/r2B1R2 w - - 3 54`
- Karpov.pgn:1969.??.??:URS-ch U18 playoff:1:Vaganian, Rafael A:Karpov, Anatoly · opening · ply 10 · black vs Vaganian, Rafael A · result 0-1 · historical move Be7 (f8e7)
  - FEN: `rn1qkb1r/pbpp1ppp/1p2pn2/8/2PP4/3BPN2/PP3PPP/RNBQK2R b KQkq - 2 5`
- Karpov.pgn:1969.??.??:URS-ch U18 playoff:1:Vaganian, Rafael A:Karpov, Anatoly · middlegame · ply 28 · black vs Vaganian, Rafael A · result 0-1 · historical move Rfd8 (f8d8)
  - FEN: `r4rk1/pb2bpp1/1pnqpn1p/8/2BP4/PN3N2/1P2QPPP/R1BR2K1 b - - 1 14`
- Karpov.pgn:1969.??.??:URS-ch U18 playoff:1:Vaganian, Rafael A:Karpov, Anatoly · middlegame · ply 56 · black vs Vaganian, Rafael A · result 0-1 · historical move Rc7 (c8c7)
  - FEN: `2r3k1/1b3pp1/1p1Npb1p/p7/8/P7/4BPPP/3R2K1 b - - 0 28`
- Karpov.pgn:1969.??.??:URS-ch U18 playoff:1:Vaganian, Rafael A:Karpov, Anatoly · endgame · ply 82 · black vs Vaganian, Rafael A · result 0-1 · historical move a3 (a4a3)
  - FEN: `8/1R3pk1/6pp/4p3/p2b4/6PP/r3BP2/5K2 b - - 1 41`

### Most frequent source lines as White

- 1.d4 Nf6 2.c4 e6 3.Nf3 b6 4.g3 Ba6 5.b3 Bb4+ 6.Bd2 Be7 7.Bg2 c6 8.Bc3 d5 · observed in 27 source games · ECO E15
- 1.e4 c6 2.d4 d5 3.Nd2 dxe4 4.Nxe4 Bf5 5.Ng3 Bg6 6.h4 h6 7.Nf3 Nd7 8.h5 Bh7 · observed in 12 source games · ECO B19
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O · observed in 11 source games · ECO C95
- 1.d4 Nf6 2.c4 e6 3.Nf3 b6 4.g3 Ba6 5.b3 Bb7 6.Bg2 Bb4+ 7.Bd2 a5 8.O-O O-O · observed in 10 source games · ECO E15
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Nxe4 6.d4 b5 7.Bb3 d5 8.dxe5 Be6 · observed in 10 source games · ECO C82
- 1.d4 d5 2.c4 c6 3.Nc3 Nf6 4.e3 e6 5.Nf3 Nbd7 6.Qc2 Bd6 7.Bd3 O-O 8.O-O dxc4 · observed in 9 source games · ECO D46
- 1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nc6 5.Nb5 d6 6.c4 Nf6 7.N1c3 a6 8.Na3 Be7 · observed in 9 source games · ECO B44
- 1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.e3 Bf5 5.Nc3 e6 6.Nh4 Be4 7.f3 Bg6 8.Qb3 Qc7 · observed in 8 source games · ECO D12
- 1.d4 Nf6 2.c4 e6 3.Nf3 d5 4.Nc3 Be7 5.Bg5 h6 6.Bh4 O-O 7.e3 b6 8.Be2 Bb7 · observed in 7 source games · ECO D58
- 1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.cxd5 Nxd5 5.e4 Nxc3 6.bxc3 Bg7 7.Be3 c5 8.Qd2 O-O · observed in 7 source games · ECO D85
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O · observed in 7 source games · ECO C92
- 1.c4 c5 2.Nf3 Nf6 3.Nc3 e6 4.g3 b6 5.Bg2 Bb7 6.O-O Be7 7.d4 cxd4 8.Qxd4 d6 · observed in 6 source games · ECO A30

### Most frequent source lines as Black

- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O · observed in 53 source games · ECO C92
- 1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Nd7 5.Ng5 Ngf6 6.Bd3 e6 7.N1f3 Bd6 8.Qe2 h6 · observed in 16 source games · ECO B17
- 1.e4 c6 2.d4 d5 3.Nd2 dxe4 4.Nxe4 Nd7 5.Ng5 Ngf6 6.Bd3 e6 7.N1f3 Bd6 8.Qe2 h6 · observed in 14 source games · ECO B17
- 1.d4 Nf6 2.c4 e6 3.Nf3 b6 4.g3 Ba6 5.b3 Bb4+ 6.Bd2 Be7 7.Bg2 c6 8.Bc3 d5 · observed in 12 source games · ECO E15
- 1.d4 Nf6 2.c4 e6 3.g3 d5 4.Bg2 Be7 5.Nf3 O-O 6.O-O dxc4 7.Qc2 a6 8.Qxc4 b5 · observed in 11 source games · ECO E05
- 1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.Qc2 O-O 5.a3 Bxc3+ 6.Qxc3 b6 7.Bg5 Bb7 8.e3 d6 · observed in 11 source games · ECO E32
- 1.e4 e5 2.Nf3 Nf6 3.Nxe5 d6 4.Nf3 Nxe4 5.d4 d5 6.Bd3 Nc6 7.O-O Be7 8.c4 Nb4 · observed in 11 source games · ECO C42
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O · observed in 10 source games · ECO C95
- 1.d4 Nf6 2.c4 e6 3.Nf3 b6 4.g3 Bb7 5.Bg2 Be7 6.O-O O-O 7.Nc3 Ne4 8.Qc2 Nxc3 · observed in 9 source games · ECO E19
- 1.e4 c6 2.d4 d5 3.Nd2 dxe4 4.Nxe4 Nd7 5.Bc4 Ngf6 6.Ng5 e6 7.Qe2 Nb6 8.Bd3 h6 · observed in 9 source games · ECO B17
- 1.d4 Nf6 2.c4 e6 3.g3 d5 4.Bg2 Be7 5.Nf3 O-O 6.O-O dxc4 7.Qc2 a6 8.a4 Bd7 · observed in 8 source games · ECO E05
- 1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Nd7 5.Nf3 Ngf6 6.Nxf6+ Nxf6 7.c3 Bg4 8.h3 Bxf3 · observed in 8 source games · ECO B17

### Phrase archive

- general: חפש את הרעיון שמחבר בין הפתיחה לתוכנית האמצע. / Anatoly Karpov: שפר את הכלי הפחות פעיל לפני יצירת חולשה. / בדוק את איומי שני הצדדים לפני בחירת מהלך.
- opening: שכיחות מהלך במשחקים היסטוריים אינה הוכחה שהוא הטוב ביותר. / Anatoly Karpov: פתח לפי תוכנית מבנית ולא רק לפי זיכרון. / השתמש ברפרטואר כנקודת התחלה, לא כהתחייבות עיוורת.
- threat: לפני בחירה טקטית, בדוק את התגובה הכפויה של היריב. / Anatoly Karpov: מנע את התוכנית של היריב כשאפשר לעשות זאת בלי לוותר על פעילות. / איום טוב הוא איום ששורד את ההגנה הטובה ביותר.
- tactics: שמור על איכות המהלך גם כאשר אתה מעדיף סגנון מסוים. / Anatoly Karpov: חשב טקטיקה לפני מעבר לתמרון איטי. / אל תקריב חומר ללא תמורה שניתן להסביר.
- endgame: בסיומים, בדוק פעילות המלך והרגלים החופשיים. / Anatoly Karpov: נצל חולשות, פעילות מלך ורגלים חופשיים. / בדוק פעילות מלך, רגלים חופשיים וחולשות לפני חילופים.

---

## Garry Kasparov (kasparov)

- Source PGN: Kasparov.pgn
- Internal bot rating parameter: 2851 (Peak FIDE rating 2851 (1999))
- Rating source: https://2700chess.com/records
- Valid games attributed to the player: 556
- Training / holdout games: 501 / 55
- Holdout captures/checks per 100 player moves: 23.19 / 5.36
- Date range: 2000–2021
- Results from the player perspective: 279 wins, 224 draws, 52 losses
- Games as White / Black: 333 / 223
- Average game length: 76.91 plies
- Captures per 100 player moves: 21.55
- Checks per 100 player moves: 5.55
- King moves after ply 40 per 100 player moves: 6.75
- Opening diversity: 262 White lines and 183 Black lines
- Working style hypothesis: התקפי ודינמי. יוזמה דינמית והתקפה; מדדי שח/הכאות מסייעים לתיאור אך אינם ניתוח מנוע.

### Representative source games

- Kasparov.pgn:2000.01.16:Corus:2:Piket,Je:Kasparov,G · 2000.01.16 · Corus · round 2 · split training · black · vs Piket,Je · result 1/2-1/2 · ECO D97
  - Source move sample: 1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.Nf3 Bg7 5.Qb3 dxc4 6.Qxc4 O-O 7.e4 Na6 8.Bf4 c5
- Kasparov.pgn:2000.02.20:KasparovChess GP g/60:4.2:Piket,Je:Kasparov,G · 2000.02.20 · KasparovChess GP g/60 · round 4.2 · split training · black · vs Piket,Je · result 1-0 · ECO A05
  - Source move sample: 1.Nf3 Nf6 2.c4 c5 3.Nc3 d5 4.cxd5 Nxd5 5.g3 Nc6 6.Bg2 Nc7 7.d3 e5 8.O-O Be7
- Kasparov.pgn:2000.01.15:Corus:1:Korchnoi,V:Kasparov,G · 2000.01.15 · Corus · round 1 · split training · black · vs Korchnoi,V · result 0-1 · ECO D85
  - Source move sample: 1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.cxd5 Nxd5 5.Bd2 Bg7 6.e4 Nb6 7.Be3 O-O 8.Be2 Nc6
- Kasparov.pgn:2000.01.23:Corus:7:Kasparov,G:Anand,V · 2000.01.23 · Corus · round 7 · split training · white · vs Anand,V · result 1/2-1/2 · ECO E20
  - Source move sample: 1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.Nf3 c5 5.g3 cxd4 6.Nxd4 O-O 7.Bg2 d5 8.cxd5 Nxd5
- Kasparov.pgn:2000.06.24:Fujitsu-Siemens Giants:7:Kasparov,G:Leko,P · 2000.06.24 · Fujitsu-Siemens Giants · round 7 · split training · white · vs Leko,P · result 0-1 · ECO D97
  - Source move sample: 1.d4 Nf6 2.Nf3 g6 3.c4 Bg7 4.Nc3 d5 5.Qb3 dxc4 6.Qxc4 O-O 7.e4 a6 8.Qb3 c5
- Kasparov.pgn:2000.02.19:KasparovChess GP g/60 aborted:4.1:Kasparov,G:Piket,Je · 2000.02.19 · KasparovChess GP g/60 aborted · round 4.1 · split training · white · vs Piket,Je · result * · ECO C95
  - Source move sample: 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O
- Kasparov.pgn:2000.01.18:Corus:3:Kasparov,G:Van Wely,L · 2000.01.18 · Corus · round 3 · split training · white · vs Van Wely,L · result 1-0 · ECO B80
  - Source move sample: 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be3 e6 7.f3 b5 8.g4 h6

### Held-out positions not used to build the repertoire

- Kasparov.pgn:2000.01.24:Corus:8:Lputian,S:Kasparov,G · opening · ply 10 · black vs Lputian,S · result 1/2-1/2 · historical move Nxc3 (d5c3)
  - FEN: `rnbqkb1r/ppp1pp1p/6p1/3n4/3PP3/2N5/PP3PPP/R1BQKBNR b KQkq - 0 5`
- Kasparov.pgn:2000.01.24:Corus:8:Lputian,S:Kasparov,G · middlegame · ply 16 · black vs Lputian,S · result 1/2-1/2 · historical move cxd4 (c5d4)
  - FEN: `rnbqk2r/pp2ppbp/6p1/2p5/3PP3/2P1B3/P2Q1PPP/R3KBNR b KQkq - 1 8`
- Kasparov.pgn:2000.01.24:Corus:8:Lputian,S:Kasparov,G · middlegame · ply 32 · black vs Lputian,S · result 1/2-1/2 · historical move Qe5 (d6e5)
  - FEN: `r4rk1/p3ppbp/1p1q2p1/nQ1P4/4P3/4B3/P3NPPP/3R1RK1 b - - 2 16`
- Kasparov.pgn:2000.01.24:Corus:8:Lputian,S:Kasparov,G · endgame · ply 46 · black vs Lputian,S · result 1/2-1/2 · historical move Qd7 (c8d7)
  - FEN: `r1q3k1/p3ppbp/1p4p1/n1rP4/R2NP3/4B2P/P4PP1/1Q3RK1 b - - 2 23`
- Kasparov.pgn:2000.02.17:KasparovChess GP g/60:3.2:Adams,Mi:Kasparov,G · opening · ply 10 · black vs Adams,Mi · result 1/2-1/2 · historical move a6 (a7a6)
  - FEN: `rnbqkb1r/pp2pppp/3p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R b KQkq - 2 5`
- Kasparov.pgn:2000.02.17:KasparovChess GP g/60:3.2:Adams,Mi:Kasparov,G · middlegame · ply 34 · black vs Adams,Mi · result 1/2-1/2 · historical move h6 (h7h6)
  - FEN: `2rk1b1r/5ppp/p2pb3/N3p1P1/2p1P3/4BP2/PPP4P/R3K2R b KQ - 1 17`
- Kasparov.pgn:2000.02.17:KasparovChess GP g/60:3.2:Adams,Mi:Kasparov,G · middlegame · ply 66 · black vs Adams,Mi · result 1/2-1/2 · historical move Rhh8 (h3h8)
  - FEN: `2r5/3k1p2/3pb3/p3p3/2P1P3/2K2PRr/P2N4/6R1 b - - 1 33`
- Kasparov.pgn:2000.02.17:KasparovChess GP g/60:3.2:Adams,Mi:Kasparov,G · endgame · ply 98 · black vs Adams,Mi · result 1/2-1/2 · historical move Kd6 (c7d6)
  - FEN: `3r4/2k5/2b5/4p3/p1P5/4R3/P1K5/1N6 b - - 0 49`
- Kasparov.pgn:2000.03.05:SuperGM:6:Shirov,A:Kasparov,G · opening · ply 10 · black vs Shirov,A · result 1/2-1/2 · historical move a6 (a7a6)
  - FEN: `rnbqkb1r/pp2pppp/3p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R b KQkq - 2 5`
- Kasparov.pgn:2000.03.05:SuperGM:6:Shirov,A:Kasparov,G · middlegame · ply 20 · black vs Shirov,A · result 1/2-1/2 · historical move Nc6 (b8c6)
  - FEN: `rnb1kb1r/1p3ppp/pq1ppn2/8/4P3/1NN2P2/PPP1Q1PP/R1B1KB1R b KQkq - 1 10`
- Kasparov.pgn:2000.03.05:SuperGM:6:Shirov,A:Kasparov,G · middlegame · ply 38 · black vs Shirov,A · result 1/2-1/2 · historical move Bxd5 (b7d5)
  - FEN: `r3kb1r/1bq2ppp/pn1p4/1p1Np1PP/2nBPP2/1N6/PPP1Q3/2KR1B1R b kq - 1 19`
- Kasparov.pgn:2000.03.05:SuperGM:6:Shirov,A:Kasparov,G · endgame · ply 56 · black vs Shirov,A · result 1/2-1/2 · historical move bxc4 (b5c4)
  - FEN: `r4rk1/4bp2/p2p2p1/1p1P2P1/2B1Qp1q/1N3R2/PPP5/2K3R1 b - - 0 28`
- Kasparov.pgn:2000.04.02:Chess@iceland rapidplay Final:1:Anand,V:Kasparov,G · opening · ply 10 · black vs Anand,V · result 1/2-1/2 · historical move a6 (a7a6)
  - FEN: `rnbqkb1r/pp2pppp/3p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R b KQkq - 2 5`
- Kasparov.pgn:2000.04.02:Chess@iceland rapidplay Final:1:Anand,V:Kasparov,G · middlegame · ply 22 · black vs Anand,V · result 1/2-1/2 · historical move Nxa4 (b6a4)
  - FEN: `rnbqkb1r/5ppp/pn1pp3/8/N2NP1P1/4BP2/1PPQ3P/R3KB1R b KQkq - 0 11`
- Kasparov.pgn:2000.04.02:Chess@iceland rapidplay Final:1:Anand,V:Kasparov,G · middlegame · ply 42 · black vs Anand,V · result 1/2-1/2 · historical move exf5 (e6f5)
  - FEN: `b1rq1rk1/B3b1pp/3pp3/N3nP2/R3P3/5P2/1PPQB2P/R5K1 b - - 0 21`
- Kasparov.pgn:2000.04.02:Chess@iceland rapidplay Final:1:Anand,V:Kasparov,G · endgame · ply 62 · black vs Anand,V · result 1/2-1/2 · historical move Bxc4 (b5c4)
  - FEN: `5rk1/4b1pp/6r1/Rb2p3/2R1P3/4B3/1PP1B2P/7K b - - 4 31`
- Kasparov.pgn:2000.05.19:Bosna SuperGM:3:Kasparov,G:Gurevich,M · opening · ply 9 · white vs Gurevich,M · result 1-0 · historical move Nxe4 (c3e4)
  - FEN: `rnbqkb1r/ppp2ppp/4pn2/6B1/3Pp3/2N5/PPP2PPP/R2QKBNR w KQkq - 0 5`
- Kasparov.pgn:2000.05.19:Bosna SuperGM:3:Kasparov,G:Gurevich,M · middlegame · ply 29 · white vs Gurevich,M · result 1-0 · historical move dxc5 (d4c5)
  - FEN: `r2q1rk1/3nbp1p/p3p3/1ppb1p2/3P4/2P2NP1/PP1NQPBP/R2R2K1 w - - 0 15`
- Kasparov.pgn:2000.05.19:Bosna SuperGM:3:Kasparov,G:Gurevich,M · middlegame · ply 55 · white vs Gurevich,M · result 1-0 · historical move Qd1 (h5d1)
  - FEN: `3r1r1k/5pqp/p2n4/1p1R3Q/8/4N1P1/PP3PBP/6K1 w - - 4 28`
- Kasparov.pgn:2000.05.19:Bosna SuperGM:3:Kasparov,G:Gurevich,M · endgame · ply 81 · white vs Gurevich,M · result 1-0 · historical move Qb8+ (g3b8)
  - FEN: `7k/7p/8/1p1N4/1P5P/3K2Q1/Pq3rB1/8 w - - 1 41`
- Kasparov.pgn:2000.06.19:Simul:?:Kasparov,G:Gypser,A · opening · ply 9 · white vs Gypser,A · result 1/2-1/2 · historical move b3 (b2b3)
  - FEN: `rnbqk2r/ppp1bppp/4pn2/3p4/2P5/5NP1/PP1PPPBP/RNBQK2R w KQkq - 4 5`
- Kasparov.pgn:2000.06.19:Simul:?:Kasparov,G:Gypser,A · middlegame · ply 19 · white vs Gypser,A · result 1/2-1/2 · historical move cxd5 (c4d5)
  - FEN: `r2q1rk1/pb2bppp/1pn1pn2/2pp4/2P5/1PN1PNP1/PB1P1PBP/R2Q1RK1 w - - 2 10`
- Kasparov.pgn:2000.06.19:Simul:?:Kasparov,G:Gypser,A · middlegame · ply 37 · white vs Gypser,A · result 1/2-1/2 · historical move Rxd8 (d1d8)
  - FEN: `3r1rk1/2q2ppp/1p2p3/p1b1n3/8/1P2P1P1/PB2QPBP/R2R2K1 w - - 0 19`
- Kasparov.pgn:2000.06.19:Simul:?:Kasparov,G:Gypser,A · endgame · ply 55 · white vs Gypser,A · result 1/2-1/2 · historical move Bb5 (c6b5)
  - FEN: `8/4kp2/1pB1pnpp/p1b5/6PP/1P2PK2/PB3P2/8 w - - 0 28`

### Most frequent source lines as White

- 1.e4 e5 2.Nf3 Nf6 3.Nxe5 d6 4.Nf3 Nxe4 5.d4 d5 6.Bd3 Nc6 7.O-O Be7 8.c4 Nb4 · observed in 9 source games · ECO C42
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O Nxe4 5.d4 Nd6 6.Bxc6 dxc6 7.dxe5 Nf5 8.Qxd8+ Kxd8 · observed in 7 source games · ECO C67
- 1.e4 c5 2.Nf3 Nc6 3.Nc3 e5 4.Bc4 d6 5.d3 Be7 6.Nd2 Bg5 7.h4 Bxd2+ 8.Bxd2 Nf6 · observed in 4 source games · ECO B30
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.a4 Bb7 · observed in 4 source games · ECO C88
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.h3 Bb7 · observed in 4 source games · ECO C88
- 1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.Qc2 O-O 5.a3 Bxc3+ 6.Qxc3 d5 7.Nf3 dxc4 8.Qxc4 b6 · observed in 3 source games · ECO E32
- 1.e4 e5 2.Nf3 Nc6 3.d4 exd4 4.Nxd4 Nf6 5.Nxc6 bxc6 6.e5 Qe7 7.Qe2 Nd5 8.c4 Nb6 · observed in 3 source games · ECO C45
- 1.d4 d5 2.c4 c6 3.Nc3 Nf6 4.e3 e6 5.Nf3 Nbd7 6.Qc2 Bd6 7.g4 Nxg4 8.Rg1 f5 · observed in 2 source games · ECO D45
- 1.d4 d5 2.c4 e6 3.Nc3 Be7 4.cxd5 exd5 5.Bf4 c6 6.Qc2 Bd6 7.Bxd6 Qxd6 8.e3 Ne7 · observed in 2 source games · ECO D31
- 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be3 e6 7.f3 b5 8.g4 h6 · observed in 2 source games · ECO B80
- 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be3 Ng4 7.Bg5 h6 8.Bh4 g5 · observed in 2 source games · ECO B90
- 1.e4 c5 2.Nf3 e6 3.b3 b6 4.d4 cxd4 5.Nxd4 a6 6.Bd3 Bb7 7.O-O Qc7 8.c4 Nf6 · observed in 2 source games · ECO B40

### Most frequent source lines as Black

- 1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e5 6.Ndb5 d6 7.Bg5 a6 8.Na3 b5 · observed in 4 source games · ECO B33
- 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be3 e5 7.Nb3 Be6 8.f3 Nbd7 · observed in 3 source games · ECO B90
- 1.d4 d5 2.c4 dxc4 3.Nf3 e6 4.e3 a6 5.Bxc4 c5 6.O-O Nf6 7.Bd3 cxd4 8.exd4 Be7 · observed in 2 source games · ECO D27
- 1.d4 Nf6 2.c4 e6 3.Nf3 d5 4.Nc3 Be7 5.Bg5 O-O 6.e3 h6 7.Bh4 b6 8.Qb3 Bb7 · observed in 2 source games · ECO D58
- 1.d4 Nf6 2.c4 g6 3.g3 Bg7 4.Bg2 d5 5.cxd5 Nxd5 6.e4 Nb6 7.Ne2 c5 8.d5 O-O · observed in 2 source games · ECO D72
- 1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.cxd5 Nxd5 5.e4 Nxc3 6.bxc3 Bg7 7.Nf3 c5 8.Rb1 O-O · observed in 2 source games · ECO D85
- 1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.Nf3 Bg7 5.Qb3 dxc4 6.Qxc4 O-O 7.e4 Na6 8.Be2 c5 · observed in 2 source games · ECO D97
- 1.e4 c5 2.Nf3 d6 3.Bb5+ Bd7 4.Bxd7+ Qxd7 5.c4 Nc6 6.d4 cxd4 7.Nxd4 Nf6 8.Nc3 g6 · observed in 2 source games · ECO B52
- 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be2 e5 7.Nb3 Be7 8.O-O Be6 · observed in 2 source games · ECO B92
- 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be2 e6 7.O-O Be7 8.a4 Nc6 · observed in 2 source games · ECO B84
- 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be3 e6 7.f3 b5 8.Qd2 Nbd7 · observed in 2 source games · ECO B80
- 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be3 Ng4 7.Bg5 h6 8.Bh4 g5 · observed in 2 source games · ECO B90

### Phrase archive

- general: חפש את הרעיון שמחבר בין הפתיחה לתוכנית האמצע. / Garry Kasparov: יוזמה צריכה ליצור איום ממשי או לשפר פעילות. / בדוק את איומי שני הצדדים לפני בחירת מהלך.
- opening: שכיחות מהלך במשחקים היסטוריים אינה הוכחה שהוא הטוב ביותר. / Garry Kasparov: חפש פיתוח מהיר ופתיחת קווים רק כשהמלך והכלים תומכים בכך. / השתמש ברפרטואר כנקודת התחלה, לא כהתחייבות עיוורת.
- threat: לפני בחירה טקטית, בדוק את התגובה הכפויה של היריב. / Garry Kasparov: לפני התקפה, בדוק את תגובת ההגנה הטובה ביותר. / איום טוב הוא איום ששורד את ההגנה הטובה ביותר.
- tactics: שמור על איכות המהלך גם כאשר אתה מעדיף סגנון מסוים. / Garry Kasparov: הקרבה דורשת וריאציה כפויה או תמורה עמדה ברורה. / אל תקריב חומר ללא תמורה שניתן להסביר.
- endgame: בסיומים, בדוק פעילות המלך והרגלים החופשיים. / Garry Kasparov: גם התקפה צריכה לדעת מתי להמיר יתרון לסיום זכוי. / בדוק פעילות מלך, רגלים חופשיים וחולשות לפני חילופים.

---

## Frank Marshall (marshall)

- Source PGN: Marshall.pgn
- Internal bot rating parameter: 2600 (Internal simulation estimate; retrospective rating, not official FIDE)
- Valid games attributed to the player: 1024
- Training / holdout games: 921 / 103
- Holdout captures/checks per 100 player moves: 21.78 / 6.83
- Date range: 1899–1941
- Results from the player perspective: 405 wins, 351 draws, 268 losses
- Games as White / Black: 519 / 505
- Average game length: 83.28 plies
- Captures per 100 player moves: 22.22
- Checks per 100 player moves: 7.58
- King moves after ply 40 per 100 player moves: 8.61
- Opening diversity: 424 White lines and 424 Black lines
- Working style hypothesis: התקפי. משחק יוזמתי והתקפי; רפרטואר נמדד לפי שכיחות, לא לפי חוזק תאורטי.

### Representative source games

- Marshall.pgn:1899.??.??:London-B:?:Marco, Georg:Marshall, Frank James · 1899.??.?? · London-B · round ? · split training · black · vs Marco, Georg · result 1/2-1/2 · ECO C67
  - Source move sample: 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O Nxe4 5.d4 Nd6 6.Bxc6 dxc6 7.dxe5 Nf5 8.Qxd8+ Kxd8
- Marshall.pgn:1900.??.??:New York:5:Hodges, Albert Beauregard:Marshall, Frank James · 1900.??.?? · New York · round 5 · split training · black · vs Hodges, Albert Beauregard · result 1-0 · ECO D08
  - Source move sample: 1.d4 d5 2.c4 e5 3.dxe5 d4 4.a3 Nc6 5.Nf3 Bg4 6.Bf4 a5 7.Nbd2 Nge7 8.h3 Bxf3
- Marshall.pgn:1899.??.??:London-B:?:Jackson, E.:Marshall, Frank James · 1899.??.?? · London-B · round ? · split training · black · vs Jackson, E. · result 0-1 · ECO C24
  - Source move sample: 1.e4 e5 2.Bc4 Nf6 3.d3 d5 4.exd5 Nxd5 5.Qe2 Nc6 6.f4 Bc5 7.Nf3 Bg4 8.h3 Bxf3
- Marshall.pgn:1899.??.??:London-B:?:Marshall, Frank James:Mieses, Jacques · 1899.??.?? · London-B · round ? · split holdout · white · vs Mieses, Jacques · result 1/2-1/2 · ECO B40
  - Source move sample: 1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nf6 5.Bd3 Nc6 6.Nxc6 bxc6 7.O-O d5 8.exd5 cxd5
- Marshall.pgn:1900.??.??:New York:1:Marshall, Frank James:Lipschuetz, Samuel · 1900.??.?? · New York · round 1 · split training · white · vs Lipschuetz, Samuel · result 0-1 · ECO D60
  - Source move sample: 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Nbd7 5.Nf3 Be7 6.e3 c6 7.Bd3 O-O 8.O-O dxc4
- Marshall.pgn:1899.??.??:London-B:?:Marshall, Frank James:Jones, E. · 1899.??.?? · London-B · round ? · split training · white · vs Jones, E. · result 1-0 · ECO C53
  - Source move sample: 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.O-O d6 5.c3 Qe7 6.d4 Bb6 7.Bg5 f6 8.Be3 Bg4

### Held-out positions not used to build the repertoire

- Marshall.pgn:1899.??.??:London-B:?:Marshall, Frank James:Mieses, Jacques · opening · ply 9 · white vs Mieses, Jacques · result 1/2-1/2 · historical move Bd3 (f1d3)
  - FEN: `rnbqkb1r/pp1p1ppp/4pn2/8/3NP3/8/PPP2PPP/RNBQKB1R w KQkq - 1 5`
- Marshall.pgn:1899.??.??:London-B:?:Marshall, Frank James:Mieses, Jacques · middlegame · ply 23 · white vs Mieses, Jacques · result 1/2-1/2 · historical move c4 (c2c4)
  - FEN: `r1bq1rk1/p3bppp/4pn2/3p2B1/8/3B1Q2/PPPN1PPP/R4RK1 w - - 6 12`
- Marshall.pgn:1899.??.??:London-B:?:Marshall, Frank James:Mieses, Jacques · middlegame · ply 45 · white vs Mieses, Jacques · result 1/2-1/2 · historical move Ne5 (g4e5)
  - FEN: `r4rk1/pb3p2/1q2p1p1/3n3p/B5NQ/8/PP3PPP/2R2RK1 w - - 0 23`
- Marshall.pgn:1899.??.??:London-B:?:Marshall, Frank James:Mieses, Jacques · endgame · ply 65 · white vs Mieses, Jacques · result 1/2-1/2 · historical move f3 (f2f3)
  - FEN: `1r5r/pb3pk1/3Npnp1/q6p/B2R3P/3R2Q1/PP3PP1/6K1 w - - 11 33`
- Marshall.pgn:1900.??.??:New York:6:Lipschuetz, Samuel:Marshall, Frank James · opening · ply 10 · black vs Lipschuetz, Samuel · result 1-0 · historical move Qe7 (d8e7)
  - FEN: `rnbq1rk1/pppp1ppp/5n2/4N3/1bB1P3/2N5/PPPP1PPP/R1BQK2R b KQ - 2 5`
- Marshall.pgn:1900.??.??:New York:6:Lipschuetz, Samuel:Marshall, Frank James · middlegame · ply 28 · black vs Lipschuetz, Samuel · result 1-0 · historical move Bd7 (c8d7)
  - FEN: `r1b1r1k1/ppp2ppp/3p4/8/2PPnB2/7P/PP2BPP1/R3K2R b KQ - 2 14`
- Marshall.pgn:1900.??.??:New York:6:Lipschuetz, Samuel:Marshall, Frank James · middlegame · ply 56 · black vs Lipschuetz, Samuel · result 1-0 · historical move Kf7 (g7f7)
  - FEN: `4r3/pppbr1kp/3p1np1/3P4/2P3P1/3B1PK1/PP1B4/3R3R b - - 0 28`
- Marshall.pgn:1900.??.??:New York:6:Lipschuetz, Samuel:Marshall, Frank James · endgame · ply 82 · black vs Lipschuetz, Samuel · result 1-0 · historical move a5 (a6a5)
  - FEN: `2n5/2pb1k1p/pp1p1Pp1/3P2K1/PPPB2P1/8/2B5/8 b - - 0 41`
- Marshall.pgn:1900.??.??:Paris+:?:Marshall, Frank James:Brody, Miklos · opening · ply 9 · white vs Brody, Miklos · result 1/2-1/2 · historical move O-O (e1g1)
  - FEN: `r1bqkb1r/1ppp1ppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 5`
- Marshall.pgn:1900.??.??:Paris+:?:Marshall, Frank James:Brody, Miklos · middlegame · ply 39 · white vs Brody, Miklos · result 1/2-1/2 · historical move Nxg5 (e4g5)
  - FEN: `r3n1k1/1ppq2pp/p2p4/3Pp1b1/2P1Nr2/3Q4/PP3PPP/4RRK1 w - - 0 20`
- Marshall.pgn:1900.??.??:Paris+:?:Marshall, Frank James:Brody, Miklos · middlegame · ply 77 · white vs Brody, Miklos · result 1/2-1/2 · historical move Re2 (d2e2)
  - FEN: `8/2p3kp/ppNp4/3P1n2/2P1r1p1/1P6/P2R1KPP/8 w - - 4 39`
- Marshall.pgn:1900.??.??:Paris+:?:Marshall, Frank James:Brody, Miklos · endgame · ply 115 · white vs Brody, Miklos · result 1/2-1/2 · historical move Ne3+ (c4e3)
  - FEN: `8/7p/8/3k4/2N3p1/1P4K1/r5PP/8 w - - 0 58`
- Marshall.pgn:1900.??.??:Paris:14:Marshall, Frank James:Burn, Amos · opening · ply 9 · white vs Burn, Amos · result 1-0 · historical move e3 (e2e3)
  - FEN: `rnbqk2r/ppp1bppp/4pn2/3p2B1/2PP4/2N5/PP2PPPP/R2QKBNR w KQkq - 4 5`
- Marshall.pgn:1900.??.??:Paris:14:Marshall, Frank James:Burn, Amos · middlegame · ply 11 · white vs Burn, Amos · result 1-0 · historical move Nf3 (g1f3)
  - FEN: `rnbq1rk1/ppp1bppp/4pn2/3p2B1/2PP4/2N1P3/PP3PPP/R2QKBNR w KQ - 1 6`
- Marshall.pgn:1900.??.??:Paris:14:Marshall, Frank James:Burn, Amos · middlegame · ply 19 · white vs Burn, Amos · result 1-0 · historical move h4 (h2h4)
  - FEN: `rn1q1rk1/pbp2ppp/1p3b2/3p4/3P4/2NBPN2/PP3PPP/R2QK2R w KQ - 0 10`
- Marshall.pgn:1900.??.??:Paris:14:Marshall, Frank James:Burn, Amos · endgame · ply 27 · white vs Burn, Amos · result 1-0 · historical move Bxg6 (d3g6)
  - FEN: `rn1qr1k1/pbp2pb1/1p4p1/3p4/3P4/2NBPN2/PPQ2PP1/R3K2R w KQ - 2 14`
- Marshall.pgn:1901.??.??:Buffalo:7:Howell, Clarance Seaman:Marshall, Frank James · opening · ply 10 · black vs Howell, Clarance Seaman · result 1-0 · historical move Qd7 (d5d7)
  - FEN: `rnb1kbnr/pp2pppp/8/3q4/3p4/2N2N2/PP2PPPP/R1BQKB1R b KQkq - 1 5`
- Marshall.pgn:1901.??.??:Buffalo:7:Howell, Clarance Seaman:Marshall, Frank James · middlegame · ply 24 · black vs Howell, Clarance Seaman · result 1-0 · historical move a6 (a7a6)
  - FEN: `r1b2rk1/ppq1nppp/2nb4/1B2p3/Q3P3/2N1BN2/PP3PPP/3R1RK1 b - - 8 12`
- Marshall.pgn:1901.??.??:Buffalo:7:Howell, Clarance Seaman:Marshall, Frank James · middlegame · ply 44 · black vs Howell, Clarance Seaman · result 1-0 · historical move Nxd6 (c8d6)
  - FEN: `1rn2rk1/1bq2ppp/pN1B4/1p6/3RP3/8/PP1QBPPK/5R2 b - - 2 22`
- Marshall.pgn:1901.??.??:Buffalo:7:Howell, Clarance Seaman:Marshall, Frank James · endgame · ply 66 · black vs Howell, Clarance Seaman · result 1-0 · historical move h5 (h7h5)
  - FEN: `5k2/5p1p/p3q1p1/1p6/3Q4/P4B2/1P3PPK/8 b - - 0 33`
- Marshall.pgn:1901.??.??:Monte Carlo:3:Marshall, Frank James:Gunsberg, Isidor · opening · ply 9 · white vs Gunsberg, Isidor · result 1/2-1/2 · historical move Bg3 (f4g3)
  - FEN: `rn1qk1nr/ppp2ppp/3bp3/3p1b2/3P1B2/2N1P3/PPP2PPP/R2QKBNR w KQkq - 1 5`
- Marshall.pgn:1901.??.??:Monte Carlo:3:Marshall, Frank James:Gunsberg, Isidor · middlegame · ply 33 · white vs Gunsberg, Isidor · result 1/2-1/2 · historical move Rh1 (d1h1)
  - FEN: `3rk2r/ppp1np2/n5p1/1N1pNp2/3P4/4P3/PPP2PRP/2KR4 w k - 3 17`
- Marshall.pgn:1901.??.??:Monte Carlo:3:Marshall, Frank James:Gunsberg, Isidor · middlegame · ply 63 · white vs Gunsberg, Isidor · result 1/2-1/2 · historical move Rxc4 (c1c4)
  - FEN: `2n4r/pp3pk1/2p3pr/5p2/2pP1Pn1/4PN2/PP2K1RP/2R2N2 w - - 0 32`
- Marshall.pgn:1901.??.??:Monte Carlo:3:Marshall, Frank James:Gunsberg, Isidor · endgame · ply 95 · white vs Gunsberg, Isidor · result 1/2-1/2 · historical move Nf3 (e5f3)
  - FEN: `6r1/pp5r/2p1k1p1/3nNp2/5P1P/P2RP2R/1P3K2/8 w - - 11 48`

### Most frequent source lines as White

- 1.e4 e5 2.f4 exf4 3.Nf3 g5 4.h4 g4 5.Ne5 Nf6 6.Bc4 d5 7.exd5 Bd6 8.O-O Bxe5 · observed in 8 source games · ECO C39
- 1.d4 d5 2.c4 e6 3.Nc3 c5 4.cxd5 exd5 5.Nf3 Nc6 6.Bg5 Be7 7.Bxe7 Ngxe7 8.dxc5 Qa5 · observed in 5 source games · ECO D32
- 1.d4 d5 2.c4 e6 3.Nc3 c5 4.cxd5 exd5 5.Nf3 Nc6 6.Bg5 Be7 7.Bxe7 Ngxe7 8.e3 cxd4 · observed in 4 source games · ECO D32
- 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Be7 5.e3 Ne4 6.Bxe7 Qxe7 7.Bd3 Nxc3 8.bxc3 Nd7 · observed in 4 source games · ECO D53
- 1.d4 d5 2.c4 e6 3.Nc3 c5 4.cxd5 exd5 5.Nf3 Nc6 6.g3 Be6 7.Bg2 Nf6 8.Bg5 Be7 · observed in 3 source games · ECO D33
- 1.d4 d5 2.c4 e6 3.Nc3 c5 4.cxd5 exd5 5.Nf3 Nc6 6.g3 Be6 7.Bg2 Nf6 8.O-O Be7 · observed in 3 source games · ECO D34
- 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Be7 5.e3 Ne4 6.Bxe7 Qxe7 7.cxd5 Nxc3 8.bxc3 exd5 · observed in 3 source games · ECO D53
- 1.d4 d5 2.c4 c6 3.Nc3 e5 4.cxd5 cxd5 5.e4 dxe4 6.d5 Nf6 7.Bg5 Qb6 8.Bxf6 gxf6 · observed in 2 source games · ECO D10
- 1.d4 d5 2.c4 e6 3.Nc3 c5 4.cxd5 exd5 5.Nf3 Nc6 6.Bg5 Be7 7.Bxe7 Ngxe7 8.dxc5 d4 · observed in 2 source games · ECO D32
- 1.d4 d5 2.c4 e6 3.Nc3 c5 4.cxd5 exd5 5.Nf3 Nc6 6.Bg5 Be7 7.Bxe7 Ngxe7 8.e3 O-O · observed in 2 source games · ECO D32
- 1.d4 d5 2.c4 e6 3.Nc3 c5 4.cxd5 exd5 5.Nf3 Nc6 6.g3 cxd4 7.Nxd4 Bc5 8.Nb3 Bb4 · observed in 2 source games · ECO D33
- 1.d4 d5 2.c4 e6 3.Nc3 c5 4.cxd5 exd5 5.Nf3 Nf6 6.Bg5 Be7 7.dxc5 Be6 8.e4 O-O · observed in 2 source games · ECO D32

### Most frequent source lines as Black

- 1.e4 e5 2.f4 exf4 3.Nf3 g5 4.h4 g4 5.Ne5 Nf6 6.Bc4 d5 7.exd5 Bd6 8.O-O Bxe5 · observed in 7 source games · ECO C39
- 1.e4 e5 2.Nf3 Nf6 3.Nxe5 d6 4.Nf3 Nxe4 5.d4 d5 6.Bd3 Bd6 7.O-O Bg4 8.c4 O-O · observed in 6 source games · ECO C42
- 1.e4 e5 2.Nf3 Nf6 3.Nc3 Nc6 4.Bb5 Bb4 5.O-O O-O 6.d3 d5 7.Bxc6 bxc6 8.Nxe5 Bxc3 · observed in 4 source games · ECO C49
- 1.e4 e5 2.Nf3 Nf6 3.Nxe5 d6 4.Nf3 Nxe4 5.Qe2 Qe7 6.d3 Nf6 7.Bg5 Be6 8.Nc3 h6 · observed in 4 source games · ECO C42
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.d3 d6 · observed in 3 source games · ECO C90
- 1.e4 e5 2.Nf3 Nc6 3.Nc3 Nf6 4.Bb5 Bb4 5.O-O O-O 6.d3 d6 7.Ne2 Bg4 8.c3 Bc5 · observed in 3 source games · ECO C49
- 1.e4 e5 2.Nf3 Nf6 3.Nc3 Bb4 4.Nxe5 O-O 5.Be2 Re8 6.Nd3 Bxc3 7.dxc3 Nxe4 8.O-O d5 · observed in 3 source games · ECO C42
- 1.e4 e6 2.d4 d5 3.Nc3 Nf6 4.Bg5 Bb4 5.exd5 Qxd5 6.Bxf6 gxf6 7.Qd2 Bxc3 8.Qxc3 Nc6 · observed in 3 source games · ECO C12
- 1.d4 d5 2.Bf4 c5 3.e3 Nc6 4.c3 e6 5.Nd2 Bd6 6.Bg3 f5 7.Ngf3 Nf6 8.Ne5 O-O · observed in 2 source games · ECO D00
- 1.e4 e5 2.f4 d5 3.Nf3 dxe4 4.Nxe5 Bd6 5.d4 Nf6 6.Bc4 O-O 7.Nc3 Nc6 8.O-O Qe7 · observed in 2 source games · ECO C31
- 1.e4 e5 2.f4 exf4 3.Bc4 d5 4.Bxd5 Qh4+ 5.Kf1 g5 6.d4 Bg7 7.Nc3 Ne7 8.Nf3 Qh5 · observed in 2 source games · ECO C33
- 1.e4 e5 2.Nc3 Nf6 3.Bc4 Nc6 4.d3 Bb4 5.Bg5 h6 6.Bxf6 Bxc3+ 7.bxc3 Qxf6 8.Ne2 d6 · observed in 2 source games · ECO C28

### Phrase archive

- general: The Tactical Hammer: אני מחפש טקטיקה שמבוססת על פעילות ולא על תקווה. / The Tactical Hammer: התקפה טובה מתחילה בפיתוח ובקווים פתוחים לכלים.
- opening: The Tactical Hammer: אני מעדיף פיתוח מהיר ויוזמה כשהמלך יכול להישאר בטוח. / The Tactical Hammer: גמביט מעניין רק אם התמורה בזמן ובפעילות ברורה.
- threat: The Tactical Hammer: אני מציב בעיות כפויות שמאלצות את היריב לבחור בין איומים. / The Tactical Hammer: אני בודק את ההגנה הטובה ביותר לפני שאני משקיע חומר בהתקפה.
- tactics: The Tactical Hammer: אני מחפש שילובים עם המשך כפוי ולא רק מסע מפתיע. / The Tactical Hammer: הקרבה צריכה להחזיר חומר, מט או יתרון עמדתי שניתן להסביר.
- endgame: The Tactical Hammer: אחרי שהיוזמה מוצתה, אני ממיר אותה ליתרון ממשי. / The Tactical Hammer: אני בודק פעילות המלך והרגלים לפני שאני מסכים לחילופים.

---

## Paul Morphy (morphy)

- Source PGN: Morphy.pgn
- Internal bot rating parameter: 2690 (Retrospective Chessmetrics estimate; not official FIDE)
- Rating source: https://ajedrez.pro/en/jugadores/ranking
- Valid games attributed to the player: 211
- Training / holdout games: 189 / 22
- Holdout captures/checks per 100 player moves: 25.17 / 11.19
- Date range: 1848–1866
- Results from the player perspective: 170 wins, 18 draws, 23 losses
- Games as White / Black: 136 / 75
- Average game length: 65.57 plies
- Captures per 100 player moves: 24.18
- Checks per 100 player moves: 9.69
- King moves after ply 40 per 100 player moves: 6.3
- Opening diversity: 108 White lines and 61 Black lines
- Working style hypothesis: התקפי ומהיר. פיתוח מהיר, פתיחת קווים וניצול יתרון בפיתוח; יש לבדוק איכות בנפרד.

### Representative source games

- Morphy.pgn:1857.??.??:USA-01.Congress:2:Paulsen, Louis:Morphy, Paul  · 1857.??.?? · USA-01.Congress · round 2 · split training · black · vs Paulsen, Louis · result 1/2-1/2 · ECO C67
  - Source move sample: 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O Nxe4 5.d4 a6 6.Bd3 d5 7.Nxe5 Nxd4 8.Re1 Be6
- Morphy.pgn:1857.??.??:USA-01.Congress:3:Paulsen, Louis:Morphy, Paul  · 1857.??.?? · USA-01.Congress · round 3 · split training · black · vs Paulsen, Louis · result 1-0 · ECO C64
  - Source move sample: 1.e4 e5 2.Nf3 Nc6 3.Nc3 Bc5 4.Bb5 d6 5.d4 exd4 6.Nxd4 Bd7 7.Nxc6 bxc6 8.Ba4 Qh4
- Morphy.pgn:1849.??.??:New Orleans:?:Mac Connel, James:Morphy, Paul  · 1849.??.?? · New Orleans · round ? · split training · black · vs Mac Connel, James · result 0-1 · ECO C38
  - Source move sample: 1.e4 e5 2.f4 exf4 3.Nf3 g5 4.Bc4 Bg7 5.d3 h6 6.O-O Nf6 7.c3 b5 8.Bxb5 c6
- Morphy.pgn:1857.??.??:USA-01.Congress:4:Morphy, Paul :Paulsen, Louis · 1857.??.?? · USA-01.Congress · round 4 · split training · white · vs Paulsen, Louis · result 1/2-1/2 · ECO B40
  - Source move sample: 1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Bc5 5.Nb3 Bb6 6.Nc3 Nc6 7.Bf4 e5 8.Bg3 Nge7
- Morphy.pgn:1855.??.??:Alabama :?:Morphy, Paul :Maurian, Charles Amedee · 1855.??.?? · Alabama  · round ? · split training · white · vs Maurian, Charles Amedee · result 0-1 · ECO C33
  - Source move sample: 1.e4 e5 2.f4 exf4 3.Bc4 Qh4+ 4.Kf1 b5 5.Bd5 Nc6 6.Nf3 Qh5 7.d4 Nf6 8.Bb3 Ba6
- Morphy.pgn:1848.??.??:New Orleans:?:Morphy, Paul :Morphy, Alonzo · 1848.??.?? · New Orleans · round ? · split holdout · white · vs Morphy, Alonzo · result 1-0 · ECO C23
  - Source move sample: 1.e4 e5 2.Bc4 f5 3.exf5 Nf6 4.Nc3 d5 5.Nxd5 Bc5 6.Nxf6+ Qxf6 7.d3 Bxf5 8.Nf3 Bg4

### Held-out positions not used to build the repertoire

- Morphy.pgn:1848.??.??:New Orleans:?:Morphy, Paul :Morphy, Alonzo · opening · ply 9 · white vs Morphy, Alonzo · result 1-0 · historical move Nxd5 (c3d5)
  - FEN: `rnbqkb1r/ppp3pp/5n2/3ppP2/2B5/2N5/PPPP1PPP/R1BQK1NR w KQkq - 0 5`
- Morphy.pgn:1848.??.??:New Orleans:?:Morphy, Paul :Morphy, Alonzo · middlegame · ply 17 · white vs Morphy, Alonzo · result 1-0 · historical move Bd5 (c4d5)
  - FEN: `rn2k2r/ppp3pp/5q2/2b1p3/2B3b1/3P1N2/PPP2PPP/R1BQK2R w KQkq - 2 9`
- Morphy.pgn:1848.??.??:New Orleans:?:Morphy, Paul :Morphy, Alonzo · middlegame · ply 33 · white vs Morphy, Alonzo · result 1-0 · historical move Be3 (c1e3)
  - FEN: `2kr3r/1p1n4/pbp2q1p/4p1p1/PP6/1QPP1B2/5PPP/R1B2RK1 w - - 0 17`
- Morphy.pgn:1848.??.??:New Orleans:?:Morphy, Paul :Morphy, Alonzo · endgame · ply 47 · white vs Morphy, Alonzo · result 1-0 · historical move bxc6 (b5c6)
  - FEN: `2kr4/1pb3r1/1np2q1p/1P2p3/4B3/1QPPBP2/6PP/R4RK1 w - - 1 24`
- Morphy.pgn:1849.??.??:New Orleans m:?:Morphy, Paul :Morphy, Alonzo · opening · ply 9 · white vs Morphy, Alonzo · result 1-0 · historical move c3 (c2c3)
  - FEN: `r1bqk1nr/pppp1ppp/2n5/4p3/1bB1P3/5N2/P1PP1PPP/RNBQK2R w KQkq - 0 5`
- Morphy.pgn:1849.??.??:New Orleans m:?:Morphy, Paul :Morphy, Alonzo · middlegame · ply 25 · white vs Morphy, Alonzo · result 1-0 · historical move exd6 (e5d6)
  - FEN: `r2q1rk1/ppp1nppp/1b1p4/n3Pb2/3P4/B1NB1N2/P4PPP/R2Q1RK1 w - - 1 13`
- Morphy.pgn:1849.??.??:New Orleans m:?:Morphy, Paul :Morphy, Alonzo · middlegame · ply 47 · white vs Morphy, Alonzo · result 1-0 · historical move Rxe5 (e1e5)
  - FEN: `r4r1k/pp3p2/1b1q3p/3ppB1Q/2nP4/8/P4PPP/R3R1K1 w - - 0 24`
- Morphy.pgn:1849.??.??:New Orleans m:?:Morphy, Paul :Morphy, Alonzo · endgame · ply 71 · white vs Morphy, Alonzo · result 1-0 · historical move h4 (h2h4)
  - FEN: `r5k1/pp4r1/1b4BQ/3p4/8/8/P4PKP/8 w - - 3 36`
- Morphy.pgn:1850.??.??:New Orleans:?:Morphy, Paul :Loewenthal, Johann Jacob · opening · ply 9 · white vs Loewenthal, Johann Jacob · result 1-0 · historical move d4 (d2d4)
  - FEN: `rnbqkbnr/pp3ppp/8/2pp4/5P2/5N2/PPPP2PP/RNBQKB1R w KQkq - 0 5`
- Morphy.pgn:1850.??.??:New Orleans:?:Morphy, Paul :Loewenthal, Johann Jacob · middlegame · ply 27 · white vs Loewenthal, Johann Jacob · result 1-0 · historical move Rb1 (a1b1)
  - FEN: `r2q1rk1/pp3ppp/2n5/3N4/5P2/5B2/PbP3PP/R2Q1RK1 w - - 0 14`
- Morphy.pgn:1850.??.??:New Orleans:?:Morphy, Paul :Loewenthal, Johann Jacob · middlegame · ply 51 · white vs Loewenthal, Johann Jacob · result 1-0 · historical move Rb2 (b1b2)
  - FEN: `1r3k2/pp3p2/7r/2bNnQ2/4B3/2P3q1/P6P/1R3R1K w - - 0 26`
- Morphy.pgn:1850.??.??:New Orleans:?:Morphy, Paul :Loewenthal, Johann Jacob · endgame · ply 75 · white vs Loewenthal, Johann Jacob · result 1-0 · historical move Kf3 (g2f3)
  - FEN: `8/2R5/1p3pkn/p1bB4/8/2P5/P5KP/8 w - - 0 38`
- Morphy.pgn:1856.??.??:New Orleans:?:Morphy, Paul :NN · opening · ply 9 · white vs NN · result 1-0 · historical move Nc3 (b1c3)
  - FEN: `rnb1kbnr/pppp1p1p/8/6p1/2B1Pp1q/8/PPPP2PP/RNBQ1KNR w kq - 0 5`
- Morphy.pgn:1856.??.??:New Orleans:?:Morphy, Paul :NN · middlegame · ply 11 · white vs NN · result 1-0 · historical move d4 (d2d4)
  - FEN: `rnb1k1nr/pppp1pbp/8/6p1/2B1Pp1q/2N5/PPPP2PP/R1BQ1KNR w kq - 2 6`
- Morphy.pgn:1856.??.??:New Orleans:?:Morphy, Paul :NN · middlegame · ply 21 · white vs NN · result 1-0 · historical move e5 (e4e5)
  - FEN: `r1bk3r/pppp1p1p/2n2b2/6pq/2BPPp2/2P2N2/PP4PP/R1BQ1K1R w - - 0 11`
- Morphy.pgn:1856.??.??:New Orleans:?:Morphy, Paul :NN · endgame · ply 31 · white vs NN · result 1-0 · historical move Bxf4 (c1f4)
  - FEN: `r1bk3r/pppp2bp/2n5/7q/2Bp1pNP/2P5/PP4P1/R1BQ2KR w - - 0 16`
- Morphy.pgn:1857.??.??:USA-01.Congress:2:Morphy, Paul :Meek, Alexander Beaufort · opening · ply 9 · white vs Meek, Alexander Beaufort · result 1-0 · historical move Ne2 (g1e2)
  - FEN: `rnbqk2r/ppppnpbp/4p1p1/8/3PP3/3BB3/PPP2PPP/RN1QK1NR w KQkq - 4 5`
- Morphy.pgn:1857.??.??:USA-01.Congress:2:Morphy, Paul :Meek, Alexander Beaufort · middlegame · ply 17 · white vs Meek, Alexander Beaufort · result 1-0 · historical move f4 (f2f4)
  - FEN: `rn1q1rk1/pbp1npbp/1p2p1p1/3pP3/3P4/3BB3/PPPNNPPP/R2Q1RK1 w - - 1 9`
- Morphy.pgn:1857.??.??:USA-01.Congress:2:Morphy, Paul :Meek, Alexander Beaufort · middlegame · ply 31 · white vs Meek, Alexander Beaufort · result 1-0 · historical move Rg1 (f1g1)
  - FEN: `r2q1r2/1b1nn1bk/pp2p1pp/3pPp2/2pP1PP1/2P1BN1P/PPB1N2K/R2Q1R2 w - - 1 16`
- Morphy.pgn:1857.??.??:USA-01.Congress:2:Morphy, Paul :Meek, Alexander Beaufort · endgame · ply 47 · white vs Meek, Alexander Beaufort · result 1-0 · historical move f6 (f5f6)
  - FEN: `r3kqr1/1b1n2b1/ppn4p/3pPP2/2pP3Q/2P1B2P/PPB1N2K/R5R1 w - - 3 24`
- Morphy.pgn:1857.??.??:USA-01.Congress:6:Paulsen, Louis:Morphy, Paul  · opening · ply 10 · black vs Paulsen, Louis · result 0-1 · historical move O-O (e8g8)
  - FEN: `r1bqk2r/pppp1ppp/2n2n2/1Bb1p3/4P3/2N2N2/PPPP1PPP/R1BQ1RK1 b kq - 7 5`
- Morphy.pgn:1857.??.??:USA-01.Congress:6:Paulsen, Louis:Morphy, Paul  · middlegame · ply 16 · black vs Paulsen, Louis · result 0-1 · historical move b5 (b7b5)
  - FEN: `r1bqr1k1/ppp2ppp/2p2n2/2b5/2B1P3/2N5/PPPP1PPP/R1BQ1RK1 b - - 1 8`
- Morphy.pgn:1857.??.??:USA-01.Congress:6:Paulsen, Louis:Morphy, Paul  · middlegame · ply 30 · black vs Paulsen, Louis · result 0-1 · historical move Bd7 (c8d7)
  - FEN: `r1b3k1/p1p2ppp/1bp1r3/8/QP6/2Pq1B2/3P1PPP/R1B2RK1 b - - 0 15`
- Morphy.pgn:1857.??.??:USA-01.Congress:6:Paulsen, Louis:Morphy, Paul  · endgame · ply 44 · black vs Paulsen, Louis · result 0-1 · historical move Bg2+ (f3g2)
  - FEN: `4r1k1/p1p2ppp/Qbp3r1/8/1P6/2P2b2/R2P1P1P/2BR1K2 b - - 1 22`

### Most frequent source lines as White

- 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4 Bxb4 5.c3 Bc5 6.O-O d6 7.d4 exd4 8.cxd4 Bb6 · observed in 9 source games · ECO C51
- 1.e4 e5 2.Nf3 d6 3.d4 exd4 4.Qxd4 Nc6 5.Bb5 Bd7 6.Bxc6 Bxc6 7.Bg5 f6 8.Bh4 Nh6 · observed in 2 source games · ECO C62
- 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4 Bxb4 5.c3 Ba5 6.d4 exd4 7.O-O h6 8.Qb3 Qf6 · observed in 2 source games · ECO C52
- 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4 Bxb4 5.c3 Bc5 6.d4 exd4 7.cxd4 Bb6 8.O-O Na5 · observed in 2 source games · ECO C51
- 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.d4 exd4 5.Ng5 d5 6.exd5 Nxd5 7.O-O Be7 8.Nxf7 Kxf7 · observed in 2 source games · ECO C55
- 1.e4 e5 2.Nf3 Nc6 3.d4 exd4 4.Bc4 d6 5.c3 dxc3 6.Qb3 Qe7 7.O-O b6 8.Nxc3 Na5 · observed in 2 source games · ECO C44
- 1.e4 b6 2.d4 Bb7 3.Bd3 e6 4.Nh3 c5 5.c3 cxd4 6.cxd4 Nc6 7.Be3 Nb4 8.Nc3 Nxd3+ · observed in 1 source games · ECO B00
- 1.e4 b6 2.d4 Bb7 3.Bd3 e6 4.Nh3 d5 5.e5 Ne7 6.O-O Ng6 7.f4 Be7 8.f5 exf5 · observed in 1 source games · ECO B00
- 1.e4 b6 2.d4 Bb7 3.Bd3 e6 4.Nh3 Ne7 5.O-O d5 6.e5 Nec6 7.c3 Be7 8.f4 g6 · observed in 1 source games · ECO B00
- 1.e4 c5 2.d4 cxd4 3.Nf3 e5 4.Bc4 Bb4+ 5.c3 dxc3 6.bxc3 Bc5 7.Nxe5 Qf6 8.Bxf7+ Kf8 · observed in 1 source games · ECO B21
- 1.e4 c5 2.d4 cxd4 3.Nf3 e5 4.Bc4 Be7 5.c3 d6 6.Qb3 dxc3 7.Bxf7+ Kf8 8.Nxc3 Nc6 · observed in 1 source games · ECO B21
- 1.e4 c5 2.d4 cxd4 3.Nf3 e6 4.Nxd4 Bc5 5.Nb3 Bb6 6.Nc3 Ne7 7.Bf4 O-O 8.Bd6 f5 · observed in 1 source games · ECO B40

### Most frequent source lines as Black

- 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4 Bxb4 5.c3 Bc5 6.O-O d6 7.d4 exd4 8.cxd4 Bb6 · observed in 6 source games · ECO C51
- 1.a3 e5 2.c4 Nf6 3.Nc3 d5 4.cxd5 Nxd5 5.e3 Be6 6.Nf3 Bd6 7.Be2 O-O 8.d4 Nxc3 · observed in 2 source games · ECO A20
- 1.e4 e5 2.Nf3 Nf6 3.Nxe5 d6 4.Nf3 Nxe4 5.d4 d5 6.Bd3 Be7 7.O-O Nc6 8.c4 Be6 · observed in 2 source games · ECO C42
- 1.a3 e5 2.c4 Nf6 3.Nc3 d5 4.cxd5 Nxd5 5.e3 Be6 6.Nf3 Bd6 7.Be2 O-O 8.O-O Nxc3 · observed in 1 source games · ECO A20
- 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bf4 a6 5.e3 c5 6.Nf3 Nc6 7.a3 cxd4 8.exd4 dxc4 · observed in 1 source games · ECO D35
- 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Nf3 c5 5.e3 Nc6 6.a3 Bd6 7.dxc5 Bxc5 8.b4 Bd6 · observed in 1 source games · ECO D40
- 1.d4 e6 2.c4 d5 3.e3 Nf6 4.Nf3 c5 5.Nc3 Nc6 6.a3 Bd6 7.dxc5 Bxc5 8.b4 Bd6 · observed in 1 source games · ECO D40
- 1.d4 e6 2.c4 f5 3.f4 Nf6 4.a3 a5 5.Nc3 b6 6.Nf3 Bb7 7.e3 Be7 8.Be2 O-O · observed in 1 source games · ECO A84
- 1.d4 f5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Bb4 5.Qb3 c5 6.d5 e5 7.e3 O-O 8.Bd3 d6 · observed in 1 source games · ECO A85
- 1.d4 f5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Be7 5.e3 O-O 6.Bd3 b6 7.Nge2 Bb7 8.O-O Nh5 · observed in 1 source games · ECO A85
- 1.d4 f5 2.Nc3 Nf6 3.Bg5 e6 4.e4 fxe4 5.Nxe4 Be7 6.Bxf6 Bxf6 7.Qh5+ g6 8.Nxf6+ Qxf6 · observed in 1 source games · ECO A83
- 1.e4 c5 2.d4 cxd4 3.Nf3 e6 4.Nxd4 Nc6 5.Nb5 a6 6.Nd6+ Bxd6 7.Qxd6 Qe7 8.Qg3 Nf6 · observed in 1 source games · ECO B44

### Phrase archive

- general: חפש את הרעיון שמחבר בין הפתיחה לתוכנית האמצע. / Paul Morphy: יוזמה צריכה ליצור איום ממשי או לשפר פעילות. / בדוק את איומי שני הצדדים לפני בחירת מהלך.
- opening: שכיחות מהלך במשחקים היסטוריים אינה הוכחה שהוא הטוב ביותר. / Paul Morphy: חפש פיתוח מהיר ופתיחת קווים רק כשהמלך והכלים תומכים בכך. / השתמש ברפרטואר כנקודת התחלה, לא כהתחייבות עיוורת.
- threat: לפני בחירה טקטית, בדוק את התגובה הכפויה של היריב. / Paul Morphy: לפני התקפה, בדוק את תגובת ההגנה הטובה ביותר. / איום טוב הוא איום ששורד את ההגנה הטובה ביותר.
- tactics: שמור על איכות המהלך גם כאשר אתה מעדיף סגנון מסוים. / Paul Morphy: הקרבה דורשת וריאציה כפויה או תמורה עמדה ברורה. / אל תקריב חומר ללא תמורה שניתן להסביר.
- endgame: בסיומים, בדוק פעילות המלך והרגלים החופשיים. / Paul Morphy: גם התקפה צריכה לדעת מתי להמיר יתרון לסיום זכוי. / בדוק פעילות מלך, רגלים חופשיים וחולשות לפני חילופים.

---

## Hikaru Nakamura (nakamura)

- Source PGN: Nakamura.pgn
- Internal bot rating parameter: 2816 (Peak FIDE rating 2816 (2015))
- Rating source: https://2700chess.com/records
- Valid games attributed to the player: 10214
- Training / holdout games: 9194 / 1020
- Holdout captures/checks per 100 player moves: 19.37 / 5.79
- Date range: 1997–2026
- Results from the player perspective: 5812 wins, 2785 draws, 1617 losses
- Games as White / Black: 5158 / 5056
- Average game length: 97.05 plies
- Captures per 100 player moves: 19.4
- Checks per 100 player moves: 5.97
- King moves after ply 40 per 100 player moves: 10.45
- Opening diversity: 4294 White lines and 3833 Black lines
- Working style hypothesis: טקטי. חיפוש משאבים טקטיים ותגובות פעילות; הסיווג נשאר השערה עד בדיקת מנוע.

### Representative source games

- Nakamura.pgn:1998.??.??:New York State-ch:6:Farrell, Gary:Nakamura, Hikaru · 1998.??.?? · New York State-ch · round 6 · split training · black · vs Farrell, Gary · result 1/2-1/2 · ECO B20
  - Source move sample: 1.g3 g6 2.f4 Bg7 3.Bg2 d6 4.e4 c5 5.d3 Nc6 6.Nf3 e5 7.c3 Nge7 8.Be3 h6
- Nakamura.pgn:1997.??.??:Wch U10:1:Bellaiche, Antony:Nakamura, Hikaru · 1997.??.?? · Wch U10 · round 1 · split holdout · black · vs Bellaiche, Antony · result 1-0 · ECO E97
  - Source move sample: 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O 6.Be2 e5 7.O-O Nc6 8.d5 Ne7
- Nakamura.pgn:1997.??.??:Wch U10:7:Lepan, Marvin:Nakamura, Hikaru · 1997.??.?? · Wch U10 · round 7 · split training · black · vs Lepan, Marvin · result 0-1 · ECO E60
  - Source move sample: 1.d4 Nf6 2.c4 g6 3.b3 Bg7 4.Bb2 O-O 5.g3 d6 6.Bg2 e5 7.dxe5 Nfd7 8.Nf3 dxe5
- Nakamura.pgn:1999.01.12:Caribbean op:1:Nakamura, Hikaru:Denny, Kevin · 1999.01.12 · Caribbean op · round 1 · split training · white · vs Denny, Kevin · result 1/2-1/2 · ECO B23
  - Source move sample: 1.e4 c5 2.Nc3 Nc6 3.f4 g6 4.Nf3 Bg7 5.Bb5 Nd4 6.a4 a6 7.Bc4 e6 8.e5 d5
- Nakamura.pgn:1997.??.??:Wch U10:8:Nakamura, Hikaru:Baramietze, David · 1997.??.?? · Wch U10 · round 8 · split training · white · vs Baramietze, David · result 0-1 · ECO B23
  - Source move sample: 1.e4 c5 2.Nc3 Nc6 3.f4 g6 4.Nf3 Bg7 5.Bb5 Nd4 6.Bd3 d6 7.Nxd4 cxd4 8.Ne2 e5
- Nakamura.pgn:1997.??.??:Wch U10:2:Nakamura, Hikaru:El Mikati, Mohamad · 1997.??.?? · Wch U10 · round 2 · split training · white · vs El Mikati, Mohamad · result 1-0 · ECO C11
  - Source move sample: 1.e4 e6 2.d4 d5 3.Nc3 Nf6 4.Bg5 dxe4 5.Nxe4 Be7 6.Bxf6 Bxf6 7.c3 Nc6 8.Nf3 e5

### Held-out positions not used to build the repertoire

- Nakamura.pgn:1997.??.??:Wch U10:1:Bellaiche, Antony:Nakamura, Hikaru · opening · ply 10 · black vs Bellaiche, Antony · result 1-0 · historical move O-O (e8g8)
  - FEN: `rnbqk2r/ppp1ppbp/3p1np1/8/2PPP3/2N2N2/PP3PPP/R1BQKB1R b KQkq - 1 5`
- Nakamura.pgn:1997.??.??:Wch U10:1:Bellaiche, Antony:Nakamura, Hikaru · middlegame · ply 32 · black vs Bellaiche, Antony · result 1-0 · historical move Ng6 (e7g6)
  - FEN: `r1bq1rk1/pp2n1b1/3p3p/3P1pp1/1PPN1p2/2N5/P2Q1PPP/R3RBK1 b - - 1 16`
- Nakamura.pgn:1997.??.??:Wch U10:1:Bellaiche, Antony:Nakamura, Hikaru · middlegame · ply 62 · black vs Bellaiche, Antony · result 1-0 · historical move Bb7 (f3b7)
  - FEN: `5r1k/4Nqb1/3P3p/2p2pp1/5p2/5b2/3QBP1P/3RR1K1 b - - 1 31`
- Nakamura.pgn:1997.??.??:Wch U10:1:Bellaiche, Antony:Nakamura, Hikaru · endgame · ply 92 · black vs Bellaiche, Antony · result 1-0 · historical move Kg6 (f6g6)
  - FEN: `8/8/5k2/5b1p/2B2p1P/5P2/8/4R1K1 b - - 0 46`
- Nakamura.pgn:1998.12.28:Eastern op:5:Meyer, Eugene B:Nakamura, Hikaru · opening · ply 10 · black vs Meyer, Eugene B · result 1-0 · historical move O-O (e8g8)
  - FEN: `rnbqk2r/ppp1ppbp/3p1np1/8/2P5/5NP1/PP1PPPBP/RNBQ1RK1 b kq - 0 5`
- Nakamura.pgn:1998.12.28:Eastern op:5:Meyer, Eugene B:Nakamura, Hikaru · middlegame · ply 20 · black vs Meyer, Eugene B · result 1-0 · historical move Nh7 (f6h7)
  - FEN: `r1q2rk1/ppp1ppb1/2np1np1/6Bp/1PP3b1/2NP1NP1/P3PPBP/1R1Q1RK1 b - - 1 10`
- Nakamura.pgn:1998.12.28:Eastern op:5:Meyer, Eugene B:Nakamura, Hikaru · middlegame · ply 36 · black vs Meyer, Eugene B · result 1-0 · historical move Bf6 (g7f6)
  - FEN: `2r2rk1/pppq1pbn/3p2p1/7p/1PPn1PbN/2NP4/P2BP1BP/1R2QRK1 b - - 4 18`
- Nakamura.pgn:1998.12.28:Eastern op:5:Meyer, Eugene B:Nakamura, Hikaru · endgame · ply 54 · black vs Meyer, Eugene B · result 1-0 · historical move Kg7 (g8g7)
  - FEN: `5rk1/p1p1rp1n/3p2p1/3B3p/1PP2PbN/3PP3/PqnB1Q1P/2R1R1K1 b - - 4 27`
- Nakamura.pgn:1999.01.13:Caribbean op:3:Nakamura, Hikaru:Barker, Michael · opening · ply 9 · white vs Barker, Michael · result 1-0 · historical move Nc3 (b1c3)
  - FEN: `r1bqkb1r/pppp1ppp/2n2n2/8/3NP3/8/PPP2PPP/RNBQKB1R w KQkq - 1 5`
- Nakamura.pgn:1999.01.13:Caribbean op:3:Nakamura, Hikaru:Barker, Michael · middlegame · ply 39 · white vs Barker, Michael · result 1-0 · historical move Bd4 (f2d4)
  - FEN: `r3nbk1/prp2ppp/2qp4/5P2/4P3/1PN2R1P/P1P2BP1/1R1Q2K1 w - - 1 20`
- Nakamura.pgn:1999.01.13:Caribbean op:3:Nakamura, Hikaru:Barker, Michael · middlegame · ply 75 · white vs Barker, Michael · result 1-0 · historical move b4 (b3b4)
  - FEN: `4r3/p3qpkp/5b2/2p2r2/2P1p3/PP2B2P/2Q1R1P1/1R4K1 w - - 0 38`
- Nakamura.pgn:1999.01.13:Caribbean op:3:Nakamura, Hikaru:Barker, Michael · endgame · ply 111 · white vs Barker, Michael · result 1-0 · historical move R1e6+ (e1e6)
  - FEN: `8/p3R2p/6k1/2P2r2/2r2p2/P6P/6P1/4R2K w - - 2 56`
- Nakamura.pgn:1999.08.07:Financial Concept Open 6th:7:Stroud, Mike:Nakamura, Hikaru · opening · ply 10 · black vs Stroud, Mike · result 0-1 · historical move O-O (e8g8)
  - FEN: `rnbqk2r/ppp1ppbp/3p1np1/8/2PPP3/2N2N2/PP3PPP/R1BQKB1R b KQkq - 1 5`
- Nakamura.pgn:1999.08.07:Financial Concept Open 6th:7:Stroud, Mike:Nakamura, Hikaru · middlegame · ply 20 · black vs Stroud, Mike · result 0-1 · historical move h6 (h7h6)
  - FEN: `rnb2rk1/pp2qpbp/2p2np1/4p3/2P1P3/2N1BN2/PPQ1BPPP/R4RK1 b - - 3 10`
- Nakamura.pgn:1999.08.07:Financial Concept Open 6th:7:Stroud, Mike:Nakamura, Hikaru · middlegame · ply 38 · black vs Stroud, Mike · result 0-1 · historical move Nf6 (d7f6)
  - FEN: `r4r1k/ppnnq1b1/2p1b2p/2P1p1p1/NPB1Pp2/1N3P2/P1Q2BPP/3R1RK1 b - - 1 19`
- Nakamura.pgn:1999.08.07:Financial Concept Open 6th:7:Stroud, Mike:Nakamura, Hikaru · endgame · ply 58 · black vs Stroud, Mike · result 0-1 · historical move Rxf6 (f8f6)
  - FEN: `r4r1k/pp5n/2pNnB1p/2P1p2q/1P2Pp2/1N3P2/P4Q1P/3R1RK1 b - - 0 29`
- Nakamura.pgn:1999.10.26:Wch U12:3:Nakamura, Hikaru:Tanrikulu, Secim Erhan · opening · ply 9 · white vs Tanrikulu, Secim Erhan · result 1-0 · historical move d4 (d2d4)
  - FEN: `r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R w KQkq - 1 5`
- Nakamura.pgn:1999.10.26:Wch U12:3:Nakamura, Hikaru:Tanrikulu, Secim Erhan · middlegame · ply 13 · white vs Tanrikulu, Secim Erhan · result 1-0 · historical move Bd2 (c1d2)
  - FEN: `r1bqk2r/pppp1ppp/2n2n2/8/1bBPP3/5N2/PP3PPP/RNBQK2R w KQkq - 1 7`
- Nakamura.pgn:1999.10.26:Wch U12:3:Nakamura, Hikaru:Tanrikulu, Secim Erhan · middlegame · ply 23 · white vs Tanrikulu, Secim Erhan · result 1-0 · historical move Nxe4 (d2e4)
  - FEN: `r1bq1rk1/ppp2ppp/2n2n2/8/3Pp3/3B1N1P/PP1N1PP1/R2Q1RK1 w - - 0 12`
- Nakamura.pgn:1999.10.26:Wch U12:3:Nakamura, Hikaru:Tanrikulu, Secim Erhan · endgame · ply 35 · white vs Tanrikulu, Secim Erhan · result 1-0 · historical move Qc2 (b3c2)
  - FEN: `r4rk1/p1pq1ppp/1p6/n7/3P4/1Q3N1P/PP3PP1/2RR2K1 w - - 2 18`
- Nakamura.pgn:1999.12.29:Eastern Open:7:Nakamura,H:Kaufman,La · opening · ply 9 · white vs Kaufman,La · result 1/2-1/2 · historical move e5 (e4e5)
  - FEN: `rnbqk2r/ppp2ppp/4pn2/3p2B1/1b1PP3/2N5/PPP2PPP/R2QKBNR w KQkq - 4 5`
- Nakamura.pgn:1999.12.29:Eastern Open:7:Nakamura,H:Kaufman,La · middlegame · ply 29 · white vs Kaufman,La · result 1/2-1/2 · historical move c3 (c2c3)
  - FEN: `r3k2r/ppqb1p2/2n1p1pp/3pP3/3P2QP/3B1N2/P1PK1PP1/RR6 w kq - 3 15`
- Nakamura.pgn:1999.12.29:Eastern Open:7:Nakamura,H:Kaufman,La · middlegame · ply 55 · white vs Kaufman,La · result 1/2-1/2 · historical move Rc1+ (a1c1)
  - FEN: `3r4/ppk5/6p1/4P2p/3n1r1P/1R3N2/P2K1P2/R7 w - - 0 28`
- Nakamura.pgn:1999.12.29:Eastern Open:7:Nakamura,H:Kaufman,La · endgame · ply 83 · white vs Kaufman,La · result 1/2-1/2 · historical move a3 (a2a3)
  - FEN: `8/p6R/kp6/5r1p/r4P2/5R2/P1K5/8 w - - 10 42`

### Most frequent source lines as White

- 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O Nxe4 5.Re1 Nd6 6.Nxe5 Be7 7.Bf1 Nxe5 8.Rxe5 O-O · observed in 19 source games · ECO C67
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.c3 d5 · observed in 12 source games · ECO C89
- 1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.cxd5 Nxd5 5.e4 Nxc3 6.bxc3 Bg7 7.Bg5 c5 8.Rc1 cxd4 · observed in 11 source games · ECO D85
- 1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e5 6.Ndb5 d6 7.Bg5 a6 8.Na3 b5 · observed in 10 source games · ECO B33
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.a4 b4 · observed in 10 source games · ECO C88
- 1.Nf3 d5 2.e3 Nf6 3.c4 e6 4.b3 c5 5.Bb2 Nc6 6.cxd5 exd5 7.Bb5 Bd6 8.O-O O-O · observed in 9 source games · ECO A13
- 1.b3 e5 2.Bb2 Nc6 3.e3 d5 4.Bb5 Ne7 5.Bxe5 a6 6.Bxc6+ Nxc6 7.Bb2 Qg5 8.Kf1 Bg4 · observed in 7 source games · ECO A01
- 1.b3 e5 2.Bb2 Nc6 3.e3 Nf6 4.Bb5 e4 5.f3 a6 6.Bxc6 dxc6 7.Nc3 Bf5 8.fxe4 Nxe4 · observed in 5 source games · ECO A01
- 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Qxd4 Nc6 5.Bb5 Bd7 6.Bxc6 Bxc6 7.Nc3 Nf6 8.Bg5 e6 · observed in 5 source games · ECO B53
- 1.e4 c6 2.d4 d5 3.e5 Bf5 4.h4 h5 5.Bd3 Bxd3 6.Qxd3 Qa5+ 7.Bd2 Qa6 8.e6 Qxd3 · observed in 5 source games · ECO B12
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Nxe4 6.d4 b5 7.Bb3 d5 8.dxe5 Be6 · observed in 5 source games · ECO C80
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.d3 Bc5 5.Bxc6 dxc6 6.O-O Nd7 7.Nbd2 O-O 8.Nc4 Re8 · observed in 5 source games · ECO C65

### Most frequent source lines as Black

- 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O Nxe4 5.d4 Nd6 6.Bxc6 dxc6 7.dxe5 Nf5 8.Qxd8+ Kxd8 · observed in 64 source games · ECO C67
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O Nxe4 5.Re1 Nd6 6.Nxe5 Be7 7.Bf1 Nxe5 8.Rxe5 O-O · observed in 40 source games · ECO C67
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O Nxe4 5.Re1 Nd6 6.Nxe5 Be7 7.Bf1 Nf5 8.Nf3 O-O · observed in 24 source games · ECO C67
- 1.d4 Nf6 2.c4 e6 3.Nf3 d5 4.g3 Be7 5.Bg2 O-O 6.O-O dxc4 7.Qc2 b5 8.a4 Bb7 · observed in 16 source games · ECO E06
- 1.d4 Nf6 2.c4 e6 3.Nf3 d5 4.Nc3 Be7 5.Bf4 O-O 6.e3 Nbd7 7.c5 c6 8.h3 b6 · observed in 15 source games · ECO D37
- 1.d4 Nf6 2.c4 e6 3.Nf3 d5 4.Nc3 Be7 5.Bf4 O-O 6.e3 c5 7.dxc5 Bxc5 8.cxd5 Nxd5 · observed in 14 source games · ECO D37
- 1.d4 Nf6 2.c4 e6 3.Nf3 d5 4.g3 Be7 5.Bg2 O-O 6.O-O dxc4 7.Qc2 a6 8.a4 Bd7 · observed in 13 source games · ECO E06
- 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O 6.Be2 e5 7.O-O Nc6 8.d5 Ne7 · observed in 11 source games · ECO E97
- 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d3 d6 6.O-O h6 7.Re1 O-O 8.Nbd2 a5 · observed in 11 source games · ECO C53
- 1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.Qc2 O-O 5.e4 d5 6.e5 Ne4 7.Bd3 c5 8.Nf3 cxd4 · observed in 10 source games · ECO E32
- 1.d4 Nf6 2.c4 e6 3.Nf3 d5 4.Nc3 Be7 5.Bf4 O-O 6.e3 c5 7.dxc5 Bxc5 8.a3 Nc6 · observed in 10 source games · ECO D37
- 1.e4 e5 2.Nf3 Nc6 3.Nc3 Nf6 4.d4 exd4 5.Nxd4 Bb4 6.Nxc6 bxc6 7.Bd3 O-O 8.O-O d5 · observed in 10 source games · ECO C47

### Phrase archive

- general: חפש את הרעיון שמחבר בין הפתיחה לתוכנית האמצע. / Hikaru Nakamura: חפש מהלכים כפויים לפני בחירה שקטה. / בדוק את איומי שני הצדדים לפני בחירת מהלך.
- opening: שכיחות מהלך במשחקים היסטוריים אינה הוכחה שהוא הטוב ביותר. / Hikaru Nakamura: פתח עמדות רק לאחר בדיקת בטיחות המלך. / השתמש ברפרטואר כנקודת התחלה, לא כהתחייבות עיוורת.
- threat: לפני בחירה טקטית, בדוק את התגובה הכפויה של היריב. / Hikaru Nakamura: סרוק שח, הכאות ואיומים בשני הצדדים. / איום טוב הוא איום ששורד את ההגנה הטובה ביותר.
- tactics: שמור על איכות המהלך גם כאשר אתה מעדיף סגנון מסוים. / Hikaru Nakamura: חשב את רצף התגובות, לא רק את המהלך הראשון. / אל תקריב חומר ללא תמורה שניתן להסביר.
- endgame: בסיומים, בדוק פעילות המלך והרגלים החופשיים. / Hikaru Nakamura: גם בסיום, בדוק טקטיקות והגנות כפויות. / בדוק פעילות מלך, רגלים חופשיים וחולשות לפני חילופים.

---

## Judit Polgár (polgarj)

- Source PGN: PolgarJ.pgn
- Internal bot rating parameter: 2735 (Peak FIDE rating 2735 (2005))
- Rating source: https://betterchess.co/players
- Valid games attributed to the player: 1823
- Training / holdout games: 1640 / 183
- Holdout captures/checks per 100 player moves: 20.03 / 5.91
- Date range: 1987–2014
- Results from the player perspective: 667 wins, 675 draws, 480 losses
- Games as White / Black: 927 / 896
- Average game length: 88.16 plies
- Captures per 100 player moves: 19.8
- Checks per 100 player moves: 5.66
- King moves after ply 40 per 100 player moves: 8.92
- Opening diversity: 585 White lines and 692 Black lines
- Working style hypothesis: התקפי וטקטי. יוזמה והתקפה ישירה; זהו סיווג עבודה שיש לבדוק על משחקים שלא שימשו לבנייה.

### Representative source games

- PolgarJ.pgn:1987.??.??:Biel schev:?:Huss, Andreas:Polgar, Judit · 1987.??.?? · Biel schev · round ? · split training · black · vs Huss, Andreas · result 1/2-1/2 · ECO A59
  - Source move sample: 1.d4 Nf6 2.Nf3 g6 3.c4 c5 4.d5 b5 5.cxb5 a6 6.bxa6 Bg7 7.Nc3 Bxa6 8.e4 Bxf1
- PolgarJ.pgn:1987.??.??:Biel schev:?:Gobet, Fernand:Polgar, Judit · 1987.??.?? · Biel schev · round ? · split training · black · vs Gobet, Fernand · result 1-0 · ECO B80
  - Source move sample: 1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 d6 6.g3 Be7 7.Bg2 O-O 8.O-O Nc6
- PolgarJ.pgn:2010.12.17:29th European Blitz:10:Romanov,E:Polgar,Ju · 2010.12.17 · 29th European Blitz · round 10 · split training · black · vs Romanov,E · result * · ECO A15
  - Source move sample: 1.c4 Nf6 2.g3 g6 3.Bg2 Bg7 4.Nc3 c5 5.e4 Nc6 6.Nge2 O-O 7.O-O Ne8 8.h3 Nc7
- PolgarJ.pgn:1987.??.??:Biel schev:?:Landenbergue, Claude:Polgar, Judit · 1987.??.?? · Biel schev · round ? · split training · black · vs Landenbergue, Claude · result 0-1 · ECO B38
  - Source move sample: 1.Nf3 c5 2.c4 Nc6 3.d4 cxd4 4.Nxd4 g6 5.e4 Bg7 6.Be3 Nf6 7.Nc3 d6 8.Be2 O-O
- PolgarJ.pgn:1987.??.??:Biel schev:?:Polgar, Judit:Nemet, Ivan · 1987.??.?? · Biel schev · round ? · split holdout · white · vs Nemet, Ivan · result 1/2-1/2 · ECO B70
  - Source move sample: 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6 6.g3 Nc6 7.Nde2 Bg7 8.Bg2 Kf8
- PolgarJ.pgn:1987.??.??:Biel schev:?:Polgar, Judit:Zueger, Beat · 1987.??.?? · Biel schev · round ? · split training · white · vs Zueger, Beat · result 0-1 · ECO C14
  - Source move sample: 1.e4 e6 2.d4 d5 3.Nc3 Nf6 4.Bg5 Be7 5.e5 Nfd7 6.Bxe7 Qxe7 7.f4 O-O 8.Nf3 a6
- PolgarJ.pgn:1987.??.??:Biel schev:?:Polgar, Judit:Costa, Jean Luc · 1987.??.?? · Biel schev · round ? · split training · white · vs Costa, Jean Luc · result 1-0 · ECO C36
  - Source move sample: 1.e4 e5 2.f4 exf4 3.Bc4 Ne7 4.Nf3 d5 5.exd5 Nxd5 6.O-O Be6 7.Bxd5 Bxd5 8.d4 Nc6

### Held-out positions not used to build the repertoire

- PolgarJ.pgn:1987.??.??:Biel schev:?:Polgar, Judit:Nemet, Ivan · middlegame · ply 9 · white vs Nemet, Ivan · result 1/2-1/2 · historical move Nc3 (b1c3)
  - FEN: `rnbqkb1r/pp2pppp/3p1n2/8/3NP3/8/PPP2PPP/RNBQKB1R w KQkq - 1 5`
- PolgarJ.pgn:1987.??.??:Biel schev:?:Polgar, Judit:Nemet, Ivan · middlegame · ply 17 · white vs Nemet, Ivan · result 1/2-1/2 · historical move O-O (e1g1)
  - FEN: `r1bq1k1r/pp2ppbp/2np1np1/8/4P3/2N3P1/PPP1NPBP/R1BQK2R w KQ - 5 9`
- PolgarJ.pgn:1987.??.??:Biel schev:?:Polgar, Judit:Nemet, Ivan · endgame · ply 23 · white vs Nemet, Ivan · result 1/2-1/2 · historical move Nd5 (c3d5)
  - FEN: `r2q1k1r/1p1bppbp/3p1np1/p7/Pn2P3/2N3PP/1PP1NPB1/R1BQ1RK1 w - - 1 12`
- PolgarJ.pgn:1987.??.??:Biel schev:?:Polgar, Judit:Gobet, Fernand · opening · ply 9 · white vs Gobet, Fernand · result 0-1 · historical move Nb5 (d4b5)
  - FEN: `r1bqkbnr/pp1p1ppp/2n1p3/8/3NP3/8/PPP2PPP/RNBQKB1R w KQkq - 1 5`
- PolgarJ.pgn:1987.??.??:Biel schev:?:Polgar, Judit:Gobet, Fernand · middlegame · ply 19 · white vs Gobet, Fernand · result 0-1 · historical move Nd5 (c3d5)
  - FEN: `r1bqk2r/1p2bppp/p1np1n2/4p3/4P3/N1N1B3/PPP2PPP/R2QKB1R w KQkq - 4 10`
- PolgarJ.pgn:1987.??.??:Biel schev:?:Polgar, Judit:Gobet, Fernand · middlegame · ply 37 · white vs Gobet, Fernand · result 0-1 · historical move Re1 (f1e1)
  - FEN: `r1b2rk1/1p2b1pp/p2p4/2nP1p2/2P2B2/3B4/PqN3PP/R2Q1R1K w - - 2 19`
- PolgarJ.pgn:1987.??.??:Biel schev:?:Polgar, Judit:Gobet, Fernand · endgame · ply 55 · white vs Gobet, Fernand · result 0-1 · historical move Rb6 (b5b6)
  - FEN: `5rk1/5qpp/3b4/1RpP1p2/8/4N3/r5PP/3QR2K w - - 0 28`
- PolgarJ.pgn:1987.??.??:OHRA op:9:Pergericht, Daniel:Polgar, Judit · opening · ply 10 · black vs Pergericht, Daniel · result 1-0 · historical move e6 (e7e6)
  - FEN: `rnbqkb1r/1p2pppp/p4n2/2pp4/2P5/1P2PN2/PB1P1PPP/RN1QKB1R b KQkq - 0 5`
- PolgarJ.pgn:1987.??.??:OHRA op:9:Pergericht, Daniel:Polgar, Judit · middlegame · ply 14 · black vs Pergericht, Daniel · result 1-0 · historical move exd5 (e6d5)
  - FEN: `r1bqkb1r/1p3ppp/p1n1pn2/2pP4/8/1P2PN2/PB1PBPPP/RN1QK2R b KQkq - 0 7`
- PolgarJ.pgn:1987.??.??:OHRA op:9:Pergericht, Daniel:Polgar, Judit · middlegame · ply 28 · black vs Pergericht, Daniel · result 1-0 · historical move Bc7 (b6c7)
  - FEN: `r3k2r/1p1q1ppp/pbn2n2/5b2/2Np4/BP1P1N2/P3BPPP/2RQ1RK1 b kq - 8 14`
- PolgarJ.pgn:1987.??.??:OHRA op:9:Pergericht, Daniel:Polgar, Judit · endgame · ply 40 · black vs Pergericht, Daniel · result 1-0 · historical move Qxc8 (d7c8)
  - FEN: `2R1k2r/3q1ppp/p3bn2/1p2R3/3p4/BP1P1B2/P4PPP/3Q2K1 b k - 0 20`
- PolgarJ.pgn:1988.??.??:Hastings op8889:?:Plaskett, Jim:Polgar, Judit · opening · ply 10 · black vs Plaskett, Jim · result 1-0 · historical move e6 (e7e6)
  - FEN: `r1bqk1nr/pp1pppbp/2n3p1/1Bp5/4PP2/2N2N2/PPPP2PP/R1BQK2R b KQkq - 3 5`
- PolgarJ.pgn:1988.??.??:Hastings op8889:?:Plaskett, Jim:Polgar, Judit · middlegame · ply 14 · black vs Plaskett, Jim · result 1-0 · historical move d5 (d7d5)
  - FEN: `r1bqk1nr/p2p1pbp/2p1p1p1/2p1P3/5P2/2N2N2/PPPP2PP/R1BQK2R b KQkq - 0 7`
- PolgarJ.pgn:1988.??.??:Hastings op8889:?:Plaskett, Jim:Polgar, Judit · middlegame · ply 28 · black vs Plaskett, Jim · result 1-0 · historical move Qc7 (d6c7)
  - FEN: `3r1rk1/p4pbp/b1pqp1p1/2pn4/4NP2/1P1P1N2/P1PB2PP/R3QRK1 b - - 6 14`
- PolgarJ.pgn:1988.??.??:Hastings op8889:?:Plaskett, Jim:Polgar, Judit · endgame · ply 40 · black vs Plaskett, Jim · result 1-0 · historical move Rb8 (d8b8)
  - FEN: `3r1rk1/pb1q2bp/2p3p1/2Qnp1B1/2N1N3/1P1P4/P1P3PP/R4RK1 b - - 2 20`
- PolgarJ.pgn:1988.??.??:Reykjavik op:?:Polgar, Judit:Barle, Janez · opening · ply 9 · white vs Barle, Janez · result 1/2-1/2 · historical move exd5 (e4d5)
  - FEN: `rnbqkb1r/ppp2ppp/5n2/3p4/2B1Pp2/3P4/PPP3PP/RNBQK1NR w KQkq - 0 5`
- PolgarJ.pgn:1988.??.??:Reykjavik op:?:Polgar, Judit:Barle, Janez · middlegame · ply 33 · white vs Barle, Janez · result 1/2-1/2 · historical move Ne4 (c3e4)
  - FEN: `r3r1k1/pp1qb1pp/2p2p2/8/5Bb1/2NP4/PPP2QPP/4RRK1 w - - 0 17`
- PolgarJ.pgn:1988.??.??:Reykjavik op:?:Polgar, Judit:Barle, Janez · middlegame · ply 65 · white vs Barle, Janez · result 1/2-1/2 · historical move Nf1 (d2f1)
  - FEN: `1b1r1rk1/p5pp/1ppq1pb1/8/PP6/2BP1Q1P/2PNR1P1/4R2K w - - 5 33`
- PolgarJ.pgn:1988.??.??:Reykjavik op:?:Polgar, Judit:Barle, Janez · endgame · ply 97 · white vs Barle, Janez · result 1/2-1/2 · historical move cxd3 (c2d3)
  - FEN: `6k1/2b3p1/3q3p/3b4/5p2/3p1N1P/2PB1QP1/7K w - - 0 49`
- PolgarJ.pgn:1988.??.??:Reykjavik op:?:Tisdall, Jonathan D:Polgar, Judit · opening · ply 10 · black vs Tisdall, Jonathan D · result 0-1 · historical move Nc6 (b8c6)
  - FEN: `rnbqk2r/pp1p1ppp/4pn2/2p5/1bPP4/2NBP3/PP3PPP/R1BQK1NR b KQkq - 1 5`
- PolgarJ.pgn:1988.??.??:Reykjavik op:?:Tisdall, Jonathan D:Polgar, Judit · middlegame · ply 30 · black vs Tisdall, Jonathan D · result 0-1 · historical move Qg6 (h5g6)
  - FEN: `r1b2rk1/pp2bppp/2n5/3p3q/3P4/3Q2P1/PPBBNP1P/R4RK1 b - - 3 15`
- PolgarJ.pgn:1988.??.??:Reykjavik op:?:Tisdall, Jonathan D:Polgar, Judit · middlegame · ply 60 · black vs Tisdall, Jonathan D · result 0-1 · historical move Bg4 (f5g4)
  - FEN: `5k2/pp3p2/5pp1/2r2b2/7P/1BP3P1/P4P2/2R2K2 b - - 4 30`
- PolgarJ.pgn:1988.??.??:Reykjavik op:?:Tisdall, Jonathan D:Polgar, Judit · endgame · ply 88 · black vs Tisdall, Jonathan D · result 0-1 · historical move Ra3+ (a2a3)
  - FEN: `8/p3kp2/2R3p1/5p2/5P1P/4K1P1/r7/8 b - - 5 44`
- PolgarJ.pgn:1988.??.??:Thessaloniki ol (Women):?:Polgar, Judit:Maskova, Jana · opening · ply 9 · white vs Maskova, Jana · result 1-0 · historical move Re1 (f1e1)
  - FEN: `r1bqkb1r/pp1pnppp/2n1p3/1Bp5/4P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 2 5`

### Most frequent source lines as White

- 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O Nxe4 5.d4 Nd6 6.Bxc6 dxc6 7.dxe5 Nf5 8.Qxd8+ Kxd8 · observed in 20 source games · ECO C67
- 1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e5 6.Ndb5 d6 7.Bg5 a6 8.Na3 b5 · observed in 19 source games · ECO B33
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.c3 d5 · observed in 15 source games · ECO C89
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O · observed in 12 source games · ECO C92
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O · observed in 10 source games · ECO C95
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.d3 d6 · observed in 8 source games · ECO C90
- 1.e4 e5 2.Nf3 Nf6 3.Nxe5 d6 4.Nf3 Nxe4 5.d4 d5 6.Bd3 Nc6 7.O-O Be7 8.c4 Nb4 · observed in 8 source games · ECO C42
- 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be3 e5 7.Nf3 Be7 8.Bc4 O-O · observed in 7 source games · ECO B90
- 1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 Nc6 6.Ndb5 d6 7.Bf4 e5 8.Bg5 a6 · observed in 7 source games · ECO B33
- 1.e4 c6 2.d4 d5 3.exd5 cxd5 4.c4 Nf6 5.Nc3 e6 6.Nf3 Be7 7.cxd5 Nxd5 8.Bd3 Nc6 · observed in 6 source games · ECO D42
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.h3 Bb7 · observed in 6 source games · ECO C88
- 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.f4 e5 7.Nf3 Nbd7 8.a4 Be7 · observed in 5 source games · ECO B93

### Most frequent source lines as Black

- 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O 6.Be2 e5 7.O-O Nc6 8.d5 Ne7 · observed in 14 source games · ECO E97
- 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be3 Ng4 7.Bg5 h6 8.Bh4 g5 · observed in 9 source games · ECO B90
- 1.d4 Nf6 2.Nf3 g6 3.c4 Bg7 4.Nc3 O-O 5.e4 d6 6.Be2 e5 7.O-O Nc6 8.d5 Ne7 · observed in 7 source games · ECO E97
- 1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nc6 5.Nc3 Qc7 6.Be2 a6 7.O-O Nf6 8.Kh1 Nxd4 · observed in 7 source games · ECO B47
- 1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nc6 5.Nc3 Qc7 6.Be3 a6 7.Qd2 Nf6 8.O-O-O Bb4 · observed in 7 source games · ECO B48
- 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be2 e5 7.Nb3 Be7 8.O-O O-O · observed in 6 source games · ECO B92
- 1.d4 Nf6 2.c4 e6 3.Nf3 b6 4.g3 Ba6 5.b3 Bb4+ 6.Bd2 Be7 7.Bg2 c6 8.Bc3 d5 · observed in 5 source games · ECO E15
- 1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nc6 5.Nb5 d6 6.c4 Nf6 7.N1c3 a6 8.Na3 b6 · observed in 5 source games · ECO B44
- 1.Nf3 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.d4 O-O 6.Be2 e5 7.O-O Nc6 8.d5 Ne7 · observed in 5 source games · ECO E97
- 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Be2 O-O 6.Nf3 e5 7.O-O Nc6 8.d5 Ne7 · observed in 4 source games · ECO E98
- 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O 6.Be2 e5 7.Be3 Ng4 8.Bg5 f6 · observed in 4 source games · ECO E92
- 1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nc6 5.Nc3 Qc7 6.Be2 a6 7.O-O Nf6 8.Be3 Bb4 · observed in 4 source games · ECO B49

### Phrase archive

- general: חפש את הרעיון שמחבר בין הפתיחה לתוכנית האמצע. / Judit Polgár: יוזמה צריכה ליצור איום ממשי או לשפר פעילות. / בדוק את איומי שני הצדדים לפני בחירת מהלך.
- opening: שכיחות מהלך במשחקים היסטוריים אינה הוכחה שהוא הטוב ביותר. / Judit Polgár: חפש פיתוח מהיר ופתיחת קווים רק כשהמלך והכלים תומכים בכך. / השתמש ברפרטואר כנקודת התחלה, לא כהתחייבות עיוורת.
- threat: לפני בחירה טקטית, בדוק את התגובה הכפויה של היריב. / Judit Polgár: לפני התקפה, בדוק את תגובת ההגנה הטובה ביותר. / איום טוב הוא איום ששורד את ההגנה הטובה ביותר.
- tactics: שמור על איכות המהלך גם כאשר אתה מעדיף סגנון מסוים. / Judit Polgár: הקרבה דורשת וריאציה כפויה או תמורה עמדה ברורה. / אל תקריב חומר ללא תמורה שניתן להסביר.
- endgame: בסיומים, בדוק פעילות המלך והרגלים החופשיים. / Judit Polgár: גם התקפה צריכה לדעת מתי להמיר יתרון לסיום זכוי. / בדוק פעילות מלך, רגלים חופשיים וחולשות לפני חילופים.

---

## The Magician from Riga (tal)

- Source PGN: Tal.pgn
- Internal bot rating parameter: 2705 (Peak FIDE rating 2705 (1980))
- Rating source: https://www.chess.com/blog/CurvySmile/list-of-chess-players-by-peak-fide-rating
- Valid games attributed to the player: 2430
- Training / holdout games: 2186 / 244
- Holdout captures/checks per 100 player moves: 20.81 / 4.73
- Date range: 1952–1992
- Results from the player perspective: 981 wins, 1175 draws, 273 losses
- Games as White / Black: 1233 / 1197
- Average game length: 71.36 plies
- Captures per 100 player moves: 21.26
- Checks per 100 player moves: 5.3
- King moves after ply 40 per 100 player moves: 6.81
- Opening diversity: 914 White lines and 998 Black lines
- Working style hypothesis: טקטי והתקפי. יוזמה, איומים והקרבה מחושבת: כל הקרבה צריכה לקנות משהו על הלוח.

### Representative source games

- Tal.pgn:1952.??.??:Riga-ch:?:Mileika, Janis:Tal, Mihail · 1952.??.?? · Riga-ch · round ? · split training · black · vs Mileika, Janis · result 1/2-1/2 · ECO D44
  - Source move sample: 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Nf3 c6 5.Bg5 dxc4 6.e4 b5 7.e5 h6 8.Bh4 g5
- Tal.pgn:1952.??.??:Riga-ch:?:Pasman, M.:Tal, Mihail · 1952.??.?? · Riga-ch · round ? · split training · black · vs Pasman, M. · result 1-0 · ECO E92
  - Source move sample: 1.d4 Nf6 2.c4 d6 3.Nf3 g6 4.Nc3 Bg7 5.e4 O-O 6.Be2 e5 7.d5 Nh5 8.g3 a5
- Tal.pgn:1952.??.??:LAT-ch:?:Klasup, Karlis:Tal, Mihail · 1952.??.?? · LAT-ch · round ? · split holdout · black · vs Klasup, Karlis · result 0-1 · ECO D46
  - Source move sample: 1.d4 Nf6 2.c4 e6 3.Nf3 d5 4.Nc3 c6 5.e3 Nbd7 6.Bd3 Bb4 7.a3 Ba5 8.O-O O-O
- Tal.pgn:1954.??.??:LAT-ch:?:Tal, Mihail:Gipslis, Aivars · 1954.??.?? · LAT-ch · round ? · split training · white · vs Gipslis, Aivars · result 1/2-1/2 · ECO A34
  - Source move sample: 1.c4 Nf6 2.Nc3 c5 3.g3 d5 4.cxd5 Nxd5 5.Bg2 Nc7 6.d3 e5 7.f4 exf4 8.Bxf4 Be7
- Tal.pgn:1953.??.??:LAT-ch sf:?:Tal, Mihail:Pigit · 1953.??.?? · LAT-ch sf · round ? · split holdout · white · vs Pigit · result 0-1 · ECO B62
  - Source move sample: 1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 d6 6.Bg5 e6 7.Nxc6 bxc6 8.e5 Qa5
- Tal.pgn:1983.??.??:URS-ch50:?:Tal, Mihail:Tukmakov, Vladimir B · 1983.??.?? · URS-ch50 · round ? · split training · white · vs Tukmakov, Vladimir B · result * · ECO B66
  - Source move sample: 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 Nc6 6.Bg5 e6 7.Qd2 a6 8.O-O-O h6
- Tal.pgn:1952.??.??:Riga-ch:?:Tal, Mihail:Klasup, Karlis · 1952.??.?? · Riga-ch · round ? · split training · white · vs Klasup, Karlis · result 1-0 · ECO A82
  - Source move sample: 1.d4 f5 2.e4 fxe4 3.Nc3 Nf6 4.f3 d5 5.fxe4 dxe4 6.Bc4 Bf5 7.Nge2 Nc6 8.O-O e6

### Held-out positions not used to build the repertoire

- Tal.pgn:1952.??.??:LAT-ch:?:Klasup, Karlis:Tal, Mihail · opening · ply 10 · black vs Klasup, Karlis · result 0-1 · historical move Nbd7 (b8d7)
  - FEN: `rnbqkb1r/pp3ppp/2p1pn2/3p4/2PP4/2N1PN2/PP3PPP/R1BQKB1R b KQkq - 0 5`
- Tal.pgn:1952.??.??:LAT-ch:?:Klasup, Karlis:Tal, Mihail · middlegame · ply 16 · black vs Klasup, Karlis · result 0-1 · historical move O-O (e8g8)
  - FEN: `r1bqk2r/pp1n1ppp/2p1pn2/b2p4/2PP4/P1NBPN2/1P3PPP/R1BQ1RK1 b kq - 2 8`
- Tal.pgn:1952.??.??:LAT-ch:?:Klasup, Karlis:Tal, Mihail · middlegame · ply 32 · black vs Klasup, Karlis · result 0-1 · historical move fxe5 (f6e5)
  - FEN: `r1b2r1k/pp1nq1pp/1bp1Bp2/4P3/1P2NP2/PQ2P3/6PP/R1B2RK1 b - - 2 16`
- Tal.pgn:1952.??.??:LAT-ch:?:Klasup, Karlis:Tal, Mihail · endgame · ply 46 · black vs Klasup, Karlis · result 0-1 · historical move Qe2 (e7e2)
  - FEN: `r1b4k/pp2qBpp/1bp5/8/1P3P2/PQ1n4/6PP/R1B2R1K b - - 4 23`
- Tal.pgn:1953.??.??:LAT-ch sf:?:Tal, Mihail:Rozenberg, S. · opening · ply 9 · white vs Rozenberg, S. · result 1-0 · historical move Ng3 (e4g3)
  - FEN: `rnbqkb1r/pp2pppp/2p2n2/8/3PN3/8/PPP2PPP/R1BQKBNR w KQkq - 1 5`
- Tal.pgn:1953.??.??:LAT-ch sf:?:Tal, Mihail:Rozenberg, S. · middlegame · ply 21 · white vs Rozenberg, S. · result 1-0 · historical move Bf4 (c1f4)
  - FEN: `r3kb1r/ppqn1pp1/2p1p3/7p/3PN1nP/8/PPP1NPP1/R1BQK2R w KQkq - 2 11`
- Tal.pgn:1953.??.??:LAT-ch sf:?:Tal, Mihail:Rozenberg, S. · middlegame · ply 39 · white vs Rozenberg, S. · result 1-0 · historical move Bxd6 (f4d6)
  - FEN: `2k4r/ppq2pp1/2prp2n/1P1n3p/3P1B1P/1QP2P2/P3N1P1/R3K2R w KQ - 1 20`
- Tal.pgn:1953.??.??:LAT-ch sf:?:Tal, Mihail:Rozenberg, S. · endgame · ply 59 · white vs Rozenberg, S. · result 1-0 · historical move Kd3 (c2d3)
  - FEN: `2k5/pp3pp1/4p3/1PP4p/2r4P/1R3P2/n1K3P1/R7 w - - 0 30`
- Tal.pgn:1953.??.??:LAT-ch sf:?:Tal, Mihail:Pigit · opening · ply 9 · white vs Pigit · result 0-1 · historical move Nc3 (b1c3)
  - FEN: `r1bqkb1r/pp1ppppp/2n2n2/8/3NP3/8/PPP2PPP/RNBQKB1R w KQkq - 1 5`
- Tal.pgn:1953.??.??:LAT-ch sf:?:Tal, Mihail:Pigit · middlegame · ply 11 · white vs Pigit · result 0-1 · historical move Bg5 (c1g5)
  - FEN: `r1bqkb1r/pp2pppp/2np1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6`
- Tal.pgn:1953.??.??:LAT-ch sf:?:Tal, Mihail:Pigit · middlegame · ply 21 · white vs Pigit · result 0-1 · historical move Qf3 (d1f3)
  - FEN: `r1b1kb1r/p4ppp/3ppP2/q5B1/1p6/2N5/PPP2PPP/R2QK2R w KQkq - 0 11`
- Tal.pgn:1953.??.??:LAT-ch sf:?:Tal, Mihail:Pigit · endgame · ply 31 · white vs Pigit · result 0-1 · historical move Rxe6+ (e4e6)
  - FEN: `r3kb1r/p4ppp/b3pP2/6q1/1p2R3/5Q2/PPP2PPP/4K2R w Kkq - 0 16`
- Tal.pgn:1954.??.??:LAT-ch:?:Prieditic, G.:Tal, Mihail · opening · ply 10 · black vs Prieditic, G. · result 0-1 · historical move O-O (e8g8)
  - FEN: `rnbqk2r/ppp1ppbp/3p1np1/8/2P1P3/2N2N2/PP1PBPPP/R1BQK2R b KQkq - 1 5`
- Tal.pgn:1954.??.??:LAT-ch:?:Prieditic, G.:Tal, Mihail · middlegame · ply 24 · black vs Prieditic, G. · result 0-1 · historical move Be6 (c8e6)
  - FEN: `r1br2k1/pp3pbp/2p2np1/4p1B1/2P1P3/2N5/PP2BPPP/3R1RK1 b - - 1 12`
- Tal.pgn:1954.??.??:LAT-ch:?:Prieditic, G.:Tal, Mihail · middlegame · ply 48 · black vs Prieditic, G. · result 0-1 · historical move Bd4 (c5d4)
  - FEN: `2r1rnk1/p7/1pp1b1pp/2b1p3/2P1Pp2/1PNR1P2/PB2B1PP/3R1K2 b - - 7 24`
- Tal.pgn:1954.??.??:LAT-ch:?:Prieditic, G.:Tal, Mihail · endgame · ply 70 · black vs Prieditic, G. · result 0-1 · historical move Ng5 (e6g5)
  - FEN: `6rr/p2b1k2/1p2n3/2pNp2p/2PbPp2/1PB2B2/P5PP/2KR3R b - - 0 35`
- Tal.pgn:1954.??.??:URS-chTJ:?:Vinokurov, Andrei:Tal, Mihail · opening · ply 10 · black vs Vinokurov, Andrei · result 0-1 · historical move d6 (d7d6)
  - FEN: `r1bqkb1r/pp1ppppp/2n2n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R b KQkq - 2 5`
- Tal.pgn:1954.??.??:URS-chTJ:?:Vinokurov, Andrei:Tal, Mihail · middlegame · ply 18 · black vs Vinokurov, Andrei · result 0-1 · historical move a5 (a7a5)
  - FEN: `r1bq1rk1/pp2bppp/2np1n2/4p3/4PP2/1NN5/PPP1B1PP/R1BQ1RK1 b - - 0 9`
- Tal.pgn:1954.??.??:URS-chTJ:?:Vinokurov, Andrei:Tal, Mihail · middlegame · ply 34 · black vs Vinokurov, Andrei · result 0-1 · historical move Qb4 (b6b4)
  - FEN: `r4rk1/1p1nbppp/1q1p4/p7/P3P3/1bN1BB2/1P1Q2PP/R4R1K b - - 3 17`
- Tal.pgn:1954.??.??:URS-chTJ:?:Vinokurov, Andrei:Tal, Mihail · endgame · ply 52 · black vs Vinokurov, Andrei · result 0-1 · historical move Ne4 (c5e4)
  - FEN: `2r2rk1/1p3ppp/3Q4/p1nPp3/P5B1/8/1q4PP/3R1R1K b - - 1 26`
- Tal.pgn:1954.??.??:Riga-ch:?:Tal, Mihail:Kliavinsh, Janis · opening · ply 9 · white vs Kliavinsh, Janis · result 1-0 · historical move e3 (e2e3)
  - FEN: `rnbqkb1r/pp1p1pp1/4pn1p/2p5/3P3B/5N2/PPP1PPPP/RN1QKB1R w KQkq - 0 5`
- Tal.pgn:1954.??.??:Riga-ch:?:Tal, Mihail:Kliavinsh, Janis · middlegame · ply 17 · white vs Kliavinsh, Janis · result 1-0 · historical move Qe2 (d1e2)
  - FEN: `rn1q1rk1/pb1pbpp1/1p2pn1p/2p5/3P3B/2PBPN2/PP1N1PPP/R2QK2R w KQ - 1 9`
- Tal.pgn:1954.??.??:Riga-ch:?:Tal, Mihail:Kliavinsh, Janis · middlegame · ply 33 · white vs Kliavinsh, Janis · result 1-0 · historical move f4 (f2f4)
  - FEN: `r1q2rk1/pb4p1/1p2pn1p/2pp1p2/3P4/2PBP3/PP1NQPPP/3R1RK1 w - - 0 17`
- Tal.pgn:1954.??.??:Riga-ch:?:Tal, Mihail:Kliavinsh, Janis · endgame · ply 47 · white vs Kliavinsh, Janis · result 1-0 · historical move g4 (g2g4)
  - FEN: `2r2rk1/1b1n2p1/1p1qp2p/p1ppNp2/3P1P2/2PBP3/PP2Q1PP/5RRK w - - 12 24`

### Most frequent source lines as White

- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O · observed in 13 source games · ECO C92
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O · observed in 11 source games · ECO C95
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O · observed in 9 source games · ECO C93
- 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Bg5 e6 7.f4 Qb6 8.Qd2 Qxb2 · observed in 8 source games · ECO B97
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O · observed in 7 source games · ECO C96
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O · observed in 7 source games · ECO C99
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.c3 d5 · observed in 7 source games · ECO C89
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.c3 d6 · observed in 7 source games · ECO C92
- 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 Nc6 6.Bg5 e6 7.Qd2 a6 8.O-O-O h6 · observed in 6 source games · ECO B66
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.c3 d6 · observed in 6 source games · ECO C95
- 1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 d6 6.Bg5 e6 7.Qd2 a6 8.O-O-O Bd7 · observed in 5 source games · ECO B67
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O · observed in 5 source games · ECO C94

### Most frequent source lines as Black

- 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Bg5 Nbd7 7.Bc4 Qa5 8.Qd2 e6 · observed in 5 source games · ECO B94
- 1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 e6 5.Nc3 Qc7 6.g3 a6 7.Bg2 Nf6 8.O-O Be7 · observed in 5 source games · ECO B47
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Bxc6 dxc6 5.O-O f6 6.d4 Bg4 7.dxe5 Qxd1 8.Rxd1 fxe5 · observed in 5 source games · ECO C69
- 1.d4 Nf6 2.c4 e6 3.Nf3 d5 4.Nc3 Bb4 5.Bg5 h6 6.Bxf6 Qxf6 7.e3 c5 8.cxd5 exd5 · observed in 4 source games · ECO D38
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.a4 Bb7 · observed in 4 source games · ECO C88
- 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Nxe4 6.d4 b5 7.Bb3 d5 8.dxe5 Be6 · observed in 4 source games · ECO C82
- 1.c4 Nf6 2.Nc3 e6 3.d4 Bb4 4.e3 O-O 5.Bd3 d5 6.a3 dxc4 7.Bxc4 Bd6 8.Nf3 Nc6 · observed in 3 source games · ECO E51
- 1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.e3 O-O 5.Bd3 d5 6.Nf3 c5 7.O-O dxc4 8.Bxc4 Nbd7 · observed in 3 source games · ECO E55
- 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 Nc6 6.Bg5 e6 7.Qd2 a6 8.O-O-O Bd7 · observed in 3 source games · ECO B67
- 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 Nc6 6.Bg5 e6 7.Qd2 Be7 8.O-O-O O-O · observed in 3 source games · ECO B63
- 1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 e6 5.Nb5 d6 6.c4 Nf6 7.N1c3 a6 8.Na3 Be7 · observed in 3 source games · ECO B44
- 1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 d6 6.Bg5 e6 7.Qd2 Be7 8.O-O-O O-O · observed in 3 source games · ECO B64

### Phrase archive

- general: יוזמה שווה יותר מחומר רק כשהיא מגובה באיומים ממשיים. / אל תסתפק במהלך טבעי. חפש גם את התשובה הכפויה של היריב.
- opening: הפתיחה היא התחייבות לתוכנית, לא רק רצף מהלכים מוכר. / פתח קווים לכלים שלך, אבל בדוק מה היריב מאיים בתמורה.
- threat: איום אינו מנצח עד שבודקים אם ליריב יש הגנה מדויקת. / סרוק שח, הכאות ואיומים לפני שבוחרים את המהלך היפה ביותר.
- tactics: לפני הקרבה, חשב מה היא קונה: זמן, קווים פתוחים או התקפה על המלך. / אם יש שילוב טקטי, חפש את התשובות הכפויות ולא רק את המהלך הראשון.
- endgame: כשהלוח מתרוקן, פעילות המלך והעברתו של רגלי חופשי מקבלות משקל גדול. / בסיומים, אל תמהר: שפר את הכלי הגרוע ביותר ובדוק את מרוץ הרגלים.

---

