import type { PathNode, StageDef, Wave, WaveGroup } from '../core/types';
import { TILE } from '../core/constants';
import { parseGrid } from './stages/helpers';

// 좌우 진입(가로 십자대) → 중앙에서 위/아래로 갈라져 각 절반을 S자로 감고 나간다.
// 감기는 경로라 타워가 한 적을 여러 번 때릴 수 있다. 그리드 11열 x 20행.
const ROWS = [
  '.........#.',
  '.#########.',
  '.#.........',
  '.#.........',
  '.#####.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '###########',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#####.',
  '.........#.',
  '.........#.',
  '.#########.',
  '.#.........',
];

const px = (n: number) => n * TILE + TILE / 2;
const CY = px(9); // 가로 십자대 중심 y

const LEFT = { x: 0, y: CY };
const RIGHT = { x: 11 * TILE, y: CY };
const CENTER = { x: px(5), y: CY };

// 위 절반 S: 중앙 → 위로 → 왼쪽 → 위로 → 오른쪽 → 위로 탈출.
const UP_TAIL = [
  { x: px(5), y: px(4) }, { x: px(1), y: px(4) }, { x: px(1), y: px(1) },
  { x: px(9), y: px(1) }, { x: px(9), y: 0 },
];
// 아래 절반 S: 위 절반을 180° 돌린 모양.
const DOWN_TAIL = [
  { x: px(5), y: px(15) }, { x: px(9), y: px(15) }, { x: px(9), y: px(18) },
  { x: px(1), y: px(18) }, { x: px(1), y: 20 * TILE },
];

// 4개 루트: (좌|우) 진입 × (위|아래) 탈출. lane 0 좌·위 / 1 좌·아래 / 2 우·위 / 3 우·아래.
const PATH: PathNode = {
  points: [],
  branches: [
    { points: [LEFT, CENTER], branches: [{ points: UP_TAIL }, { points: DOWN_TAIL }] },
    { points: [RIGHT, CENTER], branches: [{ points: UP_TAIL }, { points: DOWN_TAIL }] },
  ],
};

const LANES = {
  left: [0, 1], right: [2, 3], up: [0, 2], down: [1, 3], all: [0, 1, 2, 3],
} as const;

/** 무한 모드 스폰 위상: 앞은 한 쪽 입구씩 번갈아, 중반은 좌우 열을 나눠서, 뒤는 사방에서. */
export function endlessSpawnPhase(n: number): 'single' | 'split' | 'both' {
  if (n <= 5) return 'single';
  if (n <= 14) return 'split';
  return 'both';
}

/** 무한 모드 웨이브 N(1부터). 뒤로 갈수록 수·속도·혼합·보스 배율·스폰 지점이 늘어난다. */
export function endlessWave(n: number): Wave {
  const t = n - 1;
  const groups: WaveGroup[] = [];
  const swarm = 6 + Math.floor(t * 0.9);
  const interval = Math.max(110, 340 - t * 6);
  const fastShare = Math.min(0.6, 0.18 + t * 0.025);
  const phase = endlessSpawnPhase(n);
  const alt = (n - 1) % 2; // 이번 웨이브가 먼저 쓰는 입구

  let fastLanes: readonly number[];
  let normalLanes: readonly number[];
  let specialLanes: readonly number[];
  let bossLanes: readonly number[];
  if (phase === 'single') {
    const side = alt === 0 ? LANES.left : LANES.right;
    fastLanes = normalLanes = specialLanes = bossLanes = side;
  } else if (phase === 'split') {
    fastLanes = LANES.left;
    normalLanes = LANES.right;
    specialLanes = LANES.right;
    bossLanes = LANES.left;
  } else {
    fastLanes = normalLanes = specialLanes = bossLanes = LANES.all;
  }

  /** count 를 lanes 에 정확히 나눠 담는다(총합 == count). 몫이 0인 레인은 건너뛴다. */
  const across = (lanes: readonly number[], enemy: string, count: number, extra: Partial<WaveGroup> = {}) => {
    if (count <= 0) return;
    const n = lanes.length;
    lanes.forEach((lane, i) => {
      const c = Math.floor(count / n) + (i < count % n ? 1 : 0);
      if (c > 0) groups.push({ enemy, count: c, intervalMs: interval, startDelayMs: 0, lane, ...extra });
    });
  };

  across(fastLanes, 'fast', Math.round(swarm * fastShare));
  across(normalLanes, 'normal', Math.round(swarm * (1 - fastShare)), { intervalMs: interval + 60, startDelayMs: 400 });

  if (n >= 5) {
    across(specialLanes, 'tank', 1 + Math.floor((n - 5) / 5), {
      intervalMs: 900, startDelayMs: 1000, hpMultiplier: 1 + t * 0.022,
    });
  }
  if (n >= 7 && n % 2 === 1) {
    across(specialLanes, 'shield', 2 + Math.floor(t / 6), { intervalMs: 400, startDelayMs: 1400 });
  }
  if (n >= 9 && n % 3 === 0) {
    across(specialLanes, 'regenerator', 2 + Math.floor(t / 8), { intervalMs: 540, startDelayMs: 1600 });
  }
  if (n >= 12 && n % 4 === 0) {
    across(specialLanes, 'summoner', 1 + Math.floor(t / 10), { intervalMs: 900, startDelayMs: 1800 });
  }
  if (n >= 10 && n % 5 === 0) {
    // 15웨이브까지는 한 입구에서만, 그 뒤 사방 협공.
    const bossFrom = phase === 'both' ? bossLanes : [alt === 0 ? 0 : 3];
    across(bossFrom, 'boss', 1 + Math.floor((n - 10) / 30), {
      intervalMs: 3600, startDelayMs: 1200,
      hpMultiplier: 1 + Math.floor((n - 10) / 5) * 0.3,
      shieldMultiplier: 1 + Math.floor((n - 10) / 10) * 0.2,
    });
  }

  return { groups, clearBonus: 25 + n * 5 };
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
    spawn: LEFT,
    goals: [{ x: px(9), y: 0 }, { x: px(1), y: 20 * TILE }],
    path: PATH,
    startGold: 460,
    startLives: 25,
    starThresholds: [0.3, 0.6, 0.9],
    waves: endlessWaves(),
  };
}
