import type { StageDef } from '../../core/types';
import { parseGrid } from './helpers';
import { TILE } from '../../core/constants';

// 1-2와 동일한 맵 골격(재사용). 웨이브만 7개로 강화.
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

export const stage13: StageDef = {
  id: '1-3',
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
  startGold: 250,
  startLives: 20,
  starThresholds: [0.3, 0.65, 1.0],
  waves: [
    { clearBonus: 25, groups: [{ enemy: 'normal', count: 10, intervalMs: 500, startDelayMs: 0 }] },
    {
      clearBonus: 25,
      groups: [
        { enemy: 'fast', count: 10, intervalMs: 300, startDelayMs: 0 },
        { enemy: 'normal', count: 6, intervalMs: 400, startDelayMs: 1500 },
      ],
    },
    { clearBonus: 30, groups: [{ enemy: 'fast', count: 22, intervalMs: 200, startDelayMs: 0 }] },
    {
      clearBonus: 30,
      groups: [
        { enemy: 'normal', count: 12, intervalMs: 300, startDelayMs: 0 },
        { enemy: 'tank', count: 4, intervalMs: 1100, startDelayMs: 800 },
      ],
    },
    {
      clearBonus: 35,
      groups: [
        { enemy: 'fast', count: 24, intervalMs: 180, startDelayMs: 0 },
        { enemy: 'tank', count: 3, intervalMs: 1300, startDelayMs: 2500 },
      ],
    },
    {
      clearBonus: 40,
      groups: [
        { enemy: 'normal', count: 16, intervalMs: 260, startDelayMs: 0 },
        { enemy: 'fast', count: 12, intervalMs: 220, startDelayMs: 2000 },
      ],
    },
    {
      clearBonus: 80,
      groups: [
        { enemy: 'tank', count: 6, intervalMs: 800, startDelayMs: 0 },
        { enemy: 'normal', count: 18, intervalMs: 250, startDelayMs: 1000 },
      ],
    },
  ],
};
