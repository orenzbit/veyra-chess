import type { Lang } from './i18n.js';

export type BotVoice = 'calm' | 'fiery' | 'warm' | 'witty';
export type DialogueActor = 'player' | 'bot';
export type PieceCode = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type EndOutcome = 'win' | 'loss' | 'draw';
export type EndReason = 'checkmate' | 'resign' | 'timeout' | 'draw';

export type DialogueEventType =
  | 'game_start'
  | 'game_end'
  | 'promotion'
  | 'capture_queen'
  | 'check'
  | 'capture_rook'
  | 'castle'
  | 'pawn_almost_promoting'
  | 'capture_minor'
  | 'capture_pawn';

export type BoardDialogueEvent = {
  type: DialogueEventType;
  actor: DialogueActor;
  priority: number;
  ply: number;
  piece?: PieceCode;
  captured?: PieceCode;
  promotion?: PieceCode;
  castleSide?: 'kingside' | 'queenside';
  outcome?: EndOutcome;
  reason?: EndReason;
};

export type BilingualLine = {
  id: string;
  he: string;
  en: string;
};

export type BotSpeechBubble = {
  lineId: string;
  eventType: DialogueEventType;
  actor: DialogueActor;
  ply: number;
  he: string;
  en: string;
};

export type DialogueTrackerState = {
  lastBubblePly: number;
  recentLineIds: string[];
};

const MUTE_STORAGE_KEY = 'veyra_bot_dialogue_muted_v1';
const MAX_RECENT_LINES = 10;

const BOT_VOICE_OVERRIDES: Record<string, BotVoice> = {
  tal: 'fiery',
  kasparov: 'fiery',
  morphy: 'fiery',
  anderssen: 'fiery',
  polgarj: 'fiery',
  marshall: 'witty',
  nakamura: 'witty',
  fischer: 'calm',
  karpov: 'calm',
  capablanca: 'calm',
  anand: 'warm',
  carlsen: 'witty',
};

export function getBotVoice(bot: any): BotVoice {
  const id = String(bot?.id || bot?.slug || '').toLowerCase();
  if (BOT_VOICE_OVERRIDES[id]) return BOT_VOICE_OVERRIDES[id];
  const style = String(bot?.style || '').toLowerCase();
  const elo = Number(bot?.elo) || 300;
  if (style === 'attacking') return 'fiery';
  if (style === 'tactical') return elo >= 1350 ? 'witty' : 'warm';
  if (style === 'positional' || style === 'endgame') return elo >= 1000 ? 'calm' : 'warm';
  if (style === 'defensive') return 'calm';
  return elo < 1000 ? 'warm' : 'calm';
}

export function createDialogueTracker(): DialogueTrackerState {
  return { lastBubblePly: -99, recentLineIds: [] };
}

export function readDialogueMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeDialogueMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0');
  } catch {}
}

function pieceNames(piece: PieceCode | undefined): { he: string; en: string } {
  switch (piece) {
    case 'q': return { he: 'מלכה', en: 'queen' };
    case 'r': return { he: 'צריח', en: 'rook' };
    case 'b': return { he: 'רץ', en: 'bishop' };
    case 'n': return { he: 'פרש', en: 'knight' };
    case 'p': return { he: 'רגלי', en: 'pawn' };
    default: return { he: 'כלי', en: 'piece' };
  }
}

