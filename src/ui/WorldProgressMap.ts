import type Phaser from 'phaser';
import { GAME_WIDTH } from '../core/constants';
import { isUnlocked } from '../core/save';
import type { SaveData, StageDef } from '../core/types';
import { worldLabel, worldMapTheme } from './worldMap';

type Chapter = { world: string; firstStage: StageDef };

function chapterList(stages: readonly StageDef[]): Chapter[] {
  const chapters: Chapter[] = [];
  for (const stage of stages) {
    const world = stage.id.split('-')[0] ?? '1';
    if (!chapters.some((chapter) => chapter.world === world)) chapters.push({ world, firstStage: stage });
  }
  return chapters;
}

function cssColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/** 스테이지 카드와 독립적으로 현재 캠페인 위치만 보여주는 정적 헤더 지도. */
export class WorldProgressMap {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly stages: readonly StageDef[],
    private readonly save: SaveData,
  ) {}

  draw(): void {
    const chapters = chapterList(this.stages);
    if (chapters.length === 0) return;

    const y = 158;
    const inset = 174;
    const spacing = chapters.length === 1 ? 0 : (GAME_WIDTH - inset * 2) / (chapters.length - 1);
    const xAt = (index: number) => chapters.length === 1 ? GAME_WIDTH / 2 : inset + spacing * index;
    const graphics = this.scene.add.graphics().setDepth(6);

    if (chapters.length > 1) {
      graphics.lineStyle(4, 0x45465e, 0.95);
      graphics.lineBetween(xAt(0), y, xAt(chapters.length - 1), y);
    }

    chapters.forEach((chapter, index) => {
      const x = xAt(index);
      const theme = worldMapTheme(chapter.world);
      const unlocked = isUnlocked(this.save, chapter.firstStage.id);
      const color = unlocked ? theme.accent : 0x5b5c70;
      graphics.fillStyle(0x161827, 1);
      graphics.fillCircle(x, y, 17);
      graphics.lineStyle(3, color, unlocked ? 1 : 0.65);
      graphics.strokeCircle(x, y, 17);
      graphics.fillStyle(color, unlocked ? 0.9 : 0.45);
      if (chapter.world === '2') {
        graphics.fillTriangle(x, y - 9, x - 7, y + 7, x + 7, y + 7);
      } else if (chapter.world === '3') {
        graphics.fillRect(x - 7, y - 2, 14, 7);
        graphics.fillTriangle(x - 10, y - 1, x - 2, y - 7, x - 2, y + 5);
        graphics.fillTriangle(x + 10, y - 1, x + 2, y - 7, x + 2, y + 5);
        graphics.fillRect(x - 4, y + 5, 8, 4);
      } else {
        graphics.fillRect(x - 8, y - 5, 16, 12);
        graphics.fillRect(x - 8, y - 9, 4, 5); graphics.fillRect(x + 4, y - 9, 4, 5);
      }
      this.scene.add.text(x, y + 24, `${index + 1}. ${worldLabel(chapter.world)}`, {
        fontFamily: 'monospace', fontSize: '15px', color: unlocked ? cssColor(theme.accent) : '#7a7b90',
      }).setOrigin(0.5).setDepth(6);
    });
  }
}
