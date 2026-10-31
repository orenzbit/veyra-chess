// Endgame practice library: textbook positions the user plays against a bot from a fixed start.
// Pure data and helpers (no DOM). The outcomes are textbook theory, not engine-proven; the check
// script validates only legality, side to move and material.

export type EndgameGoal = 'mate' | 'promote' | 'win' | 'draw';
export type EndgameSide = 'white' | 'black';
export type Bilingual = { he: string; en: string };
export type Endgame = { id: string; name: Bilingual; fen: string; side: EndgameSide; goal: EndgameGoal; hint: Bilingual };

export const ENDGAMES: readonly Endgame[] = [
  {
    id: 'kq-k', name: { he: 'מט מלכה', en: 'Queen mate' }, fen: '8/8/8/4k3/8/8/8/4K2Q w - - 0 1', side: 'white', goal: 'mate',
    hint: { he: 'צמצמו את המלך היריב עם המלכה במרחק צעד סוס, קרבו את המלך שלכם ושימו לב לפט.', en: 'Box the king in with the queen a knight\u2019s move away, bring your king closer, and watch out for stalemate.' },
  },
  {
    id: 'kr-k', name: { he: 'מט צריח', en: 'Rook mate' }, fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1', side: 'white', goal: 'mate',
    hint: { he: 'חתכו את המלך עם הצריח, דחפו אותו אל הקצה, השתמשו בהתנגדות ותנו מט בשורה האחרונה.', en: 'Cut the king off with the rook, push it to the edge, use the opposition, and mate on the last rank.' },
  },
  {
    id: 'kbb-k', name: { he: 'מט שני רצים', en: 'Two-bishop mate' }, fen: '8/8/8/4k3/8/8/8/2B1KB2 w - - 0 1', side: 'white', goal: 'mate',
    hint: { he: 'שני הרצים על אלכסונים סמוכים יוצרים חומה. דחפו את המלך לפינה בעזרת המלך שלכם.', en: 'Two bishops on adjacent diagonals form a wall. Drive the king to a corner with your king\u2019s help.' },
  },
  {
    id: 'kp-k-win', name: { he: 'רגלי ומלך \u2014 ניצחון', en: 'King and pawn win' }, fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', side: 'white', goal: 'promote',
    hint: { he: 'המלך לפני הרגלי עם התנגדות מנצח. הקדימו את המלך, ודחפו את הרגלי רק כשזה לא נותן פט.', en: 'A king in front of the pawn with the opposition wins. Lead with the king and push the pawn only when it does not allow stalemate.' },
  },
  {
    id: 'lucena', name: { he: 'עמדת לוסנה', en: 'Lucena position' }, fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1', side: 'white', goal: 'win',
    hint: { he: 'בנו גשר: הצריח לשורה הרביעית כדי להגן על המלך משחים, ואז המלך יוצא והרגלי מוכתר.', en: 'Build a bridge: bring the rook to the fourth rank to shield your king from checks so it can step out and the pawn can promote.' },
  },
  {
    id: 'philidor', name: { he: 'עמדת פילידור (הגנה)', en: 'Philidor position (defend)' }, fen: '4k3/R7/1r6/4PK2/8/8/8/8 b - - 0 1', side: 'black', goal: 'draw',
    hint: { he: 'השאירו את הצריח בשורה השישית כדי לחסום את המלך. כשהרגלי מתקדם, רדו עם הצריח לשורה שמאחוריו ותנו שחים מאחור.', en: 'Keep your rook on the sixth rank to hold the king back. When the pawn advances, move the rook behind it and check from behind.' },
  },
];

export const GOAL_LABEL: Record<EndgameGoal, Bilingual> = {
  mate: { he: 'מט', en: 'Checkmate' },
  promote: { he: 'הכתרה', en: 'Promote' },
  win: { he: 'ניצחון', en: 'Win' },
  draw: { he: 'הגנה לתיקו', en: 'Hold the draw' },
};

// One fixed bot per strength level, picked from the roster (public/data/bots/index.json):
// native search depth 1, 2, 3 and 4, so each level plays at the strength it names.
export const ENDGAME_LEVELS: readonly { level: number; botId: string; label: Bilingual }[] = [
  { level: 1, botId: 'maya', label: { he: 'מתחיל', en: 'Beginner' } },
  { level: 2, botId: 'yusuf', label: { he: 'בינוני', en: 'Intermediate' } },
  { level: 3, botId: 'mor', label: { he: 'מתקדם', en: 'Advanced' } },
  { level: 4, botId: 'dev', label: { he: 'מלא', en: 'Full strength' } },
];
export const DEFAULT_ENDGAME_LEVEL = 4;

export function endgameBotId(level: number): string {
  return (ENDGAME_LEVELS.find((l) => l.level === level) || ENDGAME_LEVELS[ENDGAME_LEVELS.length - 1]).botId;
}

// The #62 deep link: main.ts turns it into a bot game from this FEN. The game is a custom start,
// so a win does not count towards the bot campaign.
export function endgameQuery(eg: Endgame, level: number): string {
  const lv = ENDGAME_LEVELS.some((l) => l.level === level) ? level : DEFAULT_ENDGAME_LEVEL;
  return `?botgame=${endgameBotId(lv)}&fen=${encodeURIComponent(eg.fen)}&level=${lv}&side=${eg.side}`;
}
