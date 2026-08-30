import type { EventBus } from '../core/eventBus';
import type { GameEvents, Wave } from '../core/types';

export interface SpawnRequest { enemyKey: string; }

interface GroupState {
  enemyKey: string;
  remaining: number;
  intervalMs: number;
  nextAtMs: number; // 웨이브 경과시간 기준 다음 스폰 시각
}

export class WaveManager {
  private _waveIndex = -1;
  private elapsedMs = 0;
  private groups: GroupState[] = [];
  private scheduledThisWave = 0;
  private spawnedCount = 0;
  private removedCount = 0;
  private waveActive = false;

  constructor(private readonly waves: Wave[], private readonly bus: EventBus<GameEvents>) {}

  get waveIndex(): number { return this._waveIndex; }
  get totalWaves(): number { return this.waves.length; }
  get isWaveActive(): boolean { return this.waveActive; }
  get isFinished(): boolean {
    return this._waveIndex >= this.waves.length - 1 && this.isWaveComplete();
  }

  startNextWave(): boolean {
    if (this.waveActive) return false;
    if (this._waveIndex >= this.waves.length - 1) return false;
    this._waveIndex++;
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
    }));
    this.scheduledThisWave = wave.groups.reduce((s, g) => s + g.count, 0);
    this.bus.emit('wave:started', { index: this._waveIndex, total: this.waves.length });
    return true;
  }

  update(dtMs: number): SpawnRequest[] {
    if (!this.waveActive) return [];
    this.elapsedMs += dtMs;
    const out: SpawnRequest[] = [];
    for (const g of this.groups) {
      while (g.remaining > 0 && this.elapsedMs >= g.nextAtMs) {
        out.push({ enemyKey: g.enemyKey });
        g.remaining--;
        g.nextAtMs += g.intervalMs > 0 ? g.intervalMs : 1; // 0 간격이면 다음 tick 방지용 +1
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
