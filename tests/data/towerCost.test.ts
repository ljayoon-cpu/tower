import { cumulativeCost, getTower } from '../../src/data/towers';
import { EconomyManager } from '../../src/systems/EconomyManager';
import { createEventBus } from '../../src/core/eventBus';

it('keeps merged tower refunds low so selling sacrifices the merge investment', () => {
  const arrow = getTower('arrow');
  expect(cumulativeCost(arrow, 1)).toBe(50);
  expect(cumulativeCost(arrow, 2)).toBe(50);
  expect(cumulativeCost(arrow, 5)).toBe(50);
  const economy = new EconomyManager(0, createEventBus());
  economy.sellRefund(cumulativeCost(arrow, 2));
  expect(economy.gold).toBe(30);
});
