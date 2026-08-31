import type { StageDef } from '../../core/types';
import { parseGrid } from './helpers';
import { TILE } from '../../core/constants';

// 강하 수송선(carrier) 관문. 격추당한 수송선은 죽는 자리에서 지상 조립 드론 3기를
// 쏟아낸다 — 대공 화력만 쌓으면 지상으로 새는 잡졸에 무너지고, 지상 커버만 두면
// 수송선을 못 잡는다. 3-1을 좌우로 뒤집은 사행로: 중앙 진입 후 오른쪽으로 먼저 돈다.
const rows = [
  '.....#.....',
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
];

const px = (n: number) => n * TILE + TILE / 2;

export const stage35: StageDef = {
  id: '3-5',
  grid: parseGrid(rows),
  spawn: { x: px(5), y: 0 },
  goals: [{ x: px(9), y: px(19) }],
  path: {
    points: [
      { x: px(5), y: 0 },
      { x: px(5), y: px(4) },
      { x: px(9), y: px(4) },
      { x: px(9), y: px(9) },
      { x: px(1), y: px(9) },
      { x: px(1), y: px(14) },
      { x: px(9), y: px(14) },
      { x: px(9), y: px(19) },
    ],
  },
  startGold: 370,
  startLives: 20,
  starThresholds: [0.3, 0.65, 1.0],
  waves: [
    {
      clearBonus: 30,
      groups: [
        { enemy: 'normal', count: 16, intervalMs: 300, startDelayMs: 0 },
        { enemy: 'drone', count: 10, intervalMs: 320, startDelayMs: 1400 },
      ],
    },
    {
      clearBonus: 35,
      groups: [
        { enemy: 'carrier', count: 2, intervalMs: 1600, startDelayMs: 0 },
        { enemy: 'normal', count: 14, intervalMs: 280, startDelayMs: 1200 },
      ],
    },
    {
      clearBonus: 40,
      groups: [
        { enemy: 'drone', count: 20, intervalMs: 220, startDelayMs: 0 },
        { enemy: 'fast', count: 16, intervalMs: 160, startDelayMs: 1600 },
      ],
    },
    {
      clearBonus: 50,
      groups: [
        { enemy: 'carrier', count: 3, intervalMs: 1500, startDelayMs: 0 },
        { enemy: 'tank', count: 5, intervalMs: 800, startDelayMs: 1000 },
      ],
    },
    {
      clearBonus: 55,
      groups: [
        { enemy: 'gunship', count: 2, intervalMs: 1400, startDelayMs: 0 },
        { enemy: 'drone', count: 18, intervalMs: 220, startDelayMs: 1200 },
        { enemy: 'normal', count: 16, intervalMs: 260, startDelayMs: 2400 },
      ],
    },
    {
      clearBonus: 65,
      groups: [
        { enemy: 'carrier', count: 3, intervalMs: 1400, startDelayMs: 0 },
        { enemy: 'fast', count: 20, intervalMs: 150, startDelayMs: 1400 },
        { enemy: 'tank', count: 5, intervalMs: 820, startDelayMs: 2800 },
      ],
    },
    {
      clearBonus: 120,
      groups: [
        { enemy: 'carrier', count: 4, intervalMs: 1300, startDelayMs: 0 },
        { enemy: 'drone', count: 24, intervalMs: 190, startDelayMs: 1500 },
        { enemy: 'normal', count: 20, intervalMs: 220, startDelayMs: 3000 },
      ],
    },
  ],
};
