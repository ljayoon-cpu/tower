import { vi } from 'vitest';
vi.mock('phaser', () => ({ default: {} }));

import type Phaser from 'phaser';
import { Tower } from '../../src/entities/Tower';
import { getTower } from '../../src/data/towers';

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

function makeTower(key: string): Tower {
  const { scene } = createScene();
  return new Tower(scene, key, { col: 0, row: 0 }, { x: 0, y: 0 });
}

describe('tower upgrade paths', () => {
  it('branches at Lv3: stats come from the chosen path', () => {
    const t = makeTower('bolt');
    expect(t.path).toBeNull();
    t.setLevel(2);
    expect(t.needsPathChoice).toBe(true);
    t.setLevel(3, 'b');
    expect(t.path).toBe('b');
    expect(t.level).toBe(3);
    expect(t.stats()).toBe(getTower('bolt').paths!.b.levels[0]);
    t.setLevel(4);
    expect(t.stats()).toBe(getTower('bolt').paths!.b.levels[1]);
  });

  it('non-branched tower ignores path', () => {
    const t = makeTower('laser');
    t.setLevel(3);
    expect(t.path).toBeNull();
    expect(t.stats()).toBe(getTower('laser').levels[2]);
    expect(t.needsPathChoice).toBe(false);
  });
});

describe('tower display frames', () => {
  it('keeps a tower at its base artwork scale after upgrades', () => {
    const { scene, image } = createScene();
    const tower = new Tower(scene, 'arrow', { col: 1, row: 1 }, { x: 64, y: 64 });
    tower.setLevel(5, 'b');

    expect(image.setScale).toHaveBeenLastCalledWith(1);
  });

  it('does not rotate or animate its body while firing', () => {
    const { scene, image } = createScene();
    const tower = new Tower(scene, 'bolt', { col: 1, row: 1 }, { x: 64, y: 64 });

    tower.faceToward({ x: 240, y: 320 });
    tower.playAttack();
    tower.updateVisual(75);
    tower.updateVisual(90);
    expect(image.setFrame).not.toHaveBeenCalled();
    expect(image.setRotation).toHaveBeenLastCalledWith(0);
  });

  it('keeps support towers in an idle visual state when their effect pulses', () => {
    const { scene, image } = createScene();
    const tower = new Tower(scene, 'command', { col: 1, row: 1 }, { x: 64, y: 64 });

    tower.playAttack();
    tower.updateVisual(75);

    expect(image.setFrame).not.toHaveBeenCalled();
  });

});
