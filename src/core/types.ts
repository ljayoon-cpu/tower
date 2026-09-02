export interface Vec2 { x: number; y: number; }
export interface TileCoord { col: number; row: number; }

export type TileType = 'PATH' | 'BUILDABLE' | 'BLOCKED';

/** 경로 트리. points 를 따라가다 branches 가 있으면 각 분기로 갈라진다. */
export interface PathNode {
  points: Vec2[];
  branches?: PathNode[];
}

export type AttackKind = 'single' | 'splash' | 'slow' | 'chain' | 'poison' | 'beam' | 'support';

/** 원소 첨탑의 원소. 충전 시 명중한 적에게 이 원소의 각인을 남긴다. */
export type ElementKind = 'ice' | 'lightning' | 'decay' | 'fire';

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
  /** 공중 표적에 곱하는 피해 배율. 기본 1. 대공탑(창공탑)이 크게 가진다. */
  airDamageMultiplier?: number;

  // --- 머지 3·5합 능력 (경로 stat 으로 이관) ---
  /** 서리탑: freezeHits 회 적중마다 짧게 빙결. */
  freezeHits?: number; freezeDurationMs?: number; freezeCooldownMs?: number;
  /** 번개탑: 적중 시 이동 정지(재발동 대기). */
  staggerDurationMs?: number; staggerCooldownMs?: number;
  /** 저격탑: 체력 executeHealthRatio 이하 적에게 executeDamageMultiplier 배. */
  executeHealthRatio?: number; executeDamageMultiplier?: number;
  /** 역병탑: 독탄 직접 피해가 무시하는 방어력. */
  poisonArmorPierce?: number;

  // --- 경로 B 신규 메커니즘 ---
  /** 역병 B: 중독 적 주변으로 전염(개당 poisonDps × poisonSpreadRatio). */
  poisonSpreadRadius?: number; poisonSpreadRatio?: number;
  /** 저격 B: 투사체가 tower→target 라인의 모든 적을 관통. */
  pierceAll?: boolean;
  /** 서리 B: 투사체 대신 반경 내 상시 감속·소량 피해. */
  slowAura?: boolean; slowAuraRadius?: number;
  /** 번개 B: 방어막을 완전히 무시. */
  shieldPierce?: boolean;
  /** 대포 B: 착탄 지점 지면 화상 장판. */
  burnDps?: number; burnDurationMs?: number; burnRadius?: number;

  // 화살탑 머지 3·5합: 한 번에 여러 발을 근처 표적에 쏜다.
  projectileCount?: number;
  projectileDamageMultiplier?: number;   // 멀티샷 한 발의 피해 배율
  // 대포 머지 3·5합: 광역 피격 적의 방어력을 잠시 낮춘다.
  armorBreakPercent?: number;            // 0.1 = 10%
  armorBreakDurationMs?: number;

  // beam(레이저탑): 같은 대상을 연속 명중할수록 데미지가 누적 증가한다.
  beamRampPct?: number;   // 연속 명중마다 더해지는 데미지 비율 (0.15 = +15%p)
  beamRampMax?: number;   // 누적 데미지 배율 상한 (3 = 최대 300%)

  // support(지휘탑): 사거리 안 아군 타워의 데미지·연사를 올린다. 중첩 없음(최대값만).
  buffRadius?: number;
  buffDamagePct?: number;
  buffFireRatePct?: number;
  buffRangePct?: number;   // 지휘탑 3·5합: 주변 타워 사거리도 올린다
  // support(금광탑): goldIntervalMs 마다 goldPerTick 골드를 생성한다.
  goldPerTick?: number;
  goldIntervalMs?: number;
  mineWaveBonus?: number;  // 금광탑 3·5합: 웨이브 클리어마다 추가 골드
}

/** Lv3 분기 경로 하나. levels 는 정확히 3 = Lv3, Lv4, Lv5. */
export interface TowerPathDef {
  key: 'a' | 'b';
  name: string;
  desc: string;
  levels: TowerLevelStats[]; // 정확히 3 = Lv3, Lv4, Lv5
}

export interface TowerDef {
  key: string;
  name: string;
  attack: AttackKind;
  cost: number;         // Lv1 설치 비용
  maxLevel: number;     // 5
  /** 지상 표적을 조준하는가. 기본 true. */
  targetsGround?: boolean;
  /** 공중 표적을 조준하는가. 기본 true. 파열탑·역병탑은 false. */
  targetsAir?: boolean;
  levels: TowerLevelStats[]; // length === maxLevel, index 0 = Lv1
  /** 있으면 분기 타워: levels 는 Lv1~2, Lv3~5 는 paths 에서 고른다. */
  paths?: { a: TowerPathDef; b: TowerPathDef };
  /** 있으면 원소 첨탑 — 충전 시 명중한 적에게 이 원소의 각인을 남긴다. 경로 무관. */
  element?: ElementKind;
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
  /** 타워 공격 종류별 피해 배율. 1 미만 = 저항, 1 초과 = 약점. 없으면 1.
   *  적마다 카운터 타워를 만드는 상성 시스템 (예: 장갑병은 splash에 약하고 single에 강함). */
  resist?: Partial<Record<AttackKind, number>>;
  /** 직접 타격 투사체가 우선 조준하는 보호 유닛 여부. */
  intercepts?: boolean;
  summon?: EnemySummonDef;
  /** 체력 구간별 이동·보호막·증원 패턴. isBoss 적에서만 사용한다. */
  bossPhases?: BossPhaseDef[];
  /** 분열체: 죽으면 그 자리에서 이 적으로 쪼개진다(경로 진행도 이어받음). */
  deathSpawn?: { enemyKey: string; count: number };
  /** 광전사: 체력 비율이 rageBelow 이하가 되면 이동속도가 rageSpeedMultiplier 배가 된다. */
  rageBelow?: number;
  rageSpeedMultiplier?: number;
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
  /** 스폰 경로 인덱스(PathManager.routes()). 여러 스폰 지점이 있는 맵에서 어느
   *  입구로 나올지 지정. 생략 시 매 적마다 무작위 경로(모든 입구에 분산). */
  lane?: number;
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
  /** 무한 모드. 승리 조건이 없고 도달 웨이브를 기록한다. */
  endless?: boolean;
}

export interface StageProgress { stars: number; unlocked: boolean; }
export interface SaveData {
  stages: Record<string, StageProgress>;
  /** 1-1 첫 진입 튜토리얼을 끝냈는지. */
  tutorialDone?: boolean;
  /** 판 사이 영구 성장. 코어와 업그레이드 레벨. */
  meta?: { cores: number; upgrades: Record<string, number> };
  /** 무한 모드 최고 도달 웨이브. */
  endlessBest?: number;
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
