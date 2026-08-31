export interface BoltStaggerEffect {
  durationMs: number;
  cooldownMs: number;
}

const BOLT_STAGGER_BY_LEVEL: Readonly<Record<number, BoltStaggerEffect>> = {
  3: { durationMs: 120, cooldownMs: 1800 },
  4: { durationMs: 120, cooldownMs: 1800 },
  5: { durationMs: 250, cooldownMs: 1800 },
};

/** 3·5합 번개탑이 적을 잠시 멈추게 하는 효과. */
export function boltStaggerEffect(level: number): BoltStaggerEffect | undefined {
  return BOLT_STAGGER_BY_LEVEL[level];
}
