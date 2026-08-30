import type { TowerDef } from '../core/types';

export const TOWERS: Record<string, TowerDef> = {
  arrow: {
    key: 'arrow', name: '화살탑', attack: 'single', cost: 50, maxLevel: 5,
    levels: [
      { damage: 8,  range: 150, fireRate: 2.0 },
      { damage: 13, range: 160, fireRate: 2.2 },
      { damage: 20, range: 170, fireRate: 2.4 },
      { damage: 30, range: 185, fireRate: 2.7 },
      { damage: 46, range: 200, fireRate: 3.0 },
    ],
  },
  cannon: {
    key: 'cannon', name: '대포', attack: 'splash', cost: 110, maxLevel: 5,
    levels: [
      { damage: 22, range: 130, fireRate: 0.7, splashRadius: 55 },
      { damage: 34, range: 135, fireRate: 0.75, splashRadius: 60 },
      { damage: 52, range: 142, fireRate: 0.8, splashRadius: 66 },
      { damage: 80, range: 150, fireRate: 0.85, splashRadius: 72 },
      { damage: 122, range: 160, fireRate: 0.9, splashRadius: 80 },
    ],
  },
  frost: {
    key: 'frost', name: '서리탑', attack: 'slow', cost: 80, maxLevel: 5,
    levels: [
      { damage: 3, range: 140, fireRate: 1.5, slowMul: 0.75, slowDurationMs: 1200 },
      { damage: 5, range: 148, fireRate: 1.6, slowMul: 0.70, slowDurationMs: 1300 },
      { damage: 8, range: 156, fireRate: 1.7, slowMul: 0.62, slowDurationMs: 1400 },
      { damage: 12, range: 165, fireRate: 1.8, slowMul: 0.54, slowDurationMs: 1600 },
      { damage: 18, range: 175, fireRate: 2.0, slowMul: 0.45, slowDurationMs: 1800 },
    ],
  },
  bolt: {
    // 체인 라이트닝: 1차 대상 명중 후 근처 적에게 순차 전이, 전이마다 데미지 ×chainFalloff.
    key: 'bolt', name: '번개탑', attack: 'chain', cost: 95, maxLevel: 5,
    levels: [
      { damage: 7,  range: 150, fireRate: 2.4, chainTargets: 2, chainFalloff: 0.55, chainRange: 90 },
      { damage: 11, range: 158, fireRate: 2.5, chainTargets: 2, chainFalloff: 0.60, chainRange: 95 },
      { damage: 17, range: 166, fireRate: 2.6, chainTargets: 3, chainFalloff: 0.65, chainRange: 100 },
      { damage: 26, range: 176, fireRate: 2.8, chainTargets: 3, chainFalloff: 0.70, chainRange: 110 },
      { damage: 40, range: 188, fireRate: 3.0, chainTargets: 4, chainFalloff: 0.75, chainRange: 120 },
    ],
  },
};

export const TOWER_KEYS = Object.keys(TOWERS);

export function getTower(key: string): TowerDef {
  const t = TOWERS[key];
  if (!t) throw new Error(`unknown tower: ${key}`);
  return t;
}

/** 판매 환급 기준액. 머지는 무료이므로 현재는 Lv1 설치비 고정. */
export function cumulativeCost(def: TowerDef, _level: number): number {
  return def.cost;
}
