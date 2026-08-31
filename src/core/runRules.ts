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
