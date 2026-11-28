// DNA-Driven Interactive Hybrid Bot Courses (personalized from the player's DNA & personal bot profile).
// Features:
//  - Hybrid lesson generator: opens directly on real verified mistakes from the player's own games
//    (even with <5 games!), distinguishing "חולשה חוזרת" (>=2 occurrences) from single mistakes & base drills.
//  - Handles BOTH player-first and bot-first sparring positions (fixes oren-2, oren-3, karpov-4 and any FEN).
//  - Real verifiable chess goal in sparring (material conservation / non-blunder / mate / advantage conversion)
//    instead of naive move counting.
//  - Real 5-game follow-up event creation + continuity preservation across DNA scans (decision 4א).
// Pure MIT TypeScript; zero external deps; safe to import in Node tests.

import type { BoardArrow } from './board-arrows.js';
import type { TiltClockReport } from './dna-tilt-clock.js';
import type {
  LessonFollowUpTracker,
  PersonalMistakeRecord,
  UserEvolutionState,
  WeaknessCategoryId,
} from './evolution-store.js';

export type CourseStage = 'inspect' | 'drills' | 'sparring' | 'done';
export type SparringGoalKind = 'keep-material' | 'convert-advantage' | 'deliver-mate' | 'clean-defense';
export type LessonOriginKind = 'recurring-weakness' | 'real-game-mistake' | 'base-training';

export interface CourseDrill {
  id: string;
  fen: string;
  playerSide: 'white' | 'black';
  promptHe: string;
  acceptedUci: string[];
  botReplyUci?: string;
  successHe: string;
  mistakeHintHe: string;
  bestArrow: [string, string];
}

export interface CourseLesson {
  id: string;
  titleHe: string;
  subtitleHe: string;
  inspectFen: string;
  playerSide: 'white' | 'black';
  inspectArrows: BoardArrow[];
  inspectExplanationHe: string;
  drills: CourseDrill[];
  sparringFen: string;
  sparringGoalHe: string;
  sparringMovesTarget: number;
  sparringGoalKind?: SparringGoalKind;
  dnaFollowUpHe: string;
  originKind?: LessonOriginKind;
  originBadgeHe?: string;
  selectionReasonHe?: string;
  sourceGameLabelHe?: string;
  weaknessTag?: WeaknessCategoryId;
}

export interface BotCourse {
  id: string;
  titleHe: string;
  themeHe: string;
  teacherBotId: string;
  teacherNameHe: string;
  teacherRoleHe: string;
  teacherPiece: string;
  priorityScore: number;
  dnaReasonHe: string;
  dnaMetricTagHe: string;
  followUpMetricHe: string;
  weaknessTag?: WeaknessCategoryId;
  teacherContributionHe?: string;
  personalSignalHe?: string;
  lessons: CourseLesson[];
}

export interface CourseProgressMap {
  [lessonKey: string]: {
    completedAt: string;
    drillsCorrect: number;
    drillsMistakes: number;
    sparringCompleted: boolean;
  };
}

export const BOT_COURSES_STORAGE_KEY = 'veyra_bot_courses_progress_v1';

