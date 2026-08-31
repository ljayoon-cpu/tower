import type { Targetable } from './TargetingSystem';
import type { Vec2 } from '../core/types';

/**
 * 체인 라이트닝 데미지 배열. 길이 `extraJumps + 1`,
 * `[round(base), round(base*falloff), round(base*falloff^2), ...]`.
 */
export function chainDamages(base: number, falloff: number, extraJumps: number): number[] {
  const out: number[] = [];
  let mult = 1;
  for (let i = 0; i <= extraJumps; i++) {
    out.push(Math.round(base * mult));
    mult *= falloff;
  }
  return out;
}

/**
 * 레이저탑 램프 데미지. 같은 대상 연속 명중 스택 `stacks` 에 비례해 배율이
 * `1 + stacks*rampPct` 로 오르고 `rampMax` 에서 멈춘다. 반올림.
 */
export function beamDamage(base: number, stacks: number, rampPct: number, rampMax: number): number {
  const mult = Math.min(rampMax, 1 + Math.max(0, stacks) * rampPct);
  return Math.round(base * mult);
}

/**
 * 지휘탑 버프 배율. 여러 오라가 겹쳐도 중첩되지 않고 가장 강한 값만 적용한다.
 * `auras` 는 각 지휘탑이 주는 비율(0.1 = +10%). 빈 배열이면 1.
 */
export function buffMultiplier(auras: number[]): number {
  return 1 + Math.max(0, ...auras, 0);
}

function dist2(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x, dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * `primary` 부터 시작해 매 점프마다 "아직 안 맞은 살아있는 적 중
 * 마지막 피격 지점에서 `chainRange` 이내 최근접"을 greedy 선택.
 * 범위 내 대상이 없으면 조기 종료. 반환 `[primary, ...점프들]`.
 */
export function buildChain(
  primary: Targetable,
  all: Targetable[],
  chainRange: number,
  extraJumps: number,
): Targetable[] {
  const chain: Targetable[] = [primary];
  const hit = new Set<number>([primary.id]);
  const r2 = chainRange * chainRange;
  let current = primary;
  for (let j = 0; j < extraJumps; j++) {
    let best: Targetable | null = null;
    let bestD = Infinity;
    for (const e of all) {
      if (!e.alive || hit.has(e.id)) continue;
      const d = dist2(current.pos, e.pos);
      if (d <= r2 && d < bestD) { best = e; bestD = d; }
    }
    if (!best) break;
    chain.push(best);
    hit.add(best.id);
    current = best;
  }
  return chain;
}
