import type { StageDef } from '../../core/types';
import { parseGrid } from './helpers';
import { TILE } from '../../core/constants';

// 드론 스웜 본격화. stage-1-3의 링(분기) 골격 재사용 — 중앙 간선에서 갈라지는 두
// 출구를 모두 커버해야 한다. 정찰 비행체가 스테이지 물량의 절반 이상을 차지하므로
// 대공 커버(창공탑)가 사실상 필요해지는 첫 관문.
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

const cx = 5 * TILE + TILE / 2;
const lx = 1 * TILE + TILE / 2;
const rx = 9 * TILE + TILE / 2;
const midY = 10 * TILE + TILE / 2;
const botY = 19 * TILE + TILE / 2;

export const stage32: StageDef = {
  id: '3-2',
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
      { points: [{ x: cx, y: midY }, { x: lx, y: midY }, { x: lx, y: botY }] },
      { points: [{ x: cx, y: midY }, { x: rx, y: midY }, { x: rx, y: botY }] },
    ],
  },
  startGold: 330,
  startLives: 20,
  starThresholds: [0.3, 0.65, 1.0],
  waves: [
    {
      clearBonus: 25,
      groups: [
        { enemy: 'drone', count: 16, intervalMs: 280, startDelayMs: 0 },
        { enemy: 'normal', count: 10, intervalMs: 380, startDelayMs: 1400 },
      ],
    },
    {
      clearBonus: 30,
      groups: [
        { enemy: 'drone', count: 24, intervalMs: 220, startDelayMs: 0 },
        { enemy: 'fast', count: 12, intervalMs: 190, startDelayMs: 1500 },
      ],
    },
    {
      clearBonus: 35,
      groups: [
        { enemy: 'drone', count: 18, intervalMs: 240, startDelayMs: 0 },
        { enemy: 'tank', count: 5, intervalMs: 850, startDelayMs: 1100 },
      ],
    },
    {
      clearBonus: 40,
      groups: [
        { enemy: 'normal', count: 18, intervalMs: 240, startDelayMs: 0 },
        { enemy: 'drone', count: 22, intervalMs: 200, startDelayMs: 1300 },
      ],
    },
    {
      clearBonus: 45,
      groups: [
        { enemy: 'drone', count: 26, intervalMs: 190, startDelayMs: 0 },
        { enemy: 'fast', count: 16, intervalMs: 150, startDelayMs: 1700 },
      ],
    },
    {
      clearBonus: 85,
      groups: [
        { enemy: 'drone', count: 28, intervalMs: 180, startDelayMs: 0, hpMultiplier: 1.25 },
        { enemy: 'fast', count: 20, intervalMs: 150, startDelayMs: 0 },
      ],
    },
  ],
};
