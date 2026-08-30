import type { StageDef } from '../../core/types';
import { parseGrid } from './helpers';
import { TILE } from '../../core/constants';

// col5 세로로 내려오다 row10에서 좌(col1)·우(col9)로 갈라져 바닥(row19)까지 2갈래.
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
  '.#########.',
  '.#.......#.',
  '.#.......#.',
  '.#.......#.',
  '.#.......#.',
  '.#.......#.',
  '.#.......#.',
  '.#.......#.',
  '.#.......#.',
  '.#.......#.',
];

const cx = 5 * TILE + TILE / 2; // 352
const lx = 1 * TILE + TILE / 2; // 96
const rx = 9 * TILE + TILE / 2; // 608
const midY = 10 * TILE + TILE / 2; // 672
const botY = 19 * TILE + TILE / 2; // 1248 -> row 19

export const stage12: StageDef = {
  id: '1-2',
  grid: parseGrid(rows),
  spawn: { x: cx, y: 0 },
  goals: [
    { x: lx, y: botY },
    { x: rx, y: botY },
  ],
  path: {
    points: [
      { x: cx, y: 0 },
      { x: cx, y: midY },
    ],
    branches: [
      {
        points: [
          { x: cx, y: midY },
          { x: lx, y: midY },
          { x: lx, y: botY },
        ],
      },
      {
        points: [
          { x: cx, y: midY },
          { x: rx, y: midY },
          { x: rx, y: botY },
        ],
      },
    ],
  },
  startGold: 230,
  startLives: 20,
  starThresholds: [0.3, 0.65, 1.0],
  waves: [
    { clearBonus: 25, groups: [{ enemy: 'normal', count: 8, intervalMs: 600, startDelayMs: 0 }] },
    {
      clearBonus: 25,
      groups: [
        { enemy: 'normal', count: 6, intervalMs: 450, startDelayMs: 0 },
        { enemy: 'fast', count: 6, intervalMs: 350, startDelayMs: 1500 },
      ],
    },
    { clearBonus: 30, groups: [{ enemy: 'fast', count: 16, intervalMs: 250, startDelayMs: 0 }] },
    {
      clearBonus: 30,
      groups: [
        { enemy: 'normal', count: 10, intervalMs: 350, startDelayMs: 0 },
        { enemy: 'tank', count: 3, intervalMs: 1200, startDelayMs: 800 },
      ],
    },
    {
      clearBonus: 35,
      groups: [
        { enemy: 'fast', count: 20, intervalMs: 200, startDelayMs: 0 },
        { enemy: 'tank', count: 2, intervalMs: 1500, startDelayMs: 3000 },
      ],
    },
    {
      clearBonus: 70,
      groups: [
        { enemy: 'normal', count: 14, intervalMs: 300, startDelayMs: 0 },
        { enemy: 'tank', count: 4, intervalMs: 900, startDelayMs: 1000 },
      ],
    },
  ],
};
