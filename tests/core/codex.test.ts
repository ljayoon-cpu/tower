import { describe, expect, it } from 'vitest';
import { TOWER_KEYS, getTower } from '../../src/data/towers';
import {
  TOWER_CODEX, ENEMY_CODEX, CODEX_TOWER_KEYS, CODEX_ENEMY_KEYS, towerCard, enemyCard,
} from '../../src/core/codex';
import { getEnemy } from '../../src/data/enemies';

describe('codex data', () => {
  it('has a written entry for every tower', () => {
    for (const key of TOWER_KEYS) {
      const e = TOWER_CODEX.find((x) => x.key === key);
      expect(e, `no codex entry for tower ${key}`).toBeDefined();
      expect(e!.role.length).toBeGreaterThan(4);
      expect(e!.strong.length).toBeGreaterThan(4);
      expect(e!.weak.length).toBeGreaterThan(4);
    }
    expect(TOWER_CODEX).toHaveLength(TOWER_KEYS.length);
  });

  it('every codex enemy key resolves to a real enemy and carries a counter', () => {
    for (const key of CODEX_ENEMY_KEYS) {
      expect(() => getEnemy(key)).not.toThrow();
      const e = ENEMY_CODEX.find((x) => x.key === key)!;
      expect(e.trait.length).toBeGreaterThan(4);
      expect(e.counter.length).toBeGreaterThan(4);
    }
  });

  it('towerCard gives the Lv1→Lv5 progression for the "/" display', () => {
    const c = towerCard('arrow');
    expect(c.name).toBe('화살탑');
    expect(c.cost).toBe(50);
    expect(c.dps).toHaveLength(5);
    expect(c.range).toHaveLength(5);
    expect(c.fireRate).toHaveLength(5);
    // 강화할수록 오른다.
    expect(c.dps[4]).toBeGreaterThan(c.dps[0]);
    expect(c.range[4]).toBeGreaterThanOrEqual(c.range[0]);
  });

  it('codex lists towers cheapest-first', () => {
    const costs = CODEX_TOWER_KEYS.map((k) => getTower(k).cost);
    expect(costs).toEqual([...costs].sort((a, b) => a - b));
    expect(CODEX_TOWER_KEYS).toHaveLength(TOWER_KEYS.length);
  });

  it('enemyCard tags derive from enemy traits', () => {
    expect(enemyCard('tank').tags).toContain('장갑 7');
    expect(enemyCard('shield').tags).toContain('방어막');
    expect(enemyCard('regenerator').tags).toContain('재생');
    expect(enemyCard('splitter').tags).toContain('분열');
    expect(enemyCard('drone').tags).toContain('공중');
    expect(enemyCard('boss').tags).toContain('보스');
    expect(enemyCard('normal').tags).toEqual([]);
  });
});
