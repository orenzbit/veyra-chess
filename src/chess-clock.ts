import { getLang } from './i18n.js';

// React globals defined in runtime environment
declare const React: any;
const h = React.createElement;
const { useState, useEffect, useRef } = React;

export interface ClockPreset {
  id: string;
  name: string;
  minutes: number;
  increment: number;
  category: 'bullet' | 'blitz' | 'rapid' | 'classical' | 'custom';
}

export const CLOCK_PRESETS: ClockPreset[] = [
  { id: '1_0', name: '1+0', minutes: 1, increment: 0, category: 'bullet' },
  { id: '1_1', name: '1+1', minutes: 1, increment: 1, category: 'bullet' },
  { id: '2_1', name: '2+1', minutes: 2, increment: 1, category: 'bullet' },
  { id: '3_0', name: '3+0', minutes: 3, increment: 0, category: 'blitz' },
  { id: '3_2', name: '3+2', minutes: 3, increment: 2, category: 'blitz' },
  { id: '5_0', name: '5+0', minutes: 5, increment: 0, category: 'blitz' },
  { id: '5_3', name: '5+3', minutes: 5, increment: 3, category: 'blitz' },
  { id: '10_0', name: '10+0', minutes: 10, increment: 0, category: 'rapid' },
  { id: '15_10', name: '15+10', minutes: 15, increment: 10, category: 'rapid' },
  { id: '30_0', name: '30+0', minutes: 30, increment: 0, category: 'rapid' },
  { id: '60_0', name: '60+0', minutes: 60, increment: 0, category: 'classical' },
];

// Simple Synthesized Web Audio Beeper for click and flag sounds
function playAudioTone(freq: number, durationMs: number, type: OscillatorType = 'sine') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {}
}