// 16 verified chess positions (4 courses x 4 lessons), each with 3 verified drills.
const BASE_COURSES: Omit<BotCourse, 'priorityScore' | 'dnaReasonHe' | 'dnaMetricTagHe'>[] = [
  {
    id: 'hanging-pieces-tactics',
    titleHe: 'רדאר כלים תלויים וטקטיקה',
    themeHe: 'טקטיקה והתקפה',
    teacherBotId: 'tal',
    teacherNameHe: 'מיכאל טל (The Magician from Riga)',
    teacherRoleHe: 'מאמן טקטיקה, מזלגות והתקפה',
    teacherPiece: '♞',
    followUpMetricHe: 'מעקב DNA: בדיקה ב-5 המשחקים הבאים לירידה בבלנדרים של כלים תלויים',
    lessons: [
      {
        id: 'tal-1-hanging-knight',
        titleHe: 'שיעור 1: לזהות כלי לא מוגן לפני שזזים',
        subtitleHe: 'בדיקת כלים תלויים ב-3 שניות',
        inspectFen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
        playerSide: 'white',
        inspectArrows: [
          { from: 'c4', to: 'f7', who: 'me' },
          { from: 'e4', to: 'f2', who: 'opp' },
          { from: 'f3', to: 'e5', who: 'me', faded: true },
        ],
        inspectExplanationHe: 'טל מסביר: כשפרש שחור נוחת ב-e4 בלי הגנה של רגלי, אל תיבהל — בדוק מיד אילו כלים של היריב תלויים ואילו נקודות חלשות כמו f7 נפתחו!',
        drills: [
          {
            id: 'tal-1-d1',
            fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
            playerSide: 'white',
            promptHe: 'הפרש השחור ב-e4 מרכזי אך חשוף — שחק מהלך פיתוח חד שמצריח או תוקף במרכז (Nc3 או O-O).',
            acceptedUci: ['b1c3', 'e1g1', 'd1e2'],
            botReplyUci: 'e4c3',
            successHe: 'מעולה! Nc3/Qe2 מפעיל לחץ ישיר על הפרש ב-e4 בלי להשאיר כלים תלויים.',
            mistakeHintHe: 'שים לב: אל תשאיר את ה-c4 או e4 לא מוגנים. Nc3 תוקף את הפרש ומפתח כלי בו-זמנית.',
            bestArrow: ['b1', 'c3'],
          },
          {
            id: 'tal-1-d2',
            fen: 'r1bqkbnr/pppp1ppp/2n5/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 4',
            playerSide: 'white',
            promptHe: 'הפרש שלך ב-e5 עומד תלוי מול הפרש השחור ב-c6! החלף או נסוג בצורה בטוחה.',
            acceptedUci: ['e5c6', 'e5f3', 'd2d4'],
            botReplyUci: 'd7c6',
            successHe: 'חד! זיהית שהפרש ב-e5 היה מותקף ושמרת על החומר.',
            mistakeHintHe: 'הפרש ב-c6 מאיים לאכול אותך ב-e5 — בדוק כלי מותקף לפני כל מהלך אחר (Nxc6 או Nf3).',
            bestArrow: ['e5', 'c6'],
          },
          {
            id: 'tal-1-d3',
            fen: 'r2qkb1r/ppp2ppp/2np1n2/4p1B1/2B1P3/2NP4/PPP2PPP/R2QK2R w KQkq - 0 6',
            playerSide: 'white',
            promptHe: 'לשחור יש כלי מרותק ב-f6 — שחק מהלך שמגביר את הלחץ על המרכז (Nd5 או O-O).',
            acceptedUci: ['c3d5', 'e1g1', 'g5f6'],
            botReplyUci: 'f8e7',
            successHe: 'בול בסגנון של טל! Nd5 מנצל את הריתוק ויוצר איום מיידי.',
            mistakeHintHe: 'הרץ ב-g5 מרתק את הפרש ב-f6 למלכה — נצל את זה עם Nd5!',
            bestArrow: ['c3', 'd5'],
          },
        ],
        sparringFen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 3',
        sparringGoalHe: 'שחק 4 מהלכים נקיים מול טל בלי להשאיר אף כלי תלוי.',
        sparringMovesTarget: 4,
        dnaFollowUpHe: 'מעקב DNA: בדיקת שיעור כלים תלויים ב-5 המשחקים הבאים.',
      },
      {
        id: 'tal-2-knight-forks',
        titleHe: 'שיעור 2: מזלג פרש על המלך והצריח',
        subtitleHe: 'ענישת נקודת c7 / f7',
        inspectFen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p1N1/2B1P3/8/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        playerSide: 'white',
        inspectArrows: [
          { from: 'g5', to: 'f7', who: 'me' },
          { from: 'c4', to: 'f7', who: 'me', faded: true },
        ],
        inspectExplanationHe: 'טל מסביר: f7 מוגנת רק על ידי המלך! כשפרש ורץ מכוונים יחד ל-f7, מתפנה מזלג קלאסי על המלכה והצריח.',
        drills: [
          {
            id: 'tal-2-d1',
            fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p1N1/2B1P3/8/PPPP1PPP/RNBQK2R w KQkq - 4 4',
            playerSide: 'white',
            promptHe: 'תור לבן — הכה ב-f7 כדי לשבור את ההגנה של השחור (Bxf7+ או Nxf7)!',
            acceptedUci: ['c4f7', 'g5f7'],
            botReplyUci: 'e8f8',
            successHe: 'פגיעה בול! f7 נופלת עם איום ישיר על המלך והצריח.',
            mistakeHintHe: 'הסתכל על משבצת f7 — גם הרץ ב-c4 וגם הפרש ב-g5 מכוונים אליה.',
            bestArrow: ['c4', 'f7'],
          },
          {
            id: 'tal-2-d2',
            fen: 'r1b1k2r/ppppqppp/2n5/2b1N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 5',
            playerSide: 'white',
            promptHe: 'הפרש שלך ב-e5 תוקף את f7 וגם מאוים על ידי המלכה/פרש. זכה בחומר או החזר שליטה (Nxc6 או Nxf7).',
            acceptedUci: ['e5c6', 'e5f7', 'e5d3'],
            botReplyUci: 'd7c6',
            successHe: 'יפה! מנעת איבוד פרש ושמרת על יוזמה.',
            mistakeHintHe: 'אל תשכח שהפרש ב-e5 תחת איום — Nxc6 או Nxf7 מנצלים את הטקטיקה.',
            bestArrow: ['e5', 'c6'],
          },
          {
            id: 'tal-2-d3',
            fen: 'r2qk2r/ppp2ppp/2n5/1N1pp3/8/8/PPPP1PPP/R1BQK2R w KQkq - 0 8',
            playerSide: 'white',
            promptHe: 'מצא את האיום על c7 או פיתוח עם יתרון (Nxc7+ לא חוקי אם מוגן — בדוק אם המלכה שומרת על c7!).',
            acceptedUci: ['d2d4', 'c2c3', 'e1g1'],
            botReplyUci: 'a7a6',
            successHe: 'מחשבה בוגרת! בדקת שהמלכה ב-d8 מגינה על c7 ולכן לא קפצת למזלג מזויף — פתחת את המרכז.',
            mistakeHintHe: 'זהירות ממלכודת! המלכה ב-d8 מגינה על c7 — לכן d4 היא ההכנה הנכונה.',
            bestArrow: ['d2', 'd4'],
          },
        ],
        sparringFen: 'r1bqkb1r/pppp1ppp/2n2n2/4p1N1/2B1P3/8/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        sparringGoalHe: 'שחק 4 מהלכים מתוך התקפת הפרש המוקדמת מול טל.',
        sparringMovesTarget: 4,
        dnaFollowUpHe: 'מעקב DNA: מעקב אחרי פספוסי מזלגות (Miss/Tactics) ב-5 המשחקים הבאים.',
      },
      {
        id: 'tal-3-back-rank',
        titleHe: 'שיעור 3: איומי שורה אחורית ויצירת "חלון" למלך',
        subtitleHe: 'להימנע ממט בשורה 1 ולהעניש את היריב',
        inspectFen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
        playerSide: 'white',
        inspectArrows: [
          { from: 'd1', to: 'd8', who: 'me' },
        ],
        inspectExplanationHe: 'טל מסביר: מלך שנעול מאחורי שלושה רגלים בשורה השמינית הוא מטרה קלה למט שורה אחורית. מהלך אחד של צריח מסיים את המשחק!',
        drills: [
          {
            id: 'tal-3-d1',
            fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
            playerSide: 'white',
            promptHe: 'מט במהלך אחד! מצא את המכה המנצחת בשורה האחורית.',
            acceptedUci: ['d1d8'],
            successHe: 'מט! Rd8# מסיים את המשחק מיד.',
            mistakeHintHe: 'המלך השחור חנוק מאחורי f7-g7-h7 — העלה את הצריח לשורה השמינית.',
            bestArrow: ['d1', 'd8'],
          },
          {
            id: 'tal-3-d2',
            fen: '3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
            playerSide: 'white',
            promptHe: 'הצריח השחור ב-d8 מגן על השורה האחורית — מה יקרה אם תאכל ב-d8 או תפתח חלון למלך (h3/g3)?',
            acceptedUci: ['d1d8', 'h2h3', 'g2g3'],
            botReplyUci: 'g8f8',
            successHe: 'מעולה! גם h3/g3 (חלון אוויר) וגם החלפת צריחים מנטרלים את סכנת השורה האחורית.',
            mistakeHintHe: 'השחור מאיים Rxd1#. פתח חלון למלך (h3) או החלף צריחים (Rxd8+).',
            bestArrow: ['h2', 'h3'],
          },
          {
            id: 'tal-3-d3',
            fen: '5rk1/5ppp/8/8/8/7P/5PP1/3R2K1 w - - 0 1',
            playerSide: 'white',
            promptHe: 'כאן כבר יש לך חלון ב-h3. הכנס את הצריח לטור הפתוח והפעל לחץ (Rd7 או Rd8).',
            acceptedUci: ['d1d7', 'd1d8'],
            botReplyUci: 'f8e8',
            successHe: 'נהדר! שליטה בשורה השביעית או החלפה בטור פתוח.',
            mistakeHintHe: 'הצריח שייך לשורה השביעית (Rd7) — משם הוא תוקף רגלים וחונק את המלך.',
            bestArrow: ['d1', 'd7'],
          },
        ],
        sparringFen: '3r2k1/5ppp/8/8/8/7P/5PP1/3R2K1 w - - 0 1',
        sparringGoalHe: 'תרגל 4 מהלכים בסיום צריחים בלי ליפול למט שורה אחורית.',
        sparringMovesTarget: 4,
        dnaFollowUpHe: 'מעקב DNA: מעקב אחרי בלנדרים של מט שורה אחורית ב-5 המשחקים הבאים.',
      },
      {
        id: 'tal-4-checks-captures-threats',
        titleHe: 'שיעור 4: כלל ה-CCT — שח, הכאה, איום',
        subtitleHe: 'סדר הבדיקה של שחקן תוקף בכל מהלך',
        inspectFen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5',
        playerSide: 'white',
        inspectArrows: [
          { from: 'c1', to: 'g5', who: 'me' },
          { from: 'e1', to: 'g1', who: 'me', faded: true },
        ],
        inspectExplanationHe: 'טל מסביר: לפני כל מהלך שקט, סרוק 3 דברים: שחים, הכאות, איומים. אחרי שבדקת שאין איום מיידי, הצרח ופתח כלים.',
        drills: [
          {
            id: 'tal-4-d1',
            fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5',
            playerSide: 'white',
            promptHe: 'הגן על המלך והשלם פיתוח — מה המהלך הכי חזק ובטוח כאן?',
            acceptedUci: ['e1g1', 'c1g5', 'c2c3'],
            botReplyUci: 'd7d6',
            successHe: 'מעולה! הצרחה או פיתוח אקטיבי בונה בסיס להתקפה.',
            mistakeHintHe: 'המלך שלך עדיין במרכז — הצרחה (O-O) או Bg5 שומרים על יוזמה.',
            bestArrow: ['e1', 'g1'],
          },
          {
            id: 'tal-4-d2',
            fen: 'r1bq1rk1/ppp2ppp/2np1n2/2b1p1B1/2B1P3/2NP1N2/PPP2PPP/R2Q1RK1 w - - 0 7',
            playerSide: 'white',
            promptHe: 'הפרש ב-f6 מרותק! הפעל עליו לחץ נוסף עם הפרש שלך.',
            acceptedUci: ['c3d5', 'c3a4'],
            botReplyUci: 'c8e6',
            successHe: 'מכה אסטרטגית מושלמת — Nd5 לוחץ על הכלי המרותק!',
            mistakeHintHe: 'זוכר את הכלל? תמיד תוקפים כלי מרותק עם עוד כלי — נסה Nd5.',
            bestArrow: ['c3', 'd5'],
          },
          {
            id: 'tal-4-d3',
            fen: 'r2q1rk1/ppp2ppp/2npbn2/2bNp1B1/2B1P3/3P1N2/PPP2PPP/R2Q1RK1 w - - 2 8',
            playerSide: 'white',
            promptHe: 'כעת אפשר לשבור את מבנה הרגלים של המלך השחור — מצא את ההכאה הנכונה.',
            acceptedUci: ['d5f6', 'g5f6'],
            botReplyUci: 'g7f6',
            successHe: 'אלוף! הכאה ב-f6 הורסת לשחור את החומה מול המלך.',
            mistakeHintHe: 'בדוק הכאות (CCT): Nxf6+ או Bxf6 פותחים את אגף המלך השחור.',
            bestArrow: ['d5', 'f6'],
          },
        ],
        sparringFen: 'r2q1rk1/ppp2ppp/2npbn2/2bNp1B1/2B1P3/3P1N2/PPP2PPP/R2Q1RK1 w - - 2 8',
        sparringGoalHe: 'המשך את ההתקפה 4 מהלכים מול טל.',
        sparringMovesTarget: 4,
        dnaFollowUpHe: 'מעקב DNA: מדידת שיפור במדד הטקטיקה ב-5 המשחקים הבאים.',
      },
    ],
  },
  {
    id: 'endgame-conversion',
    titleHe: 'המרת יתרון וסיומים נקיים',
    themeHe: 'סיומים והמרת יתרון',
    teacherBotId: 'capablanca',
    teacherNameHe: 'חוסה ראול קפבלנקה',
    teacherRoleHe: 'מאמן סיומים, פשטות והמרת יתרון',
    teacherPiece: '♜',
    followUpMetricHe: 'מעקב DNA: ירידה באובדן עמדות זכויות ובנפילות לפט ב-5 המשחקים הבאים',
    lessons: [
      {
        id: 'capa-1-active-king',
        titleHe: 'שיעור 1: בסיום — המלך הופך ללוחם',
        subtitleHe: 'קידום המלך למרכז לפני הרגלים',
        inspectFen: '8/5pp1/6k1/8/8/6P1/5PP1/6K1 w - - 0 1',
        playerSide: 'white',
        inspectArrows: [
          { from: 'g1', to: 'f1', who: 'me' },
          { from: 'g6', to: 'f5', who: 'opp' },
        ],
        inspectExplanationHe: 'קפבלנקה מסביר: כשאין מלכות על הלוח, המלך אינו צריך להתחבא. הצעד הראשון בסיום הוא להביא את המלך למרכז הלוח!',
        drills: [
          {
            id: 'capa-1-d1',
            fen: '8/5pp1/6k1/8/8/6P1/5PP1/6K1 w - - 0 1',
            playerSide: 'white',
            promptHe: 'הפעל את המלך שלך לכיוון המרכז!',
            acceptedUci: ['g1f1', 'g1h2', 'f2f3'],
            botReplyUci: 'g6f5',
            successHe: 'בדיוק! המלך יוצא לפעולה כדי לשלוט במשבצות המרכז.',
            mistakeHintHe: 'בסיום המלך חייב להתקדם לכיוון המרכז — Kf1 היא הדרך הנקייה.',
            bestArrow: ['g1', 'f1'],
          },
          {
            id: 'capa-1-d2',
            fen: '8/8/4k3/4p3/4P3/4K3/8/8 w - - 0 1',
            playerSide: 'white',
            promptHe: 'סיום רגלים שווה — שמור על שליטה ואל תיתן למלך השחור לחדור.',
            acceptedUci: ['e3d3', 'e3f3', 'e3e2'],
            botReplyUci: 'e6d6',
            successHe: 'נקי ומדויק — שומרים על הנגדה (Opposition).',
            mistakeHintHe: 'הזז את המלך בצמוד למרכז (Kd3 או Kf3) כדי להגן על e4.',
            bestArrow: ['e3', 'd3'],
          },
          {
            id: 'capa-1-d3',
            fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1',
            playerSide: 'white',
            promptHe: 'המלך שלך כבר מלפני הרגלי! קדם אותו כדי לפנות דרך להכתרה.',
            acceptedUci: ['e6d6', 'e6f6'],
            botReplyUci: 'e8d8',
            successHe: 'מופת! המלך מוביל את הרגלי לשורה השמינית.',
            mistakeHintHe: 'כשהמלך שלך בשורה השישית מול המלך השחור, צעד קדימה (Kd6 או Kf6) מבטיח הכתרה.',
            bestArrow: ['e6', 'f6'],
          },
        ],
        sparringFen: '8/5pp1/6k1/8/4P3/6P1/5P2/6K1 w - - 0 1',
        sparringGoalHe: 'שחק 4 מהלכים עם יתרון רגלי מול קפבלנקה וקדם את המלך.',
        sparringMovesTarget: 4,
        dnaFollowUpHe: 'מעקב DNA: שיפור המרת יתרון בסיומי רגלים ב-5 המשחקים הבאים.',
      },
      {
        id: 'capa-2-avoid-stalemate',
        titleHe: 'שיעור 2: לנצח בלי ליפול לפט (Stalemate)',
        subtitleHe: 'בדיקת "יש למלך משבצת?" לפני כל מהלך',
        inspectFen: '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1',
        playerSide: 'white',
        inspectArrows: [
          { from: 'f7', to: 'g7', who: 'me' },
          { from: 'f7', to: 'f6', who: 'me', mistake: true },
        ],
        inspectExplanationHe: 'קפבלנקה מסביר: המון משחקים מנצחים מסתיימים בתיקו מיותר בגלל פט. כשהיריב נשאר רק עם מלך — תן שח או השאר לו משבצת עד למט!',
        drills: [
          {
            id: 'capa-2-d1',
            fen: '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1',
            playerSide: 'white',
            promptHe: 'תן מט במהלך אחד — בלי ליפול לפט!',
            acceptedUci: ['f7g7', 'f7f8', 'f7e8'],
            successHe: 'מט נקי! לא בזבזת מהלך ולא נפלת לפט.',
            mistakeHintHe: 'המלכה מוגנת ע״י המלך ב-g6 — Qg7# או Qf8# זה מט מיידי.',
            bestArrow: ['f7', 'g7'],
          },
          {
            id: 'capa-2-d2',
            fen: '7k/8/5KQ1/8/8/8/8/8 w - - 0 1',
            playerSide: 'white',
            promptHe: 'המלך השחור ב-h8. מצא מט במהלך אחד (זהירות לא להוריד ל-g7 בלי הגנה או לעשות פט!).',
            acceptedUci: ['g6g7', 'g6e8'],
            successHe: 'מושלם! Qg7# מוגן על ידי המלך ב-f6.',
            mistakeHintHe: 'המלך ב-f6 שומר על g7 — שחק Qg7#.',
            bestArrow: ['g6', 'g7'],
          },
          {
            id: 'capa-2-d3',
            fen: 'k7/2Q5/2K5/8/8/8/8/8 w - - 0 1',
            playerSide: 'white',
            promptHe: 'מט במהלך אחד עם מלכה ומלך!',
            acceptedUci: ['c7b7', 'c7c8', 'c7a7', 'c7b8'],
            successHe: 'קליני! סיום נקי של אלוף עולם.',
            mistakeHintHe: 'המלך ב-c6 שומר על b7 — Qb7# הוא מט מיידי.',
            bestArrow: ['c7', 'b7'],
          },
        ],
        sparringFen: '7k/8/5K2/8/8/8/8/6Q1 w - - 0 1',
        sparringGoalHe: 'סגור מט נקי מול קפבלנקה בלי ליפול לפט.',
        sparringMovesTarget: 3,
        dnaFollowUpHe: 'מעקב DNA: אפס תיקו פט בעמדות זכויות ב-5 המשחקים הבאים.',
      },
      {
        id: 'capa-3-trade-when-ahead',
        titleHe: 'שיעור 3: כשאתה ביתרון — תחליף כלים, לא רגלים',
        subtitleHe: 'פישוט עמדה זכויה',
        inspectFen: '3r2k1/5ppp/8/8/8/3Q4/5PPP/3R2K1 w - - 0 1',
        playerSide: 'white',
        inspectArrows: [
          { from: 'd3', to: 'd8', who: 'me' },
        ],
        inspectExplanationHe: 'קפבלנקה מסביר: כשיש לך מלכה יתרה או צריח יתרה, כל החלפת כלים מורידה ליריב את הסיכוי לתרגיל נגדי ומקרבת אותך לניצחון בטוח.',
        drills: [
          {
            id: 'capa-3-d1',
            fen: '3r2k1/5ppp/8/8/8/3Q4/5PPP/3R2K1 w - - 0 1',
            playerSide: 'white',
            promptHe: 'יש לך מלכה יתרה! נקה את הצריח האחרון של השחור.',
            acceptedUci: ['d3d8'],
            botReplyUci: 'd8d8',
            successHe: 'מדויק! אחרי Qxd8# זה בכלל מט מיידי!',
            mistakeHintHe: 'הצריח שלך ב-d1 מגבה את d8 — Qxd8# מסיים מיד.',
            bestArrow: ['d3', 'd8'],
          },
          {
            id: 'capa-3-d2',
            fen: '4r1k1/5ppp/8/8/8/4R3/5PPP/4R1K1 w - - 0 1',
            playerSide: 'white',
            promptHe: 'יש לך צריח יתרה — החלף את הצריח האחרון של היריב וחסל כל משחק נגדי.',
            acceptedUci: ['e3e8'],
            successHe: 'בדיוק! Rxe8# הוא גם החלפה וגם מט שורה אחורית.',
            mistakeHintHe: 'יש לך סוללת צריחים בטור e — Rxe8# מסיים.',
            bestArrow: ['e3', 'e8'],
          },
          {
            id: 'capa-3-d3',
            fen: '2r3k1/5ppp/8/8/8/7P/5PP1/2RR2K1 w - - 0 1',
            playerSide: 'white',
            promptHe: 'אתה ביתרון צריח שלם — החלף את הצריח הפעיל של השחור.',
            acceptedUci: ['c1c8'],
            botReplyUci: 'c8c8',
            successHe: 'פשוט וחזק! אחרי Rxc8+ אתה נשאר עם צריח שלם יתרה.',
            mistakeHintHe: 'החלפת הצריח ב-c8 משאירה אותך ביתרון מכריע בלי סיכונים.',
            bestArrow: ['c1', 'c8'],
          },
        ],
        sparringFen: '2r3k1/5ppp/8/8/8/7P/5PP1/2RR2K1 w - - 0 1',
        sparringGoalHe: 'המר את יתרון הצריח ב-4 מהלכים נקיים מול קפבלנקה.',
        sparringMovesTarget: 4,
        dnaFollowUpHe: 'מעקב DNA: מדידת שיעור המרת יתרון של +3 ומעלה ב-5 המשחקים הבאים.',
      },
      {
        id: 'capa-4-rook-behind-passed',
        titleHe: 'שיעור 4: צריח מאחורי רגלי חופשי',
        subtitleHe: 'חוק טאראש בסיומי צריחים',
        inspectFen: '8/1P4k1/8/8/8/8/6K1/1R4r1 w - - 0 1',
        playerSide: 'white',
        inspectArrows: [
          { from: 'b1', to: 'b7', who: 'me', faded: true },
          { from: 'g2', to: 'g1', who: 'me' },
        ],
        inspectExplanationHe: 'קפבלנקה מסביר: צריח תמיד עובד הכי טוב מאחורי הרגלי החופשי — ככל שהרגלי מתקדם, הצריח רק נהיה אקטיבי יותר.',
        drills: [
          {
            id: 'capa-4-d1',
            fen: '8/1P4k1/8/8/8/8/6K1/1R4r1 w - - 0 1',
            playerSide: 'white',
            promptHe: 'השחור הקריב צריח כדי להסיט אותך — הכה עם המלך ושמור את הצריח מאחורי הרגלי ב-b7!',
            acceptedUci: ['g2g1', 'b1g1'],
            botReplyUci: 'g7f6',
            successHe: 'מעולה! Kxg1 משאיר את הצריח מאחורי b7 ומוכן להכתרה.',
            mistakeHintHe: 'הכה את הצריח השחור עם המלך (Kxg1) כדי לא להזיז את הצריח מ-b1!',
            bestArrow: ['g2', 'g1'],
          },
          {
            id: 'capa-4-d2',
            fen: '8/1P4k1/8/8/8/8/8/1R4K1 w - - 0 2',
            playerSide: 'white',
            promptHe: 'הדרך פנויה! הכתר למלכה וסיים את המשחק.',
            acceptedUci: ['b7b8q'],
            successHe: 'הכתרה נקייה למלכה! הצריח מאחורי הרגלי עשה את העבודה.',
            mistakeHintHe: 'דחוף את הרגלי מ-b7 ל-b8 להכתיר מלכה.',
            bestArrow: ['b7', 'b8'],
          },
          {
            id: 'capa-4-d3',
            fen: '6k1/8/8/1P6/8/8/6K1/R7 w - - 0 1',
            playerSide: 'white',
            promptHe: 'מקם את הצריח שלך מאחורי הרגלי החופשי ב-b5!',
            acceptedUci: ['a1b1'],
            botReplyUci: 'g8f7',
            successHe: 'חוק הזהב! Rb1 תומך ברגלי כל הדרך עד b8.',
            mistakeHintHe: 'שים את הצריח בטור b מאחורי הרגלי — Rb1.',
            bestArrow: ['a1', 'b1'],
          },
        ],
        sparringFen: '6k1/8/8/1P6/8/8/6K1/1R6 w - - 0 1',
        sparringGoalHe: 'דחוף את הרגלי החופשי להכתרה מול קפבלנקה.',
        sparringMovesTarget: 4,
        dnaFollowUpHe: 'מעקב DNA: ניצול רגלים חופשיים בסיומי צריחים ב-5 המשחקים הבאים.',
      },
    ],
  },
  {
    id: 'opening-traps-control',
    titleHe: 'מלכודות פתיחה ושליטה במרכז',
    themeHe: 'פתיחות ומלכודות הרמה שלך',
    teacherBotId: 'orenzbit',
    teacherNameHe: 'אורן (הבוט האישי שלך)',
    teacherRoleHe: 'מאמן מלכודות אישיות והרגלי פתיחה',
    teacherPiece: '♟',
    followUpMetricHe: 'מעקב DNA: הפחתת טעויות ב-10 המהלכים הראשונים ב-5 המשחקים הבאים',
    lessons: [
      {
        id: 'oren-1-scholars-mate',
        titleHe: 'שיעור 1: לנטרל מט סנדלרים ויציאת מלכה מוקדמת',
        subtitleHe: 'להגן על e5 ואז על f7 — ולהעניש את המלכה',
        inspectFen: 'rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2',
        playerSide: 'black',
        inspectArrows: [
          { from: 'b8', to: 'c6', who: 'me' },
          { from: 'g7', to: 'g6', who: 'me', mistake: true },
          { from: 'h5', to: 'e5', who: 'opp' },
        ],
        inspectExplanationHe: 'הבוט שלך מסביר: אחרי 2.Qh5 הטעות הכי נפוצה היא 2...g6?? שמפסידה מיד את e5 ואת הצריח ב-h8! קודם מגינים על e5 עם Nc6, ורק אחרי Bc4 משחקים g6.',
        drills: [
          {
            id: 'oren-1-d1',
            fen: 'rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2',
            playerSide: 'black',
            promptHe: 'הלבן יצא עם 2.Qh5! הגן על רגלי e5 בלי לתת מזלג על הצריח.',
            acceptedUci: ['b8c6', 'd7d6', 'd8e7'],
            botReplyUci: 'f1c4',
            successHe: 'מושלם! Nc6 מגן על e5 ומפתח פרש. g6 הייתה מפסידה צריח!',
            mistakeHintHe: 'זהירות! אם תשחק g6 עכשיו, Qxe5+ לוקח את הרגלי ואת הצריח ב-h8. שחק Nc6 קודם!',
            bestArrow: ['b8', 'c6'],
          },
          {
            id: 'oren-1-d2',
            fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
            playerSide: 'black',
            promptHe: 'עכשיו הלבן מאיים מט ב-f7 עם Bc4! איך אתה חוסם את המט ומגרש את המלכה?',
            acceptedUci: ['g7g6', 'd8e7', 'd8f6'],
            botReplyUci: 'h5f3',
            successHe: 'בול! עכשיו כש-e5 מוגן, g6 חוסם את המט ומבריח את המלכה!',
            mistakeHintHe: 'הלבן מאיים Qxf7#. עכשיו אפשר לשחק g6 בבטחה (כי Nc6 כבר מגן על e5)!',
            bestArrow: ['g7', 'g6'],
          },
          {
            id: 'oren-1-d3',
            fen: 'r1bqkbnr/pppp1p1p/2n3p1/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 1 4',
            playerSide: 'black',
            promptHe: 'הלבן עדיין מאיים Qxf7# מ-f3! סגור את האיום עם פיתוח פרש.',
            acceptedUci: ['g8f6', 'd8f6', 'd8e7'],
            botReplyUci: 'g1e2',
            successHe: 'ניטרלת את מט הסנדלרים לחלוטין ועברת ליתרון פיתוח!',
            mistakeHintHe: 'המלכה ב-f3 והרץ ב-c4 עדיין מאיימים מט ב-f7 — Nf6 חוסם ומפתח כלי.',
            bestArrow: ['g8', 'f6'],
          },
        ],
        sparringFen: 'r1bqkb1r/pppp1p1p/2n2np1/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 2 4',
        sparringGoalHe: 'שחק 4 מהלכים מענישים מול בוט אורן אחרי שניטרלת את המלכודת.',
        sparringMovesTarget: 4,
        dnaFollowUpHe: 'מעקב DNA: אפס הפסדים מוקדמים ליציאת מלכה ב-5 המשחקים הבאים.',
      },
      {
        id: 'oren-2-center-control',
        titleHe: 'שיעור 2: פיתוח לפני הרפתקאות באגפים',
        subtitleHe: 'בלי Na3/b3 מיותרים לפני שהמרכז מפותח',
        inspectFen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        playerSide: 'white',
        inspectArrows: [
          { from: 'f1', to: 'c4', who: 'me' },
          { from: 'b1', to: 'a3', who: 'me', mistake: true },
        ],
        inspectExplanationHe: 'הבוט שלך מסביר: בדאטה האישי שלך רואים לעיתים מהלכים צדדיים כמו Na3. פרש בשוליים שולט רק על 4 משבצות — לעומת Bc4 או Nc3 ששולטים במרכז.',
        drills: [
          {
            id: 'oren-2-d1',
            fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
            playerSide: 'white',
            promptHe: 'בחר פיתוח מרכזי קלאסי של הרץ או הפרש (Bc4 / Bb5 / Nc3 / d4).',
            acceptedUci: ['f1c4', 'f1b5', 'b1c3', 'd2d4'],
            botReplyUci: 'g8f6',
            successHe: 'פיתוח של ספר! כל כלי מכוון למרכז.',
            mistakeHintHe: 'הוצא רץ או פרש לכיוון המרכז (Bc4 או Bb5) והכן הצרחה.',
            bestArrow: ['f1', 'c4'],
          },
          {
            id: 'oren-2-d2',
            fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
            playerSide: 'white',
            promptHe: 'השחור תוקף את e4 עם Nf6 — הגן על e4 עם פיתוח (d3 או Nc3).',
            acceptedUci: ['d2d3', 'b1c3', 'e1g1'],
            botReplyUci: 'f8c5',
            successHe: 'יציב וחזק! e4 מוגן והפיתוח זורם.',
            mistakeHintHe: 'שמור על e4 עם d3 או Nc3 — פיתוח פשוט בלי לפתוח חורים.',
            bestArrow: ['d2', 'd3'],
          },
          {
            id: 'oren-2-d3',
            fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 5',
            playerSide: 'white',
            promptHe: 'המלך מוכן להצרחה — הבטח את המלך שלך עכשיו!',
            acceptedUci: ['e1g1'],
            botReplyUci: 'e8g8',
            successHe: 'המלך בטוח, הצריח מתחבר למשחק!',
            mistakeHintHe: 'הצרחה קצרה (O-O) מוציאה את המלך מקו האש.',
            bestArrow: ['e1', 'g1'],
          },
        ],
        sparringFen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 b kq - 2 5',
        sparringGoalHe: 'שחק 4 מהלכים מרכזיים נקיים מול בוט אורן.',
        sparringMovesTarget: 4,
        dnaFollowUpHe: 'מעקב DNA: עלייה בשיעור הצרחה לפני מהלך 10 ב-5 המשחקים הבאים.',
      },
      {
        id: 'oren-3-fried-liver-defense',
        titleHe: 'שיעור 3: הגנה ממלכודת Ng5 על f7',
        subtitleHe: 'איך לא להתמוטט מול האיטלקית האגרסיבית',
        inspectFen: 'r1bqkb1r/pppp1ppp/2n2n2/4p1N1/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 5 4',
        playerSide: 'black',
        inspectArrows: [
          { from: 'd7', to: 'd5', who: 'me' },
          { from: 'c4', to: 'f7', who: 'opp' },
        ],
        inspectExplanationHe: 'הבוט שלך מסביר: כשהלבן תוקף את f7 עם Ng5 ו-Bc4, המהלך היחיד שחוסם את הרץ ופותח את המשחק הוא d5!',
        drills: [
          {
            id: 'oren-3-d1',
            fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p1N1/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 5 4',
            playerSide: 'black',
            promptHe: 'חסום את האלכסון של הרץ מ-c4 ל-f7 במהלך אחד!',
            acceptedUci: ['d7d5'],
            botReplyUci: 'e4d5',
            successHe: 'בדיוק! 4...d5 סוגר את אלכסון הרץ מיד.',
            mistakeHintHe: 'הרץ ב-c4 הוא מה שמאיים על f7 — חסום אותו עם d5.',
            bestArrow: ['d7', 'd5'],
          },
          {
            id: 'oren-3-d2',
            fen: 'r1bqkb1r/ppp2ppp/2n2n2/3Pp1N1/2B5/8/PPPP1PPP/RNBQK2R b KQkq - 0 5',
            playerSide: 'black',
            promptHe: 'אחרי exd5 — זהירות לא לקחת עם הפרש (Nxd5 נכנס ל-Nxf7!). שחק Na5 לתקוף את הרץ!',
            acceptedUci: ['c6a5', 'b7b5', 'c6d4'],
            botReplyUci: 'c4b5',
            successHe: 'אלוף! Na5 תוקף את הרץ המסוכן ומונע את ההקרבה ב-f7.',
            mistakeHintHe: 'אל תיקח Nxd5 — זה מכניס אותך למלכודת Nxf7! קפוץ עם הפרש ל-a5 (Na5).',
            bestArrow: ['c6', 'a5'],
          },
          {
            id: 'oren-3-d3',
            fen: 'r1bqkb1r/ppp2ppp/5n2/nB1Pp1N1/8/8/PPPP1PPP/RNBQK2R b KQkq - 2 6',
            playerSide: 'black',
            promptHe: 'הרץ נתן שח ב-b5 — חסום עם רגלי c6!',
            acceptedUci: ['c7c6'],
            botReplyUci: 'd5c6',
            successHe: 'שליטה מוחלטת בהגנה! אתה יוצא עם יוזמה מצוינת.',
            mistakeHintHe: 'c6 חוסם את השח וממשיך ללחוץ על המרכז.',
            bestArrow: ['c7', 'c6'],
          },
        ],
        sparringFen: 'r1bqkb1r/pp3ppp/2p2n2/nB1Pp1N1/8/8/PPPP1PPP/RNBQK2R w KQkq - 0 7',
        sparringGoalHe: 'שחק 4 מהלכים נקיים מול בוט אורן מעמדת ההגנה.',
        sparringMovesTarget: 4,
        dnaFollowUpHe: 'מעקב DNA: ירידה בהפסדי פתיחה במשחקים מול 1.e4.',
      },
      {
        id: 'oren-4-punish-early-errors',
        titleHe: 'שיעור 4: להעניש מהלכים פסיביים של היריב',
        subtitleHe: 'לתפוס את המרכז עם שני רגלים',
        inspectFen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
        playerSide: 'white',
        inspectArrows: [
          { from: 'd2', to: 'd4', who: 'me' },
        ],
        inspectExplanationHe: 'הבוט שלך מסביר: כשהיריב משחק מהלכי אגף איטיים כמו a6 או h6, אל תחקה אותו — כבוש מיד את המרכז עם d4 ופתח כלים!',
        drills: [
          {
            id: 'oren-4-d1',
            fen: 'rnbqkbnr/1ppppppp/p7/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
            playerSide: 'white',
            promptHe: 'השחור בזבז זמן על 1...a6! תפוס את המרכז המלא עם הרגלי השני.',
            acceptedUci: ['d2d4'],
            botReplyUci: 'h7h6',
            successHe: 'מושלם! צמד רגלים e4+d4 נותן שליטה מרכזית מלאה.',
            mistakeHintHe: 'כשהיריב מוותר על המרכז, תפוס אותו מיד עם d4.',
            bestArrow: ['d2', 'd4'],
          },
          {
            id: 'oren-4-d2',
            fen: 'rnbqkbnr/1pppppp1/p6p/8/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3',
            playerSide: 'white',
            promptHe: 'עכשיו פתח פרש למרכז (Nf3 או Nc3).',
            acceptedUci: ['g1f3', 'b1c3'],
            botReplyUci: 'b7b6',
            successHe: 'מהיר, נקי, ולוחץ על כל הלוח.',
            mistakeHintHe: 'פתח פרש ל-f3 או c3 — לא שוליים.',
            bestArrow: ['g1', 'f3'],
          },
          {
            id: 'oren-4-d3',
            fen: 'rnbqkbnr/2ppppp1/pp5p/8/3PP3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 4',
            playerSide: 'white',
            promptHe: 'פתח את הרץ ל-c4 או d3 והתכונן להצרחה.',
            acceptedUci: ['f1c4', 'f1d3', 'b1c3'],
            botReplyUci: 'c8b7',
            successHe: 'פתיחה של 100% דיוק — המלך מוכן להצריח והכלים אקטיביים.',
            mistakeHintHe: 'Bd3 או Bc4 מפתחים את הרץ ומכינים הצרחה.',
            bestArrow: ['f1', 'd3'],
          },
        ],
        sparringFen: 'rn1qkbnr/1bppppp1/pp5p/8/3PP3/3B1N2/PPP2PPP/RNBQK2R w KQkq - 1 5',
        sparringGoalHe: 'שחק 4 מהלכים מנצחים מעמדת יתרון פיתוח מול בוט אורן.',
        sparringMovesTarget: 4,
        dnaFollowUpHe: 'מעקב DNA: שיפור דיוק ממוצע ב-10 המהלכים הראשונים.',
      },
    ],
  },
  {
    id: 'clock-calm-decisions',
    titleHe: 'קבלת החלטות תחת שעון ומניעת טילט',
    themeHe: 'שליטה בשעון וקור רוח',
    teacherBotId: 'karpov',
    teacherNameHe: 'אנטולי קרפוב (Anatoly Karpov)',
    teacherRoleHe: 'מאמן שקט פוזיציוני, מניעת סיכונים וניהול זמן',
    teacherPiece: '♗',
    followUpMetricHe: 'מעקב DNA: ירידה בהפסדים מתחת ל-60 שניות ובסשני טילט ב-5 המשחקים הבאים',
    lessons: [
      {
        id: 'karpov-1-safe-move-under-clock',
        titleHe: 'שיעור 1: מהלך בטוח ומיידי מתחת ל-30 שניות',
        subtitleHe: 'בלי הקרבות מסובכות כשאין זמן על השעון',
        inspectFen: 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7',
        playerSide: 'white',
        inspectArrows: [
          { from: 'h2', to: 'h3', who: 'me' },
          { from: 'c1', to: 'e3', who: 'me', faded: true },
        ],
        inspectExplanationHe: 'קרפוב מסביר: בלחץ זמן, אל תחפש קומבינציה של 6 מהלכים. שחק מהלך שמשפר עמדה, סוגר איומים ושומר על השעון (כמו Be3 או h3).',
        drills: [
          {
            id: 'karpov-1-d1',
            fen: 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7',
            playerSide: 'white',
            promptHe: 'נותרו לך 25 שניות — בחר מהלך סולידי שמונע Bg4 ומחבר צריחים (h3 או Be3).',
            acceptedUci: ['h2h3', 'c1e3', 'c1g5'],
            botReplyUci: 'c8e6',
            successHe: 'קור רוח של אלוף! מהלך מהיר, בטוח, בלי שום חור.',
            mistakeHintHe: 'בלחץ זמן בחר את המהלך הפשוט והבטוח ביותר: h3 או Be3.',
            bestArrow: ['h2', 'h3'],
          },
          {
            id: 'karpov-1-d2',
            fen: 'r2q1rk1/ppp2ppp/2npbn2/2b1p3/2B1P3/2NP1N1P/PPP2PP1/R1BQ1RK1 w - - 1 8',
            playerSide: 'white',
            promptHe: 'השחור מציע החלפת רצים ב-c4 — החלף בשקט עם Bxe6 או חזור ל-b3.',
            acceptedUci: ['c4e6', 'c4b3'],
            botReplyUci: 'f7e6',
            successHe: 'שקט ויעיל — לא איבדת זמן ולא נתת לשחור תרגיל.',
            mistakeHintHe: 'Bb3 שומר על הרץ בטוח, או Bxe6 יוצר רגלים כפולים לשחור.',
            bestArrow: ['c4', 'b3'],
          },
          {
            id: 'karpov-1-d3',
            fen: 'r2q1rk1/ppp3pp/2nppn2/2b5/4P3/2NP1N1P/PPP2PP1/R1BQ1RK1 w - - 0 9',
            playerSide: 'white',
            promptHe: 'השלם פיתוח וחבר את הצריחים (Be3 או Qe2).',
            acceptedUci: ['c1e3', 'd1e2', 'c3a4'],
            botReplyUci: 'c5b6',
            successHe: 'כל הכלים שלך מוגנים ומשתפים פעולה!',
            mistakeHintHe: 'Be3 מציע החלפה נוחה ומפתח את הכלי האחרון.',
            bestArrow: ['c1', 'e3'],
          },
        ],
        sparringFen: 'r2q1rk1/ppp3pp/1bnppn2/8/4P3/2NPBN1P/PPP2PP1/R2Q1RK1 w - - 2 10',
        sparringGoalHe: 'שחק 4 מהלכים רגועים ומאובטחים מול קרפוב.',
        sparringMovesTarget: 4,
        dnaFollowUpHe: 'מעקב DNA: ירידה בשיעור ההפסדים מתחת ל-60 שניות.',
      },
      {
        id: 'karpov-2-stop-counterplay',
        titleHe: 'שיעור 2: לכבות את המשחק הנגדי של היריב',
        subtitleHe: 'קודם שואלים "מה היריב מאיים?"',
        inspectFen: 'r4rk1/ppp2ppp/2n5/3q4/3P4/2P2N2/PP3PPP/R2Q1RK1 w - - 0 12',
        playerSide: 'white',
        inspectArrows: [
          { from: 'd1', to: 'b3', who: 'me' },
          { from: 'd5', to: 'a2', who: 'opp' },
        ],
        inspectExplanationHe: 'קרפוב מסביר: לפני התוכנית שלך, בדוק מה היריב מאיים. כאן Qb3 גם מגן על a2 וגם מכריח החלפת מלכות נוחה.',
        drills: [
          {
            id: 'karpov-2-d1',
            fen: 'r4rk1/ppp2ppp/2n5/3q4/3P4/2P2N2/PP3PPP/R2Q1RK1 w - - 0 12',
            playerSide: 'white',
            promptHe: 'נטרל את המלכה האקטיבית של השחור ב-d5!',
            acceptedUci: ['d1b3', 'f1e1'],
            botReplyUci: 'd5b3',
            successHe: 'מדויק! Qb3 סוגר כל סיכון ומשפר את מבנה הרגלים.',
            mistakeHintHe: 'Qb3 מאתגר את המלכה המרכזית ומגן על אגף המלכה.',
            bestArrow: ['d1', 'b3'],
          },
          {
            id: 'karpov-2-d2',
            fen: 'r4rk1/ppp2ppp/2n5/8/3P4/1qP2N2/PP3PPP/R4RK1 w - - 0 13',
            playerSide: 'white',
            promptHe: 'הכה חזרה עם רגלי a כדי לפתוח טור a לצריח!',
            acceptedUci: ['a2b3'],
            botReplyUci: 'f8e8',
            successHe: 'עקרון פוזיציוני קלאסי — טור a פתוח לצריח שלך.',
            mistakeHintHe: 'המלכה השחורה ב-b3 — הכה axb3.',
            bestArrow: ['a2', 'b3'],
          },
          {
            id: 'karpov-2-d3',
            fen: 'r3r1k1/ppp2ppp/2n5/8/3P4/1PP2N2/1P3PPP/R4RK1 w - - 1 14',
            playerSide: 'white',
            promptHe: 'תפוס את הטור הפתוח עם הצריח שלך (Rfe1).',
            acceptedUci: ['f1e1', 'a1e1'],
            botReplyUci: 'e8e1',
            successHe: 'שליטה מוחלטת בטור e — היריב משותק.',
            mistakeHintHe: 'אל תיתן ליריב לשלוט לבד בטור e — הרם צריח ל-e1.',
            bestArrow: ['f1', 'e1'],
          },
        ],
        sparringFen: 'r5k1/ppp2ppp/2n5/8/3P4/1PP2N2/1P3PPP/4R1K1 w - - 0 15',
        sparringGoalHe: 'שחק 4 מהלכים פוזיציוניים רגועים מול קרפוב.',
        sparringMovesTarget: 4,
        dnaFollowUpHe: 'מעקב DNA: ירידה בטעויות מחוסר תשומת לב לאיום היריב.',
      },
      {
        id: 'karpov-3-anti-tilt-reset',
        titleHe: 'שיעור 3: איפוס מנטלי אחרי טעות באמצע משחק',
        subtitleHe: 'לא לאבד עשתונות גם כשאיבדת רגלי',
        inspectFen: 'r2q1rk1/ppp2ppp/2n2n2/3p4/3P4/2NB1N2/PPP2PPP/R1BQ1RK1 w - - 0 9',
        playerSide: 'white',
        inspectArrows: [
          { from: 'f1', to: 'e1', who: 'me' },
        ],
        inspectExplanationHe: 'קרפוב מסביר: רוב ההפסדים בטילט קורים לא בגלל הטעות הראשונה — אלא בגלל הפאניקה שבאה מהלך אחד אחריה. חזור לשפר את הכלי הכי פחות פעיל שלך.',
        drills: [
          {
            id: 'karpov-3-d1',
            fen: 'r2q1rk1/ppp2ppp/2n2n2/3p4/3P4/2NB1N2/PPP2PPP/R1BQ1RK1 w - - 0 9',
            playerSide: 'white',
            promptHe: 'שפר את הכלי הכי לא פעיל שלך — הצריח ב-f1!',
            acceptedUci: ['f1e1', 'c1g5', 'h2h3'],
            botReplyUci: 'f8e8',
            successHe: 'בדיוק! כשלא בטוחים — משפרים את הצריח לטור הפתוח.',
            mistakeHintHe: 'טור e חצי-פתוח — Re1 הוא תמיד מהלך משפר ורגוע.',
            bestArrow: ['f1', 'e1'],
          },
          {
            id: 'karpov-3-d2',
            fen: 'r2qr1k1/ppp2ppp/2n2n2/3p4/3P4/2NB1N2/PPP2PPP/R1BQR1K1 w - - 2 10',
            playerSide: 'white',
            promptHe: 'השווה שליטה בטור הפתוח או המשך לפתח את הרץ האחרון (Bg5 / Bf4 / Rxe8+).',
            acceptedUci: ['e1e8', 'c1g5', 'c1f4'],
            botReplyUci: 'd8e8',
            successHe: 'מאוזן ונקי — אפס פאניקה.',
            mistakeHintHe: 'Rxe8+ או Bg5 שומרים על שוויון מלא ושקט.',
            bestArrow: ['c1', 'g5'],
          },
          {
            id: 'karpov-3-d3',
            fen: 'r3q1k1/ppp2ppp/2n2n2/3p4/3P4/2NB1N2/PPP2PPP/R1BQ2K1 w - - 0 11',
            playerSide: 'white',
            promptHe: 'הכנס את הצריח האחרון למשחק או חבר כלים (Qd2 / Bf4).',
            acceptedUci: ['d1d2', 'c1f4', 'c1g5'],
            botReplyUci: 'e8d7',
            successHe: 'כל הכלים שלך במשחק — ככה מתאוששים מכל מצב!',
            mistakeHintHe: 'Qd2 או Bf4 מחברים את הצריח האחרון ב-a1.',
            bestArrow: ['d1', 'd2'],
          },
        ],
        sparringFen: 'r5k1/pppq1ppp/2n2n2/3p4/3P4/2NB1N2/PPPQ1PPP/R5K1 w - - 2 12',
        sparringGoalHe: 'שחק 4 מהלכים רגועים ומחושבים מול קרפוב.',
        sparringMovesTarget: 4,
        dnaFollowUpHe: 'מעקב DNA: ירידה ברצפי הפסדים (טילט) בסשנים הבאים.',
      },
      {
        id: 'karpov-4-prophylaxis-endgame',
        titleHe: 'שיעור 4: לא למהר כשיש יתרון על הלוח והשעון',
        subtitleHe: 'שליטה בקצב המשחק',
        inspectFen: '2r3k1/pp3ppp/8/3P4/8/8/PP3PPP/2R3K1 w - - 0 1',
        playerSide: 'white',
        inspectArrows: [
          { from: 'c1', to: 'c8', who: 'me' },
        ],
        inspectExplanationHe: 'קרפוב מסביר: כשיש לך רגלי חופשי וגם אפשרות להחליף צריחים בשח — קח את הנתיב הכי נקי שמכבה את כל האיומים של היריב.',
        drills: [
          {
            id: 'karpov-4-d1',
            fen: '2r3k1/pp3ppp/8/3P4/8/8/PP3PPP/2R3K1 w - - 0 1',
            playerSide: 'white',
            promptHe: 'החלף צריחים עם שח — השחור חייב להגיב!',
            acceptedUci: ['c1c8'],
            successHe: 'מט שורה אחורית מיידי! Rxc8# — בדיקת שחים חסכה לך 20 מהלכים.',
            mistakeHintHe: 'בדוק שחים — Rxc8# הוא מט מיידי!',
            bestArrow: ['c1', 'c8'],
          },
          {
            id: 'karpov-4-d2',
            fen: '2r3k1/pp3pp1/7p/3P4/8/7P/PP3PP1/2R3K1 w - - 0 1',
            playerSide: 'white',
            promptHe: 'כאן לשחור יש חלון ב-h6 — עדיין Rxc8+ מחליף את הצריח האחרון או מאיים בשורה השמינית!',
            acceptedUci: ['c1c8'],
            botReplyUci: 'g8h7',
            successHe: 'פשוט וחכם! אחרי Rxc8+ אתה ביתרון מכריע.',
            mistakeHintHe: 'Rxc8+ זוכה בצריח השחור כי הוא לא מוגן!',
            bestArrow: ['c1', 'c8'],
          },
          {
            id: 'karpov-4-d3',
            fen: '2R5/pp3ppk/7p/3P4/8/7P/PP3PP1/6K1 w - - 1 2',
            playerSide: 'white',
            promptHe: 'קדם את הרגלי החופשי d5 לעבר ההכתרה!',
            acceptedUci: ['d5d6'],
            botReplyUci: 'h7g6',
            successHe: 'המרה נקייה ורגועה עד הסוף!',
            mistakeHintHe: 'דחוף את הרגלי החופשי ל-d6 — הצריח ב-c8 כבר מוכן לשמור עליו.',
            bestArrow: ['d5', 'd6'],
          },
        ],
        sparringFen: '2R5/pp3ppk/3P3p/8/8/7P/PP3PP1/6K1 b - - 0 2',
        sparringGoalHe: 'סגור את הניצחון מול קרפוב ב-3 מהלכים נקיים.',
        sparringMovesTarget: 3,
        dnaFollowUpHe: 'מעקב DNA: ירידה בבלנדרים בשלב הסיום תחת שעון.',
      },
    ],
  },
];

