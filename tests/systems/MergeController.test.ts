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

describe('canMerge with path', () => {
  const at = (level: number, path: 'a' | 'b' | null = null, id = 1) => ({ id, key: 'bolt', level, path });
  it('Lv2 이하는 경로 무관, Lv3+ 는 같은 경로만', () => {
    expect(canMerge(at(2, null, 1), at(2, null, 2), 5)).toBe(true);
    expect(canMerge(at(3, 'a', 1), at(3, 'a', 2), 5)).toBe(true);
    expect(canMerge(at(3, 'a', 1), at(3, 'b', 2), 5)).toBe(false);
    expect(canMerge(at(5, 'a', 1), at(5, 'a', 2), 5)).toBe(false); // 캡
  });
});

describe('mergeResultLevel', () => {
  it('adds one level', () => {
    expect(mergeResultLevel(2)).toBe(3);
  });
});
