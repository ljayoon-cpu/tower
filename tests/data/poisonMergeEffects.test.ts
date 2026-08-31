import { describe, expect, it } from 'vitest';
import { poisonArmorPierceEffect } from '../../src/data/poisonMergeEffects';

describe('poison merge armor-pierce effect', () => {
  it('unlocks poison armor-piercing damage from level 3', () => {
    expect(poisonArmorPierceEffect(1)).toBeUndefined();
    expect(poisonArmorPierceEffect(2)).toBeUndefined();
    expect(poisonArmorPierceEffect(3)).toEqual({ armorPierce: 8 });
  });

  it('makes level 5 ignore more armor', () => {
    expect(poisonArmorPierceEffect(5)).toEqual({ armorPierce: 15 });
  });
});
