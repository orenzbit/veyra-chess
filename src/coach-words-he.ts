// The coach's phrase bank (COACH_EXPLAIN_ENABLED), in Hebrew, spoken to the player in the second person.
// Every phrase is a template with {slots}. coach-words.ts picks the category from the board and the engine's
// lines, fills the slots with facts it checked, and picks one of the variants so the coach does not repeat itself.
// Agreement (masculine/feminine) is never left to the template: slots such as {it}, {unprot}, {was} and {attacks}
// are filled already agreed with the piece they describe (the queen is feminine, every other piece masculine).

export type CategoryKey =
  | 'missed_mate' | 'mate_threat' | 'back_rank'
  | 'hanging_piece' | 'missed_capture' | 'fork' | 'missed_fork' | 'pin' | 'skewer' | 'discovered_attack'
  | 'king_safety' | 'queen_early' | 'undeveloped' | 'lost_center'
  | 'bad_trade' | 'pawn_structure'
  | 'endgame_king' | 'endgame_rook' | 'endgame_opposition'
  | 'general';

// The category's name as the coach says it, and the group it is counted under in the game summary.
export const CATEGORY_LABEL: Record<CategoryKey, string> = {
  missed_mate: 'מט שפספסת',
  mate_threat: 'איום מט',
  back_rank: 'חולשת השורה האחורית',
  hanging_piece: 'כלי לא מוגן',
  missed_capture: 'לקיחה שפספסת',
  fork: 'מזלג',
  missed_fork: 'מזלג שפספסת',
  pin: 'ריתוק',
  skewer: 'שיפוד',
  discovered_attack: 'התקפה נגלית',
  king_safety: 'בטיחות המלך',
  queen_early: 'מלכה בחוץ מוקדם מדי',
  undeveloped: 'כלים לא מפותחים',
  lost_center: 'ויתור על המרכז',
  bad_trade: 'חילוף גרוע',
  pawn_structure: 'מבנה רגלים',
  endgame_king: 'סיום: מלך לא פעיל',
  endgame_rook: 'סיום: הצריח לא מאחורי הרגלי החופשי',
  endgame_opposition: 'סיום: אופוזיציה',
  general: 'החלשת העמדה',
};

