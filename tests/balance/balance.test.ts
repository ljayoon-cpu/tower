import { vi } from 'vitest';
import { writeFileSync } from 'node:fs';
vi.mock('phaser', () => ({ default: { Scene: class {} } }));
import { STAGES } from '../../src/data/stages';
import { mergeArmy, noDefense, oneArrow, simulate, spread } from './harness';

describe('balance measurement with production combat', () => {
  it('reports reproducible, legal between-wave strategies', () => {
    const strategies = {
      none: noDefense, oneArrow,
      arrowSpread: spread(['arrow']),
      frostFocus: mergeArmy(['frost']),
      mixedSpread: spread(['arrow', 'cannon', 'bolt', 'frost', 'poison', 'sniper']),
      arrowMerge: mergeArmy(['arrow', 'arrow', 'arrow']),
      mixedMerge: mergeArmy(['arrow', 'cannon', 'bolt', 'frost', 'poison', 'sniper']),
    };
    const rows = [];
    for (const stage of STAGES) for (const [strategy, play] of Object.entries(strategies)) {
      for (const seed of [1, 42, 20260831]) rows.push({ strategy, ...simulate(stage, play, seed) });
    }
    console.table(rows.map(r => ({ stage: r.stage, strategy: r.strategy, seed: r.seed, lives: r.lives, stars: r.stars,
      seconds: r.seconds, bosses: r.waves.reduce((n, w) => n + w.bossKilled, 0),
    })));
    if (process.env.BALANCE_OUTPUT) writeFileSync(process.env.BALANCE_OUTPUT, JSON.stringify(rows, null, 2));
    expect(rows.filter(r => r.strategy === 'none').every(r => !r.won)).toBe(true);
    expect(simulate(STAGES[1], strategies.mixedMerge, 42)).toEqual(simulate(STAGES[1], strategies.mixedMerge, 42));

    // 후반은 한 타워만 머지해서 끝낼 수 없어야 한다 — 적 특성이 늘수록 조합 선택이 중요해진다.
    // (조합 머지의 실제 클리어 가능성은 순진한 시뮬로 검증 불가 — 사람 플레이테스트 필요.
    //  docs/verification-2026-08-31.md 참고.)
    const last = STAGES[STAGES.length - 1];
    for (const seed of [1, 42, 20260831]) {
      expect(simulate(last, strategies.arrowMerge, seed).won).toBe(false);
    }
  }, 120000);
});
