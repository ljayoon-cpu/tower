import { towerInfo } from '../../src/core/towerInfo';
import { TOWERS } from '../../src/data/towers';

describe('towerInfo', () => {
  it('single-target dps is damage x fireRate', () => {
    const lv1 = TOWERS.arrow.levels[0];
    const info = towerInfo('arrow', 1);
    expect(info.dps).toBe(Math.round(lv1.damage * lv1.fireRate));
    expect(info.range).toBe(lv1.range);
    expect(info.name).toBe('화살탑');
    expect(info.level).toBe(1);
    expect(info.maxLevel).toBe(5);
  });

  it('reports next-level dps, and null at max level', () => {
    expect(towerInfo('arrow', 1).nextDps).toBe(towerInfo('arrow', 2).dps);
    expect(towerInfo('arrow', 5).nextDps).toBeNull();
  });

  it('chain dps sums the falloff jumps', () => {
    const s = TOWERS.bolt.levels[2];
    const jumps = s.chainTargets ?? 0;
    let expected = 0;
    for (let i = 0; i <= jumps; i++) expected += Math.round(s.damage * (s.chainFalloff ?? 1) ** i);
    expect(towerInfo('bolt', 3).dps).toBe(Math.round(expected * s.fireRate));
    expect(towerInfo('bolt', 3).note).toContain('연쇄');
  });

  it('notes splash and slow', () => {
    expect(towerInfo('cannon', 1).note).toContain('광역');
    expect(towerInfo('frost', 1).note).toContain('감속');
  });

  it('surfaces the merge (3/5) tower abilities in the note', () => {
    expect(towerInfo('arrow', 2).note).toBe('');
    expect(towerInfo('arrow', 3).note).toContain('멀티샷');
    expect(towerInfo('cannon', 2).note).not.toContain('방어');
    expect(towerInfo('cannon', 3).note).toContain('방어 -');
    expect(towerInfo('bolt', 3).note).toContain('경직');
    expect(towerInfo('poison', 3).note).toContain('방어 무시');
    expect(towerInfo('sniper', 2).note).toBe('');
    expect(towerInfo('sniper', 3).note).toContain('처형');
    expect(towerInfo('sniper', 5).note).toContain('처형');
  });

  it('notes and scores the support / beam towers', () => {
    expect(towerInfo('laser', 1).note).toContain('집중');
    const l = TOWERS.laser.levels[0];
    expect(towerInfo('laser', 1).dps).toBe(Math.round(l.damage * l.fireRate * (l.beamRampMax ?? 1)));
    expect(towerInfo('command', 1).note).toContain('공격력');
    expect(towerInfo('mine', 1).note).toContain('G');
  });

  it('surfaces merge abilities for laser / command / mine too', () => {
    expect(towerInfo('laser', 2).note).not.toContain('방어');
    expect(towerInfo('laser', 3).note).toContain('방어 -');   // 레이저 3합: 방어구 파괴
    expect(towerInfo('command', 2).note).not.toContain('사거리');
    expect(towerInfo('command', 3).note).toContain('사거리 +'); // 지휘탑 3합: 사거리 버프
    expect(towerInfo('mine', 2).note).not.toContain('웨이브당');
    expect(towerInfo('mine', 3).note).toContain('웨이브당 +');   // 금광탑 3합: 웨이브 배당
  });

  it('shows frost freeze at merge levels 3 and 5', () => {
    expect(towerInfo('frost', 3).note).toBe('감속 42% · 3타 빙결 0.35초');
    expect(towerInfo('frost', 5).note).toBe('감속 65% · 3타 빙결 0.7초');
  });

  it('clamps level into range', () => {
    expect(towerInfo('arrow', 0).level).toBe(1);
    expect(towerInfo('arrow', 99).level).toBe(5);
  });

  it('throws on unknown key', () => {
    expect(() => towerInfo('nope', 1)).toThrow();
  });
});
