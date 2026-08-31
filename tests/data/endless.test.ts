import { GRID_COLS, GRID_ROWS } from '../../src/core/constants';
import { getEnemy } from '../../src/data/enemies';
import { getStage } from '../../src/data/stages';
import { PathManager } from '../../src/systems/PathManager';
import {
  ENDLESS_STAGE_ID,
  endlessStage,
  endlessWave,
  endlessWaves,
} from '../../src/data/endless';

describe('endless wave generator', () => {
  it('is deterministic', () => {
    for (const n of [1, 5, 17, 50, 123]) {
      expect(endlessWave(n)).toEqual(endlessWave(n));
    }
  });

  it('every group references a real enemy', () => {
    for (let n = 1; n <= 60; n++) {
      for (const g of endlessWave(n).groups) {
        expect(() => getEnemy(g.enemy)).not.toThrow();
        expect(g.count).toBeGreaterThan(0);
      }
    }
  });

  it('pressure grows with wave number', () => {
    const count = (n: number) => endlessWave(n).groups.reduce((s, g) => s + g.count, 0);
    expect(count(30)).toBeGreaterThan(count(1));
    expect(endlessWave(40).clearBonus).toBeGreaterThan(endlessWave(1).clearBonus);
  });

  it('spawns a boss every 5th wave and scales its hp', () => {
    const bossOf = (n: number) => endlessWave(n).groups.find((g) => g.enemy === 'boss');
    expect(bossOf(4)).toBeUndefined();
    expect(bossOf(5)).toBeDefined();
    expect(bossOf(10)).toBeDefined();
    expect((bossOf(50)?.hpMultiplier ?? 0)).toBeGreaterThan(bossOf(5)?.hpMultiplier ?? 0);
  });

  it('introduces enemy types gradually', () => {
    const has = (n: number, key: string) => endlessWave(n).groups.some((g) => g.enemy === key);
    expect(has(1, 'tank')).toBe(false);
    expect(has(3, 'tank')).toBe(true);
    expect(has(2, 'shield')).toBe(false);
    expect(has(5, 'shield')).toBe(true);
  });

  it('endlessWaves returns the requested length', () => {
    expect(endlessWaves(12)).toHaveLength(12);
    expect(endlessWaves()).toHaveLength(200);
  });
});

describe('endless stage', () => {
  it('is resolved by getStage and flagged endless', () => {
    const s = getStage(ENDLESS_STAGE_ID);
    expect(s.endless).toBe(true);
    expect(s.id).toBe(ENDLESS_STAGE_ID);
  });

  it('grid is GRID_COLS x GRID_ROWS', () => {
    const s = endlessStage();
    expect(s.grid).toHaveLength(GRID_ROWS);
    for (const row of s.grid) expect(row).toHaveLength(GRID_COLS);
  });

  it('has a single traversable route ending at the goal', () => {
    const s = endlessStage();
    const routes = new PathManager(s.path).routes();
    expect(routes).toHaveLength(1);
    expect(routes.length).toBe(s.goals.length);
    const end = routes[0][routes[0].length - 1];
    expect(Math.hypot(end.x - s.goals[0].x, end.y - s.goals[0].y)).toBeLessThan(1);
  });
});
