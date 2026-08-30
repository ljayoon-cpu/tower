import type { StageDef } from '../../core/types';
import { parseGrid } from './helpers';
import { TILE } from '../../core/constants';

// 1-2와 동일한 맵 골격(재사용). 웨이브 8개, 웨이브5·8에 boss, 전반적으로 밀도↑.
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

export const stage15: StageDef = {
  id: '1-5',
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
  startGold: 300,
  startLives: 20,
  starThresholds: [1.0, 0.7, 0.35],
  waves: [
    { clearBonus: 25, groups: [{ enemy: 'normal', count: 16, intervalMs: 360, startDelayMs: 0 }] },
    {
      clearBonus: 25,
      groups: [
        { enemy: 'fast', count: 16, intervalMs: 220, startDelayMs: 0 },
        { enemy: 'normal', count: 10, intervalMs: 300, startDelayMs: 1500 },
      ],
    },
    { clearBonus: 30, groups: [{ enemy: 'fast', count: 34, intervalMs: 140, startDelayMs: 0 }] },
    {
      clearBonus: 30,
      groups: [
        { enemy: 'normal', count: 18, intervalMs: 220, startDelayMs: 0 },
        { enemy: 'tank', count: 6, intervalMs: 800, startDelayMs: 800 },
      ],
    },
    {
      clearBonus: 70,
      groups: [
        { enemy: 'boss', count: 1, intervalMs: 1, startDelayMs: 0 },
        { enemy: 'fast', count: 22, intervalMs: 160, startDelayMs: 1500 },
      ],
    },
    {
      clearBonus: 35,
      groups: [
        { enemy: 'normal', count: 24, intervalMs: 190, startDelayMs: 0 },
        { enemy: 'fast', count: 18, intervalMs: 160, startDelayMs: 2000 },
      ],
    },
    {
      clearBonus: 40,
      groups: [
        { enemy: 'tank', count: 7, intervalMs: 700, startDelayMs: 0 },
        { enemy: 'normal', count: 20, intervalMs: 190, startDelayMs: 1200 },
      ],
    },
    {
      clearBonus: 120,
      groups: [
        { enemy: 'boss', count: 2, intervalMs: 4000, startDelayMs: 0 },
        { enemy: 'tank', count: 6, intervalMs: 600, startDelayMs: 2000 },
        { enemy: 'fast', count: 24, intervalMs: 140, startDelayMs: 3000 },
      ],
    },
  ],
};
