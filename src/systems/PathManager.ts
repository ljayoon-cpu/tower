import type { PathNode, Vec2 } from '../core/types';
import type { Rng } from '../core/rng';

export class PathManager {
  private readonly _routes: Vec2[][];

  constructor(root: PathNode) {
    this._routes = PathManager.expand(root);
  }

  private static expand(node: PathNode, prefix: Vec2[] = []): Vec2[][] {
    // prefix 의 마지막 점이 node.points[0] 과 같으면 중복 제거
    const merged = [...prefix];
    for (const p of node.points) {
      const last = merged[merged.length - 1];
      if (!last || last.x !== p.x || last.y !== p.y) merged.push(p);
    }
    if (!node.branches || node.branches.length === 0) return [merged];
    let out: Vec2[][] = [];
    for (const b of node.branches) out = out.concat(PathManager.expand(b, merged));
    return out;
  }

  routes(): Vec2[][] {
    return this._routes;
  }

  static polylineLength(polyline: Vec2[]): number {
    let len = 0;
    for (let i = 1; i < polyline.length; i++) {
      len += Math.hypot(polyline[i].x - polyline[i - 1].x, polyline[i].y - polyline[i - 1].y);
    }
    return len;
  }

  static advance(polyline: Vec2[], distance: number): { pos: Vec2; done: boolean; progress: number } {
    const total = PathManager.polylineLength(polyline);
    if (distance >= total) {
      return { pos: { ...polyline[polyline.length - 1] }, done: true, progress: 1 };
    }
    let remaining = Math.max(0, distance);
    for (let i = 1; i < polyline.length; i++) {
      const a = polyline[i - 1];
      const b = polyline[i];
      const seg = Math.hypot(b.x - a.x, b.y - a.y);
      if (remaining <= seg) {
        const t = seg === 0 ? 0 : remaining / seg;
        return {
          pos: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
          done: false,
          progress: total === 0 ? 0 : distance / total,
        };
      }
      remaining -= seg;
    }
    return { pos: { ...polyline[polyline.length - 1] }, done: true, progress: 1 };
  }

  chooseRoute(rng: Rng): { routeIndex: number; polyline: Vec2[]; length: number } {
    const routeIndex = rng.int(this._routes.length);
    const polyline = this._routes[routeIndex];
    return { routeIndex, polyline, length: PathManager.polylineLength(polyline) };
  }
}
