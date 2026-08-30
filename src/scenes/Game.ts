import Phaser from 'phaser';
import { COLORS, TILE, GRID_COLS, GRID_ROWS } from '../core/constants';
import { createEventBus } from '../core/eventBus';
import type { EventBus } from '../core/eventBus';
import type { GameEvents, StageDef } from '../core/types';
import { getStage } from '../data/stages';
import { getEnemy } from '../data/enemies';
import { GridManager } from '../systems/GridManager';
import { PathManager } from '../systems/PathManager';
import { WaveManager } from '../systems/WaveManager';
import { EconomyManager } from '../systems/EconomyManager';
import { Rng } from '../core/rng';
import { Enemy } from '../entities/Enemy';
import type { HudInit } from './HUD';

export class Game extends Phaser.Scene {
  private stage!: StageDef;
  private bus!: EventBus<GameEvents>;
  private grid!: GridManager;
  private path!: PathManager;
  private waves!: WaveManager;
  private eco!: EconomyManager;
  private rng = new Rng(Date.now() & 0xffffffff);
  private enemies: Enemy[] = [];
  private lives = 0;
  private speedMul = 1;
  private running = false;

  constructor() { super('game'); }

  init(data: { stageId: string }) {
    this.stage = getStage(data.stageId ?? '1-1');
  }

  create() {
    this.bus = createEventBus<GameEvents>();
    this.grid = new GridManager(this.stage.grid);
    this.path = new PathManager(this.stage.path);
    this.waves = new WaveManager(this.stage.waves, this.bus);
    this.eco = new EconomyManager(this.stage.startGold, this.bus);
    this.lives = this.stage.startLives;
    this.enemies = [];
    this.speedMul = 1;
    this.running = true;

    this.drawMap();

    this.bus.on('enemy:reachedGoal', (p) => {
      this.lives = Math.max(0, this.lives - p.lifeDamage);
      this.bus.emit('life:changed', { lives: this.lives });
      if (this.lives <= 0) this.endStage(false);
    });
    this.bus.on('wave:cleared', () => {
      this.eco.earn(this.waves.currentClearBonus());
      if (this.waves.isFinished) this.endStage(true);
    });

    const hudInit: HudInit = {
      bus: this.bus,
      gold: this.eco.gold,
      lives: this.lives,
      totalWaves: this.waves.totalWaves,
      onNextWave: () => this.waves.startNextWave(),
    };
    this.scene.launch('hud', hudInit);
  }

  private drawMap() {
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const t = this.grid.tileAt({ col: c, row: r });
        if (t === null || t === 'BLOCKED') continue;
        const img = this.add.image(c * TILE + TILE / 2, r * TILE + TILE / 2, 'tile');
        img.setDisplaySize(TILE - 2, TILE - 2);
        img.setTint(t === 'PATH' ? COLORS.path : COLORS.buildable);
      }
    }
  }

  private spawnEnemy(enemyKey: string) {
    const def = getEnemy(enemyKey);
    const route = this.path.chooseRoute(this.rng);
    const enemy = new Enemy(this, def, route.polyline);
    this.enemies.push(enemy);
    this.waves.notifyEnemySpawned();
  }

  private endStage(won: boolean) {
    if (!this.running) return;
    this.running = false;
    this.scene.stop('hud');
    // Result 씬은 Task 15에서. 임시:
    this.add.text(360, 640, won ? 'CLEAR' : 'GAME OVER', {
      fontFamily: 'monospace', fontSize: '48px', color: '#f2f2f7',
    }).setOrigin(0.5).setDepth(1000);
  }

  update(_time: number, dtMsRaw: number) {
    if (!this.running) return;
    const dtMs = dtMsRaw * this.speedMul;

    for (const req of this.waves.update(dtMs)) this.spawnEnemy(req.enemyKey);

    for (const e of this.enemies) {
      e.update(dtMsRaw, this.speedMul);
      if (e.reachedGoal) {
        this.bus.emit('enemy:reachedGoal', { lifeDamage: e.def.lifeDamage });
      }
    }
    // 처리된 적 정리
    const removed = this.enemies.filter((e) => !e.alive);
    for (const e of removed) {
      if (e.hp <= 0) this.bus.emit('enemy:killed', { bounty: e.def.bounty });
      this.waves.notifyEnemyRemoved();
      e.destroy();
    }
    this.enemies = this.enemies.filter((e) => e.alive);
  }
}
