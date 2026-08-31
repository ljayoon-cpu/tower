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
    key: 'cannon', name: '대포', attack: 'splash', cost: 110, maxLevel: 5,
    levels: [
      { damage: 22,  range: 130, fireRate: 0.7,  splashRadius: 55 },
      { damage: 40,  range: 136, fireRate: 0.75, splashRadius: 62 },
      { damage: 78,  range: 144, fireRate: 0.8,  splashRadius: 70 },
      { damage: 155, range: 152, fireRate: 0.85, splashRadius: 80 },
      { damage: 310, range: 162, fireRate: 0.9,  splashRadius: 92 },
    ],
  },
  frost: {
    // 낮은 데미지, 강한 감속이 정체성. 레벨은 주로 감속률·지속을 키운다.
    key: 'frost', name: '서리탑', attack: 'slow', cost: 80, maxLevel: 5,
    levels: [
      { damage: 3,  range: 140, fireRate: 1.5, slowMul: 0.75, slowDurationMs: 1200 },
      { damage: 6,  range: 150, fireRate: 1.6, slowMul: 0.68, slowDurationMs: 1350 },
      { damage: 11, range: 160, fireRate: 1.7, slowMul: 0.58, slowDurationMs: 1500 },
      { damage: 20, range: 170, fireRate: 1.8, slowMul: 0.47, slowDurationMs: 1700 },
      { damage: 38, range: 182, fireRate: 2.0, slowMul: 0.35, slowDurationMs: 2000 },
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
    // 고비용·장거리 단일 화력. 골드 효율은 화살보다 낮아 좁은 자리와 보스전에 쓰인다.
    key: 'sniper', name: '저격탑', attack: 'single', cost: 125, maxLevel: 5,
    levels: [
      { damage: 28,  range: 220, fireRate: 0.72, armorPierce: 3 },
      { damage: 56,  range: 235, fireRate: 0.77, armorPierce: 5 },
      { damage: 112, range: 250, fireRate: 0.84, armorPierce: 7 },
      { damage: 225, range: 265, fireRate: 0.92, armorPierce: 10 },
      { damage: 450, range: 280, fireRate: 1.01, armorPierce: 14 },
    ],
  },
  poison: {
    // 좁은 반경에 중독을 갱신하는 지속 피해형. 단일 목표 골드 효율은 화살보다 낮다.
    key: 'poison', name: '독 타워', attack: 'poison', cost: 90, maxLevel: 5,
    levels: [
      { damage: 4,  range: 145, fireRate: 1.2, poisonDps: 8,   poisonDurationMs: 1600, poisonRadius: 42 },
      { damage: 8,  range: 155, fireRate: 1.3, poisonDps: 16,  poisonDurationMs: 1800, poisonRadius: 48 },
      { damage: 16, range: 165, fireRate: 1.4, poisonDps: 33,  poisonDurationMs: 2000, poisonRadius: 54 },
      { damage: 32, range: 176, fireRate: 1.5, poisonDps: 67,  poisonDurationMs: 2200, poisonRadius: 61 },
      { damage: 65, range: 188, fireRate: 1.6, poisonDps: 135, poisonDurationMs: 2400, poisonRadius: 68 },
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
