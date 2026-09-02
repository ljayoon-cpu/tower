import {
  chainDamages, buildChain, beamDamage, buffMultiplier, buildMultiShot, executeMultiplier, pierceLineTargets,
  frostCollapseDamage, reactionBonusDamage, dischargeTargets, isOrthAdjacent,
} from '../../src/systems/combat';
import type { Targetable } from '../../src/systems/TargetingSystem';
import type { TowerLevelStats } from '../../src/core/types';

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

describe('executeMultiplier', () => {
  it('applies the multiplier only within the execute band', () => {
    const s = { executeHealthRatio: 0.3, executeDamageMultiplier: 1.6 } as Partial<TowerLevelStats> as TowerLevelStats;
    expect(executeMultiplier(s, 0.25)).toBe(1.6);
    expect(executeMultiplier(s, 0.5)).toBe(1);
    expect(executeMultiplier({} as Partial<TowerLevelStats> as TowerLevelStats, 0.1)).toBe(1);
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

describe('pierceLineTargets', () => {
  it('returns alive enemies along a ray from origin to target, ordered by distance', () => {
    const origin = { x: 0, y: 0 };
    const target = { x: 100, y: 0 };
    const enemies = [
      mk(1, 30, 0),
      mk(2, 70, 0),
      mk(3, 50, 0),
    ];
    const result = pierceLineTargets(origin, target, enemies, 20, 9999);
    expect(result.map((e) => e.id)).toEqual([1, 3, 2]); // ordered along the line
  });

  it('excludes enemies outside the band and dead enemies', () => {
    const origin = { x: 0, y: 0 };
    const target = { x: 100, y: 0 };
    const enemies = [
      mk(1, 30, 0),    // on line
      mk(2, 30, 50),   // off line, outside band
      mk(3, 70, 0),    // on line
      mk(4, 70, 8),    // near line, inside band
      mk(5, 50, 20, false), // off line, but dead
    ];
    const result = pierceLineTargets(origin, target, enemies, 20, 9999);
    expect(result.map((e) => e.id)).toEqual([1, 3, 4]);
  });

  it('excludes enemies beyond maxDistance', () => {
    const origin = { x: 0, y: 0 };
    const target = { x: 100, y: 0 };
    const enemies = [mk(1, 40, 0), mk(2, 90, 0), mk(3, 150, 0)];
    const result = pierceLineTargets(origin, target, enemies, 20, 100);
    expect(result.map((e) => e.id)).toEqual([1, 2]); // enemy 3 at dist 150 > 100 excluded
  });
});

describe('frostCollapseDamage', () => {
  it('is a fraction of max hp, capped, and rounded', () => {
    expect(frostCollapseDamage(1000)).toBe(50);      // 5% of 1000
    expect(frostCollapseDamage(100000)).toBe(220);   // capped
    expect(frostCollapseDamage(0)).toBe(0);
    expect(frostCollapseDamage(-100)).toBe(0);
  });
});

describe('reactionBonusDamage', () => {
  it('is flat + ratio * dealt, rounded, never negative', () => {
    expect(reactionBonusDamage(100, 0.35, 40)).toBe(75);
    expect(reactionBonusDamage(0, 0.4, 0)).toBe(0);
    expect(reactionBonusDamage(-50, 0.4, 10)).toBe(10);
  });
});

describe('dischargeTargets', () => {
  it('picks nearest living enemies within jumpRadius, excluding the detonated one', () => {
    const origin = { x: 0, y: 0 };
    const all: Targetable[] = [
      mk(1, 0, 0),        // excluded
      mk(2, 30, 0),       // in
      mk(3, 80, 0),       // in
      mk(4, 200, 0),      // out of range
      mk(5, 10, 10, false), // dead
    ];
    const got = dischargeTargets(origin, all, 1).map((e) => e.id);
    expect(got).toEqual([2, 3]);
  });

  it('caps at STATIC_DISCHARGE.maxJumps', () => {
    const all: Targetable[] = [mk(1, 0, 0), mk(2, 5, 0), mk(3, 6, 0), mk(4, 7, 0), mk(5, 8, 0)];
    expect(dischargeTargets({ x: 0, y: 0 }, all, 1).length).toBe(3);
  });

  it('tie-breaks equal-distance targets by ascending id', () => {
    const origin = { x: 0, y: 0 };
    const all: Targetable[] = [mk(3, 40, 0), mk(2, -40, 0)];
    expect(dischargeTargets(origin, all, 1).map((e) => e.id)).toEqual([2, 3]);
  });
});

describe('isOrthAdjacent', () => {
  it('is true only for the four orthogonal neighbours', () => {
    const c = { col: 5, row: 5 };
    expect(isOrthAdjacent(c, { col: 5, row: 4 })).toBe(true);
    expect(isOrthAdjacent(c, { col: 6, row: 5 })).toBe(true);
    expect(isOrthAdjacent(c, { col: 6, row: 6 })).toBe(false); // diagonal
    expect(isOrthAdjacent(c, { col: 5, row: 5 })).toBe(false); // self
    expect(isOrthAdjacent(c, { col: 5, row: 7 })).toBe(false); // two away
  });
});
