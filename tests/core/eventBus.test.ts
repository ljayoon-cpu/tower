import { createEventBus } from '../../src/core/eventBus';
import type { GameEvents } from '../../src/core/types';

describe('eventBus', () => {
  it('delivers payload to subscribers', () => {
    const bus = createEventBus<GameEvents>();
    const seen: number[] = [];
    bus.on('gold:changed', (p) => seen.push(p.gold));
    bus.emit('gold:changed', { gold: 42 });
    bus.emit('gold:changed', { gold: 7 });
    expect(seen).toEqual([42, 7]);
  });

  it('off removes the listener', () => {
    const bus = createEventBus<GameEvents>();
    const seen: number[] = [];
    const fn = (p: { lives: number }) => seen.push(p.lives);
    bus.on('life:changed', fn);
    bus.off('life:changed', fn);
    bus.emit('life:changed', { lives: 3 });
    expect(seen).toEqual([]);
  });
});