/** Dynamically builds & prioritizes personalized 4-lesson bot courses from DNA + Tilt/Clock signals. */

const COURSE_TO_WEAKNESS: Record<string, WeaknessCategoryId> = {
  'hanging-pieces-tactics': 'hanging-pieces-tactics',
  'endgame-conversion': 'endgame-conversion',
  'opening-traps-control': 'opening-traps-personal',
  'clock-calm-decisions': 'clock-tilt-discipline',
};

const TEACHER_CONTRIBUTION_HE: Record<string, string> = {
  'hanging-pieces-tactics': 'טל מאמן ראיית כלים תלויים, מזלגות והגנה אקטיבית על הלוח.',
  'endgame-conversion': 'קפבלנקה מאמן המרת יתרון, קידום מלך וסגירת מט נקי בלי פט.',
  'opening-traps-control': 'בוט אורן מתרגל מלכודות פתיחה והחלטות פתיחה מהרפרטואר האישי.',
  'clock-calm-decisions': 'קרפוב מאמן בחירות שקטות, מניעת פזיזות ויציבות תחת לחץ שעון.',
};

const PIECE_VALUES: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

export function evaluateMaterialForSide(fen: string, side: 'white' | 'black'): number {
  const board = String(fen || '').split(' ')[0] || '';
  let white = 0;
  let black = 0;
  for (const ch of board) {
    const lower = ch.toLowerCase();
    const val = PIECE_VALUES[lower];
    if (!val) continue;
    if (ch === lower) black += val;
    else white += val;
  }
  return side === 'white' ? white - black : black - white;
}

