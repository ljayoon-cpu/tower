import { loadSave, recordResult, isUnlocked } from '../../src/core/save';
import type { StorageLike } from '../../src/core/save';
import { SAVE_KEY } from '../../src/core/constants';

function memStorage(): StorageLike {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => { m.set(k, v); },
  };
}

describe('save', () => {
  it('returns empty save when storage is blank', () => {
    expect(loadSave(memStorage())).toEqual({ stages: {} });
  });

  it('1-1 is always unlocked', () => {
    expect(isUnlocked({ stages: {} }, '1-1')).toBe(true);
    expect(isUnlocked({ stages: {} }, '1-2')).toBe(false);
  });

  it('recordResult keeps best stars and unlocks next stage', () => {
    const s = memStorage();
    recordResult('1-1', 2, '1-2', s);
    let data = recordResult('1-1', 1, '1-2', s); // 낮은 별점은 무시
    expect(data.stages['1-1'].stars).toBe(2);
    expect(data.stages['1-2'].unlocked).toBe(true);
    expect(isUnlocked(data, '1-2')).toBe(true);
  });

  it('persists across loads', () => {
    const s = memStorage();
    recordResult('1-1', 3, '1-2', s);
    expect(loadSave(s).stages['1-1'].stars).toBe(3);
  });

  it('tolerates corrupt json', () => {
    const s = memStorage();
    s.setItem('mtd:save', '{not json');
    expect(loadSave(s)).toEqual({ stages: {} });
  });

  it('does not unlock the next stage on defeat', () => {
    const data = recordResult('1-1', 0, '1-2', memStorage());
    expect(isUnlocked(data, '1-2')).toBe(false);
  });

  it('discards malformed entries without losing valid progress', () => {
    const s = memStorage();
    s.setItem(SAVE_KEY, JSON.stringify({ stages: {
      '1-1': { stars: 3, unlocked: true }, '1-2': null,
      '1-3': { stars: 99, unlocked: 'yes' },
    } }));
    expect(loadSave(s)).toEqual({ stages: { '1-1': { stars: 3, unlocked: true } } });
  });

  it('does not crash a result screen when browser storage is blocked', () => {
    const blocked: StorageLike = {
      getItem() { throw new Error('SecurityError'); },
      setItem() { throw new Error('QuotaExceededError'); },
    };
    expect(loadSave(blocked)).toEqual({ stages: {} });
    expect(() => recordResult('1-1', 3, '1-2', blocked)).not.toThrow();
  });
});
