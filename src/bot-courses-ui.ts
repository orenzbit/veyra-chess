// Decomposed React UI components for DNA-Driven Hybrid Bot Courses.
// Clean lifecycle management for cm-chessboard (no moveInputAnimate errors when finishing a lesson!),
// full support for bot-first sparring positions, 5-game follow-up display, and continuity preservation.

import { drawBoardArrowsAligned, type BoardArrow } from './board-arrows.js';
import type { TiltClockReport } from './dna-tilt-clock.js';
import type { InProgressLessonSnapshot, LessonFollowUpTracker, UserEvolutionState } from './evolution-store.js';
import {
  buildPersonalizedBotCourses,
  courseCompletionStats,
  createLessonFollowUpEvent,
  evaluateDrillMove,
  evaluateSparringMove,
  formatFollowUpProgressHe,
  initSparringPosition,
  loadCourseProgress,
  markLessonCompleted,
  saveCourseProgress,
  type BotCourse,
  type CourseLesson,
  type CourseProgressMap,
  type CourseStage,
} from './bot-courses.js';

function CourseBoard({ fen, orientation, arrows, interactive, onUserMove }: {
  fen: string;
  orientation: 'white' | 'black';
  arrows: BoardArrow[];
  interactive: boolean;
  onUserMove?: (from: string, to: string) => boolean;
}) {
  const ReactObj = (globalThis as any).React;
  const h = ReactObj.createElement;
  const { useEffect, useRef } = ReactObj;
  const boardElRef = useRef(null);
  const svgRef = useRef(null);
  const boardRef = useRef(null);
  const onMoveRef = useRef(onUserMove);
  const interactiveRef = useRef(interactive);
  onMoveRef.current = onUserMove;
  interactiveRef.current = interactive;

  // Keep the Chessboard instance mounted across stage transitions (e.g. sparring -> done)
  // and gate move input via interactiveRef so cm-chessboard never crashes in moveInputAnimate!
  useEffect(() => {
    const Lib = (globalThis as any).ChessBoardLib;
    if (!Lib || !boardElRef.current) return;
    const { Chessboard, COLOR, BORDER_TYPE } = Lib;
    const b = new Chessboard(boardElRef.current, {
      position: fen,
      orientation: orientation === 'black' ? COLOR.black : COLOR.white,
      responsive: true,
      assetsUrl: '/vendor/cm-chessboard/',
      style: { borderType: BORDER_TYPE.none, cssClass: 'default', pieces: { file: 'pieces/standard.svg' }, animationDuration: 180 },
    });
    boardRef.current = b;
    b.enableMoveInput((ev: any) => {
      if (!interactiveRef.current) return false;
      if (ev.type === 'moveInputStarted') return true;
      if (ev.type === 'validateMoveInput') {
        return Boolean(onMoveRef.current?.(ev.squareFrom, ev.squareTo));
      }
      return true;
    }, orientation === 'black' ? COLOR.black : COLOR.white);

    return () => {
      try { b.disableMoveInput?.(); } catch {}
      try { b.destroy(); } catch {}
      boardRef.current = null;
    };
  }, [orientation]);

  useEffect(() => {
    const b = boardRef.current;
    if (!b || !fen) return;
    // Defer setPosition slightly past synchronous validateMoveInput return so cm-chessboard
    // completes its internal drop animation cleanly without racing moveInputAnimate.
    const timer = setTimeout(() => {
      try { boardRef.current?.setPosition(fen, false); } catch {}
    }, 20);
    return () => clearTimeout(timer);
  }, [fen]);

  useEffect(() => {
    const redraw = () => {
      if (!svgRef.current || !boardElRef.current) return;
      try { drawBoardArrowsAligned(svgRef.current, boardElRef.current, arrows || [], orientation); } catch {}
    };
    redraw();
    const raf = requestAnimationFrame(redraw);
    const t = setTimeout(redraw, 60);
    window.addEventListener('resize', redraw);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); window.removeEventListener('resize', redraw); };
  }, [arrows, orientation, fen]);

  return h('div', { className: 'evo-course-board-wrap' },
    h('div', { ref: boardElRef, className: 'board' }),
    h('svg', { ref: svgRef, className: 'arrow-layer' })
  );
}

