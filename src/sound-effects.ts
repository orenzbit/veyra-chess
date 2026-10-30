// Web Audio API Synthesizer for Veyra Chess Sound Effects
// Zero external audio assets, zero latency, 100% synthetic browser audio.

export type SoundType = 'normal' | 'capture' | 'castle' | 'check' | 'checkmate' | 'clock-tap' | 'clock-flag';

const MUTE_STORAGE_KEY = 'veyra_sound_muted';

let isMutedInMemory: boolean | null = null;

export function isAudioMuted(): boolean {
  if (isMutedInMemory !== null) return isMutedInMemory;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      isMutedInMemory = window.localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
      return isMutedInMemory;
    }
  } catch {}
  return false;
}

export function setAudioMuted(muted: boolean): void {
  isMutedInMemory = muted;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(MUTE_STORAGE_KEY, muted ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('veyra-audio-mute-change', { detail: { muted } }));
    }
  } catch {}
}

export function toggleAudioMuted(): boolean {
  const next = !isAudioMuted();
  setAudioMuted(next);
  return next;
}

// Low-level tone generator using AudioContext
export function playAudioTone(freq: number, durationMs: number, type: OscillatorType = 'sine', gainPeak = 0.12): void {
  if (isAudioMuted()) return;
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(gainPeak, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);

    // Auto close context to conserve resources after playback ends
    setTimeout(() => {
      try {
        if (ctx.state !== 'closed') ctx.close().catch(() => {});
      } catch {}
    }, durationMs + 100);
  } catch {}
}

// Multi-tone sequence generator (e.g. for castling or checkmate arpeggio)
export function playToneSequence(notes: Array<{ freq: number; durationMs: number; type?: OscillatorType; delayMs: number; gainPeak?: number }>): void {
  if (isAudioMuted()) return;
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    let maxEndMs = 0;
    for (const note of notes) {
      const startTime = ctx.currentTime + note.delayMs / 1000;
      const durationSec = note.durationMs / 1000;
      const endTime = startTime + durationSec;
      if (note.delayMs + note.durationMs > maxEndMs) {
        maxEndMs = note.delayMs + note.durationMs;
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = note.type || 'sine';
      osc.frequency.setValueAtTime(note.freq, startTime);

      const peak = note.gainPeak || 0.12;
      gain.gain.setValueAtTime(peak, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, endTime);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(endTime);
    }

    setTimeout(() => {
      try {
        if (ctx.state !== 'closed') ctx.close().catch(() => {});
      } catch {}
    }, maxEndMs + 100);
  } catch {}
}

export function classifyMoveSound(moveResult: any, game?: any): SoundType {
  // Check for checkmate first
  const isMate = Boolean(
    game?.isCheckmate?.() ||
    (typeof moveResult?.san === 'string' && moveResult.san.includes('#'))
  );
  if (isMate) return 'checkmate';

  // Check for check next
  const isCheck = Boolean(
    game?.inCheck?.() ||
    game?.isCheck?.() ||
    (typeof moveResult?.san === 'string' && moveResult.san.includes('+'))
  );
  if (isCheck) return 'check';

  // Check for castling
  const san = typeof moveResult?.san === 'string' ? moveResult.san : '';
  const flags = typeof moveResult?.flags === 'string' ? moveResult.flags : '';
  if (san === 'O-O' || san === 'O-O-O' || flags.includes('k') || flags.includes('q')) {
    return 'castle';
  }

  // Check for capture
  if (moveResult?.captured !== undefined && moveResult?.captured !== null && moveResult?.captured !== false) {
    return 'capture';
  }

  return 'normal';
}

export function playSound(type: SoundType): void {
  switch (type) {
    case 'normal':
      // 580Hz, 60ms, sine
      playAudioTone(580, 60, 'sine', 0.12);
      break;

    case 'capture':
      // 850Hz, 90ms, triangle
      playAudioTone(850, 90, 'triangle', 0.14);
      break;

    case 'castle':
      // Two quick tones: 520Hz then 680Hz, 60ms each
      playToneSequence([
        { freq: 520, durationMs: 60, delayMs: 0, type: 'sine', gainPeak: 0.12 },
        { freq: 680, durationMs: 60, delayMs: 70, type: 'sine', gainPeak: 0.12 }
      ]);
      break;

    case 'check':
      // 1050Hz, 140ms, square/triangle
      playAudioTone(1050, 140, 'square', 0.13);
      break;

    case 'checkmate':
      // Descending triad chord / arpeggio: 1200Hz -> 800Hz -> 400Hz, total ~400ms, sawtooth
      playToneSequence([
        { freq: 1200, durationMs: 120, delayMs: 0, type: 'sawtooth', gainPeak: 0.12 },
        { freq: 800, durationMs: 130, delayMs: 120, type: 'sawtooth', gainPeak: 0.13 },
        { freq: 400, durationMs: 160, delayMs: 240, type: 'sawtooth', gainPeak: 0.14 }
      ]);
      break;

    case 'clock-tap':
      // 600Hz, 80ms, sine
      playAudioTone(600, 80, 'sine', 0.12);
      break;

    case 'clock-flag':
      // 220Hz, 600ms, sawtooth
      playAudioTone(220, 600, 'sawtooth', 0.15);
      break;
  }
}

export function playMoveSound(moveResult: any, game?: any): SoundType {
  const type = classifyMoveSound(moveResult, game);
  playSound(type);
  return type;
}

// React Global Audio Toggle Button component
declare const React: any;
export function GlobalAudioButton() {
  const [muted, setMuted] = React.useState(() => isAudioMuted());

  React.useEffect(() => {
    const handler = (e: any) => {
      setMuted(Boolean(e.detail?.muted));
    };
    window.addEventListener('veyra-audio-mute-change', handler);
    return () => window.removeEventListener('veyra-audio-mute-change', handler);
  }, []);

  return React.createElement('button', {
    className: 'audio-toggle',
    title: muted ? 'צלילים: כבוי (לחץ להפעלה)' : 'צלילים: פעיל (לחץ להשתקה)',
    'aria-label': muted ? 'Muted. Click to enable sound' : 'Sound active. Click to mute',
    onClick: () => {
      const next = toggleAudioMuted();
      setMuted(next);
      if (!next) {
        // Play gentle chime on unmute to confirm audio works
        playAudioTone(600, 70, 'sine', 0.1);
      }
    }
  }, muted ? '🔇' : '🔊');
}
