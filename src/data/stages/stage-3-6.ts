import type { StageDef } from '../../core/types';
import { parseGrid } from './helpers';
import { TILE } from '../../core/constants';

// 피날레 직전 관문. 파쇄 전차(crusher, 지상 준보스)가 포격 비행정(gunship) 편대와
// 동시에 들어오고, 강하 수송선·정찰 비행체·공성 골렘까지 층층이 겹친다. 보스는
// 없지만 지상 광역·집중빔·대공을 모두 세워두지 않으면 두 출구가 무너진다.
// 2-5 골격을 세로로 압축하고 진입/분기 위치를 옮긴 변형 맵.
const rows = [
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#####.',
  '.........#.',
  '.........#.',
  '.........#.',
  '.#########.',
  '.#.........',
  '.#.........',
  '.#.........',
  '.#########.',
  '.........#.',
  '.........#.',
  '.....#####.',
  '..#######..',
  '..#.....#..',
  '..#.....#..',
  '..#.....#..',
  '..#.....#..',
];

const px = (n: number) => n * TILE + TILE / 2;
const splitY = px(15);
const botY = px(19);

export const stage36: StageDef = {
  id: '3-6',
  grid: parseGrid(rows),
  spawn: { x: px(5), y: 0 },
  goals: [{ x: px(2), y: botY }, { x: px(8), y: botY }],
  path: {
    points: [
      { x: px(5), y: 0 }, { x: px(5), y: px(3) }, { x: px(9), y: px(3) },
      { x: px(9), y: px(7) }, { x: px(1), y: px(7) }, { x: px(1), y: px(11) },
      { x: px(9), y: px(11) }, { x: px(9), y: px(14) }, { x: px(5), y: px(14) }, { x: px(5), y: splitY },
    ],
    branches: [
      { points: [{ x: px(5), y: splitY }, { x: px(2), y: splitY }, { x: px(2), y: botY }] },
      { points: [{ x: px(5), y: splitY }, { x: px(8), y: splitY }, { x: px(8), y: botY }] },
    ],
  },
  startGold: 380,
  startLives: 20,
  starThresholds: [0.3, 0.6, 0.9],
  waves: [
    {
      clearBonus: 30,
      groups: [
        { enemy: 'normal', count: 18, intervalMs: 260, startDelayMs: 0 },
        { enemy: 'drone', count: 12, intervalMs: 300, startDelayMs: 1200 },
      ],
    },
    {
      clearBonus: 35,
      groups: [
        { enemy: 'fast', count: 20, intervalMs: 150, startDelayMs: 0 },
        { enemy: 'drone', count: 16, intervalMs: 240, startDelayMs: 1400 },
      ],
    },
    {
      clearBonus: 40,
      groups: [
        { enemy: 'tank', count: 6, intervalMs: 760, startDelayMs: 0 },
        { enemy: 'gunship', count: 2, intervalMs: 1400, startDelayMs: 1000 },
      ],
    },
    {
      clearBonus: 50,
      groups: [
        { enemy: 'carrier', count: 2, intervalMs: 1500, startDelayMs: 0 },
        { enemy: 'drone', count: 18, intervalMs: 220, startDelayMs: 1200 },
        { enemy: 'normal', count: 16, intervalMs: 250, startDelayMs: 2600 },
      ],
    },
    {
      clearBonus: 90,
      groups: [
        { enemy: 'crusher', count: 1, intervalMs: 1, startDelayMs: 0 },
        { enemy: 'gunship', count: 3, intervalMs: 1300, startDelayMs: 1600 },
      ],
    },
    {
      clearBonus: 60,
      groups: [
        { enemy: 'tank', count: 8, intervalMs: 620, startDelayMs: 0 },
        { enemy: 'carrier', count: 2, intervalMs: 1500, startDelayMs: 1400 },
        { enemy: 'fast', count: 18, intervalMs: 150, startDelayMs: 2600 },
      ],
    },
    {
      clearBonus: 70,
      groups: [
        { enemy: 'gunship', count: 4, intervalMs: 1200, startDelayMs: 0 },
        { enemy: 'drone', count: 24, intervalMs: 190, startDelayMs: 1400 },
        { enemy: 'tank', count: 6, intervalMs: 700, startDelayMs: 2800 },
      ],
    },
    {
      clearBonus: 140,
      groups: [
        { enemy: 'crusher', count: 1, intervalMs: 1, startDelayMs: 0 },
        { enemy: 'gunship', count: 4, intervalMs: 1150, startDelayMs: 1500 },
        { enemy: 'carrier', count: 3, intervalMs: 1400, startDelayMs: 3000 },
        { enemy: 'drone', count: 22, intervalMs: 190, startDelayMs: 4200 },
      ],
    },
  ],
};