// WHAT went wrong and WHERE: the move, the square or piece, and the reply that punishes it.
// Sub-cases of a category have their own variants (hanging_piece.moved: the piece just moved hangs on its new square).
export const WHAT: Record<string, string[]> = {
  'missed_mate': [
    'ב-{move} היה לך מט, ופספסת אותו: {best} מתחיל מט מאולץ.',
    'בעמדה שלפני {move} היה מט! {best} מוביל למט, ושיחקת מהלך אחר.',
    'ב-{move} המלך של היריב היה חשוף למט: {best} היה גומר את המשחק.',
  ],
  'missed_mate.one': [
    'ב-{move} היה לך מט במהלך אחד: {best}.',
    'פספסת מט! לפני {move} המהלך {best} היה נותן מט מיד.',
  ],
  'mate_threat.ignored': [
    'ב-{move} היריב איים במט, ולא סגרת את האיום. עכשיו {reply} נותן מט.',
    'לפני {move} כבר היה איום מט, ({threat}), והמהלך שלך לא עצר אותו. היריב יכול {reply}.',
    'התעלמת מאיום מט: אחרי {move} היריב משחק {reply} והמלך שלך נתפס.',
  ],
  'mate_threat.now': [
    'אחרי {move} היריב נותן מט מיד: {reply}.',
    'ב-{move} השארת למלך שלך מט במהלך אחד: {reply}.',
  ],
  'mate_threat.allowed': [
    'ב-{move} פספסת סכנה למלך שלך: היריב עונה {reply}, ומשם זה מט מאולץ.',
    'אחרי {move} יש ליריב מט מאולץ שמתחיל ב-{reply}.',
  ],
  'back_rank.now': [
    'ב-{move} השארת את המלך ב-{ksq} על השורה האחורית בלי משבצת בריחה: {reply} הוא מט.',
    'חולשת השורה האחורית: אחרי {move} למלך ב-{ksq} אין משבצת בריחה, והיריב נותן מט עם {reply}.',
  ],
  'back_rank': [
    'ב-{move} השארת את המלך ב-{ksq} על השורה האחורית בלי משבצת בריחה: אחרי {reply}, {mater} {mates} ב-{matesq}.',
    'חולשת השורה האחורית: אחרי {move} למלך ב-{ksq} אין משבצת בריחה. היריב מתחיל עם {reply}, והמט מגיע ב-{matesq}.',
  ],
  'hanging_piece.moved': [
    'ב-{move} הזזת את {P} ל-{sq}, ושם {he} {unprot}. היריב יכול {reply} ולזכות ב{gain}.',
    '{P} שהזזת ב-{move} {stands} ב-{sq} בלי הגנה, והיריב פשוט לוקח {it}: {reply}.',
    'ב-{move} שמת את {P} ב-{sq}, משבצת שהיריב שולט בה. {reply} לוקח {it}.',
  ],
  'hanging_piece.moved_cheap': [
    'ב-{move} שמת את {P} ב-{sq}, ושם {A} של היריב {attacks} {it}. גם עם ההגנה, {reply} זוכה ב{gain}.',
    '{P} שהזזת ל-{sq} ב-{move} {attacked} על ידי כלי זול יותר: {A}. {reply} מרוויח בחילוף.',
  ],
  'hanging_piece.moved_outnumbered': [
    'ב-{move} שמת את {P} ב-{sq}, ושם היריב תוקף {it} יותר פעמים ממה שאתה מגן. {reply} זוכה ב{gain}.',
    '{P} שהזזת ל-{sq} ב-{move} {attacked} יותר פעמים ממה ש{he} {prot}. היריב לוקח: {reply}.',
  ],
  'hanging_piece.left': [
    'ב-{move} הזזת את {M} מ-{from}, והשארת את {P} ב-{sq} {noguard}. היריב יכול {reply} ולזכות ב{gain}.',
    '{M} ב-{from} שמר על {P} ב-{sq}. ב-{move} הזזת {itM}, ועכשיו {reply} לוקח {it}.',
    'ב-{move} {M} {left} את {from}, ומאז {P} ב-{sq} {unprot}. היריב עונה {reply}.',
  ],
  'hanging_piece.already': [
    '{P} ב-{sq} {was} בסכנה, וב-{move} לא הצלת {it}. היריב יכול {reply} ולזכות ב{gain}.',
    'לפני {move} {P} ב-{sq} כבר {was} {attacked} בלי הגנה מספקת, והמהלך שלך לא טיפל בזה: {reply}.',
  ],
  'missed_capture': [
    'ב-{move} יכולת לקחת את {T} ב-{tsq} עם {best}, ופספסת.',
    'לפני {move} {T} של היריב ב-{tsq} {was} {open} ללקיחה: {best}.',
    'פספסת לקיחה ב-{move}: {best} לוקח את {T} ב-{tsq}.',
  ],
  'missed_capture.line': [
    'ב-{move} יכולת לקחת את {T} ב-{tsq} עם {best}: גם אחרי התשובה של היריב, השורה של המנוע מרוויחה חומר.',
    'פספסת לקיחה ב-{move}: {best} לוקח את {T} ב-{tsq}, והחילוף שאחריו נגמר לטובתך.',
  ],
  'fork.allowed': [
    'אחרי {move} היריב משחק {reply}: {F} ב-{fsq} {attacks} בבת אחת את {t1} ואת {t2}.',
    'ב-{move} השארת מקום למזלג: {reply}, ו{F} ב-{fsq} {attacks} גם את {t1} וגם את {t2}.',
    'המהלך {move} מאפשר מזלג. {reply} {attacks} את {t1} ואת {t2}, ואי אפשר להציל את שניהם.',
  ],
  'fork.allowed_check': [
    'אחרי {move} היריב משחק {reply}: {F} ב-{fsq} {gives} שח ובאותו זמן {attacks} את {t1}.',
    'ב-{move} השארת מקום למזלג עם שח: {reply}. קודם צריך להציל את המלך, ו{t1} {goes}.',
  ],
  'missed_fork': [
    'ב-{move} היה לך מזלג: {best}, ו{F} {attacks} בבת אחת את {t1} ואת {t2}.',
    'פספסת מזלג ב-{move}: {best} {attacks} גם את {t1} וגם את {t2}.',
  ],
  'missed_fork.check': [
    'ב-{move} היה לך מזלג עם שח: {best} {gives} שח ובאותו זמן {attacks} את {t1}.',
    'פספסת מזלג ב-{move}: אחרי {best} היריב חייב להציל את המלך, ו{t1} {falls}.',
  ],
  'pin.made': [
    'אחרי {move} היריב משחק {reply} ומרתק את {X} ב-{xsq} אל {Y} ב-{ysq}: {X} {cant} לזוז בלי לחשוף את {Y}.',
    'ריתוק: ב-{move} נכנסת לקו של {S} של היריב. אחרי {reply}, {X} ב-{xsq} {stuck} מול {Y}.',
  ],
  'pin.into': [
    'ב-{move} נכנסת לריתוק: {X} ב-{xsq} {stands} עכשיו בין {S} של היריב ל{Yn} ב-{ysq}. היריב מנצל את זה: {reply}.',
    'אחרי {move} {X} ב-{xsq} {pinned} אל {Y} ב-{ysq}, והיריב {attacksX} מיד: {reply}.',
  ],
  'pin': [
    '{X} ב-{xsq} {pinned} אל {Y} ב-{ysq} על ידי {S} של היריב, וב-{move} לא טיפלת בזה. היריב מנצל את הריתוק: {reply}.',
    'ב-{move} {X} ב-{xsq} {remains} על אותו קו עם {Y} ב-{ysq}, והיריב מנצל את זה: {reply}.',
  ],
  'skewer': [
    'אחרי {move} היריב משחק {reply}: שיפוד. {X} ב-{xsq} {must} לזוז, ואז {Y} ב-{ysq} {taken}.',
    'ב-{move} השארת את {X} ואת {Y} על אותו קו. {reply} תוקף את {X}, ו{Y} {behind} {open}.',
  ],
  'discovered_attack.check': [
    'אחרי {move} היריב משחק {reply}: שח בגילוי. {P} {moves}, הקו של {S} אל המלך נפתח, ואתה חייב לטפל בשח.',
    'התקפה נגלית עם שח: ב-{move} לא שמת לב ש{S} של היריב {standsS} מאחורי {P}. {reply} נותן שח, ובשורה של המנוע היריב מרוויח חומר.',
  ],
  'discovered_attack': [
    'אחרי {move} היריב משחק {reply}: {P} {moves} ופותח את הקו של {S} אל {T} ב-{tsq}.',
    'התקפה נגלית: ב-{move} לא שמת לב ש{S} של היריב {standsS} מאחורי {P}. {reply} פותח את הקו אל {T}.',
  ],
  'king_safety.castle': [
    'במהלך {n} המלך שלך עדיין ב-{ksq}, והיה אפשר להצריח. במקום זה שיחקת {san}, והיריב יכול {reply}.',
    'ב-{move} דחית את ההצרחה. המלך ב-{ksq} נשאר באמצע, והיריב עונה {reply}.',
  ],
  'king_safety.king_moved': [
    'ב-{move} הזזת את המלך ואיבדת את הזכות להצריח. המלך נשאר באמצע הלוח, והיריב עונה {reply}.',
    'המהלך {move} עולה לך בהצרחה: מעכשיו המלך שלך תקוע במרכז, והיריב ממשיך {reply}.',
  ],
  'king_safety.exposed': [
    'ב-{move} הזזת את הרגלי מ-{opened}, ופתחת קו אל המלך ב-{ksq}: בשורה של המנוע היריב נותן שח דרך {opened}, החל מ-{reply}.',
    'הרגלי ב-{opened} הגן על המלך. אחרי {move} הקו פתוח, והיריב משתמש בו: {reply} ושח דרך {opened}.',
  ],
  'queen_early': [
    'ב-{move} הזזת את המלכה, כשעוד {count} כלים קלים שלך בבית. היריב עונה {reply}, תוקף אותה ומפתח כלי.',
    'המלכה בחוץ מוקדם מדי: אחרי {move} היריב משחק {reply} עם התקפה על המלכה, ואתה מבזבז מהלך כדי להציל אותה.',
  ],
  'queen_early.dev': [
    'ב-{move} הזזת את המלכה, כשעוד {count} כלים קלים שלך בבית ({list}). היריב עונה {reply}.',
    'במהלך {n} המלכה כבר מטיילת לבד ({san}), ו{list} עוד לא זזו. היריב עונה {reply}.',
  ],
  'undeveloped': [
    'במהלך {n} עוד {count} כלים קלים שלך בבית ({list}), ושיחקת {san} במקום לפתח. היריב עונה {reply}.',
    'ב-{move} השקעת מהלך בלי לפתח כלי, ו{list} עוד בשורה האחורית. היריב ממשיך {reply}.',
    'פיתוח: ב-{move} {list} עדיין לא במשחק. כל מהלך כזה נותן ליריב יתרון בזמן, והוא עונה {reply}.',
  ],
  'lost_center': [
    'ב-{move} ויתרת על המרכז: היריב משחק {reply} ותופס את {csq}.',
    'אחרי {move} היריב לוקח את המרכז עם {reply}, ולכלים שלך נשאר פחות מקום.',
  ],
  'lost_center.missed': [
    'ב-{move} יכולת לתפוס את המרכז עם {best}. היריב עונה למהלך שלך {reply}.',
    'המרכז חשוב: עם {best} היית תופס עוד משבצת במרכז. במקום זה ב-{move} שיחקת מהלך אחר, והיריב עונה {reply}.',
  ],
  'bad_trade.wrong_piece': [
    'ב-{move} נתת את {P} תמורת {T}: זה חילוף שמפסיד חומר. היריב לוקח בחזרה עם {reply}.',
    'החילוף ב-{move} לא שווה: {P} שווה יותר מ{Tn}, ו-{reply} משלים את החילוף לטובת היריב.',
  ],
  'bad_trade.behind': [
    'ב-{move} החלפת כלים כשאתה בפיגור של {deficit}. כל חילוף כזה מקרב את היריב לסיום מנצח, והוא לוקח בחזרה: {reply}.',
    'כשאתה בפיגור בחומר כדאי להשאיר כלים על הלוח. ב-{move} החלפת, והיריב עונה {reply}.',
  ],
  'pawn_structure.weakened': [
    'ב-{move} קלקלת את מבנה הרגלים: {weak}. היריב עונה {reply}.',
    'אחרי {move} יש לך {weak}, חולשה שתלווה אותך עד הסיום. היריב ממשיך {reply}.',
  ],
  'pawn_structure.promotes': [
    'ב-{move} לא עצרת את הרגלי החופשי ב-{psq}, והיריב מכתיר אותו: {reply}.',
    'הרגלי של היריב ב-{psq} היה צעד אחד מהכתרה, ואחרי {move} שום דבר לא עוצר אותו: {reply}.',
  ],
  'pawn_structure.passer_ignored': [
    'ב-{move} לא עצרת את הרגלי החופשי של היריב ב-{psq}. בשורה של המנוע הוא מתקדם: {reply}.',
    'לרגלי החופשי ב-{psq} אין מי שיעצור, ואחרי {move} היריב ממשיך לדחוף אותו: {reply}.',
  ],
  'pawn_structure.own_passer': [
    'היה לך רגלי חופשי ב-{psq}, וב-{move} לא דחפת אותו. {best} היה מקדם אותו.',
    'ב-{move} שכחת את הרגלי החופשי שלך ב-{psq}: {best} מקרב אותו להכתרה.',
  ],
  'endgame_king': [
    'זה סיום, ובסיום המלך הוא כלי לוחם. ב-{move} המלך שלך נשאר ב-{ksq} במקום להתקרב למרכז עם {best}.',
    'ב-{move} השארת את המלך ב-{ksq} מאחור. בסיום צריך להביא אותו למרכז: {best}.',
  ],
  'endgame_rook': [
    'ב-{move} הצריח שלך לא עומד מאחורי הרגלי החופשי ב-{psq}. {best} היה מעמיד אותו מאחוריו.',
    'כלל הזהב בסיומי צריחים: הצריח מאחורי הרגלי החופשי. ב-{move} שיחקת {san} במקום {best}.',
  ],
  'endgame_opposition': [
    'בסיום מלכים ורגלים, ב-{move} ויתרת על האופוזיציה. {best} מעמיד את המלכים זה מול זה, והיריב היה חייב לזוז.',
    'ב-{move} המלך שלך הלך למשבצת הלא נכונה. עם {best} היית תופס אופוזיציה, וזו הדרך להחזיק את העמדה.',
  ],
  'general': [
    'ב-{move} שיחקת {san}, והמנוע מעדיף {best}. אחרי המהלך שלך היריב עונה {reply}.',
    'המהלך {move} מחליש את העמדה. התשובה הכי טובה של היריב היא {reply}.',
  ],
};

