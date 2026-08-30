import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import { audioFor } from '../ui/audio';

export class MainMenu extends Phaser.Scene {
  constructor() { super('mainmenu'); }
  create() {
    const audio = audioFor(this);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.35, '머지 타워디펜스', {
      fontFamily: 'monospace', fontSize: '56px', color: '#f2f2f7',
    }).setOrigin(0.5);

    const start = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.6, '▶ 시작', {
      fontFamily: 'monospace', fontSize: '40px', color: '#ffcc44',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    start.on('pointerup', () => { audio.play('click'); this.scene.start('stageselect'); });
    const sound = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.72, '', {
      fontFamily: 'monospace', fontSize: '28px', color: '#99aabb',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const refresh = () => sound.setText(audio.muted ? '소리: 꺼짐' : '소리: 켜짐');
    refresh();
    sound.on('pointerup', () => { audio.toggle(); refresh(); audio.play('click'); });
  }
}
