import type { Vec2 } from '../core/types';

export interface Targetable {
  id: number;
  pos: Vec2;
  progress: number;
  alive: boolean;
  hp?: number;
  /** 소환 부하처럼 단일 공격의 표적을 먼저 받는 유닛. */
  intercepts?: boolean;
}

/** 선두(경로 최전방) / 후미 / 최대체력 / 최근접. */
export type TargetPriority = 'first' | 'last' | 'strong' | 'close';

export const TARGET_PRIORITIES: TargetPriority[] = ['first', 'last', 'strong', 'close'];

export const TARGET_PRIORITY_LABEL: Record<TargetPriority, string> = {
  first: '선두', last: '후미', strong: '최대 체력', close: '최근접',
};

function dist2(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x, dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** priority 기준 우선 정렬값. 클수록 우선. 동점은 낮은 id. */
function scoreFor(e: Targetable, origin: Vec2, priority: TargetPriority): number {
  switch (priority) {
    case 'last': return -e.progress;
    case 'strong': return e.hp ?? 0;
    case 'close': return -dist2(origin, e.pos);
    case 'first':
    default: return e.progress;
  }
}

export function pickTarget(
  origin: Vec2,
  range: number,
  enemies: Targetable[],
  priority: TargetPriority = 'first',
): Targetable | null {
  const r2 = range * range;
  let best: Targetable | null = null;
  let bestScore = -Infinity;
  let bestInterceptRank = -1;
  for (const e of enemies) {
    if (!e.alive) continue;
    if (dist2(origin, e.pos) > r2) continue;

    const interceptRank = e.intercepts ? 1 : 0;
    const score = scoreFor(e, origin, priority);
    if (
      best === null
      || interceptRank > bestInterceptRank
      || (interceptRank === bestInterceptRank && (score > bestScore || (score === bestScore && e.id < best.id)))
    ) {
      best = e;
      bestScore = score;
      bestInterceptRank = interceptRank;
    }
  }
  return best;
}

export function enemiesInRadius(center: Vec2, radius: number, enemies: Targetable[]): Targetable[] {
  const r2 = radius * radius;
  return enemies.filter((e) => e.alive && dist2(center, e.pos) <= r2);
}
