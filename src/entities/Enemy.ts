import Phaser from 'phaser';
import type { EnemyDef, Vec2 } from '../core/types';
import { PathManager } from '../systems/PathManager';

let nextId = 1;

export class Enemy {
  readonly id = nextId++;
  readonly sprite: Phaser.GameObjects.Image;
  private readonly healthBar: Phaser.GameObjects.Graphics;
  private readonly barWidth: number;
  private traveled = 0;
  private _hp: number;
  private slowMul = 1;
  private slowLeftMs = 0;
  private _done = false;
  private _progress = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly def: EnemyDef,
    private readonly polyline: Vec2[],
  ) {
    this._hp = def.hp;
    const start = polyline[0];
    this.sprite = scene.add.image(start.x, start.y, `enemy_${def.key}`);
    this.barWidth = def.isBoss ? 40 : 22;
    this.healthBar = scene.add.graphics().setDepth(15).setVisible(false);
  }

  get pos(): Vec2 { return { x: this.sprite.x, y: this.sprite.y }; }
  get hp(): number { return this._hp; }
  get alive(): boolean { return this._hp > 0 && !this._done; }
  get reachedGoal(): boolean { return this._done; }
  get progress(): number {
    return this._progress;
  }
  /** 0~1. 남은 체력 비율(음수는 0으로 고정). */
  get healthRatio(): number {
    return Math.max(0, this._hp) / this.def.hp;
  }

  takeDamage(n: number): void {
    if (!this.alive) return;
    this._hp -= n;
    if (this._hp <= 0) {
      this.sprite.setVisible(false);
      this.healthBar.setVisible(false);
    } else {
      this.flashHit();
      this.drawHealthBar();
    }
  }

  /** 피격 시 짧은 흰색 플래시. 시간 API가 없는 테스트 환경에서는 조용히 넘어간다. */
  private flashHit(): void {
    const sprite = this.sprite as Phaser.GameObjects.Image & {
      setTintFill?: (c: number) => unknown; clearTint?: () => unknown;
    };
    if (!sprite.setTintFill || !this.scene.time) return;
    sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => sprite.clearTint?.());
  }

  private drawHealthBar(): void {
    const ratio = this.healthRatio;
    if (ratio >= 1 || !this.alive) { this.healthBar.setVisible(false); return; }
    const w = this.barWidth;
    const x = this.sprite.x - w / 2;
    const y = this.sprite.y - (this.def.isBoss ? 30 : 18);
    this.healthBar.clear();
    this.healthBar.fillStyle(0x000000, 0.6);
    this.healthBar.fillRect(x - 1, y - 1, w + 2, 5);
    this.healthBar.fillStyle(ratio > 0.5 ? 0x7dd87d : ratio > 0.25 ? 0xffcc44 : 0xff5566, 1);
    this.healthBar.fillRect(x, y, w * ratio, 3);
    this.healthBar.setVisible(true);
  }

  applySlow(mul: number, durationMs: number): void {
    // 더 강한(작은) 감속 우선, 지속시간 갱신
    this.slowMul = Math.min(this.slowMul === 1 ? mul : this.slowMul, mul);
    this.slowLeftMs = Math.max(this.slowLeftMs, durationMs);
  }

  update(dtMs: number, speedMul: number): void {
    if (!this.alive) return;
    const simulationMs = dtMs * speedMul;
    const slowedMs = Math.min(simulationMs, Math.max(0, this.slowLeftMs));
    this.traveled += this.def.speed * (slowedMs * this.slowMul + simulationMs - slowedMs) / 1000;
    this.slowLeftMs = Math.max(0, this.slowLeftMs - simulationMs);
    if (this.slowLeftMs === 0) this.slowMul = 1;
    const a = PathManager.advance(this.polyline, this.traveled);
    this._progress = a.progress;
    this.sprite.setPosition(a.pos.x, a.pos.y);
    if (a.done) { this._done = true; this.sprite.setVisible(false); this.healthBar.setVisible(false); }
    else this.drawHealthBar();
  }

  destroy(): void { this.sprite.destroy(); this.healthBar.destroy(); }
}
