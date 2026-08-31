import Phaser from 'phaser';
import type { BossPhaseDef, EnemyDef, Vec2 } from '../core/types';
import { PathManager } from '../systems/PathManager';
import { EnemyState, type DamagePacket, type EnemyModifiers } from '../systems/EnemyState';

let nextId = 1;
const FAST_WALK_FRAME_MS = 90;
const FAST_WALK_FRAME_COUNT = 4;
const NORMAL_WALK_FRAME_MS = 160;
const NORMAL_WALK_FRAME_COUNT = 4;
const TANK_WALK_FRAME_MS = 220;
const TANK_WALK_FRAME_COUNT = 4;
const SHIELD_WALK_FRAME_MS = 140;
const SHIELD_WALK_FRAME_COUNT = 4;
const REGENERATOR_WALK_FRAME_MS = 185;
const REGENERATOR_WALK_FRAME_COUNT = 4;
const SUMMONER_WALK_FRAME_MS = 205;
const SUMMONER_WALK_FRAME_COUNT = 4;
const CRUSHER_WALK_FRAME_MS = 260;
const CRUSHER_WALK_FRAME_COUNT = 4;

/** 질주병의 이동 시간에 해당하는 스프라이트 시트 프레임. */
export function fastWalkFrameAt(elapsedMs: number): number {
  return Math.floor(elapsedMs / FAST_WALK_FRAME_MS) % FAST_WALK_FRAME_COUNT;
}

/** 보행병은 질주병보다 느린 리듬으로 걷는다. */
export function normalWalkFrameAt(elapsedMs: number): number {
  return Math.floor(elapsedMs / NORMAL_WALK_FRAME_MS) % NORMAL_WALK_FRAME_COUNT;
}

/** 장갑병은 묵직한 발걸음으로 가장 느리게 움직인다. */
export function tankWalkFrameAt(elapsedMs: number): number {
  return Math.floor(elapsedMs / TANK_WALK_FRAME_MS) % TANK_WALK_FRAME_COUNT;
}

/** 방어막병은 방패를 앞세우고 일정한 리듬으로 전진한다. */
export function shieldWalkFrameAt(elapsedMs: number): number {
  return Math.floor(elapsedMs / SHIELD_WALK_FRAME_MS) % SHIELD_WALK_FRAME_COUNT;
}

/** 재생충은 느리게 기어가며 치료 고리를 맥동시킨다. */
export function regeneratorWalkFrameAt(elapsedMs: number): number {
  return Math.floor(elapsedMs / REGENERATOR_WALK_FRAME_MS) % REGENERATOR_WALK_FRAME_COUNT;
}

/** 균열 소환사가 포탈을 유지하며 부유할 때의 스프라이트 시트 프레임. */
export function summonerWalkFrameAt(elapsedMs: number): number {
  return Math.floor(elapsedMs / SUMMONER_WALK_FRAME_MS) % SUMMONER_WALK_FRAME_COUNT;
}

/** 파쇄 전차는 느린 궤도 전진 끝에 전면 분쇄기를 강하게 밀어 넣는다. */
export function crusherWalkFrameAt(elapsedMs: number): number {
  return Math.floor(elapsedMs / CRUSHER_WALK_FRAME_MS) % CRUSHER_WALK_FRAME_COUNT;
}

export class Enemy {
  readonly id = nextId++;
  readonly sprite: Phaser.GameObjects.Image;
  readonly state: EnemyState;
  readonly countsForWave: boolean;
  readonly summonedById: number | null;
  private readonly healthBar: Phaser.GameObjects.Graphics;
  private readonly shieldBar: Phaser.GameObjects.Graphics;
  private readonly slowAura: Phaser.GameObjects.Arc;
  private readonly freezeAura: Phaser.GameObjects.Arc;
  private readonly poisonAura: Phaser.GameObjects.Arc;
  private readonly armorBreakAura: Phaser.GameObjects.Arc;
  private readonly barWidth: number;
  private traveled = 0;
  private walkElapsedMs = 0;
  private slowMul = 1;
  private slowLeftMs = 0;
  private summonLeftMs: number;
  private summonedAlive = 0;
  private bossPhaseIndex = 0;
  private bossSpeedMultiplier = 1;
  private readonly triggeredBossPhases: BossPhaseDef[] = [];
  private readonly pendingBossSummons: string[] = [];
  private _done = false;
  private _progress = 0;
  private _freed = false;

