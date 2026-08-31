// 머지(합성) 3·5단계에서 붙는 타워별 추가 능력. 수치는 밸런스 담당(Codex) 소관.
// 화살탑 멀티샷·대포 방어구 파괴는 TowerLevelStats 필드로 towers.ts 에 직접 들어간다.

export interface FrostFreezeEffect {
  hits: number;
  durationMs: number;
  cooldownMs: number;
}

const FROST_FREEZE_BY_LEVEL: Readonly<Record<number, FrostFreezeEffect>> = {
  3: { hits: 3, durationMs: 350, cooldownMs: 4000 },
  4: { hits: 3, durationMs: 350, cooldownMs: 4000 },
  5: { hits: 3, durationMs: 700, cooldownMs: 3000 },
};

/** 서리탑: 적중을 누적해 정해진 횟수마다 짧게 빙결. */
export function frostFreezeEffect(level: number): FrostFreezeEffect | undefined {
  return FROST_FREEZE_BY_LEVEL[level];
}

export interface BoltStaggerEffect {
  durationMs: number;
  cooldownMs: number;
}

const BOLT_STAGGER_BY_LEVEL: Readonly<Record<number, BoltStaggerEffect>> = {
  3: { durationMs: 120, cooldownMs: 1800 },
  4: { durationMs: 120, cooldownMs: 1800 },
  5: { durationMs: 250, cooldownMs: 1800 },
};

/** 번개탑: 적중 시 잠깐 이동을 멈추게 함(재발동 대기시간 있음). */
export function boltStaggerEffect(level: number): BoltStaggerEffect | undefined {
  return BOLT_STAGGER_BY_LEVEL[level];
}

export interface PoisonArmorPierceEffect {
  armorPierce: number;
}

const POISON_ARMOR_PIERCE_BY_LEVEL: Readonly<Record<number, PoisonArmorPierceEffect>> = {
  3: { armorPierce: 8 },
  4: { armorPierce: 8 },
  5: { armorPierce: 15 },
};

/** 독탑: 독탄 직접 피해가 무시하는 방어력. */
export function poisonArmorPierceEffect(level: number): PoisonArmorPierceEffect | undefined {
  return POISON_ARMOR_PIERCE_BY_LEVEL[level];
}

export interface SniperExecuteEffect {
  healthRatio: number;
  damageMultiplier: number;
}

const SNIPER_EXECUTE_BY_LEVEL: Readonly<Record<number, SniperExecuteEffect>> = {
  3: { healthRatio: 0.3, damageMultiplier: 1.6 },
  4: { healthRatio: 0.3, damageMultiplier: 1.6 },
  5: { healthRatio: 0.4, damageMultiplier: 2.2 },
};

/** 저격탑: 체력이 healthRatio 이하인 적에게 마무리 사격(피해 배율). */
export function sniperExecuteEffect(level: number): SniperExecuteEffect | undefined {
  return SNIPER_EXECUTE_BY_LEVEL[level];
}

/** 대상 체력 비율에 따른 저격탑 피해 배율. 처형 구간 밖이면 1. */
export function sniperDamageMultiplier(level: number, targetHealthRatio: number): number {
  const effect = sniperExecuteEffect(level);
  return effect && targetHealthRatio <= effect.healthRatio ? effect.damageMultiplier : 1;
}
