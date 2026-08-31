import { describe, expect, it, vi } from 'vitest';
import { attachPressFeedback, fadeInFromBlack, fadeToScene } from '../../src/ui/interactionFeedback';

class FakeTarget {
  scaleX = 1;
  scaleY = 1;
  alpha = 1;
  depth = 0;
  private handlers = new Map<string, () => void>();

  on(event: string, handler: () => void): this { this.handlers.set(event, handler); return this; }
  emit(event: string): void { this.handlers.get(event)?.(); }
  setAlpha(alpha: number): this { this.alpha = alpha; return this; }
  setDepth(depth: number): this { this.depth = depth; return this; }
  destroy = vi.fn();
}

function fakeScene() {
  const add = vi.fn((config: { onComplete?: () => void }) => config);
  const curtain = new FakeTarget();
  return {
    tweens: { add },
    add: { rectangle: vi.fn(() => curtain) },
    scene: { start: vi.fn() },
    curtain,
    addTween: add,
  };
}

describe('interaction feedback', () => {
  it('presses a button to 94% and plays click before its action', () => {
    const scene = fakeScene();
    const target = new FakeTarget();
    const play = vi.fn();
    const action = vi.fn();

    attachPressFeedback(scene as never, target as never, [target as never], { play } as never, action);
    target.emit('pointerdown');
    expect(scene.addTween).toHaveBeenCalledWith(expect.objectContaining({ scaleX: 0.94, scaleY: 0.94 }));

    target.emit('pointerup');
    expect(play).toHaveBeenCalledWith('click');
    expect(action).toHaveBeenCalledOnce();
    expect(scene.addTween).toHaveBeenLastCalledWith(expect.objectContaining({ scaleX: 1, scaleY: 1 }));
  });

  it('fades to black for 180ms before changing scenes', () => {
    const scene = fakeScene();
    fadeToScene(scene as never, 'result', { stageId: '1-1' });

    const tween = scene.addTween.mock.calls[0][0];
    expect(tween).toEqual(expect.objectContaining({ alpha: 1, duration: 180 }));
    tween.onComplete?.();
    expect(scene.scene.start).toHaveBeenCalledWith('result', { stageId: '1-1' });
  });

  it('reveals an arriving scene from black over 180ms', () => {
    const scene = fakeScene();
    fadeInFromBlack(scene as never);

    expect(scene.curtain.alpha).toBe(1);
    expect(scene.addTween).toHaveBeenCalledWith(expect.objectContaining({ alpha: 0, duration: 180 }));
  });
});
