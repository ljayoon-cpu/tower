import Phaser from 'phaser';
import {
  COLORS, TILE, GRID_COLS, GRID_ROWS, GAME_WIDTH, GAME_HEIGHT,
  waveInterestRate, WAVE_INTEREST_CAP,
} from '../core/constants';
import { createEventBus } from '../core/eventBus';
import type { EventBus } from '../core/eventBus';
import type { ElementKind, GameEvents, StageDef, TileCoord, TowerLevelStats, Vec2 } from '../core/types';
import { Pool } from '../core/pool';
import { getStage, nextStageId } from '../data/stages';
import { starsFor } from '../core/stars';
import { loadSave, loadMeta, recordResult, recordEndless, markTutorialDone } from '../core/save';
import { metaBonuses } from '../core/meta';
import { Tutorial } from '../core/tutorial';
import type { TutorialEvent } from '../core/tutorial';
import { getEnemy } from '../data/enemies';
import { getTower, TOWER_KEYS, cumulativeCost, upgradeCost } from '../data/towers';
import { canMerge, mergeResultLevel } from '../systems/MergeController';
import { towerInfo } from '../core/towerInfo';
import type { MergeCandidate } from '../systems/MergeController';
import { GridManager } from '../systems/GridManager';
import { PathManager } from '../systems/PathManager';
import { WaveManager } from '../systems/WaveManager';
import { EconomyManager } from '../systems/EconomyManager';
import { Rng } from '../core/rng';
import { chooseTowerBan, isTowerBanned, isTowerAtBuildLimit, towerBuildLimit } from '../core/runRules';

import { Enemy } from '../entities/Enemy';
import type { DamagePacket, EnemyModifiers } from '../systems/EnemyState';
import { Tower } from '../entities/Tower';
import { Projectile } from '../entities/Projectile';
import type { ProjectileOpts } from '../entities/Projectile';
import { pickTarget, enemiesInRadius, towerLayers, eligibleTargets } from '../systems/TargetingSystem';
import { chainDamages, buildChain, beamDamage, buffMultiplier, buildMultiShot, executeMultiplier, pierceLineTargets, isOrthAdjacent, frostCollapseDamage, reactionBonusDamage, dischargeTargets } from '../systems/combat';
import { elementOf, REACTIONS, MARK_DURATION_MS, FROST_COLLAPSE, STATIC_DISCHARGE, CORROSION_BURST, OVERHEAT } from '../data/reactions';
import { BottomSheet, type InspectView } from '../ui/BottomSheet';
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
  ballista: 'projectile_ballista',
};

