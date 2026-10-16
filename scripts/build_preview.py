"""Combines the HTML parts and validated puzzle seed into preview.html."""
import json
import os
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SEED_MARKER = '<script id="seed" type="application/json">__SEED__</script>'


def build_preview(root=ROOT):
    root = Path(root)
    parts = [
        (root / name).read_text(encoding='utf-8')
        for name in ('part1.html', 'part2.html', 'part3.html')
    ]
    source = ''.join(parts)
    if source.count(SEED_MARKER) != 1 or source.count('__SEED__') != 1:
        raise ValueError('expected exactly one seed script placeholder in the HTML parts')

    seed = json.loads((root / 'data' / 'puzzle-seed.json').read_text(encoding='utf-8'))
    if not isinstance(seed, dict) or seed.get('version') != 1:
        raise ValueError('unsupported puzzle seed format')
    puzzles = seed.get('puzzles')
    if not isinstance(puzzles, list) or seed.get('count') != len(puzzles):
        raise ValueError('puzzle seed count does not match its records')

    seed_json = json.dumps(seed, ensure_ascii=False).replace('<', '\\u003c')
    html = source.replace('__SEED__', seed_json, 1)
    embedded = html.split(SEED_MARKER.split('__SEED__')[0], 1)[1].split('</script>', 1)[0]
    if json.loads(embedded) != seed:
        raise ValueError('embedded puzzle seed failed verification')
    return html


def write_preview(root, html):
    output = Path(root) / 'preview.html'
    if output.exists() and output.read_text(encoding='utf-8') == html:
        return output

    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode='w', encoding='utf-8', dir=output.parent,
            prefix='.preview.', suffix='.tmp', delete=False,
        ) as temporary:
            temporary_path = Path(temporary.name)
            temporary.write(html)
        os.replace(temporary_path, output)
    finally:
        if temporary_path is not None and temporary_path.exists():
            temporary_path.unlink()
    return output


def main():
    html = build_preview()
    output = write_preview(ROOT, html)
    print('preview bytes:', len(html.encode('utf-8')))
    print('seed embedded:', True)
    print('output:', output)


if __name__ == '__main__':
    main()