function CourseListView({ courses, activeCourse, progress, followUps, inProgressLesson, onSelectCourse, onOpenLesson }: {
  courses: BotCourse[];
  activeCourse: BotCourse | undefined;
  progress: CourseProgressMap;
  followUps: LessonFollowUpTracker[];
  inProgressLesson: InProgressLessonSnapshot | null;
  onSelectCourse: (id: string) => void;
  onOpenLesson: (lesson: CourseLesson) => void;
}) {
  const h = (globalThis as any).React.createElement;
  return h('div', { className: 'evo-courses-list-wrap' },
    inProgressLesson && h('div', { className: 'evo-continuity-banner', 'data-evo-in-progress': inProgressLesson.lessonId },
      h('span', null, `📌 יש לך שיעור פתוח שנשמר גם אחרי סקירות חדשות: ${inProgressLesson.lessonTitleHe}`),
      h('button', {
        className: 'evo-action-btn',
        onClick: () => {
          const c = courses.find(x => x.id === inProgressLesson.courseId);
          const l = c?.lessons.find(x => x.id === inProgressLesson.lessonId);
          if (c && l) { onSelectCourse(c.id); onOpenLesson(l); }
        },
      }, 'המשך שיעור ←')
    ),
    h('div', { className: 'evo-course-tabs' },
      courses.map(course => {
        const st = courseCompletionStats(course, progress);
        const isSel = course.id === activeCourse?.id;
        return h('button', {
          key: course.id,
          className: 'evo-course-tab ' + (isSel ? 'is-active' : ''),
          'data-course-id': course.id,
          onClick: () => onSelectCourse(course.id),
        },
          h('div', { className: 'evo-course-tab-top' },
            h('span', { className: 'evo-course-piece' }, course.teacherPiece),
            h('strong', null, course.titleHe),
            h('span', { className: 'evo-meta-pill' }, course.dnaMetricTagHe)
          ),
          h('small', { className: 'muted' }, `${course.teacherNameHe} · ${st.done}/${st.total} שיעורים הושלמו`)
        );
      })
    ),
    activeCourse && h('section', { className: 'evo-card evo-course-detail' },
      h('div', { className: 'evo-card-top' },
        h('div', null,
          h('h2', null, activeCourse.titleHe),
          h('p', { className: 'muted' }, `${activeCourse.teacherNameHe} · ${activeCourse.teacherContributionHe || activeCourse.teacherRoleHe}`)
        ),
        h('span', { className: 'evo-meta-pill' }, activeCourse.dnaMetricTagHe)
      ),
      h('p', { className: 'evo-advice' }, '🎯 למה הקורס נבנה עבורך: ', activeCourse.dnaReasonHe),
      activeCourse.personalSignalHe && h('p', { className: 'muted' }, '🧬 ', activeCourse.personalSignalHe),
      h('div', { className: 'evo-lessons-grid' },
        activeCourse.lessons.map((lesson, idx) => {
          const doneRec = progress[`${activeCourse.id}:${lesson.id}`];
          const fu = followUps.find(f => f.courseId === activeCourse.id && f.lessonId === lesson.id);
          return h('article', {
            key: lesson.id,
            className: 'evo-lesson-card ' + (doneRec ? 'is-done' : ''),
            'data-lesson-id': lesson.id,
            'data-lesson-origin': lesson.originKind || 'base-training',
          },
            h('div', { className: 'evo-lesson-head' },
              h('span', { className: 'evo-lesson-num' }, doneRec ? '✅' : `${idx + 1}`),
              h('div', null,
                h('strong', null, lesson.titleHe),
                h('small', { className: 'muted' }, lesson.subtitleHe)
              ),
              lesson.originBadgeHe && h('span', { className: 'evo-meta-pill' }, lesson.originBadgeHe)
            ),
            h('p', { className: 'muted' }, doneRec ? formatFollowUpProgressHe(fu) : `📌 ${lesson.selectionReasonHe || lesson.dnaFollowUpHe}`),
            h('button', {
              className: 'primary evo-start-lesson-btn',
              'data-start-lesson': lesson.id,
              onClick: () => onOpenLesson(lesson),
            }, doneRec ? 'תרגל שוב ←' : 'התחל שיעור ←')
          );
        })
      )
    )
  );
}

