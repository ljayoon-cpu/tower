/** 판 사이 영구 성장 — 별점으로 버는 "코어"로 시작 골드/라이프 등을 올린다. Phaser 비의존. */

export interface MetaUpgradeDef {
  key: string;
  name: string;
  desc: (level: number) => string;
  maxLevel: number;
  /** level(1..maxLevel) 구매 비용. */
  cost: (level: number) => number;
}

export interface MetaState {
  cores: number;
  upgrades: Record<string, number>;
}

/** 스테이지를 별 n개로 클리어했을 때 처음 받는 코어. 이후 갱신은 차액만. */
export function coresForStars(stars: number): number {
  return [0, 4, 9, 16][Math.max(0, Math.min(3, Math.floor(stars)))];
}

export const META_UPGRADES: MetaUpgradeDef[] = [
  {
    key: 'startGold', name: '초기 자금', maxLevel: 5,
    desc: (l) => `시작 골드 +${l * 25}`,
    cost: (l) => 6 + (l - 1) * 5,
  },
  {
    key: 'startLives', name: '방어선 보강', maxLevel: 5,
    desc: (l) => `시작 라이프 +${l * 2}`,
    cost: (l) => 8 + (l - 1) * 6,
  },
  {
    key: 'interest', name: '이자율', maxLevel: 4,
    desc: (l) => `웨이브 이자 +${l * 2}%p`,
    cost: (l) => 10 + (l - 1) * 8,
  },
  {
    key: 'sellBack', name: '재판매 계약', maxLevel: 3,
    desc: (l) => `판매 환급 +${l * 6}%p`,
    cost: (l) => 12 + (l - 1) * 10,
  },
];

export function getUpgrade(key: string): MetaUpgradeDef {
  const u = META_UPGRADES.find((x) => x.key === key);
  if (!u) throw new Error(`unknown upgrade: ${key}`);
  return u;
}

export function upgradeLevel(state: MetaState, key: string): number {
  return state.upgrades[key] ?? 0;
}

/** 다음 레벨 구매 비용. 이미 최대면 null. */
export function nextCost(state: MetaState, key: string): number | null {
  const def = getUpgrade(key);
  const lv = upgradeLevel(state, key);
  return lv >= def.maxLevel ? null : def.cost(lv + 1);
}

/** 구매 가능하면 코어를 차감하고 레벨을 올린 새 state를 반환. 불가하면 그대로. */
export function buyUpgrade(state: MetaState, key: string): MetaState {
  const cost = nextCost(state, key);
  if (cost === null || state.cores < cost) return state;
  return {
    cores: state.cores - cost,
    upgrades: { ...state.upgrades, [key]: upgradeLevel(state, key) + 1 },
  };
}

export interface MetaBonuses {
  startGold: number;
  startLives: number;
  interestRateBonus: number; // 0.02 단위
  sellRatioBonus: number;    // 0.06 단위
}

/** 현재 업그레이드 레벨을 스테이지에 적용할 보너스 수치로 변환. */
export function metaBonuses(state: MetaState): MetaBonuses {
  return {
    startGold: upgradeLevel(state, 'startGold') * 25,
    startLives: upgradeLevel(state, 'startLives') * 2,
    interestRateBonus: upgradeLevel(state, 'interest') * 0.02,
    sellRatioBonus: upgradeLevel(state, 'sellBack') * 0.06,
  };
}
