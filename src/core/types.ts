export interface Vec2 { x: number; y: number; }
export interface TileCoord { col: number; row: number; }

export type TileType = 'PATH' | 'BUILDABLE' | 'BLOCKED';

/** 경로 트리. points 를 따라가다 branches 가 있으면 각 분기로 갈라진다. */
export interface PathNode {
  points: Vec2[];
  branches?: PathNode[];
}

export type AttackKind = 'single' | 'splash' | 'slow' | 'chain' | 'poison';

export interface TowerLevelStats {
  damage: number;
  range: number;        // 픽셀
  fireRate: number;     // 초당 발사 횟수
  splashRadius?: number;
  slowMul?: number;     // 0.5 = 50% 감속
  slowDurationMs?: number;
  chainTargets?: number;  // 1차 대상 외에 추가로 튀는 적 수 (chain)
  chainFalloff?: number;  // 점프마다 곱해지는 데미지 배율 (0.65 = 매 점프 65%)
  chainRange?: number;    // 마지막 피격 적으로부터 다음 체인 대상 탐색 반경(px)
  poisonDps?: number;     // 중독 중 초당 피해
  poisonDurationMs?: number; // 중독 지속 시간
  poisonRadius?: number;  // 중독 투사체의 적용 반경(px)
}

export interface TowerDef {
  key: string;
  name: string;
  attack: AttackKind;
  cost: number;         // Lv1 설치 비용
  maxLevel: number;     // 5
  levels: TowerLevelStats[]; // length === maxLevel, index 0 = Lv1
}

export interface EnemyDef {
  key: string;
  name: string;
  hp: number;
  speed: number;        // 픽셀/초
  bounty: number;
  lifeDamage: number;
  isBoss?: boolean;
}

export interface WaveGroup {
  enemy: string;        // EnemyDef.key
  count: number;
  intervalMs: number;   // 그룹 내 스폰 간격
  startDelayMs: number; // 웨이브 시작 기준 지연
}

export interface Wave {
  groups: WaveGroup[];
  clearBonus: number;
}

export interface StageDef {
  id: string;                 // '1-1'
  grid: TileType[][];         // [row][col]
  path: PathNode;
  spawn: Vec2;                // 픽셀
  goals: Vec2[];              // 픽셀, 분기 끝점들
  startGold: number;
  startLives: number;
  waves: Wave[];
  starThresholds: [number, number, number]; // 남은 라이프 비율 하한 [1별,2별,3별], 오름차순
}

export interface StageProgress { stars: number; unlocked: boolean; }
export interface SaveData { stages: Record<string, StageProgress>; }

// `type` (not `interface`): an interface has no implicit index signature, so it
// would not satisfy the `Record<string, unknown>` constraint on createEventBus<T>().
export type GameEvents = {
  'enemy:killed': { bounty: number };
  'enemy:reachedGoal': { lifeDamage: number };
  'gold:changed': { gold: number };
  'life:changed': { lives: number };
  'wave:started': { index: number; total: number };
  'wave:cleared': { index: number };
  'stage:won': { stars: number };
  'stage:lost': Record<string, never>;
  'speed:changed': { multiplier: number };
  'pause:changed': { paused: boolean };
  'boss:spawned': { name: string };
  'boss:health': { ratio: number };
  'boss:cleared': Record<string, never>;
  /** 다음 웨이브 자동 시작까지 남은 초. null = 카운트다운 없음(진행 중 / 종료). */
  'wave:countdown': { seconds: number | null };
  /** 웨이브 클리어 시 남긴 골드로 받은 이자. */
  'interest:earned': { amount: number };
};
