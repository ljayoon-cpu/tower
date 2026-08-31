import type { StageDef, Wave, WaveGroup } from '../core/types';
import { TILE } from '../core/constants';
import { parseGrid } from './stages/helpers';

// 두 입구(좌 col1 / 우 col9)에서 나와 col5·row3 에서 합쳐지고, 그 뒤 긴 사행 트렁크로
// 목표까지 내려간다. 그리드 11열 x 20행.
const ROWS = [
  '.#.......#.',
  '.#.......#.',
  '.#.......#.',
  '.#########.',
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
  '.#########.',
  '.........#.',
];

const px = (n: number) => n * TILE + TILE / 2;

// 합류점(col5,row3) 이후 공용 트렁크.
const TRUNK = [
  { x: px(5), y: px(3) }, { x: px(5), y: px(6) }, { x: px(1), y: px(6) },
  { x: px(1), y: px(10) }, { x: px(9), y: px(10) }, { x: px(9), y: px(14) },
  { x: px(1), y: px(14) }, { x: px(1), y: px(18) }, { x: px(9), y: px(18) },
  { x: px(9), y: px(19) },
];

const LANE_LEFT = [{ x: px(1), y: 0 }, { x: px(1), y: px(3) }, ...TRUNK];
const LANE_RIGHT = [{ x: px(9), y: 0 }, { x: px(9), y: px(3) }, ...TRUNK];

/** 무한 모드 스폰 위상: 앞 웨이브는 한 입구씩 번갈아, 중반은 두 입구로 나눠서,
 *  뒤로 갈수록 양쪽에서 한꺼번에. */
export function endlessSpawnPhase(n: number): 'single' | 'split' | 'both' {
  if (n <= 5) return 'single';
  if (n <= 14) return 'split';
  return 'both';
}

/** 무한 모드 웨이브 N(1부터). 뒤로 갈수록 수·속도·혼합·보스 배율·스폰 지점이 늘어난다. */
export function endlessWave(n: number): Wave {
  const t = n - 1;
  const groups: WaveGroup[] = [];
  const swarm = 10 + Math.floor(t * 1.6);
  const interval = Math.max(70, 300 - t * 8);
  const fastShare = Math.min(0.7, 0.2 + t * 0.03);
  const phase = endlessSpawnPhase(n);
  const alt = (n - 1) % 2; // 이번 웨이브가 먼저 쓰는 입구

  // 코어 스웜: fast + normal.
  const fastCount = Math.round(swarm * fastShare);
  const normalCount = Math.round(swarm * (1 - fastShare));
  if (phase === 'both') {
    // 양쪽 입구에서 절반씩 동시에.
    for (const lane of [0, 1]) {
      groups.push({ enemy: 'fast', count: Math.ceil(fastCount / 2), intervalMs: interval, startDelayMs: 0, lane });
      groups.push({ enemy: 'normal', count: Math.ceil(normalCount / 2), intervalMs: interval + 60, startDelayMs: 400, lane });
    }
  } else if (phase === 'split') {
    // 한 입구는 질주병, 다른 입구는 보병.
    groups.push({ enemy: 'fast', count: fastCount, intervalMs: interval, startDelayMs: 0, lane: alt });
    groups.push({ enemy: 'normal', count: normalCount, intervalMs: interval + 60, startDelayMs: 400, lane: 1 - alt });
  } else {
    // 한 입구에서만, 웨이브마다 번갈아.
    groups.push({ enemy: 'fast', count: fastCount, intervalMs: interval, startDelayMs: 0, lane: alt });
    groups.push({ enemy: 'normal', count: normalCount, intervalMs: interval + 60, startDelayMs: 400, lane: alt });
  }

  // 특수 적: split/both 에선 코어와 반대 입구로 들어와 압박을 나눈다.
  const specialLane = phase === 'both' ? undefined : phase === 'split' ? alt : alt;
  if (n >= 3) {
    groups.push({
      enemy: 'tank', count: 2 + Math.floor(t / 3), intervalMs: 700,
      startDelayMs: 900, hpMultiplier: 1 + t * 0.05, lane: specialLane,
    });
  }
  if (n >= 5 && n % 2 === 1) {
    groups.push({ enemy: 'shield', count: 3 + Math.floor(t / 4), intervalMs: 360, startDelayMs: 1400, lane: 1 - alt });
  }
  if (n >= 7 && n % 3 === 0) {
    groups.push({ enemy: 'regenerator', count: 3 + Math.floor(t / 6), intervalMs: 500, startDelayMs: 1600, lane: specialLane });
  }
  if (n >= 9 && n % 4 === 0) {
    groups.push({ enemy: 'summoner', count: 2 + Math.floor(t / 8), intervalMs: 900, startDelayMs: 1800, lane: 1 - alt });
  }
  if (n % 5 === 0) {
    const bossCount = 1 + Math.floor(n / 25);
    const bossMods = {
      hpMultiplier: 1 + Math.floor(n / 5) * 0.35,
      shieldMultiplier: 1 + Math.floor(n / 10) * 0.2,
    };
    if (phase === 'both') {
      // 양쪽에서 협공.
      for (const lane of [0, 1]) {
        groups.push({ enemy: 'boss', count: Math.ceil(bossCount / 2), intervalMs: 3600, startDelayMs: 1200, lane, ...bossMods });
      }
    } else {
      groups.push({ enemy: 'boss', count: bossCount, intervalMs: 3600, startDelayMs: 1200, lane: alt, ...bossMods });
    }
  }

  return { groups, clearBonus: 18 + n * 3 };
}

export function endlessWaves(count = 200): Wave[] {
  return Array.from({ length: count }, (_, i) => endlessWave(i + 1));
}

export const ENDLESS_STAGE_ID = 'endless';

export function endlessStage(): StageDef {
  return {
    id: ENDLESS_STAGE_ID,
    endless: true,
    grid: parseGrid(ROWS),
    spawn: { x: px(1), y: 0 },
    goals: [{ x: px(9), y: px(19) }],
    // points 가 빈 루트 → 각 branch 가 서로 다른 입구에서 시작하는 독립 경로.
    path: { points: [], branches: [{ points: LANE_LEFT }, { points: LANE_RIGHT }] },
    startGold: 280,
    startLives: 20,
    starThresholds: [0.3, 0.6, 0.9],
    waves: endlessWaves(),
  };
}
