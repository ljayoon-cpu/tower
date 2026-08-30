import { TOWERS, TOWER_KEYS, getTower } from '../../src/data/towers';
import { ENEMIES, getEnemy } from '../../src/data/enemies';

describe('tower definitions', () => {
  it('every tower has exactly maxLevel level entries with increasing damage', () => {
    for (const key of TOWER_KEYS) {
      const t = TOWERS[key];
      expect(t.levels.length).toBe(t.maxLevel);
      expect(t.maxLevel).toBe(5);
      for (let i = 1; i < t.levels.length; i++) {
        expect(t.levels[i].damage).toBeGreaterThanOrEqual(t.levels[i - 1].damage);
        expect(t.levels[i].range).toBeGreaterThanOrEqual(t.levels[i - 1].range);
      }
    }
  });

  it('attack-kind specific fields are present', () => {
    expect(TOWERS.cannon.levels[0].splashRadius).toBeGreaterThan(0);
    expect(TOWERS.frost.levels[0].slowMul).toBeGreaterThan(0);
    expect(TOWERS.frost.levels[0].slowMul).toBeLessThan(1);
    expect(TOWERS.bolt.attack).toBe('chain');
    expect(TOWERS.bolt.levels[0].chainTargets).toBeGreaterThan(0);
    expect(TOWERS.bolt.levels[0].chainFalloff).toBeGreaterThan(0);
    expect(TOWERS.bolt.levels[0].chainFalloff).toBeLessThan(1);
    expect(TOWERS.bolt.levels[0].chainRange).toBeGreaterThan(0);
  });

  it('bolt chain gets more targets and gentler falloff as it levels', () => {
    const lv = TOWERS.bolt.levels;
    expect(lv[4].chainTargets!).toBeGreaterThanOrEqual(lv[0].chainTargets!);
    expect(lv[4].chainFalloff!).toBeGreaterThanOrEqual(lv[0].chainFalloff!);
  });

  it('getTower throws on unknown key', () => {
    expect(() => getTower('nope')).toThrow();
  });
});

describe('enemy definitions', () => {
  it('fast is faster than normal, tank has more hp', () => {
    expect(ENEMIES.fast.speed).toBeGreaterThan(ENEMIES.normal.speed);
    expect(ENEMIES.tank.hp).toBeGreaterThan(ENEMIES.normal.hp);
    expect(ENEMIES.boss.isBoss).toBe(true);
  });

  it('getEnemy throws on unknown key', () => {
    expect(() => getEnemy('nope')).toThrow();
  });
});
