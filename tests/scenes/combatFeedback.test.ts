import { vi } from 'vitest';
vi.mock('phaser', () => ({ default: { Scene: class {} } }));
import { Game } from '../../src/scenes/Game';

type FeedbackGame = {
  impactFlash(pos: { x: number; y: number }, color: number, force?: 'light' | 'heavy' | 'frost'): void;
  startHitstop(): void;
  knockbackEnemy(enemy: { id: number; renderPos: { x: number; y: number }; sprite: unknown }): void;
  deathBurst(enemy: { renderPos: { x: number; y: number }; def: { key: string }; sprite: unknown }): void;
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

  it('starts a 40ms combat pause for a heavy impact', () => {
    const scene = new Game() as unknown as FeedbackGame & { tweens: object; hitstopLeftMs: number };
    scene.tweens = {};

    scene.startHitstop();

    expect(scene.hitstopLeftMs).toBe(40);
  });

  it('moves an arrow hit four pixels opposite to the enemy progress', () => {
    const add = vi.fn();
    const scene = new Game() as unknown as FeedbackGame & {
      tweens: { add: typeof add };
      enemyMotion: Map<number, { x: number; y: number }>;
    };
    scene.tweens = { add };
    scene.enemyMotion = new Map([[7, { x: 4, y: 0 }]]);

    scene.knockbackEnemy({ id: 7, renderPos: { x: 100, y: 120 }, sprite: {} });

    expect(add).toHaveBeenCalledWith(expect.objectContaining({ x: 96, y: 120, duration: 50, yoyo: true }));
  });

  it('emits six colored particles when an enemy dies', () => {
    const particle = { setDepth: vi.fn().mockReturnThis() };
    const add = vi.fn();
    const scene = new Game() as unknown as FeedbackGame & {
      add: { circle: typeof add };
      tweens: { add: typeof add };
    };
    scene.add = { circle: vi.fn(() => particle) };
    scene.tweens = { add };

    scene.deathBurst({ renderPos: { x: 64, y: 128 }, def: { key: 'normal' }, sprite: {} });

    expect(scene.add.circle).toHaveBeenCalledTimes(6);
  });
});
