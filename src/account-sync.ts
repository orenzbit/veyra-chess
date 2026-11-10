export type AccountState = {
  version: 1;
  archiveReviews: Record<string, { accuracy: number; reviewedAt: string }>;
  usernames?: { chesscom?: string; lichess?: string };
  mistakeReview?: { items: any[] };
  language?: "he" | "en";
  adaptiveOptIn?: boolean;
  learningPath?: { done: string[]; days: string[] };
};

// Learn path progress (same rules as src/learn-progress.ts; inlined because this module is loaded on its own by check scripts).
const learnList = (value: unknown, re: RegExp, max: number, sort = false) => {
  const items = [...new Set(Array.isArray(value) ? value.filter((x): x is string => typeof x === "string" && re.test(x)) : [])];
  return (sort ? items.sort() : items).slice(-max);
};
const learnPath = (raw: any) => ({ done: learnList(raw?.done, /^[a-z0-9:_-]{1,120}$/i, 1000), days: learnList(raw?.days, /^\d{4}-\d{2}-\d{2}$/, 3660, true) });
// Mistake review items (src/mistake-review.ts validates them; the server's sanitizeAppState is the trust boundary).
// Union by id; for the same id the copy updated last wins.
const mistakeItems = (raw: any): any[] => Array.isArray(raw?.items) ? raw.items.filter((item: any) => item && typeof item.id === "string" && item.id.length <= 120) : [];
const mergeMistakes = (a: any, b: any) => ({ items: [...new Map([...mistakeItems(a), ...mistakeItems(b)].sort((x, y) => String(x.updated || "").localeCompare(String(y.updated || ""))).map(item => [item.id, item])).values()] });

const validDate = (value: unknown) => {
  const time = Date.parse(String(value || ""));
  return Number.isFinite(time) ? time : 0;
};

export function normalizeAccountState(input: unknown): AccountState {
  const raw = input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, any> : {};
  const reviews: AccountState["archiveReviews"] = {};
  const rawReviews = raw.archiveReviews && typeof raw.archiveReviews === "object" && !Array.isArray(raw.archiveReviews)
    ? raw.archiveReviews : {};
  for (const [id, item] of Object.entries(rawReviews).sort((a, b) => validDate((b[1] as any)?.reviewedAt) - validDate((a[1] as any)?.reviewedAt)).slice(0, 500)) {
    if (!id || id.length > 300 || !item || typeof item !== "object") continue;
    const accuracy = Number((item as any).accuracy);
    const reviewedAt = String((item as any).reviewedAt || "");
    if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100 || !validDate(reviewedAt)) continue;
    reviews[id] = { accuracy, reviewedAt: new Date(reviewedAt).toISOString() };
  }
  const state: AccountState = { version: 1, archiveReviews: reviews };
  const usernames = raw.usernames && typeof raw.usernames === "object" && !Array.isArray(raw.usernames)
    ? raw.usernames : {};
  if (typeof usernames.chesscom === "string") state.usernames = { ...(state.usernames || {}), chesscom: usernames.chesscom.trim().slice(0, 100) };
  if (typeof usernames.lichess === "string") state.usernames = { ...(state.usernames || {}), lichess: usernames.lichess.trim().slice(0, 100) };
  if (raw.language === "he" || raw.language === "en") state.language = raw.language;
  if (typeof raw.adaptiveOptIn === "boolean") state.adaptiveOptIn = raw.adaptiveOptIn;
  if (raw.learningPath) state.learningPath = learnPath(raw.learningPath);
  if (raw.mistakeReview) state.mistakeReview = { items: mistakeItems(raw.mistakeReview).slice(0, 1000) };
  return state;
}

export function mergeAccountState(localInput: unknown, remoteInput: unknown): AccountState {
  const local = normalizeAccountState(localInput);
  const remote = normalizeAccountState(remoteInput);
  const archiveReviews = { ...local.archiveReviews };
  for (const [id, review] of Object.entries(remote.archiveReviews)) {
    const previous = archiveReviews[id];
    if (!previous || validDate(review.reviewedAt) >= validDate(previous.reviewedAt)) archiveReviews[id] = review;
  }
  return normalizeAccountState({
    version: 1,
    archiveReviews,
    usernames: {
      chesscom: remote.usernames?.chesscom || local.usernames?.chesscom || "",
      lichess: remote.usernames?.lichess || local.usernames?.lichess || "",
    },
    language: remote.language || local.language,
    adaptiveOptIn: typeof remote.adaptiveOptIn === "boolean" ? remote.adaptiveOptIn : local.adaptiveOptIn,
    learningPath: local.learningPath || remote.learningPath
      ? learnPath({ done: [...(local.learningPath?.done || []), ...(remote.learningPath?.done || [])], days: [...(local.learningPath?.days || []), ...(remote.learningPath?.days || [])] })
      : undefined,
    mistakeReview: local.mistakeReview || remote.mistakeReview ? mergeMistakes(local.mistakeReview, remote.mistakeReview) : undefined,
  });
}
