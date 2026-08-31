import { vi } from 'vitest';
vi.mock('phaser', () => ({ default: { Scene: class {} } }));
import { Game } from '../../src/scenes/Game';

describe('merge feedback', () => {
  it('pulls a source visual into the upgraded tower before its ring pulse', () => {
    const source = {
      setScale: vi.fn().mockReturnThis(), setRotation: vi.fn().mockReturnThis(),
      setDepth: vi.fn().mockReturnThis(), destroy: vi.fn(),
    };
    const ring = {
      setDepth: vi.fn().mockReturnThis(), setStrokeStyle: vi.fn().mockReturnThis(), destroy: vi.fn(),
    };
    const tween = vi.fn();
    const play = vi.fn();
    const image = vi.fn(() => source);
    const circle = vi.fn(() => ring);
    const scene = new Game() as unknown as {
      add: { image: typeof image; circle: typeof circle };
      tweens: { add: typeof tween };
      audio: { play: typeof play };
      mergeFeedback(origin: { x: number; y: number }, texture: string, scale: number, rotation: number, tower: { sprite: { x: number; y: number; scale: number } }): void;
    };
    scene.add = { image, circle };
    scene.tweens = { add: tween };
    scene.audio = { play };

    scene.mergeFeedback({ x: 10, y: 20 }, 'tower_arrow', 1, 0, { sprite: { x: 90, y: 100, scale: 1.2 } });

    expect(scene.add.image).toHaveBeenCalledWith(10, 20, 'tower_arrow');
    expect(tween).toHaveBeenCalledWith(expect.objectContaining({ targets: source, x: 90, y: 100, duration: 150 }));
    expect(play).not.toHaveBeenCalled();

    const pullTween = tween.mock.calls[0][0] as { onComplete(): void };
    pullTween.onComplete();

    expect(play).toHaveBeenCalledWith('merge');
    expect(scene.add.circle).toHaveBeenCalledWith(90, 100, expect.any(Number), 0xffe87a, 0.38);
  });
});
