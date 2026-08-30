import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import { nextStageId } from '../data/stages';
import { audioFor } from '../ui/audio';

export interface ResultData {
  stageId: string;
  won: boolean;
  stars: number;
  lives: number;
  startLives: number;
}

export class Result extends Phaser.Scene {
  constructor() { super('result'); }

  create(data: ResultData) {
    const audio = audioFor(this);
    audio.play(data.won ? 'clear' : 'lose');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => audio.stop());
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0f1020);
    this.add.text(cx, 290, `STAGE ${data.stageId}`, {
      fontFamily: 'monospace', fontSize: '26px', color: '#99aabb',
    }).setOrigin(0.5);
    this.add.text(cx, 380, data.won ? '스테이지 클리어!' : '방어 실패', {
      fontFamily: 'monospace', fontSize: '48px', color: data.won ? '#ffcc44' : '#ff5566',
    }).setOrigin(0.5);
    this.add.text(cx, 480, '★'.repeat(data.stars) + '☆'.repeat(3 - data.stars), {
      fontFamily: 'monospace', fontSize: '60px', color: '#ffcc44',
    }).setOrigin(0.5);
    this.add.text(cx, 555, `남은 라이프 ${data.lives} / ${data.startLives}`, {
      fontFamily: 'monospace', fontSize: '24px', color: '#b7bdd5',
    }).setOrigin(0.5);

    const button = (y: number, label: string, onClick: () => void) => {
      const bg = this.add.rectangle(cx, y, 390, 76, 0x1b1d33)
        .setStrokeStyle(2, 0x66ccff).setInteractive({ useHandCursor: true });
      this.add.text(cx, y, label, {
        fontFamily: 'monospace', fontSize: '28px', color: '#f2f2f7',
      }).setOrigin(0.5);
      bg.on('pointerup', onClick);
    };
    let y = 680;
    const next = nextStageId(data.stageId);
    if (data.won && next) {
      button(y, '다음 스테이지 ▶', () => this.scene.start('game', { stageId: next }));
      y += 100;
    }
    button(y, '다시 하기', () => this.scene.start('game', { stageId: data.stageId }));
    button(y + 100, '스테이지 선택', () => this.scene.start('stageselect'));
    if (data.won && !next) {
      this.add.text(cx, 1080, '모든 스테이지를 클리어했습니다!', {
        fontFamily: 'monospace', fontSize: '24px', color: '#66ccff',
      }).setOrigin(0.5);
    }
  }
}
