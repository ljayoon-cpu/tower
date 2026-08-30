import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/constants';

export class MainMenu extends Phaser.Scene {
  constructor() { super('mainmenu'); }
  create() {
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.35, '머지 타워디펜스', {
      fontFamily: 'monospace', fontSize: '56px', color: '#f2f2f7',
    }).setOrigin(0.5);

    const start = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.6, '▶ 시작', {
      fontFamily: 'monospace', fontSize: '40px', color: '#ffcc44',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    start.on('pointerup', () => this.scene.start('stageselect'));
    // stageselect 씬은 Task 13에서 추가. 그 전까지는 'game' 으로 바꿔 임시 테스트.
  }
}
