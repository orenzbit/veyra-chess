"""Validates data/puzzle-seed.json without Node. Exit 1 on any failure."""
import json
import math
import sys
from pathlib import Path
from fenlib import parse_fen
from movelib import apply_uci, in_check, is_checkmate, legal_moves


def fnv1a(value):
    h = 0x811C9DC5
    encoded = value.encode('utf-16-le', 'surrogatepass')
    for i in range(0, len(encoded), 2):
        h ^= int.from_bytes(encoded[i:i + 2], 'little')
        h = (h * 0x01000193) & 0xFFFFFFFF
    return '%08x' % h


def puzzle_id(fen, solution):
    joined = ' '.join(solution)
    return fnv1a(fen + '|' + joined) + fnv1a(joined + '|' + fen)


def mirror_fen(fen):
    parts = fen.split()
    rows = parts[0].split('/')[::-1]
    rows = [''.join(c.lower() if c.isupper() else c.upper() for c in row) for row in rows]
    turn = 'b' if parts[1] == 'w' else 'w'
    castling = '-' if parts[2] == '-' else ''.join(sorted(
        (c.lower() if c.isupper() else c.upper() for c in parts[2]),
        key='KQkq'.index,
    ))
    ep = parts[3]
    if ep != '-':
        ep = ep[0] + ('6' if ep[1] == '3' else '3')
    return ' '.join(['/'.join(rows), turn, castling, ep, parts[4], parts[5]])


def mirror_uci(uci):
    flip = lambda square: square[0] + str(9 - int(square[1]))
    return flip(uci[:2]) + flip(uci[2:4]) + (uci[4] if len(uci) == 5 else '')


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def main():
    require(
        mirror_fen('4k3/8/8/8/8/8/8/4K2R w K - 0 1') ==
        '4k2r/8/8/8/8/8/8/4K3 b k - 0 1',
        'castling rights mirror incorrectly',
    )
    seed_path = Path(__file__).resolve().parent.parent / 'data' / 'puzzle-seed.json'
    with seed_path.open(encoding='utf-8') as source:
        doc = json.load(source)
    require(isinstance(doc, dict) and doc.get('version') == 1, 'bad envelope')
    require(
        isinstance(doc.get('puzzles'), list) and doc.get('count') == len(doc['puzzles']),
        'puzzle seed count does not match its records',
    )
    seen = set()
    mates = hang = gen = end = alt_mates = 0
    for p in doc['puzzles']:
        require(isinstance(p, dict), 'puzzle record must be an object')
        pid = p.get('id')
        require(isinstance(pid, str) and pid and pid not in seen, 'dup/missing id: %r' % pid)
        seen.add(pid)
        try:
            require(puzzle_id(p['fen'], p['solution']) == pid, 'id mismatch ' + p['fen'])
            grid, turn = parse_fen(p['fen'])
            require(not in_check(grid, 'b' if turn == 'w' else 'w'),
                    'illegal position: side not to move is in check ' + pid)
            sol = p.get('solution')
            require(isinstance(sol, list) and sol, 'empty solution ' + pid)
            # The app accepts any checkmate, so every mating first move must be declared in accepted.
            accepted = p.get('accepted')
            require(isinstance(accepted, list) and sol[0] in accepted,
                    'accepted must include the stored solution move ' + pid)
            legal = set(legal_moves(grid, turn))
            require(set(accepted) <= legal, 'accepted move is not legal in ' + pid)
            opponent = 'b' if turn == 'w' else 'w'
            for uci in sorted(legal):
                require(uci in accepted or not is_checkmate(apply_uci(grid, uci, turn), opponent),
                        'undeclared alternative mate ' + uci + ' in ' + pid)
            if len(accepted) > 1:
                alt_mates += 1
            for step in sol:
                grid = apply_uci(grid, step, turn)
                require(not in_check(grid, turn), 'illegal move leaves own king in check: ' + step)
                turn = 'b' if turn == 'w' else 'w'
            if p.get('motif') == 'missed_mate':
                require(is_checkmate(grid, turn), 'missed_mate solution is not checkmate')
        except Exception as exc:
            raise AssertionError('record %s fen=%s sol=%s : %s' % (pid, p.get('fen'), p.get('solution'), exc))
        require(
            p.get('motif') in {'missed_mate', 'hanging_piece', 'king_safety', 'opening',
                               'endgame', 'time_pressure', 'general'},
            'bad motif ' + pid,
        )
        require(
            isinstance(p.get('rating'), (int, float)) and math.isfinite(p['rating']),
            'bad rating ' + pid,
        )
        if p['motif'] == 'missed_mate':
            mates += 1
        elif p['motif'] == 'hanging_piece':
            hang += 1
        elif p['motif'] == 'endgame':
            end += 1
        else:
            gen += 1
    seeds = [p for p in doc['puzzles'] if p.get('source', {}).get('kind') == 'seed']
    mirrors = [p for p in doc['puzzles'] if p.get('source', {}).get('kind') == 'mirror']
    mirrors_by_fen = {p['fen']: p for p in mirrors}
    require(
        len(seeds) == len(mirrors) == len(mirrors_by_fen),
        'seed/mirror records are missing or duplicated',
    )
    for seed in seeds:
        mirror = mirrors_by_fen.get(mirror_fen(seed['fen']))
        require(mirror, 'missing mirror for ' + seed['fen'])
        expected = [mirror_uci(step) for step in seed['solution']]
        require(mirror['solution'] == expected, 'incorrect mirrored solution for ' + seed['fen'])
    require(len(doc['puzzles']) == 24, 'expected 24, got %d' % len(doc['puzzles']))
    print('PASS: 24 records, ids unique, all solutions legal (king safety enforced), mates verified.')
    print('PASS: each mirror matches its seed position and solution.')
    print('PASS: accepted lists hold the stored move and every mating first move (%d records with more than one accepted move).' % alt_mates)
    print('motifs: mate=%d hanging=%d endgame=%d general=%d' % (mates, hang, end, gen))


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:  # noqa: BLE001 - validator must fail loudly
        print('FAIL: ' + str(exc))
        sys.exit(1)
