import { canMerge, mergeResultLevel } from '../../src/systems/MergeController';
import type { MergeCandidate } from '../../src/systems/MergeController';

const c = (id: number, key: string, level: number): MergeCandidate => ({ id, key, level });

describe('canMerge', () => {
  it('true for same key + same level below max', () => {
    expect(canMerge(c(1, 'arrow', 2), c(2, 'arrow', 2), 5)).toBe(true);
  });
  it('false for different key', () => {
    expect(canMerge(c(1, 'arrow', 2), c(2, 'cannon', 2), 5)).toBe(false);
  });
  it('false for different level', () => {
    expect(canMerge(c(1, 'arrow', 2), c(2, 'arrow', 3), 5)).toBe(false);
  });
  it('false at max level', () => {
    expect(canMerge(c(1, 'arrow', 5), c(2, 'arrow', 5), 5)).toBe(false);
  });
  it('false for same tower (same id)', () => {
    expect(canMerge(c(1, 'arrow', 2), c(1, 'arrow', 2), 5)).toBe(false);
  });
});

describe('mergeResultLevel', () => {
  it('adds one level', () => {
    expect(mergeResultLevel(2)).toBe(3);
  });
});
