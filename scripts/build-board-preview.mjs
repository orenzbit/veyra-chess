import { build } from 'esbuild';

// Only this generated preview bundle is overwritten; production files are not build targets.
await build({
  entryPoints: ['design-preview/board-runtime.js'],
  outfile: 'design-preview/board-runtime.bundle.js',
  bundle: true,
  format: 'iife',
  globalName: 'VeyraBoard',
  loader: { '.svg': 'text' },
  legalComments: 'inline',
  target: 'es2020'
});
console.log('Built the local cm-chessboard preview bundle.');
