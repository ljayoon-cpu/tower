import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import type { SoundEffects } from '../core/audio';
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

// 2열 격자 — BuildMenu 에서 그대로 옮겨온 수치. 세로로 긴 폰에서도 10칸이 한눈에.
const ROW_H = 62;
const COL_W = 186;
const COLS = 2;
const SLIDE_MS = 90;

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

  /** 코치 바 높이만큼 바닥을 올린다 (0 또는 56). 열려 있으면 즉시 y 를 갱신. */
  setBottomInset(px: number): void {
    this.bottomInset = px;
    if (this._mode !== null) this.slideIn();
  }

  showBuild(): void {
    this.buildBuild();
    this._mode = 'build';
    this.slideIn();
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

  hide(): void {
    // isOpen / mode 는 tween 여부와 무관하게 즉시 반영. done 콜백엔 시각 정리만.
    this._mode = null;
    const done = (): void => {
      this.container.setVisible(false);
      this.container.removeAll(true);
      this.rows = [];
      this._mode = null;
    };
    if (this.scene.tweens) {
      this.scene.tweens.add({
        targets: this.container,
        y: GAME_HEIGHT + 40,
        duration: SLIDE_MS,
        onComplete: done,
      });
    } else {
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
    this.container.destroy();
  }

  /** 타워 격자를 컨테이너에 구성한다. BuildMenu.openAt 의 행 생성 로직을 옮긴 것. */
  private buildBuild(): void {
    this.container.removeAll(true);
    this.rows = [];

    const perCol = Math.ceil(TOWER_KEYS.length / COLS);
    const w = COL_W * COLS;
    const h = ROW_H * perCol + 16;

    // 원점 하단 기준: 컨테이너를 화면 바닥에 두고 자식을 음수 y 로 쌓는다.
    const bg = this.scene.add
      .rectangle(0, -h / 2, w, h, 0x11121f, 0.96)
      .setStrokeStyle(2, 0x66ccff);
    this.container.add(bg);

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

  private slideIn(): void {
    this.container.setVisible(true);
    const targetY = GAME_HEIGHT - this.bottomInset;
    if (this.scene.tweens) {
      this.container.y = GAME_HEIGHT + 40;
      this.scene.tweens.add({
        targets: this.container,
        y: targetY,
        duration: SLIDE_MS,
        ease: 'Quad.out',
      });
    } else {
      this.container.y = targetY;
    }
  }
}
