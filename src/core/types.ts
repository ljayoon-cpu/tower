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

  armorPierce?: number;   // 방어력에서 무시할 수치
}

export interface TowerDef {
  key: string;
  name: string;
  attack: AttackKind;
  cost: number;         // Lv1 설치 비용
  maxLevel: number;     // 5
  levels: TowerLevelStats[]; // length === maxLevel, index 0 = Lv1
}

export type MovementLayer = 'ground' | 'air';

export interface EnemyShieldDef {
  /** 방어막이 먼저 흡수하는 피해량. */
  energy: number;
  /** 피격 뒤 방어막 회복을 시작하기까지의 시간. */
  rechargeDelayMs: number;
  /** 방어막 초당 회복량. */
  rechargePerSecond: number;
}

export interface EnemySummonDef {
  /** 소환할 EnemyDef.key */
  enemyKey: string;
  intervalMs: number;
  maxAlive: number;
}

/** 보스 체력이 지정 비율 이하가 될 때 한 번만 발동하는 전투 단계. */
export interface BossPhaseDef {
  name: string;
  atHealthRatio: number;
  speedMultiplier: number;
  /** 최대 보호막의 이 비율까지 즉시 회복한다. */
  shieldRestoreRatio?: number;
  /** 즉시 부르는 증원군. 일반 소환사의 생존 수 제한과는 별개다. */
  summon?: { enemyKey: string; count: number };
}

export interface EnemyDef {
  key: string;
  name: string;
  hp: number;
  speed: number;        // 픽셀/초
  bounty: number;
  lifeDamage: number;
  isBoss?: boolean;
  /** 공중 경로와 대공 타워는 후속 챕터에서 사용한다. */
  movementLayer?: MovementLayer;
  /** 보호막을 모두 잃은 뒤 체력에 적용되는 고정 피해 감소량. */
  armor?: number;
  shield?: EnemyShieldDef;
  regenPerSecond?: number;
  /** 중독 피해 배율(0~1). 지정 시 poisonDps에 곱해진다. 보스류가 공략을 강제. */
  poisonResist?: number;
  /** 직접 타격 투사체가 우선 조준하는 보호 유닛 여부. */
  intercepts?: boolean;
  summon?: EnemySummonDef;
  /** 체력 구간별 이동·보호막·증원 패턴. isBoss 적에서만 사용한다. */
  bossPhases?: BossPhaseDef[];
}

export interface WaveGroup {
  enemy: string;        // EnemyDef.key
  count: number;
  intervalMs: number;   // 그룹 내 스폰 간격
  startDelayMs: number; // 웨이브 시작 기준 지연
  /** 같은 적을 후반 웨이브에서 단계적으로 강화한다. */
  hpMultiplier?: number;
  speedMultiplier?: number;
  shieldMultiplier?: number;
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
  /** 보스전. 이 스테이지에서만 타워 1종이 랜덤 봉인된다. */
  bossStage?: boolean;
}

export interface StageProgress { stars: number; unlocked: boolean; }
export interface SaveData {
  stages: Record<string, StageProgress>;
  /** 1-1 첫 진입 튜토리얼을 끝냈는지. */
  tutorialDone?: boolean;
  /** 판 사이 영구 성장. 코어와 업그레이드 레벨. */
  meta?: { cores: number; upgrades: Record<string, number> };
}

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
  'boss:phase': { name: string; phaseName: string };
  'boss:cleared': Record<string, never>;
  /** 다음 웨이브 자동 시작까지 남은 초. null = 카운트다운 없음(진행 중 / 종료). */
  'wave:countdown': { seconds: number | null };
  /** 웨이브 클리어 시 남긴 골드로 받은 이자. */
  'interest:earned': { amount: number };
  /** 튜토리얼 안내 문구. null = 튜토리얼 종료(숨김). */
  'tutorial:step': { text: string | null };
};
