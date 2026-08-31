import { Rng } from '../../src/core/rng';
import { chooseTowerBan, isTowerBanned } from '../../src/core/runRules';

describe('run tower ban', () => {
  const towerKeys = ['arrow', 'cannon', 'frost'];

  it('chooses one available tower deterministically for a seeded run', () => {
    const first = chooseTowerBan(towerKeys, new Rng(2026));
    const second = chooseTowerBan(towerKeys, new Rng(2026));

    expect(towerKeys).toContain(first);
    expect(second).toBe(first);
  });

  it('keeps only the selected tower banned for the full run', () => {
    expect(isTowerBanned('cannon', 'cannon')).toBe(true);
    expect(isTowerBanned('arrow', 'cannon')).toBe(false);
  });

  it('nothing is banned when there is no ban (non-boss stage)', () => {
    expect(isTowerBanned('cannon', null)).toBe(false);
    expect(isTowerBanned('arrow', null)).toBe(false);
  });

  it('rejects a run with no towers to ban', () => {
    expect(() => chooseTowerBan([], new Rng(1))).toThrow('tower keys');
  });
});
