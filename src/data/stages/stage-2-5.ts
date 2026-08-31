import type { StageDef } from '../../core/types';
import { parseGrid } from './helpers';
import { TILE } from '../../core/constants';

// 월드 2 보스 결전. 긴 사행로는 준비할 시간을 주지만, 지휘관이 돌격하면
// 마지막 직선 구간을 빠르게 뚫는다. 광역·저격·독·감속을 섞어야 안정적으로 막는다.
const rows = [
  '.....#.....',
  '.....#.....',
  '.#####.....',
  '.#.........',
  '.#.........',
  '.#.........',
  '.#########.',
  '.........#.',
  '.........#.',
  '.........#.',
  '.#########.',
  '.#.........',
  '.#.........',
  '.#.........',
  '.#####.....',
  '..#######..',
  '..#.....#..',
  '..#.....#..',
  '..#.....#..',
  '..#.....#..',
];

const px = (n: number) => n * TILE + TILE / 2;
const splitY = px(15);
const botY = px(19);

export const stage25: StageDef = {
  id: '2-5',
  grid: parseGrid(rows),
  spawn: { x: px(5), y: 0 },
  goals: [{ x: px(2), y: botY }, { x: px(8), y: botY }],
  path: {
    points: [
      { x: px(5), y: 0 }, { x: px(5), y: px(2) }, { x: px(1), y: px(2) },
      { x: px(1), y: px(6) }, { x: px(9), y: px(6) }, { x: px(9), y: px(10) },
      { x: px(1), y: px(10) }, { x: px(1), y: px(14) }, { x: px(5), y: px(14) }, { x: px(5), y: splitY },
    ],
    branches: [
      { points: [{ x: px(5), y: splitY }, { x: px(2), y: splitY }, { x: px(2), y: botY }] },
      { points: [{ x: px(5), y: splitY }, { x: px(8), y: splitY }, { x: px(8), y: botY }] },
    ],
  },
  startGold: 320,
  startLives: 18,
  starThresholds: [0.3, 0.65, 0.95],
  waves: [
    {
      clearBonus: 35,
      groups: [
        { enemy: 'shield', count: 18, intervalMs: 280, startDelayMs: 0, shieldMultiplier: 1.2 },
        { enemy: 'fast', count: 22, intervalMs: 110, startDelayMs: 1300, speedMultiplier: 1.12 },
      ],
    },
    {
      clearBonus: 45,
      groups: [
        { enemy: 'tank', count: 10, intervalMs: 520, startDelayMs: 0, hpMultiplier: 1.18 },
        { enemy: 'regenerator', count: 10, intervalMs: 430, startDelayMs: 1500, hpMultiplier: 1.12 },
      ],
    },
    {
      clearBonus: 60,
      groups: [
        { enemy: 'summoner', count: 8, intervalMs: 780, startDelayMs: 0, hpMultiplier: 1.18 },
        { enemy: 'fast', count: 28, intervalMs: 100, startDelayMs: 1700, speedMultiplier: 1.18 },
      ],
    },
    {
      clearBonus: 110,
      groups: [
        { enemy: 'boss', count: 1, intervalMs: 1, startDelayMs: 0, hpMultiplier: 1.32, shieldMultiplier: 1.2 },
        { enemy: 'shield', count: 10, intervalMs: 300, startDelayMs: 1500, shieldMultiplier: 1.25 },
      ],
    },
    {
      clearBonus: 240,
      groups: [
        { enemy: 'boss', count: 1, intervalMs: 1, startDelayMs: 0, hpMultiplier: 1.7, shieldMultiplier: 1.35 },
        { enemy: 'tank', count: 8, intervalMs: 500, startDelayMs: 1800, hpMultiplier: 1.25 },
        { enemy: 'summoner', count: 6, intervalMs: 760, startDelayMs: 3200, hpMultiplier: 1.2 },
      ],
    },
  ],
};
