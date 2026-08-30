import { pickTarget, enemiesInRadius } from '../../src/systems/TargetingSystem';
import type { Targetable } from '../../src/systems/TargetingSystem';

const mk = (id: number, x: number, y: number, progress: number, alive = true): Targetable =>
  ({ id, pos: { x, y }, progress, alive });

describe('pickTarget', () => {
  it('returns null when nobody is in range', () => {
    expect(pickTarget({ x: 0, y: 0 }, 50, [mk(1, 100, 0, 0.5)])).toBeNull();
  });

  it('picks the furthest-progressed enemy in range', () => {
    const t = pickTarget({ x: 0, y: 0 }, 200, [
      mk(1, 10, 0, 0.2), mk(2, 20, 0, 0.9), mk(3, 30, 0, 0.5),
    ]);
    expect(t?.id).toBe(2);
  });

  it('ignores dead enemies', () => {
    const t = pickTarget({ x: 0, y: 0 }, 200, [mk(1, 10, 0, 0.9, false), mk(2, 20, 0, 0.1)]);
    expect(t?.id).toBe(2);
  });

  it('breaks ties by lower id', () => {
    const t = pickTarget({ x: 0, y: 0 }, 200, [mk(5, 10, 0, 0.5), mk(2, 12, 0, 0.5)]);
    expect(t?.id).toBe(2);
  });
});

describe('enemiesInRadius', () => {
  it('returns all alive enemies within radius', () => {
    const res = enemiesInRadius({ x: 0, y: 0 }, 15, [
      mk(1, 10, 0, 0), mk(2, 20, 0, 0), mk(3, 5, 5, 0, false),
    ]);
    expect(res.map(e => e.id)).toEqual([1]);
  });
});