export function detectMoveEvent(
  game: any,
  move: any,
  actor: DialogueActor,
  ply: number
): BoardDialogueEvent | null {
  if (!game || !move) return null;

  const captured = move.captured as PieceCode | undefined;
  const promotion = move.promotion as PieceCode | undefined;
  const flags = String(move.flags || '');
  const san = String(move.san || '');

  // Priority order: checkmate handled by game_end; here detect immediate move facts.
  if (typeof game.isCheckmate === 'function' && game.isCheckmate()) {
    return {
      type: 'game_end',
      actor,
      priority: 100,
      ply,
      outcome: actor === 'player' ? 'win' : 'loss',
      reason: 'checkmate',
    };
  }
  if (typeof game.isDraw === 'function' && game.isDraw()) {
    return {
      type: 'game_end',
      actor,
      priority: 100,
      ply,
      outcome: 'draw',
      reason: 'draw',
    };
  }
  if (promotion) {
    return {
      type: 'promotion',
      actor,
      priority: 90,
      ply,
      promotion,
      captured,
    };
  }
  if (captured === 'q') {
    return {
      type: 'capture_queen',
      actor,
      priority: 80,
      ply,
      captured: 'q',
    };
  }
  if ((typeof game.isCheck === 'function' && game.isCheck()) || san.includes('+')) {
    return {
      type: 'check',
      actor,
      priority: 70,
      ply,
    };
  }
  if (captured === 'r') {
    return {
      type: 'capture_rook',
      actor,
      priority: 60,
      ply,
      captured: 'r',
    };
  }
  if (flags.includes('k') || flags.includes('q') || san.startsWith('O-O')) {
    return {
      type: 'castle',
      actor,
      priority: 50,
      ply,
      castleSide: flags.includes('q') || san.startsWith('O-O-O') ? 'queenside' : 'kingside',
    };
  }
  if (
    move.piece === 'p' &&
    !promotion &&
    ((move.color === 'w' && String(move.to || '').endsWith('7')) ||
      (move.color === 'b' && String(move.to || '').endsWith('2')))
  ) {
    return {
      type: 'pawn_almost_promoting',
      actor,
      priority: 40,
      ply,
      piece: 'p',
    };
  }
  if (captured === 'n' || captured === 'b') {
    return {
      type: 'capture_minor',
      actor,
      priority: 30,
      ply,
      captured,
    };
  }
  if (captured === 'p') {
    return {
      type: 'capture_pawn',
      actor,
      priority: 10,
      ply,
      captured: 'p',
    };
  }
  return null;
}

export function detectGameEndEvent(
  resultText: string,
  playerWon: boolean,
  ply: number
): BoardDialogueEvent {
  const txt = String(resultText || '');
  const isDraw = txt === 'תיקו' || /תיקו|draw/i.test(txt);
  const outcome: EndOutcome = isDraw ? 'draw' : playerWon ? 'win' : 'loss';
  const reason: EndReason = isDraw
    ? 'draw'
    : /התפטרות|resign/i.test(txt)
      ? 'resign'
      : /זמן|time/i.test(txt)
        ? 'timeout'
        : 'checkmate';
  return {
    type: 'game_end',
    actor: playerWon ? 'player' : 'bot',
    priority: 100,
    ply,
    outcome,
    reason,
  };
}

