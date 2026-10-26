# Historical Legends PGN research

This report is generated from the committed PGN files by scripts/build-historical-legend-bots.mjs. It describes the supplied game data; it is not an independent engine evaluation. Runtime rating parameters use official peak FIDE ratings where stated; for players from eras without comparable official ratings, the parameter is an internal estimate, not a directly comparable historical rating.

## Method and limitations

- Games are assigned to the player only when the player name is found in the PGN White or Black headers.
- Opening repertoires are grouped by the color the historical player actually played and sorted by source-game frequency, not by theoretical quality.
- The listed game examples preserve event/date/round/opponent/result/color and a short move sample from the source PGN.
- Capture/check/late-king metrics describe observed move patterns. They do not prove intent or style similarity by themselves.
- Style labels are hypotheses. The bot must still pass legal-move, tactical-accuracy, full-tournament and holdout checks.

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

- general: הפשט את העמדה רק כשכל חילוף משפר את פעילות הכלים. / José Raúl Capablanca: פעילות הכלים חשובה יותר מפשטות מלאכותית. / בדוק את איומי שני הצדדים לפני בחירת מהלך.
- opening: המלך הוא כלי פעיל במיוחד בסיום, לא רק יעד להגנה. / José Raúl Capablanca: בחר פתיחה שמובילה לעמדה שניתן להבין ולשחק היטב. / השתמש ברפרטואר כנקודת התחלה, לא כהתחייבות עיוורת.
- threat: חפש את המסע הפשוט ביותר ששומר על היתרון. / José Raúl Capablanca: בדוק איומים טקטיים גם לפני חילופי כלים. / איום טוב הוא איום ששורד את ההגנה הטובה ביותר.
- tactics: לפני טקטיקה, בדוק אם שיפור קטן בכלי פותר את הבעיה. / José Raúl Capablanca: אל תיכנס לסיום נחות בלי תמורה קונקרטית. / אל תקריב חומר ללא תמורה שניתן להסביר.
- endgame: רגלי חופשי חזק רק כשהמלך והכלים תומכים בו. / José Raúl Capablanca: חשב מרוצי רגלים, פעילות מלך ועמדות צריחים. / בדוק פעילות מלך, רגלים חופשיים וחולשות לפני חילופים.

---
