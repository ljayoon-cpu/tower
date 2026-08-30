import type Phaser from 'phaser';
import { Enemy } from '../../src/entities/Enemy';

// Minimal rendering boundary; movement and status effects use the real Enemy.
function makeEnemy() {
  const sprite = {
    x: 0, y: 0,
    setPosition(x: number, y: number) { this.x = x; this.y = y; return this; },
    setVisible() { return this; },
  };
  const scene = { add: { image: () => sprite } } as unknown as Phaser.Scene;
  return new Enemy(scene, { key: 'normal', name: '', hp: 100, speed: 100, bounty: 1, lifeDamage: 1 },
    [{ x: 0, y: 0 }, { x: 0, y: 10000 }]);
}

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
});
