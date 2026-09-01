import { cumulativeCost, getTower, upgradeCost } from '../../src/data/towers';
import { EconomyManager } from '../../src/systems/EconomyManager';
import { createEventBus } from '../../src/core/eventBus';

it('cumulativeCost is the total gold poured in up to that level', () => {
  const arrow = getTower('arrow'); // 설치비 50
  expect(cumulativeCost(arrow, 1)).toBe(50);
  expect(cumulativeCost(arrow, 2)).toBe(100);
  expect(cumulativeCost(arrow, 3)).toBe(200);
  expect(cumulativeCost(arrow, 5)).toBe(800);

  // 설치비 + 각 레벨 강화비의 실제 합과 일치해야 한다.
  let running = arrow.cost;
  for (let lv = 1; lv < arrow.maxLevel; lv++) {
    running += upgradeCost(arrow, lv);
    expect(cumulativeCost(arrow, lv + 1)).toBe(running);
  }
});

it('sell refund scales with the investment (60% of the cumulative cost)', () => {
  const arrow = getTower('arrow');
  const economy = new EconomyManager(0, createEventBus());
  economy.sellRefund(cumulativeCost(arrow, 3)); // 200 투자 -> 60%
  expect(economy.gold).toBe(120);
});

it('clamps level into range', () => {
  const arrow = getTower('arrow');
  expect(cumulativeCost(arrow, 0)).toBe(cumulativeCost(arrow, 1));
  expect(cumulativeCost(arrow, 99)).toBe(cumulativeCost(arrow, arrow.maxLevel));
});
