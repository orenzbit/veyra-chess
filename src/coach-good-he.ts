// The coach's words for what the player did WELL (COACH_EXPLAIN_ENABLED), in Hebrew, spoken to the player.
// The same rules as the mistake bank (coach-words-he.ts): every phrase is a template with {slots} that
// coach-good.ts fills with facts it checked on the board and in the engine's line, and agreement is never left
// to the template: slots such as {it}, {attacks} and {was} come already agreed with their piece
// (the queen is feminine, every other piece masculine). Each sub-case has 2-3 variants.

export type GoodKey = 'mate_found' | 'best_move' | 'won_material' | 'fork' | 'pin' | 'skewer' | 'defended' | 'good_trade' | 'pawn_push' | 'endgame_technique';

export const GOOD_LABEL: Record<GoodKey, string> = {
  mate_found: 'מט שמצאת',
  best_move: 'המהלך הכי טוב',
  won_material: 'זכייה בחומר',
  fork: 'מזלג',
  pin: 'ריתוק',
  skewer: 'שיפוד',
  defended: 'עצרת איום',
  good_trade: 'חילוף נכון',
  pawn_push: 'דחיפת רגלי חזקה',
  endgame_technique: 'טכניקת סיום',
};
// A sub-case with a name of its own (shown on the chip instead of the category's name).
export const GOOD_SUB_LABEL: Record<string, string> = {
  'best_move.brilliant': 'מהלך מבריק',
  'best_move.only': 'המהלך היחיד',
  'pawn_push.break': 'פריצת רגלי',
  'pawn_push.passer': 'רגלי חופשי מתקדם',
  'pawn_push.promote': 'הכתרה',
  'pawn_push.to_queen': 'רגלי בדרך להכתרה',
  'endgame_technique.king': 'סיום: מלך פעיל',
  'endgame_technique.rook_behind': 'סיום: צריח מאחורי הרגלי',
  'endgame_technique.opposition': 'סיום: אופוזיציה',
  'defended.mate': 'עצרת איום מט',
};

