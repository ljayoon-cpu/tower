import { Tutorial } from '../../src/core/tutorial';

describe('Tutorial', () => {
  it('advances only on the expected event for each step', () => {
    const t = new Tutorial();
    expect(t.text).toContain('설치');

    expect(t.advance('merged')).toBe(false);          // wrong order
    expect(t.advance('towerPlaced')).toBe(true);
    expect(t.text).toContain('하나 더');

    expect(t.advance('towerPlaced')).toBe(false);
    expect(t.advance('sameTypePlaced')).toBe(true);
    expect(t.advance('merged')).toBe(true);
    expect(t.text).toContain('웨이브');

    expect(t.advance('waveStarted')).toBe(true);
    expect(t.done).toBe(true);
    expect(t.text).toBeNull();
  });

  it('skip jumps straight to done', () => {
    const t = new Tutorial();
    t.skip();
    expect(t.done).toBe(true);
    expect(t.text).toBeNull();
    expect(t.advance('towerPlaced')).toBe(false);
  });
});
