import type { TileType } from '../../core/types';

const MAP: Record<string, TileType> = { '.': 'BUILDABLE', '#': 'PATH', X: 'BLOCKED' };

/** 그리드 문자열 배열 → TileType[][]. `.`=BUILDABLE, `#`=PATH, `X`=BLOCKED */
export function parseGrid(rows: string[]): TileType[][] {
  return rows.map((r) =>
    [...r].map((ch) => {
      const t = MAP[ch];
      if (!t) throw new Error(`bad grid char: '${ch}'`);
      return t;
    }),
  );
}
