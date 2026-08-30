import Phaser from 'phaser';
import { COLORS, TILE, GRID_COLS, GRID_ROWS, GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import { createEventBus } from '../core/eventBus';
import type { EventBus } from '../core/eventBus';
import type { GameEvents, StageDef, TileCoord } from '../core/types';
import { getStage } from '../data/stages';
import { getEnemy } from '../data/enemies';
import { getTower, TOWER_KEYS, cumulativeCost } from '../data/towers';
import { canMerge, mergeResultLevel } from '../systems/MergeController';
import type { MergeCandidate } from '../systems/MergeController';
import { GridManager } from '../systems/GridManager';
import { PathManager } from '../systems/PathManager';
import { WaveManager } from '../systems/WaveManager';
import { EconomyManager } from '../systems/EconomyManager';
import { Rng } from '../core/rng';
import { Enemy } from '../entities/Enemy';
import { Tower } from '../entities/Tower';
import { Projectile } from '../entities/Projectile';
import { pickTarget, enemiesInRadius } from '../systems/TargetingSystem';
import type { Targetable } from '../systems/TargetingSystem';
import { chainDamages, buildChain } from '../systems/combat';
import { BuildMenu } from '../ui/BuildMenu';
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
  private towers: Tower[] = [];
  private projectiles: Projectile[] = [];
  private buildMenu!: BuildMenu;
  private pendingTile: TileCoord | null = null;
  private buildPreview: Phaser.GameObjects.Arc | null = null;
  private lives = 0;
  private speedMul = 1;
  private running = false;
  private sellTimer?: Phaser.Time.TimerEvent;
  private sellPanel?: Phaser.GameObjects.Container;
  /** 드래그 직후 발생하는 pointerup 이 빌드메뉴/사거리 토글을 켜지 않도록 억제. */
  private suppressTapUntil = 0;

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
    this.towers = [];
    this.projectiles = [];
    this.pendingTile = null;
    this.buildPreview = null;
    this.speedMul = 1;
    this.running = true;

    this.drawMap();
    this.setupBuildInput();
    this.setupDragInput();

    this.bus.on('enemy:killed', (p) => {
      this.eco.earn(p.bounty);
    });
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

  private setupBuildInput() {
    this.buildMenu = new BuildMenu(this, {
      onPick: (key) => {
        if (this.pendingTile) this.placeTower(key, this.pendingTile);
      },
      canAfford: (key) => this.eco.canAfford(getTower(key).cost),
    });

    // 플레이 영역 전체를 덮는 투명 입력 캐처. depth 를 최하위로 두어
    // 타워/BuildMenu/HUD(별도 씬) 오브젝트 클릭은 topOnly 규칙에 의해
    // 여기로 흘러들지 않는다.
    const catcher = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.001)
      .setDepth(-100)
      .setInteractive();

    catcher.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.running) return;
      if (this.time.now < this.suppressTapUntil) return;
      // 빈 곳/타일 탭 → 표시 중인 사거리 링 숨김
      this.clearTowerRanges();
      if (this.buildMenu.isOpen) {
        this.closeBuildMenu();
        return;
      }
      const tile = this.grid.pixelToTile({ x: pointer.worldX, y: pointer.worldY });
      if (!this.grid.canPlace(tile)) return;
      this.openBuildMenu(tile);
    });
  }

  private openBuildMenu(tile: TileCoord): void {
    this.pendingTile = tile;
    const c = this.grid.tileToPixelCenter(tile);
    // 구매 전 사거리 미리보기: 첫 타워 옵션의 Lv1 사거리
    const previewRange = getTower(TOWER_KEYS[0]).levels[0].range;
    this.buildPreview?.destroy();
    this.buildPreview = this.add
      .circle(c.x, c.y, previewRange, 0xffffff, 0.04)
      .setStrokeStyle(1, 0x66ccff, 0.3)
      .setDepth(400);
    this.buildMenu.openAt(c.x, c.y);
  }

  private closeBuildMenu(): void {
    this.buildMenu.close();
    this.pendingTile = null;
    this.buildPreview?.destroy();
    this.buildPreview = null;
  }

  /** except 타워만 사거리 링을 켜고 나머지는 끈다. */
  private clearTowerRanges(except?: Tower): void {
    for (const t of this.towers) t.showRange(t === except);
  }

  private setupDragInput(): void {
    // Phaser 의 drag 이벤트 콜백은 느슨하게 타입되어 있어 여기서 Image 로 좁힌다.
    this.input.on(
      'dragstart',
      (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
        this.sellTimer?.remove();
        obj.setDepth(600);
        const t = this.towerFromObj(obj);
        t?.showRange(true);
      },
    );

    this.input.on(
      'drag',
      (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image, dx: number, dy: number) => {
        obj.setPosition(dx, dy);
      },
    );

    this.input.on(
      'dragend',
      (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
        obj.setDepth(10);
        this.suppressTapUntil = this.time.now + 100;
        const dragged = this.towerFromObj(obj);
        if (!dragged) return;
        dragged.showRange(false);

        const dropTile = this.grid.pixelToTile({ x: obj.x, y: obj.y });
        const occId = this.grid.occupantAt(dropTile);
        const targetTower =
          occId != null ? this.towers.find((x) => x.id === occId) : undefined;

        if (targetTower && targetTower.id !== dragged.id) {
          const a: MergeCandidate = { id: dragged.id, key: dragged.key, level: dragged.level };
          const b: MergeCandidate = { id: targetTower.id, key: targetTower.key, level: targetTower.level };
          if (canMerge(a, b, dragged.maxLevel)) {
            targetTower.setLevel(mergeResultLevel(targetTower.level));
            this.grid.release(dragged.tile);
            this.removeTower(dragged);
            this.snapHome(targetTower);
            return;
          }
        }
        // 머지 실패 또는 빈 타일 → 원위치(이동 배치는 v1 비포함).
        this.snapHome(dragged);
      },
    );
  }

  private towerFromObj(obj: Phaser.GameObjects.Image): Tower | undefined {
    const id = obj.getData('towerId') as number;
    return this.towers.find((x) => x.id === id);
  }

  private snapHome(t: Tower): void {
    t.sprite.setPosition(t.homePos.x, t.homePos.y);
  }

  private removeTower(t: Tower): void {
    this.towers = this.towers.filter((x) => x.id !== t.id);
    t.destroy();
  }

  private confirmSell(t: Tower): void {
    this.eco.sellRefund(cumulativeCost(getTower(t.key), t.level));
    this.grid.release(t.tile);
    this.removeTower(t);
  }

  private showSellPrompt(tower: Tower): void {
    if (!this.running) return;
    if (this.towers.indexOf(tower) === -1) return;
    this.sellPanel?.destroy();

    const refund = Math.floor(
      cumulativeCost(getTower(tower.key), tower.level) * EconomyManager.SELL_RATIO,
    );
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const bg = this.add.rectangle(0, 0, 320, 160, 0x000000, 0.8).setStrokeStyle(1, 0xffffff, 0.3);
    const sell = this.add
      .text(0, -18, `판매 +${refund}G`, {
        fontFamily: 'monospace', fontSize: '24px', color: '#7dd87d',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const cancel = this.add
      .text(0, 34, '취소', {
        fontFamily: 'monospace', fontSize: '20px', color: '#f2f2f7',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const panel = this.add.container(cx, cy, [bg, sell, cancel]).setDepth(1200);
    this.sellPanel = panel;

    const close = (): void => {
      panel.destroy();
      if (this.sellPanel === panel) this.sellPanel = undefined;
    };
    sell.on('pointerup', () => {
      this.confirmSell(tower);
      close();
    });
    cancel.on('pointerup', close);
  }

  private placeTower(key: string, tile: TileCoord): void {
    const def = getTower(key);
    if (!this.grid.canPlace(tile)) return;
    if (!this.eco.spend(def.cost)) return;
    const pos = this.grid.tileToPixelCenter(tile);
    const tower = new Tower(this, key, tile, pos);
    this.grid.occupy(tile, tower.id);
    this.towers.push(tower);
    // 타워 탭 → 사거리 링 토글(한 번에 하나만 표시). 드래그 직후 탭은 무시.
    tower.sprite.on('pointerup', () => {
      if (this.time.now < this.suppressTapUntil) return;
      this.clearTowerRanges(tower.rangeVisible ? undefined : tower);
    });
    // 롱프레스(~500ms) → 판매 확인 팝업.
    tower.sprite.on('pointerdown', () => {
      this.sellTimer?.remove();
      this.sellTimer = this.time.delayedCall(500, () => this.showSellPrompt(tower));
    });
    tower.sprite.on('pointerup', () => this.sellTimer?.remove());
    this.closeBuildMenu();
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

  private updateTowers(dtMs: number) {
    const targets: Targetable[] = this.enemies.map((e) => ({
      id: e.id, pos: e.pos, progress: e.progress, alive: e.alive,
    }));

    for (const tower of this.towers) {
      tower.cooldownMs -= dtMs;
      if (tower.cooldownMs > 0) continue;
      const s = tower.stats();
      const target = pickTarget(tower.pos, s.range, targets);
      if (!target) continue;
      tower.cooldownMs = 1000 / s.fireRate;

      const enemy = this.enemies.find((e) => e.id === target.id);
      if (!enemy) continue;
      const def = getTower(tower.key);

      if (def.attack === 'chain') {
        const chain = buildChain(target, targets, s.chainRange ?? 0, s.chainTargets ?? 0);
        const dmgs = chainDamages(s.damage, s.chainFalloff ?? 1, chain.length - 1);
        const chainIds = chain.map((t) => t.id);
        this.projectiles.push(new Projectile(this, tower.pos, {
          speed: 620,
          targetPos: () => (enemy.alive ? enemy.pos : null),
          onHit: () => {
            chainIds.forEach((id, i) => {
              this.enemies.find((e) => e.id === id)?.takeDamage(dmgs[i]);
            });
          },
        }));
        continue;
      }

      this.projectiles.push(new Projectile(this, tower.pos, {
        speed: 520,
        targetPos: () => (enemy.alive ? enemy.pos : null),
        onHit: (hitPos) => {
          if (def.attack === 'splash') {
            for (const hit of enemiesInRadius(hitPos, s.splashRadius ?? 0,
              this.enemies.map((e) => ({ id: e.id, pos: e.pos, progress: e.progress, alive: e.alive })))) {
              this.enemies.find((e) => e.id === hit.id)?.takeDamage(s.damage);
            }
          } else {
            if (!enemy.alive) return;
            enemy.takeDamage(s.damage);
            if (def.attack === 'slow') enemy.applySlow(s.slowMul ?? 1, s.slowDurationMs ?? 0);
          }
        },
      }));
    }
  }

  update(_time: number, dtMsRaw: number) {
    if (!this.running) return;
    const dtMs = dtMsRaw * this.speedMul;

    for (const req of this.waves.update(dtMs)) this.spawnEnemy(req.enemyKey);

    this.updateTowers(dtMs);
    this.projectiles = this.projectiles.filter((p) => !p.update(dtMs, this.speedMul));

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
