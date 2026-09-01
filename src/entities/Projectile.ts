import Phaser from 'phaser';
import type { Vec2 } from '../core/types';

export interface ProjectileOpts {
  targetPos: () => Vec2 | null;
  speed: number;               // 픽셀/초
  onHit: (hitPos: Vec2) => void;
  /** 타워별로 즉시 알아볼 수 있는 투사체 텍스처. */
  textureKey?: string;
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
    this.sprite
      .setTexture(opts.textureKey ?? 'projectile')
      .setPosition(from.x, from.y)
      // 풀에서 되살아난 투사체도 레벨과 무관하게 Lv1 크기를 유지한다.
      .setScale(1)
      .setVisible(true)
      .setActive(true);
    this.face(this.last.x - from.x, this.last.y - from.y);
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
    this.face(dx, dy);
    return false;
  }

  private face(dx: number, dy: number): void {
    if (dx !== 0 || dy !== 0) this.sprite.setRotation(Math.atan2(dy, dx));
  }
}