// WHY it matters: material, mate, or the position, with the evaluation swing in plain words.
export const WHY: Record<string, string[]> = {
  material: [
    'זה עולה לך {gainNoun}: ההערכה ירדה {swing}.',
    'בשורה של המנוע אתה מאבד {gainNoun}, וההערכה ירדה {swing}.',
    'המחיר: {gainNoun}. ההערכה ירדה {swing}.',
  ],
  mate: [
    'זה כבר לא עניין של חומר: המשחק נגמר במט. ההערכה ירדה {swing}.',
    'אחרי זה המט מאולץ, והעמדה עברה {swing}.',
  ],
  missed_mate: [
    'במקום לנצח מיד, המשחק ממשיך: ההערכה ירדה {swing}.',
    'מט מאולץ שווה יותר מכל חומר. בלעדיו ההערכה ירדה {swing}.',
  ],
  missed_gain: [
    'פספסת {gainNoun}: ההערכה ירדה {swing}.',
    'זה היה מרוויח לך {gainNoun}. בלי זה ההערכה ירדה {swing}.',
  ],
  position: [
    'זה לא מפסיד חומר מיד, אבל העמדה נחלשת: ההערכה ירדה {swing}.',
    'החומר נשאר שווה, אבל ההערכה ירדה {swing}.',
    'אין כאן הפסד חומר מיידי, ובכל זאת ההערכה ירדה {swing}.',
  ],
};