  private deathSpawnPending = false;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly def: EnemyDef,
    private readonly polyline: Vec2[],
    modifiers: EnemyModifiers = {},
    countsForWave = true,
    summonedById: number | null = null,
    startTraveled = 0,
  ) {
    this.state = new EnemyState(def, modifiers);
    this.countsForWave = countsForWave;
    this.summonedById = summonedById;
    this.summonLeftMs = def.summon?.intervalMs ?? Infinity;
    this.traveled = Math.max(0, startTraveled);
    this.deathSpawnPending = def.deathSpawn != null;
    const start = polyline[0];
    this.sprite = scene.add.image(start.x, start.y, `enemy_${def.key}`);
    // 128px 걷기 시트를 길 타일 안에서 읽히는 크기로 표시한다.
    if (def.key === 'fast') this.sprite.setScale(0.5);
    if (def.key === 'normal') this.sprite.setScale(0.6);
    if (def.key === 'tank') this.sprite.setScale(0.55);
    if (def.key === 'shield') this.sprite.setScale(0.56);
    if (def.key === 'regenerator') this.sprite.setScale(0.58);
    if (def.key === 'summoner') this.sprite.setScale(0.6);
    if (def.key === 'crusher') this.sprite.setScale(0.66);
    this.barWidth = def.isBoss ? 54 : 22;
    this.healthBar = scene.add.graphics().setDepth(15).setVisible(false);
    this.shieldBar = scene.add.graphics().setDepth(15).setVisible(false);
    this.slowAura = scene.add
      .circle(start.x, start.y, def.isBoss ? 30 : 18, 0x99e6ff, 0.16)
      .setStrokeStyle(2, 0x99e6ff, 0.85)
      .setDepth(4)
      .setVisible(false);
    this.freezeAura = scene.add
      .circle(start.x, start.y, def.isBoss ? 22 : 13, 0xdefaff, 0.24)
      .setStrokeStyle(2, 0xffffff, 0.95)
      .setDepth(5)
      .setVisible(false);
    this.poisonAura = scene.add
      .circle(start.x, start.y, def.isBoss ? 25 : 15, 0x71d957, 0.14)
      .setStrokeStyle(2, 0x71d957, 0.82)
      .setDepth(4)
      .setVisible(false);
    this.armorBreakAura = scene.add
      .circle(start.x, start.y, def.isBoss ? 28 : 17, 0xffa641, 0.08)
      .setStrokeStyle(2, 0xffa641, 0.9)
      .setDepth(4)
      .setVisible(false);
  }

  get pos(): Vec2 { return { x: this.sprite.x, y: this.sprite.y }; }
  get hp(): number { return this.state.hp; }
  get alive(): boolean { return this.state.alive && !this._done; }
  get reachedGoal(): boolean { return this._done; }
  /** 분열 자식이 부모 경로·진행도를 이어받도록. */
  get route(): Vec2[] { return this.polyline; }
  get traveledDistance(): number { return this.traveled; }

  /** 죽은 뒤 한 번만: 분열 스폰 정보(자리에서 쪼개짐). 없으면 null. */
  collectDeathSpawn(): { enemyKey: string; count: number } | null {
    if (this.alive || !this.deathSpawnPending || !this.def.deathSpawn) return null;
    this.deathSpawnPending = false;
    return this.def.deathSpawn;
  }
  get progress(): number { return this._progress; }
  get intercepts(): boolean { return this.def.intercepts === true; }
  get movementSpeedMultiplier(): number { return this.bossSpeedMultiplier; }
  /** 0~1. 남은 체력 비율(음수는 0으로 고정). */
  get healthRatio(): number { return Math.max(0, this.state.hp) / this.state.maxHp; }

  takeDamage(packet: number | DamagePacket, flash = true): void {
    if (!this.alive) return;
    this.state.applyDamage(typeof packet === 'number' ? { amount: packet } : packet);
    this.advanceBossPhases();
    if (!this.alive) {
      this.hideIndicators();
    } else {
      if (flash) this.flashHit();
      this.drawBars();
    }
  }

  /** 새로 발동한 보스 단계를 한 번만 반환한다. HUD가 경고 문구를 표시할 때 사용한다. */
  collectBossPhases(): BossPhaseDef[] {
    return this.triggeredBossPhases.splice(0);
  }

  private advanceBossPhases(): void {
    if (!this.alive) return;
    const phases = this.def.bossPhases ?? [];
    while (this.bossPhaseIndex < phases.length && this.healthRatio <= phases[this.bossPhaseIndex].atHealthRatio) {
      const phase = phases[this.bossPhaseIndex++];
      this.bossSpeedMultiplier = phase.speedMultiplier;
      if (phase.shieldRestoreRatio !== undefined) this.state.restoreShield(phase.shieldRestoreRatio);
      for (let i = 0; i < (phase.summon?.count ?? 0); i++) this.pendingBossSummons.push(phase.summon!.enemyKey);
      this.triggeredBossPhases.push(phase);
      const sprite = this.sprite as Phaser.GameObjects.Image & { setTint?: (color: number) => unknown };
      sprite.setTint?.(this.bossPhaseIndex === 1 ? 0xffd65c : 0xc987ff);
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

  private hideIndicators(): void {
    this.healthBar.setVisible(false);
    this.shieldBar.setVisible(false);
    this.slowAura.setVisible(false);
    this.freezeAura.setVisible(false);
    this.poisonAura.setVisible(false);
    this.armorBreakAura.setVisible(false);
  }

  private drawBars(): void {
    const ratio = this.healthRatio;
    const w = this.barWidth;
    const x = this.sprite.x - w / 2;
    const y = this.sprite.y - (this.def.isBoss ? 40 : 18);
    if (ratio >= 1 || !this.alive) {
      this.healthBar.setVisible(false);
    } else {
      this.healthBar.clear();
      this.healthBar.fillStyle(0x000000, 0.6);
      this.healthBar.fillRect(x - 1, y - 1, w + 2, 5);
      this.healthBar.fillStyle(ratio > 0.5 ? 0x7dd87d : ratio > 0.25 ? 0xffcc44 : 0xff5566, 1);
      this.healthBar.fillRect(x, y, w * ratio, 3);
      this.healthBar.setVisible(true);
    }

    if (this.state.shield <= 0 || this.state.maxShield === 0) {
      this.shieldBar.setVisible(false);
    } else {
      this.shieldBar.clear();
      this.shieldBar.fillStyle(0x71dfff, 0.95);
      this.shieldBar.fillRect(x, y - 5, w * this.state.shieldRatio, 2);
      this.shieldBar.setVisible(true);
    }
  }

  applySlow(mul: number, durationMs: number): void {
    this.slowMul = Math.min(this.slowMul === 1 ? mul : this.slowMul, mul);
    this.slowLeftMs = Math.max(this.slowLeftMs, durationMs);
  }

  applyFreezeHit(hits: number, durationMs: number, cooldownMs: number): boolean {
    return this.state.applyFreezeHit(hits, durationMs, cooldownMs);
  }

  applyStagger(durationMs: number, cooldownMs: number): boolean {
    return this.state.applyStagger(durationMs, cooldownMs);
  }

  applyArmorBreak(percent: number, durationMs: number): void {
    if (!this.alive) return;
    this.state.applyArmorBreak(percent, durationMs);
  }

  applyPoison(dps: number, durationMs: number): void {
    this.state.applyPoison(dps, durationMs);
  }

  /** 소환수만 별도 카운트하므로, 웨이브 완료 판정은 부하 처치에 막히지 않는다. */
  collectSummons(): string[] {
    if (!this.alive) {
      this.pendingBossSummons.length = 0;
      return [];
    }
    const out = this.pendingBossSummons.splice(0);
    if (!this.def.summon) return out;
    while (this.summonLeftMs <= 0 && this.summonedAlive < this.def.summon.maxAlive) {
      out.push(this.def.summon.enemyKey);
      this.summonedAlive++;
      this.summonLeftMs += this.def.summon.intervalMs;
    }
    return out;
  }

  notifySummonRemoved(): void {
    this.summonedAlive = Math.max(0, this.summonedAlive - 1);
  }

  private static readonly WALK_ANIMATED = new Set(['fast', 'normal', 'tank', 'shield', 'regenerator', 'summoner', 'crusher']);

  private updateWalkAnimation(movingMs: number): void {
    if (movingMs <= 0 || !Enemy.WALK_ANIMATED.has(this.def.key)) return;
    this.walkElapsedMs += movingMs;
    const sprite = this.sprite as Phaser.GameObjects.Image & { setFrame?: (frame: number) => unknown };
    const frame = this.def.key === 'fast' ? fastWalkFrameAt(this.walkElapsedMs)
      : this.def.key === 'normal' ? normalWalkFrameAt(this.walkElapsedMs)
        : this.def.key === 'tank' ? tankWalkFrameAt(this.walkElapsedMs)
          : this.def.key === 'shield' ? shieldWalkFrameAt(this.walkElapsedMs)
            : this.def.key === 'regenerator' ? regeneratorWalkFrameAt(this.walkElapsedMs)
              : this.def.key === 'summoner' ? summonerWalkFrameAt(this.walkElapsedMs)
                : crusherWalkFrameAt(this.walkElapsedMs);
    sprite.setFrame?.(frame);
  }

  update(dtMs: number, speedMul: number): void {
    if (!this.alive) return;
    const simulationMs = dtMs * speedMul;
    const frozenMs = this.state.update(simulationMs);
    this.advanceBossPhases();
    if (!this.alive) { this.hideIndicators(); return; }

    const movingMs = simulationMs - frozenMs;
    this.updateWalkAnimation(movingMs);
    const slowedMs = Math.min(movingMs, Math.max(0, this.slowLeftMs));
    // 광전사: 체력이 rageBelow 이하면 이동속도 폭증.
    const rage = this.def.rageBelow != null && this.healthRatio <= this.def.rageBelow
      ? this.def.rageSpeedMultiplier ?? 1 : 1;
    this.traveled += this.state.speed * this.bossSpeedMultiplier * rage
      * (slowedMs * this.slowMul + movingMs - slowedMs) / 1000;
    this.slowLeftMs = Math.max(0, this.slowLeftMs - simulationMs);
    if (this.slowLeftMs === 0) this.slowMul = 1;
    this.summonLeftMs -= simulationMs;

    const a = PathManager.advance(this.polyline, this.traveled);
    this._progress = a.progress;
    // 질주병은 걷기 스프라이트 시트가 달리는 느낌을 낸다.
    this.sprite.setPosition(a.pos.x, a.pos.y);
    if (a.done) {
      this._done = true;
      this.sprite.setVisible(false);
      this.hideIndicators();
    } else {
      this.drawBars();
      const slowed = this.slowLeftMs > 0;
      const frozen = this.state.frozen;
      const poisoned = this.state.poisonLeftMs > 0;
      const armorBroken = this.state.armorBreakPercent > 0;
      this.slowAura.setVisible(slowed);
      this.freezeAura.setVisible(frozen);
      this.poisonAura.setVisible(poisoned);
      this.armorBreakAura.setVisible(armorBroken);
      if (slowed) this.slowAura.setPosition(a.pos.x, a.pos.y);
      if (frozen) this.freezeAura.setPosition(a.pos.x, a.pos.y);
      if (poisoned) this.poisonAura.setPosition(a.pos.x, a.pos.y);
      if (armorBroken) this.armorBreakAura.setPosition(a.pos.x, a.pos.y);
    }
  }

  destroy(): void {
    if (this._freed) return;
    this._freed = true;
    this.healthBar.destroy();
    this.shieldBar.destroy();
    this.slowAura.destroy();
    this.freezeAura.destroy();
    this.poisonAura.destroy();
    this.armorBreakAura.destroy();
    const tweens = (this.scene as Phaser.Scene & { tweens?: Phaser.Tweens.TweenManager }).tweens;
    if (tweens && this.state.hp <= 0 && !this._done) {
      // 현재 크기 기준으로 줄이며 사라진다(스프라이트 원본 크기가 달라도 안전).
      const sx = this.sprite.scaleX;
      const sy = this.sprite.scaleY;
      tweens.add({
        targets: this.sprite, scaleX: sx * 0.5, scaleY: sy * 0.5, alpha: 0, duration: 150,
        ease: 'Quad.in',
        onComplete: () => this.sprite.destroy(),
      });
    } else {
      this.sprite.destroy();
    }
  }
}
