"""Export the TypeScript port and seed into a new, non-overwriting package folder."""
import argparse
import os
import shutil
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACKAGE_FILES = {
    'src/puzzle/board.ts': 'src/board.ts',
    'src/puzzle/moves.ts': 'src/moves.ts',
    'src/puzzle/tactics.ts': 'src/tactics.ts',
    'src/puzzle/repo.ts': 'src/repo.ts',
    'src/puzzle/engine.ts': 'src/engine.ts',
    'src/puzzle/legal.ts': 'src/legal.ts',
    'data/puzzle-seed.json': 'data/puzzle-seed.json',
}


def emit_package(destination):
    destination = Path(destination).expanduser().resolve()
    if destination.exists():
        raise FileExistsError('destination already exists: %s' % destination)

    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(
        prefix='.veyra-ts-', dir=destination.parent,
    ) as temporary_dir:
        temporary_path = Path(temporary_dir) / destination.name
        for source_name, target_name in PACKAGE_FILES.items():
            source = ROOT / source_name
            if not source.is_file():
                raise FileNotFoundError('required package source is missing: %s' % source)
            target = temporary_path / target_name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
        os.rename(temporary_path, destination)
    return destination


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('destination', help='new output folder; existing paths are never overwritten')
    args = parser.parse_args()
    output = emit_package(args.destination)
    print('TypeScript package created:')
    for target_name in PACKAGE_FILES.values():
        print('  %s' % (output / target_name))


if __name__ == '__main__':
    main()