function validateFenAndMove(fen: string, moveUci: string, ChessCtor: any): { legal: boolean; san: string; nextFen: string } {
  if (!ChessCtor || !fen || !moveUci) return { legal: false, san: '', nextFen: fen };
  try {
    const g = new ChessCtor(fen);
    const mv = g.move({ from: moveUci.slice(0, 2), to: moveUci.slice(2, 4), promotion: moveUci.slice(4) || undefined });
    if (!mv) return { legal: false, san: '', nextFen: fen };
    return { legal: true, san: mv.san || moveUci, nextFen: g.fen() };
  } catch {
    return { legal: false, san: '', nextFen: fen };
  }
}

/** Builds a hybrid personal lesson anchored on a real verified mistake from the player's own games. */
function buildPersonalMistakeLesson(
  mistake: PersonalMistakeRecord,
  templateCourse: Omit<BotCourse, 'priorityScore' | 'dnaReasonHe' | 'dnaMetricTagHe'>,
  weaknessCount: number,
  ChessCtor: any
): CourseLesson | null {
  const bestCheck = validateFenAndMove(mistake.fen, mistake.bestUci, ChessCtor);
  if (!bestCheck.legal) return null;
  const playedFrom = mistake.playedUci.slice(0, 2);
  const playedTo = mistake.playedUci.slice(2, 4);
  const bestFrom = mistake.bestUci.slice(0, 2);
  const bestTo = mistake.bestUci.slice(2, 4);

  const isRecurring = weaknessCount >= 2;
  const originKind: LessonOriginKind = isRecurring ? 'recurring-weakness' : 'real-game-mistake';
  const originBadgeHe = isRecurring ? `חולשה חוזרת (${weaknessCount} מופעים)` : 'מטעות במשחק שלך';

  // Pair Drill #1 (the player's exact real mistake!) with 2 targeted template drills from the same weakness theme.
  const templateDrills = (templateCourse.lessons[0]?.drills || []).slice(0, 2);
  const personalDrill: CourseDrill = {
    id: `personal-drill-${mistake.id.replace(/[^a-z0-9_-]/gi, '').slice(-14)}`,
    fen: mistake.fen,
    playerSide: mistake.playerSide,
    promptHe: `מעמדה אמיתית במשחק שלך (${mistake.gameDate}): שיחקת ${mistake.playedSan || mistake.playedUci}. מצא את המהלך המדויק יותר!`,
    acceptedUci: [mistake.bestUci, `${bestFrom}${bestTo}`],
    successHe: `מדויק! ${bestCheck.san} מתקן את הטעות מהמשחק שלך במקום ${mistake.playedSan || mistake.playedUci}.`,
    mistakeHintHe: `במשחק המקורי ${mistake.playedSan || mistake.playedUci} איבד יתרון (${Math.round(mistake.dropCp)} cp). חפש את המהלך ${bestCheck.san} (מסומן בחץ).`,
    bestArrow: [bestFrom, bestTo],
  };

  const goalKind: SparringGoalKind =
    mistake.weaknessTag === 'endgame-conversion'
      ? 'convert-advantage'
      : mistake.weaknessTag === 'clock-tilt-discipline'
      ? 'clean-defense'
      : 'keep-material';

  return {
    id: `personal-${mistake.weaknessTag}-${mistake.id.replace(/[^a-z0-9_-]/gi, '').slice(-12)}`,
    titleHe: `תיקון טעות אמיתית מהמשחק שלך (${mistake.playedSan || mistake.playedUci} → ${bestCheck.san})`,
    subtitleHe: mistake.sourceLabelHe,
    inspectFen: mistake.fen,
    playerSide: mistake.playerSide,
    inspectArrows: [
      { from: playedFrom, to: playedTo, who: 'me', mistake: true },
      { from: bestFrom, to: bestTo, who: 'me' },
    ],
    inspectExplanationHe: `${mistake.sourceLabelHe}. ${isRecurring ? `הדפוס הזה הופיע אצלך ${weaknessCount} פעמים ולכן סומן כחולשה חוזרת.` : 'זו טעות מתועדת מהמשחק שלך — תרגול מיידי מונע ממנה להפוך להרגל.'} ${TEACHER_CONTRIBUTION_HE[templateCourse.id] || ''}`,
    drills: [personalDrill, ...templateDrills],
    sparringFen: bestCheck.nextFen,
    sparringGoalHe:
      goalKind === 'convert-advantage'
        ? 'שמור והמר את היתרון מעמדת המשחק שלך בלי לאבד חומר (3 מהלכים נקיים או מט).'
        : 'שמור על הכלים ועל היציבות מעמדת התיקון של המשחק שלך בלי ליפול לטעות חומרית (3 מהלכים נקיים).',
    sparringMovesTarget: 3,
    sparringGoalKind: goalKind,
    dnaFollowUpHe: 'נמדד אוטומטית ב-5 המשחקים הבאים בסקירת ה-DNA מול אותו דפוס טעות.',
    originKind,
    originBadgeHe,
    selectionReasonHe: isRecurring
      ? `נבחר עקב חולשה חוזרת (${weaknessCount} מופעים בסקירות ה-DNA שלך)`
      : `נבחר ישירות מתוך טעות במשחק שלך (${mistake.gameDate})`,
    sourceGameLabelHe: mistake.sourceLabelHe,
    weaknessTag: mistake.weaknessTag,
  };
}

