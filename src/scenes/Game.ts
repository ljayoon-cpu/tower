import Phaser from 'phaser';
import {
  COLORS, TILE, GRID_COLS, GRID_ROWS, GAME_WIDTH, GAME_HEIGHT,
  WAVE_INTEREST_RATE, WAVE_INTEREST_CAP,
} from '../core/constants';
import { createEventBus } from '../core/eventBus';
import type { EventBus } from '../core/eventBus';
import type { GameEvents, StageDef, TileCoord, Vec2 } from '../core/types';
import { Pool } from '../core/pool';
import { getStage, nextStageId } from '../data/stages';
import { starsFor } from '../core/stars';
import { loadSave, recordResult } from '../core/save';
import { getEnemy } from '../data/enemies';
import { getTower, TOWER_KEYS, cumulativeCost } from '../data/towers';
import { canMerge, mergeResultLevel } from '../systems/MergeController';
import { towerInfo } from '../core/towerInfo';
import { TARGET_PRIORITY_LABEL } from '../systems/TargetingSystem';
import type { MergeCandidate } from '../systems/MergeController';
import { GridManager } from '../systems/GridManager';
import { PathManager } from '../systems/PathManager';
import { WaveManager } from '../systems/WaveManager';
import { EconomyManager } from '../systems/EconomyManager';
import { Rng } from '../core/rng';
import { Enemy } from '../entities/Enemy';
import { Tower } from '../entities/Tower';
import { Projectile } from '../entities/Projectile';
import type { ProjectileOpts } from '../entities/Projectile';
import { pickTarget, enemiesInRadius } from '../systems/TargetingSystem';
import { chainDamages, buildChain } from '../systems/combat';
import { BuildMenu } from '../ui/BuildMenu';
import { audioFor } from '../ui/audio';
import type { SoundEffects } from '../core/audio';
import type { HudInit } from './HUD';

const PROJECTILE_TEXTURE: Record<string, string> = {
  arrow: 'projectile_arrow',
  cannon: 'projectile_cannon',
  frost: 'projectile_frost',
  bolt: 'projectile_bolt',
  sniper: 'projectile_sniper',
  poison: 'projectile_poison',
};

export class Game extends Phaser.Scene {
  private stage!: StageDef;
  private audio!: SoundEffects;
  private bus!: EventBus<GameEvents>;
  private grid!: GridManager;
  private path!: PathManager;
  private waves!: WaveManager;
  private eco!: EconomyManager;
  private rng = new Rng(Date.now() & 0xffffffff);
  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private projectiles: Projectile[] = [];
  private projectilePool!: Pool<Projectile>;
  private buildMenu!: BuildMenu;
  private pendingTile: TileCoord | null = null;
  private buildPreview: Phaser.GameObjects.Arc | null = null;
  private inspectText?: Phaser.GameObjects.Text;
  private selectedTower?: Tower;
  private lives = 0;
  private speedMul = 1;
  private running = false;
  private paused = false;
  private bossOnField = false;
  private sellTimer?: Phaser.Time.TimerEvent;
  private sellPanel?: Phaser.GameObjects.Container;
  private sellPanelBackdrop?: Phaser.GameObjects.Rectangle;
  /** 드래그 직후 발생하는 pointerup 이 빌드메뉴/사거리 토글을 켜지 않도록 억제. */
  private suppressTapUntil = 0;
  /** 마지막으로 HUD에 알린 카운트다운 초. 값이 바뀔 때만 emit. */
  private lastCountdown: number | null = -1;

  private static readonly WAVE_GAP_MS = 8000;

  constructor() { super('game'); }

  init(data: { stageId: string }) {
    this.stage = getStage(data.stageId ?? '1-1');
  }

