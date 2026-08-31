import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, GRID_COLS, GRID_ROWS, TILE } from '../core/constants';
import type { TileType } from '../core/types';

export interface WorldMapTheme {
  pathBase: number;
  buildableBase: number;
  pathEdge: number;
  buildableEdge: number;
  accent: number;
}

const MAP_THEMES: Record<string, WorldMapTheme> = {
  '1': {
    pathBase: 0x66553c,
    buildableBase: 0x1c392e,
    pathEdge: 0xb89b67,
    buildableEdge: 0x4d917a,
    accent: 0x78d9df,
  },
  '2': {
    pathBase: 0x462722,
    buildableBase: 0x25202e,
    pathEdge: 0xef8750,
    buildableEdge: 0x8e5cac,
    accent: 0xffa15a,
  },
};

export function worldMapTheme(world: string): WorldMapTheme {
  return MAP_THEMES[world] ?? MAP_THEMES['1'];
}

export function worldTileTextureKey(world: string, tile: 'PATH' | 'BUILDABLE'): string {
  const prefix = world === '2' ? 'world2' : 'world1';
  return `${prefix}_${tile.toLowerCase()}`;
}

export function worldLabel(world: string): string {
  return world === '2' ? '붉은 용광로' : '국경 성벽';
}

/** 전투 규칙과 분리된 월드별 타일·고정 장식 렌더러. */
export class WorldMapPainter {
  private readonly theme: WorldMapTheme;
  private readonly resolvedWorld: string;

  constructor(
    private readonly scene: Phaser.Scene,
    world: string,
    private readonly grid: TileType[][],
  ) {
    this.resolvedWorld = world === '2' ? '2' : '1';
    this.theme = worldMapTheme(world);
    this.createTextures();
  }

  drawDecorations(): void {
    const g = this.scene.add.graphics().setDepth(-475);
    let count = 0;

    // 보드 둘레의 고정 장식만 그린다. 타일의 입력·가독성을 가리지 않는다.
    for (let row = 0; row < GRID_ROWS && count < 60; row++) {
      for (let col = 0; col < GRID_COLS && count < 60; col++) {
        const tile = this.grid[row]?.[col];
        const edge = row === 0 || row === GRID_ROWS - 1 || col === 0 || col === GRID_COLS - 1;
        const marker = row * GRID_COLS + col;
        if (!edge || tile === 'PATH' || marker % 4 !== 0) continue;

        const x = col * TILE + TILE / 2;
        const y = row * TILE + TILE / 2;
        if (this.resolvedWorld === '1') {
          g.fillStyle(0x0e241f, 0.84);
          g.fillCircle(x - 11, y + 10, 11);
          g.fillStyle(this.theme.accent, 0.34);
          g.fillCircle(x - 14, y + 6, 3);
          g.fillStyle(0x8c7652, 0.72);
          g.fillCircle(x + 13, y + 12, 5);
        } else {
          g.fillStyle(0x16131b, 0.88);
          g.fillCircle(x - 9, y + 11, 13);
          g.lineStyle(2, this.theme.accent, 0.52);
          g.lineBetween(x + 6, y - 12, x + 15, y + 12);
          g.lineBetween(x + 15, y + 12, x + 22, y + 2);
          g.fillStyle(0x9a61bc, 0.42);
          g.fillTriangle(x + 6, y + 12, x + 14, y - 16, x + 22, y + 12);
        }
        count++;
      }
    }

    // 월드의 시작과 끝에 각각 성벽 문/용광로 파이프가 보이도록 한다.
    if (this.resolvedWorld === '1') {
      g.fillStyle(0x182b31, 0.86);
      g.fillRect(GAME_WIDTH / 2 - 86, 0, 172, 18);
      g.fillStyle(0x9b7e52, 0.82);
      g.fillRect(GAME_WIDTH / 2 - 4, GAME_HEIGHT - 34, 8, 34);
      g.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT - 36, 15);
    } else {
      g.fillStyle(0x27171b, 0.92);
      g.fillRect(GAME_WIDTH / 2 - 104, 0, 208, 22);
      g.lineStyle(3, this.theme.accent, 0.7);
      g.lineBetween(GAME_WIDTH / 2 - 78, 11, GAME_WIDTH / 2 + 78, 11);
      g.fillStyle(0xdc5a37, 0.2);
      g.fillRect(0, GAME_HEIGHT - 30, GAME_WIDTH, 30);
    }
  }

  private createTextures(): void {
    for (const world of ['1', '2'] as const) {
      this.createTileTexture(world, 'BUILDABLE');
      this.createTileTexture(world, 'PATH');
    }
  }

  private createTileTexture(world: '1' | '2', tile: 'PATH' | 'BUILDABLE'): void {
    const key = worldTileTextureKey(world, tile);
    if (this.scene.textures.exists(key)) return;

    const theme = worldMapTheme(world);
    const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
    const base = tile === 'PATH' ? theme.pathBase : theme.buildableBase;
    const edge = tile === 'PATH' ? theme.pathEdge : theme.buildableEdge;
    g.fillStyle(base, 1);
    g.fillRect(0, 0, TILE, TILE);
    g.lineStyle(tile === 'PATH' ? 3 : 2, edge, tile === 'PATH' ? 0.92 : 0.75);
    g.strokeRect(1, 1, TILE - 2, TILE - 2);

    if (world === '1') this.drawFrontierTile(g, tile, edge);
    else this.drawForgeTile(g, tile, edge);

    g.generateTexture(key, TILE, TILE);
    g.destroy();
  }

  private drawFrontierTile(g: Phaser.GameObjects.Graphics, tile: 'PATH' | 'BUILDABLE', edge: number): void {
    if (tile === 'PATH') {
      g.fillStyle(0x8c7652, 0.5);
      g.fillCircle(13, 16, 4); g.fillCircle(45, 43, 5); g.fillCircle(31, 54, 3);
      g.lineStyle(1, 0xd5bc83, 0.48);
      g.lineBetween(7, 28, 55, 25); g.lineBetween(9, 40, 52, 37);
      return;
    }
    g.lineStyle(2, 0x32654f, 0.76);
    g.lineBetween(11, 46, 16, 36); g.lineBetween(18, 49, 22, 35); g.lineBetween(44, 22, 48, 12);
    g.fillStyle(edge, 0.38);
    g.fillCircle(18, 18, 2); g.fillCircle(52, 49, 2);
  }

  private drawForgeTile(g: Phaser.GameObjects.Graphics, tile: 'PATH' | 'BUILDABLE', edge: number): void {
    if (tile === 'PATH') {
      g.fillStyle(0x6d3a2d, 0.68);
      g.fillRect(5, 8, 54, 12); g.fillRect(5, 30, 54, 12); g.fillRect(5, 52, 54, 7);
      g.fillStyle(0x211a22, 0.9);
      for (const x of [12, 32, 52]) { g.fillCircle(x, 14, 2); g.fillCircle(x, 36, 2); }
      g.lineStyle(2, edge, 0.74);
      g.lineBetween(4, 4, 60, 4); g.lineBetween(4, 60, 60, 60);
      return;
    }
    g.lineStyle(2, 0x604271, 0.8);
    g.lineBetween(14, 9, 25, 28); g.lineBetween(25, 28, 18, 45); g.lineBetween(25, 28, 43, 39);
    g.lineStyle(1, edge, 0.72);
    g.lineBetween(44, 7, 53, 19); g.lineBetween(53, 19, 49, 29);
    g.fillStyle(0xa96ac7, 0.28);
    g.fillTriangle(45, 47, 51, 31, 57, 47);
  }
}
