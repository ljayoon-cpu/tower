import Phaser from 'phaser';
import { GAME_WIDTH } from '../core/constants';
import type { EventBus } from '../core/eventBus';
import type { GameEvents } from '../core/types';

export interface HudInit {
  bus: EventBus<GameEvents>;
  gold: number;
  lives: number;
  totalWaves: number;
  onNextWave: () => void;
}

export class HUD extends Phaser.Scene {
  private goldText!: Phaser.GameObjects.Text;
  private lifeText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;

  constructor() { super('hud'); }

  create(data: HudInit) {
    const style = { fontFamily: 'monospace', fontSize: '28px', color: '#f2f2f7' };
    this.goldText = this.add.text(16, 12, '', style);
    this.lifeText = this.add.text(16, 46, '', style);
    this.waveText = this.add.text(GAME_WIDTH - 16, 12, '', style).setOrigin(1, 0);

    const btn = this.add.text(GAME_WIDTH - 16, 46, '▶ 다음 웨이브', {
      ...style, color: '#ffcc44',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    btn.on('pointerup', () => data.onNextWave());

    const render = () => {
      this.goldText.setText(`골드 ${data.gold}`);
      this.lifeText.setText(`라이프 ${data.lives}`);
    };
    data.bus.on('gold:changed', (p) => { data.gold = p.gold; render(); });
    data.bus.on('life:changed', (p) => { data.lives = p.lives; render(); });
    data.bus.on('wave:started', (p) => this.waveText.setText(`웨이브 ${p.index + 1}/${p.total}`));
    render();
    this.waveText.setText(`웨이브 -/${data.totalWaves}`);
  }
}
