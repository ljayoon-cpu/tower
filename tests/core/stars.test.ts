import { describe, it, expect } from 'vitest';
import { starsFor } from '../../src/core/stars';

describe('stage stars', () => {
  it.each([[20, true, 3], [10, true, 2], [9, true, 1], [0, false, 0], [20, false, 0], [0, true, 0]] as const)(
    '%i lives, won=%s awards %i stars', (lives, won, expected) => {
      expect(starsFor(lives, 20, [0, 0.5, 1], won)).toBe(expected);
    },
  );
  it('uses each stage’s thresholds', () => {
    expect(starsFor(18, 20, [0, 0.4, 0.9], true)).toBe(3);
  });
});
