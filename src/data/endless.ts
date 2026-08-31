import type { PathNode, StageDef, Wave, WaveGroup } from '../core/types';
import { TILE, GAME_HEIGHT } from '../core/constants';
import { parseGrid } from './stages/helpers';

// 좌우·상하 대칭 십자 맵. 적은 좌/우 가장자리에서 나와 중앙에서 위 목표와 아래 목표로
// 갈라진다. 네 사분면이 전부 설치 구역. 그리드 11열 x 20행.
const V = '.....#.....';        // 세로 척추 (col5)
const H = '###########';        // 가로 십자대 (row9-10)
const ROWS = [
  V, V, V, V, V, V, V, V, V,
  H, H,
  V, V, V, V, V, V, V, V, V,
];

const px = (n: number) => n * TILE + TILE / 2;
const CX = px(5);               // 352 — 중앙 세로선
const CY = GAME_HEIGHT / 2;     // 640 — 십자대 중심(row9/row10 경계)

const LEFT = { x: 0, y: CY };
const RIGHT = { x: px(10) + TILE / 2, y: CY }; // 704, 오른쪽 가장자리
const CENTER = { x: CX, y: CY };
const TOP_GOAL = { x: CX, y: 0 };
const BOTTOM_GOAL = { x: CX, y: GAME_HEIGHT };

// 루트 4개: (좌|우) 진입 × (위|아래) 목표. lane 인덱스 = 0 좌·위 / 1 좌·아래 / 2 우·위 / 3 우·아래.
const PATH: PathNode = {
  points: [],
  branches: [
    { points: [LEFT, CENTER], branches: [{ points: [TOP_GOAL] }, { points: [BOTTOM_GOAL] }] },
    { points: [RIGHT, CENTER], branches: [{ points: [TOP_GOAL] }, { points: [BOTTOM_GOAL] }] },
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
  const swarm = 10 + Math.floor(t * 1.6);
  const interval = Math.max(70, 300 - t * 8);
  const fastShare = Math.min(0.7, 0.2 + t * 0.03);
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

  /** count 를 lanes 에 고르게 쪼개 그룹으로 넣는다(위·아래 목표로 갈라짐). */
  const across = (lanes: readonly number[], enemy: string, count: number, extra: Partial<WaveGroup> = {}) => {
    if (count <= 0) return;
    const per = Math.max(1, Math.ceil(count / lanes.length));
    for (const lane of lanes) {
      groups.push({ enemy, count: per, intervalMs: interval, startDelayMs: 0, lane, ...extra });
    }
  };

  across(fastLanes, 'fast', Math.round(swarm * fastShare));
  across(normalLanes, 'normal', Math.round(swarm * (1 - fastShare)), { intervalMs: interval + 60, startDelayMs: 400 });

  if (n >= 3) {
    across(specialLanes, 'tank', 2 + Math.floor(t / 3), {
      intervalMs: 700, startDelayMs: 900, hpMultiplier: 1 + t * 0.05,
    });
  }
  if (n >= 5 && n % 2 === 1) {
    across(specialLanes, 'shield', 3 + Math.floor(t / 4), { intervalMs: 360, startDelayMs: 1400 });
  }
  if (n >= 7 && n % 3 === 0) {
    across(specialLanes, 'regenerator', 3 + Math.floor(t / 6), { intervalMs: 500, startDelayMs: 1600 });
  }
  if (n >= 9 && n % 4 === 0) {
    across(specialLanes, 'summoner', 2 + Math.floor(t / 8), { intervalMs: 900, startDelayMs: 1800 });
  }
  if (n % 5 === 0) {
    across(bossLanes, 'boss', 1 + Math.floor(n / 25), {
      intervalMs: 3600, startDelayMs: 1200,
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
  return {
    id: ENDLESS_STAGE_ID,
    endless: true,
    grid: parseGrid(ROWS),
    spawn: LEFT,
    goals: [TOP_GOAL, BOTTOM_GOAL],
    path: PATH,
    startGold: 280,
    startLives: 20,
    starThresholds: [0.3, 0.6, 0.9],
    waves: endlessWaves(),
  };
}
