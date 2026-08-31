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

export function frostFreezeEffect(level: number): FrostFreezeEffect | undefined {
  return FROST_FREEZE_BY_LEVEL[level];
}
