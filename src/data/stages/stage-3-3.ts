import type { StageDef } from '../../core/types';
import { parseGrid } from './helpers';
import { TILE } from '../../core/constants';

// 포격 비행정(gunship) 등장. 3-1과 다른 우측 진입 사행로 — 위→우→좌→우로 세 번 꺾여
// 내려가며 우하단으로 빠진다. 장갑 비행정이 3웨이브부터 2 → 3 → 4기로 늘며 지상 공성
// 골렘과 함께 압박한다. 대공 화력과 지상 폭발/저격을 나눠 배치하지 않으면 후반이 버겁다.
const rows = [
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#####.',
  '.........#.',
  '.........#.',
  '.........#.',
  '.........#.',
  '.#########.',
  '.#.........',
  '.#.........',
  '.#.........',
  '.#.........',
  '.#########.',
  '.........#.',
  '.........#.',
  '.........#.',
  '.........#.',
  '.........#.',
  '.........#.',
];

const px = (n: number) => n * TILE + TILE / 2;

export const stage33: StageDef = {
  id: '3-3',
  grid: parseGrid(rows),
  spawn: { x: px(5), y: 0 },
  goals: [{ x: px(9), y: px(19) }],
  path: {
    points: [
      { x: px(5), y: 0 },
      { x: px(5), y: px(3) },
      { x: px(9), y: px(3) },
      { x: px(9), y: px(8) },
      { x: px(1), y: px(8) },
      { x: px(1), y: px(13) },
      { x: px(9), y: px(13) },
      { x: px(9), y: px(19) },
    ],
  },
  startGold: 350,
  startLives: 20,
  starThresholds: [0.3, 0.6, 1.0],
  waves: [
    { clearBonus: 30, groups: [{ enemy: 'normal', count: 18, intervalMs: 300, startDelayMs: 0 }] },
    {
      clearBonus: 30,
      groups: [
        { enemy: 'drone', count: 16, intervalMs: 260, startDelayMs: 0 },
        { enemy: 'fast', count: 12, intervalMs: 200, startDelayMs: 1400 },
      ],
    },
    {
      clearBonus: 40,
      groups: [
        { enemy: 'gunship', count: 2, intervalMs: 1400, startDelayMs: 0 },
        { enemy: 'tank', count: 4, intervalMs: 800, startDelayMs: 500 },
      ],
    },
    {
      clearBonus: 45,
      groups: [
        { enemy: 'gunship', count: 3, intervalMs: 1300, startDelayMs: 0 },
        { enemy: 'normal', count: 16, intervalMs: 260, startDelayMs: 1200 },
        { enemy: 'drone', count: 10, intervalMs: 300, startDelayMs: 2400 },
      ],
    },
    {
      clearBonus: 55,
      groups: [
        { enemy: 'gunship', count: 4, intervalMs: 1200, startDelayMs: 0 },
        { enemy: 'tank', count: 6, intervalMs: 700, startDelayMs: 1500 },
      ],
    },
    {
      clearBonus: 60,
      groups: [
        { enemy: 'drone', count: 22, intervalMs: 200, startDelayMs: 0 },
        { enemy: 'fast', count: 18, intervalMs: 150, startDelayMs: 1600 },
        { enemy: 'tank', count: 4, intervalMs: 900, startDelayMs: 2500 },
      ],
    },
    {
      clearBonus: 100,
      groups: [
        { enemy: 'gunship', count: 5, intervalMs: 1100, startDelayMs: 0 },
        { enemy: 'drone', count: 24, intervalMs: 220, startDelayMs: 1500 },
        { enemy: 'tank', count: 6, intervalMs: 700, startDelayMs: 3000 },
      ],
    },
  ],
};
