import type { Vec2 } from '../core/types';

export interface Targetable {
  id: number;
  pos: Vec2;
  progress: number;
  alive: boolean;
}

function dist2(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x, dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function pickTarget(origin: Vec2, range: number, enemies: Targetable[]): Targetable | null {
  const r2 = range * range;
  let best: Targetable | null = null;
  for (const e of enemies) {
    if (!e.alive) continue;
    if (dist2(origin, e.pos) > r2) continue;
    if (
      best === null ||
      e.progress > best.progress ||
      (e.progress === best.progress && e.id < best.id)
    ) {
      best = e;
    }
  }
  return best;
}

export function enemiesInRadius(center: Vec2, radius: number, enemies: Targetable[]): Targetable[] {
  const r2 = radius * radius;
  return enemies.filter((e) => e.alive && dist2(center, e.pos) <= r2);
}