  create() {
    this.audio = audioFor(this);
    this.audio.stop();
    this.bus = createEventBus<GameEvents>();
    this.grid = new GridManager(this.stage.grid);
    this.path = new PathManager(this.stage.path);
    this.waves = new WaveManager(this.stage.waves, this.bus);
    this.waves.enableAutoAdvance(Game.WAVE_GAP_MS);
    this.lastCountdown = -1;
    this.eco = new EconomyManager(this.stage.startGold, this.bus);
    this.lives = this.stage.startLives;
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.projectilePool = new Pool(() => new Projectile(this));
    this.pendingTile = null;
    this.buildPreview = null;
    this.speedMul = 1;
    this.running = true;
    this.paused = false;
    this.bossOnField = false;
    this.suppressTapUntil = 0;
    this.sellTimer = undefined;
    this.sellPanel = undefined;
    this.sellPanelBackdrop = undefined;
    this.input.enabled = true;
    // A stationary press must remain eligible for selling; dragging starts after movement.
    this.input.dragDistanceThreshold = 10;
    this.time.paused = false;
    this.tweens.resumeAll();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.running = false;
      this.sellTimer?.remove();
      this.input.off('dragstart');
      this.input.off('drag');
      this.input.off('dragend');
      this.input.off('pointerup');
      this.bus.clear();
      this.scene.stop('hud');
    });

    this.drawMap();
    this.setupBuildInput();
    this.setupDragInput();

    this.selectedTower = undefined;
    this.inspectText = this.add
      .text(20, 148, '', {
        fontFamily: 'monospace', fontSize: '19px', color: '#cdd6f4',
        lineSpacing: 3, backgroundColor: '#0f1020cc', padding: { x: 8, y: 5 },
      })
      .setDepth(500)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });
    this.inspectText.on('pointerup', () => {
      if (!this.running || this.paused || !this.selectedTower) return;
      this.selectedTower.cyclePriority();
      this.audio.play('click');
      this.showInspect(this.selectedTower);
    });

    this.bus.on('enemy:killed', (p) => {
      this.eco.earn(p.bounty);
      this.audio.play('hit');
    });
    this.bus.on('enemy:reachedGoal', (p) => {
      this.lives = Math.max(0, this.lives - p.lifeDamage);
      this.bus.emit('life:changed', { lives: this.lives });
      this.audio.play('leak');
      if (this.lives <= 0) this.endStage(false);
    });
    this.bus.on('wave:cleared', () => {
      this.eco.earn(this.waves.currentClearBonus());
      const interest = this.eco.applyInterest(WAVE_INTEREST_RATE, WAVE_INTEREST_CAP);
      if (interest > 0) this.bus.emit('interest:earned', { amount: interest });
      if (this.waves.isFinished) this.endStage(true);
    });
    this.bus.on('wave:started', () => this.audio.play('wave'));

    const hudInit: HudInit = {
      bus: this.bus,
      gold: this.eco.gold,
      lives: this.lives,
      totalWaves: this.waves.totalWaves,
      waves: this.stage.waves,
      onNextWave: () => { if (this.running && !this.paused) this.waves.startNextWave(); },
      getRoster: () => this.towers.map((t) => ({ key: t.key, level: t.level })),
      onToggleSpeed: () => this.toggleSpeed(),
      onTogglePause: () => this.togglePause(),
      onQuit: () => {
        this.running = false;
        this.audio.stop();
        this.scene.stop('hud');
        this.scene.start('stageselect');
      },
    };
    this.scene.launch('hud', hudInit);
  }

  toggleSpeed(): void {
    if (!this.running || this.paused) return;
    this.speedMul = this.speedMul >= 3 ? 1 : this.speedMul + 1; // 1x → 2x → 3x → 1x
    this.bus.emit('speed:changed', { multiplier: this.speedMul });
  }

  togglePause(): void {
    if (!this.running) return;
    this.paused = !this.paused;
    if (this.paused) this.audio.stop();
    this.sellTimer?.remove();
    this.closeBuildMenu();
    this.sellPanel?.destroy();
    this.sellPanelBackdrop?.destroy();
    this.sellPanel = undefined;
    this.sellPanelBackdrop = undefined;
    this.clearTowerRanges();
    this.cancelDrags();
    this.input.enabled = !this.paused;
    this.time.paused = this.paused;
    if (this.paused) this.tweens.pauseAll();
    else this.tweens.resumeAll();
    this.suppressTapUntil = this.time.now + 150;
    this.bus.emit('pause:changed', { paused: this.paused });
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
      if (!this.running || this.paused) return;
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

  /** except 타워만 사거리 링을 켜고 나머지는 끈다. 선택된 타워는 정보를 표시한다. */
  private clearTowerRanges(except?: Tower): void {
    for (const t of this.towers) t.showRange(t === except);
    this.showInspect(except);
  }

  private showInspect(tower?: Tower): void {
    if (!this.inspectText) return;
    if (!tower || !this.towers.includes(tower)) {
      this.selectedTower = undefined;
      this.inspectText.setVisible(false);
      return;
    }
    this.selectedTower = tower;
    const info = towerInfo(tower.key, tower.level);
    const sell = Math.floor(
      cumulativeCost(getTower(tower.key), tower.level) * EconomyManager.SELL_RATIO,
    );
    const dpsLine = info.nextDps != null
      ? `DPS ${info.dps} → ${info.nextDps}`
      : `DPS ${info.dps} (최대)`;
    const parts = [`사거리 ${info.range}`, `판매 +${sell}G`];
    if (info.note) parts.push(info.note);
    this.inspectText
      .setText(
        `${info.name} Lv${info.level}   ${dpsLine}\n` +
        `${parts.join('   ')}\n표적: ${TARGET_PRIORITY_LABEL[tower.priority]} ▸ (눌러 변경)`,
      )
      .setVisible(true);
  }

  private setupDragInput(): void {
    // Phaser 의 drag 이벤트 콜백은 느슨하게 타입되어 있어 여기서 Image 로 좁힌다.
    this.input.on(
      'dragstart',
      (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
        if (!this.running || this.paused) return;
        this.sellTimer?.remove();
        obj.setDepth(600);
        const t = this.towerFromObj(obj);
        t?.showRange(true);
        if (t) this.showMergeHints(t);
      },
    );

    this.input.on(
      'drag',
      (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image, dx: number, dy: number) => {
        if (!this.running || this.paused) return;
        obj.setPosition(dx, dy);
      },
    );

    this.input.on(
      'dragend',
      (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
        if (!this.running || this.paused) return;
        obj.setDepth(10);
        this.suppressTapUntil = this.time.now + 100;
        this.clearMergeHints();
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
            this.audio.play('merge');
            this.mergePop(targetTower);
            return;
          }
        }
        // 빈 BUILDABLE 타일 → 이동 배치. 골드 무료, 타일 수는 그대로라 자원 압박은 유지.
        if (dropTile.col !== dragged.tile.col || dropTile.row !== dragged.tile.row) {
          if (this.grid.canPlace(dropTile)) {
            this.grid.release(dragged.tile);
            this.grid.occupy(dropTile, dragged.id);
            dragged.relocate(dropTile, this.grid.tileToPixelCenter(dropTile));
            this.audio.play('place');
            return;
          }
        }
        // 경로·점유·범위 밖 → 원위치.
        this.snapHome(dragged);
      },
    );
  }

  private towerFromObj(obj: Phaser.GameObjects.Image): Tower | undefined {
    const id = obj.getData('towerId') as number;
    return this.towers.find((x) => x.id === id);
  }

  private snapHome(t: Tower): void {
    t.sprite.setPosition(t.homePos.x, t.homePos.y).setDepth(10);
  }

  private showMergeHints(dragged: Tower): void {
    for (const t of this.towers) {
      const a: MergeCandidate = { id: dragged.id, key: dragged.key, level: dragged.level };
      const b: MergeCandidate = { id: t.id, key: t.key, level: t.level };
      t.showMergeHint(canMerge(a, b, dragged.maxLevel));
    }
  }

  private clearMergeHints(): void {
    for (const t of this.towers) t.showMergeHint(false);
  }

  private cancelDrags(): void {
    this.clearMergeHints();
    for (const pointer of this.input.manager.pointers) this.input.setDragState(pointer, 0);
    for (const tower of this.towers) {
      // disableInteractive clears Phaser's internal drag lists as well as object state.
      if (tower.sprite.input?.dragState) tower.sprite.disableInteractive().setInteractive();
      this.snapHome(tower);
      tower.showRange(false);
    }
  }

  private removeTower(t: Tower): void {
    this.towers = this.towers.filter((x) => x.id !== t.id);
    t.destroy();
    if (this.selectedTower === t) this.selectedTower = undefined;
    this.inspectText?.setVisible(false);
  }

  private confirmSell(t: Tower): void {
    if (!this.running || this.paused || !this.towers.includes(t)) return;
    this.eco.sellRefund(cumulativeCost(getTower(t.key), t.level));
    this.grid.release(t.tile);
    this.removeTower(t);
    this.audio.play('sell');
  }

  private showSellPrompt(tower: Tower): void {
    if (!this.running || this.paused) return;
    if (this.towers.indexOf(tower) === -1) return;
    this.sellPanel?.destroy();
    this.sellPanelBackdrop?.destroy();
    // 롱프레스에서 손을 떼며 발생하는 pointerup 이 갓 생성된 판매 버튼이나
    // 사거리 토글 핸들러로 흘러들지 않도록 억제(드래그 경로와 동일한 가드).
    this.suppressTapUntil = this.time.now + 150;

    const refund = Math.floor(
      cumulativeCost(getTower(tower.key), tower.level) * EconomyManager.SELL_RATIO,
    );
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // 패널 뒤 전체 화면 백드롭: 탭이 뒤 타워/빌드 캐처로 새는 것을 막고,
    // 바깥 탭 → 닫기(판매 안 함)를 제공한다.
    const backdrop = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.5)
      .setDepth(1199)
      .setInteractive();
    this.sellPanelBackdrop = backdrop;

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
      backdrop.destroy();
      if (this.sellPanel === panel) this.sellPanel = undefined;
      if (this.sellPanelBackdrop === backdrop) this.sellPanelBackdrop = undefined;
    };
    // Require a fresh press on the modal: releasing the original long press cannot sell/close it.
    let armed: Phaser.GameObjects.GameObject | null = null;
    for (const control of [sell, cancel, backdrop]) {
      control.on('pointerdown', () => { armed = control; });
    }
    sell.on('pointerup', () => {
      if (armed !== sell) return;
      this.confirmSell(tower);
      close();
    });
    cancel.on('pointerup', () => { if (armed === cancel) close(); });
    // 백드롭 = 바깥 탭 닫기. 단, 롱프레스에서 손 떼는 그 pointerup 은 무시
    // (그 순간 포인터가 백드롭 위에 있으므로 즉시 닫히는 것을 방지).
    backdrop.on('pointerup', () => {
      if (armed !== backdrop) return;
      close();
    });
  }

  private placeTower(key: string, tile: TileCoord): void {
    if (!this.running || this.paused) return;
    const def = getTower(key);
    if (!this.grid.canPlace(tile)) return;
    if (!this.eco.spend(def.cost)) return;
    const pos = this.grid.tileToPixelCenter(tile);
    const tower = new Tower(this, key, tile, pos);
    this.grid.occupy(tile, tower.id);
    this.towers.push(tower);
    this.audio.play('place');
    // 타워 탭 → 사거리 링 토글(한 번에 하나만 표시). 드래그 직후 탭은 무시.
    tower.sprite.on('pointerup', () => {
      if (!this.running || this.paused) return;
      if (this.time.now < this.suppressTapUntil) return;
      this.clearTowerRanges(tower.rangeVisible ? undefined : tower);
    });
    // 롱프레스(~500ms) → 판매 확인 팝업.
    tower.sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.running || this.paused) return;
      this.sellTimer?.remove();
      this.sellTimer = this.time.delayedCall(500, () => {
        if (pointer.isDown) this.showSellPrompt(tower);
      });
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
    if (def.isBoss) this.bus.emit('boss:spawned', { name: def.name });
  }

  private endStage(won: boolean) {
    if (!this.running) return;
    this.running = false;
    this.scene.stop('hud');
    this.audio.stop();
    this.input.enabled = false;
    this.sellTimer?.remove();
    const stars = starsFor(this.lives, this.stage.startLives, this.stage.starThresholds, won);
    const prevStars = loadSave().stages[this.stage.id]?.stars ?? 0;
    recordResult(this.stage.id, stars, nextStageId(this.stage.id));
    if (won) this.bus.emit('stage:won', { stars });
    else this.bus.emit('stage:lost', {});
    this.scene.start('result', {
      stageId: this.stage.id, won, stars, prevStars,
      lives: this.lives, startLives: this.stage.startLives,
    });
  }

  private updateTowers(dtMs: number) {
    const targets = this.enemies;

    for (const tower of this.towers) {
      tower.cooldownMs -= dtMs;
      if (tower.cooldownMs > 0) continue;
      const s = tower.stats();
      const target = pickTarget(tower.homePos, s.range, targets, tower.priority);
      if (!target) continue;
      tower.cooldownMs = 1000 / s.fireRate;

      const enemy = this.enemies.find((e) => e.id === target.id);
      if (!enemy) continue;
      const def = getTower(tower.key);
      tower.faceToward(enemy.pos);
      if (tower.key === 'arrow' || tower.key === 'cannon' || tower.key === 'frost' || tower.key === 'bolt' || tower.key === 'sniper' || tower.key === 'poison') {
        this.audio.play(tower.key);
      }
      this.muzzleFlash(tower.homePos, def.key === 'sniper' ? COLORS.sniper : def.attack === 'poison' ? COLORS.poison :
        def.attack === 'splash' ? COLORS.cannon : def.attack === 'slow' ? COLORS.frost :
          def.attack === 'chain' ? COLORS.bolt : COLORS.arrow);

      if (def.attack === 'chain') {
        this.fireProjectile(tower.homePos, {
          speed: 620,
          textureKey: PROJECTILE_TEXTURE[tower.key],
          targetPos: () => (enemy.alive ? enemy.pos : null),
          onHit: () => {
            if (!enemy.alive) return;
            // Determine jumps on impact, using current positions and living targets.
            const chain = buildChain(enemy, this.enemies, s.chainRange ?? 0, s.chainTargets ?? 0);
            const dmgs = chainDamages(s.damage, s.chainFalloff ?? 1, chain.length - 1);
            chain.forEach((hit, i) => {
              const e = this.enemies.find((x) => x.id === hit.id);
              e?.takeDamage(dmgs[i]);
              if (e) this.impactFlash(e.pos, COLORS.bolt, 'light');
            });
          },
        });
        continue;
      }

      this.fireProjectile(tower.homePos, {
        speed: 520,
        textureKey: PROJECTILE_TEXTURE[tower.key],
        targetPos: () => (enemy.alive ? enemy.pos : null),
        onHit: (hitPos) => {
          if (def.attack === 'poison') {
            this.impactFlash(hitPos, COLORS.poison, 'light');
            for (const hit of enemiesInRadius(hitPos, s.poisonRadius ?? 0, this.enemies)) {
              const affected = this.enemies.find((e) => e.id === hit.id);
              affected?.takeDamage(s.damage);
              affected?.applyPoison(s.poisonDps ?? 0, s.poisonDurationMs ?? 0);
            }
          } else if (def.attack === 'splash') {
            this.impactFlash(hitPos, COLORS.cannon, 'heavy');
            for (const hit of enemiesInRadius(hitPos, s.splashRadius ?? 0,
              this.enemies)) {
              this.enemies.find((e) => e.id === hit.id)?.takeDamage(s.damage);
            }
          } else {
            if (!enemy.alive) return;
            enemy.takeDamage(s.damage);
            this.impactFlash(enemy.pos, def.attack === 'slow' ? COLORS.frost : def.key === 'sniper' ? COLORS.sniper : COLORS.arrow,
              def.attack === 'slow' ? 'frost' : def.key === 'sniper' ? 'heavy' : 'light');
            if (def.attack === 'slow') enemy.applySlow(s.slowMul ?? 1, s.slowDurationMs ?? 0);
          }
        },
      });
    }
  }

  private fireProjectile(from: Vec2, opts: ProjectileOpts): void {
    const shot = this.projectilePool.acquire();
    shot.launch(from, opts);
    this.projectiles.push(shot);
  }

  /** 공격마다 다른 짧은 명중 효과. 강한 한 방만 아주 약하게 화면을 흔든다. */
  private impactFlash(pos: Vec2, color: number, force: 'light' | 'heavy' | 'frost' = 'light'): void {
    if (!this.tweens) return;
    const heavy = force === 'heavy';
    const ring = this.add.circle(pos.x, pos.y, heavy ? 9 : 6, color, heavy ? 0.9 : 0.7).setDepth(25);
    this.tweens.add({
      targets: ring,
      scale: heavy ? 3.8 : force === 'frost' ? 3.1 : 2.6,
      alpha: 0,
      duration: heavy ? 230 : 180,
      onComplete: () => ring.destroy(),
    });
    if (force === 'frost') {
      for (const [dx, dy] of [[-10, -8], [11, -5], [-5, 11], [9, 10]]) {
        const shard = this.add.circle(pos.x + dx, pos.y + dy, 3, color, 0.9).setDepth(25);
        this.tweens.add({ targets: shard, x: pos.x + dx * 2.2, y: pos.y + dy * 2.2, alpha: 0,
          duration: 220, onComplete: () => shard.destroy() });
      }
    }
    if (heavy) this.cameras.main.shake(90, 0.0025);
  }

  /** 발사 직후 포탑 끝에서 짧게 빛나, 공격 시작점도 눈에 들어오게 한다. */
  private muzzleFlash(pos: Vec2, color: number): void {
    if (!this.tweens) return;
    const flash = this.add.circle(pos.x, pos.y, 5, color, 0.75).setDepth(16);
    this.tweens.add({ targets: flash, scale: 2.1, alpha: 0, duration: 100, onComplete: () => flash.destroy() });
  }

  /** 머지 성공 시 결과 타워가 잠깐 커졌다 돌아온다. */
  private mergePop(tower: Tower): void {
    if (!this.tweens) return;
    this.tweens.add({
      targets: tower.sprite,
      scale: tower.sprite.scale * 1.35,
      duration: 110,
      yoyo: true,
      ease: 'Quad.out',
    });
  }

  /** 처치 지점에서 떠오르며 사라지는 골드 표시. */
  private floatingGold(pos: Vec2, amount: number): void {
    if (!this.tweens || typeof this.add.text !== 'function') return;
    const label = this.add
      .text(pos.x, pos.y, `+${amount}`, {
        fontFamily: 'monospace', fontSize: '18px', color: '#ffcc44',
      })
      .setOrigin(0.5)
      .setDepth(30);
    this.tweens.add({
      targets: label,
      y: pos.y - 34,
      alpha: 0,
      duration: 620,
      ease: 'Quad.out',
      onComplete: () => label.destroy(),
    });
  }

  update(_time: number, dtMsRaw: number) {
    if (!this.running || this.paused) return;
    // The HUD may consume pointerup before the Game scene sees it.
    if (this.input.manager.pointers.some((p) => !p.isDown && this.input.getDragState(p) > 0)) {
      this.cancelDrags();
    }
    const dtMs = dtMsRaw * this.speedMul;

    for (const req of this.waves.update(dtMs)) this.spawnEnemy(req.enemyKey);

    const secs = this.waves.secondsToNextWave();
    if (secs !== this.lastCountdown) {
      this.lastCountdown = secs;
      this.bus.emit('wave:countdown', { seconds: secs });
    }

    this.updateTowers(dtMs);
    let activeShots = 0;
    for (const shot of this.projectiles) {
      if (shot.update(dtMsRaw, this.speedMul)) this.projectilePool.release(shot);
      else this.projectiles[activeShots++] = shot;
    }
    this.projectiles.length = activeShots;

    for (const e of this.enemies) {
      e.update(dtMsRaw, this.speedMul);
      if (e.reachedGoal) {
        this.bus.emit('enemy:reachedGoal', { lifeDamage: e.def.lifeDamage });
        if (!this.running) return;
      }
    }
    // 처리된 적 정리
    const removed = this.enemies.filter((e) => !e.alive);
    for (const e of removed) {
      if (e.hp <= 0) {
        this.bus.emit('enemy:killed', { bounty: e.def.bounty });
        this.floatingGold(e.pos, e.def.bounty);
      }
      this.waves.notifyEnemyRemoved();
      if (!this.running) return;
      e.destroy();
    }
    this.enemies = this.enemies.filter((e) => e.alive);
    this.trackBoss();
  }

  private trackBoss(): void {
    let worst: number | null = null;
    for (const e of this.enemies) {
      if (e.def.isBoss && e.alive) worst = worst === null ? e.healthRatio : Math.min(worst, e.healthRatio);
    }
    if (worst !== null) {
      this.bossOnField = true;
      this.bus.emit('boss:health', { ratio: worst });
    } else if (this.bossOnField) {
      this.bossOnField = false;
      this.bus.emit('boss:cleared', {});
    }
  }
}
