// Shared game filters for the DNA lab.
export const FAST_EVENT = /blitz|rapid|bullet|speed|armageddon|titled|online|chess\.?com|lichess|internet|\bicc\b|playchess|simul|blind|odds|casual|exhib|consultation|960|random|freestyle|tie-?break|play-?off|thematic/i;
export const MAJOR_EVENT = /\bw?ch\b|wch|world|championship|match|\bm\.|olympiad|candidates|interzonal|congress|masters/i;
export const RESULTS = new Set(["1-0", "0-1", "1/2-1/2"]);

export function timeControlBaseSeconds(value) {
  const match = String(value || "").match(/^(?:\d+\/)?(\d+)/);
  return match ? Number(match[1]) : null;
}
export function isClassical(headers) {
  if (FAST_EVENT.test(headers.Event || "") || FAST_EVENT.test(headers.Site || "")) return false;
  const base = timeControlBaseSeconds(headers.TimeControl);
  return base === null || base >= 3600;
}
export const yearOf = headers => {
  const match = String(headers.Date || "").match(/^(\d{4})/);
  return match ? Number(match[1]) : null;
};
export const eloOf = value => (/^\d{3,4}$/.test(String(value || "")) ? Number(value) : null);

