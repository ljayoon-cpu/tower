export interface Vec2 { x: number; y: number; }
export interface TileCoord { col: number; row: number; }

export type TileType = 'PATH' | 'BUILDABLE' | 'BLOCKED';

/** 경로 트리. points 를 따라가다 branches 가 있으면 각 분기로 갈라진다. */
export interface PathNode {
  points: Vec2[];
  branches?: PathNode[];
}

export type AttackKind = 'single' | 'splash' | 'slow' | 'ramp';

export interface TowerLevelStats {
  damage: number;
  range: number;        // 픽셀
  fireRate: number;     // 초당 발사 횟수
  splashRadius?: number;
  slowMul?: number;     // 0.5 = 50% 감속
  slowDurationMs?: number;
  rampStep?: number;    // 연속 명중당 데미지 배수 증가분 (0.1 = +10%)
  rampMax?: number;     // 최대 배수 (2 = 200%)
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
  starThresholds: [number, number, number]; // 남은 라이프 비율 [1별,2별,3별], 내림차순
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
};