/**
 * Builds hybrid personalized courses from the SAME shared DNA + personal bot profile.
 * - Injects real mistake lessons from the player's own games (even with < 5 games!).
 * - Badges "חולשה חוזרת" ONLY when >= 2 real occurrences exist in that weakness category.
 * - Keeps base lessons transparently badged as "אימון בסיס" when no personal mistake exists yet.
 */
export function buildPersonalizedBotCourses(input: {
  dnaReport?: any;
  tiltReport?: TiltClockReport | null;
  bots?: any[];
  evolutionState?: UserEvolutionState | null;
  personalMistakes?: PersonalMistakeRecord[];
  ChessCtor?: any;
}): BotCourse[] {
  const dna = input.dnaReport || null;
  const tilt = input.tiltReport || null;
  const evo = input.evolutionState || null;
  const ChessCtor = input.ChessCtor || (globalThis as any).ChessLib?.Chess;

  const mistakes: PersonalMistakeRecord[] = Array.isArray(input.personalMistakes)
    ? input.personalMistakes
    : Array.isArray(evo?.personalMistakes)
    ? evo!.personalMistakes
    : [];

  const weaknessCounts: Record<WeaknessCategoryId, number> = {
    'hanging-pieces-tactics': evo?.weaknessCounts?.['hanging-pieces-tactics'] || 0,
    'endgame-conversion': evo?.weaknessCounts?.['endgame-conversion'] || 0,
    'opening-traps-personal': evo?.weaknessCounts?.['opening-traps-personal'] || 0,
    'clock-tilt-discipline': evo?.weaknessCounts?.['clock-tilt-discipline'] || 0,
  };
  if (!evo && mistakes.length > 0) {
    for (const m of mistakes) weaknessCounts[m.weaknessTag] = (weaknessCounts[m.weaknessTag] || 0) + 1;
  }

  const tc = dna?.timeControls || {};
  const buckets = ['rapid', 'blitz', 'bullet'].map(k => tc[k]).filter(Boolean);
  let blunderRate = 0;
  let missRate = 0;
  let lowTimeRate = 0;
  let totalGames = evo?.personalBot?.analyzedGamesCount || 0;
  for (const b of buckets) {
    const cnt = Number(b.count || 0);
    if (cnt > 0) {
      totalGames = Math.max(totalGames, cnt);
      blunderRate = Math.max(blunderRate, Number(b.issueRatesPer100Moves?.blunder || 0));
      missRate = Math.max(missRate, Number(b.issueRatesPer100Moves?.miss || 0));
      lowTimeRate = Math.max(lowTimeRate, Number(b.clock?.lowTimeRatePer100Moves || 0));
    }
  }

  const tiltHigh = tilt?.tilt?.severity === 'high' || tilt?.tilt?.severity === 'moderate';
  const clockPressureHigh =
    (tilt?.clock?.lowClockLossRate != null && tilt.clock.lowClockLossRate >= 55) ||
    (tilt?.clock?.timeoutsCount ?? 0) >= 2 ||
    lowTimeRate >= 15;

  const personalBotVersion = evo?.personalBot?.active?.version || null;

  const courses: BotCourse[] = BASE_COURSES.map(c => {
    const weaknessTag = COURSE_TO_WEAKNESS[c.id] || 'hanging-pieces-tactics';
    const matchingMistakes = mistakes.filter(m => m.weaknessTag === weaknessTag);
    const occurrenceCount = Math.max(weaknessCounts[weaknessTag] || 0, matchingMistakes.length);
    const isRecurring = occurrenceCount >= 2;

    let priorityScore = 50;
    let dnaReasonHe = 'אימון בסיס מומלץ לחיזוק היסודות (הרץ סקירת DNA כדי לשלב עמדות מהמשחקים שלך).';
    let dnaMetricTagHe = 'אימון בסיס';
    let personalSignalHe = totalGames > 0
      ? `מחובר לפרופיל ה-DNA שלך (${totalGames} משחקים${personalBotVersion ? ` · בוט ${personalBotVersion}` : ''}).`
      : 'עדיין ללא סקירת DNA אישית — מוצג מסלול בסיס.';

    if (c.id === 'hanging-pieces-tactics') {
      priorityScore = occurrenceCount > 0 ? 94 + Math.min(5, occurrenceCount) : blunderRate >= 6 ? 95 : totalGames > 0 ? 84 : 88;
      dnaReasonHe = isRecurring
        ? `חולשה חוזרת ב-DNA (${occurrenceCount} טעויות כלים/טקטיקה במשחקים שלך) — טל בנה שיעור שפותח ישירות בעמדה שלך.`
        : matchingMistakes.length === 1
        ? `זוהתה טעות טקטית אמיתית במשחק שלך — השיעור הראשון נבנה ישירות סביבה.`
        : blunderRate > 0
        ? `זוהה ב-DNA: ${blunderRate.toFixed(1)} שגיאות גסות ל-100 מהלכים — טל מאמן אותך לעצור כלים תלויים.`
        : 'אימון בסיס מומלץ: צמצום כלים תלויים ומזלגות מקפיץ דירוג הכי מהר.';
      dnaMetricTagHe = isRecurring ? `חולשה חוזרת (${occurrenceCount})` : matchingMistakes.length === 1 ? 'מטעות במשחק שלך' : blunderRate > 0 ? `${blunderRate.toFixed(1)} בלנדרים/100` : 'אימון בסיס · טקטיקה';
    } else if (c.id === 'clock-calm-decisions') {
      priorityScore = tiltHigh || clockPressureHigh ? 93 : occurrenceCount > 0 ? 89 : 68;
      dnaReasonHe = tiltHigh
        ? `זוהה ברדאר טילט: ${tilt!.tilt.tiltSessionsCount} סשני טילט — קרפוב מלמד שליטה ושקט תחת לחץ.`
        : clockPressureHigh
        ? `זוהה ברדאר שעון: לחץ זמן פוגע באחוז הניצחון — קרפוב מאמן בחירות בטוחות מתחת לדקה.`
        : matchingMistakes.length > 0
        ? `טעות בלחץ זמן מהמשחק שלך שולבה כשיעור הפתיחה.`
        : 'אימון בסיס למניעת טילט והחלטות נקיות בשעון נמוך.';
      dnaMetricTagHe = isRecurring ? `חולשה חוזרת (${occurrenceCount})` : tiltHigh ? `טילט: ${tilt!.tilt.tiltSessionsCount} סשנים` : clockPressureHigh ? 'לחץ שעון גבוה' : 'אימון בסיס · שעון';
    } else if (c.id === 'endgame-conversion') {
      priorityScore = occurrenceCount > 0 ? 92 + Math.min(4, occurrenceCount) : missRate >= 4 ? 88 : 78;
      dnaReasonHe = isRecurring
        ? `חולשה חוזרת בסיומים (${occurrenceCount} מופעים במשחקים שלך) — קפבלנקה פותח ישירות מעמדת הסיום שלך.`
        : matchingMistakes.length === 1
        ? `זוהתה טעות סיום במשחק שלך — קפבלנקה בנה שיעור תיקון סביבה.`
        : missRate > 0
        ? `זוהה ב-DNA: ${missRate.toFixed(1)} פספוסי ניצחון ל-100 מהלכים — קפבלנקה מלמד להמיר יתרון.`
        : 'אימון בסיס: קפבלנקה מלמד להמיר יתרון חומרי למט נקי בלי ליפול לפט.';
      dnaMetricTagHe = isRecurring ? `חולשה חוזרת (${occurrenceCount})` : matchingMistakes.length === 1 ? 'מטעות במשחק שלך' : missRate > 0 ? `${missRate.toFixed(1)} פספוסים/100` : 'אימון בסיס · סיומים';
    } else if (c.id === 'opening-traps-control') {
      priorityScore = occurrenceCount > 0 ? 91 + Math.min(4, occurrenceCount) : 82;
      dnaReasonHe = isRecurring
        ? `חולשה חוזרת בפתיחות (${occurrenceCount} טעויות פתיחה במשחקים שלך) — הבוט מתרגל אותן ישירות מהעמדות שלך.`
        : matchingMistakes.length === 1
        ? `טעות פתיחה ממשחק שלך שולבה כשיעור הפתיחה.`
        : 'אימון בסיס על מלכודות פתיחה נפוצות ופיתוח מרכזי נקי.';
      dnaMetricTagHe = isRecurring ? `חולשה חוזרת (${occurrenceCount})` : matchingMistakes.length === 1 ? 'מטעות במשחק שלך' : 'אימון בסיס · פתיחות';
    }

    const baseLessons: CourseLesson[] = c.lessons.map(l => ({
      ...l,
      weaknessTag,
      originKind: 'base-training' as LessonOriginKind,
      originBadgeHe: 'אימון בסיס',
      selectionReasonHe: l.subtitleHe,
      sparringGoalKind:
        c.id === 'endgame-conversion'
          ? (l.id.includes('mate') ? 'deliver-mate' : 'convert-advantage')
          : c.id === 'clock-calm-decisions'
          ? 'clean-defense'
          : 'keep-material',
    }));

    // Hybrid real-mistake injection: if the player has a real verified mistake for this weakness,
    // prepend it as Lesson #1 (even if they played fewer than 5 games!).
    let lessons = baseLessons;
    if (matchingMistakes.length > 0 && ChessCtor) {
      const injected = buildPersonalMistakeLesson(matchingMistakes[0], c, occurrenceCount, ChessCtor);
      if (injected) {
        lessons = [injected, ...baseLessons.slice(0, 3)];
      }
    }

    return {
      ...c,
      priorityScore,
      dnaReasonHe,
      dnaMetricTagHe,
      weaknessTag,
      teacherContributionHe: TEACHER_CONTRIBUTION_HE[c.id] || c.teacherRoleHe,
      personalSignalHe,
      lessons,
    };
  });

  courses.sort((a, b) => b.priorityScore - a.priorityScore);
  return courses;
}

