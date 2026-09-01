import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, GRID_COLS, GRID_ROWS, TILE } from '../core/constants';
import type { StageDef, TileCoord, TileType, Vec2 } from '../core/types';

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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

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

export type BattlefieldLandmarkKind = 'watchfire' | 'ruins' | 'crystal' | 'vent';

/** 월드와 스테이지 번호만으로 정해지는 장소 표식. 전투 규칙에는 관여하지 않는다. */
export function battlefieldLandmarkKind(world: string, stageId: string): BattlefieldLandmarkKind {
  const number = Number(stageId.split('-')[1]) || 1;
  if (world === '2') return number % 2 === 1 ? 'crystal' : 'vent';
  return number % 2 === 1 ? 'watchfire' : 'ruins';
}

/** 설치 가능한 칸만 순환 순서로 고른다. 같은 스테이지는 항상 같은 위치를 쓴다. */
export function landmarkCells(
  stageId: string,
  grid: ReadonlyArray<ReadonlyArray<TileType>>,
  limit: number,
): TileCoord[] {
  const candidates: TileCoord[] = [];
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < (grid[row]?.length ?? 0); col++) {
      if (grid[row]?.[col] === 'BUILDABLE') candidates.push({ col, row });
    }
  }
  if (candidates.length === 0 || limit <= 0) return [];

  const hash = [...stageId].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const count = Math.min(limit, candidates.length);
  const start = hash % candidates.length;
  return Array.from({ length: count }, (_, i) => candidates[(start + i) % candidates.length]!);
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

  /** 타일 위에 정적인 입구·수호 코어·장소 표식을 더한다. */
  drawStageLandmarks(stage: Pick<StageDef, 'id' | 'spawn' | 'goals' | 'bossStage' | 'grid'>): void {
    const g = this.scene.add.graphics().setDepth(2);
    this.drawEntrance(g, stage.spawn);
    for (const goal of stage.goals) this.drawCore(g, goal, stage.bossStage === true);

    const kind = battlefieldLandmarkKind(this.resolvedWorld, stage.id);
    for (const cell of landmarkCells(stage.id, stage.grid, 4)) {
      const x = cell.col * TILE + TILE / 2;
      const y = cell.row * TILE + TILE / 2;
      this.drawLandmark(g, x, y, kind);
    }
    if (stage.bossStage) this.drawBossMarkers(g, stage.goals);
  }

  private drawEntrance(g: Phaser.GameObjects.Graphics, spawn: Vec2): void {
    const x = clamp(spawn.x, 40, GAME_WIDTH - 40);
    const y = clamp(spawn.y + 22, 22, GAME_HEIGHT - 22);
    if (this.resolvedWorld === '1') {
      g.fillStyle(0x172332, 0.92);
      g.fillRoundedRect(x - 34, y - 17, 68, 32, 5);
      g.fillStyle(0x6e583d, 0.95);
      g.fillRect(x - 23, y - 5, 46, 18);
      g.lineStyle(3, this.theme.accent, 0.8);
      g.lineBetween(x - 32, y - 18, x - 32, y + 14);
      g.lineBetween(x + 32, y - 18, x + 32, y + 14);
      g.fillStyle(0x9be8ed, 0.7);
      g.fillCircle(x - 41, y - 3, 4); g.fillCircle(x + 41, y - 3, 4);
      return;
    }
    g.fillStyle(0x19151c, 0.96);
    g.fillCircle(x, y, 28);
    g.lineStyle(5, this.theme.accent, 0.8);
    g.strokeCircle(x, y, 25);
    g.fillStyle(0xb64c32, 0.88);
    g.fillCircle(x, y, 15);
    g.lineStyle(2, 0x2a1a1e, 0.95);
    g.lineBetween(x - 34, y, x - 56, y); g.lineBetween(x + 34, y, x + 56, y);
  }

  private drawCore(g: Phaser.GameObjects.Graphics, goal: Vec2, boss: boolean): void {
    const x = clamp(goal.x, 24, GAME_WIDTH - 24);
    const y = clamp(goal.y, 24, GAME_HEIGHT - 24);
    if (this.resolvedWorld === '1') {
      g.fillStyle(0x102838, 0.9);
      g.fillCircle(x, y, boss ? 24 : 20);
      g.fillStyle(0x66d7dc, 0.9);
      g.fillTriangle(x, y - 17, x - 11, y + 10, x + 11, y + 10);
      g.lineStyle(2, 0xd0fbff, 0.75);
      g.strokeCircle(x, y, boss ? 25 : 20);
      return;
    }
    g.fillStyle(0x2c1920, 0.94);
    g.fillCircle(x, y, boss ? 24 : 20);
    g.fillStyle(0xf18245, 0.92);
    g.fillCircle(x, y, boss ? 12 : 10);
    g.lineStyle(2, 0xffc06a, 0.82);
    g.strokeCircle(x, y, boss ? 25 : 20);
  }

  private drawLandmark(g: Phaser.GameObjects.Graphics, x: number, y: number, kind: BattlefieldLandmarkKind): void {
    if (kind === 'watchfire') {
      g.fillStyle(0x33292d, 0.78); g.fillRect(x - 4, y - 17, 8, 27);
      g.fillStyle(0xf3ca6c, 0.78); g.fillCircle(x, y - 20, 7);
      g.fillStyle(this.theme.accent, 0.28); g.fillCircle(x, y - 20, 13);
    } else if (kind === 'ruins') {
      g.fillStyle(0x7c725b, 0.66); g.fillRect(x - 12, y - 14, 9, 26); g.fillRect(x + 3, y - 7, 10, 19);
      g.lineStyle(2, 0xb8a978, 0.54); g.lineBetween(x - 15, y + 12, x + 15, y + 12);
    } else if (kind === 'crystal') {
      g.fillStyle(0x8e63c4, 0.6); g.fillTriangle(x - 13, y + 13, x - 5, y - 18, x + 2, y + 13);
      g.fillStyle(0xd18df0, 0.62); g.fillTriangle(x - 1, y + 14, x + 8, y - 22, x + 16, y + 14);
    } else {
      g.fillStyle(0x2a242a, 0.82); g.fillRect(x - 13, y - 8, 26, 19);
      g.lineStyle(3, 0xcd6b49, 0.76); g.lineBetween(x - 8, y - 8, x - 8, y - 22); g.lineBetween(x + 8, y - 8, x + 8, y - 22);
      g.fillStyle(0xd9d5dc, 0.23); g.fillCircle(x - 8, y - 27, 8); g.fillCircle(x + 8, y - 29, 7);
    }
  }

  private drawBossMarkers(g: Phaser.GameObjects.Graphics, goals: readonly Vec2[]): void {
    for (const goal of goals) {
      const x = clamp(goal.x, 30, GAME_WIDTH - 30);
      const y = clamp(goal.y, 30, GAME_HEIGHT - 30);
      g.lineStyle(2, this.resolvedWorld === '1' ? 0xd75e64 : 0xffa15a, 0.8);
      g.strokeCircle(x, y, 31);
      if (this.resolvedWorld === '1') {
        g.fillStyle(0x9e3945, 0.8);
        g.fillTriangle(x - 32, y - 34, x - 32, y - 13, x - 17, y - 24);
      } else {
        g.fillStyle(0xffa15a, 0.68);
        g.fillCircle(x + 31, y - 19, 5); g.fillCircle(x + 39, y - 27, 3);
      }
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
