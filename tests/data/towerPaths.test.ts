import { TOWERS, TOWER_KEYS } from '../../src/data/towers';

const BRANCHED = ['arrow', 'cannon', 'frost', 'bolt', 'sniper', 'poison'];

describe('tower paths', () => {
  it('branched towers keep Lv1~2 shared and Lv3~5 in both paths', () => {
    for (const key of BRANCHED) {
      const def = TOWERS[key];
      expect(def.levels).toHaveLength(2);
      expect(def.paths).toBeDefined();
      for (const p of ['a', 'b'] as const) {
        expect(def.paths![p].levels).toHaveLength(3);
        expect(def.paths![p].key).toBe(p);
        // 성장 단조성
        expect(def.paths![p].levels[2].damage).toBeGreaterThan(def.paths![p].levels[0].damage);
      }
    }
  });

  it('branched towers give A and B distinct, non-empty names', () => {
    for (const key of BRANCHED) {
      const paths = TOWERS[key].paths!;
      expect(paths.a.name.length).toBeGreaterThan(0);
      expect(paths.b.name.length).toBeGreaterThan(0);
      expect(paths.a.name).not.toBe(paths.b.name);
    }
  });

  it('non-branched towers keep the flat 5-level shape', () => {
    for (const key of TOWER_KEYS) {
      if (BRANCHED.includes(key)) continue;
      expect(TOWERS[key].levels).toHaveLength(TOWERS[key].maxLevel);
      expect(TOWERS[key].paths).toBeUndefined();
    }
  });
});
