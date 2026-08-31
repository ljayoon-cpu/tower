import type { StageDef } from '../../core/types';
import { parseGrid } from './helpers';
import { TILE } from '../../core/constants';

// 월드 2 피날레. 화면을 두 번 왕복하는 긴 사행 경로 끝에서 둘로 갈라진다.
// 경로가 길어 화력만 충분하면 다 녹지만, 낮은 시작 골드로 그 화력을 내기 어렵다.
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

export const stage24: StageDef = {
  id: '2-4',
  grid: parseGrid(rows),
  spawn: { x: px(5), y: 0 },
  goals: [{ x: px(2), y: botY }, { x: px(8), y: botY }],
  path: {
    points: [
      { x: px(5), y: 0 },
      { x: px(5), y: px(2) },
      { x: px(1), y: px(2) },
      { x: px(1), y: px(6) },
      { x: px(9), y: px(6) },
      { x: px(9), y: px(10) },
      { x: px(1), y: px(10) },
      { x: px(1), y: px(14) },
      { x: px(5), y: px(14) },
      { x: px(5), y: splitY },
    ],
    branches: [
      { points: [{ x: px(5), y: splitY }, { x: px(2), y: splitY }, { x: px(2), y: botY }] },
      { points: [{ x: px(5), y: splitY }, { x: px(8), y: splitY }, { x: px(8), y: botY }] },
    ],
  },
  startGold: 300,
  startLives: 20,
  starThresholds: [0.25, 0.55, 0.85],
  waves: [
    { clearBonus: 25, groups: [{ enemy: 'normal', count: 24, intervalMs: 240, startDelayMs: 0 }] },
    {
      clearBonus: 25,
      groups: [
        { enemy: 'fast', count: 28, intervalMs: 120, startDelayMs: 0 },
        { enemy: 'normal', count: 14, intervalMs: 220, startDelayMs: 1300 },
      ],
    },
    {
      clearBonus: 35,
      groups: [
        { enemy: 'tank', count: 12, intervalMs: 480, startDelayMs: 0 },
        { enemy: 'fast', count: 18, intervalMs: 130, startDelayMs: 1200 },
      ],
    },
    {
      clearBonus: 85,
      groups: [
        { enemy: 'boss', count: 1, intervalMs: 1, startDelayMs: 0 },
        { enemy: 'normal', count: 24, intervalMs: 170, startDelayMs: 1400 },
      ],
    },
    { clearBonus: 30, groups: [{ enemy: 'fast', count: 52, intervalMs: 85, startDelayMs: 0 }] },
    {
      clearBonus: 40,
      groups: [
        { enemy: 'tank', count: 14, intervalMs: 440, startDelayMs: 0 },
        { enemy: 'normal', count: 26, intervalMs: 150, startDelayMs: 1300 },
      ],
    },
    {
      clearBonus: 95,
      groups: [
        { enemy: 'boss', count: 2, intervalMs: 3600, startDelayMs: 0 },
        { enemy: 'fast', count: 30, intervalMs: 105, startDelayMs: 1600 },
      ],
    },
    {
      clearBonus: 50,
      groups: [
        { enemy: 'tank', count: 15, intervalMs: 420, startDelayMs: 0 },
        { enemy: 'fast', count: 26, intervalMs: 110, startDelayMs: 1400 },
      ],
    },
    {
      clearBonus: 55,
      groups: [
        { enemy: 'normal', count: 32, intervalMs: 140, startDelayMs: 0 },
        { enemy: 'tank', count: 9, intervalMs: 480, startDelayMs: 1800 },
      ],
    },
    {
      clearBonus: 180,
      groups: [
        { enemy: 'boss', count: 3, intervalMs: 3400, startDelayMs: 0 },
        { enemy: 'tank', count: 10, intervalMs: 440, startDelayMs: 2200 },
        { enemy: 'fast', count: 30, intervalMs: 105, startDelayMs: 3200 },
      ],
    },
  ],
};
