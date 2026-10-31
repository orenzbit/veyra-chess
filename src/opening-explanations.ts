// Optional explanations for how a line differs from its opening's main line.
// Source: /data/opening-explanations.json, keyed `${openingId}/${lineId}` -> { he, en }. The file may not exist (yet):
// a 404, a network error, invalid JSON or a malformed entry all resolve to "no explanation", never to an error.

export type OpeningExplanation = { he?: string; en?: string };
export type OpeningExplanationMap = Record<string, OpeningExplanation>;

export const OPENING_EXPLANATIONS_URL = '/data/opening-explanations.json';

type FetchLike = (url: string) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

export function explanationKey(openingId: string, lineId: string): string {
  return `${openingId}/${lineId}`;
}

/** Keeps only entries that carry at least one non-empty string for he or en. */
export function sanitizeExplanations(raw: unknown): OpeningExplanationMap {
  const out: OpeningExplanationMap = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const v = value as Record<string, unknown>;
    const he = typeof v.he === 'string' && v.he.trim() ? v.he.trim() : undefined;
    const en = typeof v.en === 'string' && v.en.trim() ? v.en.trim() : undefined;
    if (he || en) out[key] = { he, en };
  }
  return out;
}

export async function loadOpeningExplanations(fetchFn: FetchLike, url: string = OPENING_EXPLANATIONS_URL): Promise<OpeningExplanationMap> {
  try {
    const res = await fetchFn(url);
    if (!res || !res.ok) return {};
    return sanitizeExplanations(await res.json());
  } catch {
    return {};
  }
}

/** The explanation in the requested language, or null. A missing language is not replaced by the other one. */
export function explanationFor(map: OpeningExplanationMap | null | undefined, openingId: string, lineId: string, lang: 'he' | 'en'): string | null {
  const entry = map ? map[explanationKey(openingId, lineId)] : undefined;
  const text = entry ? entry[lang] : undefined;
  return text || null;
}
