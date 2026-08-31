import { frostFreezeEffect } from '../../src/data/mergeEffects';

describe('merge effects', () => {
  it('unlocks frost freeze at merge levels 3 and 5 only', () => {
    expect(frostFreezeEffect(1)).toBeUndefined();
    expect(frostFreezeEffect(2)).toBeUndefined();
    expect(frostFreezeEffect(3)).toEqual({ hits: 3, durationMs: 350, cooldownMs: 4000 });
    expect(frostFreezeEffect(4)).toEqual({ hits: 3, durationMs: 350, cooldownMs: 4000 });
    expect(frostFreezeEffect(5)).toEqual({ hits: 3, durationMs: 700, cooldownMs: 3000 });
  });
});
