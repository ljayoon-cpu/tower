import { TILE } from '../core/constants';
import type { TileType, TileCoord, Vec2 } from '../core/types';

export class GridManager {
  private readonly rows: number;
  private readonly cols: number;
  private readonly occupants = new Map<string, number>();

  constructor(private readonly grid: TileType[][]) {
    this.rows = grid.length;
    this.cols = grid[0]?.length ?? 0;
  }

  private key(c: TileCoord): string {
    return `${c.col},${c.row}`;
  }

  tileAt(c: TileCoord): TileType | null {
    if (c.row < 0 || c.row >= this.rows || c.col < 0 || c.col >= this.cols) return null;
    return this.grid[c.row][c.col];
  }

  pixelToTile(p: Vec2): TileCoord {
    return { col: Math.floor(p.x / TILE), row: Math.floor(p.y / TILE) };
  }

  tileToPixelCenter(c: TileCoord): Vec2 {
    return { x: c.col * TILE + TILE / 2, y: c.row * TILE + TILE / 2 };
  }

  occupantAt(c: TileCoord): number | null {
    return this.occupants.get(this.key(c)) ?? null;
  }

  canPlace(c: TileCoord): boolean {
    return this.tileAt(c) === 'BUILDABLE' && this.occupantAt(c) === null;
  }

  occupy(c: TileCoord, towerId: number): void {
    this.occupants.set(this.key(c), towerId);
  }

  release(c: TileCoord): void {
    this.occupants.delete(this.key(c));
  }
}
