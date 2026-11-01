// Mapping between the 77 openings and the 12 authentic historical grandmaster bots.
// Allows users to practice any learned opening or variation against the historical master
// who famously pioneered, refined, or championed it.

export interface HistoricalBotExpert {
  botId: string;
  botName: string;
  hebrewName: string;
  title: string;
  elo: number;
  openings: string[];
  rationale: string;
}

export const HISTORICAL_BOT_EXPERTS: Record<string, HistoricalBotExpert> = {
  tal: {
    botId: 'tal',
    botName: 'Mikhail Tal',
    hebrewName: 'מיכאל טל',
    title: 'The Magician from Riga',
    elo: 2705,
    openings: [
      'sicilian',
      'benoni',
      'oldbenoni',
      'old-benoni-defense',
      'budapest',
      'benko-gambit',
      'alekhine-defense',
    ],
    rationale: 'נודע בסגנונו ההתקפי והסוער בהגנת הסיציליאנית, בן-אוני וגמביטים חדים.',
  },
  kasparov: {
    botId: 'kasparov',
    botName: 'Garry Kasparov',
    hebrewName: 'גארי קספרוב',
    title: 'The Dynamic Storm',
    elo: 2851,
    openings: [
      'grunfeld-defense',
      'king-s-indian-defense',
      'scotch-game',
      'scotchgambit',
      'qg',
      'queen-s-gambit-declined',
      'queen-s-gambit-accepted',
      'slav-defense',
    ],
    rationale: 'החיה מחדש את הסקוטית והגרינפלד, והציג שליטה דינמית אבסולוטית בגמביט המלכה.',
  },
  fischer: {
    botId: 'fischer',
    botName: 'Bobby Fischer',
    hebrewName: 'בובי פישר',
    title: 'The Precision Machine',
    elo: 2785,
    openings: [
      'ruylopez',
      'king-s-indian-attack',
      'pirc-defense',
      'modern-defense',
      'four-knights-game',
    ],
    rationale: 'אמן הפתיחה הספרדית (Ruy Lopez), התקפת המלך ההודית ודיוק עמדתי מופתי.',
  },
  capablanca: {
    botId: 'capablanca',
    botName: 'José Raúl Capablanca',
    hebrewName: 'חוזה ראול קפבלנקה',
    title: 'José Raúl Capablanca',
    elo: 2725,
    openings: [
      'carokann',
      'petrov-defense',
      'three-knights-game',
      'nimzo-indian-defense',
      'queen-s-indian-defense',
      'bogo-indian-defense',
    ],
    rationale: 'מופת של בהירות, קארו-קאן נקייה וסיומים ברמת שלמות שטרם נראתה.',
  },
  karpov: {
    botId: 'karpov',
    botName: 'Anatoly Karpov',
    hebrewName: 'אנטולי קרפוב',
    title: 'The Quiet Squeeze',
    elo: 2780,
    openings: [
      'french',
      'catalan-opening',
      'english-opening',
      'reti-opening',
      'semi-slav-defense',
      'hedgehog-system',
    ],
    rationale: 'מומחה עולמי לחניקה עמדתית בהגנה הצרפתית, קטלאנית, אנגלית ומערך הקיפוד.',
  },
  morphy: {
    botId: 'morphy',
    botName: 'Paul Morphy',
    hebrewName: 'פול מורפי',
    title: 'The Open-Board Virtuoso',
    elo: 2690,
    openings: [
      'italian',
      'king-s-gambit',
      'bishop-s-opening',
      'philidor-defense',
      'center-game',
      'vienna-game',
      'viennagambit',
    ],
    rationale: 'גדול שחקני הפתיחות הפתוחות במאה ה-19, משחק איטלקי וגמביט המלך.',
  },
  anderssen: {
    botId: 'anderssen',
    botName: 'Adolf Anderssen',
    hebrewName: 'אדולף אנדרסן',
    title: 'The Immortal Gambit',
    elo: 2700,
    openings: [
      'danish-gambit',
      'goring-gambit',
      'bird-s-opening',
      'alien',
      'barnes-opening',
      'irregular-openings',
    ],
    rationale: 'יוצר המשחק האלמותי, אשף הגמביטים הרומנטיים וההתקפות הישירות.',
  },
  marshall: {
    botId: 'marshall',
    botName: 'Frank Marshall',
    hebrewName: 'פרנק מרשל',
    title: 'The Tactical Hammer',
    elo: 2600,
    openings: [
      'albin-counter-gambit',
      'chigorin-defense',
      'bdg',
      'latvian-gambit',
      'elephant-gambit',
      'damiano-defense',
      'baltic-defense',
      'englund-gambit',
    ],
    rationale: 'נועז, מפתיע ומפתח גמביטים טקטיים בלתי צפויים כדי לזעזע את היריב.',
  },
  polgarj: {
    botId: 'polgarj',
    botName: 'Judit Polgár',
    hebrewName: 'יהודית פולגאר',
    title: 'The Fearless Attacker',
    elo: 2735,
    openings: [
      'dutch-defense',
      'scandinavian-defense',
      'lion-defense',
      'black-knights-tango',
      'scholar-s-mate-defense',
    ],
    rationale: 'אגרסיבית, חסרת פחד, מפעילה לחץ בלתי פוסק בהולנדית וסקנדינבית.',
  },
  nakamura: {
    botId: 'nakamura',
    botName: 'Hikaru Nakamura',
    hebrewName: 'היקארו נקמורה',
    title: 'The Tactical Speedster',
    elo: 2816,
    openings: [
      'jobava',
      'london-system',
      'trompowsky-attack',
      'nimzowitsch-defense',
      'owen-s-defense',
      'st-george-defense',
      'borg-defense',
      'rat-defense',
      'pterodactyl-defense',
    ],
    rationale: 'אשף הלונדון סיסטם, ג׳ובאבה ופתיחות מודרניות חדות ומפתיעות.',
  },
  anand: {
    botId: 'anand',
    botName: 'Viswanathan Anand',
    hebrewName: 'וישוואנתן אנאנד',
    title: 'The Lightning Strategist',
    elo: 2817,
    openings: [
      'colle-system',
      'torre-attack',
      'richter-veresov-attack',
      'stonewall-attack',
      'old-indian-defense',
      'english-defense',
    ],
    rationale: 'אסטרטג בעל הבנה מערכתית עמוקה ומהירה בכל המערכות המתוחכמות.',
  },
  carlsen: {
    botId: 'carlsen',
    botName: 'Magnus Carlsen',
    hebrewName: 'מגנוס קרלסן',
    title: 'השחקן הטוב בכל הזמנים',
    elo: 2882,
    openings: [
      'ponziani-opening',
      'nimzo-larsen-attack',
      'van-geet-opening',
      'zukertort-opening',
    ],
    rationale: 'שליטה אוניברסלית ואיכות מקסימלית בכל פתיחה ומבנה עמדות.',
  },
};

