import { TOWERS, TOWER_KEYS, getTower } from '../../src/data/towers';
import { towerInfo } from '../../src/core/towerInfo';
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

  it('keeps cannon shots deliberately slow to reward clustered enemies', () => {
    const fr = TOWERS.cannon.levels.map((l) => l.fireRate);
    expect(Math.max(...fr)).toBeLessThan(1);                       // slower than every other tower
    expect(fr[4]).toBeGreaterThan(fr[0]);                          // speeds up a little with level
    for (const l of TOWERS.cannon.levels) expect(l.splashRadius!).toBeGreaterThan(0);
  });

  it('bolt chain gets more targets and gentler falloff as it levels', () => {
    const lv = TOWERS.bolt.levels;
    expect(lv[4].chainTargets!).toBeGreaterThanOrEqual(lv[0].chainTargets!);
    expect(lv[4].chainFalloff!).toBeGreaterThanOrEqual(lv[0].chainFalloff!);
  });

  it('adds sniper as a costly long-range tower without beating arrow gold efficiency', () => {
    const sniper = getTower('sniper');
    const arrow = getTower('arrow');

    expect(sniper).toMatchObject({ key: 'sniper', name: '저격탑', attack: 'single', cost: 125, maxLevel: 5 });
    expect(sniper.levels[0].range).toBeGreaterThan(arrow.levels[arrow.levels.length - 1].range);
    for (const l of sniper.levels) expect(l.armorPierce!).toBeGreaterThan(0);

    for (let level = 1; level <= sniper.maxLevel; level++) {
      const sniperPerGold = towerInfo('sniper', level).dps / (sniper.cost * 2 ** (level - 1));
      const arrowPerGold = towerInfo('arrow', level).dps / (arrow.cost * 2 ** (level - 1));
      expect(sniperPerGold).toBeLessThan(arrowPerGold);
    }
  });

  it('adds poison as a damage-over-time splash tower without beating arrow gold efficiency', () => {
    const poison = getTower('poison');
    const arrow = getTower('arrow');

    expect(poison).toMatchObject({ key: 'poison', name: '독 타워', attack: 'poison', cost: 90, maxLevel: 5 });
    expect(poison.levels[4].poisonDps!).toBeGreaterThan(poison.levels[0].poisonDps!);
    expect(poison.levels[0].poisonRadius).toBeGreaterThan(0);
    expect(poison.levels[0].poisonDurationMs).toBeGreaterThan(0);

    for (let level = 1; level <= poison.maxLevel; level++) {
      const poisonPerGold = towerInfo('poison', level).dps / (poison.cost * 2 ** (level - 1));
      const arrowPerGold = towerInfo('arrow', level).dps / (arrow.cost * 2 ** (level - 1));
      expect(poisonPerGold).toBeLessThan(arrowPerGold);
    }
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

  it('defines distinct shield, armor, regeneration, and summoner counters', () => {
    expect(ENEMIES.shield.shield?.energy).toBeGreaterThan(0);
    expect(ENEMIES.tank.armor).toBeGreaterThan(0);
    expect(ENEMIES.regenerator.regenPerSecond).toBeGreaterThan(0);
    expect(ENEMIES.summoner.summon).toMatchObject({ enemyKey: 'minion' });
    expect(ENEMIES.minion.intercepts).toBe(true);
  });
  it('getEnemy throws on unknown key', () => {
    expect(() => getEnemy('nope')).toThrow();
  });
});
