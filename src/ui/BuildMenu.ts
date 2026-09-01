import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import { TOWER_KEYS, getTower } from '../data/towers';
import { audioFor } from './audio';
import { attachPressFeedback } from './interactionFeedback';

export interface BuildMenuOpts {
  onPick: (key: string) => void;
  canAfford: (key: string) => boolean;
  isBanned: (key: string) => boolean;
}

// 2열 격자 — 세로로 긴 폰에서도 10칸이 한눈에 들어오게. 열당 최대 5칸.
const ROW_H = 62;
const COL_W = 186;
const COLS = 2;

interface Row {
  key: string;
  banned: boolean;
  selectable: boolean;
  icon: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  hit: Phaser.GameObjects.Rectangle;
}

/** Game 씬 내부에 떠 있는 타워 선택 오버레이(별도 씬 아님). */
export class BuildMenu {
  private container: Phaser.GameObjects.Container;
  private visible = false;
  private rows: Row[] = [];

  constructor(private scene: Phaser.Scene, private opts: BuildMenuOpts) {
    this.container = scene.add.container(0, 0).setDepth(500).setVisible(false);
  }

  openAt(x: number, y: number): void {
    this.container.removeAll(true);
    this.rows = [];

    const perCol = Math.ceil(TOWER_KEYS.length / COLS);
    const w = COL_W * COLS;
    const h = ROW_H * perCol + 16;
    const bg = this.scene.add
      .rectangle(0, 0, w, h, 0x11121f, 0.96)
      .setStrokeStyle(2, 0x66ccff);
    this.container.add(bg);

    TOWER_KEYS.forEach((key, i) => {
      const def = getTower(key);
      const col = Math.floor(i / perCol);
      const rowInCol = i % perCol;
      const cx = -w / 2 + COL_W / 2 + col * COL_W;
      const yy = -((perCol - 1) / 2) * ROW_H + rowInCol * ROW_H;
      const banned = this.opts.isBanned(key);

      const icon = this.scene.add.image(cx - COL_W / 2 + 26, yy, `tower_${key}`).setScale(0.62);
      const label = this.scene.add.text(cx - COL_W / 2 + 50, yy - 15, banned ? `${def.name}\n이번 판 봉인` : `${def.name}\n${def.cost}G`, {
        fontFamily: 'monospace', fontSize: '17px', color: '#f2f2f7',
      });
      const lock = banned
        ? this.scene.add.text(cx + COL_W / 2 - 16, yy, '봉인', { fontFamily: 'monospace', fontSize: '15px', color: '#ff7799' }).setOrigin(1, 0.5)
        : undefined;
      const hit = this.scene.add.rectangle(cx, yy, COL_W - 8, ROW_H - 6, 0xffffff, 0.001);
      attachPressFeedback(this.scene, hit, [icon, label], audioFor(this.scene), () => {
        if (!this.rows.find((r) => r.key === key)?.selectable) return;
        this.opts.onPick(key);
        this.close();
      });

      this.container.add(lock ? [icon, label, lock, hit] : [icon, label, hit]);
      this.rows.push({ key, banned, selectable: false, icon, label, hit });
    });

    const px = Phaser.Math.Clamp(x, w / 2 + 8, GAME_WIDTH - w / 2 - 8);
    const py = Phaser.Math.Clamp(y, h / 2 + 150, GAME_HEIGHT - h / 2 - 10);
    this.container.setPosition(px, py).setVisible(true);
    this.visible = true;
    this.refresh();
  }

  /** 열려 있는 동안 매 프레임 호출 — 골드 상황에 맞춰 각 줄의 구매 가능 여부를 갱신한다. */
  refresh(): void {
    if (!this.visible) return;
    for (const row of this.rows) {
      const afford = this.opts.canAfford(row.key);
      const selectable = afford && !row.banned;
      row.icon.setAlpha(selectable ? 1 : row.banned ? 0.2 : 0.35);
      if (!row.banned) row.label.setColor(afford ? '#f2f2f7' : '#777777');
      if (selectable === row.selectable) continue; // 상호작용 토글만 변화 시에.
      row.selectable = selectable;
      if (selectable) row.hit.setInteractive({ useHandCursor: true });
      else row.hit.disableInteractive();
    }
  }

  close(): void {
    this.container.setVisible(false);
    this.visible = false;
  }

  get isOpen(): boolean {
    return this.visible;
  }

  destroy(): void {
    this.container.destroy();
  }
}
