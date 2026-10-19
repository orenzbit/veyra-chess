/**
 * Chess DNA selection contract.
 *
 * Only explicit, supported time-class metadata is accepted here. Do not infer
 * a Bullet/Blitz/Rapid bucket from elapsed game duration: it is not a reliable
 * substitute for the platform's time-class metadata.
 */

export type DnaTimeClass = "bullet" | "blitz" | "rapid";
export type DnaGameSource = "chesscom" | "lichess" | "demo" | string;

export interface DnaCandidateGame {
  id: string;
  source: DnaGameSource;
  date: string;
  pgn: string;
  timeClass: string;
}

export interface DnaSelection {
  selected: Record<DnaTimeClass, DnaCandidateGame[]>;
  counts: {
    fetched: number;
    excludedDemo: number;
    excludedInvalid: number;
    excludedUnknownTimeClass: number;
    duplicates: number;
    eligible: number;
    selected: Record<DnaTimeClass, number>;
  };
}

const TIME_CLASSES: readonly DnaTimeClass[] = ["bullet", "blitz", "rapid"];

export function normalizeDnaTimeClass(value: unknown): DnaTimeClass | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return TIME_CLASSES.includes(normalized as DnaTimeClass)
    ? normalized as DnaTimeClass
    : null;
}

/**
 * Stable, whitespace-normalized PGN identity input.
 * The caller should hash this with SHA-256 for persisted cache keys.
 * This intentionally preserves headers and move text: it avoids silently
 * treating materially different records as identical.
 */
export function normalizePgnForDnaFingerprint(pgn: unknown): string {
  if (typeof pgn !== "string") return "";
  return pgn
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .join("\n");
}

function validDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const time = Date.parse(value + "T00:00:00Z");
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) return "";
  return value;
}

/**
 * Pick up to N newest unique real games per supported time class.
 * A fingerprint of normalized PGN is used for dedupe across providers/IDs.
 * Unknown/classical/daily games are deliberately excluded, not guessed.
 */
export function selectLatestDnaGames(
  candidates: readonly DnaCandidateGame[],
  limitPerClass = 25,
): DnaSelection {
  const limit = Number.isFinite(limitPerClass)
    ? Math.max(0, Math.min(25, Math.floor(limitPerClass)))
    : 25;
  const selected: Record<DnaTimeClass, DnaCandidateGame[]> = {
    bullet: [],
    blitz: [],
    rapid: [],
  };
  const seenFingerprints = new Set<string>();
  const counts = {
    fetched: candidates.length,
    excludedDemo: 0,
    excludedInvalid: 0,
    excludedUnknownTimeClass: 0,
    duplicates: 0,
    eligible: 0,
    selected: { bullet: 0, blitz: 0, rapid: 0 } as Record<DnaTimeClass, number>,
  };

  const ordered = [...candidates].sort((a, b) => {
    const dateOrder = validDate(b.date).localeCompare(validDate(a.date));
    return dateOrder || String(a.id || "").localeCompare(String(b.id || ""));
  });

  for (const game of ordered) {
    if (game.source === "demo" || String(game.id || "").startsWith("demo:") || game.id === "demo-opponent-gamma") {
      counts.excludedDemo++;
      continue;
    }
    const timeClass = normalizeDnaTimeClass(game.timeClass);
    if (!timeClass) {
      counts.excludedUnknownTimeClass++;
      continue;
    }
    if (!game.id || !validDate(game.date) || !normalizePgnForDnaFingerprint(game.pgn)) {
      counts.excludedInvalid++;
      continue;
    }

    const fingerprint = normalizePgnForDnaFingerprint(game.pgn);
    if (seenFingerprints.has(fingerprint)) {
      counts.duplicates++;
      continue;
    }
    seenFingerprints.add(fingerprint);
    counts.eligible++;

    if (selected[timeClass].length < limit) selected[timeClass].push(game);
  }

  for (const timeClass of TIME_CLASSES) counts.selected[timeClass] = selected[timeClass].length;
  return { selected, counts };
}
