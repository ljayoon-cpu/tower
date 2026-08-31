import type { StageDef } from '../../core/types';
import { parseGrid } from './helpers';
import { TILE } from '../../core/constants';

// 3갈래 분기 맵. 세 출구를 동시에 막아야 해서 화력을 한곳에 몰기 어렵다 —
// 배치 판단이 핵심. 중앙 트렁크가 길어 초반에 때릴 시간은 충분하다.
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

const cx = 5 * TILE + TILE / 2; // 352
const lx = 1 * TILE + TILE / 2; // 96
const rx = 9 * TILE + TILE / 2; // 608
const splitY = 10 * TILE + TILE / 2; // 672
const botY = 19 * TILE + TILE / 2; // 1248

export const stage17: StageDef = {
  id: '1-7',
  grid: parseGrid(rows),
  spawn: { x: cx, y: 0 },
  goals: [
    { x: lx, y: botY },
    { x: cx, y: botY },
    { x: rx, y: botY },
  ],
  path: {
    points: [
      { x: cx, y: 0 },
      { x: cx, y: splitY },
    ],
    branches: [
      { points: [{ x: cx, y: splitY }, { x: lx, y: splitY }, { x: lx, y: botY }] },
      { points: [{ x: cx, y: splitY }, { x: cx, y: botY }] },
      { points: [{ x: cx, y: splitY }, { x: rx, y: splitY }, { x: rx, y: botY }] },
    ],
  },
  startGold: 320,
  startLives: 20,
  starThresholds: [0.3, 0.65, 0.95],
  waves: [
    { clearBonus: 25, groups: [{ enemy: 'normal', count: 20, intervalMs: 300, startDelayMs: 0 }] },
    {
      clearBonus: 25,
      groups: [
        { enemy: 'fast', count: 22, intervalMs: 150, startDelayMs: 0 },
        { enemy: 'normal', count: 12, intervalMs: 260, startDelayMs: 1500 },
      ],
    },
    {
      clearBonus: 35,
      groups: [
        { enemy: 'tank', count: 8, intervalMs: 620, startDelayMs: 0 },
        { enemy: 'fast', count: 16, intervalMs: 150, startDelayMs: 1400 },
      ],
    },
    {
      clearBonus: 75,
      groups: [
        { enemy: 'boss', count: 1, intervalMs: 1, startDelayMs: 0 },
        { enemy: 'normal', count: 22, intervalMs: 190, startDelayMs: 1500 },
      ],
    },
    { clearBonus: 30, groups: [{ enemy: 'fast', count: 44, intervalMs: 100, startDelayMs: 0 }] },
    {
      clearBonus: 40,
      groups: [
        { enemy: 'tank', count: 11, intervalMs: 520, startDelayMs: 0 },
        { enemy: 'normal', count: 24, intervalMs: 170, startDelayMs: 1400 },
      ],
    },
    {
      clearBonus: 45,
      groups: [
        { enemy: 'fast', count: 30, intervalMs: 120, startDelayMs: 0 },
        { enemy: 'tank', count: 8, intervalMs: 560, startDelayMs: 1800 },
      ],
    },
    {
      clearBonus: 140,
      groups: [
        { enemy: 'boss', count: 2, intervalMs: 4200, startDelayMs: 0 },
        { enemy: 'tank', count: 8, intervalMs: 520, startDelayMs: 2000 },
        { enemy: 'fast', count: 26, intervalMs: 130, startDelayMs: 3000 },
      ],
    },
  ],
};
