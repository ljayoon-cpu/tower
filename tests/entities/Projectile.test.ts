import type Phaser from 'phaser';
import { Projectile } from '../../src/entities/Projectile';
import { Pool } from '../../src/core/pool';

function renderer() {
  const sprite = {
    x: 0, y: 0, visible: false, active: false,
    setDepth() { return this; },
    setPosition(x: number, y: number) { this.x = x; this.y = y; return this; },
    setVisible(v: boolean) { this.visible = v; return this; },
    setActive(v: boolean) { this.active = v; return this; },
  };
  const image = vi.fn(() => sprite);
  return { sprite, image, scene: { add: { image } } as unknown as Phaser.Scene };
}

describe('pooled projectiles', () => {
  it('reuses its sprite and replaces the previous target and hit callback', () => {
    const r = renderer();
    const pool = new Pool(() => new Projectile(r.scene));
    const firstHit = vi.fn();
    const first = pool.acquire();
    first.launch({ x: 0, y: 0 }, { speed: 100, targetPos: () => ({ x: 100, y: 0 }), onHit: firstHit });
    expect(first.update(500, 2)).toBe(true);
    expect(firstHit).toHaveBeenCalledOnce();
    expect(r.sprite.visible).toBe(false);
    pool.release(first);
    const secondHit = vi.fn();
    const second = pool.acquire();
    second.launch({ x: 20, y: 10 }, { speed: 100, targetPos: () => ({ x: 20, y: 110 }), onHit: secondHit });
    expect(second).toBe(first);
    expect(r.sprite.visible).toBe(true);
    expect(second.update(1000, 1)).toBe(true);
    second.update(1000, 1);
    expect(secondHit).toHaveBeenCalledExactlyOnceWith({ x: 20, y: 110 });
    expect(firstHit).toHaveBeenCalledOnce();
    expect(r.image).toHaveBeenCalledOnce();
  });

  it('continues to the last target position when its target disappears', () => {
    const r = renderer();
    const shot = new Projectile(r.scene);
    let target: { x: number; y: number } | null = { x: 100, y: 0 };
    const hit = vi.fn();
    shot.launch({ x: 0, y: 0 }, { speed: 100, targetPos: () => target, onHit: hit });
    expect(shot.update(250, 1)).toBe(false);
    target = null;
    expect(shot.update(250, 1)).toBe(false);
    expect(hit).not.toHaveBeenCalled();
    expect(shot.update(500, 1)).toBe(true);
    expect(hit).toHaveBeenCalledWith({ x: 100, y: 0 });
  });
});
