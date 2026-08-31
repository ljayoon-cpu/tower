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
  startGold: 360,
  // 보스 두 마리(목표 피해 6)를 모두 놓치면 생명이 0이 된다.
  // 보스전을 잡지 않고 잔여 생명으로 통과하는 전략은 허용하지 않는다.
  startLives: 12,
  starThresholds: [0.3, 0.6, 0.9],
  bossStage: true,
  waves: [
    { clearBonus: 30, groups: [{ enemy: 'normal', count: 18, intervalMs: 320, startDelayMs: 0 }] },
    {
      clearBonus: 35,
      groups: [
        { enemy: 'shield', count: 12, intervalMs: 340, startDelayMs: 0 },
        { enemy: 'fast', count: 16, intervalMs: 170, startDelayMs: 1600 },
      ],
    },
    {
      clearBonus: 45,
      groups: [
        { enemy: 'tank', count: 8, intervalMs: 640, startDelayMs: 0 },
        { enemy: 'regenerator', count: 8, intervalMs: 520, startDelayMs: 1600 },
      ],
    },
    {
      clearBonus: 55,
      groups: [
        { enemy: 'summoner', count: 6, intervalMs: 900, startDelayMs: 0 },
        { enemy: 'fast', count: 22, intervalMs: 140, startDelayMs: 1800 },
      ],
    },
    {
      clearBonus: 90,
      groups: [
        { enemy: 'boss', count: 1, intervalMs: 1, startDelayMs: 0 },
        { enemy: 'shield', count: 10, intervalMs: 340, startDelayMs: 1600 },
      ],
    },
    {
      clearBonus: 50,
      groups: [
        { enemy: 'tank', count: 10, intervalMs: 520, startDelayMs: 0 },
        { enemy: 'regenerator', count: 8, intervalMs: 480, startDelayMs: 1500 },
      ],
    },
    {
      clearBonus: 60,
      groups: [
        { enemy: 'summoner', count: 7, intervalMs: 800, startDelayMs: 0 },
        { enemy: 'fast', count: 26, intervalMs: 120, startDelayMs: 1700 },
      ],
    },
    {
      clearBonus: 240,
      groups: [
        { enemy: 'boss', count: 1, intervalMs: 1, startDelayMs: 0, hpMultiplier: 1.6, shieldMultiplier: 1.2 },
        { enemy: 'shield', count: 10, intervalMs: 320, startDelayMs: 2000 },
        { enemy: 'summoner', count: 5, intervalMs: 820, startDelayMs: 3600 },
      ],
    },
  ],
};
