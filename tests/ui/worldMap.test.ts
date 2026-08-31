import { describe, expect, it } from 'vitest';
import { worldLabel, worldMapTheme, worldTileTextureKey } from '../../src/ui/worldMap';

describe('world map theme', () => {
  it('uses separate readable path tiles for chapters one and two', () => {
    expect(worldTileTextureKey('1', 'PATH')).toBe('world1_path');
    expect(worldTileTextureKey('2', 'PATH')).toBe('world2_path');
    expect(worldMapTheme('1').pathBase).not.toBe(worldMapTheme('2').pathBase);
  });

  it('falls back to chapter one for unknown worlds', () => {
    expect(worldMapTheme('99')).toEqual(worldMapTheme('1'));
    expect(worldTileTextureKey('99', 'BUILDABLE')).toBe('world1_buildable');
  });

  it('keeps the chapter label and buildable tile paired with each world', () => {
    expect(worldLabel('1')).toBe('국경 성벽');
    expect(worldLabel('2')).toBe('붉은 용광로');
    expect(worldTileTextureKey('1', 'BUILDABLE')).toBe('world1_buildable');
    expect(worldTileTextureKey('2', 'BUILDABLE')).toBe('world2_buildable');
  });
});