/** Pure drill evaluator: validates legality and returns immediate Hebrew feedback + optional bot reply FEN. */
export function evaluateDrillMove(
  drill: CourseDrill,
  moveUci: string,
  ChessCtor: any
): {
  legal: boolean;
  correct: boolean;
  feedbackHe: string;
  nextFen: string;
  replySan: string | null;
  arrows: BoardArrow[];
} {
  const from = moveUci.slice(0, 2);
  const to = moveUci.slice(2, 4);
  const promotion = moveUci.length > 4 ? moveUci.slice(4) : undefined;
  const game = new ChessCtor(drill.fen);
  let played: any = null;
  try {
    played = game.move({ from, to, promotion: promotion || undefined });
  } catch {
    played = null;
  }
  if (!played) {
    return {
      legal: false,
      correct: false,
      feedbackHe: 'מהלך לא חוקי בעמדה הזו.',
      nextFen: drill.fen,
      replySan: null,
      arrows: [],
    };
  }

  const normalizedPlayed = `${played.from}${played.to}${played.promotion || ''}`;
  const isCorrect = drill.acceptedUci.some(acc => acc === normalizedPlayed || acc === `${played.from}${played.to}`);

  if (!isCorrect) {
    return {
      legal: true,
      correct: false,
      feedbackHe: `עצירה מהמאמן: ${drill.mistakeHintHe}`,
      nextFen: drill.fen,
      replySan: null,
      arrows: [
        { from: played.from, to: played.to, who: 'me', mistake: true },
        { from: drill.bestArrow[0], to: drill.bestArrow[1], who: 'me' },
      ],
    };
  }

  let replySan: string | null = null;
  const arrows: BoardArrow[] = [{ from: played.from, to: played.to, who: 'me' }];
  if (drill.botReplyUci && !game.isGameOver?.() && !game.isCheckmate?.()) {
    try {
      const rf = drill.botReplyUci.slice(0, 2);
      const rt = drill.botReplyUci.slice(2, 4);
      const rp = drill.botReplyUci.length > 4 ? drill.botReplyUci.slice(4) : undefined;
      const rep = game.move({ from: rf, to: rt, promotion: rp || undefined });
      if (rep) {
        replySan = rep.san;
        arrows.push({ from: rep.from, to: rep.to, who: 'opp' });
      }
    } catch {}
  }

  return {
    legal: true,
    correct: true,
    feedbackHe: drill.successHe + (replySan ? ` (תשובת המאמן: ${replySan})` : ''),
    nextFen: game.fen(),
    replySan,
    arrows,
  };
}

