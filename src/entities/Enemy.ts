import Phaser from 'phaser';
import type { EnemyDef, Vec2 } from '../core/types';
import { PathManager } from '../systems/PathManager';

let nextId = 1;

export class Enemy {
  readonly id = nextId++;
  readonly sprite: Phaser.GameObjects.Image;
  private traveled = 0;
  private _hp: number;
  private slowMul = 1;
  private slowLeftMs = 0;
  private _done = false;
  private _progress = 0;

  constructor(
    scene: Phaser.Scene,
    readonly def: EnemyDef,
    private readonly polyline: Vec2[],
  ) {
    this._hp = def.hp;
    const start = polyline[0];
    this.sprite = scene.add.image(start.x, start.y, `enemy_${def.key}`);
  }

  get pos(): Vec2 { return { x: this.sprite.x, y: this.sprite.y }; }
  get hp(): number { return this._hp; }
  get alive(): boolean { return this._hp > 0 && !this._done; }
  get reachedGoal(): boolean { return this._done; }
  get progress(): number {
    return this._progress;
  }

  takeDamage(n: number): void {
    if (!this.alive) return;
    this._hp -= n;
    if (this._hp <= 0) this.sprite.setVisible(false);
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
    if (a.done) { this._done = true; this.sprite.setVisible(false); }
  }

  destroy(): void { this.sprite.destroy(); }
}
