import {
  pickTarget, enemiesInRadius, towerLayers, eligibleTargets, type Targetable,
} from '../../src/systems/TargetingSystem';

function t(id: number, x: number, layer: 'ground' | 'air' = 'ground'): Targetable {
  return { id, pos: { x, y: 0 }, progress: x / 100, alive: true, hp: 100, layer };
}

describe('enemiesInRadius layer filter', () => {
  it('returns every layer when no filter given', () => {
    const list = [t(1, 10, 'ground'), t(2, 20, 'air')];
    expect(enemiesInRadius({ x: 0, y: 0 }, 100, list).map((e) => e.id)).toEqual([1, 2]);
  });

  it('keeps only the requested layers', () => {
    const list = [t(1, 10, 'ground'), t(2, 20, 'air'), t(3, 30, 'ground')];
    const ground = enemiesInRadius({ x: 0, y: 0 }, 100, list, new Set(['ground'] as const));
    expect(ground.map((e) => e.id)).toEqual([1, 3]);
  });

  it('treats a missing layer as ground', () => {
    const noLayer: Targetable = { id: 9, pos: { x: 5, y: 0 }, progress: 0, alive: true };
    const out = enemiesInRadius({ x: 0, y: 0 }, 100, [noLayer], new Set(['ground'] as const));
    expect(out.map((e) => e.id)).toEqual([9]);
  });
});

describe('tower layer eligibility', () => {
  it('ground-only tower drops air targets', () => {
    const layers = towerLayers(true, false);
    const out = eligibleTargets([t(1, 5, 'ground'), t(2, 6, 'air')], layers);
    expect(out.map((e) => e.id)).toEqual([1]);
  });
  it('default hits both', () => {
    const layers = towerLayers();
    expect(eligibleTargets([t(1, 5, 'ground'), t(2, 6, 'air')], layers)).toHaveLength(2);
  });
  it('treats a missing layer as ground', () => {
    const noLayer: Targetable = { id: 9, pos: { x: 5, y: 0 }, progress: 0, alive: true };
    expect(eligibleTargets([noLayer], towerLayers(true, false))).toHaveLength(1);
    expect(eligibleTargets([noLayer], towerLayers(false, true))).toHaveLength(0);
  });
});

describe('pickTarget works on a pre-filtered array', () => {
  it('picks the frontmost of whatever it is handed', () => {
    const airOnly = [t(1, 10, 'air'), t(2, 40, 'air')];
    expect(pickTarget({ x: 0, y: 0 }, 100, airOnly, 'first')?.id).toBe(2);
  });
});
