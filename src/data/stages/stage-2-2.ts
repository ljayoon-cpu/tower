import type { StageDef } from '../../core/types';
import { parseGrid } from './helpers';
import { TILE } from '../../core/constants';

// 2갈래. 두 갈래 사이에 바위 기둥(BLOCKED)이 박혀 갈림길 아래쪽 타워 자리가 절반뿐 —
// 넓게 깔 공간이 없어 갈래 방어는 머지로 화력을 압축해야 한다.
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
  '.#.X.X.X.#.',
  '.#.X.X.X.#.',
  '.#.X.X.X.#.',
  '.#.X.X.X.#.',
  '.#.X.X.X.#.',
  '.#.X.X.X.#.',
  '.#.X.X.X.#.',
  '.#.X.X.X.#.',
  '.#.X.X.X.#.',
];

const px = (n: number) => n * TILE + TILE / 2;
const cx = px(5);
const lx = px(1);
const rx = px(9);
const midY = px(10);
const botY = px(19);

export const stage22: StageDef = {
  id: '2-2',
  grid: parseGrid(rows),
  spawn: { x: cx, y: 0 },
  goals: [{ x: lx, y: botY }, { x: rx, y: botY }],
  path: {
    points: [{ x: cx, y: 0 }, { x: cx, y: midY }],
    branches: [
      { points: [{ x: cx, y: midY }, { x: lx, y: midY }, { x: lx, y: botY }] },
      { points: [{ x: cx, y: midY }, { x: rx, y: midY }, { x: rx, y: botY }] },
    ],
  },
  startGold: 320,
  startLives: 20,
  starThresholds: [0.3, 0.65, 0.95],
  waves: [
    { clearBonus: 25, groups: [{ enemy: 'normal', count: 18, intervalMs: 300, startDelayMs: 0 }] },
    {
      clearBonus: 25,
      groups: [
        { enemy: 'fast', count: 18, intervalMs: 180, startDelayMs: 0 },
        { enemy: 'normal', count: 10, intervalMs: 280, startDelayMs: 1800 },
      ],
    },
    {
      clearBonus: 35,
      groups: [
        { enemy: 'tank', count: 7, intervalMs: 720, startDelayMs: 0 },
        { enemy: 'fast', count: 16, intervalMs: 170, startDelayMs: 1400 },
      ],
    },
    {
      clearBonus: 80,
      groups: [
        { enemy: 'boss', count: 1, intervalMs: 1, startDelayMs: 0 },
        { enemy: 'normal', count: 18, intervalMs: 220, startDelayMs: 1600 },
      ],
    },
    { clearBonus: 30, groups: [{ enemy: 'fast', count: 34, intervalMs: 130, startDelayMs: 0 }] },
    {
      clearBonus: 40,
      groups: [
        { enemy: 'tank', count: 9, intervalMs: 620, startDelayMs: 0 },
        { enemy: 'normal', count: 20, intervalMs: 200, startDelayMs: 1400 },
      ],
    },
    {
      clearBonus: 90,
      groups: [
        { enemy: 'boss', count: 1, intervalMs: 1, startDelayMs: 0 },
        { enemy: 'fast', count: 24, intervalMs: 140, startDelayMs: 1700 },
      ],
    },
    {
      clearBonus: 150,
      groups: [
        { enemy: 'boss', count: 2, intervalMs: 4200, startDelayMs: 0 },
        { enemy: 'tank', count: 7, intervalMs: 560, startDelayMs: 2200 },
        { enemy: 'fast', count: 22, intervalMs: 140, startDelayMs: 3200 },
      ],
    },
  ],
};