/** Chooses a sensible legal teacher response using MIT tactical heuristics (captures, checks, safe development). */
export function pickTeacherSparringReply(game: any): any | null {
  const legal: any[] = game.moves({ verbose: true }) || [];
  if (!legal.length) return null;
  let best = legal[0];
  let bestScore = -1e9;
  const center = new Set(['d4', 'e4', 'd5', 'e5']);
  for (const mv of legal) {
    let sc = 0;
    if (mv.san?.includes('#')) sc += 10000;
    if (mv.captured) sc += (PIECE_VALUES[mv.captured] || 100) * 1.2 - (PIECE_VALUES[mv.piece] || 100) * 0.25;
    if (mv.san?.includes('+')) sc += 40;
    if (mv.promotion) sc += 700;
    if (center.has(mv.to)) sc += 25;
    if (sc > bestScore) { bestScore = sc; best = mv; }
  }
  return best;
}

/**
 * Initializes a sparring position for either White or Black.
 * If it is currently the teacher bot's turn (as in oren-2, oren-3, karpov-4, or post-correction FENs),
 * the teacher automatically plays its opening move so it is immediately the player's turn!
 */
export function initSparringPosition(
  sparringFen: string,
  playerSide: 'white' | 'black',
  teacherNameHe: string,
  ChessCtor: any
): {
  fen: string;
  baselineMaterial: number;
  botOpeningSan: string | null;
  botOpeningArrow: BoardArrow | null;
  feedbackHe: string;
} {
  const game = new ChessCtor(sparringFen);
  const playerChar = playerSide === 'black' ? 'b' : 'w';
  let botOpeningSan: string | null = null;
  let botOpeningArrow: BoardArrow | null = null;

  if (game.turn() !== playerChar && !game.isGameOver?.()) {
    const reply = pickTeacherSparringReply(game);
    if (reply) {
      const mv = game.move({ from: reply.from, to: reply.to, promotion: reply.promotion || undefined });
      if (mv) {
        botOpeningSan = mv.san;
        botOpeningArrow = { from: mv.from, to: mv.to, who: 'opp' };
      }
    }
  }

  const readyFen = game.fen();
  const baselineMaterial = evaluateMaterialForSide(readyFen, playerSide);
  const shortTeacher = teacherNameHe.split(' ')[0] || 'המאמן';
  const feedbackHe = botOpeningSan
    ? `${shortTeacher} פתח במהלך ${botOpeningSan} — עכשיו תורך!`
    : `תורך לשחק מול ${shortTeacher}.`;

  return { fen: readyFen, baselineMaterial, botOpeningSan, botOpeningArrow, feedbackHe };
}

