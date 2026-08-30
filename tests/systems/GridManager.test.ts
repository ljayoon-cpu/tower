import { GridManager } from '../../src/systems/GridManager';
import type { TileType } from '../../src/core/types';

// 3x3: 가운데 세로줄이 PATH, 나머지 BUILDABLE, [0][0] BLOCKED
const grid: TileType[][] = [
  ['BLOCKED',  'PATH', 'BUILDABLE'],
  ['BUILDABLE','PATH', 'BUILDABLE'],
  ['BUILDABLE','PATH', 'BUILDABLE'],
];

describe('GridManager', () => {
  it('maps pixel to tile and back to center', () => {
    const g = new GridManager(grid);
    expect(g.pixelToTile({ x: 70, y: 10 })).toEqual({ col: 1, row: 0 });
    expect(g.tileToPixelCenter({ col: 1, row: 0 })).toEqual({ x: 96, y: 32 });
  });

  it('tileAt returns null out of bounds', () => {
    const g = new GridManager(grid);
    expect(g.tileAt({ col: 9, row: 0 })).toBeNull();
    expect(g.tileAt({ col: 0, row: 0 })).toBe('BLOCKED');
  });

  it('canPlace only on empty BUILDABLE', () => {
    const g = new GridManager(grid);
    expect(g.canPlace({ col: 2, row: 0 })).toBe(true);   // BUILDABLE
    expect(g.canPlace({ col: 1, row: 0 })).toBe(false);  // PATH
    expect(g.canPlace({ col: 0, row: 0 })).toBe(false);  // BLOCKED
  });

  it('occupy blocks further placement until release', () => {
    const g = new GridManager(grid);
    g.occupy({ col: 2, row: 0 }, 7);
    expect(g.canPlace({ col: 2, row: 0 })).toBe(false);
    expect(g.occupantAt({ col: 2, row: 0 })).toBe(7);
    g.release({ col: 2, row: 0 });
    expect(g.canPlace({ col: 2, row: 0 })).toBe(true);
    expect(g.occupantAt({ col: 2, row: 0 })).toBeNull();
  });
});
