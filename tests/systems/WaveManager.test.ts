import { WaveManager } from '../../src/systems/WaveManager';
import { createEventBus } from '../../src/core/eventBus';
import type { GameEvents, Wave } from '../../src/core/types';

const waves: Wave[] = [
  { clearBonus: 20, groups: [
    { enemy: 'normal', count: 3, intervalMs: 500, startDelayMs: 0 },
    { enemy: 'fast', count: 2, intervalMs: 300, startDelayMs: 1000 },
  ]},
  { clearBonus: 30, groups: [
    { enemy: 'tank', count: 1, intervalMs: 0, startDelayMs: 0 },
  ]},
];

function setup() {
  const bus = createEventBus<GameEvents>();
  const started: number[] = [];
  const cleared: number[] = [];
  bus.on('wave:started', (p) => started.push(p.index));
  bus.on('wave:cleared', (p) => cleared.push(p.index));
  return { wm: new WaveManager(waves, bus), started, cleared };
}

describe('WaveManager', () => {
  it('spawns first group immediately, second after its delay', () => {
    const { wm } = setup();
    wm.startNextWave();
    // t=0: normal #1
    expect(wm.update(0).map(s => s.enemyKey)).toEqual(['normal']);
    // t=500: normal #2
    expect(wm.update(500).map(s => s.enemyKey)).toEqual(['normal']);
    // t=1000: normal #3 + fast #1 (fast startDelay=1000)
    const at1000 = wm.update(500).map(s => s.enemyKey).sort();
    expect(at1000).toEqual(['fast', 'normal']);
    // t=1300: fast #2
    expect(wm.update(300).map(s => s.enemyKey)).toEqual(['fast']);
    // no more spawns
    expect(wm.update(5000)).toEqual([]);
  });

  it('isWaveComplete only when every scheduled enemy is spawned and removed', () => {
    const { wm } = setup();
    wm.startNextWave();
    let spawned = 0;
    for (let i = 0; i < 40; i++) {
      const reqs = wm.update(200);
      spawned += reqs.length;
      reqs.forEach(() => wm.notifyEnemySpawned());
    }
    expect(spawned).toBe(5);
    expect(wm.isWaveComplete()).toBe(false);
    for (let i = 0; i < 4; i++) wm.notifyEnemyRemoved();
    expect(wm.isWaveComplete()).toBe(false);
    wm.notifyEnemyRemoved();
    expect(wm.isWaveComplete()).toBe(true);
  });

  it('startNextWave returns false past the last wave', () => {
    const { wm, started } = setup();
    expect(wm.startNextWave()).toBe(true);  // wave 0
    expect(wm.startNextWave()).toBe(true);  // wave 1
    expect(wm.startNextWave()).toBe(false); // none
    expect(started).toEqual([0, 1]);
  });
});
