import type { TowerDef } from '../core/types';

export const TOWERS: Record<string, TowerDef> = {
  // 머지 비용은 레벨마다 2배로 늘지만(2^(n-1) x cost), 데미지는 그보다 가파르게
  // 오른다. 즉 자리를 합쳐 레벨을 올리면 골드당 화력이 커진다 — 넓게 깔기와
  // 높게 쌓기를 저울질하게 만드는 핵심 수치.
  // arrow/cannon/frost/bolt/sniper/poison 은 Lv3 에서 분기한다 (Task: tower-upgrade-branching).
  // levels 는 공통 Lv1~2 뿐, Lv3~5 는 paths.a / paths.b 에서 고른다. 경로 A/B 는 서로 다른
  // 방향: A = 분기 이전 타워 그대로(기존 3·5합 능력 계승), B = 신규 메커니즘(스펙 §5 초안 +
  // Task 10 밸런스 패스). 경로는 트레이드오프지 상향이 아니다 — A 는 분기 전 수치를 넘지 않는다.
  // 기존 머지 3·5합 능력(빙결·경직·처형·독관통)은 여기서 TowerLevelStats 필드로 이관됐다
  // (mergeEffects.ts 삭제). 경로 기본값은 'a' 라 동작은 종전과 동일하다.
  arrow: {
    key: 'arrow', name: '화살탑', attack: 'single', cost: 50, maxLevel: 5,
    levels: [
      { damage: 8,  range: 150, fireRate: 2.0 },
      { damage: 14, range: 162, fireRate: 2.2 },
    ],
    paths: {
      a: {
        key: 'a', name: '연발형', desc: '멀티샷 — 뭉친 스웜을 여러 발로.',
        levels: [
          { damage: 28,  range: 174, fireRate: 2.4, projectileCount: 2, projectileDamageMultiplier: 0.6 },
          { damage: 56,  range: 188, fireRate: 2.7, projectileCount: 2, projectileDamageMultiplier: 0.6 },
          { damage: 113, range: 205, fireRate: 3.0, projectileCount: 3, projectileDamageMultiplier: 0.45 },
        ],
      },
      b: {
        key: 'b', name: '관통형', desc: '관통 — 높은 방어구도 그대로 뚫는다.',
        levels: [
          { damage: 24, range: 218, fireRate: 2.2, armorPierce: 4 },
          { damage: 45, range: 235, fireRate: 2.3, armorPierce: 7 },
          { damage: 84, range: 256, fireRate: 2.4, armorPierce: 12 },
        ],
      },
    },
  },
  cannon: {
    // 광역. 단일 화력·연사는 화살보다 낮지만 뭉친 적을 한 번에 친다.
    key: 'cannon', name: '파열탑', attack: 'splash', cost: 110, maxLevel: 5,
    targetsAir: false, element: 'fire',
    levels: [
      { damage: 24, range: 132, fireRate: 0.58, splashRadius: 58 },
      { damage: 44, range: 138, fireRate: 0.62, splashRadius: 66 },
    ],
    paths: {
      a: {
        key: 'a', name: '제압형', desc: '방어 파괴 — 대장갑·거점을 무너뜨린다.',
        levels: [
          { damage: 86,  range: 146, fireRate: 0.66, splashRadius: 76, armorBreakPercent: 0.1, armorBreakDurationMs: 1500 },
          { damage: 170, range: 154, fireRate: 0.70, splashRadius: 88, armorBreakPercent: 0.1, armorBreakDurationMs: 1500 },
          { damage: 340, range: 164, fireRate: 0.76, splashRadius: 102, armorBreakPercent: 0.2, armorBreakDurationMs: 2000 },
        ],
      },
      b: {
        key: 'b', name: '융단형', desc: '융단 폭격 — 착탄 후 광역 화상.',
        levels: [
          { damage: 47,  range: 146, fireRate: 1.3, splashRadius: 84, burnDps: 10, burnDurationMs: 1400, burnRadius: 84 },
          { damage: 92,  range: 154, fireRate: 1.4, splashRadius: 96, burnDps: 18, burnDurationMs: 1400, burnRadius: 96 },
          { damage: 180, range: 164, fireRate: 1.5, splashRadius: 112, burnDps: 34, burnDurationMs: 1400, burnRadius: 112 },
        ],
      },
    },
  },
  frost: {
    // 감속이 정체성이지만 데미지도 화살에 약간 못 미치는 수준으로 받쳐, 혼자서도 초반은 넘긴다.
    key: 'frost', name: '서리탑', attack: 'slow', cost: 60, maxLevel: 5, element: 'ice',
    // 감속률은 완만하게: 10 / 15 / 20 / 25 / 30 %. 65%까지 갔던 예전엔 후반 적이 사실상 멈췄다.
    levels: [
      { damage: 10, range: 142, fireRate: 1.7, slowMul: 0.90, slowDurationMs: 1200 },
      { damage: 19, range: 152, fireRate: 1.8, slowMul: 0.85, slowDurationMs: 1350 },
    ],
    paths: {
      a: {
        key: 'a', name: '빙결형', desc: '빙결 CC — 적중을 쌓아 얼린다.',
        levels: [
          { damage: 38,  range: 162, fireRate: 1.9, slowMul: 0.80, slowDurationMs: 1500, freezeHits: 3, freezeDurationMs: 350, freezeCooldownMs: 4000 },
          { damage: 74,  range: 172, fireRate: 2.0, slowMul: 0.75, slowDurationMs: 1700, freezeHits: 3, freezeDurationMs: 350, freezeCooldownMs: 4000 },
          { damage: 140, range: 184, fireRate: 2.1, slowMul: 0.70, slowDurationMs: 2000, freezeHits: 3, freezeDurationMs: 700, freezeCooldownMs: 3000 },
        ],
      },
      b: {
        key: 'b', name: '냉기장형', desc: '냉기장 — 주변 전체 지속 감속.',
        levels: [
          { damage: 9,  range: 162, fireRate: 1.0, slowMul: 0.55, slowDurationMs: 400, slowAura: true, slowAuraRadius: 150 },
          { damage: 18, range: 172, fireRate: 1.0, slowMul: 0.5,  slowDurationMs: 400, slowAura: true, slowAuraRadius: 165 },
          { damage: 36, range: 184, fireRate: 1.0, slowMul: 0.42, slowDurationMs: 400, slowAura: true, slowAuraRadius: 185 },
        ],
      },
    },
  },
  bolt: {
    // 체인 라이트닝: 1차 대상 명중 후 근처 적에게 순차 전이, 전이마다 데미지 ×chainFalloff.
    key: 'bolt', name: '번개탑', attack: 'chain', cost: 95, maxLevel: 5, element: 'lightning',
    levels: [
      { damage: 7,  range: 150, fireRate: 2.4, chainTargets: 2, chainFalloff: 0.55, chainRange: 90 },
      { damage: 12, range: 160, fireRate: 2.5, chainTargets: 2, chainFalloff: 0.60, chainRange: 98 },
    ],
    paths: {
      a: {
        key: 'a', name: '과부하형', desc: '경직 — 연쇄가 적을 묶는다.',
        levels: [
          { damage: 23, range: 170, fireRate: 2.6, chainTargets: 3, chainFalloff: 0.65, chainRange: 106, staggerDurationMs: 120, staggerCooldownMs: 1800 },
          { damage: 44, range: 182, fireRate: 2.8, chainTargets: 3, chainFalloff: 0.70, chainRange: 116, staggerDurationMs: 120, staggerCooldownMs: 1800 },
          { damage: 84, range: 196, fireRate: 3.0, chainTargets: 4, chainFalloff: 0.78, chainRange: 128, staggerDurationMs: 250, staggerCooldownMs: 1800 },
        ],
      },
      b: {
        key: 'b', name: '직격형', desc: '직격 — 단일 대상에 방어막 무시 강타.',
        levels: [
          { damage: 34,  range: 196, fireRate: 2.6, chainTargets: 0, shieldPierce: true },
          { damage: 64,  range: 209, fireRate: 2.8, chainTargets: 0, shieldPierce: true },
          { damage: 118, range: 225, fireRate: 3.0, chainTargets: 0, shieldPierce: true },
        ],
      },
    },
  },
  sniper: {
    // 고비용·장거리 단일 화력. 관통으로 장갑·보호막에 강하지만 연사가 느려
    // 스웜엔 약하다.
    key: 'sniper', name: '저격탑', attack: 'single', cost: 125, maxLevel: 5,
    levels: [
      { damage: 30, range: 222, fireRate: 0.82, armorPierce: 3 },
      { damage: 60, range: 237, fireRate: 0.88, armorPierce: 5 },
    ],
    paths: {
      a: {
        key: 'a', name: '처형형', desc: '처형 — 체력 낮은 적을 마무리한다.',
        levels: [
          { damage: 120, range: 252, fireRate: 0.96, armorPierce: 7,  executeHealthRatio: 0.3, executeDamageMultiplier: 1.6 },
          { damage: 240, range: 268, fireRate: 1.05, armorPierce: 10, executeHealthRatio: 0.3, executeDamageMultiplier: 1.6 },
          { damage: 480, range: 284, fireRate: 1.15, armorPierce: 14, executeHealthRatio: 0.4, executeDamageMultiplier: 2.2 },
        ],
      },
      b: {
        key: 'b', name: '관통형(레일건)', desc: '레일건 — 직선상 모든 적 관통.',
        levels: [
          { damage: 92,  range: 302, fireRate: 0.77, armorPierce: 7,  pierceAll: true },
          { damage: 180, range: 321, fireRate: 0.84, armorPierce: 10, pierceAll: true },
          { damage: 350, range: 340, fireRate: 0.92, armorPierce: 14, pierceAll: true },
        ],
      },
    },
  },
  poison: {
    // 좁은 반경에 중독을 갱신하는 지속 피해형. 스웜엔 훌륭하지만 단일 대상 화력이
    // 낮아 보스전은 혼자 못 끝낸다.
    key: 'poison', name: '역병탑', attack: 'poison', cost: 90, maxLevel: 5,
    targetsAir: false, element: 'decay',
    levels: [
      { damage: 2, range: 148, fireRate: 1.3, poisonDps: 8,  poisonDurationMs: 1500, poisonRadius: 52 },
      { damage: 4, range: 158, fireRate: 1.4, poisonDps: 15, poisonDurationMs: 1600, poisonRadius: 60 },
    ],
    paths: {
      a: {
        key: 'a', name: '부식형', desc: '방어 무시 — 독이 장갑을 녹인다.',
        levels: [
          { damage: 7,  range: 168, fireRate: 1.5, poisonDps: 27, poisonDurationMs: 1800, poisonRadius: 68, poisonArmorPierce: 8 },
          { damage: 13, range: 180, fireRate: 1.6, poisonDps: 48, poisonDurationMs: 2000, poisonRadius: 78, poisonArmorPierce: 8 },
          { damage: 24, range: 192, fireRate: 1.7, poisonDps: 86, poisonDurationMs: 2200, poisonRadius: 90, poisonArmorPierce: 15 },
        ],
      },
      b: {
        key: 'b', name: '역병확산형', desc: '역병 확산 — 중독이 주변으로 전염.',
        levels: [
          { damage: 7,  range: 168, fireRate: 1.5, poisonDps: 20, poisonDurationMs: 1800, poisonRadius: 68, poisonSpreadRadius: 60, poisonSpreadRatio: 0.55 },
          { damage: 13, range: 180, fireRate: 1.6, poisonDps: 36, poisonDurationMs: 2000, poisonRadius: 78, poisonSpreadRadius: 72, poisonSpreadRatio: 0.55 },
          { damage: 24, range: 192, fireRate: 1.7, poisonDps: 64, poisonDurationMs: 2200, poisonRadius: 90, poisonSpreadRadius: 88, poisonSpreadRatio: 0.55 },
        ],
      },
    },
  },
  laser: {
    // 집중포화. 같은 대상을 계속 쏘면 데미지가 점점 오른다 — 보스·장갑병 상대로 최강,
    // 표적이 자주 바뀌는 스웜에는 램프가 안 쌓여 약하다.
    key: 'laser', name: '마광탑', attack: 'beam', cost: 115, maxLevel: 5,
    levels: [
      { damage: 15,  range: 176, fireRate: 1.4, beamRampPct: 0.10, beamRampMax: 2.0 },
      { damage: 27,  range: 188, fireRate: 1.5, beamRampPct: 0.11, beamRampMax: 2.2 },
      { damage: 50,  range: 200, fireRate: 1.6, beamRampPct: 0.12, beamRampMax: 2.4, armorBreakPercent: 0.25, armorBreakDurationMs: 900 },
      { damage: 96,  range: 212, fireRate: 1.7, beamRampPct: 0.13, beamRampMax: 2.7, armorBreakPercent: 0.25, armorBreakDurationMs: 900 },
      { damage: 186, range: 226, fireRate: 1.8, beamRampPct: 0.14, beamRampMax: 3.0, armorBreakPercent: 0.45, armorBreakDurationMs: 1200 },
    ],
  },
  command: {
    // 지원형. 직접 공격은 미약하지만 사거리 안의 아군 타워 데미지·연사를 올린다.
    // 타워를 뭉쳐 짓고 머지 위치를 고민하게 만든다.
    key: 'command', name: '지휘탑', attack: 'support', cost: 140, maxLevel: 5,
    levels: [
      { damage: 4,  range: 128, fireRate: 1.0,  buffRadius: 224, buffDamagePct: 0.10, buffFireRatePct: 0.06 },
      { damage: 8,  range: 134, fireRate: 1.05, buffRadius: 246, buffDamagePct: 0.14, buffFireRatePct: 0.09 },
      { damage: 15, range: 142, fireRate: 1.1,  buffRadius: 272, buffDamagePct: 0.19, buffFireRatePct: 0.12, buffRangePct: 0.10 },
      { damage: 29, range: 150, fireRate: 1.15, buffRadius: 300, buffDamagePct: 0.25, buffFireRatePct: 0.16, buffRangePct: 0.10 },
      { damage: 56, range: 160, fireRate: 1.2,  buffRadius: 336, buffDamagePct: 0.32, buffFireRatePct: 0.20, buffRangePct: 0.18 },
    ],
  },
  mine: {
    // 경제형. 직접 공격은 미약하지만 일정 주기마다 골드를 생성한다. 초반에 깔수록
    // 후반 자금이 커지지만 그만큼 방어를 늦게 세워야 한다.
    key: 'mine', name: '연금탑', attack: 'support', cost: 120, maxLevel: 5,
    // 골드 생성이 너무 셌다 — 생성 주기를 2배로(초당 골드 절반), 웨이브 보너스도 절반.
    // 필드당 최대 2기(runRules.towerBuildLimit).
    levels: [
      { damage: 3,  range: 110, fireRate: 0.9,  goldPerTick: 1, goldIntervalMs: 4000 },
      { damage: 6,  range: 116, fireRate: 0.95, goldPerTick: 1, goldIntervalMs: 2000 },
      { damage: 12, range: 124, fireRate: 1.0,  goldPerTick: 2, goldIntervalMs: 2000, mineWaveBonus: 3 },
      { damage: 23, range: 132, fireRate: 1.05, goldPerTick: 4, goldIntervalMs: 2000, mineWaveBonus: 3 },
      { damage: 45, range: 142, fireRate: 1.1,  goldPerTick: 6, goldIntervalMs: 2000, mineWaveBonus: 7 },
    ],
  },
  ballista: {
    // 대공 전용. 공중에 압도적, 지상엔 약하다. 3·5합 = 공중 다중 사격.
    key: 'ballista', name: '창공탑', attack: 'single', cost: 105, maxLevel: 5,
    targetsGround: true, targetsAir: true,
    levels: [
      { damage: 12,  range: 210, fireRate: 1.3, armorPierce: 2,  airDamageMultiplier: 3.4 },
      { damage: 22,  range: 224, fireRate: 1.4, armorPierce: 3,  airDamageMultiplier: 3.6 },
      { damage: 42,  range: 240, fireRate: 1.5, armorPierce: 5,  airDamageMultiplier: 3.8, projectileCount: 2, projectileDamageMultiplier: 0.6 },
      { damage: 82,  range: 256, fireRate: 1.6, armorPierce: 7,  airDamageMultiplier: 4.1, projectileCount: 2, projectileDamageMultiplier: 0.6 },
      { damage: 160, range: 274, fireRate: 1.7, armorPierce: 10, airDamageMultiplier: 4.5, projectileCount: 3, projectileDamageMultiplier: 0.45 },
    ],
  },
};

