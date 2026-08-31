import { getTower } from '../data/towers';
import { boltStaggerEffect } from '../data/boltMergeEffects';
import type { TowerLevelStats } from './types';

export interface TowerInfo {
  key: string;
  name: string;
  level: number;
  maxLevel: number;
  /** 초당 피해량(단일 대상 기준, 연쇄는 전이 합산). 반올림. */
  dps: number;
  range: number;
  fireRate: number;
  /** 다음 레벨 dps. 최대 레벨이면 null. */
  nextDps: number | null;
  /** 공격 방식 요약(광역/감속/연쇄). single 은 빈 문자열. */
  note: string;
}

/** 단일 대상 기준 dps. 연쇄는 감쇠 전이를 합산한다. */
function dpsOf(stats: TowerLevelStats, attack: string): number {
  if (attack === 'chain') {
    const jumps = stats.chainTargets ?? 0;
    const falloff = stats.chainFalloff ?? 1;
    let sum = 0;
    for (let i = 0; i <= jumps; i++) sum += Math.round(stats.damage * falloff ** i);
    return Math.round(sum * stats.fireRate);
  }
  if (attack === 'poison') return Math.round(stats.damage * stats.fireRate + (stats.poisonDps ?? 0));
  return Math.round(stats.damage * stats.fireRate);
}

function noteOf(key: string, level: number, stats: TowerLevelStats, attack: string): string {
  if (attack === 'splash') return `광역 반경 ${stats.splashRadius ?? 0}`;
  if (attack === 'slow') return `감속 ${Math.round((1 - (stats.slowMul ?? 1)) * 100)}%`;
  if (attack === 'chain') {
    const stagger = key === 'bolt' ? boltStaggerEffect(level) : undefined;
    const chain = `연쇄 ${(stats.chainTargets ?? 0) + 1}타`;
    return stagger ? `${chain} · 경직 ${stagger.durationMs / 1000}초` : chain;
  }
  if (attack === 'poison') return `독 지속 ${stats.poisonDps ?? 0}/초`;
  return '';
}

export function towerInfo(key: string, level: number): TowerInfo {
  const def = getTower(key);
  const lv = Math.min(Math.max(Math.floor(level), 1), def.maxLevel);
  const stats = def.levels[lv - 1];
  const next = lv < def.maxLevel ? dpsOf(def.levels[lv], def.attack) : null;
  return {
    key: def.key,
    name: def.name,
    level: lv,
    maxLevel: def.maxLevel,
    dps: dpsOf(stats, def.attack),
    range: stats.range,
    fireRate: stats.fireRate,
    nextDps: next,
    note: noteOf(def.key, lv, stats, def.attack),
  };
}