/** 공명 반응 원소별 이펙트 색. runReaction 마다 재할당하지 않도록 모듈 상수. */
const REACTION_COLOR: Record<ElementKind, number> = {
  ice: COLORS.frost, lightning: COLORS.bolt, decay: COLORS.poison, fire: COLORS.cannon,
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
  drone: 0x9fd8ff,
  gunship: 0x7cc0ef,
  carrier: 0x6fb4e6,
  airboss: 0x8ad0ff,
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
  private sheet!: BottomSheet;
  private background?: WorldBackground;
  /** 경로 선택 시트가 A/B 를 돌려줄 때 실행할 대기 중인 강화/머지 액션. */
  private pendingPathAction?: (p: 'a' | 'b') => void;
  private pendingTile: TileCoord | null = null;
  private buildPreview: Phaser.GameObjects.Arc | null = null;
  private selectedTower?: Tower;
  private lives = 0;
  private speedMul = 1;
  private running = false;
  private paused = false;
  private bossOnField = false;
  /** 타워 종류별 누적 피해량(실제로 깎은 체력+보호막). 결과 화면 기여도 표시용. */
  private damageByTower = new Map<string, number>();
  /** 공명 충전된 타워 인스턴스 — 공명선·정보 시트용. */
  private chargedTowers = new Set<Tower>();
  /** 충전된 타워가 1기라도 있는 key — dealDamage 훅에서 O(1) 조회. */
  private chargedKeys = new Set<string>();
  /** 충전된 원소 첨탑과 그 파트너를 잇는 룬 빛줄기. recomputeCharged 마다 다시 그린다. */
  private resonanceLines: Phaser.GameObjects.Line[] = [];
  /** 테스트 계측용 — 반응이 터질 때마다 호출(프로덕션에선 미설정). */
  private onReaction?: (el: ElementKind, byTowerKey: string) => void;
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
    // 봉인 후보는 전투 타워로 한정한다: 지원형(지휘탑·연금탑)은 봉인해도 방어 자체엔
    // 영향이 없어 봉인 슬롯이 낭비되고, 대공 특화 창공탑을 봉인하면 공중 보스전(3-7)이
    // 불합리해진다. 나머지 화살/서리/번개/저격/역병/파열/마광은 모두 봉인 대상.
    this.bannedTowerKey = this.stage.bossStage
      ? chooseTowerBan(
          TOWER_KEYS.filter((key) => {
            const t = getTower(key);
            return t.attack !== 'support' && key !== 'ballista';
          }),
          this.rng,
        )
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
    this.pendingPathAction = undefined;
    this.speedMul = 1;
    this.running = true;
    this.paused = false;
    this.bossOnField = false;
    this.hitstopLeftMs = 0;
    this.damageByTower.clear();
    this.chargedTowers.clear();
    this.chargedKeys.clear();
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
      this.sheet?.destroy();
      for (const l of this.resonanceLines) l.destroy();
      this.resonanceLines = [];
      this.bus.clear();
      this.scene.stop('hud');
    });

    this.drawMap();
    this.setupBuildInput();
    this.setupDragInput();

    this.selectedTower = undefined;

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
    this.sheet?.setBottomInset(0);
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
    mapPainter.drawStageLandmarks(this.stage);
  }

  private setupBuildInput() {
    this.sheet = new BottomSheet(this, {
      onBuildPick: (key) => { if (this.pendingTile) this.placeTower(key, this.pendingTile); },
      canAfford: (key) => this.eco.canAfford(getTower(key).cost),
      isBanned: (key) => isTowerBanned(key, this.bannedTowerKey),
      isAtLimit: (key) => isTowerAtBuildLimit(key, this.countTowers(key)),
      limitLabel: (key) => `최대 ${towerBuildLimit(key)}개`,
      onUpgrade: () => this.tryUpgradeSelected(),
      onSell: () => this.sellSelected(),
      onPathPick: (p) => this.resolvePendingPath(p),
      onDismiss: () => this.onSheetDismiss(),
    });
    this.sheet.setBottomInset(this.tutorial ? 60 : 0); // HUD 코치 바 높이 = 60px

    // 플레이 영역 전체를 덮는 투명 입력 캐처. depth 를 최하위로 두어
    // 타워/시트/HUD(별도 씬) 오브젝트 클릭은 topOnly 규칙에 의해
    // 여기로 흘러들지 않는다.
    const catcher = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.001)
      .setDepth(-100)
      .setInteractive();

    catcher.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.running || this.paused) return;
      if (this.time.now < this.suppressTapUntil) return;
      if (this.sheet.mode === 'path') return; // 백드롭이 먹지만 이중 안전
      // 빈 곳/타일 탭 → 표시 중인 사거리 링 숨김
      this.clearTowerRanges();
      if (this.sheet.isOpen) { this.closeBuildMenu(); this.showInspect(undefined); return; }
      const tile = this.grid.pixelToTile({ x: pointer.worldX, y: pointer.worldY });
      if (!this.grid.canPlace(tile)) return;
      this.openBuildMenu(tile);
    });
  }

  private openBuildMenu(tile: TileCoord): void {
    // 설치 메뉴를 열 땐 타워 정보창을 닫는다 — 둘 중 하나만 보이게.
    this.clearTowerRanges();
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
    this.sheet.showBuild(); // showBuild 가 내부에서 refreshBuild 까지 수행한다.
  }

  private closeBuildMenu(): void {
    this.sheet.hide();
    this.pendingTile = null;
    this.buildPreview?.destroy();
    this.buildPreview = null;
  }

  /** 시트가 스스로 닫힐 때(백드롭 탭 등) 설치 상태를 정리한다. */
  private onSheetDismiss(): void {
    this.pendingTile = null;
    this.buildPreview?.destroy();
    this.buildPreview = null;
    this.pendingPathAction = undefined;
  }

  /** 시트 판매 버튼 → 선택 타워 판매 확인 팝업. */
  private sellSelected(): void {
    if (this.selectedTower && this.towers.includes(this.selectedTower)) this.showSellPrompt(this.selectedTower);
  }

  /** 경로 선택 시트에서 A/B 를 고른 결과를 대기 중인 강화/머지에 전달한다. */
  private resolvePendingPath(p: 'a' | 'b'): void {
    const act = this.pendingPathAction;
    this.pendingPathAction = undefined;
    act?.(p);
  }

  /** except 타워만 사거리 링을 켜고 나머지는 끈다. 선택된 타워는 정보를 표시한다. */
  private clearTowerRanges(except?: Tower): void {
    for (const t of this.towers) t.showRange(t === except);
    this.showInspect(except);
  }

  /** 타워 정보 시트에 넣을 값들. 기존 showInspect + refreshUpgradeButton 의 문자열 계산을 데이터로. */
  private inspectView(tower: Tower): InspectView {
    const info = towerInfo(tower.key, tower.level, tower.path);
    const pathName = tower.path ? ` · ${getTower(tower.key).paths![tower.path].name}` : '';
    const buffRadius = tower.stats().buffRadius;
    const dpsLine = buffRadius != null
      ? `버프 범위 ${Math.round((buffRadius * 2) / TILE)}칸`
      : info.nextDps != null ? `DPS ${info.dps} → ${info.nextDps}` : `DPS ${info.dps} (최대)`;
    const rate = Number(info.fireRate.toFixed(2));
    const lines = [dpsLine, `사거리 ${buffRadius ?? info.range}   연사 ${rate}/초`];
    if (info.note) lines.push(info.note);
    const resoLine = this.resonanceInspectLine(tower);
    if (resoLine) lines.push(resoLine);
    const maxed = tower.level >= tower.maxLevel;
    const cost = upgradeCost(getTower(tower.key), tower.level);
    const refund = Math.floor(cumulativeCost(getTower(tower.key), tower.level) * this.eco.sellRatio);
    return {
      title: `${info.name}${pathName} Lv${info.level}`,
      lines,
      upgrade: maxed ? null : { label: `⬆ Lv${tower.level + 1} 강화  ${cost}G`, afford: this.eco.gold >= cost },
      sell: { label: `⌫ 판매 +${refund}G` },
    };
  }

  /** 정보 시트용 공명 상태 한 줄. 없으면 null. */
  private resonanceInspectLine(tower: Tower): string | null {
    const el = elementOf(tower.key);
    if (el && tower.charged) return `공명 충전 · ${REACTIONS[el].name}`;
    if (el && !tower.charged) return null;
    // 원소 없는 타워: 인접에 충전된 원소 첨탑이 있으면 기폭기로 표시
    const partners = this.towers.filter((n) =>
      n !== tower && elementOf(n.key) && n.charged && isOrthAdjacent(tower.tile, n.tile)
      && getTower(tower.key).attack !== 'support');
    if (partners.length === 0) return null;
    const names = partners.map((n) => `${getTower(n.key).name}→${REACTIONS[elementOf(n.key)!].name}`);
    return `공명 기폭 · ${names.join(', ')}`;
  }

  private showInspect(tower?: Tower): void {
    if (!tower || !this.towers.includes(tower)) {
      this.selectedTower = undefined;
      if (this.sheet.mode === 'inspect') this.sheet.hide();
      return;
    }
    // 경로 선택 시트가 떠 있으면 showInspect 는 내부적으로 no-op — selectedTower 도 바꾸지 않는다.
    if (this.sheet.mode === 'path') return;
    this.selectedTower = tower;
    this.sheet.showInspect(this.inspectView(tower));
  }

  private tryUpgradeSelected(): void {
    const tower = this.selectedTower;
    if (!this.running || this.paused || !tower || !this.towers.includes(tower)) return;
    if (tower.level >= tower.maxLevel) return;
    const cost = upgradeCost(getTower(tower.key), tower.level);
    if (this.eco.gold < cost) { this.audio.play('click'); return; }
    const finish = (path?: 'a' | 'b') => {
      // 경로 선택 메뉴가 열린 사이 일시정지/판매됐을 수 있다.
      if (!this.running || this.paused || !this.towers.includes(tower)) return;
      // 골드는 경로 선택을 마친 뒤에만 차감한다(선택 취소 시 손해 없음).
      if (!this.eco.spend(cost)) { this.audio.play('click'); return; }
      tower.setLevel(tower.level + 1, path);
      this.mergePop(tower);
      this.audio.play('merge');
      if (tower.rangeVisible) tower.showRange(true);
      this.showInspect(tower);
    };
    if (tower.needsPathChoice) {
      this.pendingPathAction = finish;
      this.sheet.showPath(tower.key);
    } else finish();
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
          const a: MergeCandidate = { id: dragged.id, key: dragged.key, level: dragged.level, path: dragged.path };
          const b: MergeCandidate = { id: targetTower.id, key: targetTower.key, level: targetTower.level, path: targetTower.path };
          if (canMerge(a, b, dragged.maxLevel)) {
            const doMerge = (path?: 'a' | 'b') => {
              // 경로 선택 메뉴가 열린 사이 일시정지/판매됐을 수 있다(dragged 는 이 클로저 안에서 제거됨).
              if (!this.running || this.paused || !this.towers.includes(targetTower) || !this.towers.includes(dragged)) return;
              const sourceVisual = {
                origin: { ...dragged.homePos },
                texture: `tower_${dragged.key}`,
                scale: dragged.sprite.scale,
                rotation: dragged.sprite.rotation,
              };
              targetTower.setLevel(mergeResultLevel(targetTower.level), path);
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
            };
            if (targetTower.needsPathChoice) {
              this.snapHome(dragged); // 경로 선택 중 드래그한 타워는 원위치로
              this.pendingPathAction = doMerge;
              this.sheet.showPath(targetTower.key);
            } else doMerge();
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
          this.recomputeCharged();
          this.audio.play('place');
          return;
        }
        // 빈 BUILDABLE 타일 → 이동 배치. 골드 무료, 타일 수는 그대로라 자원 압박은 유지.
        if (dropTile.col !== dragged.tile.col || dropTile.row !== dragged.tile.row) {
          if (this.grid.canPlace(dropTile)) {
            this.grid.release(dragged.tile);
            this.grid.occupy(dropTile, dragged.id);
            dragged.relocate(dropTile, this.grid.tileToPixelCenter(dropTile));
            this.recomputeCharged();
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
      const a: MergeCandidate = { id: dragged.id, key: dragged.key, level: dragged.level, path: dragged.path };
      const b: MergeCandidate = { id: t.id, key: t.key, level: t.level, path: t.path };
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
    if (this.sheet?.mode === 'build') this.closeBuildMenu();
    else this.sheet?.hide();
    this.towers = this.towers.filter((x) => x.id !== t.id);
    t.destroy();
    if (this.selectedTower === t) this.selectedTower = undefined;
    this.recomputeCharged();
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

  private countTowers(key: string): number {
    return this.towers.reduce((n, t) => n + (t.key === key ? 1 : 0), 0);
  }

  private placeTower(key: string, tile: TileCoord): void {
    if (!this.running || this.paused) return;
    if (isTowerBanned(key, this.bannedTowerKey)) return;
    if (isTowerAtBuildLimit(key, this.countTowers(key))) return;
    const def = getTower(key);
    if (!this.grid.canPlace(tile)) return;
    if (!this.eco.spend(def.cost)) return;
    const pos = this.grid.tileToPixelCenter(tile);
    const tower = new Tower(this, key, tile, pos);
    this.grid.occupy(tile, tower.id);
    this.towers.push(tower);
    this.recomputeCharged();
    this.audio.play('place');
    this.advanceTutorial('towerPlaced');
    if (this.towers.filter((t) => t.key === key).length >= 2) this.advanceTutorial('sameTypePlaced');
    // 타워 탭 → 사거리 링 토글(한 번에 하나만 표시). 드래그 직후 탭은 무시.
    // 타워를 고르면 설치 메뉴는 닫는다 — 정보창과 설치창이 동시에 뜨지 않게.
    tower.sprite.on('pointerup', () => {
      if (!this.running || this.paused) return;
      if (this.time.now < this.suppressTapUntil) return;
      this.closeBuildMenu();
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
  /** 타워 종류별 누적 피해를 많은 순으로. 결과 화면 전달용. */
  private damageBreakdown(): { key: string; name: string; damage: number }[] {
    return [...this.damageByTower.entries()]
      .map(([key, damage]) => ({ key, name: getTower(key).name, damage: Math.round(damage) }))
      .filter((r) => r.damage > 0)
      .sort((a, b) => b.damage - a.damage);
  }

  private endStage(won: boolean) {
    if (!this.running) return;
    this.running = false;
    this.scene.stop('hud');
    this.audio.stop();
    this.input.enabled = false;
    this.sellTimer?.remove();
    this.sheet?.hide();
    this.pendingPathAction = undefined;

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
        damage: this.damageBreakdown(),
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
      damage: this.damageBreakdown(),
    });
  }

  /**
   * 충전 규칙(스펙 §2.2): 원소 첨탑 T 가 상하좌우 인접에
   * `attack !== 'support'` 이고 원소가 다른(또는 없는) 첨탑을 1기 이상 두면 충전.
   * 배치가 바뀔 때만(설치·머지·판매·이동) 호출한다.
   */
  private recomputeCharged(): void {
    this.chargedTowers.clear();
    this.chargedKeys.clear();
    for (const t of this.towers) {
      const el = elementOf(t.key);
      t.charged = false;
      if (!el) continue;
      for (const n of this.towers) {
        if (n === t) continue;
        if (getTower(n.key).attack === 'support') continue;
        if (elementOf(n.key) === el) continue;
        if (!isOrthAdjacent(t.tile, n.tile)) continue;
        t.charged = true;
        break;
      }
      if (t.charged) {
        this.chargedTowers.add(t);
        this.chargedKeys.add(t.key);
      }
    }
    this.updateResonanceLinks();
  }

  /** 충전된 원소 첨탑 → 유효 파트너(직교 인접·비지원·다른 원소)로 룬 빛줄기를 다시 그린다. */
  private updateResonanceLinks(): void {
    for (const l of this.resonanceLines) l.destroy();
    this.resonanceLines = [];
    if (typeof this.add.line !== 'function') return; // 밸런스 시뮬 가짜 씬
    const seen = new Set<string>();
    for (const t of this.chargedTowers) {
      for (const n of this.towers) {
        if (n === t) continue;
        if (getTower(n.key).attack === 'support') continue;
        if (elementOf(n.key) === elementOf(t.key)) continue;
        if (!isOrthAdjacent(t.tile, n.tile)) continue;
        const pairKey = [t.id, n.id].sort((a, b) => a - b).join('-');
        if (seen.has(pairKey)) continue;
        seen.add(pairKey);
        const line = this.add.line(0, 0, t.homePos.x, t.homePos.y, n.homePos.x, n.homePos.y, COLORS.resonance, 0.5)
          .setOrigin(0, 0).setDepth(3).setLineWidth(2);
        this.resonanceLines.push(line);
      }
    }
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
    // 지휘탑은 항상 버프를 유지한다. 짧은 깃발 펄스로 그 상태를 읽을 수 있게 한다.
    if (tower.key === 'command') {
      tower.cooldownMs = Math.max(0, tower.cooldownMs - dtMs);
      if (tower.cooldownMs === 0) {
        tower.cooldownMs = 1600;
        tower.playAttack();
      }
    }
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
      tower.playAttack();
      tower.goldDisplayAcc = 0;
    }
  }

  /** 레이저탑: 한 대상을 계속 지지는 지속 빔. 매 프레임 조준·연출, 데미지는 100ms마다 틱.
   *  같은 대상에 오래 머물수록 데미지가 램프업하고, 대상이 바뀌면 대부분 잃는다. */
  private updateBeamTower(tower: Tower, dtMs: number): void {
    const s = this.effectiveStats(tower);
    const def = getTower(tower.key);
    const layers = towerLayers(def.targetsGround, def.targetsAir);
    const r2 = s.range * s.range;
    const inRange = (e: Enemy) => {
      const dx = e.pos.x - tower.homePos.x;
      const dy = e.pos.y - tower.homePos.y;
      return dx * dx + dy * dy <= r2 && layers.has(e.layer);
    };
    let enemy = tower.beamTargetId != null
      ? this.enemies.find((e) => e.id === tower.beamTargetId && e.alive && inRange(e))
      : undefined;
    if (!enemy) {
      const t = pickTarget(tower.homePos, s.range, eligibleTargets(this.enemies, layers), tower.priority);
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
    tower.faceToward(enemy.renderPos);
    const dmgPerHit = beamDamage(s.damage, (tower.beamLockMs / 1000) * 2.6, s.beamRampPct ?? 0, s.beamRampMax ?? 1);
    const mult = s.damage > 0 ? dmgPerHit / s.damage : 1;

    // 데미지 틱: 100ms 마다 dps 의 1/10 씩. 한 방이 방어력보다 커지도록 나눠 넣는다.
    tower.beamTickMs += dtMs;
    while (tower.beamTickMs >= 100) {
      tower.beamTickMs -= 100;
      if (!enemy.alive) break;
      const airMul = enemy.layer === 'air' ? (s.airDamageMultiplier ?? 1) : 1;
      this.dealDamage(tower.key, enemy, { amount: dmgPerHit * s.fireRate * 0.1 * airMul, armorPierce: 2, kind: 'beam' }, false);
      enemy.applyArmorBreak(s.armorBreakPercent ?? 0, s.armorBreakDurationMs ?? 0);
    }

    this.drawBeam(tower, enemy.renderPos, mult);
    tower.beamFxMs += dtMs;
    if (tower.beamFxMs >= 230) {
      tower.beamFxMs = 0;
      tower.playAttack();
      this.impactFlash(enemy.renderPos, COLORS.laser, mult > 2 ? 'heavy' : 'light');
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

  /** enemy.takeDamage + 타워 종류별 기여도 집계. 실제로 깎은 체력+보호막을 누적한다. */
  private dealDamage(towerKey: string, enemy: Enemy, packet: DamagePacket, flash = true): number {
    const dealt = enemy.takeDamage(packet, flash);
    this.creditDamage(towerKey, dealt);
    this.resonanceHook(towerKey, enemy, dealt);
    return dealt;
  }

  /** 공명: 지원탑이 아니면 다른 각인을 격발하고, 충전된 원소 첨탑이면 자기 각인을 남긴다. */
  private resonanceHook(towerKey: string, enemy: Enemy, dealt: number): void {
    if (!enemy.alive && enemy.markedElement == null) return;
    const def = getTower(towerKey);
    if (def.attack === 'support') return;
    const towerEl = def.element ?? null;

    // 물리 타워(towerEl === null)는 원소 불문 아무 각인이나 소비한다.
    // 원소 타워는 다른 원소의 각인만 소비한다(같은 원소면 consumeElementalMark 가 null 반환).
    const consumed = enemy.consumeElementalMark(towerEl);
    if (consumed) this.runReaction(consumed, towerKey, enemy, dealt);

    if (towerEl && this.chargedKeys.has(towerKey) && enemy.alive) {
      enemy.applyElementalMark(towerEl, MARK_DURATION_MS);
    }
  }

  /**
   * 4대 반응. 후속타는 `byTowerKey` 로 `dealDamage` 를 다시 부르므로 재귀가 생긴다. 이 재귀는
   * 무한 루프가 되지 않는다: `startReactionCooldown` 이 이 함수 진입 즉시 걸리고 `reactionCdMs` 는
   * 동기 캐스케이드 도중 감소하지 않으므로, 각 적은 한 번의 동기 캐스케이드에서 원소별로 최대 1회만
   * 반응한다 → 전체 반응 횟수는 (살아있는 적 수 × 원소 4종) 으로 유한하게 묶인다. (같은 적 경로는
   * 각인이 이미 소비돼 depth 1 이지만, 번개 정전 방출은 미리 각인된 서로 다른 적 N기를 연쇄시켜
   * 대략 depth N 까지 갈 수 있다 — 그래도 위 상한 때문에 종료한다.)
   */
  private runReaction(el: ElementKind, byTowerKey: string, target: Enemy, dealtAmount: number): void {
    target.startReactionCooldown(el, REACTIONS[el].cooldownMs);
    this.onReaction?.(el, byTowerKey);

    if (el === 'ice') {
      const amount = frostCollapseDamage(target.state.maxHp);
      // armorPierce: 장갑 무시 sentinel (밸런스 노브 아님 — 서리 붕괴는 장갑·저항을 통째로 무시).
      this.dealDamage(byTowerKey, target, { amount, kind: 'single', ignoreShield: true, armorPierce: 9999 }, false);
      target.applySlow(FROST_COLLAPSE.slowMul, FROST_COLLAPSE.slowDurationMs);
    } else if (el === 'lightning') {
      const jolt = reactionBonusDamage(dealtAmount, STATIC_DISCHARGE.detonatorRatio, STATIC_DISCHARGE.flat);
      // 층 필터 없음(의도적): 전기는 공중으로도 아크가 튄다 — 지상/공중 모두 점프 대상.
      for (const hit of dischargeTargets(target.pos, this.enemies, target.id)) {
        const e = this.enemies.find((x) => x.id === hit.id);
        if (!e) continue;
        this.dealDamage(byTowerKey, e, { amount: jolt, kind: 'chain' }, false);
        if (typeof this.add.line === 'function') {
          const spark = this.add.line(0, 0, target.renderPos.x, target.renderPos.y, e.renderPos.x, e.renderPos.y, COLORS.bolt, 0.9)
            .setOrigin(0, 0).setDepth(24).setLineWidth(1.5);
          if (this.tweens) this.tweens.add({ targets: spark, alpha: 0, duration: 140, onComplete: () => spark.destroy() });
          else spark.destroy();
        }
      }
    } else if (el === 'decay') {
      const dps = target.strongestPoisonDps();
      const burst = CORROSION_BURST.flat + dps * CORROSION_BURST.poisonDpsRatio;
      this.dealDamage(byTowerKey, target, { amount: burst, kind: 'poison' }, false);
      if (dps > 0) {
        // 지상만(의도적): 독 구름은 지면에 퍼지므로 공중 적에겐 전염되지 않는다.
        // 위 정전 방출의 무필터와 대비 — 원소별 물리적 성질이 다르다.
        const layers = towerLayers(true, false);
        let n = 0;
        for (const hit of enemiesInRadius(target.pos, CORROSION_BURST.spreadRadius, this.enemies, layers)) {
          if (hit.id === target.id || n >= CORROSION_BURST.spreadMaxTargets) continue;
          const e = this.enemies.find((x) => x.id === hit.id);
          if (!e) continue;
          // 진짜 타워 key 로 독을 건다 — Game.update 의 collectPoisonDamage 크레딧 루프가 자동 귀속.
          e.applyPoison(byTowerKey, dps * CORROSION_BURST.spreadDpsRatio, CORROSION_BURST.spreadDurationMs);
          n++;
        }
      }
    } else { // fire
      target.applyArmorBreak(OVERHEAT.armorBreakPercent, OVERHEAT.armorBreakDurationMs);
      target.applyPoison(byTowerKey, OVERHEAT.burnDps, OVERHEAT.burnDurationMs);
      this.dealDamage(byTowerKey, target, {
        amount: reactionBonusDamage(dealtAmount, OVERHEAT.detonatorRatio, 0), kind: 'splash',
      }, false);
    }

    this.impactFlash(target.renderPos, REACTION_COLOR[el], el === 'ice' ? 'frost' : 'heavy');
  }

  /** takeDamage를 거치지 않는 피해(독 지속딜 등)를 결과창 타워별 집계에만 더한다. */
  private creditDamage(towerKey: string, amount: number): void {
    if (amount > 0) this.damageByTower.set(towerKey, (this.damageByTower.get(towerKey) ?? 0) + amount);
  }

  private updateTowers(dtMs: number) {
    for (const tower of this.towers) {
      tower.updateVisual(dtMs);
      const def = getTower(tower.key);
      if (def.attack === 'support') {
        this.updateSupportTower(tower, tower.stats(), dtMs);
        continue;
      }
      if (def.attack === 'beam') {
        this.updateBeamTower(tower, dtMs);
        continue;
      }
      const sAura = this.effectiveStats(tower);
      if (sAura.slowAura) {
        // 빙결 경로 B: 오라 반경을 한 번만 희미한 링으로 그려 둔다(시뮬 테스트에선 생략).
        const addC = this.add as { circle?: (...a: unknown[]) => Phaser.GameObjects.Arc };
        if (typeof addC.circle === 'function' && !tower.auraRing) {
          tower.auraRing = addC.circle(tower.homePos.x, tower.homePos.y, sAura.slowAuraRadius ?? 0, COLORS.frost, 0.05)
            .setStrokeStyle(1, COLORS.frost, 0.25).setDepth(1);
        }
        const auraLayers = towerLayers(def.targetsGround, def.targetsAir);
        for (const hit of enemiesInRadius(tower.homePos, sAura.slowAuraRadius ?? 0, this.enemies, auraLayers)) {
          const e = this.enemies.find((x) => x.id === hit.id);
          if (!e) continue;
          e.applySlow(sAura.slowMul ?? 1, sAura.slowDurationMs ?? 200);
          this.dealDamage(tower.key, e, { amount: (sAura.damage * dtMs) / 1000, kind: 'slow' }, false);
        }
        continue;
      }
      tower.cooldownMs -= dtMs;
      if (tower.cooldownMs > 0) continue;
      const s = this.effectiveStats(tower);
      const layers = towerLayers(def.targetsGround, def.targetsAir);
      const eligible = eligibleTargets(this.enemies, layers);
      const target = pickTarget(tower.homePos, s.range, eligible, tower.priority);
      if (!target) continue;
      tower.cooldownMs = 1000 / s.fireRate;

      const enemy = this.enemies.find((e) => e.id === target.id);
      if (!enemy) continue;
      tower.faceToward(enemy.renderPos);
      tower.playAttack();
      if (tower.key === 'arrow' || tower.key === 'cannon' || tower.key === 'frost' || tower.key === 'bolt' || tower.key === 'sniper' || tower.key === 'poison') {
        this.audio.play(tower.key);
      } else if (tower.key === 'ballista') {
        this.audio.play('sniper');
      }
      this.muzzleFlash(tower.homePos, def.key === 'ballista' ? COLORS.ballista :
        def.key === 'sniper' ? COLORS.sniper : def.attack === 'poison' ? COLORS.poison :
        def.attack === 'splash' ? COLORS.cannon : def.attack === 'slow' ? COLORS.frost :
          def.attack === 'chain' ? COLORS.bolt : COLORS.arrow);

      if (def.attack === 'chain') {
        this.fireProjectile(tower.homePos, {
          speed: 620,
          textureKey: PROJECTILE_TEXTURE[tower.key],
          targetPos: () => (enemy.alive ? enemy.renderPos : null),
          onHit: () => {
            if (!enemy.alive) return;
            // Determine jumps on impact, using current positions and living targets (레이어 필터 유지).
            const chain = buildChain(enemy, eligibleTargets(this.enemies, layers), s.chainRange ?? 0, s.chainTargets ?? 0);
            const dmgs = chainDamages(s.damage, s.chainFalloff ?? 1, chain.length - 1);
            const stagger = s.staggerDurationMs != null
              ? { durationMs: s.staggerDurationMs, cooldownMs: s.staggerCooldownMs ?? 1800 }
              : undefined;
            chain.forEach((hit, i) => {
              const e = this.enemies.find((x) => x.id === hit.id);
              if (!e) return;
              const airMul = e.layer === 'air' ? (s.airDamageMultiplier ?? 1) : 1;
              this.dealDamage(tower.key, e, { amount: dmgs[i] * airMul, kind: 'chain', ignoreShield: s.shieldPierce });
              if (e.alive) this.knockbackEnemy(e);
              const stunned = stagger ? e.applyStagger(stagger.durationMs, stagger.cooldownMs) : false;
              this.impactFlash(e.renderPos, COLORS.bolt, stunned ? 'stagger' : 'light');
            });
          },
        });
        continue;
      }

      // 화살탑 3·5합 멀티샷: 근처 표적에 여러 발(발당 피해 감소). 그 외는 현재 표적 한 발.
      const multi = (def.key === 'arrow' || def.key === 'ballista') && (s.projectileCount ?? 1) > 1;
      const shots = multi
        ? buildMultiShot(enemy, eligibleTargets(this.enemies, layers), tower.homePos, s.range, s.projectileCount ?? 1)
          .map((tg) => ({ id: tg.id, damage: Math.round(s.damage * (s.projectileDamageMultiplier ?? 1)) }))
        : [{ id: enemy.id, damage: s.damage }];

      for (const shot of shots) {
        this.fireProjectile(tower.homePos, {
          speed: 520,
          textureKey: PROJECTILE_TEXTURE[tower.key],
          targetPos: () => {
            const e = this.enemies.find((x) => x.id === shot.id);
            return e && e.alive ? e.renderPos : null;
          },
          onHit: (hitPos) => {
            // hitPos 는 렌더 평면(공중은 고도 포함). 아래 splash/poison 반경은 지상 좌표(enemy.pos)와
            // 비교하지만 두 타워 모두 지상 전용이라 hitPos ≈ 지상점이라 무해. 공중 광역이 생기면 renderPos 반경으로.
            if (def.attack === 'poison') {
              this.impactFlash(hitPos, COLORS.poison, 'light');
              const pierce = s.poisonArmorPierce ?? 0;
              for (const hit of enemiesInRadius(hitPos, s.poisonRadius ?? 0, this.enemies, layers)) {
                const affected = this.enemies.find((e) => e.id === hit.id);
                if (affected) this.dealDamage(tower.key, affected, { amount: s.damage, armorPierce: pierce || undefined, kind: 'poison' });
                affected?.applyPoison(tower.key, s.poisonDps ?? 0, s.poisonDurationMs ?? 0);
                if (affected && s.poisonSpreadRadius) {
                  for (const near of enemiesInRadius(affected.pos, s.poisonSpreadRadius, this.enemies, layers)) {
                    const ne = this.enemies.find((e) => e.id === near.id);
                    ne?.applyPoison(tower.key, (s.poisonDps ?? 0) * (s.poisonSpreadRatio ?? 0.5), s.poisonDurationMs ?? 0);
                  }
                }
              }
            } else if (def.attack === 'splash') {
              this.impactFlash(hitPos, COLORS.cannon, 'heavy');
              for (const hit of enemiesInRadius(hitPos, s.splashRadius ?? 0, this.enemies, layers)) {
                const affected = this.enemies.find((e) => e.id === hit.id);
                const airMul = affected && affected.layer === 'air' ? (s.airDamageMultiplier ?? 1) : 1;
                if (affected) this.dealDamage(tower.key, affected, { amount: s.damage * airMul, kind: 'splash' });
                affected?.applyArmorBreak(s.armorBreakPercent ?? 0, s.armorBreakDurationMs ?? 0);
              }
              this.startHitstop();
              if (s.burnDps) {
                for (const hit of enemiesInRadius(hitPos, s.burnRadius ?? s.splashRadius ?? 0, this.enemies, layers)) {
                  const be = this.enemies.find((e) => e.id === hit.id);
                  be?.applyPoison(tower.key, s.burnDps, s.burnDurationMs ?? 1400);
                  if (be) this.impactFlash(be.renderPos, COLORS.cannon, 'light');
                }
              }
            } else {
              const e = this.enemies.find((x) => x.id === shot.id);
              if (!e || !e.alive) return;
              const airMul = e.layer === 'air' ? (s.airDamageMultiplier ?? 1) : 1;
              if (s.pierceAll) {
                for (const hit of pierceLineTargets(tower.homePos, e.pos, eligible, TILE * 0.9, s.range)) {
                  const pe = this.enemies.find((x) => x.id === hit.id);
                  if (!pe) continue;
                  const am = pe.layer === 'air' ? (s.airDamageMultiplier ?? 1) : 1;
                  this.dealDamage(tower.key, pe, { amount: shot.damage * am, armorPierce: s.armorPierce ?? 0, kind: 'single' });
                  this.impactFlash(pe.renderPos, COLORS.sniper, 'light');
                }
                this.startHitstop();
                return;
              }
              if (def.key === 'sniper') {
                this.dealDamage(tower.key, e, {
                  amount: shot.damage * executeMultiplier(s, e.healthRatio) * airMul,
                  armorPierce: s.armorPierce ?? 0,
                  kind: 'single',
                });
              } else {
                this.dealDamage(tower.key, e, { amount: shot.damage * airMul, armorPierce: s.armorPierce ?? 0, kind: def.attack });
              }
              if (def.key === 'arrow' && e.alive) this.knockbackEnemy(e);
              if (def.key === 'sniper') this.startHitstop();
              this.impactFlash(e.renderPos,
                def.key === 'ballista' ? COLORS.ballista
                : def.attack === 'slow' ? COLORS.frost
                : def.key === 'sniper' ? COLORS.sniper : COLORS.arrow,
                def.key === 'ballista' ? 'light'
                : def.attack === 'slow' ? 'frost'
                : def.key === 'sniper' ? 'heavy' : 'light');
              if (def.attack === 'slow') {
                e.applySlow(s.slowMul ?? 1, s.slowDurationMs ?? 0);
                const freeze = s.freezeHits != null
                  ? { hits: s.freezeHits, durationMs: s.freezeDurationMs ?? 0, cooldownMs: s.freezeCooldownMs ?? 4000 }
                  : undefined;
                if (freeze && e.applyFreezeHit(freeze.hits, freeze.durationMs, freeze.cooldownMs)) {
                  this.impactFlash(e.renderPos, COLORS.frost, 'heavy');
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
    const rp = enemy.renderPos;
    this.tweens.add({
      targets: enemy.sprite,
      x: rp.x - (motion.x / length) * 4,
      y: rp.y - (motion.y / length) * 4,
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
    const rp = enemy.renderPos;
    for (const [dx, dy] of offsets) {
      const particle = this.add.circle(rp.x, rp.y, 3, color, 0.92).setDepth(25);
      this.tweens.add({
        targets: particle,
        x: rp.x + dx * 18,
        y: rp.y + dy * 18,
        scale: 0.35,
        alpha: 0,
        duration: 180,
        ease: 'Quad.out',
        onComplete: () => particle.destroy(),
      });
    }
  }

  /** 공격마다 다른 짧은 명중 효과. 화면 흔들림은 쓰지 않는다(멀미 유발). */
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
    // 골드가 들어오는 즉시 열린 시트(건설/정보)의 구매 가능 표시를 갱신한다.
    if (this.sheet.mode === 'build') this.sheet.refreshBuild();
    else if (this.sheet.mode === 'inspect' && this.selectedTower && this.towers.includes(this.selectedTower))
      this.sheet.refreshInspect(this.inspectView(this.selectedTower));
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
      // 독 지속딜은 EnemyState.update 안에서 체력을 깎으므로 dealDamage를 안 거친다 — 여기서 집계에 반영.
      for (const { source, amount } of e.collectPoisonDamage()) this.creditDamage(source, amount);
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
        this.floatingGold(e.renderPos, e.def.bounty);
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
