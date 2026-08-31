import type { StageDef, Wave } from '../core/types';
import { TILE } from '../core/constants';
import { parseGrid } from './stages/helpers';

// 긴 사행 단일 경로 — 무한히 밀려오는 적을 오래 때릴 수 있게. 그리드 11열 x 20행.
const ROWS = [
  '.....#....',
  '.....#....',
  '.#####....',
  '.#........',
  '.#........',
  '.#........',
  '.#########',
  '.........#',
  '.........#',
  '.........#',
  '.#########',
  '.#........',
  '.#........',
  '.#........',
  '.#########',
  '.........#',
  '.........#',
  '.........#',
  '.........#',
  '.........#',
].map((r) => r.padEnd(11, '.'));

const px = (n: number) => n * TILE + TILE / 2;

/** 무한 모드 웨이브 N(1부터). 뒤로 갈수록 수·속도·혼합·보스 배율이 커진다. */
export function endlessWave(n: number): Wave {
  const t = n - 1;
  const groups: Wave['groups'] = [];
  const swarm = 10 + Math.floor(t * 1.6);
  const interval = Math.max(70, 300 - t * 8);

  // 기본 스웜은 항상. 웨이브가 갈수록 질주병 비율↑.
  const fastShare = Math.min(0.7, 0.2 + t * 0.03);
  groups.push({ enemy: 'fast', count: Math.round(swarm * fastShare), intervalMs: interval, startDelayMs: 0 });
  groups.push({ enemy: 'normal', count: Math.round(swarm * (1 - fastShare)), intervalMs: interval + 60, startDelayMs: 400 });

  if (n >= 3) {
    groups.push({
      enemy: 'tank', count: 2 + Math.floor(t / 3), intervalMs: 700,
      startDelayMs: 900, hpMultiplier: 1 + t * 0.05,
    });
  }
  if (n >= 5 && n % 2 === 1) {
    groups.push({ enemy: 'shield', count: 3 + Math.floor(t / 4), intervalMs: 360, startDelayMs: 1400 });
  }
  if (n >= 7 && n % 3 === 0) {
    groups.push({ enemy: 'regenerator', count: 3 + Math.floor(t / 6), intervalMs: 500, startDelayMs: 1600 });
  }
  if (n >= 9 && n % 4 === 0) {
    groups.push({ enemy: 'summoner', count: 2 + Math.floor(t / 8), intervalMs: 900, startDelayMs: 1800 });
  }
  if (n % 5 === 0) {
    groups.push({
      enemy: 'boss', count: 1 + Math.floor(n / 25), intervalMs: 3600, startDelayMs: 1200,
      hpMultiplier: 1 + Math.floor(n / 5) * 0.35,
      shieldMultiplier: 1 + Math.floor(n / 10) * 0.2,
    });
  }

  return { groups, clearBonus: 18 + n * 3 };
}

export function endlessWaves(count = 200): Wave[] {
  return Array.from({ length: count }, (_, i) => endlessWave(i + 1));
}

export const ENDLESS_STAGE_ID = 'endless';

export function endlessStage(): StageDef {
  const botY = px(19);
  return {
    id: ENDLESS_STAGE_ID,
    endless: true,
    grid: parseGrid(ROWS),
    spawn: { x: px(5), y: 0 },
    goals: [{ x: px(9), y: botY }],
    path: {
      points: [
        { x: px(5), y: 0 }, { x: px(5), y: px(2) }, { x: px(1), y: px(2) },
        { x: px(1), y: px(6) }, { x: px(9), y: px(6) }, { x: px(9), y: px(10) },
        { x: px(1), y: px(10) }, { x: px(1), y: px(14) }, { x: px(9), y: px(14) },
        { x: px(9), y: botY },
      ],
    },
    startGold: 280,
    startLives: 20,
    starThresholds: [0.3, 0.6, 0.9],
    waves: endlessWaves(),
  };
}
