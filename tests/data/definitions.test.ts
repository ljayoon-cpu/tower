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

    expect(poison).toMatchObject({ key: 'poison', name: '역병탑', attack: 'poison', cost: 90, maxLevel: 5 });
    expect(poison.levels[4].poisonDps!).toBeGreaterThan(poison.levels[0].poisonDps!);
    expect(poison.levels[0].poisonRadius).toBeGreaterThan(0);
    expect(poison.levels[0].poisonDurationMs).toBeGreaterThan(0);

    for (let level = 1; level <= poison.maxLevel; level++) {
      const poisonPerGold = towerInfo('poison', level).dps / (poison.cost * 2 ** (level - 1));
      const arrowPerGold = towerInfo('arrow', level).dps / (arrow.cost * 2 ** (level - 1));
      expect(poisonPerGold).toBeLessThan(arrowPerGold);
    }
  });
  it('adds a ramping beam tower (마광탑) that is swarm-weak by design', () => {
    const laser = getTower('laser');
    expect(laser).toMatchObject({ key: 'laser', name: '마광탑', attack: 'beam', maxLevel: 5 });
    for (const l of laser.levels) {
      expect(l.beamRampPct!).toBeGreaterThan(0);
      expect(l.beamRampMax!).toBeGreaterThan(1);
    }
    // 램프가 다 쌓이기 전 기본 화력은 저격탑 한 방보다 낮다(즉발 스웜 처리에 불리).
    expect(laser.levels[4].damage).toBeLessThan(getTower('sniper').levels[4].damage);
  });

  it('adds support towers (지휘탑 buff, 금광탑 economy) with no real direct damage', () => {
    const command = getTower('command');
    const mine = getTower('mine');
    expect(command.attack).toBe('support');
    expect(mine.attack).toBe('support');
    for (const l of command.levels) {
      expect(l.buffRadius!).toBeGreaterThan(0);
      expect(l.buffDamagePct!).toBeGreaterThan(0);
    }
    for (const l of mine.levels) {
      expect(l.goldPerTick!).toBeGreaterThan(0);
      expect(l.goldIntervalMs!).toBeGreaterThan(0);
    }
    // 지원형은 직접 화력이 화살탑보다 한참 약해야 한다.
    expect(command.levels[4].damage).toBeLessThan(getTower('arrow').levels[4].damage);
    expect(mine.levels[4].damage).toBeLessThan(getTower('arrow').levels[4].damage);
    // 지휘탑 버프·금광탑 생산은 레벨이 오를수록 세진다.
    expect(command.levels[4].buffDamagePct!).toBeGreaterThan(command.levels[0].buffDamagePct!);
    expect(mine.levels[4].goldPerTick!).toBeGreaterThan(mine.levels[0].goldPerTick!);
  });

  it('gives arrow multishot and cannon armor-break only at merge levels 3+', () => {
    const arrow = getTower('arrow');
    expect(arrow.levels[1].projectileCount ?? 1).toBe(1);
    expect(arrow.levels[2].projectileCount).toBeGreaterThan(1);
    expect(arrow.levels[4].projectileCount!).toBeGreaterThanOrEqual(arrow.levels[2].projectileCount!);
    for (const l of arrow.levels) {
      if (l.projectileCount && l.projectileCount > 1) {
        expect(l.projectileDamageMultiplier!).toBeGreaterThan(0);
        expect(l.projectileDamageMultiplier!).toBeLessThan(1); // 발당 피해는 감소
      }
    }

    const cannon = getTower('cannon');
    expect(cannon.levels[1].armorBreakPercent ?? 0).toBe(0);
    expect(cannon.levels[2].armorBreakPercent!).toBeGreaterThan(0);
    expect(cannon.levels[4].armorBreakPercent!).toBeGreaterThanOrEqual(cannon.levels[2].armorBreakPercent!);
    for (const l of cannon.levels) {
      if (l.armorBreakPercent) expect(l.armorBreakDurationMs!).toBeGreaterThan(0);
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
  it('gives each enemy a clear counter via the resist table', () => {
    expect(ENEMIES.tank.resist?.splash).toBeGreaterThan(1);   // 장갑병 ← 대포
    expect(ENEMIES.tank.resist?.single).toBeLessThan(1);
    expect(ENEMIES.shield.resist?.chain).toBeGreaterThan(1);  // 방어막병 ← 번개
    expect(ENEMIES.regenerator.resist?.poison).toBeGreaterThan(1); // 재생충 ← 독
    expect(ENEMIES.boss.resist?.beam).toBeGreaterThan(1);     // 보스 ← 레이저
    expect(ENEMIES.boss.resist?.single).toBeLessThan(1);
  });

  it('adds late-endless threats: splitter, berserker, crusher', () => {
    expect(ENEMIES.splitter.deathSpawn).toMatchObject({ enemyKey: 'splitterling' });
    expect(ENEMIES.splitterling.hp).toBeLessThan(ENEMIES.splitter.hp);
    expect(ENEMIES.berserker.rageBelow).toBeGreaterThan(0);
    expect(ENEMIES.berserker.rageSpeedMultiplier!).toBeGreaterThan(1);
    expect(ENEMIES.crusher.hp).toBeGreaterThan(ENEMIES.tank.hp * 2);
    expect(ENEMIES.crusher.armor!).toBeGreaterThan(ENEMIES.tank.armor!);
  });

  it('getEnemy throws on unknown key', () => {
    expect(() => getEnemy('nope')).toThrow();
  });
});
