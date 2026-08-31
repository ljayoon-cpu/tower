import { summarizeTowers } from '../../src/core/towerRoster';

describe('summarizeTowers', () => {
  it('groups by key and level with counts', () => {
    const r = summarizeTowers([
      { key: 'arrow', level: 1 },
      { key: 'arrow', level: 1 },
      { key: 'arrow', level: 3 },
      { key: 'cannon', level: 2 },
    ]);
    expect(r).toEqual([
      { key: 'arrow', level: 1, count: 2 },
      { key: 'arrow', level: 3, count: 1 },
      { key: 'cannon', level: 2, count: 1 },
    ]);
  });

  it('sorts by tower key order then level', () => {
    const r = summarizeTowers([
      { key: 'bolt', level: 1 },
      { key: 'arrow', level: 2 },
      { key: 'arrow', level: 1 },
    ]);
    expect(r.map((e) => `${e.key}${e.level}`)).toEqual(['arrow1', 'arrow2', 'bolt1']);
  });

  it('returns [] for no towers', () => {
    expect(summarizeTowers([])).toEqual([]);
  });
});
