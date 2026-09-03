import { vi } from 'vitest';
import { writeFileSync } from 'node:fs';
vi.mock('phaser', () => ({ default: { Scene: class {} } }));
import { STAGES } from '../../src/data/stages';
import { TOWERS } from '../../src/data/towers';
import { ENEMIES } from '../../src/data/enemies';
import { mergeArmy, noDefense, oneArrow, simulate, spread } from './harness';

describe.skipIf(!process.env.BALANCE_EXPLORE)('temporary balance exploration, not production tuning', () => {
  it('compares candidates', () => {
    const original = structuredClone(TOWERS);
    const originalEnemies = structuredClone(ENEMIES);
    const rows = [];
    const damageArrays = {
      arrow: [8, 20, 50, 125, 313],
      cannon: [22, 55, 138, 344, 860],
      bolt: [7, 18, 44, 110, 274],
      frost: [3, 8, 19, 47, 117],
    };
    try {
      for (const [key, damages] of Object.entries(damageArrays)) {
        const t = TOWERS[key];
        const flat = t.paths ? [...t.levels, ...t.paths.a.levels] : t.levels;
        damages.forEach((d, i) => { flat[i].damage = d; });
      }
      const strategies = {
        none: noDefense, oneArrow,
        arrowSpread: spread(['arrow']), cannonSpread: spread(['cannon']), boltSpread: spread(['bolt']),
        mixedSpread: spread(['arrow', 'cannon', 'bolt', 'frost']),
        arrowCannonSpread: spread(['arrow', 'cannon']),
        arrowMerge: mergeArmy(['arrow', 'arrow', 'arrow']),
        mixedMerge: mergeArmy(['arrow', 'cannon', 'bolt', 'frost']),
        twoArrowMerge: mergeArmy(['arrow', 'arrow', 'cannon', 'frost']),
        trioMerge: mergeArmy(['arrow', 'cannon', 'frost']),
        cannonFrostMerge: mergeArmy(['cannon', 'frost']),
        cannonArrowMerge: mergeArmy(['cannon', 'arrow']),
        boltCannonMerge: mergeArmy(['bolt', 'cannon']),
      };
      for (const tankHp of [500, 550]) for (const tankCount of [20, 24, 28]) for (const base of STAGES.slice(2)) {
        const stage = structuredClone(base);
        ENEMIES.tank.hp = tankHp;
        ENEMIES.tank.lifeDamage = 2;
        const tankGroup = stage.waves[stage.waves.length - 1].groups.find(g => g.enemy === 'tank');
        if (tankGroup) { tankGroup.count = tankCount; tankGroup.intervalMs = 200; }
        for (const [strategy, play] of Object.entries(strategies)) {
          if (strategy === 'none' || strategy === 'oneArrow') continue;
          rows.push({ tankHp, tankCount, strategy, ...simulate(stage, play, 42) });
        }
      }
      writeFileSync('docs/balance-exploration.json', JSON.stringify(rows, null, 2));
    } finally { Object.assign(TOWERS, original); Object.assign(ENEMIES, originalEnemies); }
    expect(rows.length).toBeGreaterThan(0);
  }, 120000);
});
