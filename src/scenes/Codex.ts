import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import { audioFor } from '../ui/audio';
import { attachPressFeedback, fadeInFromBlack, fadeToScene } from '../ui/interactionFeedback';
import {
  CODEX_TOWER_KEYS, CODEX_ENEMY_KEYS, towerCard, enemyCard,
} from '../core/codex';

const LIST_TOP = 196;
const LIST_BOTTOM = GAME_HEIGHT - 96;
const CARD_H = 168;
const CARD_GAP = 12;
const MONO = 'monospace';

type Tab = 'tower' | 'enemy';

export class Codex extends Phaser.Scene {
  private tab: Tab = 'tower';
  private list?: Phaser.GameObjects.Container;
  private towerBtn?: Phaser.GameObjects.Text;
  private enemyBtn?: Phaser.GameObjects.Text;

  constructor() { super('codex'); }

  create() {
    const audio = audioFor(this);
    fadeInFromBlack(this);
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0f1020);
    this.add.text(cx, 74, '도감', { fontFamily: MONO, fontSize: '44px', color: '#f2f2f7' })
      .setOrigin(0.5).setDepth(6);
    this.add.text(cx, 116, '처음이라면 여기서 타워·적의 상성을 확인하세요', {
      fontFamily: MONO, fontSize: '15px', color: '#8d98bb',
    }).setOrigin(0.5).setDepth(6);

    this.towerBtn = this.add.text(cx - 96, 158, '마법 첨탑', {
      fontFamily: MONO, fontSize: '24px', color: '#f2f2f7',
    }).setOrigin(0.5).setDepth(6).setInteractive({ useHandCursor: true });
    this.enemyBtn = this.add.text(cx + 96, 158, '태엽 군단', {
      fontFamily: MONO, fontSize: '24px', color: '#f2f2f7',
    }).setOrigin(0.5).setDepth(6).setInteractive({ useHandCursor: true });
    attachPressFeedback(this, this.towerBtn, [this.towerBtn], audio, () => this.select('tower'));
    attachPressFeedback(this, this.enemyBtn, [this.enemyBtn], audio, () => this.select('enemy'));

    // 스크롤 카드가 제목·메뉴를 덮지 않도록 위/아래 가림막.
    this.add.rectangle(cx, (LIST_TOP - 6) / 2, GAME_WIDTH, LIST_TOP - 6, 0x0f1020).setDepth(5);
    this.add.rectangle(cx, (LIST_BOTTOM + 6 + GAME_HEIGHT) / 2, GAME_WIDTH, GAME_HEIGHT - LIST_BOTTOM - 6, 0x0f1020).setDepth(5);

    const back = this.add.text(cx, GAME_HEIGHT - 52, '← 메뉴', {
      fontFamily: MONO, fontSize: '28px', color: '#99a',
    }).setOrigin(0.5).setDepth(6).setInteractive({ useHandCursor: true });
    attachPressFeedback(this, back, [back], audio, () => fadeToScene(this, 'mainmenu'));

