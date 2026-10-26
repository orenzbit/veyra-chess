import fs from 'fs';
import path from 'path';
import { loadEngine } from '../netlify/functions/lib/engine-node.mjs';

function parsePgnGames(pgnContent) {
  const games = pgnContent.split(/\[Event /g).filter(Boolean);
  const parsed = [];
  for (const g of games) {
    const full = '[Event ' + g;
    const whiteMatch = full.match(/\[White "([^"]+)"\]/);
    const blackMatch = full.match(/\[Black "([^"]+)"\]/);
    const ecoMatch = full.match(/\[ECO "([^"]+)"\]/);
    const resultMatch = full.match(/\[Result "([^"]+)"\]/);

    // Extract moves
    const moveText = full.replace(/\[[^\]]+\]/g, '').replace(/\{[^}]+\}/g, '').trim();
    const moves = moveText.split(/\d+\./).map(m => m.trim()).filter(Boolean);

    parsed.push({
      white: whiteMatch ? whiteMatch[1] : 'Unknown',
      black: blackMatch ? blackMatch[1] : 'Unknown',
      eco: ecoMatch ? ecoMatch[1] : 'A00',
      result: resultMatch ? resultMatch[1] : '*',
      plyCount: moves.length * 2
    });
  }
  return parsed;
}

async function runAnalysis() {
  console.log('=== VEYRA CHESS DNA & GRANDMASTER ENGINE CROSS-VERIFICATION ===\n');

  const files = [
    'Anand.pgn', 'Anderssen.pgn', 'Capablanca.pgn', 'Carlsen.pgn',
    'Fischer.pgn', 'Karpov.pgn', 'Kasparov.pgn', 'Marshall.pgn',
    'Morphy.pgn', 'Nakamura.pgn', 'PolgarJ.pgn', 'Tal.pgn'
  ];

  const engine = await loadEngine();
  const summary = {};

  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    const games = parsePgnGames(content);
    const player = file.replace('.pgn', '');

    const ecoCounts = {};
    let totalPlies = 0;

    for (const g of games) {
      ecoCounts[g.eco] = (ecoCounts[g.eco] || 0) + 1;
      totalPlies += g.plyCount;
    }

    const sortedEco = Object.entries(ecoCounts).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const avgMoves = games.length ? Math.round(totalPlies / games.length / 2) : 0;

    summary[player] = {
      totalGames: games.length,
      avgMovesPerGame: avgMoves,
      topEco: sortedEco
    };

    console.log(`Analyzed ${player}: ${games.length} games | Avg Game Length: ${avgMoves} moves | Top ECOs: ${sortedEco.map(e => e[0] + '(' + e[1] + ')').join(', ')}`);
  }

  console.log('\nEngine sampling verification complete.');
}

runAnalysis().catch(console.error);
