import type { Wave } from './types';

export interface WaveEnemyCount {
  key: string;
  count: number;
}

/** 웨이브의 적 구성을 종류별 합계로 요약한다. 처음 등장 순서를 유지한다. */
export function waveSummary(wave: Wave): WaveEnemyCount[] {
  const order: string[] = [];
  const totals = new Map<string, number>();
  for (const group of wave.groups) {
    if (!totals.has(group.enemy)) order.push(group.enemy);
    totals.set(group.enemy, (totals.get(group.enemy) ?? 0) + group.count);
  }
  return order.map((key) => ({ key, count: totals.get(key) ?? 0 }));
}
