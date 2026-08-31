import {
  chainDamages, buildChain, beamDamage, buffMultiplier, buildMultiShot,
} from '../../src/systems/combat';
import type { Targetable } from '../../src/systems/TargetingSystem';

const mk = (id: number, x: number, y: number, alive = true): Targetable =>
  ({ id, pos: { x, y }, progress: 0, alive });

describe('chainDamages', () => {
  it('applies falloff per jump and rounds', () => {
    expect(chainDamages(40, 0.5, 3)).toEqual([40, 20, 10, 5]);
    expect(chainDamages(10, 0.6, 0)).toEqual([10]);
    expect(chainDamages(17, 0.65, 2)).toEqual([17, 11, 7]); // round(11.05), round(7.1825)
  });
});

describe('beamDamage', () => {
  it('ramps with consecutive stacks and caps at rampMax', () => {
    expect(beamDamage(100, 0, 0.2, 3)).toBe(100);
    expect(beamDamage(100, 3, 0.2, 3)).toBe(160);
    expect(beamDamage(100, 10, 0.2, 3)).toBe(300); // 1 + 2.0 -> capped at 3.0
    expect(beamDamage(100, 100, 0.2, 3)).toBe(300);
  });
  it('treats negative stacks as zero and rounds', () => {
    expect(beamDamage(45, -5, 0.15, 2.5)).toBe(45);
    expect(beamDamage(45, 2, 0.15, 2.5)).toBe(Math.round(45 * 1.3));
  });
});

describe('buffMultiplier', () => {
  it('is 1 with no auras', () => {
    expect(buffMultiplier([])).toBe(1);
  });
  it('takes the strongest aura, never stacking', () => {
    expect(buffMultiplier([0.1, 0.3, 0.2])).toBeCloseTo(1.3);
    expect(buffMultiplier([0.25])).toBeCloseTo(1.25);
  });
});

describe('buildMultiShot', () => {
  it('always includes the primary, then nearest in-range extras, no repeats', () => {
    const primary = mk(1, 100, 0);
    const all = [primary, mk(2, 120, 0), mk(3, 160, 0), mk(4, 400, 0), mk(5, 90, 0, false)];
    const origin = { x: 0, y: 0 };
    // range 200: enemy 4 (dist 400) out of range, enemy 5 dead
    expect(buildMultiShot(primary, all, origin, 200, 3).map((t) => t.id)).toEqual([1, 2, 3]);
    // shotCount 1 -> just the primary
    expect(buildMultiShot(primary, all, origin, 200, 1).map((t) => t.id)).toEqual([1]);
    // more shots than available targets -> everything valid
    expect(buildMultiShot(primary, all, origin, 999, 9).map((t) => t.id)).toEqual([1, 2, 3, 4]);
  });
});

describe('buildChain', () => {
  it('chains to nearest not-yet-hit alive enemy within range, stopping when none in range', () => {
    const primary = mk(1, 0, 0);
    const all = [primary, mk(2, 30, 0), mk(3, 55, 0), mk(4, 500, 0)];
    expect(buildChain(primary, all, 40, 3).map((t) => t.id)).toEqual([1, 2, 3]);
  });

  it('stops early when no target in range', () => {
    const primary = mk(1, 0, 0);
    expect(buildChain(primary, [primary, mk(2, 200, 0)], 40, 3).map((t) => t.id)).toEqual([1]);
  });

  it('skips dead enemies', () => {
    const primary = mk(1, 0, 0);
    const all = [primary, mk(2, 20, 0, false), mk(3, 25, 0)];
    expect(buildChain(primary, all, 40, 2).map((t) => t.id)).toEqual([1, 3]);
  });
});
