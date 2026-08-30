import type { StageDef } from '../../core/types';
import { parseGrid } from './helpers';
import { TILE } from '../../core/constants';

// 튜토리얼: col5 세로 직선 단일 경로. 스폰 = 맨 위 중앙, goal = 맨 아래 중앙.
const rows = [
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
];

const cx = 5 * TILE + TILE / 2; // 352
const topY = 0;
const botY = 19 * TILE + TILE / 2; // 1248 -> row 19 (grid is rows 0..19)

export const stage11: StageDef = {
  id: '1-1',
  grid: parseGrid(rows),
  spawn: { x: cx, y: topY },
  goals: [{ x: cx, y: botY }],
  path: { points: [{ x: cx, y: topY }, { x: cx, y: botY }] },
  startGold: 200,
  startLives: 20,
  starThresholds: [1.0, 0.6, 0.3],
  waves: [
    { clearBonus: 25, groups: [{ enemy: 'normal', count: 6, intervalMs: 700, startDelayMs: 0 }] },
    { clearBonus: 25, groups: [{ enemy: 'normal', count: 8, intervalMs: 600, startDelayMs: 0 }] },
    {
      clearBonus: 30,
      groups: [
        { enemy: 'normal', count: 6, intervalMs: 500, startDelayMs: 0 },
        { enemy: 'fast', count: 4, intervalMs: 400, startDelayMs: 2500 },
      ],
    },
    { clearBonus: 30, groups: [{ enemy: 'fast', count: 12, intervalMs: 350, startDelayMs: 0 }] },
    {
      clearBonus: 50,
      groups: [
        { enemy: 'normal', count: 10, intervalMs: 400, startDelayMs: 0 },
        { enemy: 'tank', count: 2, intervalMs: 1500, startDelayMs: 1000 },
      ],
    },
  ],
};
