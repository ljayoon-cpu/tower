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

  it('holds the first boss until wave 10, then every 5th wave with rising hp', () => {
    const bossOf = (n: number) => endlessWave(n).groups.find((g) => g.enemy === 'boss');
    expect(bossOf(5)).toBeUndefined();
    expect(bossOf(9)).toBeUndefined();
    expect(bossOf(10)).toBeDefined();
    expect(bossOf(15)).toBeDefined();
    expect((bossOf(50)?.hpMultiplier ?? 0)).toBeGreaterThan(bossOf(10)?.hpMultiplier ?? 0);
  });

  it('introduces enemy types gradually', () => {
    const has = (n: number, key: string) => endlessWave(n).groups.some((g) => g.enemy === key);
    expect(has(3, 'tank')).toBe(false);
    expect(has(5, 'tank')).toBe(true);
    expect(has(6, 'shield')).toBe(false);
    expect(has(7, 'shield')).toBe(true);
    expect(has(9, 'regenerator')).toBe(true);
    // 새 후반 위협은 40웨이브부터, 5의 배수에서만.
    expect(has(35, 'splitter')).toBe(false);
    expect(has(40, 'splitter')).toBe(true);
    expect(has(42, 'splitter')).toBe(false);
    expect(has(45, 'crusher')).toBe(true);
    expect(has(50, 'berserker')).toBe(true);
  });

  it('escalates spawn points: one side alternating, then split columns, then all four', () => {
    // 일반 레인 0 좌·위 / 1 좌·아래 / 4 우·위 / 5 우·아래. 보스 레인 2/3/6/7(한 바퀴 더).
    expect(endlessSpawnPhase(1)).toBe('single');
    expect(endlessSpawnPhase(5)).toBe('single');
    expect(endlessSpawnPhase(6)).toBe('split');
    expect(endlessSpawnPhase(14)).toBe('split');
    expect(endlessSpawnPhase(15)).toBe('both');

    const lanesOf = (n: number) => new Set(endlessWave(n).groups.map((g) => g.lane));

    // single: 한 쪽 입구만(위·아래로는 갈림), 웨이브마다 좌↔우 번갈아.
    expect(lanesOf(1)).toEqual(new Set([0, 1]));   // 좌측
    expect(lanesOf(2)).toEqual(new Set([4, 5]));   // 우측

    // split: 질주병은 좌측 열, 보병은 우측 열.
    const w8 = endlessWave(8).groups;
    expect(new Set(w8.filter((g) => g.enemy === 'fast').map((g) => g.lane))).toEqual(new Set([0, 1]));
    expect(new Set(w8.filter((g) => g.enemy === 'normal').map((g) => g.lane))).toEqual(new Set([4, 5]));

    // both: 일반 적은 네 레인, 보스는 그 한 바퀴 더 도는 짝 레인만 쓴다.
    const w20 = endlessWave(20).groups;
    expect(new Set(w20.filter((g) => g.enemy !== 'boss').map((g) => g.lane))).toEqual(new Set([0, 1, 4, 5]));
    for (const g of w20.filter((g) => g.enemy === 'boss')) {
      expect([2, 3, 6, 7]).toContain(g.lane);
    }
    // 보스가 사방(4기)일 땐 네 보스 레인을 모두 쓴다.
    const w50boss = endlessWave(50).groups.filter((g) => g.enemy === 'boss');
    expect(new Set(w50boss.map((g) => g.lane))).toEqual(new Set([2, 3, 6, 7]));
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

  it('has eight routes: 4 normal + 4 boss (extra ring lap), left/right entrance x top/bottom exit', () => {
    const s = endlessStage();
    const routes = new PathManager(s.path).routes();
    expect(routes).toHaveLength(8);
    const starts = routes.map((r) => r[0]);
    const ends = routes.map((r) => r[r.length - 1]);
    // 스폰 지점은 좌·우 두 곳, 중앙(x=352) 기준 좌우 대칭.
    const startXs = [...new Set(starts.map((p) => p.x))].sort((a, b) => a - b);
    expect(startXs).toHaveLength(2);
    expect((startXs[0] + startXs[1]) / 2).toBeCloseTo(352, 0);
    // 탈출은 위(y=0) 넷 / 아래(y=1280) 넷.
    expect(ends.map((p) => p.y).sort((a, b) => a - b)).toEqual([0, 0, 0, 0, 1280, 1280, 1280, 1280]);
    // 모든 루트가 링을 크게 돈다: 링 네 모서리 중 최소 3곳(보스 루트는 4곳)을 지난다.
    const corners = [[160, 352], [544, 352], [160, 928], [544, 928]];
    const touchedCounts = routes.map((r) =>
      corners.filter(([x, y]) => r.some((p) => Math.abs(p.x - x) < 1 && Math.abs(p.y - y) < 1)).length);
    for (const c of touchedCounts) expect(c).toBeGreaterThanOrEqual(3);
    // 보스 루트 4개는 네 모서리를 전부 지난다.
    expect(touchedCounts.filter((c) => c === 4).length).toBe(4);
  });
});
