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

  it('startNextWave is refused while a wave is still active, allowed after it completes', () => {
    const { wm } = setup();
    expect(wm.startNextWave()).toBe(true);   // wave 0 begins
    expect(wm.isWaveActive).toBe(true);
    expect(wm.startNextWave()).toBe(false);  // refused mid-wave
    // drain wave 0 fully
    let spawned = 0;
    for (let i = 0; i < 60; i++) {
      const reqs = wm.update(200);
      spawned += reqs.length;
      reqs.forEach(() => wm.notifyEnemySpawned());
    }
    for (let i = 0; i < spawned; i++) wm.notifyEnemyRemoved();
    expect(wm.isWaveActive).toBe(false);
    expect(wm.startNextWave()).toBe(true);   // now wave 1 is allowed
  });

  it('auto-advance starts wave 0 after the between-wave delay, and re-arms after a clear', () => {
    const { wm, started } = setup();
    let spawned = 0;
    const step = (ms: number) => {
      const reqs = wm.update(ms);
      spawned += reqs.length;
      reqs.forEach(() => wm.notifyEnemySpawned());
    };

    wm.enableAutoAdvance(3000);
    expect(wm.secondsToNextWave()).toBe(3);
    step(1000);                                     // 2s left, no wave yet
    expect(wm.secondsToNextWave()).toBe(2);
    expect(wm.isWaveActive).toBe(false);
    step(2500);                                     // countdown past 0 -> wave 0 auto-starts
    expect(wm.isWaveActive).toBe(true);
    expect(started).toEqual([0]);
    expect(wm.secondsToNextWave()).toBeNull();      // no countdown during an active wave

    for (let i = 0; i < 60 && wm.isWaveActive; i++) step(200);
    for (let i = 0; i < spawned; i++) wm.notifyEnemyRemoved();
    expect(wm.isWaveActive).toBe(false);
    expect(wm.secondsToNextWave()).toBe(3);         // countdown re-armed for wave 1
    step(3000);
    expect(started).toEqual([0, 1]);
  });

  it('manual startNextWave skips the auto countdown', () => {
    const { wm, started } = setup();
    wm.enableAutoAdvance(8000);
    wm.update(1000);
    expect(wm.isWaveActive).toBe(false);
    expect(wm.startNextWave()).toBe(true);
    expect(started).toEqual([0]);
    expect(wm.secondsToNextWave()).toBeNull();
  });

  it('no auto countdown once the last wave has started', () => {
    const { wm } = setup();
    wm.enableAutoAdvance(1000);
    wm.startNextWave();  // wave 0
    const drain = () => {
      let spawned = 0;
      for (let i = 0; i < 60; i++) {
        const reqs = wm.update(200);
        spawned += reqs.length;
        reqs.forEach(() => wm.notifyEnemySpawned());
      }
      for (let i = 0; i < spawned; i++) wm.notifyEnemyRemoved();
    };
    drain();
    wm.update(1000);     // auto-advance to wave 1 (the last)
    drain();
    expect(wm.secondsToNextWave()).toBeNull();
  });

  it('startNextWave returns false past the last wave', () => {
    const { wm, started } = setup();
    const drain = () => {
      let spawned = 0;
      for (let i = 0; i < 60; i++) {
        const reqs = wm.update(200);
        spawned += reqs.length;
        reqs.forEach(() => wm.notifyEnemySpawned());
      }
      for (let i = 0; i < spawned; i++) wm.notifyEnemyRemoved();
    };
    expect(wm.startNextWave()).toBe(true);  // wave 0
    drain();
    expect(wm.startNextWave()).toBe(true);  // wave 1
    drain();
    expect(wm.startNextWave()).toBe(false); // none
    expect(started).toEqual([0, 1]);
  });
});
