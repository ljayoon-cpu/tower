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
    { clearBonus: 25, groups: [{ enemy: 'normal', count: 18, intervalMs: 300, startDelayMs: 0 }] },
    { clearBonus: 30, groups: [
      { enemy: 'fast', count: 18, intervalMs: 150, startDelayMs: 0 },
      { enemy: 'shield', count: 8, intervalMs: 480, startDelayMs: 1200 },
    ] },
    { clearBonus: 40, groups: [
      { enemy: 'tank', count: 7, intervalMs: 650, startDelayMs: 0 },
      { enemy: 'fast', count: 14, intervalMs: 150, startDelayMs: 1300, speedMultiplier: 1.08 },
    ] },
    { clearBonus: 55, groups: [
      { enemy: 'summoner', count: 4, intervalMs: 1400, startDelayMs: 0 },
      { enemy: 'regenerator', count: 6, intervalMs: 700, startDelayMs: 1000 },
    ] },
    { clearBonus: 45, groups: [
      { enemy: 'shield', count: 14, intervalMs: 310, startDelayMs: 0, shieldMultiplier: 1.15 },
      { enemy: 'fast', count: 25, intervalMs: 115, startDelayMs: 900 },
    ] },
    { clearBonus: 65, groups: [
      { enemy: 'tank', count: 8, intervalMs: 580, startDelayMs: 0, hpMultiplier: 1.12 },
      { enemy: 'summoner', count: 5, intervalMs: 1100, startDelayMs: 1300 },
    ] },
    { clearBonus: 80, groups: [
      { enemy: 'regenerator', count: 10, intervalMs: 520, startDelayMs: 0, hpMultiplier: 1.15 },
      { enemy: 'fast', count: 28, intervalMs: 120, startDelayMs: 1200, speedMultiplier: 1.12 },
    ] },
    { clearBonus: 150, groups: [
      { enemy: 'boss', count: 2, intervalMs: 4200, startDelayMs: 0, hpMultiplier: 1.12 },
      { enemy: 'shield', count: 10, intervalMs: 440, startDelayMs: 1200, shieldMultiplier: 1.2 },
      { enemy: 'summoner', count: 5, intervalMs: 1000, startDelayMs: 2400 },
    ] },
  ],};
