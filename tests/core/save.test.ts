import { loadSave, recordResult, isUnlocked } from '../../src/core/save';
import type { StorageLike } from '../../src/core/save';

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
});
