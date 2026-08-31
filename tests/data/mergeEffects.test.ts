import {
  frostFreezeEffect, boltStaggerEffect, poisonArmorPierceEffect,
  sniperExecuteEffect, sniperDamageMultiplier,
} from '../../src/data/mergeEffects';

describe('merge effects', () => {
  it('unlocks frost freeze at merge levels 3 and 5 only', () => {
    expect(frostFreezeEffect(1)).toBeUndefined();
    expect(frostFreezeEffect(2)).toBeUndefined();
    expect(frostFreezeEffect(3)).toEqual({ hits: 3, durationMs: 350, cooldownMs: 4000 });
    expect(frostFreezeEffect(4)).toEqual({ hits: 3, durationMs: 350, cooldownMs: 4000 });
    expect(frostFreezeEffect(5)).toEqual({ hits: 3, durationMs: 700, cooldownMs: 3000 });
  });

  it('unlocks bolt stagger at 3+, stronger at 5', () => {
    expect(boltStaggerEffect(2)).toBeUndefined();
    expect(boltStaggerEffect(3)).toEqual({ durationMs: 120, cooldownMs: 1800 });
    expect(boltStaggerEffect(5)!.durationMs).toBeGreaterThan(boltStaggerEffect(3)!.durationMs);
  });

  it('unlocks poison armor pierce at 3+, stronger at 5', () => {
    expect(poisonArmorPierceEffect(2)).toBeUndefined();
    expect(poisonArmorPierceEffect(3)).toEqual({ armorPierce: 8 });
    expect(poisonArmorPierceEffect(5)!.armorPierce).toBeGreaterThan(poisonArmorPierceEffect(3)!.armorPierce);
  });

  it('sniper execute only multiplies damage against low-health targets', () => {
    expect(sniperExecuteEffect(2)).toBeUndefined();
    expect(sniperExecuteEffect(3)).toEqual({ healthRatio: 0.3, damageMultiplier: 1.6 });
    // 최대 레벨 미만: 배율 1
    expect(sniperDamageMultiplier(2, 0.1)).toBe(1);
    // 처형 구간 안/밖
    expect(sniperDamageMultiplier(3, 0.25)).toBe(1.6);
    expect(sniperDamageMultiplier(3, 0.5)).toBe(1);
    expect(sniperDamageMultiplier(5, 0.4)).toBe(2.2);
  });
});
