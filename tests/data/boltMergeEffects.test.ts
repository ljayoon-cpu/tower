import { describe, expect, it } from 'vitest';
import { boltStaggerEffect } from '../../src/data/boltMergeEffects';

describe('bolt merge stagger effect', () => {
  it('unlocks its brief movement interrupt only at merge level 3', () => {
    expect(boltStaggerEffect(1)).toBeUndefined();
    expect(boltStaggerEffect(2)).toBeUndefined();
    expect(boltStaggerEffect(3)).toEqual({ durationMs: 120, cooldownMs: 1800 });
    expect(boltStaggerEffect(4)).toEqual({ durationMs: 120, cooldownMs: 1800 });
  });

  it('makes the level 5 interrupt longer without reducing its safety cooldown', () => {
    expect(boltStaggerEffect(5)).toEqual({ durationMs: 250, cooldownMs: 1800 });
  });
});
