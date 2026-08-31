import type { PathNode, StageDef, Wave, WaveGroup } from '../core/types';
import { TILE } from '../core/constants';
import { parseGrid } from './stages/helpers';

// 좌·우에서 나온 적이 중앙 사각형 링을 약 3/4바퀴 돌고 위/아래 통로로 빠져나간다.
// 링 안쪽(cols 3-7, rows 6-13)이 큰 방어 섬 — 타워가 도는 적을 계속 때린다. 11열 x 20행.
const ROWS = [
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '..#######..',
  '..#.....#..',
  '..#.....#..',
  '..#.....#..',
  '###.....#..',
  '..#.....###',
  '..#.....#..',
  '..#.....#..',
  '..#.....#..',
  '..#######..',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
];

const px = (n: number) => n * TILE + TILE / 2;

// 링 모서리·중점. 링: 위 row5 / 아래 row14 / 좌 col2 / 우 col8.
const TL = { x: px(2), y: px(5) };
const TR = { x: px(8), y: px(5) };
const BL = { x: px(2), y: px(14) };
const BR = { x: px(8), y: px(14) };
const TOP_MID = { x: px(5), y: px(5) };
const BOT_MID = { x: px(5), y: px(14) };
const TOP_GOAL = { x: px(5), y: 0 };
const BOT_GOAL = { x: px(5), y: 20 * TILE };

const LEFT_SPAWN = { x: 0, y: px(9) };
const RING_LM = { x: px(2), y: px(9) };  // 링 왼쪽 중점 (좌측 진입 합류)
const RIGHT_SPAWN = { x: 11 * TILE, y: px(10) };
const RING_RM = { x: px(8), y: px(10) }; // 링 오른쪽 중점 (우측 진입 합류)

// 각 탈출: 링을 크게 돌아 반대편 위/아래 통로로. lane 0 좌·위 / 1 좌·아래 / 2 우·위 / 3 우·아래.
const L_TOP = [BL, BR, TR, TOP_MID, TOP_GOAL];             // 아래로 → 오른쪽 위로 → 위 탈출
const L_BOT = [TL, TR, BR, BOT_MID, BOT_GOAL];             // 위로 → 오른쪽 아래로 → 아래 탈출
const R_TOP = [BR, BL, TL, TOP_MID, TOP_GOAL];             // 아래로 → 왼쪽 위로 → 위 탈출
const R_BOT = [TR, TL, BL, BOT_MID, BOT_GOAL];             // 위로 → 왼쪽 아래로 → 아래 탈출

const PATH: PathNode = {
  points: [],
  branches: [
    { points: [LEFT_SPAWN, RING_LM], branches: [{ points: L_TOP }, { points: L_BOT }] },
    { points: [RIGHT_SPAWN, RING_RM], branches: [{ points: R_TOP }, { points: R_BOT }] },
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
  // 링을 가득 채운 만렙 타워 군단도 언젠가 뚫리도록, 후반 적 체력을 세게 지수적으로 키운다.
  const late = Math.max(0, n - 10);
  const swarm = 6 + Math.floor(t * 0.9) + Math.floor(late ** 1.35 * 0.1);
  const interval = Math.max(80, 335 - t * 6);
  const fastShare = Math.min(0.62, 0.18 + t * 0.025);
  // 웨이브 전체 체력 배율: 10웨이브까진 1.0, 그 뒤 웨이브당 복리 +6%.
  // (60웨이브 무난 → 25웨이브 급사로 과보정됐던 걸 되돌림.)
  const hpFactor = 1.06 ** late;
  // 20웨이브부터 스웜 이동속도도 서서히 오른다(타워 사격 시간 압박).
  const spd = 1 + Math.max(0, n - 20) * 0.022;
  const withHp = (m = 1): Partial<WaveGroup> => ({ hpMultiplier: m * hpFactor });
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

  across(fastLanes, 'fast', Math.round(swarm * fastShare), { ...withHp(), speedMultiplier: spd });
  across(normalLanes, 'normal', Math.round(swarm * (1 - fastShare)), { intervalMs: interval + 60, startDelayMs: 400, ...withHp(), speedMultiplier: spd });

  if (n >= 5) {
    across(specialLanes, 'tank', 1 + Math.floor((n - 5) / 5), {
      intervalMs: 900, startDelayMs: 1000, ...withHp(1 + t * 0.022),
    });
  }
  if (n >= 7 && n % 2 === 1) {
    across(specialLanes, 'shield', 2 + Math.floor(t / 6), { intervalMs: 400, startDelayMs: 1400, ...withHp() });
  }
  if (n >= 9 && n % 3 === 0) {
    across(specialLanes, 'regenerator', 2 + Math.floor(t / 8), { intervalMs: 540, startDelayMs: 1600, ...withHp() });
  }
  if (n >= 12 && n % 4 === 0) {
    across(specialLanes, 'summoner', 1 + Math.floor(t / 10), { intervalMs: 900, startDelayMs: 1800, ...withHp() });
  }
  // 40웨이브부터 5웨이브마다 새 위협: 분열체·광전사, 그리고 준보스 파쇄기.
  if (n >= 40 && n % 5 === 0) {
    const step = Math.floor((n - 40) / 5);
    across(specialLanes, 'splitter', 2 + Math.floor(step / 2), { intervalMs: 700, startDelayMs: 1500, ...withHp() });
    across(specialLanes, 'berserker', 2 + Math.floor(step / 2), { intervalMs: 520, startDelayMs: 1900, ...withHp(), speedMultiplier: spd });
    across(bossLanes, 'crusher', 1 + Math.floor(step / 3), { intervalMs: 2600, startDelayMs: 2400, ...withHp() });
  }
  if (n >= 10 && n % 5 === 0) {
    // 15웨이브까지는 한 입구에서만, 그 뒤 사방 협공. 첫 보스는 기본 체력보다 약하게 시작.
    const bossFrom = phase === 'both' ? bossLanes : [alt === 0 ? 0 : 3];
    const bossCount = n >= 50 ? 4 : n >= 35 ? 3 : n >= 25 ? 2 : 1;
    across(bossFrom, 'boss', bossCount, {
      intervalMs: 3400, startDelayMs: 1200,
      // 첫 보스가 너무 쎘다 — 시작 배율 낮추고 램프도 완만하게. 이동속도는 −1/5.
      speedMultiplier: 0.8,
      hpMultiplier: (0.4 + Math.floor((n - 10) / 5) * 0.16) * hpFactor,
      shieldMultiplier: 1 + Math.max(0, Math.floor((n - 20) / 10)) * 0.2,
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
    spawn: LEFT_SPAWN,
    goals: [TOP_GOAL, BOT_GOAL],
    path: PATH,
    startGold: 410,
    startLives: 22,
    starThresholds: [0.3, 0.6, 0.9],
    waves: endlessWaves(),
  };
}
