import Phaser from 'phaser';
import type { Vec2 } from '../core/types';

export interface ProjectileOpts {
  targetPos: () => Vec2 | null;
  speed: number;               // 픽셀/초
  onHit: (hitPos: Vec2) => void;
}

export class Projectile {
  private sprite: Phaser.GameObjects.Image;
  private last: Vec2;

  constructor(scene: Phaser.Scene, from: Vec2, private opts: ProjectileOpts) {
    this.sprite = scene.add.image(from.x, from.y, 'projectile').setDepth(20);
    this.last = { ...from };
  }

  update(dtMs: number, speedMul: number): boolean {
    const target = this.opts.targetPos() ?? this.last;
    const dx = target.x - this.sprite.x;
    const dy = target.y - this.sprite.y;
    const dist = Math.hypot(dx, dy);
    const move = (this.opts.speed * dtMs / 1000) * speedMul;
    if (dist <= move || dist === 0) {
      this.opts.onHit({ x: target.x, y: target.y });
      this.sprite.destroy();
      return true;
    }
    this.sprite.x += (dx / dist) * move;
    this.sprite.y += (dy / dist) * move;
    this.last = { x: this.sprite.x, y: this.sprite.y };
    return false;
  }

  destroy(): void { this.sprite.destroy(); }
}
