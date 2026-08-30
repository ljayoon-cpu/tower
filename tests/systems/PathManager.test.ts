import { PathManager } from '../../src/systems/PathManager';
import { Rng } from '../../src/core/rng';
import type { PathNode } from '../../src/core/types';

// (0,0) -> (100,0) 후 두 분기: 위로 (100,-50), 아래로 (100,50)
const root: PathNode = {
  points: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
  branches: [
    { points: [{ x: 100, y: 0 }, { x: 100, y: -50 }] },
    { points: [{ x: 100, y: 0 }, { x: 100, y: 50 }] },
  ],
};

describe('PathManager', () => {
  it('expands into one polyline per leaf', () => {
    const pm = new PathManager(root);
    const rs = pm.routes();
    expect(rs.length).toBe(2);
    expect(rs[0][rs[0].length - 1]).toEqual({ x: 100, y: -50 });
    expect(rs[1][rs[1].length - 1]).toEqual({ x: 100, y: 50 });
  });

  it('polylineLength sums segments', () => {
    expect(PathManager.polylineLength([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }])).toBe(150);
  });

  it('advance interpolates along the polyline', () => {
    const line = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
    const a = PathManager.advance(line, 25);
    expect(a.pos).toEqual({ x: 25, y: 0 });
    expect(a.done).toBe(false);
    expect(a.progress).toBeCloseTo(0.25);
  });

  it('advance clamps and reports done at the end', () => {
    const line = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
    const a = PathManager.advance(line, 999);
    expect(a.pos).toEqual({ x: 100, y: 0 });
    expect(a.done).toBe(true);
    expect(a.progress).toBe(1);
  });

  it('chooseRoute is deterministic under a seeded rng', () => {
    const pm = new PathManager(root);
    const i1 = new PathManager(root).chooseRoute(new Rng(5)).routeIndex;
    const i2 = pm.chooseRoute(new Rng(5)).routeIndex;
    expect(i1).toBe(i2);
  });

  it('de-dups the shared junction point', () => {
    const pm = new PathManager(root);
    const rs = pm.routes();
    expect(rs[0]).toEqual([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: -50 }]);
    for (const route of rs) {
      for (let i = 1; i < route.length; i++) {
        const prev = route[i - 1];
        const cur = route[i];
        expect(prev.x === cur.x && prev.y === cur.y).toBe(false);
      }
    }
  });

  it('expands nested/recursive branches', () => {
    const nested: PathNode = {
      points: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
      branches: [
        {
          points: [{ x: 100, y: 0 }, { x: 200, y: 0 }],
          branches: [
            { points: [{ x: 200, y: 0 }, { x: 200, y: -50 }] },
            { points: [{ x: 200, y: 0 }, { x: 200, y: 50 }] },
          ],
        },
        { points: [{ x: 100, y: 0 }, { x: 100, y: 100 }] },
      ],
    };
    const rs = new PathManager(nested).routes();
    expect(rs.length).toBe(3);
    expect(rs[0][rs[0].length - 1]).toEqual({ x: 200, y: -50 });
    expect(rs[1][rs[1].length - 1]).toEqual({ x: 200, y: 50 });
    expect(rs[2][rs[2].length - 1]).toEqual({ x: 100, y: 100 });
  });

  it('chooseRoute returns polyline and matching length', () => {
    const pm = new PathManager(root);
    const res = pm.chooseRoute(new Rng(5));
    const goal = pm.routes()[res.routeIndex][pm.routes()[res.routeIndex].length - 1];
    expect(Array.isArray(res.polyline)).toBe(true);
    expect(res.polyline[res.polyline.length - 1]).toEqual(goal);
    expect(res.length).toBe(PathManager.polylineLength(res.polyline));
  });

  it('advance returns a fresh pos that cannot corrupt later calls', () => {
    const line = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
    const first = PathManager.advance(line, 25);
    first.pos.x = 9999;
    const second = PathManager.advance(line, 25);
    expect(second.pos).toEqual({ x: 25, y: 0 });
  });

  it('advance clamps progress to 0 for negative distance', () => {
    const line = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
    const a = PathManager.advance(line, -5);
    expect(a.pos).toEqual({ x: 0, y: 0 });
    expect(a.done).toBe(false);
    expect(a.progress).toBe(0);
  });
});
