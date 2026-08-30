import Phaser from 'phaser';
import type { Vec2 } from '../core/types';

export interface ProjectileOpts {
  targetPos: () => Vec2 | null;
  speed: number;               // 픽셀/초
  onHit: (hitPos: Vec2) => void;
}

export class Projectile {
  private sprite: Phaser.GameObjects.Image;
  private last: Vec2 = { x: 0, y: 0 };
  private opts: ProjectileOpts | null = null;

  constructor(scene: Phaser.Scene) {
    this.sprite = scene.add.image(0, 0, 'projectile').setDepth(20).setVisible(false).setActive(false);
  }

  launch(from: Vec2, opts: ProjectileOpts): void {
    this.opts = opts;
    this.last = { ...(opts.targetPos() ?? from) };
    this.sprite.setPosition(from.x, from.y).setVisible(true).setActive(true);
  }

  update(dtMsRaw: number, speedMul: number): boolean {
    const opts = this.opts;
    if (!opts) return true;
    const target = opts.targetPos() ?? this.last;
    this.last = { ...target };
    const dx = target.x - this.sprite.x;
    const dy = target.y - this.sprite.y;
    const dist = Math.hypot(dx, dy);
    const move = (opts.speed * dtMsRaw / 1000) * speedMul;
    if (dist <= move || dist === 0) {
      this.opts = null;
      this.sprite.setVisible(false).setActive(false);
      opts.onHit({ x: target.x, y: target.y });
      return true;
    }
    this.sprite.x += (dx / dist) * move;
    this.sprite.y += (dy / dist) * move;
    return false;
  }
}
