import { describe, expect, it } from 'vitest';
import { worldBackgroundTheme } from '../../src/ui/worldBackground';

describe('worldBackgroundTheme', () => {
  it('gives each known world a distinct visual palette', () => {
    expect(worldBackgroundTheme('1')).toMatchObject({ sky: 0x101b35, accent: 0x7bd7ff });
    expect(worldBackgroundTheme('2')).toMatchObject({ sky: 0x241315, accent: 0xff9a57 });
  });

  it('falls back to the first world palette for future stages', () => {
    expect(worldBackgroundTheme('99')).toEqual(worldBackgroundTheme('1'));
  });
});
