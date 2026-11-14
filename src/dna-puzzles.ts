// After a Chess DNA report is saved, start the personal-puzzle job too, so the player's own mistakes become
// puzzles without a second button on the puzzles page. Never throws: the DNA report is already saved.
export type DnaPuzzleOutcome = 'started' | 'already_running' | 'disabled' | 'daily_cap' | 'failed';
type FetchLike = (input: string, init?: any) => Promise<any>;

export async function startPuzzlesAfterDna(fetchImpl: FetchLike = (u, i) => fetch(u, i)): Promise<DnaPuzzleOutcome> {
  let res: any; let data: any = null;
  try {
    res = await fetchImpl('/api/puzzles?action=dna', {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ source: 'auto', limit: 40 }),
    });
    try { data = await res.json(); } catch { data = null; }
  } catch { return 'failed'; }
  if (res.status === 409) return 'already_running';
  if (res.status === 404 && data?.error === 'DISABLED') return 'disabled';
  if (res.status === 429) return 'daily_cap';
  const jobId = data?.ok && typeof data.jobId === 'string' ? data.jobId : '';
  if (res.status < 200 || res.status >= 300 || !jobId) return 'failed';
  try {
    const bg = await fetchImpl('/api/puzzle-refill-background', {
      method: 'POST', credentials: 'same-origin', keepalive: true,
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jobId }),
    });
    return bg.status === 202 || bg.status === 200 ? 'started' : 'failed';
  } catch { return 'failed'; }
}

export function dnaPuzzleStatus(o: DnaPuzzleOutcome): string {
  switch (o) {
    case 'started': return ' עכשיו אני הופך את הטעויות שלך לפאזלים. בעוד כמה דקות הם יופיעו ב"אימון אישי" בדף הפאזלים.';
    case 'already_running': return ' בניית הפאזלים מהטעויות שלך כבר רצה. התוצאה תופיע ב"אימון אישי" בדף הפאזלים.';
    case 'daily_cap': return ' להיום כבר נבנו לך פאזלים מהמכסה היומית. מחר ייבנו עוד מהטעויות שלך.';
    case 'disabled': return '';
    default: return ' לא הצלחתי להתחיל לבנות פאזלים מהטעויות שלך. אפשר ללחוץ "הרץ DNA על המשחקים שלי" בדף הפאזלים.';
  }
}
