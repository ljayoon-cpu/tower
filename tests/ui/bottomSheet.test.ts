import { describe, it, expect, vi } from 'vitest';
import type Phaser from 'phaser';
import { BottomSheet } from '../../src/ui/BottomSheet';

function fakeScene(): Phaser.Scene {
  const factory = () => {
    const o: Record<string, unknown> = {};
    for (const m of ['setDepth', 'setOrigin', 'setVisible', 'setStrokeStyle', 'setInteractive',
      'disableInteractive', 'setScale', 'setPosition', 'setStyle', 'setText', 'setAlpha', 'setColor',
      'removeAll', 'add', 'destroy', 'on', 'emit']) o[m] = () => o;
    o.list = [];
    o.width = 0;
    return o;
  };
  return {
    add: { container: factory, rectangle: factory, text: factory, image: factory },
    tweens: undefined,
  } as unknown as Phaser.Scene;
}

const opts = () => ({
  onBuildPick: vi.fn(), canAfford: () => true, isBanned: () => false,
  isAtLimit: () => false, limitLabel: () => '최대 2개',
  onUpgrade: vi.fn(), onSell: vi.fn(), onPathPick: vi.fn(), onDismiss: vi.fn(),
});

describe('BottomSheet build mode', () => {
  it('opens to build mode and hides', () => {
    const s = new BottomSheet(fakeScene(), opts());
    expect(s.isOpen).toBe(false);
    s.showBuild();
    expect(s.mode).toBe('build');
    expect(s.isOpen).toBe(true);
    s.hide();
    expect(s.isOpen).toBe(false);
    expect(s.mode).toBeNull();
  });

  it('setBottomInset before open does not throw and stays closed', () => {
    const s = new BottomSheet(fakeScene(), opts());
    s.setBottomInset(56);
    expect(s.isOpen).toBe(false);
  });

  it('refreshBuild is a no-op while closed', () => {
    const s = new BottomSheet(fakeScene(), opts());
    expect(() => s.refreshBuild()).not.toThrow();
  });
});
