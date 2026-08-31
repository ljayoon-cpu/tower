import Phaser from 'phaser';
import {
  COLORS, TILE, GRID_COLS, GRID_ROWS, GAME_WIDTH, GAME_HEIGHT,
  waveInterestRate, WAVE_INTEREST_CAP,
} from '../core/constants';
import { createEventBus } from '../core/eventBus';
import type { EventBus } from '../core/eventBus';
import type { GameEvents, StageDef, TileCoord, TowerLevelStats, Vec2 } from '../core/types';
import { Pool } from '../core/pool';
import { getStage, nextStageId } from '../data/stages';
import { starsFor } from '../core/stars';
import { loadSave, loadMeta, recordResult, recordEndless, markTutorialDone } from '../core/save';
import { metaBonuses } from '../core/meta';
import { Tutorial } from '../core/tutorial';
import type { TutorialEvent } from '../core/tutorial';
import { getEnemy } from '../data/enemies';
import { getTower, TOWER_KEYS, cumulativeCost, upgradeCost } from '../data/towers';
import {
  frostFreezeEffect, boltStaggerEffect, poisonArmorPierceEffect, sniperDamageMultiplier,
} from '../data/mergeEffects';
import { canMerge, mergeResultLevel } from '../systems/MergeController';
import { towerInfo } from '../core/towerInfo';
import { TARGET_PRIORITY_LABEL } from '../systems/TargetingSystem';
import type { MergeCandidate } from '../systems/MergeController';
import { GridManager } from '../systems/GridManager';
import { PathManager } from '../systems/PathManager';
import { WaveManager } from '../systems/WaveManager';
import { EconomyManager } from '../systems/EconomyManager';
import { Rng } from '../core/rng';
import { chooseTowerBan, isTowerBanned } from '../core/runRules';

import { Enemy } from '../entities/Enemy';
import type { EnemyModifiers } from '../systems/EnemyState';
import { Tower } from '../entities/Tower';
import { Projectile } from '../entities/Projectile';
import type { ProjectileOpts } from '../entities/Projectile';
import { pickTarget, enemiesInRadius } from '../systems/TargetingSystem';
import { chainDamages, buildChain, beamDamage, buffMultiplier, buildMultiShot } from '../systems/combat';
import { BuildMenu } from '../ui/BuildMenu';
import { audioFor } from '../ui/audio';
import { WorldBackground } from '../ui/worldBackground';
import { WorldMapPainter, worldTileTextureKey } from '../ui/worldMap';
import { attachPressFeedback, fadeInFromBlack, fadeToScene } from '../ui/interactionFeedback';
import type { SoundEffects } from '../core/audio';
import type { HudInit } from './HUD';

const PROJECTILE_TEXTURE: Record<string, string> = {
  arrow: 'projectile_arrow',
  cannon: 'projectile_cannon',
  frost: 'projectile_frost',
  bolt: 'projectile_bolt',
  sniper: 'projectile_sniper',
  poison: 'projectile_poison',
  laser: 'projectile_laser',
  command: 'projectile_command',
  mine: 'projectile_mine',
};

