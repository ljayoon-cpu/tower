import type { StageDef } from '../../core/types';
import { parseGrid } from './helpers';
import { TILE } from '../../core/constants';

// 캠페인 피날레 — 공중 기함(airboss) 결전. 2-5 구조를 그대로 따른다: 긴 사행로가
// 준비 시간을 주지만 마지막 두 웨이브에 기함이 1 → 2기로 들어오며 급강하·편대
// 전개 페이즈로 직선 구간을 순식간에 뚫는다. 지상 광역 + 대공 + 집중빔을 나눠
// 세워야 한다. `bossStage` — 한 판 동안 전투 타워 1종이 무작위 봉인된다(창공탑·
// 지원형 제외, Game.create). 3-1을 세로로 늘린 3턴 사행로, 단일 출구.
const rows = [
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
  '.#########.',
  '.........#.',
  '.........#.',
  '.........#.',
  '.........#.',
  '.........#.',
];

const px = (n: number) => n * TILE + TILE / 2;

export const stage37: StageDef = {
  id: '3-7',
  grid: parseGrid(rows),
  spawn: { x: px(1), y: 0 },
  goals: [{ x: px(9), y: px(19) }],
  path: {
    points: [
      { x: px(1), y: 0 },
      { x: px(1), y: px(4) },
      { x: px(9), y: px(4) },
      { x: px(9), y: px(9) },
      { x: px(1), y: px(9) },
      { x: px(1), y: px(14) },
      { x: px(9), y: px(14) },
      { x: px(9), y: px(19) },
    ],
  },
  startGold: 400,
  startLives: 20,
  starThresholds: [0.3, 0.6, 1.0],
  bossStage: true,
  waves: [
    {
      clearBonus: 30,
      groups: [
        { enemy: 'normal', count: 18, intervalMs: 280, startDelayMs: 0 },
        { enemy: 'drone', count: 12, intervalMs: 300, startDelayMs: 1400 },
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
      clearBonus: 45,
      groups: [
        { enemy: 'tank', count: 6, intervalMs: 740, startDelayMs: 0 },
        { enemy: 'gunship', count: 3, intervalMs: 1300, startDelayMs: 1200 },
      ],
    },
    {
      clearBonus: 55,
      groups: [
        { enemy: 'carrier', count: 3, intervalMs: 1500, startDelayMs: 0 },
        { enemy: 'drone', count: 20, intervalMs: 200, startDelayMs: 1400 },
        { enemy: 'normal', count: 16, intervalMs: 250, startDelayMs: 2800 },
      ],
    },
    {
      clearBonus: 95,
      groups: [
        { enemy: 'crusher', count: 1, intervalMs: 1, startDelayMs: 0 },
        { enemy: 'gunship', count: 3, intervalMs: 1300, startDelayMs: 1600 },
        { enemy: 'fast', count: 18, intervalMs: 150, startDelayMs: 2800 },
      ],
    },
    {
      clearBonus: 80,
      groups: [
        { enemy: 'gunship', count: 4, intervalMs: 1150, startDelayMs: 0 },
        { enemy: 'tank', count: 6, intervalMs: 700, startDelayMs: 1400 },
        { enemy: 'drone', count: 22, intervalMs: 190, startDelayMs: 2800 },
      ],
    },
    {
      clearBonus: 150,
      groups: [
        { enemy: 'airboss', count: 1, intervalMs: 1, startDelayMs: 0 },
        { enemy: 'gunship', count: 4, intervalMs: 700, startDelayMs: 1500 },
        { enemy: 'normal', count: 20, intervalMs: 200, startDelayMs: 2500 },
      ],
    },
    {
      clearBonus: 220,
      groups: [
        { enemy: 'airboss', count: 2, intervalMs: 5000, startDelayMs: 0 },
        { enemy: 'carrier', count: 4, intervalMs: 1400, startDelayMs: 2000 },
        { enemy: 'drone', count: 30, intervalMs: 140, startDelayMs: 3000 },
      ],
    },
  ],
};