// WHAT you should have played, and the idea behind it.
export const BETTER: Record<string, string[]> = {
  // {idea} is an infinitive: "להצריח ולהכניס את המלך למקום מוגן."
  inf: [
    'עדיף היה {best}: {idea}',
    'המהלך הנכון היה {best}, כדי {idea}',
    'המנוע ממליץ על {best}: {idea}',
  ],
  // {idea} is a full sentence.
  sentence: [
    'עדיף היה {best}. {idea}',
    'המהלך הנכון: {best}. {idea}',
    'המנוע ממליץ על {best}. {idea}',
  ],
  // {idea} starts with a present-tense verb about the move ("מוציא את הרץ מסכנה…"), joined with ש.
  rel: [
    'עדיף היה {best}, ש{idea}',
    'המהלך הנכון היה {best}, ש{idea}',
    'המנוע ממליץ על {best}, ש{idea}',
  ],
  plain: [
    'עדיף היה {best}.',
    'המהלך הנכון היה {best}.',
  ],
};

// Ideas behind the better move, stated only when coach-words.ts checked them on the board.
// The keys that start with an infinitive (BETTER.inf); the others are full sentences (BETTER.sentence).
export const IDEA_INF = ['castle', 'develop', 'center', 'king_up', 'rook_behind'];
export const IDEA: Record<string, string> = {
  mate_line: 'השורה למט: {line}.',
  line: 'השורה של המנוע: {line}.',
  mate_score: 'המנוע רואה ממנו מט מאולץ.',
  stops_mate: 'הוא סוגר את איום המט.',
  saves: 'ככה {P} כבר לא בסכנה.',
  takes: 'הוא לוקח את {T} ב-{tsq} ומרוויח {gainNoun}.',
  castle: 'להצריח ולהכניס את המלך למקום מוגן.',
  develop: 'לפתח את {P} ל-{sq} ולהתקרב להצרחה.',
  center: 'לתפוס את המרכז ב-{csq}.',
  king_up: 'להביא את המלך למרכז, דרך {sq}.',
  rook_behind: 'להעמיד את הצריח מאחורי הרגלי החופשי.',
  opposition: 'המלכים עומדים זה מול זה עם משבצת אחת ביניהם, ועכשיו היריב חייב לפנות את הדרך.',
  push: 'הוא דוחף את הרגלי ל-{sq}, צעד אחד קרוב יותר להכתרה.',
  blockade: 'הוא עוצר את הרגלי החופשי.',
};

