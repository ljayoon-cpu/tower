import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import { getTower } from '../data/towers';
import { audioFor } from './audio';
import { attachPressFeedback } from './interactionFeedback';

const CARD_W = 200;
const CARD_H = 150;
const GAP = 14;

export class PathChoiceMenu {
  private container: Phaser.GameObjects.Container;
  private visible = false;
  constructor(private scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0).setDepth(510).setVisible(false);
  }
  open(towerKey: string, at: { x: number; y: number }, onPick: (p: 'a' | 'b') => void): void {
    this.container.removeAll(true);
    const def = getTower(towerKey);
    if (!def.paths) { onPick('a'); return; }
    const audio = audioFor(this.scene);
    const w = CARD_W * 2 + GAP + 24;
    const h = CARD_H + 64;
    this.container.add(this.scene.add.rectangle(0, 0, w, h, 0x0b0c16, 0.97).setStrokeStyle(2, 0x66ccff));
    this.container.add(this.scene.add.text(0, -h / 2 + 18, `${def.name} — 경로 선택`, {
      fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold', color: '#f2f2f7',
    }).setOrigin(0.5));
    (['a', 'b'] as const).forEach((p, i) => {
      const cx = (i === 0 ? -1 : 1) * (CARD_W + GAP) / 2;
      const path = def.paths![p];
      const card = this.scene.add.rectangle(cx, 12, CARD_W, CARD_H, 0x1b1d33).setStrokeStyle(2, 0x2f3350)
        .setInteractive({ useHandCursor: true });
      const name = this.scene.add.text(cx, 12 - CARD_H / 2 + 18, path.name, {
        fontFamily: 'monospace', fontSize: '19px', fontStyle: 'bold', color: '#ffcc44',
      }).setOrigin(0.5);
      const l5 = path.levels[2];
      const desc = this.scene.add.text(cx, 12, `${path.desc}\n\nLv5  DPS ${Math.round((l5.damage) * (l5.fireRate) * ((l5.projectileCount ?? 1) * (l5.projectileDamageMultiplier ?? 1)))}\n사거리 ${l5.range}`, {
        fontFamily: 'monospace', fontSize: '13px', color: '#cdd6f4', align: 'center',
        wordWrap: { width: CARD_W - 20 },
      }).setOrigin(0.5);
      attachPressFeedback(this.scene, card, [card, name], audio, () => { this.close(); onPick(p); });
      this.container.add([card, name, desc]);
    });
    const px = Phaser.Math.Clamp(at.x, w / 2 + 8, GAME_WIDTH - w / 2 - 8);
    const py = Phaser.Math.Clamp(at.y, h / 2 + 150, GAME_HEIGHT - h / 2 - 10);
    this.container.setPosition(px, py).setVisible(true);
    this.visible = true;
  }
  close(): void { this.container.setVisible(false); this.visible = false; }
  get isOpen(): boolean { return this.visible; }
  destroy(): void { this.container.destroy(); }
}