export const TOWER_KEYS = Object.keys(TOWERS);

export function getTower(key: string): TowerDef {
  const t = TOWERS[key];
  if (!t) throw new Error(`unknown tower: ${key}`);
  return t;
}

/**
 * 그 레벨까지 실제로 부은 골드 총액 = 설치비 + 이후 강화/머지 비용 누계.
 * upgradeCost(k) = cost·2^(k-1) 이므로 Σ_{k=1..level} 을 접으면 cost·2^(level-1).
 * (Lv1=cost, Lv2=×2, Lv3=×4, Lv5=×16.) 판매 환급은 이 총액의 60%(+메타) — 투자에 비례.
 */
export function cumulativeCost(def: TowerDef, level: number): number {
  const lv = Math.min(Math.max(Math.floor(level), 1), def.maxLevel);
  return def.cost * 2 ** (lv - 1);
}

/**
 * 머지 대신 골드로 바로 다음 레벨(level → level+1)로 올리는 비용.
 * 머지와 같은 값(2^(level-1) × 설치비) — 자리·타워가 없어도 즉시 강화할 수 있고
 * 가격 페널티는 없다. 머지는 자리/드래그가 필요한 대신 골드가 같다.
 */
export function upgradeCost(def: TowerDef, level: number): number {
  return def.cost * 2 ** (level - 1);
}
