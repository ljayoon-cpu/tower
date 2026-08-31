import { describe, expect, it } from 'vitest';
import type { EnemyDef } from '../../src/core/types';
import { EnemyState } from '../../src/systems/EnemyState';

const shieldedDef = {
  key: 'shield',
  name: '방어막병',
  hp: 100,
  speed: 50,
  bounty: 1,
  lifeDamage: 1,
  movementLayer: 'ground',
  armor: 6,
  shield: {
    energy: 40,
    rechargeDelayMs: 500,
    rechargePerSecond: 30,
  },
} as EnemyDef;

describe('EnemyState', () => {
  it('uses a shield before health, then restores the shield after its recharge delay', () => {
    const enemy = new EnemyState(shieldedDef);

    const report = enemy.applyDamage({ amount: 30 });

    expect(report.shieldDamage).toBe(30);
    expect(report.healthDamage).toBe(0);
    expect(enemy.shield).toBe(10);
    expect(enemy.hp).toBe(100);

    enemy.update(500);
    enemy.update(1000);

    expect(enemy.shield).toBe(40);
  });

  it('lets armor reduce only health damage and allows armor-piercing hits through it', () => {
    const enemy = new EnemyState({ ...shieldedDef, shield: undefined });

    const normalHit = enemy.applyDamage({ amount: 10 });
    const piercingHit = enemy.applyDamage({ amount: 10, armorPierce: 6 });

    expect(normalHit.armorBlocked).toBe(6);
    expect(normalHit.healthDamage).toBe(4);
    expect(piercingHit.armorBlocked).toBe(0);
    expect(piercingHit.healthDamage).toBe(10);
    expect(enemy.hp).toBe(86);
  });

  it('temporarily lowers armor, then restores it after the armor-break duration', () => {
    const enemy = new EnemyState({ ...shieldedDef, shield: undefined });

    enemy.applyArmorBreak(0.5, 1500);
    const brokenArmorHit = enemy.applyDamage({ amount: 10 });
    enemy.update(1500);
    const restoredArmorHit = enemy.applyDamage({ amount: 10 });

    expect(brokenArmorHit.armorBlocked).toBe(3);
    expect(brokenArmorHit.healthDamage).toBe(7);
    expect(restoredArmorHit.armorBlocked).toBe(6);
    expect(restoredArmorHit.healthDamage).toBe(4);
  });

  it('does not let a weaker armor break extend a stronger effect', () => {
    const enemy = new EnemyState({ ...shieldedDef, shield: undefined });

    enemy.applyArmorBreak(0.2, 2000);
    enemy.update(1000);
    enemy.applyArmorBreak(0.1, 1500);
    enemy.update(1000);

    expect(enemy.armorBreakPercent).toBe(0.1);

    enemy.update(500);

    expect(enemy.armorBreakPercent).toBe(0);
  });

  it('stops regeneration while poisoned, then resumes when the poison expires', () => {
    const enemy = new EnemyState({
      ...shieldedDef,
      shield: undefined,
      armor: 0,
      regenPerSecond: 10,
    });

    enemy.applyDamage({ amount: 50 });
    enemy.update(1000);
    expect(enemy.hp).toBe(60);

    enemy.applyPoison(10, 1000);
    enemy.update(1000);
    expect(enemy.hp).toBe(50);

    enemy.update(1000);
    expect(enemy.hp).toBe(60);
  });
});
