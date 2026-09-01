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

describe('tower display', () => {
  it('keeps every attacking tower at a fixed pose', () => {
    const { scene, image } = createScene();
    const tower = new Tower(scene, 'arrow', { col: 1, row: 1 }, { x: 64, y: 64 });
    tower.setLevel(3);

    expect('playAttack' in tower).toBe(false);
    expect('updateVisual' in tower).toBe(false);
    expect('faceToward' in tower).toBe(false);
    expect(image.setFrame).not.toHaveBeenCalled();
    expect(image.setRotation).not.toHaveBeenCalled();
    expect(tower.level).toBe(3);
  });

  it('keeps support towers still and changes only their glow on real time', () => {
    const { scene, image } = createScene();
    const tower = new Tower(scene, 'mine', { col: 1, row: 1 }, { x: 64, y: 64 });

    expect('playAttack' in tower).toBe(false);
    expect('updateVisual' in tower).toBe(false);
    tower.updateSupportGlow(560);
    expect(image.setFrame).toHaveBeenLastCalledWith(1);
    tower.updateSupportGlow(560);
    expect(image.setFrame).toHaveBeenLastCalledWith(2);
    tower.updateSupportGlow(560);
    expect(image.setFrame).toHaveBeenLastCalledWith(1);
    tower.updateSupportGlow(560);
    expect(image.setFrame).toHaveBeenLastCalledWith(0);
  });
});
