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

  it('freezes on the third frost hit, then rejects more stacks until its cooldown ends', () => {
    const enemy = new EnemyState({ ...shieldedDef, shield: undefined });

    expect(enemy.applyFreezeHit(3, 350, 4000)).toBe(false);
    expect(enemy.applyFreezeHit(3, 350, 4000)).toBe(false);
    expect(enemy.applyFreezeHit(3, 350, 4000)).toBe(true);
    expect(enemy.frozen).toBe(true);

    enemy.update(350);
    expect(enemy.frozen).toBe(false);
    expect(enemy.applyFreezeHit(3, 350, 4000)).toBe(false);

    enemy.update(3650);
    expect(enemy.applyFreezeHit(3, 350, 4000)).toBe(false);
    expect(enemy.applyFreezeHit(3, 350, 4000)).toBe(false);
    expect(enemy.applyFreezeHit(3, 350, 4000)).toBe(true);
  });

  it('bolt stagger halts movement briefly and returns stopped-ms, honoring its cooldown', () => {
    const enemy = new EnemyState({ ...shieldedDef, shield: undefined });

    expect(enemy.applyStagger(120, 1800)).toBe(true);
    expect(enemy.frozen).toBe(true);
    expect(enemy.update(120)).toBe(120); // 120ms 이동 정지
    expect(enemy.frozen).toBe(false);
    expect(enemy.applyStagger(120, 1800)).toBe(false); // 쿨다운 중

    enemy.update(1800);
    expect(enemy.applyStagger(120, 1800)).toBe(true);
  });

  it('cannon armor break lowers effective armor for a while, strongest break wins', () => {
    const mk = () => new EnemyState({ ...shieldedDef, shield: undefined }); // armor 6

    const a = mk();
    a.applyArmorBreak(0.5, 1500); // armor 6 -> 3
    expect(a.applyDamage({ amount: 10 }).armorBlocked).toBe(3);

    const b = mk();
    b.applyArmorBreak(0.1, 1500);
    b.applyArmorBreak(0.5, 1500); // 더 강한 파괴가 적용됨
    expect(b.applyDamage({ amount: 10 }).armorBlocked).toBe(3);

    const c = mk();
    c.applyArmorBreak(0.5, 300);
    c.update(400); // 만료
    expect(c.applyDamage({ amount: 10 }).armorBlocked).toBe(6);
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

  it('ignoreShield bypasses shield and applies damage directly to health', () => {
    const enemy = new EnemyState(shieldedDef);
    expect(enemy.shield).toBe(40);
    expect(enemy.hp).toBe(100);

    const report = enemy.applyDamage({ amount: 50, ignoreShield: true });

    expect(report.shieldDamage).toBe(0);
    expect(report.healthDamage).toBeGreaterThan(0);
    expect(enemy.shield).toBe(40); // shield unchanged
    expect(enemy.hp).toBeLessThan(100); // health reduced
  });
});
