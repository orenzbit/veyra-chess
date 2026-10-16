"""Run a deterministic practice session against real seed records. Stdlib only."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUTCOMES = (True, True, False)


def load_seed():
    path = ROOT / 'data' / 'puzzle-seed.json'
    with path.open(encoding='utf-8') as source:
        seed = json.load(source)
    if not isinstance(seed, dict) or seed.get('version') != 1:
        raise ValueError('unsupported or empty puzzle seed: %s' % path)
    puzzles = seed.get('puzzles')
    if not isinstance(puzzles, list) or not puzzles or seed.get('count') != len(puzzles):
        raise ValueError('puzzle seed count does not match its records: %s' % path)
    return puzzles


def select_sample(puzzles):
    selected = []
    for motif in ('missed_mate', 'hanging_piece', 'endgame'):
        puzzle = next((item for item in puzzles if item.get('motif') == motif), None)
        if puzzle is not None:
            selected.append(puzzle)
    if len(selected) != len(OUTCOMES):
        raise ValueError('seed must contain missed_mate, hanging_piece, and endgame records')
    return selected


def update_elo(elo, puzzle_rating, solved):
    expected = 1 / (1 + 10 ** ((puzzle_rating - elo) / 400))
    return round(elo + 32 * ((1 if solved else 0) - expected))


def simulate_session(puzzles, outcomes=OUTCOMES):
    if len(puzzles) != len(outcomes):
        raise ValueError('one outcome is required for each puzzle')
    elo = 800
    attempts = []
    for puzzle, solved in zip(puzzles, outcomes):
        elo = update_elo(elo, puzzle['rating'], solved)
        attempts.append({'motif': puzzle['motif'], 'solved': bool(solved)})
    return elo, attempts


def main():
    puzzles = select_sample(load_seed())
    elo, attempts = simulate_session(puzzles)
    print('== seed-backed practice session ==')
    for number, (puzzle, attempt) in enumerate(zip(puzzles, attempts), 1):
        result = 'solved' if attempt['solved'] else 'failed'
        print('  puzzle %d (%s, rating %d): %s' % (
            number, puzzle['motif'], puzzle['rating'], result,
        ))
    print('puzzle Elo: 800 -> %d' % elo)
    print('attempts recorded: %d; seed records used: %d' % (
        len(attempts), len(puzzles),
    ))
    print('SIMULATION OK')


if __name__ == '__main__':
    main()
