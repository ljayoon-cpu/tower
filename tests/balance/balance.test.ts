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
      mixedSpread: spread(['arrow', 'cannon', 'bolt', 'frost', 'poison']),
      arrowMerge: mergeArmy(['arrow', 'arrow', 'arrow']),
      mixedMerge: mergeArmy(['arrow', 'cannon', 'bolt', 'frost', 'poison']),
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

    // Design intent: on the hardest stage, concentrating gold into merges must
    // out-perform blanketing the map with level-1 towers. If this flips, the
    // merge mechanic has lost its teeth — retune tower level scaling.
    const last = STAGES[STAGES.length - 1];
    for (const seed of [1, 42, 20260831]) {
      const merge = simulate(last, strategies.arrowMerge, seed);
      const spread = simulate(last, strategies.arrowSpread, seed);
      expect(merge.won).toBe(true);
      expect(merge.lives).toBeGreaterThanOrEqual(spread.lives);
    }
  }, 120000);
});
