import { EconomyManager } from '../../src/systems/EconomyManager';
import { createEventBus } from '../../src/core/eventBus';
import type { GameEvents } from '../../src/core/types';

function setup(start: number) {
  const bus = createEventBus<GameEvents>();
  const events: number[] = [];
  bus.on('gold:changed', (p) => events.push(p.gold));
  return { eco: new EconomyManager(start, bus), events };
}

describe('EconomyManager', () => {
  it('spend fails when short and does not emit', () => {
    const { eco, events } = setup(50);
    expect(eco.spend(80)).toBe(false);
    expect(eco.gold).toBe(50);
    expect(events).toEqual([]);
  });

  it('spend succeeds, deducts, emits', () => {
    const { eco, events } = setup(100);
    expect(eco.spend(30)).toBe(true);
    expect(eco.gold).toBe(70);
    expect(events).toEqual([70]);
  });

  it('earn adds and emits', () => {
    const { eco, events } = setup(0);
    eco.earn(15);
    expect(eco.gold).toBe(15);
    expect(events).toEqual([15]);
  });

  it('sellRefund returns 60% floored and credits it', () => {
    const { eco } = setup(0);
    const refund = eco.sellRefund(101); // floor(60.6) = 60
    expect(refund).toBe(60);
    expect(eco.gold).toBe(60);
  });
});
