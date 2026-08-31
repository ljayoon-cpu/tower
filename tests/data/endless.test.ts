import { GRID_COLS, GRID_ROWS } from '../../src/core/constants';
import { getEnemy } from '../../src/data/enemies';
import { getStage } from '../../src/data/stages';
import { PathManager } from '../../src/systems/PathManager';
import {
  ENDLESS_STAGE_ID,
  endlessStage,
  endlessSpawnPhase,
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

  it('escalates spawn points: one side alternating, then split columns, then all four', () => {
    // lane 0 좌·위 / 1 좌·아래 / 2 우·위 / 3 우·아래.
    expect(endlessSpawnPhase(1)).toBe('single');
    expect(endlessSpawnPhase(5)).toBe('single');
    expect(endlessSpawnPhase(6)).toBe('split');
    expect(endlessSpawnPhase(14)).toBe('split');
    expect(endlessSpawnPhase(15)).toBe('both');

    const lanesOf = (n: number) => new Set(endlessWave(n).groups.map((g) => g.lane));

    // single: 한 쪽 입구만(위·아래로는 갈림), 웨이브마다 좌↔우 번갈아.
    expect(lanesOf(1)).toEqual(new Set([0, 1]));   // 좌측
    expect(lanesOf(2)).toEqual(new Set([2, 3]));   // 우측

    // split: 질주병은 좌측 열, 보병은 우측 열.
    const w8 = endlessWave(8).groups;
    expect(new Set(w8.filter((g) => g.enemy === 'fast').map((g) => g.lane))).toEqual(new Set([0, 1]));
    expect(new Set(w8.filter((g) => g.enemy === 'normal').map((g) => g.lane))).toEqual(new Set([2, 3]));

    // both: 사방에서 동시에.
    expect(lanesOf(20)).toEqual(new Set([0, 1, 2, 3]));
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

  it('has four routes: left/right entrance x top/bottom goal, symmetric', () => {
    const s = endlessStage();
    const routes = new PathManager(s.path).routes();
    expect(routes).toHaveLength(4);
    const starts = routes.map((r) => r[0]);
    const ends = routes.map((r) => r[r.length - 1]);
    // 두 개의 스폰 지점(좌/우)만 존재.
    expect(new Set(starts.map((p) => p.x)).size).toBe(2);
    // 두 개의 목표(위 y=0 / 아래 y=GAME_HEIGHT)만 존재, 각각 두 루트가 도달.
    const endYs = ends.map((p) => p.y).sort((a, b) => a - b);
    expect(endYs).toEqual([0, 0, 1280, 1280]);
    for (const p of ends) expect(Math.abs(p.x - s.goals[0].x)).toBeLessThan(1); // 모두 중앙 세로선
    // 좌우 대칭: 스폰 x 가 중앙(352)을 기준으로 대칭.
    const xs = [...new Set(starts.map((p) => p.x))].sort((a, b) => a - b);
    expect((xs[0] + xs[1]) / 2).toBeCloseTo(s.goals[0].x, 0);
  });
});
