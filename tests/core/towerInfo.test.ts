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

  it('shows poison armor piercing for merge levels', () => {
    expect(towerInfo('poison', 2).note).not.toContain('방어');
    expect(towerInfo('poison', 3).note).toContain('방어 무시 8');
    expect(towerInfo('poison', 5).note).toContain('방어 무시 15');
  });

  it('clamps level into range', () => {
    expect(towerInfo('arrow', 0).level).toBe(1);
    expect(towerInfo('arrow', 99).level).toBe(5);
  });

  it('throws on unknown key', () => {
    expect(() => towerInfo('nope', 1)).toThrow();
  });
});
