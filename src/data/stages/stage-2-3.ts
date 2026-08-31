import type { StageDef } from '../../core/types';
import { parseGrid } from './helpers';
import { TILE } from '../../core/constants';

// 3갈래. 세 출구를 동시에 지켜야 하는데 골드가 빠듯하다.
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
  '.#...#...#.',
  '.#...#...#.',
  '.#...#...#.',
  '.#...#...#.',
  '.#...#...#.',
  '.#...#...#.',
  '.#...#...#.',
  '.#...#...#.',
  '.#...#...#.',
];

const px = (n: number) => n * TILE + TILE / 2;
const cx = px(5);
const splitY = px(10);
const botY = px(19);

export const stage23: StageDef = {
  id: '2-3',
  grid: parseGrid(rows),
  spawn: { x: cx, y: 0 },
  goals: [{ x: px(1), y: botY }, { x: cx, y: botY }, { x: px(9), y: botY }],
  path: {
    points: [{ x: cx, y: 0 }, { x: cx, y: splitY }],
    branches: [
      { points: [{ x: cx, y: splitY }, { x: px(1), y: splitY }, { x: px(1), y: botY }] },
      { points: [{ x: cx, y: splitY }, { x: cx, y: botY }] },
      { points: [{ x: cx, y: splitY }, { x: px(9), y: splitY }, { x: px(9), y: botY }] },
    ],
  },
  startGold: 320,
  startLives: 20,
  starThresholds: [0.3, 0.6, 0.9],
  waves: [
    { clearBonus: 25, groups: [{ enemy: 'normal', count: 24, intervalMs: 250, startDelayMs: 0 }] },
    {
      clearBonus: 25,
      groups: [
        { enemy: 'fast', count: 26, intervalMs: 130, startDelayMs: 0 },
        { enemy: 'normal', count: 14, intervalMs: 220, startDelayMs: 1300 },
      ],
    },
    {
      clearBonus: 35,
      groups: [
        { enemy: 'tank', count: 11, intervalMs: 520, startDelayMs: 0 },
        { enemy: 'fast', count: 18, intervalMs: 130, startDelayMs: 1200 },
      ],
    },
    {
      clearBonus: 80,
      groups: [
        { enemy: 'boss', count: 1, intervalMs: 1, startDelayMs: 0 },
        { enemy: 'normal', count: 24, intervalMs: 170, startDelayMs: 1400 },
      ],
    },
    { clearBonus: 30, groups: [{ enemy: 'fast', count: 50, intervalMs: 90, startDelayMs: 0 }] },
    {
      clearBonus: 40,
      groups: [
        { enemy: 'tank', count: 14, intervalMs: 460, startDelayMs: 0 },
        { enemy: 'normal', count: 26, intervalMs: 150, startDelayMs: 1300 },
      ],
    },
    {
      clearBonus: 90,
      groups: [
        { enemy: 'boss', count: 2, intervalMs: 3800, startDelayMs: 0 },
        { enemy: 'fast', count: 30, intervalMs: 110, startDelayMs: 1600 },
      ],
    },
    {
      clearBonus: 160,
      groups: [
        { enemy: 'boss', count: 2, intervalMs: 3800, startDelayMs: 0 },
        { enemy: 'tank', count: 10, intervalMs: 460, startDelayMs: 2200 },
        { enemy: 'fast', count: 28, intervalMs: 110, startDelayMs: 3200 },
      ],
    },
  ],
};
