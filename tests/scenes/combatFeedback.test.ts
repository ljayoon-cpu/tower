import { vi } from 'vitest';
vi.mock('phaser', () => ({ default: { Scene: class {} } }));
import { Game } from '../../src/scenes/Game';

type FeedbackGame = {
  impactFlash(pos: { x: number; y: number }, color: number, force?: 'light' | 'heavy' | 'frost'): void;
};

describe('combat feedback', () => {
  it('adds a restrained camera shake only for heavy hits', () => {
    const ring = { setDepth: vi.fn().mockReturnThis() };
    const add = vi.fn();
    const shake = vi.fn();
    const scene = new Game() as unknown as FeedbackGame & {
      add: { circle: typeof add };
      tweens: { add: typeof add };
      cameras: { main: { shake: typeof shake } };
    };
    scene.add = { circle: vi.fn(() => ring) };
    scene.tweens = { add };
    scene.cameras = { main: { shake } };

    scene.impactFlash({ x: 10, y: 20 }, 0xffffff, 'heavy');
    scene.impactFlash({ x: 10, y: 20 }, 0xffffff, 'light');

    expect(add).toHaveBeenCalled();
    expect(shake).toHaveBeenCalledExactlyOnceWith(90, 0.0025);
  });
});
