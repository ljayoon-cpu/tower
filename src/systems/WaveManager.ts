import type { EventBus } from '../core/eventBus';
import type { GameEvents, Wave } from '../core/types';
import type { EnemyModifiers } from './EnemyState';

export interface SpawnRequest {
  enemyKey: string;
  modifiers: EnemyModifiers;
}

interface GroupState {
  enemyKey: string;
  remaining: number;
  intervalMs: number;
  nextAtMs: number; // 웨이브 경과시간 기준 다음 스폰 시각
  modifiers: EnemyModifiers;
}

export class WaveManager {
  private _waveIndex = -1;
  private elapsedMs = 0;
  private groups: GroupState[] = [];
  private scheduledThisWave = 0;
  private spawnedCount = 0;
  private removedCount = 0;
  private waveActive = false;
  private autoAdvanceMs: number | null = null;
  private countdownMs = 0;

  constructor(private readonly waves: Wave[], private readonly bus: EventBus<GameEvents>) {}

  get waveIndex(): number { return this._waveIndex; }
  get totalWaves(): number { return this.waves.length; }
  get isWaveActive(): boolean { return this.waveActive; }

  private get hasNextWave(): boolean { return this._waveIndex < this.waves.length - 1; }

  /** 웨이브 사이 자동 진행. betweenMs 카운트다운 후 다음 웨이브가 저절로 시작된다. */
  enableAutoAdvance(betweenMs = 8000): void {
    this.autoAdvanceMs = betweenMs;
    this.countdownMs = betweenMs;
  }

  /** 자동 시작까지 남은 초. 자동진행 꺼짐 / 웨이브 진행 중 / 다음 웨이브 없음이면 null. */
  secondsToNextWave(): number | null {
    if (this.autoAdvanceMs === null || this.waveActive || !this.hasNextWave) return null;
    return Math.max(0, Math.ceil(this.countdownMs / 1000));
  }
  get isFinished(): boolean {
    return this._waveIndex >= this.waves.length - 1 && this.isWaveComplete();
  }

  startNextWave(): boolean {
    if (this.waveActive) return false;
    if (!this.hasNextWave) return false;
    this._waveIndex++;
    if (this.autoAdvanceMs !== null) this.countdownMs = this.autoAdvanceMs;
    this.elapsedMs = 0;
    this.spawnedCount = 0;
    this.removedCount = 0;
    this.waveActive = true;
    const wave = this.waves[this._waveIndex];
    this.groups = wave.groups.map((g) => ({
      enemyKey: g.enemy,
      remaining: g.count,
      intervalMs: g.intervalMs,
      nextAtMs: g.startDelayMs,
      modifiers: {
        hpMultiplier: g.hpMultiplier,
        speedMultiplier: g.speedMultiplier,
        shieldMultiplier: g.shieldMultiplier,
      },
    }));
    this.scheduledThisWave = wave.groups.reduce((s, g) => s + g.count, 0);
    this.bus.emit('wave:started', { index: this._waveIndex, total: this.waves.length });
    return true;
  }

  update(dtMs: number): SpawnRequest[] {
    if (!this.waveActive) {
      if (this.autoAdvanceMs !== null && this.hasNextWave) {
        this.countdownMs -= dtMs;
        if (this.countdownMs <= 0) this.startNextWave();
      }
      if (!this.waveActive) return [];
    }
    this.elapsedMs += dtMs;
    const out: SpawnRequest[] = [];
    for (const g of this.groups) {
      while (g.remaining > 0 && this.elapsedMs >= g.nextAtMs) {
        out.push({ enemyKey: g.enemyKey, modifiers: g.modifiers });
        g.remaining--;
        g.nextAtMs += g.intervalMs > 0 ? g.intervalMs : 1;
      }
    }
    return out;
  }

  notifyEnemySpawned(): void { this.spawnedCount++; }
  notifyEnemyRemoved(): void { this.removedCount++; this.checkComplete(); }

  isWaveComplete(): boolean {
    return this.waveActive === false
      || (this.allScheduledSpawned() && this.removedCount >= this.scheduledThisWave);
  }

  private allScheduledSpawned(): boolean {
    return this.groups.every((g) => g.remaining === 0);
  }

  private checkComplete(): void {
    if (this.waveActive && this.allScheduledSpawned() && this.removedCount >= this.scheduledThisWave) {
      this.waveActive = false;
      this.bus.emit('wave:cleared', { index: this._waveIndex });
    }
  }

  currentClearBonus(): number {
    return this.waves[this._waveIndex]?.clearBonus ?? 0;
  }
}
