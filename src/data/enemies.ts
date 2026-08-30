import type { EnemyDef } from '../core/types';

export const ENEMIES: Record<string, EnemyDef> = {
  normal: { key: 'normal', name: '일반', hp: 40,  speed: 70,  bounty: 6,  lifeDamage: 1 },
  fast:   { key: 'fast',   name: '쾌속', hp: 22,  speed: 120, bounty: 7,  lifeDamage: 1 },
  tank:   { key: 'tank',   name: '탱커', hp: 150, speed: 45,  bounty: 14, lifeDamage: 1 },
  boss:   { key: 'boss',   name: '보스', hp: 1200, speed: 40, bounty: 120, lifeDamage: 6, isBoss: true },
};

export function getEnemy(key: string): EnemyDef {
  const e = ENEMIES[key];
  if (!e) throw new Error(`unknown enemy: ${key}`);
  return e;
}
