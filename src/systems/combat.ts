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

/**
 * 멀티샷은 현재 선택된 표적을 반드시 포함하고, 그 주변의 가까운 유효 표적을 더 고른다.
 * 추가 표적도 포탑 사거리 안에 있어야 하며 같은 적을 두 번 쏘지 않는다.
 */
export function buildMultiShot(
  primary: Targetable,
  all: Targetable[],
  origin: Vec2,
  range: number,
  shotCount: number,
): Targetable[] {
  const r2 = range * range;
  const extras = all
    .filter((enemy) => enemy.alive && enemy.id !== primary.id && dist2(origin, enemy.pos) <= r2)
    .sort((a, b) => dist2(primary.pos, a.pos) - dist2(primary.pos, b.pos) || a.id - b.id)
    .slice(0, Math.max(0, shotCount - 1));
  return [primary, ...extras];
}
