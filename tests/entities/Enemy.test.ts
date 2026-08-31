import type Phaser from 'phaser';
import { Enemy } from '../../src/entities/Enemy';
import type { EnemyDef } from '../../src/core/types';

// Minimal rendering boundary; movement and status effects use the real Enemy.
function makeEnemy(hp = 100, extras: Partial<EnemyDef> = {}) {
  const sprite = {
    x: 0, y: 0,
    setPosition(x: number, y: number) { this.x = x; this.y = y; return this; },
    setVisible() { return this; },
  };
  const bar = {
    clear() { return this; }, fillStyle() { return this; }, fillRect() { return this; },
    setDepth() { return this; }, setVisible() { return this; }, setPosition() { return this; },
    destroy() {},
  };
  const arc = {
    setDepth() { return this; }, setVisible() { return this; }, setPosition() { return this; },
    setStrokeStyle() { return this; }, destroy() {},
  };
  const scene = {
    add: { image: () => sprite, graphics: () => bar, circle: () => arc },
  } as unknown as Phaser.Scene;
  return new Enemy(scene, { key: 'normal', name: '', hp, speed: 100, bounty: 1, lifeDamage: 1, ...extras },
    [{ x: 0, y: 0 }, { x: 0, y: 10000 }]);
}

describe('enemy health ratio', () => {
  it('reports full health until damaged, then clamps at zero', () => {
    const e = makeEnemy(100);
    expect(e.healthRatio).toBe(1);
    e.takeDamage(25);
    expect(e.healthRatio).toBe(0.75);
    e.takeDamage(999);
    expect(e.healthRatio).toBe(0);
  });
});

describe('enemy simulation time', () => {
  it('expires slow at the same game time at 1x and 2x', () => {
    const normal = makeEnemy();
    const fast = makeEnemy();
    normal.applySlow(0.5, 1000);
    fast.applySlow(0.5, 1000);
    for (let i = 0; i < 20; i++) normal.update(100, 1);
    for (let i = 0; i < 10; i++) fast.update(100, 2);
    expect(normal.pos.y).toBeCloseTo(150);
    expect(fast.pos.y).toBeCloseTo(150);
  });
  it('applies poison damage over simulation time and stops when the effect expires', () => {
    const e = makeEnemy();
    e.applyPoison(10, 1000);
    e.update(500, 1);
    expect(e.hp).toBeCloseTo(95);
    e.update(500, 1);
    expect(e.hp).toBeCloseTo(90);
    e.update(100, 1);
    expect(e.hp).toBeCloseTo(90);
  });
});

describe('enemy summons', () => {
  it('spawns only up to its living-minion cap, and frees a slot when a minion is removed', () => {
    const e = makeEnemy(100, { summon: { enemyKey: 'minion', intervalMs: 500, maxAlive: 1 } });

    e.update(500, 1);
    expect(e.collectSummons()).toEqual(['minion']);
    e.update(1000, 1);
    expect(e.collectSummons()).toEqual([]);

    e.notifySummonRemoved();
    expect(e.collectSummons()).toEqual(['minion']);
  });
});
