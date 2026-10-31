/** Select the same required lines for the trainer and server-side completion validation. */
export function coreLines(opening) {
  const need = Math.min(6, opening.lines.length);
  const selected = opening.lines.filter(line => line.star);
  for (const line of opening.lines) {
    if (selected.length >= need) break;
    if (!line.star) selected.push(line);
  }
  return selected;
}
