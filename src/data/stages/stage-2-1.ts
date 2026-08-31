import type { StageDef } from '../../core/types';
import { parseGrid } from './helpers';
import { TILE } from '../../core/constants';

// 월드 2 진입. 길고 구불구불한 단일 경로 — 분기는 없지만 코너마다 사거리가 닿게
// 배치해야 한다. 경로가 길어 초반 처리 시간은 넉넉하다.
const rows = [
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.#####.....',
  '.#.........',
  '.#.........',
  '.#.........',
  '.#.........',
  '.#########.',
  '.........#.',
  '.........#.',
  '.........#.',
  '.........#.',
  '.#########.',
  '.#.........',
  '.#.........',
  '.#.........',
  '.#.........',
  '.#.........',
];

const px = (n: number) => n * TILE + TILE / 2;

export const stage21: StageDef = {
  id: '2-1',
  grid: parseGrid(rows),
  spawn: { x: px(5), y: 0 },
  goals: [{ x: px(1), y: px(19) }],
  path: {
    points: [
      { x: px(5), y: 0 },
      { x: px(5), y: px(4) },
      { x: px(1), y: px(4) },
      { x: px(1), y: px(9) },
      { x: px(9), y: px(9) },
      { x: px(9), y: px(14) },
      { x: px(1), y: px(14) },
      { x: px(1), y: px(19) },
    ],
  },
  startGold: 300,
  startLives: 20,
  starThresholds: [0.35, 0.7, 1.0],
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
        { enemy: 'tank', count: 9, intervalMs: 600, startDelayMs: 0 },
        { enemy: 'fast', count: 18, intervalMs: 140, startDelayMs: 1300 },
      ],
    },
    {
      clearBonus: 75,
      groups: [
        { enemy: 'boss', count: 1, intervalMs: 1, startDelayMs: 0 },
        { enemy: 'normal', count: 22, intervalMs: 190, startDelayMs: 1500 },
      ],
    },
    { clearBonus: 30, groups: [{ enemy: 'fast', count: 42, intervalMs: 110, startDelayMs: 0 }] },
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
        { enemy: 'fast', count: 28, intervalMs: 120, startDelayMs: 0 },
        { enemy: 'tank', count: 8, intervalMs: 560, startDelayMs: 1600 },
      ],
    },
    {
      clearBonus: 130,
      groups: [
        { enemy: 'boss', count: 2, intervalMs: 4500, startDelayMs: 0 },
        { enemy: 'tank', count: 8, intervalMs: 520, startDelayMs: 2000 },
        { enemy: 'fast', count: 24, intervalMs: 130, startDelayMs: 3000 },
      ],
    },
  ],
};
