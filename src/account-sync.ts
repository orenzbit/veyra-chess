export type AccountState = {
  version: 1;
  archiveReviews: Record<string, { accuracy: number; reviewedAt: string; rating?: number; opponentRating?: number }>;
  usernames?: { chesscom?: string; lichess?: string };
  language?: "he" | "en";
  adaptiveOptIn?: boolean;
  learningPath?: { done: string[]; days: string[] };
  archive?: { provider: "chesscom" | "lichess"; username: string };
  puzzleBestStreak?: number;
};

// Learn path progress (same rules as src/learn-progress.ts; inlined because this module is loaded on its own by check scripts).
const learnList = (value: unknown, re: RegExp, max: number, sort = false) => {
  const items = [...new Set(Array.isArray(value) ? value.filter((x): x is string => typeof x === "string" && re.test(x)) : [])];
  return (sort ? items.sort() : items).slice(-max);
};
const learnPath = (raw: any) => ({ done: learnList(raw?.done, /^[a-z0-9:_-]{1,120}$/i, 1000), days: learnList(raw?.days, /^\d{4}-\d{2}-\d{2}$/, 3660, true) });

const validRating = (value: unknown) => value !== null && value !== "" && Number.isFinite(Number(value)) && Number(value) >= 100 && Number(value) <= 4000;

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
    for (const key of ["rating", "opponentRating"] as const) if (validRating((item as any)[key])) reviews[id][key] = Math.round(Number((item as any)[key]));
  }
  const state: AccountState = { version: 1, archiveReviews: reviews };
  const usernames = raw.usernames && typeof raw.usernames === "object" && !Array.isArray(raw.usernames)
    ? raw.usernames : {};
  if (typeof usernames.chesscom === "string") state.usernames = { ...(state.usernames || {}), chesscom: usernames.chesscom.trim().slice(0, 100) };
  if (typeof usernames.lichess === "string") state.usernames = { ...(state.usernames || {}), lichess: usernames.lichess.trim().slice(0, 100) };
  if (raw.language === "he" || raw.language === "en") state.language = raw.language;
  if (typeof raw.adaptiveOptIn === "boolean") state.adaptiveOptIn = raw.adaptiveOptIn;
  if (raw.learningPath) state.learningPath = learnPath(raw.learningPath);
  const archive = raw.archive && typeof raw.archive === "object" ? raw.archive : null;
  if (archive && (archive.provider === "chesscom" || archive.provider === "lichess") && typeof archive.username === "string" && archive.username.trim()) state.archive = { provider: archive.provider, username: archive.username.trim().slice(0, 100) };
  if (Number.isInteger(raw.puzzleBestStreak) && raw.puzzleBestStreak > 0 && raw.puzzleBestStreak <= 100000) state.puzzleBestStreak = raw.puzzleBestStreak;
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
    archive: remote.archive || local.archive,
    puzzleBestStreak: Math.max(remote.puzzleBestStreak || 0, local.puzzleBestStreak || 0) || undefined,
  });
}
