import type { StageDef } from '../../core/types';
import { parseGrid } from './helpers';
import { TILE } from '../../core/constants';

// 월드 1 피날레. 긴 트렁크 끝에서 한 번 갈라지고 각 갈래가 다시 둘로 — 출구 4개.
// 갈림목이 낮아 트렁크에서 처리하지 못한 적은 순식간에 네 방향으로 샌다.
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
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.#########.',
  '.#.#...#.#.',
  '.#.#...#.#.',
  '.#.#...#.#.',
  '.#.#...#.#.',
  '.#.#...#.#.',
];

const px = (col: number) => col * TILE + TILE / 2;
const spineY = 14 * TILE + TILE / 2; // 928
const botY = 19 * TILE + TILE / 2; // 1248
const c5 = px(5);

export const stage18: StageDef = {
  id: '1-8',
  grid: parseGrid(rows),
  spawn: { x: c5, y: 0 },
  goals: [
    { x: px(1), y: botY },
    { x: px(3), y: botY },
    { x: px(9), y: botY },
    { x: px(7), y: botY },
  ],
  path: {
    points: [
      { x: c5, y: 0 },
      { x: c5, y: spineY },
    ],
    branches: [
      {
        points: [{ x: c5, y: spineY }, { x: px(3), y: spineY }],
        branches: [
          { points: [{ x: px(3), y: spineY }, { x: px(1), y: spineY }, { x: px(1), y: botY }] },
          { points: [{ x: px(3), y: spineY }, { x: px(3), y: botY }] },
        ],
      },
      {
        points: [{ x: c5, y: spineY }, { x: px(7), y: spineY }],
        branches: [
          { points: [{ x: px(7), y: spineY }, { x: px(9), y: spineY }, { x: px(9), y: botY }] },
          { points: [{ x: px(7), y: spineY }, { x: px(7), y: botY }] },
        ],
      },
    ],
  },
  startGold: 340,
  startLives: 20,
  starThresholds: [0.3, 0.6, 0.9],
  bossStage: true,
  waves: [
    { clearBonus: 30, groups: [{ enemy: 'normal', count: 20, intervalMs: 280, startDelayMs: 0, hpMultiplier: 1.08 }] },
    { clearBonus: 35, groups: [
      { enemy: 'fast', count: 24, intervalMs: 140, startDelayMs: 0, speedMultiplier: 1.08 },
      { enemy: 'shield', count: 9, intervalMs: 430, startDelayMs: 1100, shieldMultiplier: 1.1 },
    ] },
    { clearBonus: 50, groups: [
      { enemy: 'tank', count: 9, intervalMs: 610, startDelayMs: 0, hpMultiplier: 1.15 },
      { enemy: 'regenerator', count: 7, intervalMs: 570, startDelayMs: 1000 },
    ] },
    { clearBonus: 70, groups: [
      { enemy: 'summoner', count: 6, intervalMs: 1050, startDelayMs: 0 },
      { enemy: 'fast', count: 20, intervalMs: 125, startDelayMs: 900, speedMultiplier: 1.15 },
    ] },
    { clearBonus: 60, groups: [
      { enemy: 'shield', count: 16, intervalMs: 270, startDelayMs: 0, hpMultiplier: 1.1, shieldMultiplier: 1.25 },
      { enemy: 'tank', count: 7, intervalMs: 600, startDelayMs: 1400 },
    ] },
    { clearBonus: 75, groups: [
      { enemy: 'regenerator', count: 12, intervalMs: 460, startDelayMs: 0, hpMultiplier: 1.18 },
      { enemy: 'summoner', count: 6, intervalMs: 950, startDelayMs: 1300, hpMultiplier: 1.1 },
    ] },
    { clearBonus: 100, groups: [
      { enemy: 'boss', count: 1, intervalMs: 1, startDelayMs: 0, hpMultiplier: 1.18 },
      { enemy: 'shield', count: 12, intervalMs: 330, startDelayMs: 1300, shieldMultiplier: 1.3 },
      { enemy: 'fast', count: 24, intervalMs: 110, startDelayMs: 2200, speedMultiplier: 1.18 },
    ] },
    { clearBonus: 85, groups: [
      { enemy: 'tank', count: 12, intervalMs: 470, startDelayMs: 0, hpMultiplier: 1.18 },
      { enemy: 'summoner', count: 7, intervalMs: 850, startDelayMs: 1500 },
    ] },
    { clearBonus: 95, groups: [
      { enemy: 'regenerator', count: 14, intervalMs: 420, startDelayMs: 0, hpMultiplier: 1.22 },
      { enemy: 'fast', count: 34, intervalMs: 105, startDelayMs: 1200, speedMultiplier: 1.2 },
    ] },
    { clearBonus: 180, groups: [
      { enemy: 'boss', count: 3, intervalMs: 3500, startDelayMs: 0, hpMultiplier: 1.22 },
      { enemy: 'shield', count: 12, intervalMs: 340, startDelayMs: 1200, hpMultiplier: 1.15, shieldMultiplier: 1.35 },
      { enemy: 'summoner', count: 8, intervalMs: 800, startDelayMs: 2500, hpMultiplier: 1.15 },
    ] },
  ],};
