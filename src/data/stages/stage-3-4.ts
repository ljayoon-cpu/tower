import type { StageDef } from '../../core/types';
import { parseGrid } from './helpers';
import { TILE } from '../../core/constants';

// 지상·공중 동시 압박. stage-2-5의 긴 사행로 + 하단 분기 골격 재사용. 매 웨이브가
// 지상(공성 골렘·추적 사냥개)과 공중(정찰 비행체·포격 비행정)을 함께 밀어붙이고,
// 마지막에 갈라지는 두 출구를 모두 지켜야 한다. 보스는 없다 — 3-7 공중 기함의 전초전.
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

export const stage34: StageDef = {
  id: '3-4',
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
  startLives: 20,
  starThresholds: [0.3, 0.6, 0.9],
  waves: [
    {
      clearBonus: 30,
      groups: [
        { enemy: 'normal', count: 16, intervalMs: 280, startDelayMs: 0 },
        { enemy: 'drone', count: 10, intervalMs: 320, startDelayMs: 1200 },
      ],
    },
    {
      clearBonus: 35,
      groups: [
        { enemy: 'fast', count: 18, intervalMs: 160, startDelayMs: 0 },
        { enemy: 'drone', count: 14, intervalMs: 260, startDelayMs: 1400 },
      ],
    },
    {
      clearBonus: 40,
      groups: [
        { enemy: 'tank', count: 5, intervalMs: 800, startDelayMs: 0 },
        { enemy: 'gunship', count: 2, intervalMs: 1400, startDelayMs: 1000 },
      ],
    },
    {
      clearBonus: 50,
      groups: [
        { enemy: 'normal', count: 18, intervalMs: 240, startDelayMs: 0 },
        { enemy: 'drone', count: 18, intervalMs: 220, startDelayMs: 1200 },
        { enemy: 'gunship', count: 2, intervalMs: 1500, startDelayMs: 2600 },
      ],
    },
    {
      clearBonus: 55,
      groups: [
        { enemy: 'tank', count: 6, intervalMs: 700, startDelayMs: 0 },
        { enemy: 'gunship', count: 3, intervalMs: 1300, startDelayMs: 1200 },
        { enemy: 'fast', count: 16, intervalMs: 150, startDelayMs: 2400 },
      ],
    },
    {
      clearBonus: 60,
      groups: [
        { enemy: 'drone', count: 24, intervalMs: 200, startDelayMs: 0 },
        { enemy: 'fast', count: 20, intervalMs: 150, startDelayMs: 1500 },
        { enemy: 'tank', count: 4, intervalMs: 900, startDelayMs: 2800 },
      ],
    },
    {
      clearBonus: 70,
      groups: [
        { enemy: 'gunship', count: 4, intervalMs: 1200, startDelayMs: 0 },
        { enemy: 'tank', count: 6, intervalMs: 650, startDelayMs: 1400 },
        { enemy: 'drone', count: 16, intervalMs: 240, startDelayMs: 2600 },
      ],
    },
    {
      clearBonus: 120,
      groups: [
        { enemy: 'gunship', count: 5, intervalMs: 1100, startDelayMs: 0 },
        { enemy: 'tank', count: 8, intervalMs: 600, startDelayMs: 1500 },
        { enemy: 'drone', count: 22, intervalMs: 200, startDelayMs: 2800 },
        { enemy: 'fast', count: 18, intervalMs: 150, startDelayMs: 4200 },
      ],
    },
  ],
};
