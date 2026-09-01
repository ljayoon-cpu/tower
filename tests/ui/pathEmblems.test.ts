import { describe, expect, it } from 'vitest';
import { PATH_EMBLEMS, pathEmblemKey } from '../../src/data/pathEmblems';

describe('path emblems', () => {
  it('maps every six-tower A/B branch to a distinct loaded emblem', () => {
    expect(PATH_EMBLEMS).toHaveLength(12);
    expect(new Set(PATH_EMBLEMS.map((emblem) => emblem.texture)).size).toBe(12);
    expect(pathEmblemKey('arrow', 'a')).toBe('path_arrow_rapid');
    expect(pathEmblemKey('arrow', 'b')).toBe('path_arrow_pierce');
    expect(pathEmblemKey('frost', 'a')).toBe('path_frost_freeze');
    expect(pathEmblemKey('frost', 'b')).toBe('path_frost_aura');
    expect(pathEmblemKey('sniper', 'a')).toBe('path_sniper_execute');
    expect(pathEmblemKey('sniper', 'b')).toBe('path_sniper_rail');
  });

  it('uses the committed 64px raster assets for each emblem', () => {
    for (const emblem of PATH_EMBLEMS) {
      expect(emblem.file).toMatch(/-emblem-v1\.png$/);
    }
  });
});
