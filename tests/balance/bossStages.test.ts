import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: { Scene: class {} } }));

import { stage25 } from '../../src/data/stages/stage-2-5';
import { monoTower, simulate } from './harness';

describe('boss-stage failure pressure', () => {
  it('does not clear stage 2-5 when both bosses reach the goal', () => {
    const report = simulate(stage25, monoTower('poison'), 42);
    const escapedBosses = report.waves.reduce((total, wave) => total + wave.bossEscaped, 0);

    expect(escapedBosses).toBe(2);
    expect(report.won).toBe(false);
  });
});
