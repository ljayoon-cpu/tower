export function starsFor(
  livesLeft: number,
  livesStart: number,
  thresholds: [number, number, number],
  won: boolean,
): number {
  if (!won || livesLeft <= 0 || livesStart <= 0) return 0;
  const ratio = livesLeft / livesStart;
  if (ratio >= thresholds[2]) return 3;
  if (ratio >= thresholds[1]) return 2;
  return 1;
}
