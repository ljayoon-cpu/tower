import type { StageDef } from '../../core/types';
import { parseGrid } from './helpers';
import { TILE } from '../../core/constants';

// 1-2와 동일한 맵 골격(재사용). 웨이브 8개, 웨이브5에 boss, 마지막 웨이브 tank 6기.
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

export const stage14: StageDef = {
  id: '1-4',
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
  startGold: 280,
  startLives: 20,
  starThresholds: [0.3, 0.65, 1.0],
  waves: [
    { clearBonus: 25, groups: [{ enemy: 'normal', count: 12, intervalMs: 450, startDelayMs: 0 }] },
    {
      clearBonus: 25,
      groups: [
        { enemy: 'fast', count: 12, intervalMs: 280, startDelayMs: 0 },
        { enemy: 'normal', count: 8, intervalMs: 380, startDelayMs: 1500 },
      ],
    },
    { clearBonus: 30, groups: [{ enemy: 'fast', count: 26, intervalMs: 180, startDelayMs: 0 }] },
    {
      clearBonus: 30,
      groups: [
        { enemy: 'normal', count: 14, intervalMs: 280, startDelayMs: 0 },
        { enemy: 'tank', count: 4, intervalMs: 1000, startDelayMs: 800 },
      ],
    },
    {
      clearBonus: 60,
      groups: [
        { enemy: 'boss', count: 1, intervalMs: 1, startDelayMs: 0 },
        { enemy: 'fast', count: 16, intervalMs: 200, startDelayMs: 1500 },
      ],
    },
    {
      clearBonus: 35,
      groups: [
        { enemy: 'normal', count: 18, intervalMs: 240, startDelayMs: 0 },
        { enemy: 'fast', count: 14, intervalMs: 200, startDelayMs: 2000 },
      ],
    },
    {
      clearBonus: 40,
      groups: [
        { enemy: 'tank', count: 5, intervalMs: 900, startDelayMs: 0 },
        { enemy: 'normal', count: 16, intervalMs: 240, startDelayMs: 1200 },
      ],
    },
    {
      clearBonus: 90,
      groups: [
        { enemy: 'tank', count: 6, intervalMs: 750, startDelayMs: 0 },
        { enemy: 'fast', count: 20, intervalMs: 180, startDelayMs: 1500 },
      ],
    },
  ],
};
