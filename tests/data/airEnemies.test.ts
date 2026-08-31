import { getEnemy } from '../../src/data/enemies';
import { getTower } from '../../src/data/towers';

describe('air enemies', () => {
  it.each(['drone', 'gunship', 'carrier', 'airboss'])('%s flies', (key) => {
    expect(getEnemy(key).movementLayer).toBe('air');
  });
  it('carrier drops ground minions on death', () => {
    const c = getEnemy('carrier');
    expect(c.deathSpawn).toEqual({ enemyKey: 'minion', count: 3 });
    expect(getEnemy(c.deathSpawn!.enemyKey).movementLayer ?? 'ground').toBe('ground');
  });
});

describe('ground-only towers', () => {
  it.each(['cannon', 'poison'])('%s cannot target air', (key) => {
    expect(getTower(key).targetsAir).toBe(false);
  });
});
