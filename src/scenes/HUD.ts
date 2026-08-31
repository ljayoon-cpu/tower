import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import type { EventBus } from '../core/eventBus';
import type { GameEvents, Wave } from '../core/types';
import { audioFor } from '../ui/audio';
import { waveSummary } from '../core/waveInfo';
import { getEnemy } from '../data/enemies';
import { getTower } from '../data/towers';
import { summarizeTowers } from '../core/towerRoster';

export interface HudInit {
  bus: EventBus<GameEvents>;
  gold: number;
  lives: number;
  totalWaves: number;
  waves: Wave[];
  onNextWave: () => void;
  onToggleSpeed: () => void;
  onTogglePause: () => void;
  onQuit: () => void;
  /** 일시정지 화면에 표시할 현재 타워 구성. */
  getRoster: () => ReadonlyArray<{ key: string; level: number }>;
}

function rosterText(towers: ReadonlyArray<{ key: string; level: number }>): string {
  const groups = summarizeTowers(towers);
  if (groups.length === 0) return '설치한 타워 없음';
  return groups.map((g) => `${getTower(g.key).name} Lv${g.level}×${g.count}`).join('   ');
}

function previewText(waves: Wave[], nextIndex: number): string {
  if (nextIndex >= waves.length) return '';
  const parts = waveSummary(waves[nextIndex]).map((e) => {
    const def = getEnemy(e.key);
    return `${def.name}×${e.count}`;
  });
  return `다음 웨이브: ${parts.join('  ')}`;
}

export class HUD extends Phaser.Scene {
  constructor() { super('hud'); }

  create(data: HudInit) {
    const audio = audioFor(this);
    const style = { fontFamily: 'monospace', fontSize: '26px', color: '#f2f2f7' };
    this.add.rectangle(GAME_WIDTH / 2, 70, GAME_WIDTH, 140, 0x0f1020, 0.96).setInteractive();
    const goldText = this.add.text(20, 12, `골드 ${data.gold}`, { ...style, color: '#ffcc44' });
    const lifeText = this.add.text(20, 48, `라이프 ${data.lives}`, { ...style, color: '#ff8899' });
    const waveText = this.add.text(GAME_WIDTH - 20, 12, `웨이브 -/${data.totalWaves}`, style).setOrigin(1, 0);
    const button = (x: number, y: number, w: number, label: string, action: () => void) => {
      const bg = this.add.rectangle(x, y, w, 48, 0x242943).setInteractive({ useHandCursor: true });
      const text = this.add.text(x, y, label, { ...style, fontSize: '23px' }).setOrigin(0.5);
      let pressed = false;
      bg.on('pointerdown', () => { pressed = true; });
      bg.on('pointerout', () => { pressed = false; });
      bg.on('pointerup', () => {
        if (!pressed) return;
        pressed = false;
        action();
      });
      return { bg, text };
    };
    const next = button(GAME_WIDTH - 125, 64, 210, '▶ 다음 웨이브', data.onNextWave);
    const speed = button(GAME_WIDTH - 56, 112, 72, '1x', data.onToggleSpeed);
    button(GAME_WIDTH - 167, 112, 134, '일시정지', data.onTogglePause);
    const sound = button(340, 64, 140, '', () => {
      audio.toggle();
      sound.text.setText(audio.muted ? '소리 꺼짐' : '소리 켜짐');
      audio.play('click');
    });
    sound.text.setText(audio.muted ? '소리 꺼짐' : '소리 켜짐');
    const hint = this.add.text(20, 95, '빈 칸을 눌러 타워 설치', {
      ...style, fontSize: '20px', color: '#8d98bb',
    });
    const preview = this.add.text(20, 120, previewText(data.waves, 0), {
      ...style, fontSize: '18px', color: '#d6b3ff',
    });

    // 보스 체력바 — 필드에 보스가 있을 때만 표시.
    const bossBar = this.add.container(GAME_WIDTH / 2, 168).setDepth(1500).setVisible(false);
    const bossTrack = this.add.rectangle(0, 0, GAME_WIDTH - 40, 16, 0x000000, 0.55).setStrokeStyle(1, 0xff5566, 0.6);
    const bossFill = this.add.rectangle(-(GAME_WIDTH - 44) / 2, 0, GAME_WIDTH - 44, 12, 0xff3355).setOrigin(0, 0.5);
    const bossLabel = this.add.text(0, -18, '', { ...style, fontSize: '16px', color: '#ff8899' }).setOrigin(0.5);
    bossBar.add([bossTrack, bossFill, bossLabel]);
    const bossMaxW = GAME_WIDTH - 44;

    const overlay = this.add.container(0, 0).setDepth(2000).setVisible(false);
    const shade = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.72).setInteractive();
    const panel = this.add.rectangle(GAME_WIDTH / 2, 620, 460, 370, 0x1b1d33).setStrokeStyle(2, 0x66ccff);
    const heading = this.add.text(GAME_WIDTH / 2, 490, '일시정지', { ...style, fontSize: '42px' }).setOrigin(0.5);
    const roster = this.add.text(GAME_WIDTH / 2, 548, '', {
      ...style, fontSize: '17px', color: '#b7bdd5', align: 'center',
      wordWrap: { width: 420 }, lineSpacing: 4,
    }).setOrigin(0.5);
    overlay.add([shade, panel, heading, roster]);
    const resume = button(GAME_WIDTH / 2, 615, 320, '▶ 계속하기', data.onTogglePause);
    const quit = button(GAME_WIDTH / 2, 710, 320, '포기하고 스테이지 선택', data.onQuit);
    overlay.add([resume.bg, resume.text, quit.bg, quit.text]);

