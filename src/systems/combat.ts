import type { Targetable } from './TargetingSystem';
import type { TowerLevelStats, Vec2 } from '../core/types';

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
 * 화살탑 멀티샷 표적 선택. 현재 표적을 반드시 포함하고, 그 주변에서 사거리 안의
 * 가까운 유효 표적을 더 골라 최대 `shotCount` 명까지. 같은 적을 두 번 쏘지 않는다.
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
    .filter((e) => e.alive && e.id !== primary.id && dist2(origin, e.pos) <= r2)
    .sort((a, b) => dist2(primary.pos, a.pos) - dist2(primary.pos, b.pos) || a.id - b.id)
    .slice(0, Math.max(0, shotCount - 1));
  return [primary, ...extras];
}

/**
 * 지휘탑 버프 배율. 여러 오라가 겹쳐도 중첩되지 않고 가장 강한 값만 적용한다.
 * `auras` 는 각 지휘탑이 주는 비율(0.1 = +10%). 빈 배열이면 1.
 */
export function buffMultiplier(auras: number[]): number {
  return 1 + Math.max(0, ...auras, 0);
}

/** 저격탑 처형: 대상 체력 비율이 executeHealthRatio 이하면 executeDamageMultiplier, 아니면 1. */
export function executeMultiplier(stats: TowerLevelStats, targetHealthRatio: number): number {
  const r = stats.executeHealthRatio;
  const m = stats.executeDamageMultiplier;
  return r != null && m != null && targetHealthRatio <= r ? m : 1;
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
 * origin→target 방향 반직선에서 `bandWidth` 이내, `maxDistance` 안쪽에 있는
 * 살아있는 적을 진행 순서로 정렬해 반환. `maxDistance` 로 사거리를 제한한다.
 */
export function pierceLineTargets(
  origin: Vec2, target: Vec2, enemies: Targetable[], bandWidth: number, maxDistance: number,
): Targetable[] {
  const dx = target.x - origin.x, dy = target.y - origin.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const half = bandWidth / 2;
  return enemies
    .filter((e) => {
      if (!e.alive) return false;
      const rx = e.pos.x - origin.x, ry = e.pos.y - origin.y;
      const along = rx * ux + ry * uy;             // 라인 진행 거리
      const perp = Math.abs(rx * uy - ry * ux);    // 라인에서 수직 거리
      return along >= -8 && along <= maxDistance && perp <= half;
    })
    .sort((a, b) => {
      const aa = (a.pos.x - origin.x) * ux + (a.pos.y - origin.y) * uy;
      const bb = (b.pos.x - origin.x) * ux + (b.pos.y - origin.y) * uy;
      return aa - bb;
    });
}