function buildCandidates(event: BoardDialogueEvent, voice: BotVoice): BilingualLine[] {
  const actor = event.actor;
  const p = pieceNames(event.captured);
  const promo = pieceNames(event.promotion);

  switch (event.type) {
    case 'game_start':
      return {
        calm: [
          { id: 'start-calm-1', he: 'הלוח מוכן. שיהיה משחק שקול ומהנה.', en: 'The board is set. Wishing you a focused game.' },
          { id: 'start-calm-2', he: 'נפתח ברוגע. בהצלחה על הלוח.', en: 'A calm start. Good luck on the board.' },
        ],
        fiery: [
          { id: 'start-fiery-1', he: 'הלוח מוכן — בוא נראה מי תוקף ראשון!', en: 'Board is ready — let us see who strikes first!' },
          { id: 'start-fiery-2', he: 'קדימה, בלי היסוסים. תן מהלך!', en: 'Let us go, no holding back. Your move!' },
        ],
        warm: [
          { id: 'start-warm-1', he: 'היי! שמח לשחק מולך. בהצלחה!', en: 'Hey! Glad to play you. Good luck!' },
          { id: 'start-warm-2', he: 'משחק חדש! בוא נהנה מכל מהלך.', en: 'Fresh game! Let us enjoy every move.' },
        ],
        witty: [
          { id: 'start-witty-1', he: 'כל הכלים במקום. כרגע אנחנו תיקו.', en: 'All pieces in place. So far, we are tied.' },
          { id: 'start-witty-2', he: 'הלוח נקי. תן לי רגע לבלגן אותו.', en: 'Clean board. Give me a moment to complicate it.' },
        ],
      }[voice];

    case 'check':
      if (actor === 'player') {
        return {
          calm: [
            { id: 'chk-p-calm-1', he: 'שח. בוא נבדוק לאן המלך יכול לסגת.', en: 'Check. Let me see where the king can step.' },
            { id: 'chk-p-calm-2', he: 'שח מדויק. אטפל באיום עכשיו.', en: 'A precise check. Dealing with it now.' },
          ],
          fiery: [
            { id: 'chk-p-fiery-1', he: 'שח! מה אעשה עכשיו?! בוא נבדוק.', en: 'Check! Now what do I do?! Let us see.' },
            { id: 'chk-p-fiery-2', he: 'שח על המלך שלי? אמצא יציאה!', en: 'Check on my king? I will find a way out!' },
          ],
          warm: [
            { id: 'chk-p-warm-1', he: 'אאוץ׳, שח! רגע, איפה המלך בטוח?', en: 'Ouch, check! Hold on, where is my king safe?' },
            { id: 'chk-p-warm-2', he: 'שח יפה! הצלחת להלחיץ לי את המלך.', en: 'Nice check! You put my king on the spot.' },
          ],
          witty: [
            { id: 'chk-p-witty-1', he: 'שח! המלך שלי ביקש קצת שקט, לא קיבל.', en: 'Check! My king asked for peace and quiet. Denied.' },
            { id: 'chk-p-witty-2', he: 'שח. אוקיי, הרמז למלך שלי הובן.', en: 'Check. Alright, my king got the message.' },
          ],
        }[voice];
      }
      return {
        calm: [
          { id: 'chk-b-calm-1', he: 'שח. המלך שלך תחת איום.', en: 'Check. Your king is under fire.' },
          { id: 'chk-b-calm-2', he: 'שח — תצטרך להגיב למלך.', en: 'Check — time to address the king.' },
        ],
        fiery: [
          { id: 'chk-b-fiery-1', he: 'שח! אין מנוס מהלחץ על המלך.', en: 'Check! Keep the pressure on the king.' },
          { id: 'chk-b-fiery-2', he: 'שח! המלך שלך חייב לזוז או להתגונן.', en: 'Check! Your king has to answer right now.' },
        ],
        warm: [
          { id: 'chk-b-warm-1', he: 'שח! תראה מה קורה למלך.', en: 'Check! Watch out for your king.' },
          { id: 'chk-b-warm-2', he: 'שח קטן — תורך להגן.', en: 'A quick check — over to you.' },
        ],
        witty: [
          { id: 'chk-b-witty-1', he: 'שח! ד״ש למלך שלך.', en: 'Check! Say hello to your king.' },
          { id: 'chk-b-witty-2', he: 'שח. המלך שלך לא יכול להישאר אדיש.', en: 'Check. Even a king cannot ignore that.' },
        ],
      }[voice];

    case 'capture_queen':
      if (actor === 'player') {
        return {
          calm: [
            { id: 'capq-p-calm-1', he: 'המלכה שלי נלכדה. אצטרך להסתדר בלעדיה.', en: 'My queen is captured. Time to fight on without her.' },
            { id: 'capq-p-calm-2', he: 'איבדתי את המלכה. המשחק ממשיך עם מה שנשאר.', en: 'I lost the queen. Continuing with what remains.' },
          ],
          fiery: [
            { id: 'capq-p-fiery-1', he: 'לקחת לי את המלכה! עכשיו הקרב נהיה אישי.', en: 'You took my queen! Now the fight gets fierce.' },
            { id: 'capq-p-fiery-2', he: 'המלכה ירדה מהלוח — עדיין לא ויתרתי.', en: 'My queen is off the board — not giving up yet.' },
          ],
          warm: [
            { id: 'capq-p-warm-1', he: 'וואו, תפסת לי את המלכה! כל הכבוד.', en: 'Whoa, you caught my queen! Well played.' },
            { id: 'capq-p-warm-2', he: 'הלכה המלכה שלי... ניסיון טוב מצדך!', en: 'There goes my queen... sharp play from you!' },
          ],
          witty: [
            { id: 'capq-p-witty-1', he: 'המלכה שלי יצאה להפסקה מוקדמת.', en: 'My queen just took an early coffee break.' },
            { id: 'capq-p-witty-2', he: 'אוקיי, בלי מלכה. מצב הארדקור מופעל.', en: 'No queen? Hardcore mode activated.' },
          ],
        }[voice];
      }
      return {
        calm: [
          { id: 'capq-b-calm-1', he: 'המלכה שלך נלכדה.', en: 'Your queen has been captured.' },
          { id: 'capq-b-calm-2', he: 'הורדתי את המלכה מהלוח.', en: 'The queen comes off the board.' },
        ],
        fiery: [
          { id: 'capq-b-fiery-1', he: 'המלכה נלכדה! השליטה בלוח משתנה.', en: 'Queen captured! The board shifts fast.' },
          { id: 'capq-b-fiery-2', he: 'לקחתי את המלכה — הקצב מתגבר.', en: 'Took the queen — turning up the heat.' },
        ],
        warm: [
          { id: 'capq-b-warm-1', he: 'תפסתי את המלכה! בוא נראה איך תגיב.', en: 'Got the queen! Let us see how you respond.' },
          { id: 'capq-b-warm-2', he: 'המלכה נלכדה, אבל יש עוד מהלכים.', en: 'Queen captured, though there is still chess left.' },
        ],
        witty: [
          { id: 'capq-b-witty-1', he: 'מלכה נלכדה. תודה על שיתוף הפעולה.', en: 'Queen captured. Appreciate the cooperation.' },
          { id: 'capq-b-witty-2', he: 'המלכה שלך עברה לצד שלי של השולחן.', en: 'Your queen just switched sides of the table.' },
        ],
      }[voice];

    case 'capture_rook':
      if (actor === 'player') {
        return {
          calm: [{ id: 'capr-p-calm-1', he: 'הצריח שלי נלכד.', en: 'My rook was captured.' }],
          fiery: [{ id: 'capr-p-fiery-1', he: 'לקחת לי צריח — נמשיך להילחם על הטורים.', en: 'You took my rook — the fight continues.' }],
          warm: [{ id: 'capr-p-warm-1', he: 'תפסת את הצריח שלי! מהלך חד.', en: 'You got my rook! Sharp move.' }],
          witty: [{ id: 'capr-p-witty-1', he: 'צריח אחד פחות באגף. המגדל נפל.', en: 'One rook down. The tower has fallen.' }],
        }[voice];
      }
      return {
        calm: [{ id: 'capr-b-calm-1', he: 'הצריח נלכד.', en: 'The rook is captured.' }],
        fiery: [{ id: 'capr-b-fiery-1', he: 'הצריח ירד מהלוח!', en: 'Rook off the board!' }],
        warm: [{ id: 'capr-b-warm-1', he: 'לקחתי צריח — עמדה מעניינת.', en: 'Captured a rook — interesting position.' }],
        witty: [{ id: 'capr-b-witty-1', he: 'הצריח שלך סיים משמרת.', en: 'Your rook just clocked out.' }],
      }[voice];

    case 'capture_minor':
      if (actor === 'player') {
        return {
          calm: [{ id: `capm-p-calm-${event.captured}`, he: `ה${p.he} שלי נלכד.`, en: `My ${p.en} was captured.` }],
          fiery: [{ id: `capm-p-fiery-${event.captured}`, he: `איבדתי ${p.he} — בוא נראה מה עושים הלאה.`, en: `Lost a ${p.en} — let us see what follows.` }],
          warm: [{ id: `capm-p-warm-${event.captured}`, he: `לכדת את ה${p.he}. יפה!`, en: `Nice capture of my ${p.en}!` }],
          witty: [{ id: `capm-p-witty-${event.captured}`, he: `ביי ביי ${p.he}, היה נעים להכיר.`, en: `Bye bye ${p.en}, nice knowing you.` }],
        }[voice];
      }
      return {
        calm: [{ id: `capm-b-calm-${event.captured}`, he: `ה${p.he} נלכד.`, en: `The ${p.en} is captured.` }],
        fiery: [{ id: `capm-b-fiery-${event.captured}`, he: `לקחתי את ה${p.he}!`, en: `Took the ${p.en}!` }],
        warm: [{ id: `capm-b-warm-${event.captured}`, he: `לקחתי ${p.he}. תורך!`, en: `Captured the ${p.en}. Your turn!` }],
        witty: [{ id: `capm-b-witty-${event.captured}`, he: `ה${p.he} הזה עובר לנוח בקופסה.`, en: `That ${p.en} is going back in the box.` }],
      }[voice];

    case 'capture_pawn':
      if (actor === 'player') {
        return [
          { id: 'capp-p-1', he: 'הרגלי נלכד. המבנה משתנה.', en: 'Pawn captured. The structure shifts.' },
          { id: 'capp-p-2', he: 'עוד רגלי ירד מהלוח.', en: 'Another pawn leaves the board.' },
        ];
      }
      return [
        { id: 'capp-b-1', he: 'הרגלי הזה נלכד.', en: 'That pawn is captured.' },
        { id: 'capp-b-2', he: 'מפנים קווים — רגלי ירד.', en: 'Opening lines — a pawn is off.' },
      ];

    case 'castle':
      if (actor === 'player') {
        return {
          calm: [{ id: 'cas-p-calm-1', he: 'הצרחת. המלך במקום מוגן יותר.', en: 'Castled. Your king finds shelter.' }],
          fiery: [{ id: 'cas-p-fiery-1', he: 'הצרחה? בוא נראה אם האגף הזה באמת בטוח.', en: 'Castled? Let us test how safe that wing really is.' }],
          warm: [{ id: 'cas-p-warm-1', he: 'הצרחה מסודרת! עכשיו מתחילים לשחק.', en: 'Clean castle! Now the real game begins.' }],
          witty: [{ id: 'cas-p-witty-1', he: 'המלך נכנס לטירה. סגרת את הדלת?', en: 'The king moved into the castle. Did you lock up?' }],
        }[voice];
      }
      return {
        calm: [{ id: 'cas-b-calm-1', he: 'הצרחתי. המלך בטוח והצריח מצטרף.', en: 'Castled. King tucked away, rook enters play.' }],
        fiery: [{ id: 'cas-b-fiery-1', he: 'המלך בבטחה — עכשיו אפשר לתקוף!', en: 'King safe — time to attack!' }],
        warm: [{ id: 'cas-b-warm-1', he: 'הצרחה שלי, המלך מסודר.', en: 'Castled on my side, king is settled.' }],
        witty: [{ id: 'cas-b-witty-1', he: 'חילופי מקומות מהירים — המלך הלך לנוח.', en: 'Quick room swap — my king went to rest.' }],
      }[voice];

    case 'pawn_almost_promoting':
      if (actor === 'player') {
        return [
          {
            calm: { id: 'pap-p-1', he: 'הרגלי שלך במרחק צעד מהכתרה.', en: 'Your pawn is one step from promotion.' },
            fiery: { id: 'pap-p-2', he: 'רגלי על הסף! כולם דרוכים להכתרה.', en: 'Pawn on the doorstep! Everything is tense.' },
            warm: { id: 'pap-p-3', he: 'וואו, הרגלי שלך כמעט הגיע לקו הסיום!', en: 'Whoa, your pawn almost reached the end!' },
            witty: { id: 'pap-p-4', he: 'הרגלי שלך כבר מודד כתר...', en: 'Your pawn is already trying on a crown...' },
          }[voice],
        ];
      }
      return [
        {
          calm: { id: 'pap-b-1', he: 'הרגלי שלי נמצא צעד מהכתרה.', en: 'My pawn stands one step from promotion.' },
          fiery: { id: 'pap-b-2', he: 'עוד צעד אחד — והרגלי מוכתר!', en: 'One more step — and this pawn promotes!' },
          warm: { id: 'pap-b-3', he: 'הרגלי שלי ממש קרוב לקצה הלוח!', en: 'My pawn is right near the end of the board!' },
          witty: { id: 'pap-b-4', he: 'הרגלי שלי בדרך לשדרוג רציני.', en: 'My pawn is queuing for a major upgrade.' },
        }[voice]
      ];

    case 'promotion': {
      const code = event.promotion || 'q';
      if (actor === 'player') {
        return [
          {
            id: `pro-p-${code}-1`,
            he: `הכתרה ל${promo.he}! כלי חדש על הלוח.`,
            en: `Promoted to a ${promo.en}! New firepower on the board.`,
          },
          {
            id: `pro-p-${code}-2`,
            he: `הרגלי הפך ל${promo.he} — מאזן הכוחות השתנה.`,
            en: `Your pawn became a ${promo.en} — the board just changed.`,
          },
        ];
      }
      return [
        {
          id: `pro-b-${code}-1`,
          he: `הכתרתי ל${promo.he}!`,
          en: `Promoted to a ${promo.en}!`,
        },
        {
          id: `pro-b-${code}-2`,
          he: `הרגלי הושלם — יש ${promo.he} חדש על הלוח.`,
          en: `Pawn marched all the way — welcome, new ${promo.en}.`,
        },
      ];
    }

    case 'game_end': {
      if (event.outcome === 'draw') {
        return [
          { id: 'end-draw-1', he: 'תיקו! משחק מאוזן וצמוד.', en: 'A draw! Well-fought and balanced.' },
          { id: 'end-draw-2', he: 'חלוקת נקודות הוגנת. משחק טוב!', en: 'A fair share of the point. Good game!' },
        ];
      }
      if (event.outcome === 'win') {
        if (event.reason === 'checkmate') {
          return [
            { id: 'end-win-mate-1', he: 'מט! כל הכבוד על הניצחון.', en: 'Checkmate! Well played and congratulations.' },
            { id: 'end-win-mate-2', he: 'מצאת את המט. משחק מצוין שלך!', en: 'You found the mate. Great game!' },
          ];
        }
        return [
          { id: 'end-win-time-1', he: 'השעון נגמר לטובתך — ניצחון שלך!', en: 'The clock ran out in your favor — your win!' },
        ];
      }
      if (event.reason === 'resign') {
        return [
          { id: 'end-loss-resign-1', he: 'משחק טוב. מוכן לסיבוב חוזר מתי שתרצה!', en: 'Good game. Ready for a rematch whenever you are!' },
        ];
      }
      if (event.reason === 'timeout') {
        return [
          { id: 'end-loss-time-1', he: 'נגמר הזמן! בשעון מהיר כל שנייה קובעת.', en: 'Time out! Every second counts in fast chess.' },
        ];
      }
      return [
        { id: 'end-loss-mate-1', he: 'מט! תודה על המשחק, רוצה סיבוב חוזר?', en: 'Checkmate! Thanks for the game — rematch?' },
      ];
    }
  }
}

