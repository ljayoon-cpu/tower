import {
  coresForStars, buyUpgrade, nextCost, metaBonuses, upgradeLevel, META_UPGRADES,
} from '../../src/core/meta';
import type { MetaState } from '../../src/core/meta';

const fresh = (): MetaState => ({ cores: 0, upgrades: {} });

describe('meta progression', () => {
  it('awards more cores for more stars, zero for a loss', () => {
    expect(coresForStars(0)).toBe(0);
    expect(coresForStars(1)).toBeGreaterThan(0);
    expect(coresForStars(3)).toBeGreaterThan(coresForStars(2));
  });

  it('buys an upgrade only when affordable, deducting cores', () => {
    const state = { cores: 100, upgrades: {} };
    const cost = nextCost(state, 'startGold')!;
    const after = buyUpgrade(state, 'startGold');
    expect(after.cores).toBe(100 - cost);
    expect(upgradeLevel(after, 'startGold')).toBe(1);
  });

  it('refuses a purchase with too few cores and leaves state untouched', () => {
    const state = { cores: 0, upgrades: {} };
    expect(buyUpgrade(state, 'startGold')).toEqual(state);
  });

  it('caps each upgrade at its max level', () => {
    let state: MetaState = { cores: 100000, upgrades: {} };
    const def = META_UPGRADES.find((u) => u.key === 'startGold')!;
    for (let i = 0; i < def.maxLevel + 3; i++) state = buyUpgrade(state, 'startGold');
    expect(upgradeLevel(state, 'startGold')).toBe(def.maxLevel);
    expect(nextCost(state, 'startGold')).toBeNull();
  });

  it('translates levels into stage bonuses', () => {
    const state: MetaState = { cores: 0, upgrades: { startGold: 3, startLives: 2, interest: 1, sellBack: 0 } };
    const b = metaBonuses(state);
    expect(b.startGold).toBe(75);
    expect(b.startLives).toBe(4);
    expect(b.interestRateBonus).toBeCloseTo(0.02);
    expect(b.sellRatioBonus).toBe(0);
  });

  it('a fresh state gives no bonuses', () => {
    expect(metaBonuses(fresh())).toEqual({
      startGold: 0, startLives: 0, interestRateBonus: 0, sellRatioBonus: 0,
    });
  });
});