function LessonStageControls({ stage, activeLesson, drillIdx, drillSolved, sparMoves, stats, followUp, teacherBotObj, onStartDrills, onNextDrillOrSparring, onLaunchSparringBot, onBackToList }: {
  stage: CourseStage;
  activeLesson: CourseLesson;
  drillIdx: number;
  drillSolved: boolean;
  sparMoves: number;
  stats: { correct: number; mistakes: number };
  followUp: LessonFollowUpTracker | null;
  teacherBotObj: any;
  onStartDrills: () => void;
  onNextDrillOrSparring: () => void;
  onLaunchSparringBot?: (teacherBot: any, startFen: string, side: 'white' | 'black') => void;
  onBackToList: () => void;
}) {
  const h = (globalThis as any).React.createElement;
  if (stage === 'inspect') {
    return h('div', { className: 'evo-stage-actions' },
      h('button', { className: 'primary', 'data-course-start-drills': 'true', onClick: onStartDrills }, 'המשך ל-3 התרגילים האינטראקטיביים ←')
    );
  }
  if (stage === 'drills') {
    const drill = activeLesson.drills[drillIdx];
    return h('div', { className: 'evo-stage-actions' },
      h('p', { className: 'muted' }, `תרגיל ${drillIdx + 1} מתוך ${activeLesson.drills.length}: ${drill?.promptHe || ''}`),
      drillSolved
        ? h('button', { className: 'primary', 'data-course-next-drill': 'true', onClick: onNextDrillOrSparring },
            drillIdx + 1 < activeLesson.drills.length ? 'לתרגיל הבא ←' : 'לשלב 3: מיני-ספארינג ←')
        : h('small', { className: 'muted' }, 'בצע את המהלך הנכון על הלוח (אם תטעה, המאמן יעצור ויסביר).')
    );
  }
  if (stage === 'sparring') {
    return h('div', { className: 'evo-stage-actions' },
      h('p', { className: 'muted' }, `מטרה מאומתת: ${activeLesson.sparringGoalHe}`),
      h('p', { className: 'muted' }, `מהלכים נקיים: ${sparMoves} / ${activeLesson.sparringMovesTarget} (טעות חומרית נחסמת ולא נספרת)`),
      onLaunchSparringBot && teacherBotObj && h('button', {
        className: 'evo-action-btn',
        onClick: () => onLaunchSparringBot(teacherBotObj, activeLesson.sparringFen, activeLesson.playerSide),
      }, 'פתח משחק מלא מול המורה מעמדה זו ⚔️')
    );
  }
  return h('div', { className: 'evo-done-card', 'data-course-lesson-done': 'true' },
    h('strong', null, '✅ השיעור הושלם ונשמר בחשבון!'),
    h('p', { className: 'muted' }, `תרגילים שנפתרו: ${stats.correct} · שגיאות תרגול: ${stats.mistakes} · ספארינג מאומת הושלם.`),
    h('p', { className: 'evo-advice' }, '📈 ', formatFollowUpProgressHe(followUp)),
    h('button', { className: 'primary', onClick: onBackToList }, 'חזרה לרשימת השיעורים ←')
  );
}

