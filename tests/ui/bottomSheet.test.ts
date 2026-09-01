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

describe('BottomSheet inspect mode', () => {
  const view = () => ({
    title: '화살탑 Lv2',
    lines: ['DPS 30 → 60', '사거리 162   연사 2.2/초'],
    upgrade: { label: '⬆ Lv3 강화  100G', afford: true },
    sell: { label: '⌫ 판매 +60G' },
  });

  it('shows inspect and swaps from build', () => {
    const s = new BottomSheet(fakeScene(), opts());
    s.showBuild();
    expect(s.mode).toBe('build');
    s.showInspect(view());
    expect(s.mode).toBe('inspect');
    expect(s.isOpen).toBe(true);
  });

  it('refreshInspect is a no-op unless in inspect mode', () => {
    const s = new BottomSheet(fakeScene(), opts());
    expect(() => s.refreshInspect(view())).not.toThrow();
    s.showBuild();
    expect(() => s.refreshInspect(view())).not.toThrow();
    expect(s.mode).toBe('build');
  });

  it('handles a max-level tower (no upgrade)', () => {
    const s = new BottomSheet(fakeScene(), opts());
    s.showInspect({ ...view(), upgrade: null });
    expect(s.mode).toBe('inspect');
  });

  it('makes the upgrade + sell hit areas interactive', () => {
    // A Phaser GameObject with no input area emits no pointer events, so the
    // attachPressFeedback listeners would never fire in-game without setInteractive.
    let interactiveCalls = 0;
    const scene = fakeScene();
    const add = scene.add as unknown as { rectangle: () => Record<string, unknown> };
    const realRect = add.rectangle;
    add.rectangle = () => {
      const o = realRect();
      o.setInteractive = () => {
        interactiveCalls += 1;
        return o;
      };
      return o;
    };
    const s = new BottomSheet(scene, opts());
    s.showInspect(view());
    expect(interactiveCalls).toBeGreaterThanOrEqual(2); // upgrade hit + sell hit
  });
});
