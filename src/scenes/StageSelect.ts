import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import { STAGES } from '../data/stages';
import { loadSave, isUnlocked } from '../core/save';
import type { StageDef } from '../core/types';
import { audioFor } from '../ui/audio';
import { attachPressFeedback, fadeInFromBlack, fadeToScene } from '../ui/interactionFeedback';
import { worldLabel, worldMapTheme } from '../ui/worldMap';

const CARD_H = 104;
const CARD_GAP = 16;
const LIST_TOP = 170;
const LIST_BOTTOM = GAME_HEIGHT - 130;

function stageBrief(stage: StageDef): string {
  const bosses = stage.waves.reduce(
    (n, w) => n + w.groups.filter((g) => g.enemy === 'boss').reduce((s, g) => s + g.count, 0),
    0,
  );
  return bosses > 0 ? `웨이브 ${stage.waves.length} · 보스 ${bosses}` : `웨이브 ${stage.waves.length}`;
}

export class StageSelect extends Phaser.Scene {
  private dragged = false;

  constructor() { super('stageselect'); }

  create() {
    this.dragged = false;
    const audio = audioFor(this);
    fadeInFromBlack(this);
    const save = loadSave();
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0f1020);

    const list = this.add.container(0, 0).setDepth(1);
    STAGES.forEach((stage, i) => {
      const y = LIST_TOP + CARD_H / 2 + i * (CARD_H + CARD_GAP);
      const unlocked = isUnlocked(save, stage.id);
      const stars = save.stages[stage.id]?.stars ?? 0;
      const world = stage.id.split('-')[0];
      const worldStart = stage.id === `${world}-1`;
      const mapTheme = worldMapTheme(world);

      const box = this.add.rectangle(GAME_WIDTH / 2, y, 470, CARD_H, unlocked ? 0x1b1d33 : 0x14141f)
        .setStrokeStyle(2, unlocked ? 0x66ccff : 0x333344);
      const rail = this.add.rectangle(GAME_WIDTH / 2 - 228, y, 10, CARD_H - 8,
        unlocked ? mapTheme.accent : 0x333344, unlocked ? 0.9 : 0.7);
      const title = this.add.text(GAME_WIDTH / 2, y - 24, unlocked ? stage.id : `${stage.id} 🔒`, {
        fontFamily: 'monospace', fontSize: '32px', color: unlocked ? '#f2f2f7' : '#666677',
      }).setOrigin(0.5);
      const starText = this.add.text(GAME_WIDTH / 2, y + 12, '★★★☆☆☆'.slice(3 - stars, 6 - stars), {
        fontFamily: 'monospace', fontSize: '24px', color: '#ffcc44',
      }).setOrigin(0.5);
      const subtitle = worldStart
        ? `${worldLabel(world)}${unlocked ? ` · ${stageBrief(stage)}` : ''}`
        : (unlocked ? stageBrief(stage) : '');
      const brief = this.add.text(GAME_WIDTH / 2, y + 38, subtitle, {
        fontFamily: 'monospace', fontSize: '17px', color: '#8d98bb',
      }).setOrigin(0.5);
      list.add([box, rail, title, starText, brief]);

      if (unlocked) {
        box.setInteractive({ useHandCursor: true });
        attachPressFeedback(
          this, box, [box], audio,
          () => fadeToScene(this, 'game', { stageId: stage.id }),
          () => !this.dragged,
        );
      }
    });

    this.setupScroll(list);

    // 스크롤된 카드가 제목·메뉴 영역을 덮지 않도록 위/아래 가림막.
    this.add.rectangle(GAME_WIDTH / 2, (LIST_TOP - 8) / 2, GAME_WIDTH, LIST_TOP - 8, 0x0f1020).setDepth(5);
    this.add.rectangle(
      GAME_WIDTH / 2, (LIST_BOTTOM + 8 + GAME_HEIGHT) / 2, GAME_WIDTH, GAME_HEIGHT - LIST_BOTTOM - 8, 0x0f1020,
    ).setDepth(5);

    this.add.text(GAME_WIDTH / 2, 84, '스테이지 선택', {
      fontFamily: 'monospace', fontSize: '44px', color: '#f2f2f7',
    }).setOrigin(0.5).setDepth(6);
    const earned = STAGES.reduce((n, s) => n + (save.stages[s.id]?.stars ?? 0), 0);
    this.add.text(GAME_WIDTH / 2, 124, `★ ${earned} / ${STAGES.length * 3}`, {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffcc44',
    }).setOrigin(0.5).setDepth(6);

    const back = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 60, '← 메뉴', {
      fontFamily: 'monospace', fontSize: '28px', color: '#99a',
    }).setOrigin(0.5).setDepth(6).setInteractive({ useHandCursor: true });
    attachPressFeedback(this, back, [back], audio, () => fadeToScene(this, 'mainmenu'));
  }

  /** 카드가 화면을 넘칠 때만 세로 스크롤(드래그 + 휠). */
  private setupScroll(list: Phaser.GameObjects.Container): void {
    const contentH = LIST_TOP + STAGES.length * (CARD_H + CARD_GAP);
    const minY = Math.min(0, LIST_BOTTOM - contentH);
    if (minY === 0) return;

    const clamp = (v: number) => Phaser.Math.Clamp(v, minY, 0);
    let startPointerY = 0;
    let startListY = 0;
    let dragging = false;

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      dragging = true; this.dragged = false;
      startPointerY = p.y; startListY = list.y;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!dragging) return;
      const dy = p.y - startPointerY;
      if (Math.abs(dy) > 6) this.dragged = true;
      list.y = clamp(startListY + dy);
    });
    this.input.on('pointerup', () => { dragging = false; });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      list.y = clamp(list.y - dy);
    });
  }
}
