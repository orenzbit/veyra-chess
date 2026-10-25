# #1 The Lightning Strategist — player DNA

Generated 2026-10-25 by `scripts/dna-lab` from the bot's source games. The bot is an independent bot inspired by measured play patterns; it is not the historical player.

## Sample

- **Analysed with the engine:** 177 games (89 as White, 88 as Black), 6889 of the player's own moves. **Partial sample: the run was stopped early, so only 177 of the 500 selected games were analysed; the other 323 are not included.**
- **Chosen from:** 2280 qualifying classical training games (out of 3828 training games and 4253 identified games in total; the 425 test games are kept apart).
- **Years:** 1984–2026. **Opponent rating:** average 2761 (2500–2882, recorded in 500 games)
- **Selection rules:** training games only (holdout games are kept for conformance tests); classical only: events/time controls marked blitz, rapid, bullet, online, simul, blindfold, odds, casual, exhibition, Chess960 or tiebreak/playoff excluded; at least 20 plies and a recorded result; half as White, half as Black; career spread: quota per decade proportional to qualifying games; within a decade: strongest opponent Elo first when recorded, otherwise title matches/championships first.
- **Engine:** Veyra review engine (Chessy WASM, analyzeGameMoves; same code as Review and Chess DNA).

## Results and accuracy in the sample

| Wins | Draws | Losses | Average length | Accuracy (mean) | Median | As White | As Black |
|---|---|---|---|---|---|---|---|
| 22% | 59.9% | 18.1% | 77.8 plies | 87.1 | 87.6 | 87 | 87.2 |

Accuracy and labels use Veyra's own review scale (Chessy engine, about 6 plies deep), so they are comparable between bots and with the app's Review screen, not with other sites.

## Move quality by game phase

Opening = the first 20 plies; endgame = at most 6 queens, rooks and minor pieces left; middlegame otherwise. Error columns are per 100 of the player's moves in that phase.

| Phase | Moves | Engine's best move | Average lost win chance | Inaccuracies | Mistakes | Misses | Blunders |
|---|---|---|---|---|---|---|---|
| All | 6889 | 41.8% | 1.78% | 8 | 1.4 | 0 | 0.1 |
| opening | 1770 | 33.7% | 2.28% | 7 | 0.5 | 0 | 0 |
| middlegame | 3167 | 42.9% | 1.97% | 9.8 | 2.2 | 0 | 0.2 |
| endgame | 1952 | 47.4% | 1.24% | 5.9 | 1 | 0.1 | 0.2 |

## Playing style

| Signal | Value |
|---|---|
| Captures per 100 moves | 21 |
| Checks per 100 moves | 4.3 |
| Pawn moves per 100 moves | 25.3 |
| Moves by piece (P / N / B / R / Q / K) | 25.3% / 19.9% / 16.4% / 16.6% / 12.2% / 9.6% |
| King moves per 100 endgame moves | 19.6 |
| Games where the player castled | 91% |
| Average castling move | 9.1 |
| Kingside share of castling | 85.1% |
| Material sacrifices per 100 games | 27.1 |
| Sound sacrifices per 100 games (lost win chance ≤ 5%) | 16.4 |
| Share of sacrifices that were sound | 60.4% |

A sacrifice here means the player's material balance is at least 2 pawns lower both after the opponent's reply and after the player's next move. It is a measurable signal, not a judgement of intent.

## Openings (all 3828 training games, no engine needed)

**As White — first move:** 1.e4 84.4%, 1.d4 10%, 1.Nf3 3.8%, 1.c4 1.9%.

**As Black — replies:**

| White's first move | Player's replies |
|---|---|
| 1.e4 | 1...e5 (386), 1...c5 (275), 1...c6 (87), 1...e6 (24) — 772 games shown |
| 1.d4 | 1...Nf6 (491), 1...d5 (237), 1...d6 (10), 1...f5 (3) — 741 games shown |
| 1.Nf3 | 1...d5 (91), 1...Nf6 (72), 1...c5 (28), 1...g6 (8) — 199 games shown |
| 1.c4 | 1...e5 (80), 1...c5 (43), 1...Nf6 (12), 1...e6 (10) — 145 games shown |
| 1.b3 | 1...d5 (4), 1...e5 (4), 1...Nf6 (1) — 9 games shown |
| 1.g3 | 1...d5 (1), 1...Nf6 (1) — 2 games shown |

**Most frequent first 8 plies:**

| Colour | Line | Games |
|---|---|---|
| White | e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 | 265 |
| White | e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 | 256 |
| White | e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 | 86 |
| White | e4 e5 Nf3 Nc6 Bb5 Nf6 d3 Bc5 | 70 |
| White | e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 | 69 |
| White | e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 | 67 |
| Black | e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 | 136 |
| Black | e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 | 118 |
| Black | d4 Nf6 c4 e6 Nf3 b6 g3 Ba6 | 52 |
| Black | e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 | 38 |
| Black | e4 e5 Nf3 Nc6 Bb5 Nf6 d3 Bc5 | 35 |
| Black | e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 | 35 |

