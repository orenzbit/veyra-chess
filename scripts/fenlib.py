"""FEN + move legality helpers for the seed validator. Stdlib only."""
import re

FILES = 'abcdefgh'
PIECES = set('pnbrqkPNBRQK')


def sq_to_rc(sq):
    return (8 - int(sq[1]), FILES.index(sq[0]))


def in_board(r, f):
    return 0 <= r < 8 and 0 <= f < 8


def expand_row(row):
    cells = []
    prev_num = False
    for ch in row:
        if ch.isdigit():
            if prev_num:
                raise ValueError('double digit')
            cells += [None] * int(ch)
            prev_num = True
        elif ch in PIECES:
            cells.append(ch)
            prev_num = False
        else:
            raise ValueError('bad piece ' + ch)
    if len(cells) != 8:
        raise ValueError('rank not 8 wide')
    return cells


def parse_fen(fen):
    parts = str(fen).split()
    if len(parts) != 6:
        raise ValueError('FEN needs 6 fields')
    place, turn, cast, ep, half, full = parts
    if turn not in ('w', 'b'):
        raise ValueError('bad side')
    if not re.match(r'^(KQ?k?q?|Qk?q?|kq?|q|-)$', cast):
        raise ValueError('bad castling')
    if not re.match(r'^(-|[a-h][36])$', ep):
        raise ValueError('bad ep')
    if not half.isdigit() or not re.match(r'^[1-9]\d*$', full):
        raise ValueError('bad counters')
    rows = place.split('/')
    if len(rows) != 8:
        raise ValueError('need 8 ranks')
    grid = [expand_row(r) for r in rows]
    wk = sum(c == 'K' for row in grid for c in row)
    bk = sum(c == 'k' for row in grid for c in row)
    if wk != 1 or bk != 1:
        raise ValueError('need one king each')
    if any(c in ('p', 'P') for c in grid[0] + grid[7]):
        raise ValueError('pawn on back rank')
    return grid, turn
