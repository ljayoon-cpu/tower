import type { StageDef } from '../../core/types';
import { parseGrid } from './helpers';
import { TILE } from '../../core/constants';

// 월드 3 진입 — 태엽 군단의 비행 편대가 처음 등장한다. stage-2-1의 구불 단일 경로를
// 재사용: 경로가 길어 지상 화력만으로도 정찰 비행체를 요격할 시간이 있다. 대공탑
// 없이도 클리어 가능한 도입 스테이지.
const rows = [
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.#####.....',
  '.#.........',
  '.#.........',
  '.#.........',
  '.#.........',
  '.#########.',
  '.........#.',
  '.........#.',
  '.........#.',
  '.........#.',
  '.#########.',
  '.#.........',
  '.#.........',
  '.#.........',
  '.#.........',
  '.#.........',
];

const px = (n: number) => n * TILE + TILE / 2;

export const stage31: StageDef = {
  id: '3-1',
  grid: parseGrid(rows),
  spawn: { x: px(5), y: 0 },
  goals: [{ x: px(1), y: px(19) }],
  path: {
    points: [
      { x: px(5), y: 0 },
      { x: px(5), y: px(4) },
      { x: px(1), y: px(4) },
      { x: px(1), y: px(9) },
      { x: px(9), y: px(9) },
      { x: px(9), y: px(14) },
      { x: px(1), y: px(14) },
      { x: px(1), y: px(19) },
    ],
  },
  startGold: 320,
  startLives: 20,
  starThresholds: [0.35, 0.7, 1.0],
  waves: [
    { clearBonus: 25, groups: [{ enemy: 'normal', count: 16, intervalMs: 320, startDelayMs: 0 }] },
    { clearBonus: 25, groups: [
      { enemy: 'drone', count: 6, intervalMs: 500, startDelayMs: 0 },
      { enemy: 'fast', count: 12, intervalMs: 220, startDelayMs: 1200 },
    ] },
    { clearBonus: 30, groups: [
      { enemy: 'normal', count: 14, intervalMs: 280, startDelayMs: 0 },
      { enemy: 'drone', count: 10, intervalMs: 320, startDelayMs: 1500 },
    ] },
    { clearBonus: 35, groups: [
      { enemy: 'tank', count: 4, intervalMs: 900, startDelayMs: 0 },
      { enemy: 'drone', count: 12, intervalMs: 260, startDelayMs: 1000 },
    ] },
    { clearBonus: 70, groups: [
      { enemy: 'drone', count: 20, intervalMs: 200, startDelayMs: 0 },
      { enemy: 'normal', count: 16, intervalMs: 240, startDelayMs: 1500 },
    ] },
  ],
};
