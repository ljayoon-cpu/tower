import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import { nextStageId } from '../data/stages';
import { audioFor } from '../ui/audio';
import { attachPressFeedback, fadeInFromBlack, fadeToScene } from '../ui/interactionFeedback';

export interface ResultData {
  stageId: string;
  won: boolean;
  stars: number;
  /** 이 판 이전의 최고 별점. 갱신 시 "신기록" 표시. */
  prevStars?: number;
  lives: number;
  startLives: number;
  /** 무한 모드 결과. 있으면 별점 대신 도달 웨이브를 보여준다. */
  endless?: { reached: number; best: number; prevBest: number };
}

export class Result extends Phaser.Scene {
  constructor() { super('result'); }

  create(data: ResultData) {
    const audio = audioFor(this);
    fadeInFromBlack(this);
    audio.play(data.won ? 'clear' : 'lose');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => audio.stop());
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0f1020);

    if (data.endless) {
      const { reached, best, prevBest } = data.endless;
      const isRecord = reached > prevBest;
      this.add.text(cx, 290, '무한 모드', {
        fontFamily: 'monospace', fontSize: '26px', color: '#99aabb',
      }).setOrigin(0.5);
      this.add.text(cx, 390, '방어 종료', {
        fontFamily: 'monospace', fontSize: '48px', color: '#ff5566',
      }).setOrigin(0.5);
      this.add.text(cx, 500, `웨이브 ${reached} 도달`, {
        fontFamily: 'monospace', fontSize: '52px', color: '#ffcc44',
      }).setOrigin(0.5);
      this.add.text(cx, 565, isRecord ? '⭐ 신기록!' : `최고 웨이브 ${best}`, {
        fontFamily: 'monospace', fontSize: '24px',
        color: isRecord ? '#ffdd55' : '#8d98bb',
      }).setOrigin(0.5);

      const eButton = (y: number, label: string, onClick: () => void) => {
        const bg = this.add.rectangle(cx, y, 390, 76, 0x1b1d33)
          .setStrokeStyle(2, 0x66ccff).setInteractive({ useHandCursor: true });
        const text = this.add.text(cx, y, label, {
          fontFamily: 'monospace', fontSize: '28px', color: '#f2f2f7',
        }).setOrigin(0.5);
        attachPressFeedback(this, bg, [bg, text], audio, onClick);
      };
      eButton(720, '다시 도전', () => fadeToScene(this, 'game', { stageId: data.stageId }));
      eButton(820, '메인 메뉴', () => fadeToScene(this, 'mainmenu'));
      return;
    }

    this.add.text(cx, 290, `STAGE ${data.stageId}`, {
      fontFamily: 'monospace', fontSize: '26px', color: '#99aabb',
    }).setOrigin(0.5);
    this.add.text(cx, 380, data.won ? '스테이지 클리어!' : '방어 실패', {
      fontFamily: 'monospace', fontSize: '48px', color: data.won ? '#ffcc44' : '#ff5566',
    }).setOrigin(0.5);
    this.add.text(cx, 480, '★'.repeat(data.stars) + '☆'.repeat(3 - data.stars), {
      fontFamily: 'monospace', fontSize: '60px', color: '#ffcc44',
    }).setOrigin(0.5);

    const best = Math.max(data.prevStars ?? 0, data.stars);
    const isRecord = data.won && data.stars > (data.prevStars ?? 0);
    this.add.text(cx, 528, isRecord ? '⭐ 신기록!' : `최고 ★${best}`, {
      fontFamily: 'monospace', fontSize: '22px',
      color: isRecord ? '#ffdd55' : '#8d98bb',
    }).setOrigin(0.5);

    this.add.text(cx, 575, `남은 라이프 ${data.lives} / ${data.startLives}`, {
      fontFamily: 'monospace', fontSize: '24px', color: '#b7bdd5',
    }).setOrigin(0.5);

    const button = (y: number, label: string, onClick: () => void) => {
      const bg = this.add.rectangle(cx, y, 390, 76, 0x1b1d33)
        .setStrokeStyle(2, 0x66ccff).setInteractive({ useHandCursor: true });
      const text = this.add.text(cx, y, label, {
        fontFamily: 'monospace', fontSize: '28px', color: '#f2f2f7',
      }).setOrigin(0.5);
      attachPressFeedback(this, bg, [bg, text], audio, onClick);
    };
    let y = 680;
    const next = nextStageId(data.stageId);
    if (data.won && next) {
      button(y, '다음 스테이지 ▶', () => fadeToScene(this, 'game', { stageId: next }));
      y += 100;
    }
    button(y, '다시 하기', () => fadeToScene(this, 'game', { stageId: data.stageId }));
    button(y + 100, '스테이지 선택', () => fadeToScene(this, 'stageselect'));
    if (data.won && !next) {
      this.add.text(cx, 1080, '모든 스테이지를 클리어했습니다!', {
        fontFamily: 'monospace', fontSize: '24px', color: '#66ccff',
      }).setOrigin(0.5);
    }
  }
}
