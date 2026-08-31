export interface SniperExecuteEffect {
  healthRatio: number;
  damageMultiplier: number;
}

const SNIPER_EXECUTE_BY_LEVEL: Readonly<Record<number, SniperExecuteEffect>> = {
  3: { healthRatio: 0.3, damageMultiplier: 1.6 },
  4: { healthRatio: 0.3, damageMultiplier: 1.6 },
  5: { healthRatio: 0.4, damageMultiplier: 2.2 },
};

/** 3·5합 저격탑의 마무리 사격 구간. */
export function sniperExecuteEffect(level: number): SniperExecuteEffect | undefined {
  return SNIPER_EXECUTE_BY_LEVEL[level];
}

export function sniperDamageMultiplier(level: number, targetHealthRatio: number): number {
  const effect = sniperExecuteEffect(level);
  return effect && targetHealthRatio <= effect.healthRatio ? effect.damageMultiplier : 1;
}
