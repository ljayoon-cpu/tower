export type BranchTowerKey = 'arrow' | 'cannon' | 'frost' | 'bolt' | 'sniper' | 'poison';
export type TowerPathKey = 'a' | 'b';

export type PathEmblem = Readonly<{
  towerKey: BranchTowerKey;
  path: TowerPathKey;
  texture: string;
  file: string;
}>;

/** 경로 선택 카드와 프리로더가 함께 쓰는 64px 분기 엠블럼 목록. */
export const PATH_EMBLEMS: readonly PathEmblem[] = [
  { towerKey: 'arrow', path: 'a', texture: 'path_arrow_rapid', file: 'arrow-rapid-emblem-v1.png' },
  { towerKey: 'arrow', path: 'b', texture: 'path_arrow_pierce', file: 'arrow-pierce-emblem-v1.png' },
  { towerKey: 'cannon', path: 'a', texture: 'path_cannon_suppress', file: 'cannon-suppress-emblem-v1.png' },
  { towerKey: 'cannon', path: 'b', texture: 'path_cannon_carpet', file: 'cannon-carpet-emblem-v1.png' },
  { towerKey: 'frost', path: 'a', texture: 'path_frost_freeze', file: 'frost-freeze-emblem-v1.png' },
  { towerKey: 'frost', path: 'b', texture: 'path_frost_aura', file: 'frost-aura-emblem-v1.png' },
  { towerKey: 'bolt', path: 'a', texture: 'path_bolt_overload', file: 'bolt-overload-emblem-v1.png' },
  { towerKey: 'bolt', path: 'b', texture: 'path_bolt_lance', file: 'bolt-lance-emblem-v1.png' },
  { towerKey: 'sniper', path: 'a', texture: 'path_sniper_execute', file: 'sniper-execute-emblem-v1.png' },
  { towerKey: 'sniper', path: 'b', texture: 'path_sniper_rail', file: 'sniper-rail-emblem-v1.png' },
  { towerKey: 'poison', path: 'a', texture: 'path_poison_corrupt', file: 'poison-corrupt-emblem-v1.png' },
  { towerKey: 'poison', path: 'b', texture: 'path_poison_spread', file: 'poison-spread-emblem-v1.png' },
];

export function pathEmblemKey(towerKey: string, path: TowerPathKey): string | undefined {
  return PATH_EMBLEMS.find((emblem) => emblem.towerKey === towerKey && emblem.path === path)?.texture;
}
