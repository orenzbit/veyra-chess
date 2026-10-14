export type AccountState = {
  version: 1;
  archiveReviews: Record<string, { accuracy: number; reviewedAt: string }>;
  usernames?: { chesscom?: string; lichess?: string };
  language?: "he" | "en";
  adaptiveOptIn?: boolean;
};

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
  return {
    version: 1,
    archiveReviews,
    usernames: {
      chesscom: remote.usernames?.chesscom || local.usernames?.chesscom || "",
      lichess: remote.usernames?.lichess || local.usernames?.lichess || "",
    },
    language: remote.language || local.language,
    adaptiveOptIn: typeof remote.adaptiveOptIn === "boolean" ? remote.adaptiveOptIn : local.adaptiveOptIn,
  };
}
