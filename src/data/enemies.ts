import type { EnemyDef } from '../core/types';

/**
 * 적은 하나의 수치만 큰 것이 아니라, 서로 다른 타워 역할을 요구한다.
 * 스테이지는 같은 적의 배율을 올려 확장하므로 챕터가 늘어도 키와 규칙은 유지된다.
 */
export const ENEMIES: Record<string, EnemyDef> = {
  normal: {
    key: 'normal', name: '보행병', hp: 60, speed: 70, bounty: 6, lifeDamage: 1, movementLayer: 'ground',
  },
  fast: {
    key: 'fast', name: '질주병', hp: 34, speed: 150, bounty: 7, lifeDamage: 1, movementLayer: 'ground',
  },
  tank: {
    key: 'tank', name: '장갑병', hp: 240, speed: 44, bounty: 16, lifeDamage: 2, movementLayer: 'ground', armor: 7,
  },
  shield: {
    key: 'shield', name: '방어막병', hp: 110, speed: 62, bounty: 13, lifeDamage: 1, movementLayer: 'ground',
    shield: { energy: 90, rechargeDelayMs: 2800, rechargePerSecond: 22 },
  },
  regenerator: {
    key: 'regenerator', name: '재생충', hp: 150, speed: 54, bounty: 15, lifeDamage: 2, movementLayer: 'ground', regenPerSecond: 11,
  },
  summoner: {
    key: 'summoner', name: '소환사', hp: 180, speed: 48, bounty: 20, lifeDamage: 2, movementLayer: 'ground',
    summon: { enemyKey: 'minion', intervalMs: 3200, maxAlive: 3 },
  },
  minion: {
    key: 'minion', name: '호위 부하', hp: 24, speed: 92, bounty: 2, lifeDamage: 1, movementLayer: 'ground', intercepts: true,
  },
  boss: {
    key: 'boss', name: '공성 지휘관', hp: 1800, speed: 90, bounty: 150, lifeDamage: 6, isBoss: true, movementLayer: 'ground', armor: 9,
    shield: { energy: 180, rechargeDelayMs: 3800, rechargePerSecond: 18 },
    bossPhases: [
      { name: '돌격', atHealthRatio: 0.65, speedMultiplier: 1.5 },
      {
        name: '최후 방어선', atHealthRatio: 0.35, speedMultiplier: 1.9, shieldRestoreRatio: 1,
        summon: { enemyKey: 'minion', count: 3 },
      },
    ],
  },
};

export function getEnemy(key: string): EnemyDef {
  const e = ENEMIES[key];
  if (!e) throw new Error(`unknown enemy: ${key}`);
  return e;
}