// Fast lookup from opening ID to bot ID
const OPENING_TO_BOT_CACHE: Map<string, string> = new Map();
for (const [botId, expert] of Object.entries(HISTORICAL_BOT_EXPERTS)) {
  for (const openingId of expert.openings) {
    OPENING_TO_BOT_CACHE.set(openingId, botId);
  }
}

/**
 * Returns the historical bot ID assigned to the given opening ID.
 * Defaults to 'tal' (The Magician from Riga) if opening is not specifically assigned.
 */
export function getExpertBotIdForOpening(openingId: string): string {
  return OPENING_TO_BOT_CACHE.get(openingId) || 'tal';
}

/**
 * Returns the expert profile metadata for an opening.
 */
export function getExpertForOpening(openingId: string): HistoricalBotExpert {
  const botId = getExpertBotIdForOpening(openingId);
  return HISTORICAL_BOT_EXPERTS[botId] || HISTORICAL_BOT_EXPERTS.tal;
}

export interface RepertoireLineMove {
  0: string; // SAN move
  1?: string; // Optional comment
}

export interface RepertoireLine {
  id: string;
  name: string;
  moves: (string | [string, string?])[];
  star?: boolean;
}

export interface RepertoireOpening {
  id: string;
  name: string;
  eco?: string;
  lines: RepertoireLine[];
}

export interface BotBookLine {
  name: string;
  moves: string;
  games: number;
  eco?: string;
}

/**
 * Formats a repertoire moves array into standard SAN move string (e.g. "1.e4 c5 2.Nf3 d6 ...")
 */
export function formatMovesToString(moves: (string | [string, string?])[]): string {
  const sans = moves.map(m => (Array.isArray(m) ? m[0] : m));
  return sans.map((s, i) => (i % 2 === 0 ? `${Math.floor(i / 2) + 1}.` : '') + s).join(' ');
}

/**
 * Converts opening lines into bot repertoire format ({ name, moves, games })
 * ready to be injected into openingsAsWhite or openingsAsBlack.
 *
 * @param opening The repertoire opening object
 * @param selectedLine Optional specific line to practice
 * @param botColor 'w' or 'b' - which color the bot will play
 */
export function buildBotTrainingRepertoire(
  opening: RepertoireOpening,
  selectedLine?: RepertoireLine | null,
  botColor: 'w' | 'b' = 'b'
): { openingsAsWhite: BotBookLine[]; openingsAsBlack: BotBookLine[] } {
  const linesToInclude = selectedLine
    ? opening.lines.filter(line => line.id === selectedLine.id)
    : opening.lines.filter(line => line.moves.length > 0);

  if (selectedLine && linesToInclude.length === 0) {
    throw new Error(`Selected line "${selectedLine.id}" does not belong to opening "${opening.id}".`);
  }
  const formattedLines: BotBookLine[] = linesToInclude.map(line => ({
    name: `${opening.name} - ${line.name}`,
    moves: formatMovesToString(line.moves),
    games: selectedLine ? 100 : line.star ? 100 : 20,
    eco: opening.eco,
  }));

  if (botColor === 'w') {
    return {
      openingsAsWhite: formattedLines,
      openingsAsBlack: [],
    };
  } else {
    return {
      openingsAsWhite: [],
      openingsAsBlack: formattedLines,
    };
  }
}
