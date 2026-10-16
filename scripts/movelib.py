"""UCI move applier for the seed validator. Stdlib only."""
import re
from fenlib import FILES, in_board, sq_to_rc


def valid_uci(u):
    return bool(re.match(r'^[a-h][1-8][a-h][1-8][qrbn]?$', u or ''))


def pawn_ok(piece, turn, dr, df, dest, fr, ff, grid):
    direction = -1 if turn == 'w' else 1
    start = 6 if turn == 'w' else 1
    if df == 0 and not dest:
        one = dr == direction
        two = dr == 2 * direction and fr == start and not grid[fr + direction][ff]
        return one or two
    if abs(df) == 1 and dr == direction and dest and (dest.isupper() != piece.isupper()):
        return True
    return False


def slider_ok(p, dr, df, fr, ff, grid):
    adr, adf = abs(dr), abs(df)
    if p == 'b' and not (adr == adf and adr > 0):
        return False
    if p == 'r' and not ((adr == 0 and adf > 0) or (adf == 0 and adr > 0)):
        return False
    if p == 'q' and not ((adr == adf and adr > 0) or adr == 0 or adf == 0 or (adr > 0 and adf == 0)):
        return False
    if adr == 0 and adf == 0:
        return False
    sr = (dr > 0) - (dr < 0)
    sf = (df > 0) - (df < 0)
    r, f = fr + sr, ff + sf
    tr, tf = fr + dr, ff + df
    while (r, f) != (tr, tf):
        if not in_board(r, f) or grid[r][f]:
            return False
        r += sr
        f += sf
    return True


def apply_uci(grid, uci, turn):
    if not valid_uci(uci):
        raise ValueError('bad UCI: ' + uci)
    fr, ff = sq_to_rc(uci[0:2])
    tr, tf = sq_to_rc(uci[2:4])
    promo = uci[4] if len(uci) == 5 else None
    piece = grid[fr][ff]
    if not piece:
        raise ValueError('empty source ' + uci[0:2])
    if (turn == 'w') != piece.isupper():
        raise ValueError('wrong side to move')
    dest = grid[tr][tf]
    if dest and (dest.isupper() == piece.isupper()):
        raise ValueError('own piece on target')
    if dest and dest.lower() == 'k':
        raise ValueError('cannot capture the king')
    p = piece.lower()
    dr, df = tr - fr, tf - ff
    adr, adf = abs(dr), abs(df)
    if p == 'p':
        if not pawn_ok(piece, turn, dr, df, dest, fr, ff, grid):
            raise ValueError('bad pawn move')
        last = 0 if turn == 'w' else 7
        if tr == last and not promo:
            raise ValueError('promotion letter required')
        if tr != last and promo:
            raise ValueError('promotion off last rank')
        final = (promo.upper() if turn == 'w' else promo) if tr == last else piece
    elif p == 'n':
        if (adr, adf) not in ((1, 2), (2, 1)) or promo:
            raise ValueError('bad knight move')
        final = piece
    elif p == 'k':
        if max(adr, adf) != 1 or promo:
            raise ValueError('bad king move')
        final = piece
    else:
        if not slider_ok(p, dr, df, fr, ff, grid) or promo:
            raise ValueError('bad slider move')
        final = piece
    ng = [row[:] for row in grid]
    ng[tr][tf] = final
    ng[fr][ff] = None
    return ng


# ---- legality layer (check detection, legal filtering, checkmate) ----

KNIGHT_STEPS = [(1, 2), (2, 1), (2, -1), (1, -2), (-1, -2), (-2, -1), (-2, 1), (-1, 2)]
STRAIGHT_STEPS = [(1, 0), (-1, 0), (0, 1), (0, -1)]
DIAG_STEPS = [(1, 1), (1, -1), (-1, 1), (-1, -1)]


def king_square(grid, color):
    target = 'K' if color == 'w' else 'k'
    for r in range(8):
        for f in range(8):
            if grid[r][f] == target:
                return r, f
    return None


def is_attacked(grid, r, f, by):
    """True if square (r, f) is attacked by side `by` ('w' or 'b')."""
    P, N, K, B, R, Q = (('P', 'N', 'K', 'B', 'R', 'Q') if by == 'w'
                        else ('p', 'n', 'k', 'b', 'r', 'q'))
    pr = r + 1 if by == 'w' else r - 1
    for df in (-1, 1):
        if in_board(pr, f + df) and grid[pr][f + df] == P:
            return True
    for dr, df in KNIGHT_STEPS:
        if in_board(r + dr, f + df) and grid[r + dr][f + df] == N:
            return True
    for dr in (-1, 0, 1):
        for df in (-1, 0, 1):
            if (dr or df) and in_board(r + dr, f + df) and grid[r + dr][f + df] == K:
                return True
    for steps, sliders in ((STRAIGHT_STEPS, (R, Q)), (DIAG_STEPS, (B, Q))):
        for dr, df in steps:
            rr, ff = r + dr, f + df
            while in_board(rr, ff):
                c = grid[rr][ff]
                if c:
                    if c in sliders:
                        return True
                    break
                rr += dr
                ff += df
    return False


def in_check(grid, color):
    ks = king_square(grid, color)
    if ks is None:
        return False
    return is_attacked(grid, ks[0], ks[1], 'b' if color == 'w' else 'w')


def legal_moves(grid, turn):
    """All legal UCI moves for `turn`: pseudo-legal per apply_uci AND leaves own king safe."""
    out = []
    for fr in range(8):
        for ff in range(8):
            piece = grid[fr][ff]
            if not piece or (turn == 'w') != piece.isupper():
                continue
            for tr in range(8):
                for tf in range(8):
                    base = FILES[ff] + str(8 - fr) + FILES[tf] + str(8 - tr)
                    promos = ['q', 'r', 'b', 'n'] if piece.lower() == 'p' and tr in (0, 7) else ['']
                    for promo in promos:
                        uci = base + promo
                        try:
                            ng = apply_uci(grid, uci, turn)
                        except ValueError:
                            continue
                        if not in_check(ng, turn):
                            out.append(uci)
    return out


def is_checkmate(grid, turn):
    return in_check(grid, turn) and not legal_moves(grid, turn)
