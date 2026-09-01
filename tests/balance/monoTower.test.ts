import { vi } from 'vitest';
vi.mock('phaser', () => ({ default: { Scene: class {} } }));
import { STAGES } from '../../src/data/stages';
import { TOWER_KEYS, getTower } from '../../src/data/towers';
import { monoTower, simulate } from './harness';

/**
 * 각 타워 1종만으로(합치기 총력전) 전 스테이지를 깰 수 있는지 매트릭스.
 * Lv3 에서 분기하는 타워는 경로 A·B 를 각각 별도 행으로 돌린다.
 * 설계 의도: 초반은 어느 타워/경로로도 가능, 후반 보스전은 조합이 필요.
 * 경로는 트레이드오프지 상향이 아니다 (스펙 §6) — A·B 어느 쪽도 후반을 편히 솔로 못 함.
 */
describe('single-tower clear audit', () => {
  it('prints the tower x path x stage clear matrix and holds the design invariants', () => {
    const seeds = [1, 42, 20260831];
    type Row = {
      tower: string; key: string; path: 'a' | 'b' | null; label: string;
      stage: string; clears: number; bestStars: number; bestLives: number;
    };
    const rows: Row[] = [];

    for (const key of TOWER_KEYS) {
      const paths: ('a' | 'b' | null)[] = getTower(key).paths ? ['a', 'b'] : [null];
      for (const path of paths) {
        const label = path ? `${getTower(key).name} ${path.toUpperCase()}` : getTower(key).name;
        for (const stage of STAGES) {
          const runs = seeds.map((s) => simulate(stage, monoTower(key, path ?? undefined), s));
          rows.push({
            tower: getTower(key).name, key, path, label,
            stage: stage.id,
            clears: runs.filter((r) => r.won).length,
            bestStars: Math.max(...runs.map((r) => r.stars)),
            bestLives: Math.max(...runs.map((r) => r.lives)),
          });
        }
      }
    }

    // 사람이 읽기 좋게: 스테이지별로 어떤 타워/경로가 3/3 시드 클리어하는지
    const byStage = new Map<string, string[]>();
    for (const r of rows) {
      if (r.clears === 3) (byStage.get(r.stage) ?? byStage.set(r.stage, []).get(r.stage)!).push(r.label);
    }
    console.table(STAGES.map((s) => ({
      stage: s.id,
      soloClears: (byStage.get(s.id) ?? []).join(', ') || '(없음 — 조합 필요)',
    })));
    console.table(rows.map((r) => ({ tower: r.label, stage: r.stage, clears: r.clears, bestStars: r.bestStars, bestLives: r.bestLives })));

    const firstStage = STAGES[0].id;

    // 1) 첫 스테이지는 직접 공격 타워라면 A·B 어느 경로로든 솔로 클리어 가능해야 한다.
    //    지원형(지휘탑·연금탑)과 대공 특화(창공탑 — 지상 화력이 약한 게 설계 의도)는 제외.
    const combatKeys = TOWER_KEYS.filter(
      (key) => getTower(key).attack !== 'support' && key !== 'ballista',
    );
    for (const key of combatKeys) {
      const firstRows = rows.filter((r) => r.key === key && r.stage === firstStage);
      for (const r of firstRows) {
        expect(r.clears, `${r.label} should solo ${firstStage}`).toBeGreaterThan(0);
      }
    }

    // 2) 후반 3스테이지: A·B 통틀어 모든 타워×경로 조합 중 ≤1 조합만 솔로로 뚫어야 하고,
    //    그것도 ≤1별 (조합 강제 — 스펙 §6). 스테이지별로도, 세 스테이지 통틀어서도.
    const lastThree = STAGES.slice(-3).map((s) => s.id);
    for (const stageId of lastThree) {
      const soloers = rows.filter((r) => r.stage === stageId && r.clears === 3);
      expect(soloers.length, `too many tower/path combos solo ${stageId}: ${soloers.map((r) => r.label).join(',')}`).toBeLessThanOrEqual(1);
      for (const r of soloers) {
        expect(r.bestStars, `${r.label} solos ${stageId} too comfortably`).toBeLessThanOrEqual(1);
      }
    }
    const lateSoloers = [
      ...new Set(rows.filter((r) => lastThree.includes(r.stage) && r.clears === 3).map((r) => r.label)),
    ];
    expect(lateSoloers.length, `more than one tower/path combo solos the last-3 campaign stages: ${lateSoloers.join(',')}`).toBeLessThanOrEqual(1);

    // 3) 마지막 스테이지는 "화살탑만" 으로는 A·B 어느 경로로도 못 깬다 (조합/카운터 강제).
    for (const path of ['a', 'b'] as const) {
      for (const seed of seeds) {
        expect(simulate(STAGES[STAGES.length - 1], monoTower('arrow', path), seed).won, `arrow ${path.toUpperCase()} must not solo the finale`).toBe(false);
      }
    }
  }, 180000);
});
