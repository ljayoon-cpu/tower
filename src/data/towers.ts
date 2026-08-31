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
      { damage: 28,  range: 174, fireRate: 2.4 },
      { damage: 56,  range: 188, fireRate: 2.7 },
      { damage: 113, range: 205, fireRate: 3.0 },
    ],
  },
  cannon: {
    // 광역. 단일 화력·연사는 화살보다 낮지만 뭉친 적을 한 번에 친다.
    key: 'cannon', name: '대포', attack: 'splash', cost: 110, maxLevel: 5,
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
    key: 'poison', name: '독 타워', attack: 'poison', cost: 90, maxLevel: 5,
    levels: [
      { damage: 2,  range: 148, fireRate: 1.3, poisonDps: 8,  poisonDurationMs: 1500, poisonRadius: 52 },
      { damage: 4,  range: 158, fireRate: 1.4, poisonDps: 15, poisonDurationMs: 1600, poisonRadius: 60 },
      { damage: 7,  range: 168, fireRate: 1.5, poisonDps: 27, poisonDurationMs: 1800, poisonRadius: 68 },
      { damage: 13, range: 180, fireRate: 1.6, poisonDps: 48, poisonDurationMs: 2000, poisonRadius: 78 },
      { damage: 24, range: 192, fireRate: 1.7, poisonDps: 86, poisonDurationMs: 2200, poisonRadius: 90 },
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
