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
});
