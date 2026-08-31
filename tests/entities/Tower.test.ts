import { vi } from 'vitest';
vi.mock('phaser', () => ({ default: {} }));

import type Phaser from 'phaser';
import { Tower } from '../../src/entities/Tower';

function createScene() {
  const image = {
    x: 64,
    y: 64,
    setDepth: vi.fn().mockReturnThis(),
    setInteractive: vi.fn().mockReturnThis(),
    setData: vi.fn().mockReturnThis(),
    setScale: vi.fn().mockReturnThis(),
    setRotation: vi.fn().mockReturnThis(),
    setPosition: vi.fn().mockReturnThis(),
    setFrame: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  };
  const circle = {
    setStrokeStyle: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setVisible: vi.fn().mockReturnThis(),
    setRadius: vi.fn().mockReturnThis(),
    setPosition: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  };
  return {
    image,
    scene: {
      add: { image: vi.fn(() => image), circle: vi.fn(() => circle) },
      input: { setDraggable: vi.fn() },
    } as unknown as Phaser.Scene,
  };
}

describe('tower display frames', () => {
  it('shows windup, release, then returns to idle without changing its level', () => {
    const { scene, image } = createScene();
    const tower = new Tower(scene, 'arrow', { col: 1, row: 1 }, { x: 64, y: 64 });
    tower.setLevel(3);

    tower.playAttack();
    expect(image.setFrame).toHaveBeenLastCalledWith(2);

    tower.updateVisual(75);
    expect(image.setFrame).toHaveBeenLastCalledWith(3);

    tower.updateVisual(90);
    expect(image.setFrame).toHaveBeenLastCalledWith(0);
    expect(tower.level).toBe(3);
  });

  it('leaves towers without a loaded animation sheet on their default frame', () => {
    const { scene, image } = createScene();
    const tower = new Tower(scene, 'bolt', { col: 1, row: 1 }, { x: 64, y: 64 });

    tower.playAttack();
    tower.updateVisual(140);

    expect(image.setFrame).not.toHaveBeenCalled();
  });
});
