import { TOWER_KEYS } from '../data/towers';

export interface TowerCount {
  key: string;
  level: number;
  count: number;
}

/** 배치된 타워를 종류·레벨별로 묶어 개수를 센다. TOWER_KEYS 순서 → 레벨 순으로 정렬. */
export function summarizeTowers(towers: ReadonlyArray<{ key: string; level: number }>): TowerCount[] {
  const counts = new Map<string, TowerCount>();
  for (const t of towers) {
    const id = `${t.key}:${t.level}`;
    const entry = counts.get(id);
    if (entry) entry.count++;
    else counts.set(id, { key: t.key, level: t.level, count: 1 });
  }
  return [...counts.values()].sort(
    (a, b) => (TOWER_KEYS.indexOf(a.key) - TOWER_KEYS.indexOf(b.key)) || (a.level - b.level),
  );
}