export function selectDialogueBubble(
  bot: any,
  event: BoardDialogueEvent | null,
  tracker: DialogueTrackerState,
  muted: boolean
): { bubble: BotSpeechBubble | null; tracker: DialogueTrackerState } {
  if (muted || !event) return { bubble: null, tracker };

  // Cooldown avoids spamming on quiet captures (e.g. pawns) or back-to-back medium events.
  const isCritical = event.priority >= 70 || event.type === 'game_start';
  const minGap = event.type === 'capture_pawn' ? 5 : 3;
  if (!isCritical && event.ply - tracker.lastBubblePly < minGap) {
    return { bubble: null, tracker };
  }

  const voice = getBotVoice(bot);
  const candidates = buildCandidates(event, voice);
  if (!candidates.length) return { bubble: null, tracker };

  const fresh = candidates.filter((c) => !tracker.recentLineIds.includes(c.id));
  const pool = fresh.length ? fresh : candidates;
  const pick = pool[Math.abs(event.ply) % pool.length];

  const recentLineIds = [...tracker.recentLineIds, pick.id].slice(-MAX_RECENT_LINES);
  return {
    bubble: {
      lineId: pick.id,
      eventType: event.type,
      actor: event.actor,
      ply: event.ply,
      he: pick.he,
      en: pick.en,
    },
    tracker: {
      lastBubblePly: event.ply,
      recentLineIds,
    },
  };
}

export function bubbleText(bubble: BotSpeechBubble | null, bot: any, lang: Lang): string {
  if (bubble) return lang === 'en' ? bubble.en : bubble.he;
  if (lang === 'en') return 'Your move.';
  return bot?.flavor || 'מוכן למשחק.';
}
