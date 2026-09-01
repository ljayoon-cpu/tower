/**
 * MergeController — pure merge-eligibility rules.
 *
 * No Phaser imports: this module is pure logic and must remain testable
 * in isolation. Consumed by the drag-to-merge interaction (Task 16).
 */

export interface MergeCandidate {
  id: number;
  key: string;
  level: number;
  path?: 'a' | 'b' | null;
}

/**
 * Two towers can merge when they are distinct instances of the same tower
 * type at the same level, and that level is still below the cap.
 * At Lv3+, both towers must have taken the same path (if branching exists).
 */
export function canMerge(a: MergeCandidate, b: MergeCandidate, maxLevel: number): boolean {
  return (
    a.id !== b.id &&
    a.key === b.key &&
    a.level === b.level &&
    a.level < maxLevel &&
    ((a.path ?? null) === (b.path ?? null))
  );
}

/** The level of the tower produced by a merge. */
export function mergeResultLevel(level: number): number {
  return level + 1;
}
