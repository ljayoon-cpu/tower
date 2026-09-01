import type { Rng } from './rng';

/** 한 판 동안 사용할 수 없는 타워를 난수로 고른다. */
export function chooseTowerBan(towerKeys: readonly string[], rng: Pick<Rng, 'int'>): string {
  if (towerKeys.length === 0) throw new Error('tower keys must not be empty');
  return towerKeys[rng.int(towerKeys.length)]!;
}

/** 봉인 타워는 메뉴와 실제 설치 모두에서 막는다. */
export function isTowerBanned(key: string, bannedTowerKey: string | null): boolean {
  return key === bannedTowerKey;
}

/** 한 판에 설치 가능한 최대 개수. 없으면 무제한. 골드 생성 타워는 경제가 폭주해 2기로 제한. */
const TOWER_BUILD_LIMIT: Readonly<Record<string, number>> = { mine: 2 };

export function towerBuildLimit(key: string): number {
  return TOWER_BUILD_LIMIT[key] ?? Infinity;
}

/** placed = 현재 필드에 있는 같은 종류 타워 수. */
export function isTowerAtBuildLimit(key: string, placed: number): boolean {
  return placed >= towerBuildLimit(key);
}
