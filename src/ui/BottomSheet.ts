import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import type { SoundEffects } from '../core/audio';
import type { TowerDef } from '../core/types';
import { TOWER_KEYS, getTower } from '../data/towers';
import { audioFor } from './audio';
import { attachPressFeedback } from './interactionFeedback';

export type SheetMode = 'build' | 'inspect' | 'path';

export interface BottomSheetOpts {
  onBuildPick: (key: string) => void;
  canAfford: (key: string) => boolean;
  isBanned: (key: string) => boolean;
  isAtLimit: (key: string) => boolean;
  limitLabel: (key: string) => string;
  onUpgrade: () => void; // Task 2 에서 사용
  onSell: () => void; // Task 2
  onPathPick: (p: 'a' | 'b') => void; // Task 3
  onDismiss: () => void;
}

/** 타워를 탭했을 때 뜨는 정보 시트의 내용. 렌더는 BottomSheet, 값 계산은 호출부(Task 4). */
export interface InspectView {
  title: string; // "화살탑 · 관통형 Lv3"
  lines: string[]; // [dpsLine, statLine, ...noteLine 분할]
  upgrade: { label: string; afford: boolean } | null; // null = 만렙
  sell: { label: string };
}

// 2열 격자 — 설치 메뉴에서 쓰던 수치. 세로로 긴 폰에서도 10칸이 한눈에.
const ROW_H = 62;
const COL_W = 186;
const COLS = 2;
const SLIDE_MS = 90;

// 경로 선택 카드 — 경로 선택 화면 수치.
const CARD_W = 200;
const CARD_H = 150;
const GAP = 14;

interface Row {
  key: string;
  /** 봉인(이번 판) 또는 설치 상한 도달 — 어느 쪽이든 구매 불가. */
  blocked: boolean;
  selectable: boolean;
  icon: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  hit: Phaser.GameObjects.Rectangle;
}

/**
 * 화면 바닥에 붙어 위로 미끄러져 올라오는 시트. 컨테이너는 바닥(`y ≈ GAME_HEIGHT`)에 두고
 * 자식은 음수 y 로 위로 쌓는다. Task 1 은 스켈레톤 + `build` 모드(타워 격자)만.
 */
export class BottomSheet {
  private container: Phaser.GameObjects.Container;
  private _mode: SheetMode | null = null;
  private bottomInset = 0;
  private currentHeight = 0;
  private rows: Row[] = [];
  /** 진행 중인 슬라이드 tween. 새 슬라이드가 시작되면 이전 것을 취소해, 닫힘 tween 의
   *  onComplete 가 그 사이에 다시 열린 시트를 지워버리는 레이스를 막는다. */
  private slideTween?: Phaser.Tweens.Tween;

  /** inspect 모드의 가변 GameObject 참조 — refreshInspect 가 removeAll 없이 제자리 갱신한다.
   *  hit 사각형 + attachPressFeedback 은 buildInspect 에서만 생성되므로(모양이 바뀔 때만),
   *  pointerdown 으로 래치된 press 상태가 탭 도중에 파괴되지 않는다. */
  private inspectTitle?: Phaser.GameObjects.Text;
  private inspectLineTexts: Phaser.GameObjects.Text[] = [];
  private inspectUpBg?: Phaser.GameObjects.Rectangle;
  private inspectUpLabel?: Phaser.GameObjects.Text;
  private inspectSellLabel?: Phaser.GameObjects.Text;
  /** 마지막으로 구성된 inspect 레이아웃의 "모양". 이게 바뀌면(레벨업으로 노트 수 변화 / 만렙 도달)
   *  전체 재구성, 같으면 텍스트/스타일만 제자리 갱신. */
  private inspectShape?: { lines: number; hasUpgrade: boolean };

