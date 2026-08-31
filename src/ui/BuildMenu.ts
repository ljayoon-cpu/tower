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

const ROW_H = 56;
const MENU_W = 220;

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

    const h = ROW_H * TOWER_KEYS.length + 12;
    const bg = this.scene.add
      .rectangle(0, 0, MENU_W, h, 0x11121f, 0.95)
      .setStrokeStyle(2, 0x66ccff);
    this.container.add(bg);

    TOWER_KEYS.forEach((key, i) => {
      const def = getTower(key);
      const yy = -((TOWER_KEYS.length - 1) / 2) * ROW_H + i * ROW_H;
      const banned = this.opts.isBanned(key);

      const icon = this.scene.add.image(-80, yy, `tower_${key}`).setScale(0.7);
      const label = this.scene.add.text(-52, yy - 14, banned ? `${def.name}\n이번 판 봉인` : `${def.name}\n${def.cost}G`, {
        fontFamily: 'monospace', fontSize: '18px', color: '#f2f2f7',
      });
      const lock = banned
        ? this.scene.add.text(82, yy, '봉인', { fontFamily: 'monospace', fontSize: '16px', color: '#ff7799' }).setOrigin(0.5)
        : undefined;
      const hit = this.scene.add.rectangle(0, yy, MENU_W - 10, ROW_H - 4, 0xffffff, 0.001);
      attachPressFeedback(this.scene, hit, [icon, label], audioFor(this.scene), () => {
        if (!this.rows.find((r) => r.key === key)?.selectable) return;
        this.opts.onPick(key);
        this.close();
      });

      this.container.add(lock ? [icon, label, lock, hit] : [icon, label, hit]);
      this.rows.push({ key, banned, selectable: false, icon, label, hit });
    });

    const cx = Phaser.Math.Clamp(x, MENU_W / 2 + 10, GAME_WIDTH - MENU_W / 2 - 10);
    const cy = Phaser.Math.Clamp(y, h / 2 + 168, GAME_HEIGHT - h / 2 - 10);
    this.container.setPosition(cx, cy).setVisible(true);
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
