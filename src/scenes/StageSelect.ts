import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import { STAGES } from '../data/stages';
import { loadSave, isUnlocked } from '../core/save';

export class StageSelect extends Phaser.Scene {
  constructor() { super('stageselect'); }

  create() {
    const save = loadSave();
    this.add.text(GAME_WIDTH / 2, 90, '스테이지 선택', {
      fontFamily: 'monospace', fontSize: '44px', color: '#f2f2f7',
    }).setOrigin(0.5);

    STAGES.forEach((stage, i) => {
      const y = 220 + i * 150;
      const unlocked = isUnlocked(save, stage.id);
      const stars = save.stages[stage.id]?.stars ?? 0;

      const box = this.add.rectangle(GAME_WIDTH / 2, y, 460, 110, unlocked ? 0x1b1d33 : 0x14141f)
        .setStrokeStyle(2, unlocked ? 0x66ccff : 0x333344);

      this.add.text(GAME_WIDTH / 2, y - 16, unlocked ? stage.id : `${stage.id} 🔒`, {
        fontFamily: 'monospace', fontSize: '34px', color: unlocked ? '#f2f2f7' : '#666677',
      }).setOrigin(0.5);

      this.add.text(GAME_WIDTH / 2, y + 22, '★★★☆☆☆'.slice(3 - stars, 6 - stars), {
        fontFamily: 'monospace', fontSize: '26px', color: '#ffcc44',
      }).setOrigin(0.5);

      if (unlocked) {
        box.setInteractive({ useHandCursor: true })
          .on('pointerup', () => this.scene.start('game', { stageId: stage.id }));
      }
    });

    const back = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 60, '← 메뉴', {
      fontFamily: 'monospace', fontSize: '28px', color: '#99a',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.scene.start('mainmenu'));
  }
}