/**
 * Evaluates a player's sparring move against a REAL verifiable chess goal (material protection,
 * no hanging-piece blunder, advantage conversion, or mate) rather than naive move counting!
 */
export function evaluateSparringMove(params: {
  fen: string;
  from: string;
  to: string;
  promotion?: string;
  playerSide: 'white' | 'black';
  baselineMaterial: number;
  cleanMovesSoFar: number;
  targetMoves: number;
  goalKind: SparringGoalKind;
  teacherNameHe: string;
  ChessCtor: any;
}): {
  legal: boolean;
  accepted: boolean;
  blunderBlocked: boolean;
  completed: boolean;
  nextFen: string;
  cleanMoves: number;
  replySan: string | null;
  arrows: BoardArrow[];
  feedbackHe: string;
} {
  const { fen, from, to, promotion, playerSide, baselineMaterial, cleanMovesSoFar, targetMoves, goalKind, teacherNameHe, ChessCtor } = params;
  const game = new ChessCtor(fen);
  const playerChar = playerSide === 'black' ? 'b' : 'w';
  if (game.turn() !== playerChar) {
    return {
      legal: false,
      accepted: false,
      blunderBlocked: false,
      completed: false,
      nextFen: fen,
      cleanMoves: cleanMovesSoFar,
      replySan: null,
      arrows: [],
      feedbackHe: 'המתן לתור שלך בעמדה.',
    };
  }

  let mv: any = null;
  try {
    mv = game.move({ from, to, promotion: promotion || undefined });
    if (!mv) mv = game.move({ from, to, promotion: 'q' });
  } catch {
    try { mv = game.move({ from, to, promotion: 'q' }); } catch { mv = null; }
  }
  if (!mv) {
    return {
      legal: false,
      accepted: false,
      blunderBlocked: false,
      completed: false,
      nextFen: fen,
      cleanMoves: cleanMovesSoFar,
      replySan: null,
      arrows: [],
      feedbackHe: 'מהלך לא חוקי בעמדה הזו.',
    };
  }

  // Immediate checkmate by the player always proves mastery!
  if (game.isCheckmate?.()) {
    return {
      legal: true,
      accepted: true,
      blunderBlocked: false,
      completed: true,
      nextFen: game.fen(),
      cleanMoves: targetMoves,
      replySan: null,
      arrows: [{ from: mv.from, to: mv.to, who: 'me' }],
      feedbackHe: `מט נקי (${mv.san})! הושגה מטרת הספארינג בהצלחה ✅`,
    };
  }

  // Prevent stalemate throw when trying to convert an advantage / mate
  if (game.isStalemate?.() || game.isDraw?.()) {
    if (goalKind === 'deliver-mate' || goalKind === 'convert-advantage') {
      return {
        legal: true,
        accepted: false,
        blunderBlocked: true,
        completed: false,
        nextFen: fen,
        cleanMoves: cleanMovesSoFar,
        replySan: null,
        arrows: [{ from: mv.from, to: mv.to, who: 'me', mistake: true }],
        feedbackHe: `עצירה: ${mv.san} גורם לפט/תיקו במקום להמיר יתרון! נסה מהלך אחר ששומר על הניצחון.`,
      };
    }
  }

  // Teacher bot plays its strongest immediate tactical reply
  let replySan: string | null = null;
  const arrows: BoardArrow[] = [{ from: mv.from, to: mv.to, who: 'me' }];
  const reply = pickTeacherSparringReply(game);
  if (reply) {
    const rep = game.move({ from: reply.from, to: reply.to, promotion: reply.promotion || undefined });
    if (rep) {
      replySan = rep.san;
      arrows.push({ from: rep.from, to: rep.to, who: 'opp' });
    }
  }

  const afterMat = evaluateMaterialForSide(game.fen(), playerSide);
  const materialLoss = baselineMaterial - afterMat;
  const teacherGotMate = Boolean(game.isCheckmate?.());

  // Enforce real chess objective: if the player blunders >= 200cp material or gets mated, block & explain!
  if (teacherGotMate || materialLoss >= 200) {
    return {
      legal: true,
      accepted: false,
      blunderBlocked: true,
      completed: false,
      nextFen: fen,
      cleanMoves: cleanMovesSoFar,
      replySan,
      arrows: [{ from: mv.from, to: mv.to, who: 'me', mistake: true }],
      feedbackHe: teacherGotMate
        ? `עצירה מהמאמן: ${mv.san} מאפשר מט (${replySan})! נסה מהלך בטוח יותר.`
        : `עצירה מהמאמן: אחרי ${mv.san} היריב עונה ${replySan} ומרוויח חומר (-${materialLoss} cp). המטרה היא לשמור על הכלים — נסה מהלך נקי יותר.`,
    };
  }

  const nextClean = cleanMovesSoFar + 1;
  const materialHeld = afterMat >= baselineMaterial - 100;
  const objectiveMet =
    goalKind === 'deliver-mate'
      ? (nextClean >= targetMoves && materialHeld && afterMat >= 400)
      : (nextClean >= targetMoves && materialHeld);

  const shortTeacher = teacherNameHe.split(' ')[0] || 'המאמן';
  const replyNote = replySan ? ` · תשובת ${shortTeacher}: ${replySan}` : '';

  if (objectiveMet) {
    return {
      legal: true,
      accepted: true,
      blunderBlocked: false,
      completed: true,
      nextFen: game.fen(),
      cleanMoves: nextClean,
      replySan,
      arrows,
      feedbackHe: `מטרת הספארינג הושגה ✅ (${nextClean}/${targetMoves} מהלכים נקיים תוך שמירת חומר ויציבות${replyNote}).`,
    };
  }

  return {
    legal: true,
    accepted: true,
    blunderBlocked: false,
    completed: false,
    nextFen: game.fen(),
    cleanMoves: nextClean,
    replySan,
    arrows,
    feedbackHe: `מהלך נקי ${nextClean}/${targetMoves} (${mv.san}${replyNote}) — המשך לשמור על הכלים!`,
  };
}

export function createLessonFollowUpEvent(
  courseId: string,
  lessonId: string,
  weaknessTag: WeaknessCategoryId
): LessonFollowUpTracker {
  return {
    lessonId,
    courseId,
    weaknessTag,
    completedAt: new Date().toISOString(),
    targetGames: 5,
    trackedFingerprints: [],
    cleanGamesCount: 0,
    mistakeGamesCount: 0,
  };
}

export function formatFollowUpProgressHe(tracker: LessonFollowUpTracker | null | undefined): string {
  if (!tracker) return 'מעקב DNA: יתחיל להיספר אוטומטית עם 5 המשחקים הבאים שתסרוק.';
  const observed = tracker.trackedFingerprints.length;
  if (observed === 0) return `מעקב DNA פעיל: 0/${tracker.targetGames} משחקים חדשים מאז השלמת השיעור.`;
  return `מעקב DNA אמיתי: ${observed}/${tracker.targetGames} משחקים אחרי השיעור (${tracker.cleanGamesCount} נקיים, ${tracker.mistakeGamesCount} עם הדפוס).`;
}

export function courseStorageKeyForUser(userId?: string | null): string {
  return userId ? `${BOT_COURSES_STORAGE_KEY}:${userId}` : BOT_COURSES_STORAGE_KEY;
}

export function loadCourseProgress(userId?: string | null): CourseProgressMap {
  try {
    const raw = (globalThis as any).localStorage?.getItem(courseStorageKeyForUser(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCourseProgress(progress: CourseProgressMap, userId?: string | null): void {
  try {
    (globalThis as any).localStorage?.setItem(courseStorageKeyForUser(userId), JSON.stringify(progress));
  } catch {}
}

export function markLessonCompleted(
  progress: CourseProgressMap,
  courseId: string,
  lessonId: string,
  stats: { drillsCorrect: number; drillsMistakes: number; sparringCompleted: boolean }
): CourseProgressMap {
  const key = `${courseId}:${lessonId}`;
  return {
    ...progress,
    [key]: {
      completedAt: new Date().toISOString(),
      ...stats,
    },
  };
}

export function courseCompletionStats(course: BotCourse, progress: CourseProgressMap) {
  const total = course.lessons.length;
  const done = course.lessons.filter(l => Boolean(progress[`${course.id}:${l.id}`])).length;
  return { done, total, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
}

export { BotCoursesPage } from './bot-courses-ui.js';