function LessonWorkspaceView({
  activeCourse, activeLesson, stage, drillIdx, boardFen, arrows, feedback, drillSolved, sparMoves, stats,
  followUp, teacherBotObj, onBackToCourse, onDrillMove, onSparringMove, onStartDrills, onNextDrillOrSparring, onLaunchSparringBot,
}: any) {
  const h = (globalThis as any).React.createElement;
  return h('section', { className: 'evo-lesson-workspace', 'data-evo-lesson-stage': stage },
    h('div', { className: 'evo-lesson-toolbar' },
      h('button', { onClick: onBackToCourse }, '← חזרה לקורס'),
      h('div', null,
        h('strong', null, `${activeCourse.teacherPiece} ${activeLesson.titleHe}`),
        h('small', { className: 'muted' }, `${activeCourse.teacherNameHe} · ${activeLesson.originBadgeHe || 'אימון בסיס'}`)
      ),
      h('div', { className: 'evo-stage-pills' },
        h('span', { className: 'evo-stage-pill ' + (stage === 'inspect' ? 'active' : 'done') }, '1. עמדה וחצים'),
        h('span', { className: 'evo-stage-pill ' + (stage === 'drills' ? 'active' : stage === 'sparring' || stage === 'done' ? 'done' : '') }, `2. תרגילים (${Math.min(drillIdx + 1, activeLesson.drills.length)}/${activeLesson.drills.length})`),
        h('span', { className: 'evo-stage-pill ' + (stage === 'sparring' ? 'active' : stage === 'done' ? 'done' : '') }, '3. מיני-ספארינג')
      )
    ),
    h('div', { className: 'evo-lesson-grid' },
      h(CourseBoard, {
        fen: boardFen,
        orientation: stage === 'drills' ? activeLesson.drills[drillIdx].playerSide : activeLesson.playerSide,
        arrows,
        interactive: stage === 'drills' || stage === 'sparring',
        onUserMove: stage === 'drills' ? onDrillMove : onSparringMove,
      }),
      h('aside', { className: 'evo-card evo-lesson-panel' },
        h('div', { className: 'evo-teacher-bubble', role: 'status', 'aria-live': 'polite' },
          h('span', { className: 'evo-teacher-tag' }, `${activeCourse.teacherPiece} ${activeCourse.teacherNameHe}`),
          h('p', null, feedback)
        ),
        h(LessonStageControls, {
          stage, activeLesson, drillIdx, drillSolved, sparMoves, stats, followUp, teacherBotObj,
          onStartDrills, onNextDrillOrSparring, onLaunchSparringBot, onBackToList: onBackToCourse,
        })
      )
    )
  );
}