    this.setupScroll();
    this.select('tower');
  }

  private select(tab: Tab): void {
    this.tab = tab;
    this.towerBtn?.setColor(tab === 'tower' ? '#ffcc44' : '#77839c');
    this.enemyBtn?.setColor(tab === 'enemy' ? '#ffcc44' : '#77839c');
    this.rebuild();
  }

  private rebuild(): void {
    this.list?.destroy();
    const list = this.add.container(0, 0).setDepth(1);
    this.list = list;

    const keys = this.tab === 'tower' ? CODEX_TOWER_KEYS : CODEX_ENEMY_KEYS;
    keys.forEach((key, i) => {
      const y = LIST_TOP + CARD_H / 2 + i * (CARD_H + CARD_GAP);
      list.add(this.tab === 'tower' ? this.towerCardObjects(key, y) : this.enemyCardObjects(key, y));
    });

    this.applyScrollClamp();
  }

  private towerCardObjects(key: string, y: number): Phaser.GameObjects.GameObject[] {
    const d = towerCard(key);
    const left = 40;
    const box = this.add.rectangle(GAME_WIDTH / 2, y, GAME_WIDTH - 40, CARD_H, 0x1b1d33).setStrokeStyle(2, 0x2f3350);
    const icon = this.add.image(left + 26, y - CARD_H / 2 + 30, `tower_${key}`).setScale(0.62);
    const title = this.add.text(left + 60, y - CARD_H / 2 + 14, `${d.name}   설치 ${d.cost}G`, {
      fontFamily: MONO, fontSize: '21px', color: '#f2f2f7', fontStyle: 'bold',
    });
    const stat = this.add.text(left + 60, y - CARD_H / 2 + 42,
      `DPS ${d.dps}  ·  사거리 ${d.range}  ·  연사 ${Number(d.fireRate.toFixed(2))}/초`, {
        fontFamily: MONO, fontSize: '15px', color: '#9fb0d0',
      });
    const role = this.add.text(left, y - CARD_H / 2 + 72, d.role, {
      fontFamily: MONO, fontSize: '16px', color: '#cdd6f4', wordWrap: { width: GAME_WIDTH - 96 },
    });
    const strong = this.add.text(left, y - CARD_H / 2 + 100, `◎ ${d.strong}`, {
      fontFamily: MONO, fontSize: '15px', color: '#7dd87d', wordWrap: { width: GAME_WIDTH - 96 },
    });
    const weak = this.add.text(left, y - CARD_H / 2 + 128, `▽ ${d.weak}`, {
      fontFamily: MONO, fontSize: '15px', color: '#ff8f8f', wordWrap: { width: GAME_WIDTH - 96 },
    });
    return [box, icon, title, stat, role, strong, weak];
  }

  private enemyCardObjects(key: string, y: number): Phaser.GameObjects.GameObject[] {
    const d = enemyCard(key);
    const left = 40;
    const box = this.add.rectangle(GAME_WIDTH / 2, y, GAME_WIDTH - 40, CARD_H, 0x1b1d33).setStrokeStyle(2, 0x2f3350);
    const icon = this.add.image(left + 28, y - CARD_H / 2 + 32, `enemy_${key}`);
    icon.setScale(Math.min(1.3, 50 / Math.max(icon.width, icon.height)));
    const title = this.add.text(left + 62, y - CARD_H / 2 + 14, d.name, {
      fontFamily: MONO, fontSize: '21px', color: '#f2f2f7', fontStyle: 'bold',
    });
    const stat = this.add.text(left + 62, y - CARD_H / 2 + 42,
      `HP ${d.hp}  ·  속도 ${d.speed}${d.tags.length ? '   [ ' + d.tags.join(' · ') + ' ]' : ''}`, {
        fontFamily: MONO, fontSize: '15px', color: '#9fb0d0', wordWrap: { width: GAME_WIDTH - 130 },
      });
    const trait = this.add.text(left, y - CARD_H / 2 + 78, d.trait, {
      fontFamily: MONO, fontSize: '16px', color: '#cdd6f4', wordWrap: { width: GAME_WIDTH - 96 },
    });
    const counter = this.add.text(left, y - CARD_H / 2 + 118, `→ ${d.counter}`, {
      fontFamily: MONO, fontSize: '16px', color: '#ffd27d', wordWrap: { width: GAME_WIDTH - 96 },
    });
    return [box, icon, title, stat, trait, counter];
  }

  private scrollMinY = 0;

  private applyScrollClamp(): void {
    const keys = this.tab === 'tower' ? CODEX_TOWER_KEYS : CODEX_ENEMY_KEYS;
    const contentH = LIST_TOP + keys.length * (CARD_H + CARD_GAP);
    this.scrollMinY = Math.min(0, LIST_BOTTOM - contentH);
    if (this.list) this.list.y = Phaser.Math.Clamp(this.list.y, this.scrollMinY, 0);
  }

  private setupScroll(): void {
    let startPointerY = 0;
    let startListY = 0;
    let dragging = false;
    const clamp = (v: number) => Phaser.Math.Clamp(v, this.scrollMinY, 0);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      dragging = true;
      startPointerY = p.y; startListY = this.list?.y ?? 0;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!dragging || !this.list) return;
      const dy = p.y - startPointerY;
      this.list.y = clamp(startListY + dy);
    });
    this.input.on('pointerup', () => { dragging = false; });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      if (this.list) this.list.y = clamp(this.list.y - dy);
    });
  }
}
