export function formatTimeDisplay(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0:00';

  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);

  // Keep a stable mm:ss.t format during the final ten seconds.
  if (totalSeconds < 10) {
    const tenths = Math.floor((ms % 1000) / 100);
    return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