export function BotCoursesPage({
  bots, dnaReport, tiltReport, evolutionState, authUser, isOffline, onBack,
  onLaunchSparringBot, onMicroStepComplete, onUpdateEvolutionState, Brand, LangButton,
}: {
  bots: any[]; dnaReport?: any; tiltReport?: TiltClockReport | null; evolutionState?: UserEvolutionState | null;
  authUser?: { id?: string } | null; isOffline?: boolean; onBack: () => void;
  onLaunchSparringBot?: (teacherBot: any, startFen: string, side: 'white' | 'black') => void;
  onMicroStepComplete?: () => void;
  onUpdateEvolutionState?: (updater: (prev: UserEvolutionState) => UserEvolutionState) => void;
  Brand: any; LangButton: any;
}) {
  const ReactObj = (globalThis as any).React;
  const h = ReactObj.createElement;
  const { useState, useMemo, useRef } = ReactObj;
  const ChessCtor = (globalThis as any).ChessLib?.Chess;
  const userId = authUser?.id || null;

  const courses = useMemo(
    () => buildPersonalizedBotCourses({ dnaReport, tiltReport, bots, evolutionState, ChessCtor }),
    [dnaReport, tiltReport, bots, evolutionState]
  );
  const [localProgress, setLocalProgress] = useState(() => evolutionState?.courseProgress || loadCourseProgress(userId));
  const progress: CourseProgressMap = evolutionState?.courseProgress || localProgress;
  const followUps: LessonFollowUpTracker[] = evolutionState?.lessonFollowUps || [];

  const [activeCourseId, setActiveCourseId] = useState(courses[0]?.id || 'hanging-pieces-tactics');
  const [lockedLesson, setLockedLesson] = useState(null as CourseLesson | null);
  const [stage, setStage] = useState('inspect' as CourseStage);
  const [drillIdx, setDrillIdx] = useState(0);
  const [boardFen, setBoardFen] = useState('');
  const [arrows, setArrows] = useState([] as BoardArrow[]);
  const [feedback, setFeedback] = useState('');
  const [drillSolved, setDrillSolved] = useState(false);
  const [stats, setStats] = useState({ correct: 0, mistakes: 0 });
  const [sparMoves, setSparMoves] = useState(0);
  const sparBaselineMatRef = useRef(0);

  const activeCourse = courses.find(c => c.id === activeCourseId) || courses[0];
  const teacherBotObj = (bots || []).find((b: any) => b.id === activeCourse?.teacherBotId) || (bots || [])[0];

  const saveInProgress = (lesson: CourseLesson | null, st: 'inspect' | 'drills' | 'sparring', idx: number) => {
    onUpdateEvolutionState?.(prev => ({
      ...prev,
      inProgressLesson: lesson ? { courseId: activeCourse.id, lessonId: lesson.id, stage: st, drillIdx: idx, savedAt: new Date().toISOString(), lessonTitleHe: lesson.titleHe } : null,
      updatedAt: new Date().toISOString(),
    }));
  };

  const openLesson = (lesson: CourseLesson) => {
    setLockedLesson(lesson); setStage('inspect'); setDrillIdx(0); setBoardFen(lesson.inspectFen);
    setArrows(lesson.inspectArrows); setFeedback(lesson.inspectExplanationHe); setDrillSolved(false);
    setStats({ correct: 0, mistakes: 0 }); setSparMoves(0); saveInProgress(lesson, 'inspect', 0);
  };

  const startDrills = () => {
    if (!lockedLesson) return;
    const first = lockedLesson.drills[0];
    setStage('drills'); setDrillIdx(0); setBoardFen(first.fen); setArrows([]); setFeedback(first.promptHe); setDrillSolved(false);
    saveInProgress(lockedLesson, 'drills', 0);
  };

  const handleDrillMove = (from: string, to: string): boolean => {
    if (!lockedLesson || !ChessCtor || drillSolved) return false;
    const res = evaluateDrillMove(lockedLesson.drills[drillIdx], `${from}${to}`, ChessCtor);
    if (!res.legal) return false;
    setArrows(res.arrows); setFeedback(res.feedbackHe);
    if (res.correct) { setBoardFen(res.nextFen); setDrillSolved(true); setStats((s: any) => ({ ...s, correct: s.correct + 1 })); return true; }
    setStats((s: any) => ({ ...s, mistakes: s.mistakes + 1 })); return false;
  };

  const nextDrillOrSparring = () => {
    if (!lockedLesson) return;
    if (drillIdx + 1 < lockedLesson.drills.length) {
      const next = lockedLesson.drills[drillIdx + 1];
      setDrillIdx(drillIdx + 1); setBoardFen(next.fen); setArrows([]); setFeedback(next.promptHe); setDrillSolved(false);
      saveInProgress(lockedLesson, 'drills', drillIdx + 1);
      return;
    }
    const init = initSparringPosition(lockedLesson.sparringFen, lockedLesson.playerSide, activeCourse.teacherNameHe, ChessCtor);
    sparBaselineMatRef.current = init.baselineMaterial;
    setStage('sparring'); setBoardFen(init.fen); setArrows(init.botOpeningArrow ? [init.botOpeningArrow] : []);
    setSparMoves(0); setFeedback(`${init.feedbackHe} ${lockedLesson.sparringGoalHe}`); saveInProgress(lockedLesson, 'sparring', drillIdx);
  };

  const handleSparringMove = (from: string, to: string): boolean => {
    if (!lockedLesson || !ChessCtor) return false;
    const res = evaluateSparringMove({
      fen: boardFen, from, to, playerSide: lockedLesson.playerSide, baselineMaterial: sparBaselineMatRef.current,
      cleanMovesSoFar: sparMoves, targetMoves: lockedLesson.sparringMovesTarget, goalKind: lockedLesson.sparringGoalKind || 'keep-material',
      teacherNameHe: activeCourse.teacherNameHe, ChessCtor,
    });
    if (!res.legal) return false;
    setArrows(res.arrows); setFeedback(res.feedbackHe);
    if (!res.accepted) return false;
    setBoardFen(res.nextFen); setSparMoves(res.cleanMoves);
    if (res.completed) {
      const nextProg = markLessonCompleted(progress, activeCourse.id, lockedLesson.id, { drillsCorrect: stats.correct, drillsMistakes: stats.mistakes, sparringCompleted: true });
      setLocalProgress(nextProg); saveCourseProgress(nextProg, userId);
      const fu = createLessonFollowUpEvent(activeCourse.id, lockedLesson.id, lockedLesson.weaknessTag || activeCourse.weaknessTag || 'hanging-pieces-tactics');
      onUpdateEvolutionState?.(prev => ({
        ...prev, revision: (prev.revision || 0) + 1, courseProgress: nextProg, inProgressLesson: null,
        lessonFollowUps: [...(prev.lessonFollowUps || []).filter(f => !(f.courseId === fu.courseId && f.lessonId === fu.lessonId)), fu],
        updatedAt: new Date().toISOString(),
      }));
      setStage('done'); onMicroStepComplete?.();
    }
    return true;
  };

  return h('div', { className: 'app-shell', dir: 'rtl', 'data-evo-courses-page': 'true' },
    h('header', { className: 'topbar' },
      h(Brand, { section: 'קורסי הבוטים · DNA' }),
      h('div', { className: 'top-actions' }, h(LangButton), h('button', { onClick: onBack }, 'חזרה לארכיון'))
    ),
    h('main', { className: 'content evo-courses-main' },
      h('section', { className: 'hero-row evo-courses-hero' },
        h('div', null,
          h('span', { className: 'archive-eyebrow' }, 'HYBRID DNA-DRIVEN BOT COURSES'),
          h('h1', null, 'קורסים אישיים מה-DNA שהבוטים מלמדים'),
          h('p', { className: 'muted' }, 'כל שיעור נבנה מאותו פרופיל שמעדכן את הבוט האישי שלך: עמדה מהמשחקים שלך ← 3 תרגילים מודרכים ← מיני-ספארינג עם מטרה מאומתת ומעקב 5 משחקים.')
        )
      ),
      isOffline && h('div', { className: 'evo-offline-banner', role: 'status' }, '📡 מצב אופליין — אפשר להמשיך ולסיים שיעורים שכבר נטענו; ההתקדמות תסתנכרן אוטומטית כשתחזור לרשת.'),
      !lockedLesson
        ? h(CourseListView, {
            courses, activeCourse, progress, followUps, inProgressLesson: evolutionState?.inProgressLesson || null,
            onSelectCourse: (id: string) => { setActiveCourseId(id); setLockedLesson(null); }, onOpenLesson: openLesson,
          })
        : h(LessonWorkspaceView, {
            activeCourse, activeLesson: lockedLesson, stage, drillIdx, boardFen, arrows, feedback, drillSolved, sparMoves, stats,
            followUp: followUps.find(f => f.courseId === activeCourse?.id && f.lessonId === lockedLesson.id) || null,
            teacherBotObj, onBackToCourse: () => setLockedLesson(null), onDrillMove: handleDrillMove, onSparringMove: handleSparringMove,
            onStartDrills: startDrills, onNextDrillOrSparring: nextDrillOrSparring, onLaunchSparringBot,
          })
    )
  );
}
