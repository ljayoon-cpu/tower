import { vi } from 'vitest';
vi.mock('phaser', () => ({ default: { Scene: class {} } }));
import { STAGES } from '../../src/data/stages';
import { TOWER_KEYS, getTower } from '../../src/data/towers';
import { monoTower, simulate } from './harness';

/**
 * 각 타워 1종만으로(합치기 총력전) 전 스테이지를 깰 수 있는지 매트릭스.
 * 설계 의도: 초반은 어느 타워로도 가능, 후반 보스전은 조합이 필요.
 */
describe('single-tower clear audit', () => {
  it('prints the tower x stage clear matrix and holds the design invariants', () => {
    const seeds = [1, 42, 20260831];
    type Row = { tower: string; stage: string; clears: number; bestStars: number; bestLives: number };
    const rows: Row[] = [];

    for (const key of TOWER_KEYS) {
      for (const stage of STAGES) {
        const runs = seeds.map((s) => simulate(stage, monoTower(key), s));
        rows.push({
          tower: getTower(key).name,
          stage: stage.id,
          clears: runs.filter((r) => r.won).length,
          bestStars: Math.max(...runs.map((r) => r.stars)),
          bestLives: Math.max(...runs.map((r) => r.lives)),
        });
      }
    }

    // 사람이 읽기 좋게: 스테이지별로 어떤 타워가 3/3 시드 클리어하는지
    const byStage = new Map<string, string[]>();
    for (const r of rows) {
      if (r.clears === 3) (byStage.get(r.stage) ?? byStage.set(r.stage, []).get(r.stage)!).push(r.tower);
    }
    console.table(STAGES.map((s) => ({
      stage: s.id,
      soloClears: (byStage.get(s.id) ?? []).join(', ') || '(없음 — 조합 필요)',
    })));
    console.table(rows.map((r) => ({ ...r })));

    const firstStage = STAGES[0].id;

    // 1) 첫 스테이지는 어떤 타워로든 솔로 클리어 가능해야 한다.
    for (const key of TOWER_KEYS) {
      const first = rows.find((r) => r.tower === getTower(key).name && r.stage === firstStage)!;
      expect(first.clears, `${getTower(key).name} should solo ${firstStage}`).toBeGreaterThan(0);
    }

    // 2) 후반 3스테이지 중 어떤 것도 절반 이상의 타워가 솔로로 뚫으면 안 된다 (조합 강제).
    //    한두 타워가 특정 스테이지를 낮은 별점으로 겨우 뚫는 정도는 허용 — 알려진 하드 치즈.
    for (const stageId of STAGES.slice(-3).map((s) => s.id)) {
      const soloers = TOWER_KEYS.filter((key) => {
        const r = rows.find((x) => x.tower === getTower(key).name && x.stage === stageId)!;
        return r.clears === 3;
      });
      expect(soloers.length, `too many towers solo ${stageId}: ${soloers.join(',')}`).toBeLessThanOrEqual(1);
      for (const key of soloers) {
        const r = rows.find((x) => x.tower === getTower(key).name && x.stage === stageId)!;
        expect(r.bestStars, `${getTower(key).name} solos ${stageId} too comfortably`).toBeLessThanOrEqual(1);
      }
    }

    // 3) 마지막 스테이지는 "화살탑만" 으로는 못 깬다 (조합/카운터 강제).
    for (const seed of [1, 42, 20260831]) {
      expect(simulate(STAGES[STAGES.length - 1], monoTower('arrow'), seed).won).toBe(false);
    }
  }, 120000);
});
