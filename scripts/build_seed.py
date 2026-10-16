"""Builds data/puzzle-seed.json: 12 hand-authored positions + 12 mirrors.
Stdlib only. Run from the veyra-puzzles folder:  py scripts/build_seed.py"""
import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SEED12 = [
    {'fen': '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1', 'sol': ['e1e8'], 'motif': 'missed_mate', 'rating': 700, 'note': 'back-rank rook'},
    {'fen': '7k/5ppp/8/4Q3/8/8/5PPP/6K1 w - - 0 1', 'sol': ['e5e8'], 'motif': 'missed_mate', 'rating': 750, 'note': 'queen corridor'},
    {'fen': '6k1/5ppp/8/8/8/8/5PPP/1R2R1K1 w - - 0 1', 'sol': ['e1e8'], 'motif': 'missed_mate', 'rating': 650, 'note': 'doubled rooks'},
    {'fen': 'k7/8/2K5/1Q6/8/8/8/8 w - - 0 1', 'sol': ['b5b7'], 'motif': 'missed_mate', 'rating': 800, 'note': 'queen vs bare king'},
    {'fen': 'k7/8/1K6/8/8/8/8/2R5 w - - 0 1', 'sol': ['c1c8'], 'motif': 'missed_mate', 'rating': 850, 'note': 'rook + king'},
    {'fen': 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1', 'sol': ['h5f7'], 'motif': 'missed_mate', 'rating': 900, 'note': 'scholar pattern'},
    {'fen': '4k3/8/8/3r4/8/3Q4/5PPP/5RK1 w - - 0 1', 'sol': ['d3d5'], 'motif': 'hanging_piece', 'rating': 800, 'note': 'free rook'},
    {'fen': '2r3k1/5ppp/8/3N4/8/8/5PPP/6K1 w - - 0 1', 'sol': ['d5e7'], 'motif': 'general', 'rating': 950, 'note': 'knight fork K+R'},
    {'fen': '5k2/5ppp/8/3q4/8/8/5PPP/3R2K1 w - - 0 1', 'sol': ['d1d5'], 'motif': 'hanging_piece', 'rating': 1000, 'note': 'queen forked by rook'},
    {'fen': '2k5/4P3/8/8/8/8/5PPP/4K2R w - - 0 1', 'sol': ['e7e8q'], 'motif': 'endgame', 'rating': 900, 'note': 'promotion'},
    {'fen': 'k7/8/2N5/8/8/8/5PPP/R5K1 w - - 0 1', 'sol': ['a1a7'], 'motif': 'missed_mate', 'rating': 850, 'note': 'arabian mate'},
    {'fen': '6rk/6pp/7N/8/8/8/5PPP/6K1 w - - 0 1', 'sol': ['h6f7'], 'motif': 'missed_mate', 'rating': 1100, 'note': 'smothered mate'},
]


def mirror_fen(fen):
    parts = fen.split()
    rows = parts[0].split('/')[::-1]
    rows = [''.join(c.lower() if c.isupper() else c.upper() for c in r) for r in rows]
    turn = 'b' if parts[1] == 'w' else 'w'
    cast = '-' if parts[2] == '-' else ''.join(sorted(
        (c.lower() if c.isupper() else c.upper() for c in parts[2]),
        key='KQkq'.index,
    ))
    ep = parts[3]
    if ep != '-':
        ep = ep[0] + ('6' if ep[1] == '3' else '3')
    return ' '.join(['/'.join(rows), turn, cast, ep, parts[4], parts[5]])


def mirror_uci(u):
    flip = lambda sq: sq[0] + str(9 - int(sq[1]))
    return flip(u[0:2]) + flip(u[2:4]) + (u[4] if len(u) == 5 else '')


def fnv1a(value):
    h = 0x811C9DC5
    encoded = value.encode('utf-16-le', 'surrogatepass')
    for i in range(0, len(encoded), 2):
        h ^= int.from_bytes(encoded[i:i + 2], 'little')
        h = (h * 0x01000193) & 0xFFFFFFFF
    return '%08x' % h


def pid(fen, sol):
    joined = ' '.join(sol)
    return fnv1a(fen + '|' + joined) + fnv1a(joined + '|' + fen)


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')


def rec(s, kind):
    return {
        'fen': s['fen'], 'solution': list(s['sol']), 'played': '',
        'source': {'gameId': 'seed', 'ply': 0, 'date': datetime.now(timezone.utc).date().isoformat(), 'opponent': '', 'kind': kind},
        'motif': s['motif'],
        'severity': 0.5 if s['motif'] == 'missed_mate' else 0.25,
        'class': 'blunder' if s['motif'] == 'missed_mate' else 'mistake',
        'rating': s['rating'],
        'stats': {'shown': 0, 'solved': 0, 'fails': 0, 'nextDue': utc_now(), 'streak': 0},
        'createdAt': utc_now(),
        'note': s['note'],
        'id': pid(s['fen'], s['sol']),
    }


def build_seed():
    puzzles = []
    for s in SEED12:
        puzzles.append(rec(s, 'seed'))
        mirror = dict(
            s,
            fen=mirror_fen(s['fen']),
            sol=[mirror_uci(move) for move in s['sol']],
            note=s['note'] + ' (mirror)',
        )
        puzzles.append(rec(mirror, 'mirror'))
    return {'version': 1, 'built': datetime.now(timezone.utc).date().isoformat(), 'count': len(puzzles), 'puzzles': puzzles}


def write_seed(root, doc):
    output = Path(root) / 'data' / 'puzzle-seed.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode='w', encoding='utf-8', dir=output.parent,
            prefix='.puzzle-seed.', suffix='.tmp', delete=False,
        ) as temporary:
            temporary_path = Path(temporary.name)
            json.dump(doc, temporary, indent=1)
        os.replace(temporary_path, output)
    finally:
        if temporary_path is not None and temporary_path.exists():
            temporary_path.unlink()
    return output


def main():
    doc = build_seed()
    output = write_seed(ROOT, doc)
    print('seed built: %d puzzles (12 authored + 12 mirrors)' % doc['count'])
    print('output:', output)


if __name__ == '__main__':
    main()
