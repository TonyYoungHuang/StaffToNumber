/** Collapse trailing annotations written by either transposition engine.
 * Legacy titles can have one annotation per operation; sum them before adding
 * the next move so old revisions and new exports share a cumulative title.
 */
export function normalizeScoreTransposeTitle(title: string, semitones = 0, detail?: string) {
  let base = title;
  let total = semitones;
  let latestDetail = detail;
  for (;;) {
    const match = /\s+\(([+-]?\d+) semitones([^()]*)\)$/u.exec(base);
    if (!match) break;
    const move = Number(match[1]);
    if (!Number.isSafeInteger(move) || !Number.isSafeInteger(total + move)) break;
    total += move;
    latestDetail ??= match[2];
    base = base.slice(0, match.index);
  }
  if (total === 0) return base;
  return `${base} (${total > 0 ? "+" : ""}${total} semitones${latestDetail ?? ""})`;
}
