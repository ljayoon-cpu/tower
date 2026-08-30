import { waveSummary } from '../../src/core/waveInfo';
import type { Wave } from '../../src/core/types';

const wave = (groups: Wave['groups']): Wave => ({ groups, clearBonus: 0 });
const g = (enemy: string, count: number) => ({ enemy, count, intervalMs: 100, startDelayMs: 0 });

describe('waveSummary', () => {
  it('aggregates counts per enemy key, first-seen order', () => {
    expect(waveSummary(wave([g('normal', 5), g('fast', 3), g('normal', 2)]))).toEqual([
      { key: 'normal', count: 7 },
      { key: 'fast', count: 3 },
    ]);
  });

  it('handles an empty wave', () => {
    expect(waveSummary(wave([]))).toEqual([]);
  });
});
