import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import { audioFor } from '../ui/audio';
import { attachPressFeedback, fadeInFromBlack, fadeToScene } from '../ui/interactionFeedback';
import { loadMeta, saveMeta } from '../core/save';
import { META_UPGRADES, buyUpgrade, nextCost, upgradeLevel } from '../core/meta';
import type { MetaState } from '../core/meta';

export class Shop extends Phaser.Scene {
  constructor() { super('shop'); }

  create() {
    const audio = audioFor(this);
    fadeInFromBlack(this);
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0f1020);
    this.add.text(cx, 84, '강화 상점', {
      fontFamily: 'monospace', fontSize: '44px', color: '#f2f2f7',
    }).setOrigin(0.5);

    let state: MetaState = loadMeta();

    const coreText = this.add.text(cx, 132, '', {
      fontFamily: 'monospace', fontSize: '24px', color: '#7dd8ff',
    }).setOrigin(0.5);

    const rows = META_UPGRADES.map((def, i) => {
      const y = 210 + i * 150;
      this.add.rectangle(cx, y, GAME_WIDTH - 44, 130, 0x1b1d33).setStrokeStyle(2, 0x2f3350);
      this.add.text(44, y - 44, def.name, {
        fontFamily: 'monospace', fontSize: '26px', color: '#f2f2f7',
      });
      const pips = this.add.text(44, y - 8, '', {
        fontFamily: 'monospace', fontSize: '20px', color: '#ffcc44',
      });
      const effect = this.add.text(44, y + 22, '', {
        fontFamily: 'monospace', fontSize: '17px', color: '#8d98bb',
      });
      const btnBg = this.add.rectangle(GAME_WIDTH - 110, y, 150, 66, 0x242943)
        .setInteractive({ useHandCursor: true });
      const btnText = this.add.text(GAME_WIDTH - 110, y, '', {
        fontFamily: 'monospace', fontSize: '19px', color: '#f2f2f7', align: 'center',
      }).setOrigin(0.5);
      attachPressFeedback(this, btnBg, [btnBg, btnText], audio, () => {
        const before = state.cores;
        state = buyUpgrade(state, def.key);
        if (state.cores !== before) {
          saveMeta(state);
          audio.play('place');
          render();
        }
      });
      return { def, pips, effect, btnText };
    });

    const render = () => {
      coreText.setText(`보유 코어  ◆ ${state.cores}`);
      for (const r of rows) {
        const lv = upgradeLevel(state, r.def.key);
        r.pips.setText('●'.repeat(lv) + '○'.repeat(r.def.maxLevel - lv));
        r.effect.setText(lv > 0 ? r.def.desc(lv) : '(미해금)');
        const cost = nextCost(state, r.def.key);
        if (cost === null) {
          r.btnText.setText('MAX');
        } else {
          r.btnText.setText(`◆ ${cost}\n${state.cores >= cost ? '강화' : '부족'}`);
        }
      }
    };
    render();

    const back = this.add.text(cx, GAME_HEIGHT - 60, '← 메뉴', {
      fontFamily: 'monospace', fontSize: '28px', color: '#99a',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    attachPressFeedback(this, back, [back], audio, () => fadeToScene(this, 'mainmenu'));

    this.add.text(cx, GAME_HEIGHT - 108, '코어는 스테이지를 더 높은 별점으로 클리어하면 모입니다', {
      fontFamily: 'monospace', fontSize: '15px', color: '#666677',
    }).setOrigin(0.5);
  }
}
