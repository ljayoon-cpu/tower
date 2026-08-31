import { describe, expect, it } from 'vitest';
import { sniperDamageMultiplier, sniperExecuteEffect } from '../../src/data/sniperMergeEffects';

describe('sniper merge execution effect', () => {
  it('unlocks an execution window only from level 3', () => {
    expect(sniperExecuteEffect(1)).toBeUndefined();
    expect(sniperExecuteEffect(2)).toBeUndefined();
    expect(sniperExecuteEffect(3)).toEqual({ healthRatio: 0.3, damageMultiplier: 1.6 });
  });

  it('makes level 5 execute earlier and harder', () => {
    expect(sniperExecuteEffect(5)).toEqual({ healthRatio: 0.4, damageMultiplier: 2.2 });
    expect(sniperDamageMultiplier(5, 0.4)).toBe(2.2);
    expect(sniperDamageMultiplier(5, 0.401)).toBe(1);
  });
});