export function formatTimeDisplay(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);

  // If under 10 seconds, display tenths of a second (e.g. 0:08.4)
  if (totalSeconds < 10) {
    const tenths = Math.floor((ms % 1000) / 100);
    return `${seconds}.${tenths}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function ChessClockPage({ onBack }: { onBack: () => void }) {
  const en = getLang() === 'en';

  // Preset configuration
  const [selectedPreset, setSelectedPreset] = useState(CLOCK_PRESETS[3]); // 3+0 default
  const [customMinutes, setCustomMinutes] = useState(5);
  const [customInc, setCustomInc] = useState(3);
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  // Clock state
  const [whiteMs, setWhiteMs] = useState(3 * 60 * 1000);
  const [blackMs, setBlackMs] = useState(3 * 60 * 1000);
  const [activeSide, setActiveSide] = useState('white');
  const [state, setState] = useState('idle');
  const [flaggedSide, setFlaggedSide] = useState(null);

  const [whiteMoves, setWhiteMoves] = useState(0);
  const [blackMoves, setBlackMoves] = useState(0);

  // Refs for high-precision time calculation
  const lastTickRef = useRef(0);
  const timerRef = useRef(null);
  const lastTapTimeRef = useRef(0);

  // Apply new preset
  const applyPreset = (preset: ClockPreset) => {
    setSelectedPreset(preset);
    const ms = preset.minutes * 60 * 1000;
    setWhiteMs(ms);
    setBlackMs(ms);
    setActiveSide('white');
    setState('idle');
    setFlaggedSide(null);
    setWhiteMoves(0);
    setBlackMoves(0);
  };

  // High precision timer loop
  useEffect(() => {
    if (state !== 'running') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    lastTickRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      if (activeSide === 'white') {
        setWhiteMs(prev => {
          const next = prev - delta;
          if (next <= 0) {
            setState('flagged');
            setFlaggedSide('white');
            playAudioTone(220, 600, 'sawtooth');
            return 0;
          }
          return next;
        });
      } else {
        setBlackMs(prev => {
          const next = prev - delta;
          if (next <= 0) {
            setState('flagged');
            setFlaggedSide('black');
            playAudioTone(220, 600, 'sawtooth');
            return 0;
          }
          return next;
        });
      }
    }, 40);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state, activeSide]);

  // Turn switcher handler with debounce
  const handleTap = (side: 'white' | 'black') => {
    const now = Date.now();
    if (now - lastTapTimeRef.current < 120) return; // Prevent ghost clicks / double taps
    lastTapTimeRef.current = now;

    if (state === 'flagged') return;

    // White moves first in chess. Ignore a black-side tap before the clock starts.
    if (state === 'idle') {
      if (side !== 'white') return;
      playAudioTone(600, 80);
      setState('running');
      // White has completed the first move; add increment and start Black's clock.
      setWhiteMoves(m => m + 1);
      if (selectedPreset.increment > 0) setWhiteMs(m => m + selectedPreset.increment * 1000);
      setActiveSide('black');
      return;
    }

    if (state === 'paused') {
      // Resume
      setState('running');
      return;
    }

    // Only active side can switch clock
    if (side !== activeSide) return;

    playAudioTone(600, 80);

    if (activeSide === 'white') {
      setWhiteMoves(m => m + 1);
      if (selectedPreset.increment > 0) setWhiteMs(m => m + selectedPreset.increment * 1000);
      setActiveSide('black');
    } else {
      setBlackMoves(m => m + 1);
      if (selectedPreset.increment > 0) setBlackMs(m => m + selectedPreset.increment * 1000);
      setActiveSide('white');
    }
  };

  // Keyboard shortcut listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (state === 'running') {
          handleTap(activeSide);
        } else if (state === 'idle') {
          handleTap('white');
        } else if (state === 'paused') {
          setState('running');
        }
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (state === 'running') setState('paused');
        else if (state === 'paused') setState('running');
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        applyPreset(selectedPreset);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state, activeSide, selectedPreset]);

  // Pause / Resume toggle
  const togglePause = () => {
    if (state === 'running') {
      setState('paused');
    } else if (state === 'paused') {
      setState('running');
    }
  };

  // Reset clock
  const handleReset = () => {
    applyPreset(selectedPreset);
  };

  const handleApplyCustom = (e: any) => {
    e.preventDefault();
    const p: ClockPreset = {
      id: `custom_${customMinutes}_${customInc}`,
      name: `${customMinutes}+${customInc}`,
      minutes: Math.max(1, Math.min(180, Number(customMinutes) || 5)),
      increment: Math.max(0, Math.min(60, Number(customInc) || 0)),
      category: 'custom'
    };
    applyPreset(p);
    setIsCustomOpen(false);
  };

  return h('div', { className: 'app-shell chess-clock-shell' },
    // Topbar header
    h('header', { className: 'topbar' },
      h('div', { className: 'brand product-brand' },
        h('span', { className: 'product-brand-name' }, 'VEYRA CHESS'),
        h('span', { className: 'product-brand-divider', 'aria-hidden': true }, '·'),
        h('span', { className: 'product-brand-section' }, en ? 'Chess Clock' : 'שעון שחמט')
      ),
      h('div', { className: 'top-actions' },
        h('span', { className: 'stage-pill' }, selectedPreset.name),
        h('button', { onClick: onBack }, en ? 'Back' : 'חזרה')
      )
    ),

    // Preset selection strip
    h('div', { className: 'clock-presets-strip' },
      CLOCK_PRESETS.map(p =>
        h('button', {
          key: p.id,
          className: `preset-pill ${selectedPreset.id === p.id && !isCustomOpen ? 'active' : ''}`,
          onClick: () => { setIsCustomOpen(false); applyPreset(p); }
        }, p.name)
      ),
      h('button', {
        className: `preset-pill ${isCustomOpen ? 'active' : ''}`,
        onClick: () => setIsCustomOpen(!isCustomOpen)
      }, en ? '⚙ Custom' : '⚙ מותאם אישית')
    ),

    // Custom time configuration panel
    isCustomOpen && h('form', { className: 'custom-clock-form', onSubmit: handleApplyCustom },
      h('div', { className: 'custom-field' },
        h('label', null, en ? 'Minutes' : 'דקות'),
        h('input', {
          type: 'number',
          min: 1,
          max: 180,
          value: customMinutes,
          onChange: (e: any) => setCustomMinutes(Math.max(1, Number(e.target.value)))
        })
      ),
      h('div', { className: 'custom-field' },
        h('label', null, en ? 'Increment (sec)' : 'תוספת בשניות'),
        h('input', {
          type: 'number',
          min: 0,
          max: 60,
          value: customInc,
          onChange: (e: any) => setCustomInc(Math.max(0, Number(e.target.value)))
        })
      ),
      h('button', { type: 'submit', className: 'primary' }, en ? 'Set Time' : 'החל זמן')
    ),

    // Main Clock Viewport (Black & White Clocks)
    h('main', { className: 'clock-viewport' },
      // Black Clock Block (Top or Left)
      h('div', {
        className: `clock-box-main black-side ${activeSide === 'black' && state === 'running' ? 'active' : ''} ${flaggedSide === 'black' ? 'flagged' : ''} ${blackMs < 30000 && state === 'running' && activeSide === 'black' ? 'low-time' : ''}`,
        onClick: () => handleTap('black')
      },
        h('div', { className: 'clock-meta-row' },
          h('span', { className: 'clock-side-label' }, en ? 'Black' : 'שחור'),
          h('span', { className: 'clock-moves-badge' }, `${en ? 'Moves' : 'מהלכים'}: ${blackMoves}`)
        ),
        h('div', { className: 'clock-digits' }, formatTimeDisplay(blackMs)),
        flaggedSide === 'black' && h('div', { className: 'flag-alert' }, en ? 'TIME OUT!' : 'נגמר הזמן!')
      ),

      // Center controls strip
      h('div', { className: 'clock-controls-bar' },
        h('button', {
          className: 'ctrl-btn pause-btn',
          title: state === 'running' ? (en ? 'Pause (P)' : 'השהה (P)') : (en ? 'Resume (P)' : 'המשך (P)'),
          disabled: state === 'idle' || state === 'flagged',
          onClick: togglePause
        }, state === 'running' ? '⏸' : '▶'),

        h('button', {
          className: 'ctrl-btn reset-btn',
          title: en ? 'Reset (R)' : 'איפוס (R)',
          onClick: handleReset
        }, '↺'),

        h('div', { className: 'clock-state-indicator' },
          state === 'idle' ? (en ? 'Tap to start' : 'לחץ להתחלה') :
          state === 'paused' ? (en ? 'PAUSED' : 'מושהה') :
          state === 'flagged' ? (en ? 'GAME OVER' : 'המשחק הסתיים') :
          (en ? 'RUNNING' : 'פעיל')
        )
      ),

      // White Clock Block (Bottom or Right)
      h('div', {
        className: `clock-box-main white-side ${activeSide === 'white' && state === 'running' ? 'active' : ''} ${flaggedSide === 'white' ? 'flagged' : ''} ${whiteMs < 30000 && state === 'running' && activeSide === 'white' ? 'low-time' : ''}`,
        onClick: () => handleTap('white')
      },
        h('div', { className: 'clock-meta-row' },
          h('span', { className: 'clock-side-label' }, en ? 'White' : 'לבן'),
          h('span', { className: 'clock-moves-badge' }, `${en ? 'Moves' : 'מהלכים'}: ${whiteMoves}`)
        ),
        h('div', { className: 'clock-digits' }, formatTimeDisplay(whiteMs)),
        flaggedSide === 'white' && h('div', { className: 'flag-alert' }, en ? 'TIME OUT!' : 'נגמר הזמן!')
      )
    )
  );
}