**How much of the player's play the bot's current repertoire covers** (first 6 plies match a repertoire line):

| Games | As White | As Black |
|---|---|---|
| Training | 48.2% of 1942 | 31.2% of 1886 |
| Test (holdout) | 44.7% of 215 | 26.7% of 210 |

## Limits

- The engine searches about 6 plies deep; deep combinations can be misjudged in both directions.
- The sample favours classical games against the strongest recorded opposition, so it describes the player's serious play, not blitz or simultaneous exhibitions.
- Style signals describe frequency, not intent. They are compared with the bot's own play in the conformance checks (REPORT.md).

<!-- dna-data:start -->
```json
{
  "schema": 1,
  "bot": 1,
  "alias": "The Lightning Strategist",
  "createdAt": "2026-10-25T22:39:04.718Z",
  "engine": "Veyra review engine (Chessy WASM, analyzeGameMoves; same code as Review and Chess DNA)",
  "sample": {
    "requested": 500,
    "analysed": 177,
    "missing": 323,
    "white": 89,
    "black": 88,
    "playerMoves": 6889,
    "yearRange": [
      1984,
      2026
    ],
    "opponentElo": {
      "gamesWithElo": 500,
      "average": 2761,
      "min": 2500,
      "max": 2882
    },
    "criteria": [
      "training games only (holdout games are kept for conformance tests)",
      "classical only: events/time controls marked blitz, rapid, bullet, online, simul, blindfold, odds, casual, exhibition, Chess960 or tiebreak/playoff excluded",
      "at least 20 plies and a recorded result",
      "half as White, half as Black",
      "career spread: quota per decade proportional to qualifying games",
      "within a decade: strongest opponent Elo first when recorded, otherwise title matches/championships first"
    ],
    "counts": {
      "identified": 4253,
      "training": 3828,
      "holdout": 425,
      "qualifying": 2280,
      "qualifyingWhite": 1164,
      "qualifyingBlack": 1116,
      "selected": 500,
      "selectedWhite": 250,
      "selectedBlack": 250
    }
  },
  "results": {
    "winPercent": 22,
    "drawPercent": 59.9,
    "lossPercent": 18.1,
    "averagePlies": 77.8
  },
  "accuracy": {
    "mean": 87.1,
    "median": 87.6,
    "asWhite": 87,
    "asBlack": 87.2
  },
  "moves": {
    "moves": 6889,
    "averageLostWinChancePercent": 1.78,
    "bestMovePercent": 41.8,
    "per100": {
      "brilliant": 0.6,
      "great": 11.2,
      "best": 37.6,
      "excellent": 9,
      "good": 19.4,
      "book": 12.2,
      "forced": 0.5,
      "inaccuracy": 8,
      "mistake": 1.4,
      "miss": 0,
      "blunder": 0.1
    },
    "errorsPer100": 9.6
  },
  "phases": {
    "opening": {
      "moves": 1770,
      "averageLostWinChancePercent": 2.28,
      "bestMovePercent": 33.7,
      "per100": {
        "brilliant": 0.2,
        "great": 3.6,
        "best": 19.2,
        "excellent": 4.5,
        "good": 17.8,
        "book": 47.3,
        "forced": 0,
        "inaccuracy": 7,
        "mistake": 0.5,
        "miss": 0,
        "blunder": 0
      },
      "errorsPer100": 7.5
    },
    "middlegame": {
      "moves": 3167,
      "averageLostWinChancePercent": 1.97,
      "bestMovePercent": 42.9,
      "per100": {
        "brilliant": 0.9,
        "great": 10,
        "best": 42.6,
        "excellent": 10.1,
        "good": 23.9,
        "book": 0.1,
        "forced": 0.2,
        "inaccuracy": 9.8,
        "mistake": 2.2,
        "miss": 0,
        "blunder": 0.2
      },
      "errorsPer100": 12.2
    },
    "endgame": {
      "moves": 1952,
      "averageLostWinChancePercent": 1.24,
      "bestMovePercent": 47.4,
      "per100": {
        "brilliant": 0.7,
        "great": 20,
        "best": 46.1,
        "excellent": 11.2,
        "good": 13.5,
        "book": 0,
        "forced": 1.3,
        "inaccuracy": 5.9,
        "mistake": 1,
        "miss": 0.1,
        "blunder": 0.2
      },
      "errorsPer100": 7.2
    }
  },
  "style": {
    "capturesPer100Moves": 21,
    "checksPer100Moves": 4.3,
    "pawnMovesPer100Moves": 25.3,
    "pieceUsePercent": {
      "p": 25.3,
      "n": 19.9,
      "b": 16.4,
      "r": 16.6,
      "q": 12.2,
      "k": 9.6
    },
    "endgameKingMovesPer100EndgameMoves": 19.6,
    "castledPercent": 91,
    "averageCastlingMove": 9.1,
    "kingsideCastlingPercent": 85.1,
    "sacrificesPer100Games": 27.1,
    "soundSacrificesPer100Games": 16.4,
    "soundSacrificeSharePercent": 60.4
  },
  "openings": {
    "training": {
      "white": {
        "games": 1942,
        "firstMoves": [
          {
            "move": "e4",
            "count": 1639
          },
          {
            "move": "d4",
            "count": 194
          },
          {
            "move": "Nf3",
            "count": 73
          },
          {
            "move": "c4",
            "count": 36
          }
        ],
        "topLines": [
          {
            "line": "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6",
            "count": 265
          },
          {
            "line": "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6",
            "count": 256
          },
          {
            "line": "e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4",
            "count": 86
          },
          {
            "line": "e4 e5 Nf3 Nc6 Bb5 Nf6 d3 Bc5",
            "count": 70
          },
          {
            "line": "e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4",
            "count": 69
          },
          {
            "line": "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6",
            "count": 67
          },
          {
            "line": "e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6",
            "count": 47
          },
          {
            "line": "e4 e5 Nf3 Nc6 Bc4 Bc5 O-O Nf6",
            "count": 37
          },
          {
            "line": "e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7",
            "count": 34
          },
          {
            "line": "e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6",
            "count": 32
          },
          {
            "line": "e4 e6 d4 d5 Nc3 Bb4 e5 c5",
            "count": 26
          },
          {
            "line": "e4 c6 d4 d5 e5 Bf5 Nf3 e6",
            "count": 24
          }
        ]
      },
      "black": {
        "games": 1886,
        "replies": {
          "e4": [
            {
              "move": "e5",
              "count": 386
            },
            {
              "move": "c5",
              "count": 275
            },
            {
              "move": "c6",
              "count": 87
            },
            {
              "move": "e6",
              "count": 24
            }
          ],
          "d4": [
            {
              "move": "Nf6",
              "count": 491
            },
            {
              "move": "d5",
              "count": 237
            },
            {
              "move": "d6",
              "count": 10
            },
            {
              "move": "f5",
              "count": 3
            }
          ],
          "Nf3": [
            {
              "move": "d5",
              "count": 91
            },
            {
              "move": "Nf6",
              "count": 72
            },
            {
              "move": "c5",
              "count": 28
            },
            {
              "move": "g6",
              "count": 8
            }
          ],
          "c4": [
            {
              "move": "e5",
              "count": 80
            },
            {
              "move": "c5",
              "count": 43
            },
            {
              "move": "Nf6",
              "count": 12
            },
            {
              "move": "e6",
              "count": 10
            }
          ],
          "b3": [
            {
              "move": "d5",
              "count": 4
            },
            {
              "move": "e5",
              "count": 4
            },
            {
              "move": "Nf6",
              "count": 1
            }
          ],
          "g3": [
            {
              "move": "d5",
              "count": 1
            },
            {
              "move": "Nf6",
              "count": 1
            }
          ]
        },
        "topLines": [
          {
            "line": "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6",
            "count": 136
          },
          {
            "line": "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6",
            "count": 118
          },
          {
            "line": "d4 Nf6 c4 e6 Nf3 b6 g3 Ba6",
            "count": 52
          },
          {
            "line": "e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4",
            "count": 38
          },
          {
            "line": "e4 e5 Nf3 Nc6 Bb5 Nf6 d3 Bc5",
            "count": 35
          },
          {
            "line": "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6",
            "count": 35
          },
          {
            "line": "e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4",
            "count": 34
          },
          {
            "line": "d4 Nf6 c4 e6 Nf3 d5 Nc3 Be7",
            "count": 33
          },
          {
            "line": "d4 d5 c4 c6 Nc3 Nf6 e3 e6",
            "count": 29
          },
          {
            "line": "d4 d5 c4 c6 Nf3 Nf6 Nc3 e6",
            "count": 27
          },
          {
            "line": "d4 Nf6 c4 e6 Nc3 Bb4 e3 O-O",
            "count": 25
          },
          {
            "line": "e4 e5 Nf3 Nc6 Bc4 Bc5 O-O Nf6",
            "count": 23
          }
        ]
      }
    },
    "repertoireCoverageTraining": {
      "white": {
        "games": 1942,
        "covered": 937,
        "percent": 48.2
      },
      "black": {
        "games": 1886,
        "covered": 589,
        "percent": 31.2
      }
    },
    "repertoireCoverageHoldout": {
      "white": {
        "games": 215,
        "covered": 96,
        "percent": 44.7
      },
      "black": {
        "games": 210,
        "covered": 56,
        "percent": 26.7
      }
    }
  }
}
```
<!-- dna-data:end -->
