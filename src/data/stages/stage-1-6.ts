import type { StageDef } from '../../core/types';
import { parseGrid } from './helpers';
import { TILE } from '../../core/constants';

// 월드 1 피날레. 1-2/1-5와 같은 분기 맵을 재사용하되 시작 골드를 크게 줄이고
// 보스를 3기 배치한다. 넓게 깔기만으로는 보스 화력을 못 내므로 머지가 사실상 필수.
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

const cx = 5 * TILE + TILE / 2;
const lx = 1 * TILE + TILE / 2;
const rx = 9 * TILE + TILE / 2;
const midY = 10 * TILE + TILE / 2;
const botY = 19 * TILE + TILE / 2;

export const stage16: StageDef = {
  id: '1-6',
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
      { points: [{ x: cx, y: midY }, { x: lx, y: midY }, { x: lx, y: botY }] },
      { points: [{ x: cx, y: midY }, { x: rx, y: midY }, { x: rx, y: botY }] },
    ],
  },
  startGold: 300,
  startLives: 20,
  starThresholds: [0.3, 0.65, 0.95],
  waves: [
    { clearBonus: 25, groups: [{ enemy: 'normal', count: 18, intervalMs: 320, startDelayMs: 0 }] },
    {
      clearBonus: 25,
      groups: [
        { enemy: 'fast', count: 20, intervalMs: 170, startDelayMs: 0 },
        { enemy: 'normal', count: 12, intervalMs: 260, startDelayMs: 1600 },
      ],
    },
    {
      clearBonus: 35,
      groups: [
        { enemy: 'tank', count: 8, intervalMs: 650, startDelayMs: 0 },
        { enemy: 'fast', count: 18, intervalMs: 150, startDelayMs: 1200 },
      ],
    },
    {
      clearBonus: 80,
      groups: [
        { enemy: 'boss', count: 1, intervalMs: 1, startDelayMs: 0 },
        { enemy: 'normal', count: 20, intervalMs: 200, startDelayMs: 1400 },
      ],
    },
    { clearBonus: 30, groups: [{ enemy: 'fast', count: 40, intervalMs: 110, startDelayMs: 0 }] },
    {
      clearBonus: 40,
      groups: [
        { enemy: 'tank', count: 10, intervalMs: 550, startDelayMs: 0 },
        { enemy: 'normal', count: 24, intervalMs: 170, startDelayMs: 1500 },
      ],
    },
    {
      clearBonus: 90,
      groups: [
        { enemy: 'boss', count: 1, intervalMs: 1, startDelayMs: 0 },
        { enemy: 'fast', count: 30, intervalMs: 120, startDelayMs: 1800 },
      ],
    },
    {
      clearBonus: 45,
      groups: [
        { enemy: 'tank', count: 12, intervalMs: 500, startDelayMs: 0 },
        { enemy: 'fast', count: 24, intervalMs: 130, startDelayMs: 1500 },
      ],
    },
    {
      clearBonus: 150,
      groups: [
        { enemy: 'boss', count: 2, intervalMs: 4500, startDelayMs: 0 },
        { enemy: 'tank', count: 8, intervalMs: 520, startDelayMs: 2200 },
        { enemy: 'fast', count: 26, intervalMs: 130, startDelayMs: 3200 },
      ],
    },
  ],
};
