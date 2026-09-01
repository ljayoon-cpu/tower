import { describe, expect, it } from 'vitest';
import {
  battlefieldLandmarkKind, landmarkCells, worldLabel, worldMapTheme, worldTileStyle, worldTileTextureKey,
} from '../../src/ui/worldMap';

describe('world map theme', () => {
  it('uses separate readable path tiles for all three chapters', () => {
    expect(worldTileTextureKey('1', 'PATH')).toBe('world1_path');
    expect(worldTileTextureKey('2', 'PATH')).toBe('world2_path');
    expect(worldTileTextureKey('3', 'PATH')).toBe('world3_path');
    expect(worldMapTheme('1').pathBase).not.toBe(worldMapTheme('2').pathBase);
    expect(worldMapTheme('2').pathBase).not.toBe(worldMapTheme('3').pathBase);
  });

  it('falls back to chapter one for unknown worlds', () => {
    expect(worldMapTheme('99')).toEqual(worldMapTheme('1'));
    expect(worldTileTextureKey('99', 'BUILDABLE')).toBe('world1_buildable');
  });

  it('keeps the chapter label and buildable tile paired with each world', () => {
    expect(worldLabel('1')).toBe('국경 성벽');
    expect(worldLabel('2')).toBe('붉은 용광로');
    expect(worldLabel('3')).toBe('부유 병기창');
    expect(worldTileTextureKey('1', 'BUILDABLE')).toBe('world1_buildable');
    expect(worldTileTextureKey('2', 'BUILDABLE')).toBe('world2_buildable');
    expect(worldTileTextureKey('3', 'BUILDABLE')).toBe('world3_buildable');
  });

  it('keeps paths clearer than build slots on every world map', () => {
    for (const world of ['1', '2', '3']) {
      const path = worldTileStyle(world, 'PATH');
      const buildable = worldTileStyle(world, 'BUILDABLE');

      expect(path.edgeAlpha).toBeGreaterThan(buildable.edgeAlpha);
      expect(path.edgeWidth).toBeGreaterThan(buildable.edgeWidth);
      expect(buildable.detailAlpha).toBeLessThanOrEqual(0.42);
    }
  });

  it('chooses a stable landmark type for each world', () => {
    expect(battlefieldLandmarkKind('1', '1-3')).toBe('watchfire');
    expect(battlefieldLandmarkKind('2', '2-3')).toBe('crystal');
    expect(battlefieldLandmarkKind('3', '3-3')).toBe('airdock');
    expect(battlefieldLandmarkKind('3', '3-2')).toBe('beacon');
  });

  it('only places landmarks on buildable cells and stays deterministic', () => {
    const grid = [
      ['PATH', 'BUILDABLE', 'BLOCKED'],
      ['BUILDABLE', 'PATH', 'BUILDABLE'],
    ] as const;
    const first = landmarkCells('1-3', grid, 3);
    expect(first).toEqual(landmarkCells('1-3', grid, 3));
    expect(first).toEqual([{ col: 0, row: 1 }, { col: 2, row: 1 }, { col: 1, row: 0 }]);
  });
});
