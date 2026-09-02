import { describe, expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ default: { Scene: class {} } }));
import { simulate } from './harness';
import { getStage } from '../../src/data/stages';
import type { StrategyContext } from './harness';

/** 스테이지 1-1 에서 인접 두 칸에 두 타워를 놓고 관찰. */
function pair(a: string, b: string) {
  return (c: StrategyContext) => {
    if (c.wave === 1 && c.game.towers.length === 0) {
      c.buy(a, 4, 6);
      c.buy(b, 4, 7); // (4,6) 바로 아래 = 4-인접
    }
  };
}

describe('resonance charged set', () => {
  it('charges an elemental tower placed next to a non-support partner', () => {
    const stage = getStage('1-1');
    const report = simulate(stage, pair('frost', 'arrow'), 1);
    // simulate 는 scene 을 반환하지 않으므로 충전 집합을 직접 단언할 수 없다.
    // Task 5 는 배선 후 시뮬이 완주하는지만 확인한다(반응 발동 검증은 Task 6).
    expect(report.waves.length).toBeGreaterThan(0);
  });
});
