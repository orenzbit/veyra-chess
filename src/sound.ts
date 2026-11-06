/**
 * Central board / clock sound module for Veyra Chess.
 * Uses the Lichess "standard" theme served from their public CDN
 * (CORS enabled). Mute is global, defaults to enabled, and is stored
 * in localStorage under SOUND_MUTE_KEY.
 */

const SOUND_MUTE_KEY = 'veyra_sound_muted_v1';
const CDN_BASE = 'https://lichess1.org/assets/sound/standard';

export type SoundName =
  | 'Move'
  | 'Capture'
  | 'Check'
  | 'Checkmate'
  | 'LowTime'
  | 'Victory'
  | 'Defeat'
  | 'Draw'
  | 'CountDown0'
  | 'CountDown1'
  | 'CountDown2'
  | 'CountDown3'
  | 'CountDown4'
  | 'CountDown5'
  | 'CountDown6'
  | 'CountDown7'
  | 'CountDown8'
  | 'CountDown9'
  | 'CountDown10';

const SOURCES: Record<SoundName, string[]> = {
  Move: [`${CDN_BASE}/Move.ogg`, `${CDN_BASE}/Move.mp3`],
  Capture: [`${CDN_BASE}/Capture.ogg`, `${CDN_BASE}/Capture.mp3`],
  Check: [`${CDN_BASE}/Check.ogg`, `${CDN_BASE}/Check.mp3`],
  Checkmate: [`${CDN_BASE}/Checkmate.ogg`, `${CDN_BASE}/Checkmate.mp3`],
  LowTime: [`${CDN_BASE}/LowTime.ogg`, `${CDN_BASE}/LowTime.mp3`],
  Victory: [`${CDN_BASE}/Victory.ogg`, `${CDN_BASE}/Victory.mp3`],
  Defeat: [`${CDN_BASE}/Defeat.ogg`, `${CDN_BASE}/Defeat.mp3`],
  Draw: [`${CDN_BASE}/Draw.ogg`, `${CDN_BASE}/Draw.mp3`],
  CountDown0: [`${CDN_BASE}/CountDown0.ogg`, `${CDN_BASE}/CountDown0.mp3`],
  CountDown1: [`${CDN_BASE}/CountDown1.ogg`, `${CDN_BASE}/CountDown1.mp3`],
  CountDown2: [`${CDN_BASE}/CountDown2.ogg`, `${CDN_BASE}/CountDown2.mp3`],
  CountDown3: [`${CDN_BASE}/CountDown3.ogg`, `${CDN_BASE}/CountDown3.mp3`],
  CountDown4: [`${CDN_BASE}/CountDown4.ogg`, `${CDN_BASE}/CountDown4.mp3`],
  CountDown5: [`${CDN_BASE}/CountDown5.ogg`, `${CDN_BASE}/CountDown5.mp3`],
  CountDown6: [`${CDN_BASE}/CountDown6.ogg`, `${CDN_BASE}/CountDown6.mp3`],
  CountDown7: [`${CDN_BASE}/CountDown7.ogg`, `${CDN_BASE}/CountDown7.mp3`],
  CountDown8: [`${CDN_BASE}/CountDown8.ogg`, `${CDN_BASE}/CountDown8.mp3`],
  CountDown9: [`${CDN_BASE}/CountDown9.ogg`, `${CDN_BASE}/CountDown9.mp3`],
  CountDown10: [`${CDN_BASE}/CountDown10.ogg`, `${CDN_BASE}/CountDown10.mp3`],
};

let muted = loadMuted();
let unlocked = false;
const cache = new Map<SoundName, HTMLAudioElement>();

function loadMuted(): boolean {
  try {
    const raw = localStorage.getItem(SOUND_MUTE_KEY);
    // default: sound ON (muted = false)
    if (raw === null) return false;
    return raw === '1';
  } catch {
    return false;
  }
}

function persistMuted(value: boolean) {
  try {
    localStorage.setItem(SOUND_MUTE_KEY, value ? '1' : '0');
  } catch {}
}

function getAudio(name: SoundName): HTMLAudioElement | null {
  let audio = cache.get(name);
  if (audio) return audio;
  const sources = SOURCES[name];
  if (!sources) return null;
  audio = new Audio();
  // Prefer first source the browser can play; set both via <source> is not needed for .src
  audio.src = sources[0]; // ogg first, falls back on error if needed
  audio.preload = 'auto';
  audio.volume = 0.7;
  cache.set(name, audio);
  return audio;
}

/** Call once from any trusted user gesture (click / keydown) so mobile browsers allow playback. */
export function unlockAudio(): void {
  if (unlocked) return;
  unlocked = true;
  // Play + immediately pause a silent tick so the AudioContext is allowed.
  try {
    const a = getAudio('Move');
    if (a) {
      a.volume = 0;
      const p = a.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          a.pause();
          a.currentTime = 0;
          a.volume = 0.7;
        }).catch(() => {
          a.volume = 0.7;
        });
      } else {
        a.volume = 0.7;
      }
    }
  } catch {
    // ignore
  }
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = !!value;
  persistMuted(muted);
}

export function toggleMute(): boolean {
  setMuted(!muted);
  return muted;
}

export function playSound(name: SoundName): void {
  if (muted) return;
  try {
    const audio = getAudio(name);
    if (!audio) return;
    // Restart from the beginning if already playing
    audio.currentTime = 0;
    const p = audio.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch {
    // ignore playback errors (autoplay blocked, missing file, etc.)
  }
}

export function playMove(): void {
  playSound('Move');
}

export function playCapture(): void {
  playSound('Capture');
}

export function playCheck(): void {
  playSound('Check');
}

export function playCheckmate(): void {
  playSound('Checkmate');
}

export function playLowTime(): void {
  playSound('LowTime');
}

export function playVictory(): void {
  playSound('Victory');
}

export function playDefeat(): void {
  playSound('Defeat');
}

export function playDraw(): void {
  playSound('Draw');
}

/** n is the remaining seconds to announce (0–10). */
export function playCountdown(n: number): void {
  const clamped = Math.max(0, Math.min(10, Math.floor(n)));
  playSound(`CountDown${clamped}` as SoundName);
}

/**
 * Decide which sound to play for a chess.js move object.
 * Prefer Checkmate > Check > Capture > Move.
 */
export function playForMove(move: { captured?: string; flags?: string } | null | undefined, game: { isCheckmate?: () => boolean; isCheck?: () => boolean } | null | undefined): void {
  if (!move) {
    playMove();
    return;
  }
  if (game?.isCheckmate?.()) {
    playCheckmate();
    return;
  }
  if (game?.isCheck?.()) {
    playCheck();
    return;
  }
  if (move.captured) {
    playCapture();
    return;
  }
  playMove();
}

/** Preload the most common sounds so the first move is not delayed. */
export function preloadCommonSounds(): void {
  (['Move', 'Capture', 'Check', 'Checkmate', 'LowTime', 'Victory', 'Defeat', 'Draw'] as SoundName[]).forEach(getAudio);
}
