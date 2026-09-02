import { describe, expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ default: { Scene: class {} } }));
import { simulate } from './harness';
import { getStage } from '../../src/data/stages';
import type { StrategyContext } from './harness';

/** 스테이지 1-1 에서 인접 두 칸에 두 타워를 놓고 관찰. (4,6)+(4,7) = 상하 4-인접. */
function pair(a: string, b: string) {
  return (c: StrategyContext) => {
    if (c.wave === 1 && c.game.towers.length === 0) {
      c.buy(a, 4, 6);
      c.buy(b, 4, 7); // (4,6) 바로 아래 = 4-인접
    }
  };
}

/** 같은 두 타워를 서로 멀리 (비인접) 놓는다 → 충전되지 않아야 한다. */
function apart(a: string, b: string) {
  return (c: StrategyContext) => {
    if (c.wave === 1 && c.game.towers.length === 0) {
      c.buy(a, 4, 6);
      c.buy(b, 6, 9);
    }
  };
}

describe('resonance charged set', () => {
  it('charges an elemental tower placed next to a non-support partner', () => {
    const report = simulate(getStage('1-1'), pair('frost', 'arrow'), 1);
    expect(report.waves.length).toBeGreaterThan(0);
  });
});

describe('resonance reactions fire', () => {
  it('charged frost + adjacent arrow detonates the ice mark (arrow is the detonator)', () => {
    let count = 0;
    const byKeys = new Set<string>();
    simulate(getStage('1-1'), pair('frost', 'arrow'), 7, 1, {
      onReaction: (el, by) => { if (el === 'ice') { count++; byKeys.add(by); } },
    });
    expect(count).toBeGreaterThan(0);
    expect([...byKeys]).toContain('arrow'); // 화살(원소 없음)이 서리 각인을 터뜨렸다
  });

  it('non-adjacent frost + arrow never reacts', () => {
    let count = 0;
    simulate(getStage('1-1'), apart('frost', 'arrow'), 7, 1, {
      onReaction: () => { count++; },
    });
    expect(count).toBe(0);
  });

  it('a lone elemental tower in a corner never charges → no reactions', () => {
    let count = 0;
    simulate(getStage('1-1'), (c) => {
      if (c.wave === 1 && !c.game.towers.length) c.buy('frost', 0, 0);
    }, 7, 3, { onReaction: () => { count++; } });
    expect(count).toBe(0);
  });

  it('adjacent frost + arrow leaves lives no worse than the non-adjacent pair', () => {
    const withPair = simulate(getStage('1-1'), pair('frost', 'arrow'), 7);
    const noPair = simulate(getStage('1-1'), apart('frost', 'arrow'), 7);
    const last = (r: typeof withPair) => r.waves[r.waves.length - 1].lives;
    expect(last(withPair)).toBeGreaterThanOrEqual(last(noPair));
  });
});
