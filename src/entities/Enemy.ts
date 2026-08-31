import Phaser from 'phaser';
import type { EnemyDef, Vec2 } from '../core/types';
import { PathManager } from '../systems/PathManager';

let nextId = 1;

export class Enemy {
  readonly id = nextId++;
  readonly sprite: Phaser.GameObjects.Image;
  private readonly healthBar: Phaser.GameObjects.Graphics;
  private readonly slowAura: Phaser.GameObjects.Arc;
  private readonly poisonAura: Phaser.GameObjects.Arc;
  private readonly barWidth: number;
  private traveled = 0;
  private _hp: number;
  private slowMul = 1;
  private slowLeftMs = 0;
  private poisonDps = 0;
  private poisonLeftMs = 0;
  private _done = false;
  private _progress = 0;
  private _freed = false;

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
    this.slowAura = scene.add
      .circle(start.x, start.y, def.isBoss ? 30 : 18, 0x99e6ff, 0.16)
      .setStrokeStyle(2, 0x99e6ff, 0.85)
      .setDepth(4)
      .setVisible(false);
    this.poisonAura = scene.add
      .circle(start.x, start.y, def.isBoss ? 25 : 15, 0x71d957, 0.14)
      .setStrokeStyle(2, 0x71d957, 0.82)
      .setDepth(4)
      .setVisible(false);
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

  takeDamage(n: number, flash = true): void {
    if (!this.alive) return;
    this._hp -= n;
    if (this._hp <= 0) {
      // 스프라이트는 destroy()의 소멸 트윈이 처리한다. 여기선 부가 표시만 정리.
      this.healthBar.setVisible(false);
      this.slowAura.setVisible(false);
      this.poisonAura.setVisible(false);
    } else {
      if (flash) this.flashHit();
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

  /** 더 강한 독을 우선하고, 같은 적을 다시 맞히면 지속시간만 갱신한다. */
  applyPoison(dps: number, durationMs: number): void {
    this.poisonDps = Math.max(this.poisonDps, dps);
    this.poisonLeftMs = Math.max(this.poisonLeftMs, durationMs);
  }

  update(dtMs: number, speedMul: number): void {
    if (!this.alive) return;
    const simulationMs = dtMs * speedMul;
    const poisonedMs = Math.min(simulationMs, Math.max(0, this.poisonLeftMs));
    if (poisonedMs > 0) this.takeDamage(this.poisonDps * poisonedMs / 1000, false);
    this.poisonLeftMs = Math.max(0, this.poisonLeftMs - simulationMs);
    if (this.poisonLeftMs === 0) this.poisonDps = 0;
    if (!this.alive) return;
    const slowedMs = Math.min(simulationMs, Math.max(0, this.slowLeftMs));
    this.traveled += this.def.speed * (slowedMs * this.slowMul + simulationMs - slowedMs) / 1000;
    this.slowLeftMs = Math.max(0, this.slowLeftMs - simulationMs);
    if (this.slowLeftMs === 0) this.slowMul = 1;
    const a = PathManager.advance(this.polyline, this.traveled);
    this._progress = a.progress;
    this.sprite.setPosition(a.pos.x, a.pos.y);
    if (a.done) {
      this._done = true;
      this.sprite.setVisible(false);
      this.healthBar.setVisible(false);
      this.slowAura.setVisible(false);
      this.poisonAura.setVisible(false);
    } else {
      this.drawHealthBar();
      const slowed = this.slowLeftMs > 0;
      const poisoned = this.poisonLeftMs > 0;
      this.slowAura.setVisible(slowed);
      this.poisonAura.setVisible(poisoned);
      if (slowed) this.slowAura.setPosition(a.pos.x, a.pos.y);
      if (poisoned) this.poisonAura.setPosition(a.pos.x, a.pos.y);
    }
  }

  destroy(): void {
    if (this._freed) return;
    this._freed = true;
    this.healthBar.destroy();
    this.slowAura.destroy();
    this.poisonAura.destroy();
    const tweens = (this.scene as Phaser.Scene & { tweens?: Phaser.Tweens.TweenManager }).tweens;
    if (tweens && this._hp <= 0 && !this._done) {
      // 처치: 짧게 부풀며 사라진다. 목표 도달(_done)은 조용히 제거.
      tweens.add({
        targets: this.sprite, scaleX: 1.7, scaleY: 1.7, alpha: 0, duration: 160,
        onComplete: () => this.sprite.destroy(),
      });
    } else {
      this.sprite.destroy();
    }
  }
}