  // audioFor() 는 scene.sound / scene.cache 를 만진다. 실제 press 시점까지 미뤄서
  // 오디오 매니저 없는 헤드리스 씬(단위 테스트)에서도 시트를 구성할 수 있게 한다.
  private readonly audio: Pick<SoundEffects, 'play'> = {
    play: (key) => audioFor(this.scene).play(key),
  };

  constructor(private scene: Phaser.Scene, private opts: BottomSheetOpts) {
    this.container = scene.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT)
      .setDepth(500)
      .setVisible(false);
  }

  /** 코치 바 높이만큼 바닥을 올린다 (0 또는 60). 열려 있으면 즉시 y 를 갱신. */
  setBottomInset(px: number): void {
    this.bottomInset = px;
    if (this._mode !== null) this.slideIn();
  }

  showBuild(): void {
    if (this._mode === 'path') return; // 경로 선택은 모달 — 해결/취소 전까지 무시.
    this.buildBuild();
    this._mode = 'build';
    this.slideIn();
    this.refreshBuild(); // 외부 refreshBuild 없이도 행이 즉시 상호작용 가능하도록.
  }

  /** 열려 있는 동안 매 프레임 호출 — 골드 상황에 맞춰 각 줄의 구매 가능 여부를 갱신한다. */
  refreshBuild(): void {
    if (this._mode !== 'build') return;
    for (const row of this.rows) {
      const afford = this.opts.canAfford(row.key);
      const selectable = afford && !row.blocked;
      row.icon.setAlpha(selectable ? 1 : row.blocked ? 0.2 : 0.35);
      if (!row.blocked) row.label.setColor(afford ? '#f2f2f7' : '#777777');
      if (selectable === row.selectable) continue; // 상호작용 토글만 변화 시에.
      row.selectable = selectable;
      if (selectable) row.hit.setInteractive({ useHandCursor: true });
      else row.hit.disableInteractive();
    }
  }

  /** 타워 탭 → 정보/강화/판매 시트. path 모드에서의 전환 가드는 Task 3 담당. */
  showInspect(view: InspectView): void {
    if (this._mode === 'path') return; // 경로 선택 중에는 무시 (refreshInspect 도 _mode 가드됨).
    this.buildInspect(view);
    this._mode = 'inspect';
    this.slideIn();
  }

  /**
   * 분기 타워를 머지/강화로 Lv3 에 올릴 때 경로 A/B 선택 시트.
   * 분기 없는 타워면 열지 않고 즉시 'a' 로 자동 확정.
   */
  showPath(towerKey: string): void {
    if (this._mode === 'path') return; // 경로 선택은 모달 — 해결/취소 전까지 무시.
    const def = getTower(towerKey);
    if (!def.paths) {
      this.opts.onPathPick('a');
      return;
    }
    this.buildPath(def);
    this._mode = 'path';
    this.slideIn();
  }

  /** 열려 있는 동안 매 프레임 호출 — 변하는 값(DPS·강화비 등)을 제자리 갱신한다.
   *  모양(줄 수 / 강화 버튼 유무)이 바뀔 때만 buildInspect 로 전체 재구성. */
  refreshInspect(view: InspectView): void {
    if (this._mode !== 'inspect') return;
    const shape = { lines: view.lines.length, hasUpgrade: view.upgrade != null };
    if (
      !this.inspectShape ||
      this.inspectShape.lines !== shape.lines ||
      this.inspectShape.hasUpgrade !== shape.hasUpgrade
    ) {
      this.buildInspect(view); // 모양 변경 → 전체 재구성 (드묾: 노트 수 변화 / 만렙 도달)
      return;
    }
    // 같은 모양 → removeAll 없이, 새 hit 사각형 없이 텍스트/스타일만 갱신.
    this.inspectTitle?.setText(view.title);
    view.lines.forEach((ln, i) => this.inspectLineTexts[i]?.setText(ln));
    if (view.upgrade) {
      this.inspectUpLabel?.setText(view.upgrade.label);
      this.inspectUpBg?.setFillStyle(view.upgrade.afford ? 0x2a5d3a : 0x4a3030);
      this.inspectUpLabel?.setColor(view.upgrade.afford ? '#f2f2f7' : '#a88');
    }
    this.inspectSellLabel?.setText(view.sell.label);
  }

  hide(): void {
    // isOpen / mode 는 tween 여부와 무관하게 즉시 반영. done 콜백엔 시각 정리만.
    const done = (): void => {
      if (this._mode !== null) return;
      this.container.setVisible(false);
      this.container.removeAll(true);
      this.rows = [];
      this.slideTween = undefined;
    };
    // 이미 닫혀 있거나 슬라이드아웃 중인데 다시 hide() 가 불렸다면(예: removeTower 직후 endStage),
    // 새 tween 을 걸지 않고 시각 상태만 동기적으로 강제한다. 두 번째 tween 이 또 제거되면
    // 컨테이너가 슬라이드 중간에 보이는 채로 남는 것을 막는다.
    if (this._mode === null) {
      this.slideTween?.remove();
      this.slideTween = undefined;
      this.container.setVisible(false);
      this.container.removeAll(true);
      this.rows = [];
      return;
    }
    this._mode = null;
    // done 은 슬라이드아웃이 끝날 때 실행되지만, 그 사이 show* 가 _mode 를 다시 세팅했다면
    // 이 정리는 낡은 것이므로 아무 것도 하지 않는다(레이스 가드).
    this.slideTween?.remove();
    if (this.scene.tweens) {
      this.slideTween = this.scene.tweens.add({
        targets: this.container,
        y: GAME_HEIGHT + 40,
        duration: SLIDE_MS,
        onComplete: done,
      });
    } else {
      this.slideTween = undefined;
      done();
    }
  }

  get mode(): SheetMode | null {
    return this._mode;
  }

  get isOpen(): boolean {
    return this._mode !== null;
  }

  /** 마지막으로 구성된 시트 본문 높이(px). inspect/path 레이아웃(Task 2·3)에서 쓴다. */
  get contentHeight(): number {
    return this.currentHeight;
  }

  destroy(): void {
    this.slideTween?.remove();
    this.container.destroy();
  }

  /** 타워 격자를 컨테이너에 구성한다. 설치 메뉴의 행 생성 로직을 기반으로 함. */
  private buildBuild(): void {
    this.container.removeAll(true);
    this.rows = [];

    const perCol = Math.ceil(TOWER_KEYS.length / COLS);
    const w = COL_W * COLS;
    const h = ROW_H * perCol + 16;

    // 원점 하단 기준: 컨테이너를 화면 바닥에 두고 자식을 음수 y 로 쌓는다.
    this.container.add(this.panelBg(w, h));

    TOWER_KEYS.forEach((key, i) => {
      const def = getTower(key);
      const col = Math.floor(i / perCol);
      const rowInCol = i % perCol;
      const cx = -w / 2 + COL_W / 2 + col * COL_W;
      const yy = -h + 16 + ROW_H / 2 + rowInCol * ROW_H;

      const banned = this.opts.isBanned(key);
      const atLimit = !banned && this.opts.isAtLimit(key);
      const blocked = banned || atLimit;
      const subLabel = banned
        ? '이번 판 봉인'
        : atLimit
          ? this.opts.limitLabel(key)
          : `${def.cost}G`;
      const lockText = banned ? '봉인' : atLimit ? '가득' : '';

      const icon = this.scene.add
        .image(cx - COL_W / 2 + 26, yy, `tower_${key}`)
        .setScale(0.62);
      const label = this.scene.add.text(
        cx - COL_W / 2 + 50,
        yy - 15,
        `${def.name}\n${subLabel}`,
        { fontFamily: 'monospace', fontSize: '17px', color: '#f2f2f7' },
      );
      const lock = lockText
        ? this.scene.add
            .text(cx + COL_W / 2 - 16, yy, lockText, {
              fontFamily: 'monospace',
              fontSize: '15px',
              color: '#ff7799',
            })
            .setOrigin(1, 0.5)
        : undefined;
      const hit = this.scene.add.rectangle(cx, yy, COL_W - 8, ROW_H - 6, 0xffffff, 0.001);
      attachPressFeedback(this.scene, hit, [icon, label], this.audio, () => {
        if (!this.rows.find((r) => r.key === key)?.selectable) return;
        this.opts.onBuildPick(key);
        this.hide();
      });

      this.container.add(lock ? [icon, label, lock, hit] : [icon, label, hit]);
      this.rows.push({ key, blocked, selectable: false, icon, label, hit });
    });

    this.currentHeight = h;
  }

  /** 정보 시트 본문을 컨테이너에 구성한다. 모양이 바뀔 때만 호출 — 그 외엔 refreshInspect 가 제자리 갱신. */
  private buildInspect(view: InspectView): void {
    this.container.removeAll(true);
    this.rows = [];
    this.inspectLineTexts = [];
    this.inspectUpBg = undefined;
    this.inspectUpLabel = undefined;

    const w = GAME_WIDTH - 24;
    const h = 60 + view.lines.length * 34 + 64;

    this.container.add(this.panelBg(w, h));

    const title = this.scene.add.text(-w / 2 + 20, -h + 20, view.title, {
      fontFamily: 'monospace',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    this.container.add(title);
    this.inspectTitle = title;

    view.lines.forEach((ln, i) => {
      const line = this.scene.add.text(-w / 2 + 20, -h + 54 + i * 34, ln, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#cdd6f4',
      });
      this.container.add(line);
      this.inspectLineTexts.push(line);
    });

    const btnW = view.upgrade ? w / 2 - 24 : w - 32;
    const btnH = 44;
    const btnY = -40;

    if (view.upgrade) {
      const upX = -w / 4;
      const upBtn = this.scene.add
        .rectangle(upX, btnY, btnW, btnH, this.hexColor(view.upgrade.afford ? '#2a5d3a' : '#4a3030'))
        .setStrokeStyle(1, 0x66ccff);
      const upLabel = this.scene.add
        .text(upX, btnY, view.upgrade.label, {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: view.upgrade.afford ? '#f2f2f7' : '#a88',
        })
        .setOrigin(0.5);
      const upHit = this.scene.add
        .rectangle(upX, btnY, btnW, btnH, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true });
      attachPressFeedback(this.scene, upHit, [upBtn, upLabel], this.audio, () =>
        this.opts.onUpgrade(),
      );
      this.container.add([upBtn, upLabel, upHit]);
      this.inspectUpBg = upBtn;
      this.inspectUpLabel = upLabel;
    }

    const sellX = view.upgrade ? w / 4 : 0;
    const sellBtn = this.scene.add
      .rectangle(sellX, btnY, btnW, btnH, this.hexColor('#3a3350'))
      .setStrokeStyle(1, 0x66ccff);
    const sellLabel = this.scene.add
      .text(sellX, btnY, view.sell.label, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#f2f2f7',
      })
      .setOrigin(0.5);
    const sellHit = this.scene.add
      .rectangle(sellX, btnY, btnW, btnH, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    attachPressFeedback(this.scene, sellHit, [sellBtn, sellLabel], this.audio, () =>
      this.opts.onSell(),
    );
    this.container.add([sellBtn, sellLabel, sellHit]);
    this.inspectSellLabel = sellLabel;

    this.inspectShape = { lines: view.lines.length, hasUpgrade: view.upgrade != null };
    this.currentHeight = h;
  }

  /** 시트 패널 배경 — 하단 원점 기준 (`y = -h/2`), 세 모드 공통. */
  private panelBg(w: number, h: number): Phaser.GameObjects.Rectangle {
    return this.scene.add
      .rectangle(0, -h / 2, w, h, 0x11121f, 0.96)
      .setStrokeStyle(2, 0x66ccff);
  }

  /** 경로 A/B 선택 시트를 컨테이너에 구성한다. 백드롭 → 패널 → 카드 순으로 쌓는다. */
  private buildPath(def: TowerDef): void {
    this.container.removeAll(true);
    this.rows = [];
    const paths = def.paths;
    if (!paths) return; // 호출부(showPath)에서 이미 가드됨.

    // 백드롭 먼저 — 컨테이너 자식이라 카드 아래에 깔린다. 컨테이너가 화면 바닥에 있고
    // 높이 GAME_HEIGHT*2 라 container.y 와 무관하게 화면 전체를 덮어 보드 입력을 막는다.
    const backdrop = this.scene.add
      .rectangle(0, -GAME_HEIGHT, GAME_WIDTH, GAME_HEIGHT * 2, 0x000000, 0.55)
      .setInteractive();
    backdrop.on('pointerup', () => {
      this.hide();
      this.opts.onDismiss();
    });
    this.container.add(backdrop);

    const w = CARD_W * 2 + GAP + 24;
    const h = CARD_H + 64;
    this.container.add(this.panelBg(w, h));

    const title = this.scene.add
      .text(0, -h + 18, `${def.name} — 경로 선택`, {
        fontFamily: 'monospace',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.container.add(title);

    (['a', 'b'] as const).forEach((p) => {
      const path = paths[p];
      const cx = (p === 'a' ? -1 : 1) * (CARD_W + GAP) / 2;
      const cy = -h / 2 + 12;
      const l5 = path.levels[2];
      const dps = Math.round(
        l5.damage * l5.fireRate * ((l5.projectileCount ?? 1) * (l5.projectileDamageMultiplier ?? 1)),
      );

      const card = this.scene.add
        .rectangle(cx, cy, CARD_W, CARD_H, 0x1b1d33)
        .setStrokeStyle(2, 0x2f3350);
      const name = this.scene.add
        .text(cx, cy - CARD_H / 2 + 18, path.name, {
          fontFamily: 'monospace',
          fontSize: '17px',
          fontStyle: 'bold',
          color: '#ffcc44',
        })
        .setOrigin(0.5);
      const desc = this.scene.add
        .text(cx, cy + 10, `${path.desc}\n\nLv5  DPS ${dps}\n사거리 ${l5.range}`, {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#cdd6f4',
          align: 'center',
          wordWrap: { width: CARD_W - 20 },
        })
        .setOrigin(0.5);
      this.container.add([card, name, desc]);

      const emblemKey = `path_${def.key}_${p}`;
      if (this.scene.textures?.exists?.(emblemKey)) {
        const emblem = this.scene.add
          .image(cx, cy - CARD_H / 2 + 46, emblemKey)
          .setScale(0.5);
        this.container.add(emblem);
      }

      const cardHit = this.scene.add
        .rectangle(cx, cy, CARD_W, CARD_H, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true });
      attachPressFeedback(this.scene, cardHit, [card, name], this.audio, () => {
        this.hide();
        this.opts.onPathPick(p);
      });
      this.container.add(cardHit);
    });

    this.currentHeight = h;
  }

  private hexColor(css: string): number {
    return parseInt(css.replace('#', ''), 16);
  }

  private slideIn(): void {
    this.container.setVisible(true);
    const targetY = GAME_HEIGHT - this.bottomInset;
    // 대기 중인 닫힘(또는 이전 열림) tween 을 먼저 취소 — 그 onComplete 가 이 시트를 지우지 못하게.
    this.slideTween?.remove();
    if (this.scene.tweens) {
      this.container.y = GAME_HEIGHT + 40;
      this.slideTween = this.scene.tweens.add({
        targets: this.container,
        y: targetY,
        duration: SLIDE_MS,
        ease: 'Quad.out',
        onComplete: () => { this.slideTween = undefined; },
      });
    } else {
      this.slideTween = undefined;
      this.container.y = targetY;
    }
  }
}
