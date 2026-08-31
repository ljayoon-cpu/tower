import type { StageDef } from '../../core/types';
import { parseGrid } from './helpers';
import { TILE } from '../../core/constants';

// 월드 1 피날레. 긴 트렁크 끝에서 한 번 갈라지고 각 갈래가 다시 둘로 — 출구 4개.
// 갈림목이 낮아 트렁크에서 처리하지 못한 적은 순식간에 네 방향으로 샌다.
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
  '.#########.',
  '.#.#...#.#.',
  '.#.#...#.#.',
  '.#.#...#.#.',
  '.#.#...#.#.',
  '.#.#...#.#.',
];

const px = (col: number) => col * TILE + TILE / 2;
const spineY = 14 * TILE + TILE / 2; // 928
const botY = 19 * TILE + TILE / 2; // 1248
const c5 = px(5);

export const stage18: StageDef = {
  id: '1-8',
  grid: parseGrid(rows),
  spawn: { x: c5, y: 0 },
  goals: [
    { x: px(1), y: botY },
    { x: px(3), y: botY },
    { x: px(9), y: botY },
    { x: px(7), y: botY },
  ],
  path: {
    points: [
      { x: c5, y: 0 },
      { x: c5, y: spineY },
    ],
    branches: [
      {
        points: [{ x: c5, y: spineY }, { x: px(3), y: spineY }],
        branches: [
          { points: [{ x: px(3), y: spineY }, { x: px(1), y: spineY }, { x: px(1), y: botY }] },
          { points: [{ x: px(3), y: spineY }, { x: px(3), y: botY }] },
        ],
      },
      {
        points: [{ x: c5, y: spineY }, { x: px(7), y: spineY }],
        branches: [
          { points: [{ x: px(7), y: spineY }, { x: px(9), y: spineY }, { x: px(9), y: botY }] },
          { points: [{ x: px(7), y: spineY }, { x: px(7), y: botY }] },
        ],
      },
    ],
  },
  startGold: 340,
  startLives: 20,
  starThresholds: [0.3, 0.6, 0.9],
  waves: [
    { clearBonus: 25, groups: [{ enemy: 'normal', count: 22, intervalMs: 300, startDelayMs: 0 }] },
    {
      clearBonus: 25,
      groups: [
        { enemy: 'fast', count: 22, intervalMs: 150, startDelayMs: 0 },
        { enemy: 'normal', count: 12, intervalMs: 250, startDelayMs: 1500 },
      ],
    },
    {
      clearBonus: 35,
      groups: [
        { enemy: 'tank', count: 8, intervalMs: 640, startDelayMs: 0 },
        { enemy: 'fast', count: 16, intervalMs: 150, startDelayMs: 1400 },
      ],
    },
    {
      clearBonus: 80,
      groups: [
        { enemy: 'boss', count: 1, intervalMs: 1, startDelayMs: 0 },
        { enemy: 'normal', count: 20, intervalMs: 200, startDelayMs: 1500 },
      ],
    },
    { clearBonus: 30, groups: [{ enemy: 'fast', count: 42, intervalMs: 110, startDelayMs: 0 }] },
    {
      clearBonus: 40,
      groups: [
        { enemy: 'tank', count: 10, intervalMs: 560, startDelayMs: 0 },
        { enemy: 'normal', count: 22, intervalMs: 180, startDelayMs: 1400 },
      ],
    },
    {
      clearBonus: 90,
      groups: [
        { enemy: 'boss', count: 1, intervalMs: 1, startDelayMs: 0 },
        { enemy: 'fast', count: 28, intervalMs: 120, startDelayMs: 1700 },
      ],
    },
    {
      clearBonus: 45,
      groups: [
        { enemy: 'tank', count: 11, intervalMs: 500, startDelayMs: 0 },
        { enemy: 'fast', count: 24, intervalMs: 130, startDelayMs: 1500 },
      ],
    },
    {
      clearBonus: 50,
      groups: [
        { enemy: 'normal', count: 26, intervalMs: 160, startDelayMs: 0 },
        { enemy: 'tank', count: 7, intervalMs: 540, startDelayMs: 1800 },
      ],
    },
    {
      clearBonus: 160,
      groups: [
        { enemy: 'boss', count: 3, intervalMs: 3800, startDelayMs: 0 },
        { enemy: 'tank', count: 9, intervalMs: 500, startDelayMs: 2200 },
        { enemy: 'fast', count: 26, intervalMs: 120, startDelayMs: 3200 },
      ],
    },
  ],
};