// WHAT he did and WHERE: the move, the square and the piece.
export const GOOD_WHAT: Record<string, string[]> = {
  'mate_found.mate': [
    'ב-{move} נתת מט! {p} ב-{sq} {closes} את המלך של היריב, ואין לו לאן לברוח.',
    'מט ב-{move}: {p} ל-{sq} {ends} את המשחק.',
    'ב-{move} סיימת את המשחק במט, עם {p} ב-{sq}.',
  ],
  'mate_found.line': [
    'ב-{move} מצאת את הדרך למט: מכאן היריב כבר לא יכול להציל את המלך.',
    'ב-{move} פתחת מתקפת מט מאולצת עם {p} ל-{sq}.',
    'יפה מאוד! {move} מתחיל מט מאולץ ב-{n} מהלכים.',
  ],
  // The engine scores a forced mate, but the mate itself lies past the line it shows.
  'mate_found.score': [
    'ב-{move} מצאת את הדרך למט: לפי המנוע, מכאן היריב כבר לא יכול להציל את המלך.',
    'ב-{move} פתחת מתקפת מט מאולצת עם {p} ל-{sq}.',
  ],
  'best_move.brilliant': [
    'ב-{move} הקרבת {sacNoun}, וזה מהלך מבריק.',
    'מהלך מבריק: ב-{move} נתת {sacNoun} בכוונה.',
    'ב-{move} לא פחדת לתת {sacNoun}, וההקרבה הזו נכונה.',
  ],
  'best_move.only': [
    'ב-{move} מצאת את המהלך היחיד ששומר על העמדה.',
    'רק מהלך אחד החזיק את העמדה, ומצאת אותו: {move}.',
    'ב-{move} שיחקת {san}, והמנוע מסכים: זה המהלך הכי טוב, ואין לו תחליף טוב.',
  ],
  'won_material.free': [
    'ב-{move} לקחת את {T} ב-{tsq}, והיריב לא יכול להחזיר את החומר.',
    'יפה ראית: {T} ב-{tsq} {was} בלי הגנה מספיקה, וב-{move} לקחת {itObj}.',
    'ב-{move} זכית ב{tName} ב-{tsq}: {p} {takes} {itObj}, והחשבון נשאר לטובתך.',
  ],
  // The win comes right after the opponent's reply.
  'won_material.line': [
    'המהלך {move} מכין לקיחה: אחרי {reply} אתה משחק {take} ולוקח את {T} ב-{tsq}.',
    'אחרי {move} ותשובת היריב {reply}, אתה לוקח את {T} ב-{tsq} עם {take}.',
  ],
  // The win comes later in the line.
  'won_material.later': [
    'אחרי {move} השורה של המנוע זוכה בחומר: בהמשך אתה משחק {take} ולוקח את {T} ב-{tsq}.',
    'בשורה שמתחילה ב-{move}, בהמשך אתה משחק {take} ולוקח את {T} ב-{tsq}.',
  ],
  // He takes a piece, and part of it comes back, but he stays ahead.
  'won_material.capture': [
    'ב-{move} לקחת את {T} ב-{tsq}. היריב מחזיר חלק מהחומר, אבל אתה נשאר ביתרון.',
    'ב-{move} {p} {takes} את {T} ב-{tsq}, ובסוף החילופים החשבון לטובתך.',
  ],
  'fork': [
    'ב-{move} עשית מזלג עם {p} ב-{sq}: {it} {attacks} גם את {t1} וגם את {t2}.',
    'מזלג יפה! ב-{move} {p} שלך ב-{sq} {attacks} בבת אחת את {t1} ואת {t2}.',
    'ב-{move} {p} {came} ל-{sq} {andAttacks} שני כלים: {t1} ו{t2}.',
  ],
  'fork.check': [
    'ב-{move} {p} ב-{sq} {gives} שח, ובאותו זמן {attacks} את {t2}.',
    'מזלג עם שח! ב-{move} {p} שלך {attacks} את המלך ואת {t2} בבת אחת.',
    'ב-{move} עשית מזלג עם {p}: שח למלך, ו{t2} {t2Hit} באותו מהלך.',
  ],
  'pin': [
    'ב-{move} ריתקת את {pinned} ב-{psq}: {pBehind} עומד {behind}, אז {pIt} לא {pCan} לזוז בלי להפסיד.',
    '{p} שלך ב-{sq} {pins} את {pinned} ב-{psq} אל {behind}.',
    'ריתוק יפה ב-{move}: {pinned} ב-{psq} {pStuck}, כי {pBehind} {behind}.',
  ],
  'pin.absolute': [
    'ב-{move} ריתקת את {pinned} ב-{psq} אל המלך: {pIt} לא {pCan} לזוז בכלל.',
    '{p} שלך ב-{sq} {pins} את {pinned} ב-{psq} למלך, וכל מהלך {pHis} כבר לא חוקי.',
    'ריתוק מלא ב-{move}: {pinned} ב-{psq} {pStands} בין {p} שלך לבין המלך של היריב.',
  ],
  'skewer': [
    'ב-{move} עשית שיפוד: {p} ב-{sq} {attacks} את {front}, ו{fBehind} עומד {back}.',
    'שיפוד! {p} שלך ב-{sq} {attacks} את {front}, וכש{fIt} {fMoves}, {back} {bFalls}.',
    'ב-{move} סידרת את {front} ואת {back} על אותו קו מול {p} שלך.',
  ],
  'defended.piece': [
    'ב-{move} ראית ש{T} ב-{tsq} {wasHit}, ו{saved}.',
    'היריב איים לקחת את {T} ב-{tsq}. ב-{move} {saved}, ולא הפסדת חומר.',
    'יפה ששמת לב לאיום על {T} ב-{tsq}: ב-{move} {saved}.',
  ],
  'defended.mate': [
    'ב-{move} עצרת איום מט: היריב איים לשחק {threat}.',
    'היריב איים במט ({threat}), ו-{move} סוגר את האיום.',
    'ב-{move} ראית את המט שהיריב הכין ({threat}), ועצרת אותו.',
  ],
  'good_trade': [
    'ב-{move} החלפת כלים כשאתה ביתרון של {aheadNoun}. כל חילוף כזה מקרב אותך לסיום מנצח.',
    'אתה ביתרון של {aheadNoun}, וב-{move} התחלת חילוף: {p} {takes} את {T} ב-{tsq}.',
    'חילוף נכון ב-{move}: כשאתה ביתרון חומר, כדאי להוריד כלים מהלוח.',
  ],
  'good_trade.queens': [
    'ב-{move} הורדת את המלכות מהלוח כשאתה ביתרון של {aheadNoun}.',
    'אתה ביתרון של {aheadNoun}, וב-{move} החלפת מלכות. מכאן קל יותר לנצח.',
  ],
  'pawn_push.break': [
    'ב-{move} פרצת עם הרגלי ל-{sq}, ועכשיו הוא תוקף את הרגלי של היריב ב-{tsq}.',
    'פריצה טובה ב-{move}: הרגלי ב-{sq} מתקיף את הרגלי של היריב ב-{tsq}.',
    'ב-{move} דחפת את הרגלי ל-{sq} ותקפת את הרגלי של היריב ב-{tsq}.',
  ],
  'pawn_push.passer': [
    'ב-{move} דחפת את הרגלי החופשי ל-{sq}. {remain} לו {left} עד ההכתרה, ואף רגלי של היריב לא יכול לעצור אותו.',
    'הרגלי החופשי שלך התקדם ל-{sq} ב-{move}: עוד {left} והוא מוכתר.',
  ],
  'pawn_push.to_queen': [
    'ב-{move} דחפת את הרגלי ל-{sq}, ובשורה של המנוע הוא מגיע עד ההכתרה.',
    'הרגלי שלך ב-{sq} כבר בדרך למלכה: ב-{move} דחפת אותו, והיריב לא מצליח לעצור אותו.',
  ],
  'pawn_push.promote': [
    'ב-{move} הכתרת את הרגלי ל{promo} ב-{sq}.',
    'הרגלי שלך הגיע עד הסוף: ב-{move} הוא הפך ל{promo} ב-{sq}.',
  ],
  'endgame_technique.king': [
    'בסיום המלך הוא כלי לוחם, וב-{move} הבאת אותו קדימה, מ-{from} ל-{sq}.',
    'ב-{move} הפעלת את המלך: מ-{from} ל-{sq}, קרוב יותר {toward}.',
    'טכניקת סיום נכונה ב-{move}: המלך שלך עלה ל-{sq}.',
  ],
  'endgame_technique.rook_behind': [
    'ב-{move} העמדת את הצריח ב-{sq} מאחורי הרגלי החופשי ב-{psq}, בדיוק לפי הכלל.',
    'כלל הזהב בסיומי צריחים: הצריח מאחורי הרגלי החופשי. ב-{move} עשית בדיוק את זה, עם הצריח ב-{sq}.',
  ],
  'endgame_technique.opposition': [
    'ב-{move} תפסת אופוזיציה: המלכים ב-{sq} וב-{osq} עומדים זה מול זה עם משבצת אחת ביניהם, והיריב הוא שצריך לזוז.',
    'אופוזיציה ב-{move}! המלך שלך ב-{sq} מול המלך של היריב ב-{osq}, ועכשיו התור שלו לפנות את הדרך.',
  ],
};