    const cleanups: Array<() => void> = [];
    const on = <K extends keyof GameEvents>(event: K, fn: (value: GameEvents[K]) => void) => {
      data.bus.on(event, fn);
      cleanups.push(() => data.bus.off(event, fn));
    };
    on('gold:changed', ({ gold }) => goldText.setText(`골드 ${gold}`));
    on('life:changed', ({ lives }) => lifeText.setText(`라이프 ${lives}`));
    on('wave:started', ({ index, total }) => {
      waveText.setText(`웨이브 ${index + 1}/${total}`);
      next.bg.disableInteractive().setAlpha(0.4);
      next.text.setAlpha(0.4).setText('▶ 다음 웨이브');
      hint.setText('같은 타워를 겹치면 합체');
      preview.setText(previewText(data.waves, index + 1));
    });
    on('wave:cleared', ({ index }) => {
      hint.setText('길게 눌러 타워 판매');
      if (index + 1 >= data.totalWaves) preview.setText('마지막 웨이브 클리어');
      else preview.setText(previewText(data.waves, index + 1));
    });
    // 웨이브 사이 카운트다운: 버튼이 "지금 시작"으로 바뀌며 남은 초를 보여준다.
    on('wave:countdown', ({ seconds }) => {
      if (seconds === null) {
        next.bg.disableInteractive().setAlpha(0.4);
        next.text.setAlpha(0.4).setText('▶ 다음 웨이브');
      } else {
        next.bg.setInteractive({ useHandCursor: true }).setAlpha(1);
        next.text.setAlpha(1).setText(`▶ 지금 시작  ${seconds}`);
      }
    });
    on('speed:changed', ({ multiplier }) => speed.text.setText(`${multiplier}x`));
    on('pause:changed', ({ paused }) => {
      if (paused) roster.setText(rosterText(data.getRoster()));
      overlay.setVisible(paused);
    });
    on('boss:spawned', ({ name }) => {
      bossLabel.setText(`${name}`);
      bossFill.width = bossMaxW;
      bossBar.setVisible(true);
    });
    on('boss:health', ({ ratio }) => { bossFill.width = bossMaxW * Math.max(0, ratio); });
    on('boss:cleared', () => bossBar.setVisible(false));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => cleanups.forEach((off) => off()));
  }
}
