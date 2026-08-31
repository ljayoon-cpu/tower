import type { TowerDef } from '../core/types';

export const TOWERS: Record<string, TowerDef> = {
  // 머지 비용은 레벨마다 2배로 늘지만(2^(n-1) x cost), 데미지는 그보다 가파르게
  // 오른다. 즉 자리를 합쳐 레벨을 올리면 골드당 화력이 커진다 — 넓게 깔기와
  // 높게 쌓기를 저울질하게 만드는 핵심 수치.
  arrow: {
    key: 'arrow', name: '화살탑', attack: 'single', cost: 50, maxLevel: 5,
    levels: [
      { damage: 8,   range: 150, fireRate: 2.0 },
      { damage: 14,  range: 162, fireRate: 2.2 },
      { damage: 28,  range: 174, fireRate: 2.4, projectileCount: 2, projectileDamageMultiplier: 0.6 },
      { damage: 56,  range: 188, fireRate: 2.7, projectileCount: 2, projectileDamageMultiplier: 0.6 },
      { damage: 113, range: 205, fireRate: 3.0, projectileCount: 3, projectileDamageMultiplier: 0.45 },
    ],
  },
  cannon: {
    // 광역. 단일 화력·연사는 화살보다 낮지만 뭉친 적을 한 번에 친다.
    key: 'cannon', name: '파열탑', attack: 'splash', cost: 110, maxLevel: 5,
    levels: [
      { damage: 24,  range: 132, fireRate: 0.58, splashRadius: 58 },
      { damage: 44,  range: 138, fireRate: 0.62, splashRadius: 66 },
      { damage: 86,  range: 146, fireRate: 0.66, splashRadius: 76, armorBreakPercent: 0.1, armorBreakDurationMs: 1500 },
      { damage: 170, range: 154, fireRate: 0.70, splashRadius: 88, armorBreakPercent: 0.1, armorBreakDurationMs: 1500 },
      { damage: 340, range: 164, fireRate: 0.76, splashRadius: 102, armorBreakPercent: 0.2, armorBreakDurationMs: 2000 },
    ],
  },
  frost: {
    // 감속이 정체성이지만 데미지도 화살에 약간 못 미치는 수준으로 받쳐, 혼자서도 초반은 넘긴다.
    key: 'frost', name: '서리탑', attack: 'slow', cost: 60, maxLevel: 5,
    levels: [
      { damage: 10, range: 142, fireRate: 1.7, slowMul: 0.75, slowDurationMs: 1200 },
      { damage: 19, range: 152, fireRate: 1.8, slowMul: 0.68, slowDurationMs: 1350 },
      { damage: 38, range: 162, fireRate: 1.9, slowMul: 0.58, slowDurationMs: 1500 },
      { damage: 74, range: 172, fireRate: 2.0, slowMul: 0.47, slowDurationMs: 1700 },
      { damage: 140, range: 184, fireRate: 2.1, slowMul: 0.35, slowDurationMs: 2000 },
    ],
  },
  bolt: {
    // 체인 라이트닝: 1차 대상 명중 후 근처 적에게 순차 전이, 전이마다 데미지 ×chainFalloff.
    key: 'bolt', name: '번개탑', attack: 'chain', cost: 95, maxLevel: 5,
    levels: [
      { damage: 7,  range: 150, fireRate: 2.4, chainTargets: 2, chainFalloff: 0.55, chainRange: 90 },
      { damage: 12, range: 160, fireRate: 2.5, chainTargets: 2, chainFalloff: 0.60, chainRange: 98 },
      { damage: 23, range: 170, fireRate: 2.6, chainTargets: 3, chainFalloff: 0.65, chainRange: 106 },
      { damage: 44, range: 182, fireRate: 2.8, chainTargets: 3, chainFalloff: 0.70, chainRange: 116 },
      { damage: 84, range: 196, fireRate: 3.0, chainTargets: 4, chainFalloff: 0.78, chainRange: 128 },
    ],
  },
  sniper: {
    // 고비용·장거리 단일 화력. 관통으로 장갑·보호막에 강하지만 연사가 느려
    // 스웜엔 약하다.
    key: 'sniper', name: '저격탑', attack: 'single', cost: 125, maxLevel: 5,
    levels: [
      { damage: 30,  range: 222, fireRate: 0.82, armorPierce: 3 },
      { damage: 60,  range: 237, fireRate: 0.88, armorPierce: 5 },
      { damage: 120, range: 252, fireRate: 0.96, armorPierce: 7 },
      { damage: 240, range: 268, fireRate: 1.05, armorPierce: 10 },
      { damage: 480, range: 284, fireRate: 1.15, armorPierce: 14 },
    ],
  },
  poison: {
    // 좁은 반경에 중독을 갱신하는 지속 피해형. 스웜엔 훌륭하지만 단일 대상 화력이
    // 낮아 보스전은 혼자 못 끝낸다.
    key: 'poison', name: '역병탑', attack: 'poison', cost: 90, maxLevel: 5,
    levels: [
      { damage: 2,  range: 148, fireRate: 1.3, poisonDps: 8,  poisonDurationMs: 1500, poisonRadius: 52 },
      { damage: 4,  range: 158, fireRate: 1.4, poisonDps: 15, poisonDurationMs: 1600, poisonRadius: 60 },
      { damage: 7,  range: 168, fireRate: 1.5, poisonDps: 27, poisonDurationMs: 1800, poisonRadius: 68 },
      { damage: 13, range: 180, fireRate: 1.6, poisonDps: 48, poisonDurationMs: 2000, poisonRadius: 78 },
      { damage: 24, range: 192, fireRate: 1.7, poisonDps: 86, poisonDurationMs: 2200, poisonRadius: 90 },
    ],
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
    levels: [
      { damage: 3,  range: 110, fireRate: 0.9,  goldPerTick: 1,  goldIntervalMs: 1000 },
      { damage: 6,  range: 116, fireRate: 0.95, goldPerTick: 2,  goldIntervalMs: 1000 },
      { damage: 12, range: 124, fireRate: 1.0,  goldPerTick: 4,  goldIntervalMs: 1000, mineWaveBonus: 12 },
      { damage: 23, range: 132, fireRate: 1.05, goldPerTick: 7,  goldIntervalMs: 1000, mineWaveBonus: 12 },
      { damage: 45, range: 142, fireRate: 1.1,  goldPerTick: 12, goldIntervalMs: 1000, mineWaveBonus: 28 },
    ],
  },
};

export const TOWER_KEYS = Object.keys(TOWERS);

export function getTower(key: string): TowerDef {
  const t = TOWERS[key];
  if (!t) throw new Error(`unknown tower: ${key}`);
  return t;
}

/** 판매 기준액은 레벨과 무관하게 Lv1 설치비. 머지에 쓴 비용은 회수하지 못한다. */
export function cumulativeCost(def: TowerDef, _level: number): number {
  return def.cost;
}

/**
 * 머지 대신 골드로 바로 다음 레벨(level → level+1)로 올리는 비용.
 * 머지 상당 비용(2^(level-1) × 설치비) + 레벨당 10G 프리미엄. 머지가 살짝 이득이지만
 * 자리·타워가 없어도 즉시 강화할 수 있다.
 */
export function upgradeCost(def: TowerDef, level: number): number {
  return def.cost * 2 ** (level - 1) + 10 * level;
}
