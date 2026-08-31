export interface PoisonArmorPierceEffect {
  armorPierce: number;
}

const POISON_ARMOR_PIERCE_BY_LEVEL: Readonly<Record<number, PoisonArmorPierceEffect>> = {
  3: { armorPierce: 8 },
  4: { armorPierce: 8 },
  5: { armorPierce: 15 },
};

/** 3·5합 독탑의 독탄 직접 피해가 무시하는 방어력. */
export function poisonArmorPierceEffect(level: number): PoisonArmorPierceEffect | undefined {
  return POISON_ARMOR_PIERCE_BY_LEVEL[level];
}