// WHY it was good: what the opponent loses or cannot do, with the engine's line as evidence.
export const GOOD_WHY: Record<string, string[]> = {
  mate: [
    'השורה של המנוע: {line}. היריב לא יכול לעצור את המט.',
    'המנוע מראה את ההמשך: {line}, ומט.',
  ],
  checkmate: [
    'המשחק נגמר: אין מהלך שמציל את המלך.',
    'זה הסוף: המלך מותקף ואין לו שום מהלך חוקי.',
  ],
  material: [
    'היריב לא יכול להציל את החומר: בשורה של המנוע ({line}) אתה מרוויח {gainNoun}.',
    'בשורה של המנוע אתה מרוויח {gainNoun}: {line}.',
    'זה מרוויח לך {gainNoun}, והשורה של המנוע מראה שזה נשאר: {line}.',
  ],
  sacrifice_mate: [
    'ההקרבה עובדת: היא מובילה למט. השורה של המנוע: {line}.',
    'בשורה של המנוע ההקרבה נגמרת במט: {line}.',
  ],
  sacrifice_back: [
    'ההקרבה עובדת: בשורה של המנוע החומר חוזר אליך. {line}.',
    'בשורה של המנוע ({line}) אתה מקבל את החומר בחזרה.',
  ],
  sacrifice_more: [
    'ההקרבה עובדת: בשורה של המנוע אתה מקבל את החומר בחזרה, ועוד מרוויח. {line}.',
    'בשורה של המנוע ({line}) החומר חוזר אליך, ואתה אפילו יוצא ביתרון.',
  ],
  sacrifice_eval: [
    'גם בלי החומר, המנוע מעריך את העמדה {band}. השורה שלו: {line}.',
    'המנוע בודק את ההקרבה ומעריך את העמדה {band}: {line}.',
  ],
  only: [
    'לפי הבדיקה של המנוע, המהלך החלופי הכי טוב היה מוריד לך {pct}% מסיכויי הניצחון. השורה: {line}.',
    'המהלך הבא בתור של המנוע היה עולה לך {pct}% מסיכויי הניצחון. ההמשך: {line}.',
  ],
  defended: [
    'אחרי המהלך שלך ליריב אין דרך לזכות בחומר. השורה של המנוע: {line}.',
    'בשורה של המנוע היריב לא מרוויח כלום: {line}.',
  ],
  defended_mate: [
    'אחרי המהלך שלך אין ליריב מט במהלך אחד. השורה של המנוע: {line}.',
    'עכשיו האיום סגור, וההמשך לפי המנוע: {line}.',
  ],
  trade: [
    'החומר נשאר לטובתך, והמנוע מעריך את העמדה {band}. השורה: {line}.',
    'אחרי החילוף אתה עדיין ביתרון של {aheadNoun}: {line}.',
  ],
  promote: [
    'עכשיו יש לך {newPromo} על הלוח, והמנוע מעריך את העמדה {band}.',
    'ההכתרה שווה הרבה חומר. המנוע מעריך את העמדה {band}.',
  ],
  to_queen: [
    'השורה של המנוע: {line}.',
    'ההמשך לפי המנוע: {line}, והרגלי מוכתר.',
  ],
  position: [
    'המנוע מסכים שזה המהלך הנכון, ומעריך את העמדה {band}. ההמשך: {line}.',
    'זה גם המהלך שהמנוע בוחר, והוא מעריך את העמדה {band}. ההמשך: {line}.',
  ],
};

// Plain words for the mover's winning chance, as an adverbial phrase ("as a big advantage for you").
export const GOOD_BANDS: { min: number; text: string }[] = [
  { min: 95, text: 'כמנצחת' },
  { min: 75, text: 'כיתרון גדול שלך' },
  { min: 58, text: 'כיתרון קטן שלך' },
  { min: 42, text: 'כשקולה' },
  { min: 25, text: 'כקצת פחות טובה בשבילך' },
  { min: 5, text: 'כקשה' },
  { min: -1, text: 'כאבודה' },
];

export const REVIEW_SUMMARY = {
  bestTitle: 'שלושת המהלכים הכי טובים שלך:',
  worstTitle: 'שלוש הטעויות הגדולות:',
  noGood: 'במשחק הזה המאמן לא מצא מהלך שבולט במיוחד לטובה.',
  noBad: 'לא היו לך טעויות במשחק הזה. כל הכבוד!',
};