// The fallback when no detector fires: a clear sentence with the evaluation swing, and nothing claimed beyond it.
export const FALLBACK: Record<string, string[]> = {
  // No category, and the opponent's line wins material.
  material: [
    'ב-{move} המנוע לא מראה טקטיקה אחת שאפשר לקרוא לה בשם, אבל התשובה של היריב, {reply}, מתחילה שורה שמרוויחה לו חומר.',
    'אחרי {move} היריב עונה {reply}, ובהמשך השורה של המנוע הוא מרוויח חומר.',
  ],
  // No category, and the best line would have won material.
  missed: [
    'ב-{move} היה לך מהלך שמרוויח חומר: {best}. היריב עונה למהלך ששיחקת {reply}.',
    'לפני {move} השורה של המנוע הייתה מרוויחה לך חומר, החל מ-{best}.',
  ],
  // No category and no material: a positional loss.
  position: [
    'ב-{move} המנוע לא מראה טקטיקה ברורה. התשובה הכי טובה של היריב היא {reply}.',
    'המהלך {move} פחות מדויק ממה שנראה. התשובה הכי טובה של היריב היא {reply}.',
  ],
};

// Plain words for the mover's winning chance (0..100), with the prepositions already attached.
export const BANDS: { min: number; from: string; to: string; still: string }[] = [
  { min: 95, from: 'מעמדה מנצחת', to: 'לעמדה מנצחת', still: 'ועדיין יש לך עמדה מנצחת' },
  { min: 75, from: 'מיתרון גדול', to: 'ליתרון גדול', still: 'ועדיין יש לך יתרון גדול' },
  { min: 58, from: 'מיתרון קטן', to: 'ליתרון קטן', still: 'ועדיין יש לך יתרון קטן' },
  { min: 42, from: 'מעמדה שקולה', to: 'לעמדה שקולה', still: 'והעמדה עדיין שקולה' },
  { min: 25, from: 'מעמדה קצת פחות טובה', to: 'לעמדה קצת פחות טובה', still: 'והעמדה עדיין קצת פחות טובה' },
  { min: 5, from: 'מעמדה קשה', to: 'לעמדה קשה', still: 'והעמדה עדיין קשה' },
  { min: -1, from: 'מעמדה אבודה', to: 'לעמדה אבודה', still: 'והעמדה עדיין אבודה' },
];

export const SUMMARY = {
  title: 'סיכום המאמן',
  top: 'שלוש הטעויות הגדולות במשחק:',
  frequent: 'הטעות שחזרה הכי הרבה במשחק הזה: {label} ({count} פעמים).',
  frequentOnce: 'כל טעות במשחק הזה הייתה מסוג אחר.',
  none: 'לא היו לך טעויות במשחק הזה. כל הכבוד!',
};
