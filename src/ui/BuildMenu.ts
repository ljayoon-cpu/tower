import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import { TOWER_KEYS, getTower } from '../data/towers';

export interface BuildMenuOpts {
  onPick: (key: string) => void;
  canAfford: (key: string) => boolean;
}

const ROW_H = 64;
const MENU_W = 220;

/** Game 씬 내부에 떠 있는 타워 선택 오버레이(별도 씬 아님). */
export class BuildMenu {
  private container: Phaser.GameObjects.Container;
  private visible = false;

  constructor(private scene: Phaser.Scene, private opts: BuildMenuOpts) {
    this.container = scene.add.container(0, 0).setDepth(500).setVisible(false);
  }

  openAt(x: number, y: number): void {
    this.container.removeAll(true);

    const h = ROW_H * TOWER_KEYS.length + 12;
    const bg = this.scene.add
      .rectangle(0, 0, MENU_W, h, 0x11121f, 0.95)
      .setStrokeStyle(2, 0x66ccff);
    this.container.add(bg);

    TOWER_KEYS.forEach((key, i) => {
      const def = getTower(key);
      const yy = -((TOWER_KEYS.length - 1) / 2) * ROW_H + i * ROW_H;
      const afford = this.opts.canAfford(key);

      const icon = this.scene.add
        .image(-80, yy, `tower_${key}`)
        .setScale(0.7)
        .setAlpha(afford ? 1 : 0.35);
      const label = this.scene.add.text(-52, yy - 14, `${def.name}\n${def.cost}G`, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: afford ? '#f2f2f7' : '#777777',
      });
      const hit = this.scene.add
        .rectangle(0, yy, MENU_W - 10, ROW_H - 4, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true });
      if (afford) {
        hit.on('pointerup', () => {
          this.opts.onPick(key);
          this.close();
        });
      }
      this.container.add([icon, label, hit]);
    });

    const cx = Phaser.Math.Clamp(x, MENU_W / 2 + 10, GAME_WIDTH - MENU_W / 2 - 10);
    const cy = Phaser.Math.Clamp(y, h / 2 + 10, GAME_HEIGHT - h / 2 - 10);
    this.container.setPosition(cx, cy).setVisible(true);
    this.visible = true;
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