const ENEMY_BURST_COLOR: Record<string, number> = {
  normal: COLORS.enemyNormal,
  fast: 0xff5a47,
  tank: COLORS.enemyTank,
  shield: 0x71dfff,
  regenerator: 0x75db66,
  summoner: 0xd69aff,
  minion: 0xffd75a,
  boss: COLORS.enemyBoss,
  splitter: 0xe8963a,
  splitterling: 0xf0a85a,
  berserker: 0xd1362f,
  crusher: 0xc7d0dc,
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
  private background?: WorldBackground;
  private pendingTile: TileCoord | null = null;
  private buildPreview: Phaser.GameObjects.Arc | null = null;
  private inspectText?: Phaser.GameObjects.Text;
  private upgradeButton?: Phaser.GameObjects.Text;
  private sellButton?: Phaser.GameObjects.Text;
  private selectedTower?: Tower;
  private lives = 0;
  private speedMul = 1;
  private running = false;
  private paused = false;
  private bossOnField = false;
  /** 강한 한 방 뒤에 전투 시간만 잠시 멈춘다. 실제 Phaser 장면에서만 시작된다. */
  private hitstopLeftMs = 0;
  /** 직전 프레임의 이동 벡터. 피격 넉백을 진행 방향 반대로 보이게 한다. */
  private enemyMotion = new Map<number, Vec2>();
  private sellTimer?: Phaser.Time.TimerEvent;
  private sellPanel?: Phaser.GameObjects.Container;
  private sellPanelBackdrop?: Phaser.GameObjects.Rectangle;
  /** 드래그 직후 발생하는 pointerup 이 빌드메뉴/사거리 토글을 켜지 않도록 억제. */
  private suppressTapUntil = 0;
  /** 마지막으로 HUD에 알린 카운트다운 초. 값이 바뀔 때만 emit. */
  private lastCountdown: number | null = -1;
  private tutorial?: Tutorial;
  private meta = { startGold: 0, startLives: 0, interestRateBonus: 0, sellRatioBonus: 0 };
  /** 이 판이 끝날 때까지 설치할 수 없는 타워. */
  private bannedTowerKey: string | null = null;

  private static readonly WAVE_GAP_MS = 8000;

  constructor() { super('game'); }

  init(data: { stageId: string }) {
    this.stage = getStage(data.stageId ?? '1-1');
  }

  create() {
    this.audio = audioFor(this);
    this.audio.stop();
    fadeInFromBlack(this);
    this.bus = createEventBus<GameEvents>();
    this.grid = new GridManager(this.stage.grid);
    this.path = new PathManager(this.stage.path);
    this.waves = new WaveManager(this.stage.waves, this.bus);
    // 튜토리얼 중에는 자동 웨이브를 보류 — 플레이어가 첫 웨이브를 직접 시작한다.
    this.tutorial = this.stage.id === '1-1' && !loadSave().tutorialDone ? new Tutorial() : undefined;
    // 타워 봉인은 보스전에서만. (튜토리얼 스테이지는 보스전이 아니므로 항상 봉인 없음.)
    this.bannedTowerKey = this.stage.bossStage
      ? chooseTowerBan(TOWER_KEYS, this.rng)
      : null;
    if (!this.tutorial) this.waves.enableAutoAdvance(Game.WAVE_GAP_MS);
    this.lastCountdown = -1;
    this.meta = metaBonuses(loadMeta());
    this.eco = new EconomyManager(
      this.stage.startGold + this.meta.startGold, this.bus, this.meta.sellRatioBonus,
    );
    this.lives = this.stage.startLives + this.meta.startLives;
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
    this.hitstopLeftMs = 0;
    this.enemyMotion.clear();
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
      .text(20, 162, '', {
        fontFamily: 'monospace', fontSize: '24px', fontStyle: 'bold', color: '#ffffff',
        stroke: '#000000', strokeThickness: 4,
        lineSpacing: 6, backgroundColor: '#0b0c16f2', padding: { x: 12, y: 9 },
      })
      .setDepth(500)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });
    attachPressFeedback(this, this.inspectText, [this.inspectText], this.audio, () => {
      if (!this.running || this.paused || !this.selectedTower) return;
      this.selectedTower.cyclePriority();
      this.showInspect(this.selectedTower);
    });

    this.upgradeButton = this.add
      .text(20, 148, '', {
        fontFamily: 'monospace', fontSize: '21px', fontStyle: 'bold', color: '#f2f2f7',
        backgroundColor: '#2a5d3a', padding: { x: 10, y: 7 },
      })
      .setDepth(501)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });
    attachPressFeedback(this, this.upgradeButton, [this.upgradeButton], this.audio, () => this.tryUpgradeSelected());

    this.sellButton = this.add
      .text(20, 148, '', {
        fontFamily: 'monospace', fontSize: '21px', fontStyle: 'bold', color: '#f2f2f7',
        backgroundColor: '#5a2a2a', padding: { x: 10, y: 7 },
      })
      .setDepth(501)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });
    attachPressFeedback(this, this.sellButton, [this.sellButton], this.audio, () => {
      if (this.selectedTower && this.towers.includes(this.selectedTower)) this.showSellPrompt(this.selectedTower);
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
      const interest = this.eco.applyInterest(
        waveInterestRate(this.waves.waveIndex + 1) + this.meta.interestRateBonus, WAVE_INTEREST_CAP,
      );
      if (interest > 0) this.bus.emit('interest:earned', { amount: interest });
      // 금광탑 3·5합: 웨이브 클리어마다 추가 배당.
      const mineBonus = this.towers.reduce((sum, t) => sum + (t.stats().mineWaveBonus ?? 0), 0);
      if (mineBonus > 0) this.eco.earn(mineBonus);
      if (this.waves.isFinished) this.endStage(true);
    });
    this.bus.on('wave:started', () => {
      this.audio.play('wave');
      this.advanceTutorial('waveStarted');
    });

    const hudInit: HudInit = {
      bus: this.bus,
      gold: this.eco.gold,
      lives: this.lives,
      totalWaves: this.waves.totalWaves,
      waves: this.stage.waves,
      endless: this.stage.endless ?? false,
      tutorialText: this.tutorial?.text ?? null,
      bannedTowerName: this.bannedTowerKey ? getTower(this.bannedTowerKey).name : '',
      onSkipTutorial: () => this.finishTutorial(),
      onNextWave: () => { if (this.running && !this.paused) this.waves.startNextWave(); },
      getRoster: () => this.towers.map((t) => ({ key: t.key, level: t.level })),
      onToggleSpeed: () => this.toggleSpeed(),
      onTogglePause: () => this.togglePause(),
      onQuit: () => {
        this.running = false;
        this.audio.stop();
        this.scene.stop('hud');
        fadeToScene(this, 'stageselect');
      },
    };
    this.scene.launch('hud', hudInit);
  }

  private advanceTutorial(event: TutorialEvent): void {
    if (!this.tutorial) return;
    if (this.tutorial.advance(event)) {
      this.bus.emit('tutorial:step', { text: this.tutorial.text });
      if (this.tutorial.done) this.finishTutorial();
    }
  }

  /** 튜토리얼 종료(완료 또는 건너뛰기). 자동 웨이브를 켜고 플래그를 저장한다. */
  private finishTutorial(): void {
    if (!this.tutorial) return;
    this.tutorial.skip();
    this.tutorial = undefined;
    markTutorialDone();
    this.waves.enableAutoAdvance(Game.WAVE_GAP_MS);
    this.lastCountdown = -1;
    this.bus.emit('tutorial:step', { text: null });
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
    const world = this.stage.id.split('-')[0];
    this.background = new WorldBackground(this, world);
    const mapPainter = new WorldMapPainter(this, world, this.stage.grid);
    mapPainter.drawDecorations();
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const t = this.grid.tileAt({ col: c, row: r });
        if (t === null || t === 'BLOCKED') continue;
        const img = this.add.image(c * TILE + TILE / 2, r * TILE + TILE / 2, worldTileTextureKey(world, t));
        img.setDisplaySize(TILE - 2, TILE - 2);
        img.setAlpha(0.98);
      }
    }
  }

  private setupBuildInput() {
    this.buildMenu = new BuildMenu(this, {
      onPick: (key) => {
        if (this.pendingTile) this.placeTower(key, this.pendingTile);
      },
      canAfford: (key) => this.eco.canAfford(getTower(key).cost),
      isBanned: (key) => isTowerBanned(key, this.bannedTowerKey),
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
    const previewKey = TOWER_KEYS.find((key) => !isTowerBanned(key, this.bannedTowerKey)) ?? TOWER_KEYS[0];
    const previewRange = getTower(previewKey).levels[0].range;
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
      this.upgradeButton?.setVisible(false);
      this.sellButton?.setVisible(false);
      return;
    }
    this.selectedTower = tower;
    const info = towerInfo(tower.key, tower.level);
    const buffRadius = tower.stats().buffRadius;
    const dpsLine = buffRadius != null
      ? `버프 범위 ${Math.round((buffRadius * 2) / TILE)}칸`
      : info.nextDps != null
        ? `DPS ${info.dps} → ${info.nextDps}`
        : `DPS ${info.dps} (최대)`;
    const parts = [buffRadius != null ? `사거리 ${buffRadius}` : `사거리 ${info.range}`];
    if (info.note) parts.push(info.note);
    const priorityLine = getTower(tower.key).attack === 'support'
      ? ''
      : `\n표적: ${TARGET_PRIORITY_LABEL[tower.priority]} ▸ (눌러 변경)`;
    this.inspectText
      .setText(`${info.name} Lv${info.level}   ${dpsLine}\n${parts.join('   ')}${priorityLine}`)
      .setVisible(true);

    this.refreshUpgradeButton();
  }

  /** 골드 상황에 맞춰 강화·판매 버튼을 갱신한다. 선택된 타워가 있는 동안 매 프레임 호출. */
  private refreshUpgradeButton(): void {
    const tower = this.selectedTower;
    if (!this.upgradeButton || !this.sellButton || !this.inspectText) return;
    if (!tower || !this.towers.includes(tower)) {
      this.upgradeButton.setVisible(false);
      this.sellButton.setVisible(false);
      return;
    }
    // Phaser Text.height는 한글 라인 높이를 실제보다 낮게 잡아 버튼이 설명을 덮었다.
    // 줄 수 기준으로 넉넉히 띄운다.
    const lineCount = this.inspectText.text.split('\n').length;
    const y = this.inspectText.y + lineCount * 36 + 22;
    const maxed = tower.level >= tower.maxLevel;
    if (maxed) {
      this.upgradeButton.setVisible(false);
    } else {
      const cost = upgradeCost(getTower(tower.key), tower.level);
      const afford = this.eco.gold >= cost;
      this.upgradeButton
        .setText(`⬆ Lv${tower.level + 1} 강화  ${cost}G`)
        .setStyle({ backgroundColor: afford ? '#2a5d3a' : '#4a3030', color: afford ? '#f2f2f7' : '#a88' })
        .setPosition(20, y)
        .setVisible(true);
    }
    const refund = Math.floor(cumulativeCost(getTower(tower.key), tower.level) * this.eco.sellRatio);
    const sellX = maxed ? 20 : 20 + this.upgradeButton.width + 8;
    this.sellButton
      .setText(`⌫ 판매 +${refund}G`)
      .setPosition(sellX, y)
      .setVisible(true);
  }

  private tryUpgradeSelected(): void {
    const tower = this.selectedTower;
    if (!this.running || this.paused || !tower || !this.towers.includes(tower)) return;
    if (tower.level >= tower.maxLevel) return;
    const cost = upgradeCost(getTower(tower.key), tower.level);
    if (!this.eco.spend(cost)) { this.audio.play('click'); return; }
    tower.setLevel(tower.level + 1);
    this.mergePop(tower);
    this.audio.play('merge');
    if (tower.rangeVisible) tower.showRange(true);
    this.showInspect(tower);
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
            const sourceVisual = {
              origin: { ...dragged.homePos },
              texture: `tower_${dragged.key}`,
              scale: dragged.sprite.scale,
              rotation: dragged.sprite.rotation,
            };
            targetTower.setLevel(mergeResultLevel(targetTower.level));
            this.grid.release(dragged.tile);
            this.removeTower(dragged);
            this.snapHome(targetTower);
            this.mergeFeedback(
              sourceVisual.origin,
              sourceVisual.texture,
              sourceVisual.scale,
              sourceVisual.rotation,
              targetTower,
            );
            this.advanceTutorial('merged');
            return;
          }
        }
        // 합칠 수 없는 다른 타워 위에 놓으면 → 두 타워 자리 교체.
        if (targetTower && targetTower.id !== dragged.id) {
          const from = dragged.tile;
          const to = targetTower.tile;
          this.grid.release(from);
          this.grid.release(to);
          this.grid.occupy(to, dragged.id);
          this.grid.occupy(from, targetTower.id);
          dragged.relocate(to, this.grid.tileToPixelCenter(to));
          targetTower.relocate(from, this.grid.tileToPixelCenter(from));
          this.audio.play('place');
          return;
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
    this.upgradeButton?.setVisible(false);
    this.sellButton?.setVisible(false);
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
      cumulativeCost(getTower(tower.key), tower.level) * this.eco.sellRatio,
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
    attachPressFeedback(this, sell, [sell], this.audio, () => {
      this.confirmSell(tower);
      close();
    }, () => armed === sell);
    attachPressFeedback(this, cancel, [cancel], this.audio, close, () => armed === cancel);
    // 백드롭 = 바깥 탭 닫기. 단, 롱프레스에서 손 떼는 그 pointerup 은 무시
    // (그 순간 포인터가 백드롭 위에 있으므로 즉시 닫히는 것을 방지).
    backdrop.on('pointerup', () => {
      if (armed !== backdrop) return;
      close();
    });
  }

  private placeTower(key: string, tile: TileCoord): void {
    if (!this.running || this.paused) return;
    if (isTowerBanned(key, this.bannedTowerKey)) return;
    const def = getTower(key);
    if (!this.grid.canPlace(tile)) return;
    if (!this.eco.spend(def.cost)) return;
    const pos = this.grid.tileToPixelCenter(tile);
    const tower = new Tower(this, key, tile, pos);
    this.grid.occupy(tile, tower.id);
    this.towers.push(tower);
    this.audio.play('place');
    this.advanceTutorial('towerPlaced');
    if (this.towers.filter((t) => t.key === key).length >= 2) this.advanceTutorial('sameTypePlaced');
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

  private spawnEnemy(
    enemyKey: string,
    modifiers: EnemyModifiers = {},
    countsForWave = true,
    summonedById: number | null = null,
    lane?: number,
    at?: { route: Vec2[]; traveled: number },
  ) {
    const def = getEnemy(enemyKey);
    const allRoutes = this.path.routes();
    const polyline = at?.route
      ?? (lane != null && lane >= 0 && lane < allRoutes.length
        ? allRoutes[lane]
        : this.path.chooseRoute(this.rng).polyline);
    const enemy = new Enemy(this, def, polyline, modifiers, countsForWave, summonedById, at?.traveled ?? 0);
    this.enemies.push(enemy);
    if (countsForWave) this.waves.notifyEnemySpawned();
    if (def.isBoss) this.bus.emit('boss:spawned', { name: def.name });
  }
  private endStage(won: boolean) {
    if (!this.running) return;
    this.running = false;
    this.scene.stop('hud');
    this.audio.stop();
    this.input.enabled = false;
    this.sellTimer?.remove();

    if (this.stage.endless) {
      // 무한 모드: 승패 대신 도달 웨이브를 기록한다. waveIndex 0-based → +1.
      const reached = this.waves.waveIndex + 1;
      const prevBest = loadSave().endlessBest ?? 0;
      const best = recordEndless(reached);
      if (won) this.bus.emit('stage:won', { stars: 3 });
      else this.bus.emit('stage:lost', {});
      fadeToScene(this, 'result', {
        stageId: this.stage.id, won, stars: 0,
        lives: this.lives, startLives: this.stage.startLives,
        endless: { reached, best, prevBest },
      });
      return;
    }

    const stars = starsFor(this.lives, this.stage.startLives, this.stage.starThresholds, won);
    const prevStars = loadSave().stages[this.stage.id]?.stars ?? 0;
    recordResult(this.stage.id, stars, nextStageId(this.stage.id));
    if (won) this.bus.emit('stage:won', { stars });
    else this.bus.emit('stage:lost', {});
    fadeToScene(this, 'result', {
      stageId: this.stage.id, won, stars, prevStars,
      lives: this.lives, startLives: this.stage.startLives,
    });
  }

  /** 지휘탑 버프(사거리 안 아군 데미지·연사·사거리 증가, 중첩 없음)를 적용한 실효 스탯. */
  private effectiveStats(tower: Tower): TowerLevelStats {
    const base = tower.stats();
    const dmgAuras: number[] = [];
    const rateAuras: number[] = [];
    const rangeAuras: number[] = [];
    for (const b of this.towers) {
      if (b === tower) continue;
      const bs = b.stats();
      if (getTower(b.key).attack !== 'support' || bs.buffRadius == null) continue;
      const dx = b.homePos.x - tower.homePos.x;
      const dy = b.homePos.y - tower.homePos.y;
      if (Math.hypot(dx, dy) > bs.buffRadius) continue;
      dmgAuras.push(bs.buffDamagePct ?? 0);
      rateAuras.push(bs.buffFireRatePct ?? 0);
      rangeAuras.push(bs.buffRangePct ?? 0);
    }
    if (dmgAuras.length === 0) return base;
    return {
      ...base,
      damage: Math.round(base.damage * buffMultiplier(dmgAuras)),
      fireRate: base.fireRate * buffMultiplier(rateAuras),
      range: base.range * buffMultiplier(rangeAuras),
    };
  }

  /** 지원 타워(지휘탑·금광탑): 직접 공격 없음. 금광탑은 초당 골드를 생성한다.
   *  골드는 매 틱 들어오지만, 뜨는 숫자·효과음은 ~3초마다 한 번만(스팸 방지). */
  private updateSupportTower(tower: Tower, s: TowerLevelStats, dtMs: number): void {
    if (s.goldIntervalMs == null || s.goldPerTick == null) return;
    tower.goldTimerMs += dtMs;
    let pending = 0;
    while (tower.goldTimerMs >= s.goldIntervalMs) {
      tower.goldTimerMs -= s.goldIntervalMs;
      this.eco.earn(s.goldPerTick);
      pending += s.goldPerTick;
    }
    if (pending <= 0) return;
    tower.goldDisplayAcc += pending;
    if (tower.goldDisplayAcc >= s.goldPerTick * 3) {
      this.floatingGold(tower.homePos, Math.round(tower.goldDisplayAcc));
      this.audio.play('mine');
      tower.goldDisplayAcc = 0;
    }
  }

  /** 레이저탑: 한 대상을 계속 지지는 지속 빔. 매 프레임 조준·연출, 데미지는 100ms마다 틱.
   *  같은 대상에 오래 머물수록 데미지가 램프업하고, 대상이 바뀌면 대부분 잃는다. */
  private updateBeamTower(tower: Tower, dtMs: number): void {
    const s = this.effectiveStats(tower);
    const r2 = s.range * s.range;
    const inRange = (e: Enemy) => {
      const dx = e.pos.x - tower.homePos.x;
      const dy = e.pos.y - tower.homePos.y;
      return dx * dx + dy * dy <= r2;
    };
    let enemy = tower.beamTargetId != null
      ? this.enemies.find((e) => e.id === tower.beamTargetId && e.alive && inRange(e))
      : undefined;
    if (!enemy) {
      const t = pickTarget(tower.homePos, s.range, this.enemies, tower.priority);
      enemy = t ? this.enemies.find((e) => e.id === t.id) : undefined;
      if (enemy && tower.beamTargetId !== enemy.id) tower.beamLockMs *= 0.35;
      tower.beamTargetId = enemy?.id ?? null;
    }
    if (!enemy) {
      tower.beamLockMs = Math.max(0, tower.beamLockMs - dtMs * 1.5);
      tower.beamGfx?.setVisible(false);
      return;
    }

    tower.beamLockMs += dtMs;
    tower.faceToward(enemy.pos);
    const dmgPerHit = beamDamage(s.damage, (tower.beamLockMs / 1000) * 2.6, s.beamRampPct ?? 0, s.beamRampMax ?? 1);
    const mult = s.damage > 0 ? dmgPerHit / s.damage : 1;

    // 데미지 틱: 100ms 마다 dps 의 1/10 씩. 한 방이 방어력보다 커지도록 나눠 넣는다.
    tower.beamTickMs += dtMs;
    while (tower.beamTickMs >= 100) {
      tower.beamTickMs -= 100;
      if (!enemy.alive) break;
      enemy.takeDamage({ amount: dmgPerHit * s.fireRate * 0.1, armorPierce: 2, kind: 'beam' }, false);
      enemy.applyArmorBreak(s.armorBreakPercent ?? 0, s.armorBreakDurationMs ?? 0);
    }

    this.drawBeam(tower, enemy.pos, mult);
    tower.beamFxMs += dtMs;
    if (tower.beamFxMs >= 230) {
      tower.beamFxMs = 0;
      this.impactFlash(enemy.pos, COLORS.laser, mult > 2 ? 'heavy' : 'light');
      this.audio.play('laser');
    }
  }

  /** 지속 빔 그래픽을 대상까지 갱신한다(램프에 따라 굵기·밝기). 시뮬(테스트)에선 생략. */
  private drawBeam(tower: Tower, to: Vec2, mult: number): void {
    const add = this.add as { line?: (...a: unknown[]) => Phaser.GameObjects.Line };
    if (typeof add.line !== 'function') return;
    const from = tower.homePos;
    if (!tower.beamGfx) {
      tower.beamGfx = add.line(0, 0, from.x, from.y, to.x, to.y, COLORS.laser, 0.9)
        .setOrigin(0, 0).setDepth(14);
    }
    tower.beamGfx
      .setVisible(true)
      .setTo(from.x, from.y, to.x, to.y)
      .setLineWidth(1.6 + mult * 1.4)
      .setAlpha(0.5 + Math.min(0.45, (mult - 1) * 0.22));
  }

  private updateTowers(dtMs: number) {
    const targets = this.enemies;

    for (const tower of this.towers) {
      const def = getTower(tower.key);
      if (def.attack === 'support') {
        this.updateSupportTower(tower, tower.stats(), dtMs);
        continue;
      }
      if (def.attack === 'beam') {
        this.updateBeamTower(tower, dtMs);
        continue;
      }
      tower.cooldownMs -= dtMs;
      if (tower.cooldownMs > 0) continue;
      const s = this.effectiveStats(tower);
      const target = pickTarget(tower.homePos, s.range, targets, tower.priority);
      if (!target) continue;
      tower.cooldownMs = 1000 / s.fireRate;

      const enemy = this.enemies.find((e) => e.id === target.id);
      if (!enemy) continue;
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
            const stagger = boltStaggerEffect(tower.level);
            chain.forEach((hit, i) => {
              const e = this.enemies.find((x) => x.id === hit.id);
              if (!e) return;
              e.takeDamage({ amount: dmgs[i], kind: 'chain' });
              if (e.alive) this.knockbackEnemy(e);
              const stunned = stagger ? e.applyStagger(stagger.durationMs, stagger.cooldownMs) : false;
              this.impactFlash(e.pos, COLORS.bolt, stunned ? 'stagger' : 'light');
            });
          },
        });
        continue;
      }

      // 화살탑 3·5합 멀티샷: 근처 표적에 여러 발(발당 피해 감소). 그 외는 현재 표적 한 발.
      const multi = def.key === 'arrow' && (s.projectileCount ?? 1) > 1;
      const shots = multi
        ? buildMultiShot(enemy, this.enemies, tower.homePos, s.range, s.projectileCount ?? 1)
          .map((tg) => ({ id: tg.id, damage: Math.round(s.damage * (s.projectileDamageMultiplier ?? 1)) }))
        : [{ id: enemy.id, damage: s.damage }];

      for (const shot of shots) {
        this.fireProjectile(tower.homePos, {
          speed: 520,
          textureKey: PROJECTILE_TEXTURE[tower.key],
          targetPos: () => {
            const e = this.enemies.find((x) => x.id === shot.id);
            return e && e.alive ? e.pos : null;
          },
          onHit: (hitPos) => {
            if (def.attack === 'poison') {
              this.impactFlash(hitPos, COLORS.poison, 'light');
              const pierce = poisonArmorPierceEffect(tower.level)?.armorPierce ?? 0;
              for (const hit of enemiesInRadius(hitPos, s.poisonRadius ?? 0, this.enemies)) {
                const affected = this.enemies.find((e) => e.id === hit.id);
                affected?.takeDamage({ amount: s.damage, armorPierce: pierce || undefined, kind: 'poison' });
                affected?.applyPoison(s.poisonDps ?? 0, s.poisonDurationMs ?? 0);
              }
            } else if (def.attack === 'splash') {
              this.impactFlash(hitPos, COLORS.cannon, 'heavy');
              for (const hit of enemiesInRadius(hitPos, s.splashRadius ?? 0, this.enemies)) {
                const affected = this.enemies.find((e) => e.id === hit.id);
                affected?.takeDamage({ amount: s.damage, kind: 'splash' });
                affected?.applyArmorBreak(s.armorBreakPercent ?? 0, s.armorBreakDurationMs ?? 0);
              }
              this.startHitstop();
            } else {
              const e = this.enemies.find((x) => x.id === shot.id);
              if (!e || !e.alive) return;
              if (def.key === 'sniper') {
                e.takeDamage({
                  amount: shot.damage * sniperDamageMultiplier(tower.level, e.healthRatio),
                  armorPierce: s.armorPierce ?? 0,
                  kind: 'single',
                });
              } else {
                e.takeDamage({ amount: shot.damage, kind: def.attack });
              }
              if (def.key === 'arrow' && e.alive) this.knockbackEnemy(e);
              if (def.key === 'sniper') this.startHitstop();
              this.impactFlash(e.pos, def.attack === 'slow' ? COLORS.frost : def.key === 'sniper' ? COLORS.sniper : COLORS.arrow,
                def.attack === 'slow' ? 'frost' : def.key === 'sniper' ? 'heavy' : 'light');
              if (def.attack === 'slow') {
                e.applySlow(s.slowMul ?? 1, s.slowDurationMs ?? 0);
                const freeze = frostFreezeEffect(tower.level);
                if (freeze && e.applyFreezeHit(freeze.hits, freeze.durationMs, freeze.cooldownMs)) {
                  this.impactFlash(e.pos, COLORS.frost, 'heavy');
                }
              }
            }
          },
        });
      }
    }
  }

  private fireProjectile(from: Vec2, opts: ProjectileOpts): void {
    const shot = this.projectilePool.acquire();
    shot.launch(from, opts);
    this.projectiles.push(shot);
  }

  /** 대포·저격이 적중한 다음 40ms 동안 전투 계산만 멈춘다. */
  private startHitstop(): void {
    // Phaser가 없는 밸런스 시뮬레이션에서는 시간 흐름을 바꾸지 않는다.
    if (!this.tweens) return;
    this.hitstopLeftMs = Math.max(this.hitstopLeftMs, 40);
  }

  /** 화살·번개 적중 시 진행 반대쪽으로 4px 밀었다가 빠르게 되돌린다. */
  private knockbackEnemy(enemy: Enemy): void {
    if (!this.tweens) return;
    const motion = this.enemyMotion.get(enemy.id) ?? { x: 0, y: 1 };
    const length = Math.hypot(motion.x, motion.y) || 1;
    this.tweens.add({
      targets: enemy.sprite,
      x: enemy.pos.x - (motion.x / length) * 4,
      y: enemy.pos.y - (motion.y / length) * 4,
      duration: 50,
      yoyo: true,
      ease: 'Quad.out',
    });
  }

  /** 처치 순간에 적 색상 조각 여섯 개와 짧은 찌부를 더한다. */
  private deathBurst(enemy: Enemy): void {
    if (!this.tweens || typeof this.add.circle !== 'function') return;
    const color = ENEMY_BURST_COLOR[enemy.def.key] ?? COLORS.enemyNormal;
    const sprite = enemy.sprite as Phaser.GameObjects.Image & { setScale?: (x: number, y?: number) => unknown };
    sprite.setScale?.(sprite.scaleX * 1.1, sprite.scaleY * 0.86);
    const offsets = [[-1, -1], [0, -1], [1, -1], [-1, 1], [0, 1], [1, 1]] as const;
    for (const [dx, dy] of offsets) {
      const particle = this.add.circle(enemy.pos.x, enemy.pos.y, 3, color, 0.92).setDepth(25);
      this.tweens.add({
        targets: particle,
        x: enemy.pos.x + dx * 18,
        y: enemy.pos.y + dy * 18,
        scale: 0.35,
        alpha: 0,
        duration: 180,
        ease: 'Quad.out',
        onComplete: () => particle.destroy(),
      });
    }
  }

  /** 공격마다 다른 짧은 명중 효과. 강한 한 방만 아주 약하게 화면을 흔든다. */
  private impactFlash(
    pos: Vec2, color: number, force: 'light' | 'heavy' | 'frost' | 'stagger' = 'light',
  ): void {
    if (!this.tweens) return;
    const heavy = force === 'heavy';
    const burst = force === 'frost' || force === 'stagger';
    const ring = this.add.circle(pos.x, pos.y, heavy ? 9 : 6, color, heavy ? 0.9 : 0.7).setDepth(25);
    this.tweens.add({
      targets: ring,
      scale: heavy ? 3.8 : burst ? 3.1 : 2.6,
      alpha: 0,
      duration: heavy ? 230 : 180,
      onComplete: () => ring.destroy(),
    });
    if (burst) {
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

  /** 드래그한 타워가 원래 자리에서 결과 타워로 빨려 들어간 뒤, 합체가 터진다. */
  private mergeFeedback(origin: Vec2, texture: string, scale: number, rotation: number, tower: Tower): void {
    if (!this.tweens || typeof this.add.image !== 'function') {
      this.audio.play('merge');
      this.mergePop(tower);
      return;
    }
    const source = this.add.image(origin.x, origin.y, texture)
      .setScale(scale)
      .setRotation(rotation)
      .setDepth(24);
    this.tweens.add({
      targets: source,
      x: tower.sprite.x,
      y: tower.sprite.y,
      scale: tower.sprite.scale * 0.35,
      alpha: 0,
      duration: 150,
      ease: 'Quad.in',
      onComplete: () => {
        source.destroy();
        this.audio.play('merge');
        this.mergePop(tower);
      },
    });
  }

  /** 머지/강화 성공 시 결과 타워가 커지고, 그 자리에서 1회 링이 퍼진다. */
  private mergePop(tower: Tower): void {
    if (!this.tweens) return;
    const ring = this.add.circle(tower.sprite.x, tower.sprite.y, TILE * 0.22, 0xffe87a, 0.38)
      .setStrokeStyle(2, 0xfff2a7, 0.95)
      .setDepth(23);
    this.tweens.add({
      targets: ring,
      scale: 2.6,
      alpha: 0,
      duration: 260,
      ease: 'Quad.out',
      onComplete: () => ring.destroy(),
    });
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
    this.background?.update(dtMsRaw);
    // The HUD may consume pointerup before the Game scene sees it.
    if (this.input.manager.pointers.some((p) => !p.isDown && this.input.getDragState(p) > 0)) {
      this.cancelDrags();
    }
    if (this.hitstopLeftMs > 0) {
      this.hitstopLeftMs = Math.max(0, this.hitstopLeftMs - dtMsRaw);
      return;
    }
    const dtMs = dtMsRaw * this.speedMul;

    for (const req of this.waves.update(dtMs)) {
      this.spawnEnemy(req.enemyKey, req.modifiers, true, null, req.lane);
    }

    const secs = this.waves.secondsToNextWave();
    if (secs !== this.lastCountdown) {
      this.lastCountdown = secs;
      this.bus.emit('wave:countdown', { seconds: secs });
    }

    this.updateTowers(dtMs);
    // 골드가 들어오는 즉시 건설창·강화버튼의 구매 가능 표시를 갱신한다.
    if (this.buildMenu.isOpen) this.buildMenu.refresh();
    if (this.selectedTower) this.refreshUpgradeButton();
    let activeShots = 0;
    for (const shot of this.projectiles) {
      if (shot.update(dtMsRaw, this.speedMul)) this.projectilePool.release(shot);
      else this.projectiles[activeShots++] = shot;
    }
    this.projectiles.length = activeShots;

    const summoned: Array<{ enemyKey: string; parentId: number }> = [];
    for (const e of this.enemies) {
      const before = e.pos;
      e.update(dtMsRaw, this.speedMul);
      const after = e.pos;
      this.enemyMotion.set(e.id, { x: after.x - before.x, y: after.y - before.y });
      for (const phase of e.collectBossPhases()) {
        this.bus.emit('boss:phase', { name: e.def.name, phaseName: phase.name });
      }
      for (const enemyKey of e.collectSummons()) summoned.push({ enemyKey, parentId: e.id });
      if (e.reachedGoal) {
        this.bus.emit('enemy:reachedGoal', { lifeDamage: e.def.lifeDamage });
        if (!this.running) return;
      }
    }
    for (const request of summoned) this.spawnEnemy(request.enemyKey, {}, false, request.parentId);    // 처리된 적 정리
    const removed = this.enemies.filter((e) => !e.alive);
    for (const e of removed) {
      if (e.hp <= 0) {
        this.bus.emit('enemy:killed', { bounty: e.def.bounty });
        this.floatingGold(e.pos, e.def.bounty);
        this.deathBurst(e);
        // 분열체: 죽은 자리(경로 진행도 유지)에서 조각들로 쪼개진다.
        const split = e.collectDeathSpawn();
        if (split && e.hp <= 0) {
          for (let i = 0; i < split.count; i++) {
            const spread = (i - (split.count - 1) / 2) * 26;
            this.spawnEnemy(split.enemyKey, {}, false, null, undefined, {
              route: e.route, traveled: Math.max(0, e.traveledDistance - spread),
            });
          }
        }
      }
      if (e.summonedById !== null) {
        this.enemies.find((parent) => parent.id === e.summonedById)?.notifySummonRemoved();
      }
      if (e.countsForWave) this.waves.notifyEnemyRemoved();
      if (!this.running) return;
      this.enemyMotion.delete(e.id);
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
