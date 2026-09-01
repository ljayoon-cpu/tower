import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import { audioFor } from '../ui/audio';
import { attachPressFeedback, fadeInFromBlack, fadeToScene } from '../ui/interactionFeedback';

export class MainMenu extends Phaser.Scene {
  constructor() { super('mainmenu'); }
  create() {
    const audio = audioFor(this);
    fadeInFromBlack(this);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.35, '머지 타워디펜스', {
      fontFamily: 'monospace', fontSize: '56px', color: '#f2f2f7',
    }).setOrigin(0.5);

    const start = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.57, '▶ 시작', {
      fontFamily: 'monospace', fontSize: '40px', color: '#ffcc44',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    attachPressFeedback(this, start, [start], audio, () => fadeToScene(this, 'stageselect'));

    const endless = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.65, '♾ 무한 모드', {
      fontFamily: 'monospace', fontSize: '30px', color: '#ff9ee0',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    attachPressFeedback(this, endless, [endless], audio, () => fadeToScene(this, 'game', { stageId: 'endless' }));

    const codex = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.72, '📖 도감', {
      fontFamily: 'monospace', fontSize: '30px', color: '#a8d8a0',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    attachPressFeedback(this, codex, [codex], audio, () => fadeToScene(this, 'codex'));

    const shop = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.79, '⚙ 강화 상점', {
      fontFamily: 'monospace', fontSize: '30px', color: '#7dd8ff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    attachPressFeedback(this, shop, [shop], audio, () => fadeToScene(this, 'shop'));

    const sound = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.86, '', {
      fontFamily: 'monospace', fontSize: '28px', color: '#99aabb',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const refresh = () => sound.setText(audio.muted ? '소리: 꺼짐' : '소리: 켜짐');
    refresh();
    attachPressFeedback(this, sound, [sound], audio, () => { audio.toggle(); refresh(); });
  }
}
